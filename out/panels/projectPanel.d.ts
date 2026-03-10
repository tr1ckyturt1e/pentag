import * as vscode from "vscode";
import { ProjectConfig } from "../views/newProjectView";
export declare class ProjectPanel {
    private static readonly _open;
    /**
     * Optional callback invoked whenever a scan starts or ends.
     * Receives the folder name (basename of projectPath) while scanning, or
     * null when the scan finishes. Wired up by OpenProjectViewProvider so the
     * My Projects sidebar can show a live "scanning" indicator.
     */
    static onScanStateChanged: ((folderName: string | null) => void) | undefined;
    private readonly _panel;
    private _config;
    private _cts;
    private _hitlResolve;
    private _hitlReject;
    private _isPaused;
    private _pauseResolve;
    private readonly _projectPath;
    private readonly _agentLoader;
    private readonly _modelService;
    private readonly _memoryStore;
    static open(context: vscode.ExtensionContext, config: ProjectConfig, projectPath: string): void;
    private constructor();
    private _startScan;
    private _pushModels;
    private _pushTools;
    private _getHtml;
    private _getNonce;
}
//# sourceMappingURL=projectPanel.d.ts.map