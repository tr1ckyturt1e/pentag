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
exports.AxisBotChatParticipant = void 0;
const vscode = __importStar(require("vscode"));
const PARTICIPANT_ID = "pentag.axis";
class AxisBotChatParticipant {
    context;
    sessionManager;
    constructor(context, sessionManager) {
        this.context = context;
        this.sessionManager = sessionManager;
    }
    register() {
        if (!vscode.chat) {
            console.error("[AXIS Bot] vscode.chat API is not available. Is GitHub Copilot Chat installed?");
            vscode.window.showErrorMessage("AXIS Bot: GitHub Copilot Chat is required but not found. Please install the GitHub Copilot Chat extension.");
            return;
        }
        const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, this._handleRequest.bind(this));
        participant.iconPath = new vscode.ThemeIcon("shield");
        this.context.subscriptions.push(participant);
        console.log("[AXIS Bot] @axis chat participant registered.");
    }
    async _handleRequest(request, chatContext, stream, token) {
        const command = request.command ?? "";
        const userInput = request.prompt.trim();
        // Handle /clear without needing a model
        if (command === "clear") {
            this.sessionManager.clearSession();
            stream.markdown("Session cleared.");
            return { metadata: { command } };
        }
        // Select model
        const config = vscode.workspace.getConfiguration("pentag");
        const preferredFamily = config.get("defaultModel") ?? "gpt-4o";
        let model;
        try {
            const allModels = await vscode.lm.selectChatModels({ vendor: "copilot" });
            if (allModels.length === 0) {
                stream.markdown("No GitHub Copilot AI models available. Ensure GitHub Copilot Chat is installed and you are signed in.");
                return { metadata: { command } };
            }
            model =
                allModels.find((m) => m.family === preferredFamily ||
                    m.id.toLowerCase().includes(preferredFamily.toLowerCase())) ?? allModels[0];
        }
        catch (err) {
            stream.markdown(`Failed to access AI models: ${String(err)}`);
            return { metadata: { command } };
        }
        // Build history from previous turns
        const history = [];
        for (const turn of chatContext.history.slice(-20)) {
            if (turn instanceof vscode.ChatRequestTurn) {
                history.push(vscode.LanguageModelChatMessage.User(turn.prompt));
            }
            else if (turn instanceof vscode.ChatResponseTurn) {
                const text = turn.response
                    .filter((p) => p instanceof vscode.ChatResponseMarkdownPart)
                    .map((p) => p.value.value)
                    .join("");
                if (text) {
                    history.push(vscode.LanguageModelChatMessage.Assistant(text));
                }
            }
        }
        // Forward request directly to model
        try {
            const messages = [
                ...history,
                vscode.LanguageModelChatMessage.User(command ? `/${command} ${userInput}`.trim() : userInput),
            ];
            const response = await model.sendRequest(messages, {}, token);
            for await (const chunk of response.text) {
                stream.markdown(chunk);
            }
        }
        catch (err) {
            if (err instanceof vscode.LanguageModelError) {
                stream.markdown(`AI model error [${err.code}]: ${err.message}`);
            }
            else {
                const msg = err instanceof Error ? err.message : String(err);
                stream.markdown(`Unexpected error: ${msg}`);
                console.error("[AXIS Bot] Chat handler error:", err);
            }
        }
        return { metadata: { command } };
    }
}
exports.AxisBotChatParticipant = AxisBotChatParticipant;
//# sourceMappingURL=chatParticipant.js.map