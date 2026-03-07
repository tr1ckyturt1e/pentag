import * as vscode from "vscode";
import { ProjectConfig } from "../../views/newProjectView";
export declare function getCss(): string;
export declare function getHtml(): string;
export declare function getScript(): string;
/** Callbacks provided by ProjectPanel to handle scanner lifecycle events. */
export interface ScannerHandlers {
    onRunScanner: (modelId: string, mcpServers: string[]) => void;
    onPauseScanner: () => void;
    onResumeScanner: () => void;
    onCancelScanner: () => void;
    onHitlResponse: (text: string) => void;
}
export declare function handleMessage(msg: Record<string, unknown>, _panel: vscode.WebviewPanel, _config: ProjectConfig, handlers?: ScannerHandlers): void;
//# sourceMappingURL=scannerTab.d.ts.map