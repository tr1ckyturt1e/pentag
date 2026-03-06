"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
class SessionManager {
    context;
    _storageKey = "pentag.session";
    constructor(context) {
        this.context = context;
    }
    clearSession() {
        this.context.workspaceState.update(this._storageKey, undefined);
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=sessionManager.js.map