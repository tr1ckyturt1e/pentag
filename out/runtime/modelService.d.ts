import * as vscode from "vscode";
export declare class ModelService {
    /**
     * Resolve a LanguageModelChat instance.
     * If modelId is provided it is used as a hint; falls back to the first
     * available Copilot model.
     */
    getModel(modelId?: string): Promise<vscode.LanguageModelChat>;
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
    stream(model: vscode.LanguageModelChat, messages: vscode.LanguageModelChatMessage[], token: vscode.CancellationToken, tools?: readonly vscode.LanguageModelToolInformation[]): AsyncIterable<string>;
}
//# sourceMappingURL=modelService.d.ts.map