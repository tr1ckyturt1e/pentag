"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTools = registerTools;
// ---------------------------------------------------------------------------
// Tools — callable functions exposed to the language model via vscode.lm.
//
// How it works:
//   1. Declare each tool in package.json under contributes.languageModelTools
//      (name, description, inputSchema).
//   2. Implement the tool as a class that satisfies LanguageModelTool<T>.
//   3. Register it below with vscode.lm.registerTool().
//   4. Call registerTools(context) from extension.ts activate().
//
// The registered tools AND any MCP server tools automatically appear in
// vscode.lm.tools and are passed to every model.sendRequest() call by the
// ModelService, so all agents can invoke them natively.
// ---------------------------------------------------------------------------
/**
 * Register all AXIS Bot tools with the VS Code Language Model API.
 * Call this once from extension.ts activate().
 */
function registerTools(context) {
    // Tools will be registered here as they are implemented, e.g.:
    //
    // context.subscriptions.push(
    //   vscode.lm.registerTool("axis.httpRequest", new HttpRequestTool()),
    // );
}
//# sourceMappingURL=index.js.map