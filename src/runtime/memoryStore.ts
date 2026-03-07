import * as vscode from "vscode";

// ---------------------------------------------------------------------------
// MemoryStore — per-session conversation history
//
// Keyed by projectPath so each open project maintains its own history.
// ---------------------------------------------------------------------------
export class MemoryStore {
  private readonly _store = new Map<
    string,
    vscode.LanguageModelChatMessage[]
  >();

  /** Return the full history for a session key (empty array if none). */
  get(key: string): vscode.LanguageModelChatMessage[] {
    return this._store.get(key) ?? [];
  }

  /** Append a single message to the history for a session key. */
  append(key: string, message: vscode.LanguageModelChatMessage): void {
    const history = this._store.get(key) ?? [];
    history.push(message);
    this._store.set(key, history);
  }

  /** Replace the entire history for a session key. */
  set(key: string, messages: vscode.LanguageModelChatMessage[]): void {
    this._store.set(key, [...messages]);
  }

  /** Clear the history for a session key. */
  clear(key: string): void {
    this._store.delete(key);
  }

  /** Clear all stored histories. */
  clearAll(): void {
    this._store.clear();
  }
}
