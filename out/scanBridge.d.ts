import * as vscode from "vscode";
import { AgentContext } from "./types/agent";
import { AgentLoader } from "./runtime/agentLoader";
import { MemoryStore } from "./runtime/memoryStore";
export interface PendingScan {
    /** Full agent context with all webview callbacks wired in — no token yet. */
    agentContext: AgentContext;
    /** The panel's CancellationTokenSource so the chat handler can cancel it. */
    cts: vscode.CancellationTokenSource;
    /** AgentLoader scoped to this project's agents directory. */
    agentLoader: AgentLoader;
    /** Shared MemoryStore so cross-turn history is preserved. */
    memoryStore: MemoryStore;
    /** Top-level scan goal passed to orchestrator.run(). */
    intent: string;
    /** Session key for conversation memory (typically the project path). */
    projectPath: string;
    /** Streamed chunk callback — routes raw LLM text to the webview HITL panel. */
    onChunk: (chunk: string, agentId: string) => void;
    /**
     * Called by the chat handler when the scan finishes (success, error, or
     * cancellation). Runs webview cleanup: disposes CTS, posts scanEnded, shows
     * error notification if applicable.
     */
    onScanComplete: (err?: unknown) => void;
}
/** Singleton bridge between ProjectPanel and AxisBotChatParticipant. */
export declare class ScanBridge {
    private static _instance;
    private _pending;
    static get instance(): ScanBridge;
    /** Register a pending scan (replaces any previously unstarted registration). */
    register(scan: PendingScan): void;
    /**
     * Consume and return the pending scan.
     * Returns undefined if no scan is registered or it was already consumed.
     */
    consume(): PendingScan | undefined;
    hasPending(): boolean;
}
//# sourceMappingURL=scanBridge.d.ts.map