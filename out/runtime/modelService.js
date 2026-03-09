"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelService = void 0;
const vscode = __importStar(require("vscode"));
const tools_1 = require("../tools");
// ---------------------------------------------------------------------------
// ModelService — wraps the VS Code Language Model API
//
// Centralises model selection and request streaming so the rest of the
// runtime never imports vscode.lm directly.
// ---------------------------------------------------------------------------
class ModelService {
    // Cache the resolved model so selectChatModels() is only called once per
    // scan session. Repeated calls trigger VS Code auth/approval dialogs.
    _cachedModel;
    _cachedModelId = "";
    /**
     * Resolve a LanguageModelChat instance.
     * If modelId is provided it is used as a hint; falls back to the first
     * available Copilot model.
     */
    async getModel(modelId) {
        const key = modelId ?? "";
        if (this._cachedModel && this._cachedModelId === key) {
            return this._cachedModel;
        }
        const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
        if (models.length === 0) {
            throw new Error("No Copilot language models are available.");
        }
        const result = modelId
            ? (models.find((m) => m.id === modelId) ?? models[0])
            : models[0];
        this._cachedModel = result;
        this._cachedModelId = key;
        return result;
    }
    /**
     * Send a request to the model and return an async iterable of text chunks.
     *
     * When tools are provided, the model may emit LanguageModelToolCallPart
     * responses. This method handles the dispatch loop automatically:
     *   1. Stream the model response.
     *   2. If the model requests a tool call, invoke it via vscode.lm.invokeTool.
     *   3. Feed the tool result back as a User message and send another request.
     *   4. Repeat until the model returns a pure-text response.
     *
     * @param tools  Pass vscode.lm.tools to expose all registered tools
     *               (ours + MCP). Omit to disable tool calling.
     */
    async *stream(model, messages, token, tools, toolInvocationToken) {
        // Only offer tools to the model when we have a valid toolInvocationToken.
        // Without one, vscode.lm.invokeTool() cannot be called and VS Code will
        // show a web-access permission dialog for every attempted tool call.
        // Stripping tools here means the model reasons analytically with no
        // tool calls at all — no dialogs, no errors.
        // Always offer tools to the model so it knows to call them.
        // Dispatch uses vscode.lm.invokeTool when a token is present (chat context),
        // or the local toolRegistry when running from a webview (no token).
        const opts = tools?.length
            ? { tools: [...tools] }
            : {};
        // Mutable copy — tool results are appended here for follow-up requests.
        const runningMessages = [...messages];
        // Tool dispatch loop: keep sending until the model produces pure text.
        while (true) {
            if (token.isCancellationRequested) {
                return;
            }
            const response = await model.sendRequest(runningMessages, opts, token);
            const pendingToolCalls = [];
            const assistantParts = [];
            for await (const part of response.stream) {
                if (token.isCancellationRequested) {
                    return;
                }
                if (part instanceof vscode.LanguageModelTextPart) {
                    assistantParts.push(part);
                    yield part.value;
                }
                else if (part instanceof vscode.LanguageModelToolCallPart) {
                    pendingToolCalls.push(part);
                    assistantParts.push(part);
                }
            }
            // Pure text response — nothing left to dispatch.
            if (pendingToolCalls.length === 0) {
                break;
            }
            // Record the assistant turn (text + tool call parts).
            runningMessages.push(vscode.LanguageModelChatMessage.Assistant(assistantParts));
            // Invoke each requested tool and collect its result.
            const resultParts = [];
            for (const tc of pendingToolCalls) {
                let resultContent;
                try {
                    if (toolInvocationToken) {
                        // Chat-participant context — use VS Code's official tool invocation.
                        const result = await vscode.lm.invokeTool(tc.name, { input: tc.input, toolInvocationToken }, token);
                        resultContent = result.content;
                    }
                    else {
                        // Webview-triggered scan — dispatch directly from local registry.
                        // This lets agents call http_request and sitemap_* freely without
                        // any VS Code permission dialogs or toolInvocationToken requirements.
                        const localTool = tools_1.toolRegistry.get(tc.name);
                        if (localTool) {
                            const invokeResult = await localTool.invoke({
                                input: tc.input,
                                toolCallId: tc.callId,
                                toolInvocationToken: undefined,
                            }, token);
                            resultContent = (invokeResult?.content ?? []);
                        }
                        else {
                            resultContent = [
                                new vscode.LanguageModelTextPart(`Tool "${tc.name}" not in local registry. ` +
                                    `Available: ${[...tools_1.toolRegistry.keys()].join(", ")}.`),
                            ];
                        }
                    }
                }
                catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    resultContent = [
                        new vscode.LanguageModelTextPart(`Tool invocation failed: ${msg}`),
                    ];
                }
                resultParts.push(new vscode.LanguageModelToolResultPart(tc.callId, resultContent));
            }
            // Feed all results back as a single User message and loop.
            runningMessages.push(vscode.LanguageModelChatMessage.User(resultParts));
        }
    }
}
exports.ModelService = ModelService;
//# sourceMappingURL=modelService.js.map