import * as vscode from "vscode";
import { ProjectConfig } from "../../views/newProjectView";
export declare function getCss(): string;
export declare function getHtml(): string;
export declare function getScript(): string;
export declare function handleMessage(msg: Record<string, unknown>, panel: vscode.WebviewPanel, config: ProjectConfig, projectPath: string, onConfigUpdated: (cfg: ProjectConfig) => void): Promise<void>;
//# sourceMappingURL=dashboardTab.d.ts.map