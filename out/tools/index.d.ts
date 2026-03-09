import * as vscode from "vscode";
export declare const toolRegistry: Map<string, vscode.LanguageModelTool<Record<string, unknown>>>;
/**
 * Register all AXIS Bot tools with VS Code and populate the local registry
 * for direct dispatch when toolInvocationToken is unavailable (webview scans).
 */
export declare function registerTools(context: vscode.ExtensionContext): void;
//# sourceMappingURL=index.d.ts.map