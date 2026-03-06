"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewProjectViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class NewProjectViewProvider {
    _context;
    static viewType = "pentag.newProjectView";
    _view;
    constructor(_context) {
        this._context = _context;
    }
    /** Called by extension.ts when the workspace path changes via Settings */
    notifyWorkspaceChanged(newPath) {
        this._view?.webview.postMessage({
            command: "workspacePath",
            path: newPath ?? "",
        });
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
        };
        webviewView.webview.html = this._getHtml(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case "createProject":
                    await this._handleCreateProject(message.payload);
                    break;
                case "browseCollection":
                    await this._browseCollection();
                    break;
            }
        }, undefined, this._context.subscriptions);
    }
    async _browseCollection() {
        const result = await vscode.window.showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            openLabel: "Select Collection File",
            filters: {
                "JSON / YAML": ["json", "yaml", "yml"],
                "All Files": ["*"],
            },
        });
        if (result && result[0]) {
            this._view?.webview.postMessage({
                command: "collectionSelected",
                path: result[0].fsPath,
            });
        }
    }
    async _handleCreateProject(config) {
        const workspacePath = this._context.globalState.get("pentag.workspacePath");
        if (!workspacePath) {
            vscode.window.showErrorMessage("AXIS Bot: No workspace folder configured. Please set it in the Settings panel.");
            return;
        }
        if (!config.name || !config.name.trim()) {
            vscode.window.showErrorMessage("AXIS Bot: Project name is required.");
            return;
        }
        const folderName = config.name.trim().replace(/[^a-zA-Z0-9_\-. ]/g, "_");
        const projectPath = path.join(workspacePath, folderName);
        try {
            if (!fs.existsSync(workspacePath)) {
                vscode.window.showErrorMessage(`AXIS Bot: Workspace folder does not exist: ${workspacePath}`);
                return;
            }
            if (fs.existsSync(projectPath)) {
                const overwrite = await vscode.window.showWarningMessage(`Project folder "${folderName}" already exists. Overwrite config?`, "Overwrite", "Cancel");
                if (overwrite !== "Overwrite") {
                    return;
                }
            }
            else {
                fs.mkdirSync(projectPath, { recursive: true });
            }
            const projectJson = {
                ...config,
                name: folderName,
                createdAt: new Date().toISOString(),
            };
            fs.writeFileSync(path.join(projectPath, "proj_config.json"), JSON.stringify(projectJson, null, 2), "utf8");
            vscode.window
                .showInformationMessage(`Project "${folderName}" created at ${projectPath}`, "Open Folder")
                .then((choice) => {
                if (choice === "Open Folder") {
                    vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(projectPath));
                }
            });
            this._view?.webview.postMessage({ command: "reset" });
        }
        catch (err) {
            vscode.window.showErrorMessage(`AXIS Bot: Failed to create project -  ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    _getNonce() {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    _getHtml(webview) {
        const nonce = this._getNonce();
        const savedWorkspace = this._context.globalState.get("pentag.workspacePath") ?? "";
        const hasWorkspace = savedWorkspace.length > 0;
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<title>New Project</title>
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

  .section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
    opacity: 0.7;
    margin: 14px 0 6px;
  }
  .section-label:first-child { margin-top: 0; }

  input, select, textarea {
    width: 100%;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 3px;
    padding: 5px 8px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
  }
  input:focus, select:focus { border-color: var(--vscode-focusBorder); }
  input::placeholder { opacity: 0.5; }
  input[readonly] { opacity: 0.7; cursor: default; }

  select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    padding-right: 24px;
  }

  .field-row { margin-bottom: 6px; }

  .workspace-bar {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 11px;
    border-radius: 3px;
    padding: 6px 8px;
    margin-bottom: 14px;
    line-height: 1.4;
  }
  .workspace-bar.has-path {
    background: rgba(78, 201, 176, 0.1);
    border: 1px solid rgba(78, 201, 176, 0.3);
  }
  .workspace-bar.no-path {
    background: rgba(244, 135, 113, 0.1);
    border: 1px solid rgba(244, 135, 113, 0.3);
    color: #f48771;
  }
  .ws-path {
    word-break: break-all;
    font-family: var(--vscode-editor-font-family, monospace);
    color: #4ec9b0;
  }

  .dynamic-list { display: flex; flex-direction: column; gap: 5px; }
  .dynamic-item { display: flex; align-items: center; gap: 4px; }
  .dynamic-item input { flex: 1; }

  .path-row { display: flex; gap: 4px; align-items: center; }
  .path-row input { flex: 1; min-width: 0; }

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

  .endpoint-block {
    border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.12));
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 6px;
    background: rgba(255,255,255,0.03);
  }
  .endpoint-header { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
  .endpoint-header input { flex: 1; }

  .cred-section {
    padding-left: 8px;
    border-left: 2px solid var(--vscode-input-border, rgba(255,255,255,0.1));
    margin-top: 6px;
  }
  .cred-headers {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 4px;
    margin-bottom: 3px;
  }
  .cred-headers span {
    font-size: 10px;
    opacity: 0.45;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding-left: 2px;
  }
  .cred-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 4px;
    align-items: center;
    margin-bottom: 4px;
  }
  .cred-row input { min-width: 0; }

  .btn-remove {
    background: none;
    border: none;
    color: var(--vscode-errorForeground, #f48771);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 2px 5px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .btn-remove:hover { background: var(--vscode-toolbar-hoverBackground); }

  .btn-add {
    background: none;
    border: 1px dashed var(--vscode-input-border, rgba(255,255,255,0.2));
    border-radius: 3px;
    color: var(--vscode-textLink-foreground, #4fc1ff);
    cursor: pointer;
    font-size: 11px;
    padding: 4px 8px;
    width: 100%;
    text-align: left;
    margin-top: 4px;
  }
  .btn-add:hover { background: var(--vscode-toolbar-hoverBackground); }

  .btn-add-cred {
    background: none;
    border: 1px dashed var(--vscode-input-border, rgba(255,255,255,0.15));
    border-radius: 3px;
    color: var(--vscode-textLink-foreground, #4fc1ff);
    cursor: pointer;
    font-size: 10px;
    padding: 3px 6px;
    margin-top: 3px;
    opacity: 0.8;
    display: block;
  }
  .btn-add-cred:hover { background: var(--vscode-toolbar-hoverBackground); opacity: 1; }

  .toggle-group {
    display: inline-flex;
    border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.2));
    border-radius: 3px;
    overflow: hidden;
  }

  .app-sso-row { margin-bottom: 6px; }
  .toggle-group label {
    padding: 4px 14px;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
    color: var(--vscode-foreground);
    opacity: 0.6;
  }
  .toggle-group input[type="radio"] { display: none; }
  .toggle-group input[type="radio"]:checked + label {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    opacity: 1;
  }

  .desc { font-size: 11px; opacity: 0.55; margin-bottom: 8px; line-height: 1.4; }

  .divider {
    border: none;
    border-top: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(255,255,255,0.08));
    margin: 14px 0 0;
  }

  .btn-create {
    width: 100%;
    margin-top: 10px;
    padding: 8px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.3px;
  }
  .btn-create:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
  .btn-create:disabled { opacity: 0.4; cursor: not-allowed; }

  .create-hint { margin-top: 6px; font-size: 10px; opacity: 0.5; text-align: center; }

  .hidden { display: none !important; }
</style>
</head>
<body>

<!-- Workspace path indicator -->
<div class="workspace-bar ${hasWorkspace ? "has-path" : "no-path"}" id="workspaceBar">
  <span id="wsPathText">${hasWorkspace ? '<span class="ws-path">' + savedWorkspace.replace(/\\/g, "\\\\") + "</span>" : "(!) No workspace set - configure it in Settings below."}</span>
</div>

<div class="section-label">Project Name</div>
<div class="field-row">
  <input type="text" id="projectName" placeholder="e.g. AcmeCorp WebApp" maxlength="80">
</div>

<div class="section-label">Type</div>
<div class="field-row">
  <select id="appType">
    <option value="Web">Web</option>
    <option value="API">API</option>
  </select>
</div>

<!-- WEB FORM -->
<div id="webSection">

  <div class="section-label">App &amp; Credentials</div>
  <div id="appList"></div>
  <button class="btn-add" id="btnAddApp">+ Add App</button>

</div>

<!-- API FORM -->
<div id="apiSection" class="hidden">

  <div class="section-label">Collection File</div>
  <p class="desc">Select a Postman / Insomnia / OpenAPI collection file for this API project.</p>
  <div class="path-row">
    <input type="text" id="collectionPath" placeholder="/path/to/collection.json" readonly>
    <button class="btn-browse" id="btnBrowseCollection">Browse...</button>
  </div>

</div>

<hr class="divider">
<button class="btn-create" id="btnCreate" ${hasWorkspace ? "" : "disabled"}>+ Create Project</button>
<p class="create-hint${hasWorkspace ? " hidden" : ""}" id="createHint">Set a workspace folder in Settings to enable this button.</p>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  var appCounter = 0;

  // Type selector
  document.getElementById('appType').addEventListener('change', function() {
    var isWeb = this.value === 'Web';
    document.getElementById('webSection').classList.toggle('hidden', !isWeb);
    document.getElementById('apiSection').classList.toggle('hidden', isWeb);
  });

  // Add app button
  document.getElementById('btnAddApp').addEventListener('click', addApp);

  // App list - event delegation for remove-endpoint, remove-cred, add-cred
  document.getElementById('appList').addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    if (action === 'remove-endpoint') {
      btn.closest('.endpoint-block').remove();
    } else if (action === 'remove-cred') {
      var row = btn.closest('.cred-row');
      var list = row.parentElement;
      if (list.children.length > 1) {
        row.remove();
      } else {
        row.querySelectorAll('input').forEach(function(i) { i.value = ''; });
      }
    } else if (action === 'add-cred') {
      var block = btn.closest('.endpoint-block');
      var credList = block.querySelector('.cred-list');
      var row = document.createElement('div');
      row.className = 'cred-row';
      row.innerHTML = '<input type="text" placeholder="Admin" class="cred-role">'
        + '<input type="text" placeholder="user@example.com" class="cred-user">'
        + '<input type="text" placeholder="password" class="cred-pass">'
        + '<button class="btn-remove" data-action="remove-cred" title="Remove">x</button>';
      credList.appendChild(row);
      row.querySelector('input').focus();
    }
  });

  // Browse collection
  document.getElementById('btnBrowseCollection').addEventListener('click', function() {
    vscode.postMessage({ command: 'browseCollection' });
  });

  // Create project
  document.getElementById('btnCreate').addEventListener('click', createProject);

  function addApp() {
    var list = document.getElementById('appList');
    var idx = appCounter++;
    var block = document.createElement('div');
    block.className = 'endpoint-block';
    block.innerHTML =
      '<div class="endpoint-header">'
      + '<input type="text" placeholder="https://example.com/login" class="app-url">'
      + '<button class="btn-remove" data-action="remove-endpoint" title="Remove app">x</button>'
      + '</div>'
      + '<div class="app-sso-row">'
      + '<div class="toggle-group">'
      + '<input type="radio" name="sso-' + idx + '" id="sso-yes-' + idx + '" value="yes">'
      + '<label for="sso-yes-' + idx + '">SSO</label>'
      + '<input type="radio" name="sso-' + idx + '" id="sso-no-' + idx + '" value="no" checked>'
      + '<label for="sso-no-' + idx + '">Non-SSO</label>'
      + '</div>'
      + '</div>'
      + '<div class="cred-section">'
      + '<div class="cred-headers"><span>Role</span><span>Username</span><span>Password</span><span></span></div>'
      + '<div class="cred-list">'
      + '<div class="cred-row">'
      + '<input type="text" placeholder="Admin" class="cred-role">'
      + '<input type="text" placeholder="user@example.com" class="cred-user">'
      + '<input type="text" placeholder="password" class="cred-pass">'
      + '<button class="btn-remove" data-action="remove-cred" title="Remove">x</button>'
      + '</div>'
      + '</div>'
      + '<button class="btn-add-cred" data-action="add-cred">+ Add Credential</button>'
      + '</div>';
    list.appendChild(block);
    block.querySelector('.app-url').focus();
  }

  function createProject() {
    var name = document.getElementById('projectName').value.trim();
    if (!name) { document.getElementById('projectName').focus(); return; }
    var type = document.getElementById('appType').value;
    var payload;
    if (type === 'Web') {
      var apps = Array.from(document.querySelectorAll('#appList .endpoint-block')).map(function(b) {
        return {
          url: b.querySelector('.app-url').value.trim(),
          sso: b.querySelector('input[value="yes"]').checked,
          credentials: Array.from(b.querySelectorAll('.cred-row')).map(function(r) {
            return {
              role: r.querySelector('.cred-role').value.trim(),
              username: r.querySelector('.cred-user').value.trim(),
              password: r.querySelector('.cred-pass').value.trim()
            };
          }).filter(function(c) { return c.role || c.username || c.password; })
        };
      }).filter(function(a) { return a.url; });
      payload = { name: name, type: type, apps: apps, collectionFile: '' };
    } else {
      var col = document.getElementById('collectionPath').value.trim();
      payload = { name: name, type: type, apps: [], collectionFile: col };
    }
    vscode.postMessage({ command: 'createProject', payload: payload });
  }

  // Messages from extension host
  window.addEventListener('message', function(e) {
    var msg = e.data;
    if (msg.command === 'workspacePath') {
      var bar  = document.getElementById('workspaceBar');
      var text = document.getElementById('wsPathText');
      var btn  = document.getElementById('btnCreate');
      var hint = document.getElementById('createHint');
      if (msg.path) {
        bar.className = 'workspace-bar has-path';
        text.innerHTML = '<span class="ws-path">' + msg.path + '</span>';
        btn.disabled = false;
        hint.classList.add('hidden');
      } else {
        bar.className = 'workspace-bar no-path';
        text.textContent = '(!) No workspace set - configure it in Settings below.';
        btn.disabled = true;
        hint.classList.remove('hidden');
      }
    }
    if (msg.command === 'collectionSelected') {
      document.getElementById('collectionPath').value = msg.path;
    }
    if (msg.command === 'reset') {
      document.getElementById('projectName').value = '';
      document.getElementById('appList').innerHTML = '';
      document.getElementById('collectionPath').value = '';
      document.getElementById('appType').value = 'Web';
      document.getElementById('webSection').classList.remove('hidden');
      document.getElementById('apiSection').classList.add('hidden');
    }
  });
</script>
</body>
</html>`;
    }
}
exports.NewProjectViewProvider = NewProjectViewProvider;
//# sourceMappingURL=newProjectView.js.map