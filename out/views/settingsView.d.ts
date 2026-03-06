import * as vscode from "vscode";
export declare class SettingsViewProvider implements vscode.WebviewViewProvider {
    private readonly _context;
    static readonly viewType = "pentag.settingsView";
    private _view?;
    private _onWorkspacePathChanged?;
    constructor(_context: vscode.ExtensionContext);
    /** Register a callback invoked whenever the workspace path is saved or selected. */
    setOnWorkspacePathChanged(cb: (path: string | undefined) => void): void;
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    private _browseFolder;
    private _saveSettings;
    private _getNonce;
    private _getHtml;
}
//# sourceMappingURL=settingsView.d.ts.map