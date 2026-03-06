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
exports.OpenProjectViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const projectPanel_1 = require("../panels/projectPanel");
class OpenProjectViewProvider {
    _context;
    static viewType = "pentag.openProjectView";
    _view;
    constructor(_context) {
        this._context = _context;
    }
    /** Called whenever the workspace path changes so the list can refresh. */
    notifyWorkspaceChanged() {
        this._refresh();
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getHtml(webviewView.webview);
        webviewView.webview.onDidReceiveMessage((message) => {
            if (message.command === "loadProject" && message.folderName) {
                const workspacePath = this._context.globalState.get("pentag.workspacePath");
                if (!workspacePath) {
                    return;
                }
                const projectPath = path.join(workspacePath, message.folderName);
                const configPath = path.join(projectPath, "proj_config.json");
                if (!fs.existsSync(configPath)) {
                    vscode.window.showErrorMessage("AXIS Bot: Project config not found.");
                    return;
                }
                try {
                    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
                    projectPanel_1.ProjectPanel.open(this._context, config, projectPath);
                }
                catch (err) {
                    vscode.window.showErrorMessage(`AXIS Bot: Failed to open project: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
            else if (message.command === "refresh") {
                this._refresh();
            }
        }, undefined, this._context.subscriptions);
    }
    _refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtml(this._view.webview);
        }
    }
    _scanProjects() {
        const workspacePath = this._context.globalState.get("pentag.workspacePath");
        if (!workspacePath || !fs.existsSync(workspacePath)) {
            return [];
        }
        try {
            const entries = fs.readdirSync(workspacePath, { withFileTypes: true });
            const projects = [];
            for (const entry of entries) {
                if (!entry.isDirectory()) {
                    continue;
                }
                const configPath = path.join(workspacePath, entry.name, "proj_config.json");
                if (fs.existsSync(configPath)) {
                    try {
                        const raw = fs.readFileSync(configPath, "utf8");
                        const config = JSON.parse(raw);
                        projects.push({
                            name: config.name || entry.name,
                            folderName: entry.name,
                            type: config.type || "Web",
                            createdAt: config.createdAt || "",
                        });
                    }
                    catch {
                        // skip unreadable / malformed configs
                    }
                }
            }
            return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }
        catch {
            return [];
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
    _getHtml(_webview) {
        const nonce = this._getNonce();
        const workspacePath = this._context.globalState.get("pentag.workspacePath") ?? "";
        const projects = this._scanProjects();
        const listHtml = projects.length === 0
            ? `<p class="empty-msg">${workspacePath ? "No projects found in workspace." : "No workspace configured - set one in Settings."}</p>`
            : projects
                .map((p) => `
      <div class="project-item" data-folder="${p.folderName.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">
        <div class="proj-main">
          <div>
            <div class="proj-name">${p.name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            <div class="proj-meta">
              <span class="proj-type ${p.type.toLowerCase()}">${p.type}</span>
              ${p.createdAt ? `<span class="proj-date">${new Date(p.createdAt).toLocaleDateString()}</span>` : ""}
            </div>
          </div>
          <button class="btn-load" data-action="load" data-folder="${p.folderName.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">Load</button>
        </div>
      </div>`)
                .join("");
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<title>Open Project</title>
<style nonce="${nonce}">
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 10px 12px;
    line-height: 1.5;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .count {
    font-size: 10px;
    opacity: 0.5;
  }

  .btn-refresh {
    background: none;
    border: none;
    color: var(--vscode-textLink-foreground, #4fc1ff);
    cursor: pointer;
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 3px;
  }
  .btn-refresh:hover { background: var(--vscode-toolbar-hoverBackground); }

  .empty-msg {
    font-size: 11px;
    opacity: 0.5;
    text-align: center;
    padding: 20px 0;
    line-height: 1.5;
  }

  .project-item {
    padding: 8px 10px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    margin-bottom: 5px;
    background: rgba(255,255,255,0.03);
    transition: background 0.1s;
  }
  .project-item:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder, transparent);
  }

  .proj-name {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .proj-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .proj-type {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 2px;
  }
  .proj-type.web {
    background: rgba(79, 193, 255, 0.15);
    color: #4fc1ff;
  }
  .proj-type.api {
    background: rgba(78, 201, 176, 0.15);
    color: #4ec9b0;
  }

  .proj-date {
    font-size: 10px;
    opacity: 0.45;
  }

  .proj-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .btn-load {
    flex-shrink: 0;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn-load:hover { background: var(--vscode-button-hoverBackground); }
</style>
</head>
<body>

<div class="toolbar">
  <span class="count">${projects.length} project${projects.length !== 1 ? "s" : ""}</span>
  <button class="btn-refresh" id="btnRefresh" title="Refresh list">Refresh</button>
</div>

${listHtml}

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();

  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action="load"]');
    if (btn) {
      vscode.postMessage({ command: 'loadProject', folderName: btn.dataset.folder });
      return;
    }
  });

  document.getElementById('btnRefresh').addEventListener('click', function() {
    vscode.postMessage({ command: 'refresh' });
  });
</script>
</body>
</html>`;
    }
}
exports.OpenProjectViewProvider = OpenProjectViewProvider;
//# sourceMappingURL=openProjectView.js.map