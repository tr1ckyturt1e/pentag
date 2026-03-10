import * as vscode from "vscode";
export declare class OpenProjectViewProvider implements vscode.WebviewViewProvider {
    private readonly _context;
    static readonly viewType = "pentag.openProjectView";
    private _view?;
    /** Folder name (basename) of the project currently being scanned, or null */
    private _scanningFolder;
    constructor(_context: vscode.ExtensionContext);
    /** Called whenever the workspace path changes so the list can refresh. */
    notifyWorkspaceChanged(): void;
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    private _refresh;
    private _scanProjects;
    private _getNonce;
    private _getHtml;
}
//# sourceMappingURL=openProjectView.d.ts.map