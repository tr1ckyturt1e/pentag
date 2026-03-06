import * as vscode from "vscode";
import { SessionManager } from "./sessionManager";
export declare class AxisBotChatParticipant {
    private readonly context;
    private readonly sessionManager;
    constructor(context: vscode.ExtensionContext, sessionManager: SessionManager);
    register(): void;
    private _handleRequest;
}
//# sourceMappingURL=chatParticipant.d.ts.map