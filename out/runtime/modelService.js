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
// ---------------------------------------------------------------------------
// ModelService — wraps the VS Code Language Model API
//
// Centralises model selection and request streaming so the rest of the
// runtime never imports vscode.lm directly.
// ---------------------------------------------------------------------------
class ModelService {
    /**
     * Resolve a LanguageModelChat instance.
     * If modelId is provided it is used as a hint; falls back to the first
     * available Copilot model.
     */
    async getModel(modelId) {
        const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
        if (models.length === 0) {
            throw new Error("No Copilot language models are available.");
        }
        if (modelId) {
            const match = models.find((m) => m.id === modelId);
            if (match) {
                return match;
            }
        }
        return models[0];
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
    async *stream(model, messages, token, tools) {
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
                const result = await vscode.lm.invokeTool(tc.name, { input: tc.input, toolInvocationToken: undefined }, token);
                resultParts.push(new vscode.LanguageModelToolResultPart(tc.callId, result.content));
            }
            // Feed all results back as a single User message and loop.
            runningMessages.push(vscode.LanguageModelChatMessage.User(resultParts));
        }
    }
}
exports.ModelService = ModelService;
//# sourceMappingURL=modelService.js.map