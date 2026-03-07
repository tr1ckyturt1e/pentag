import * as vscode from "vscode";
export declare class MemoryStore {
    private readonly _store;
    /** Return the full history for a session key (empty array if none). */
    get(key: string): vscode.LanguageModelChatMessage[];
    /** Append a single message to the history for a session key. */
    append(key: string, message: vscode.LanguageModelChatMessage): void;
    /** Replace the entire history for a session key. */
    set(key: string, messages: vscode.LanguageModelChatMessage[]): void;
    /** Clear the history for a session key. */
    clear(key: string): void;
    /** Clear all stored histories. */
    clearAll(): void;
}
//# sourceMappingURL=memoryStore.d.ts.map