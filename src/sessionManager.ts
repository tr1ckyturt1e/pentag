import * as vscode from "vscode";

export class SessionManager {
  private readonly _storageKey = "pentag.session";

  constructor(private readonly context: vscode.ExtensionContext) {}

  clearSession(): void {
    this.context.workspaceState.update(this._storageKey, undefined);
  }
}
