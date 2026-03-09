"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanBridge = void 0;
/** Singleton bridge between ProjectPanel and AxisBotChatParticipant. */
class ScanBridge {
    static _instance;
    _pending;
    static get instance() {
        if (!ScanBridge._instance) {
            ScanBridge._instance = new ScanBridge();
        }
        return ScanBridge._instance;
    }
    /** Register a pending scan (replaces any previously unstarted registration). */
    register(scan) {
        this._pending = scan;
    }
    /**
     * Consume and return the pending scan.
     * Returns undefined if no scan is registered or it was already consumed.
     */
    consume() {
        const p = this._pending;
        this._pending = undefined;
        return p;
    }
    hasPending() {
        return this._pending !== undefined;
    }
}
exports.ScanBridge = ScanBridge;
//# sourceMappingURL=scanBridge.js.map