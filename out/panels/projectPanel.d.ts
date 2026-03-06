import * as vscode from "vscode";
import { ProjectConfig } from "../views/newProjectView";
export declare class ProjectPanel {
    private static readonly _open;
    private readonly _panel;
    private _config;
    static open(context: vscode.ExtensionContext, config: ProjectConfig, projectPath: string): void;
    private constructor();
    private _pushModels;
    private _getHtml;
    private _getNonce;
}
//# sourceMappingURL=projectPanel.d.ts.map