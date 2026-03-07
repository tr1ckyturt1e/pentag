"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
// ---------------------------------------------------------------------------
// MemoryStore — per-session conversation history
//
// Keyed by projectPath so each open project maintains its own history.
// ---------------------------------------------------------------------------
class MemoryStore {
    _store = new Map();
    /** Return the full history for a session key (empty array if none). */
    get(key) {
        return this._store.get(key) ?? [];
    }
    /** Append a single message to the history for a session key. */
    append(key, message) {
        const history = this._store.get(key) ?? [];
        history.push(message);
        this._store.set(key, history);
    }
    /** Replace the entire history for a session key. */
    set(key, messages) {
        this._store.set(key, [...messages]);
    }
    /** Clear the history for a session key. */
    clear(key) {
        this._store.delete(key);
    }
    /** Clear all stored histories. */
    clearAll() {
        this._store.clear();
    }
}
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=memoryStore.js.map