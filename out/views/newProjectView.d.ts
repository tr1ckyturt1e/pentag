import * as vscode from "vscode";
export interface ProjectCredential {
    role: string;
    username: string;
    password: string;
}
export interface ProjectApp {
    url: string;
    sso: boolean;
    credentials: ProjectCredential[];
}
export interface ProjectConfig {
    name: string;
    createdAt: string;
    type: "Web" | "API";
    apps: ProjectApp[];
    collectionFile?: string;
}
export declare class NewProjectViewProvider implements vscode.WebviewViewProvider {
    private readonly _context;
    static readonly viewType = "pentag.newProjectView";
    private _view?;
    constructor(_context: vscode.ExtensionContext);
    /** Called by extension.ts when the workspace path changes via Settings */
    notifyWorkspaceChanged(newPath: string | undefined): void;
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    private _browseCollection;
    private _handleCreateProject;
    private _getNonce;
    private _getHtml;
}
//# sourceMappingURL=newProjectView.d.ts.map