import * as vscode from "vscode";
import * as fs from "fs";

export class SettingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "pentag.settingsView";
  private _view?: vscode.WebviewView;
  private _onWorkspacePathChanged?: (path: string | undefined) => void;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  /** Register a callback invoked whenever the workspace path is saved or selected. */
  public setOnWorkspacePathChanged(
    cb: (path: string | undefined) => void,
  ): void {
    this._onWorkspacePathChanged = cb;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(
      async (message: { command: string; payload?: unknown }) => {
        switch (message.command) {
          case "browseFolder":
            await this._browseFolder();
            break;
          case "saveSettings":
            this._saveSettings(
              message.payload as {
                workspacePath: string;
                burpProxy: string;
                burpApiKey: string;
                burpServerUrl: string;
              },
            );
            break;
          case "openFolder":
            {
              const p = message.payload as string;
              if (p && fs.existsSync(p)) {
                vscode.commands.executeCommand(
                  "revealFileInOS",
                  vscode.Uri.file(p),
                );
              }
            }
            break;
        }
      },
      undefined,
      this._context.subscriptions,
    );
  }

  private async _browseFolder(): Promise<void> {
    const result = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: "Select Workspace Folder",
    });
    if (result && result[0]) {
      const selectedPath = result[0].fsPath;
      this._context.globalState.update("pentag.workspacePath", selectedPath);
      this._view?.webview.postMessage({
        command: "folderSelected",
        path: selectedPath,
      });
      this._onWorkspacePathChanged?.(selectedPath);
    }
  }

  private _saveSettings(payload: {
    workspacePath: string;
    burpProxy: string;
    burpApiKey: string;
    burpServerUrl: string;
  }): void {
    const trimmed = payload.workspacePath?.trim() ?? "";

    if (!trimmed) {
      vscode.window.showErrorMessage(
        "AXIS Bot: Workspace path cannot be empty.",
      );
      return;
    }

    if (!fs.existsSync(trimmed)) {
      vscode.window.showWarningMessage(
        `AXIS Bot: Folder does not exist yet — "${trimmed}". It will be created when you make a project.`,
      );
    }

    const config = vscode.workspace.getConfiguration("pentag");
    this._context.globalState.update("pentag.workspacePath", trimmed);
    config.update(
      "burpProxy",
      payload.burpProxy?.trim() || "127.0.0.1:8080",
      vscode.ConfigurationTarget.Global,
    );
    config.update(
      "burpApiKey",
      payload.burpApiKey?.trim() || "None",
      vscode.ConfigurationTarget.Global,
    );
    config.update(
      "burpServerUrl",
      payload.burpServerUrl?.trim() || "127.0.0.1:1337",
      vscode.ConfigurationTarget.Global,
    );

    this._view?.webview.postMessage({ command: "saved", path: trimmed });
    this._onWorkspacePathChanged?.(trimmed);
    vscode.window.showInformationMessage(`✅ Settings saved.`);
  }

  private _getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private _getHtml(): string {
    const nonce = this._getNonce();
    const savedPath =
      this._context.globalState.get<string>("pentag.workspacePath") ?? "";
    const config = vscode.workspace.getConfiguration("pentag");
    const savedBurpProxy = config.get<string>("burpProxy") ?? "127.0.0.1:8080";
    const savedBurpApiKey = config.get<string>("burpApiKey") ?? "None";
    const savedBurpServerUrl =
      config.get<string>("burpServerUrl") ?? "127.0.0.1:1337";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<title>Settings</title>
<style nonce="${nonce}">
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 12px;
    line-height: 1.5;
  }

  .section { margin-top: 20px; }
  .section:first-child { margin-top: 0; }

  .section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
    opacity: 0.7;
    margin-bottom: 6px;
  }

  .desc {
    font-size: 11px;
    opacity: 0.55;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .field { margin-top: 10px; }
  .section-label + .field { margin-top: 0; }

  .field-label {
    font-size: 11px;
    opacity: 0.55;
    margin-bottom: 5px;
  }

  .path-row {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  input[type="text"] {
    flex: 1;
    min-width: 0;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 3px;
    padding: 5px 8px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
  }
  input[type="text"]:focus { border-color: var(--vscode-focusBorder); }
  input::placeholder { opacity: 0.45; }

  .btn-browse {
    background: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.08));
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    border: none;
    border-radius: 3px;
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .btn-browse:hover { background: var(--vscode-button-secondaryHoverBackground, rgba(255,255,255,0.14)); }

  .btn-save {
    width: 100%;
    margin-top: 20px;
    padding: 7px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-save:hover { background: var(--vscode-button-hoverBackground); }

  .divider {
    margin-top: 20px;
    border: none;
    border-top: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
  }

  .status-bar {
    margin-top: 10px;
    font-size: 11px;
    border-radius: 3px;
    padding: 6px 8px;
    display: none;
  }
  .status-bar.success {
    display: block;
    background: rgba(78, 201, 176, 0.12);
    border: 1px solid rgba(78, 201, 176, 0.4);
    color: #4ec9b0;
  }
  .status-bar.error {
    display: block;
    background: rgba(244, 135, 113, 0.12);
    border: 1px solid rgba(244, 135, 113, 0.4);
    color: #f48771;
  }

  .current-path {
    margin-top: 8px;
    font-size: 11px;
    opacity: 0.55;
    word-break: break-all;
    font-family: var(--vscode-editor-font-family, monospace);
    padding: 4px 6px;
    background: var(--vscode-input-background);
    border-radius: 3px;
  }
  .current-path.hidden { display: none; }
</style>
</head>
<body>

<!-- Workspace Folder -->
<div class="section">
  <div class="section-label">Workspace Folder</div>
  <p class="desc">All new projects will be created as sub-folders inside this directory.</p>
  <div class="path-row">
    <input type="text" id="workspacePath" placeholder="C:\\Users\\you\\pentests" value="${savedPath.replace(/\\/g, "\\\\")}">
    <button class="btn-browse" id="btnBrowse">Browse...</button>
  </div>
  <div class="current-path${savedPath ? "" : " hidden"}" id="currentPath">${savedPath}</div>
</div>

<hr class="divider">

<!-- Burp Suite -->
<div class="section">
  <div class="section-label">Burp Suite</div>

  <div class="field">
    <div class="field-label">Proxy address</div>
    <div class="path-row">
      <input type="text" id="burpProxy" placeholder="127.0.0.1:8080" value="${savedBurpProxy}">
    </div>
  </div>

  <div class="field">
    <div class="field-label">Server URL</div>
    <div class="path-row">
      <input type="text" id="burpServerUrl" placeholder="127.0.0.1:1337" value="${savedBurpServerUrl}">
    </div>
  </div>

  <div class="field">
    <div class="field-label">API Key</div>
    <div class="path-row">
      <input type="text" id="burpApiKey" placeholder="None" value="${savedBurpApiKey}">
    </div>
  </div>
</div>

<button class="btn-save" id="btnSave">Save Settings</button>

<div class="status-bar" id="statusBar"></div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();

  document.getElementById('btnBrowse').addEventListener('click', function() {
    vscode.postMessage({ command: 'browseFolder' });
  });

  document.getElementById('btnSave').addEventListener('click', function() {
    vscode.postMessage({ command: 'saveSettings', payload: {
      workspacePath: document.getElementById('workspacePath').value.trim(),
      burpProxy: document.getElementById('burpProxy').value.trim(),
      burpServerUrl: document.getElementById('burpServerUrl').value.trim(),
      burpApiKey: document.getElementById('burpApiKey').value.trim()
    }});
  });

  window.addEventListener('message', function(e) {
    const msg = e.data;
    const statusBar = document.getElementById('statusBar');
    const currentPath = document.getElementById('currentPath');
    if (msg.command === 'folderSelected') {
      document.getElementById('workspacePath').value = msg.path;
    } else if (msg.command === 'saved') {
      statusBar.className = 'status-bar success';
      statusBar.textContent = 'Saved: ' + msg.path;
      currentPath.textContent = msg.path;
      currentPath.classList.remove('hidden');
      setTimeout(function() { statusBar.className = 'status-bar'; }, 3000);
    }
  });
</script>
</body>
</html>`;
  }
}
