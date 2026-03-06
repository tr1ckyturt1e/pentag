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
exports.ProjectPanel = void 0;
const vscode = __importStar(require("vscode"));
const dashboardTab = __importStar(require("./tabs/dashboardTab"));
const scannerTab = __importStar(require("./tabs/scannerTab"));
// ---------------------------------------------------------------------------
// ProjectPanel — full-editor webview that opens per project
// ---------------------------------------------------------------------------
class ProjectPanel {
    static _open = new Map();
    _panel;
    _config;
    //  Factory
    static open(context, config, projectPath) {
        const existing = ProjectPanel._open.get(projectPath);
        if (existing) {
            existing._panel.reveal(vscode.ViewColumn.One);
            return;
        }
        new ProjectPanel(context, config, projectPath);
    }
    //  Constructor
    constructor(context, config, projectPath) {
        this._config = config;
        this._panel = vscode.window.createWebviewPanel("pentag.projectView", config.name, vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
        ProjectPanel._open.set(projectPath, this);
        this._panel.webview.html = this._getHtml();
        this._panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.command === "webviewReady") {
                await this._pushModels();
                return;
            }
            await dashboardTab.handleMessage(msg, this._panel, this._config, projectPath, (updated) => {
                this._config = updated;
            });
            await scannerTab.handleMessage(msg, this._panel, this._config);
        }, undefined, context.subscriptions);
        this._panel.onDidDispose(() => ProjectPanel._open.delete(projectPath), null, context.subscriptions);
    }
    //  Push models to webview
    async _pushModels() {
        try {
            const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
            this._panel.webview.postMessage({
                command: "modelList",
                models: models.map((m) => ({ id: m.id, name: m.name })),
            });
        }
        catch {
            this._panel.webview.postMessage({ command: "modelList", models: [] });
        }
    }
    //  Build HTML
    _getHtml() {
        const nonce = this._getNonce();
        // JSON.stringify is safe for a JS var assignment; only < > & need escaping
        // to prevent the string from being interpreted as HTML
        const configJson = JSON.stringify(this._config)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026");
        const title = this._config.name
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;");
        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<title>${title}</title>
<style nonce="${nonce}">
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  input, select, textarea {
    width: 100%;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.12));
    border-radius: 3px;
    padding: 5px 8px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
  }
  input:focus, select:focus, textarea:focus { border-color: var(--vscode-focusBorder, #007acc); }
  input::placeholder, textarea::placeholder { opacity: 0.4; }
  input[readonly] { opacity: 0.7; cursor: default; }
  select { cursor: pointer; appearance: none; padding-right: 24px; }
  .hidden { display: none !important; }
  .btn-remove {
    background: none; border: none;
    color: var(--vscode-errorForeground, #f48771);
    cursor: pointer; font-size: 14px; line-height: 1;
    padding: 2px 5px; border-radius: 3px; flex-shrink: 0;
  }
  .btn-remove:hover { background: var(--vscode-toolbar-hoverBackground); }

  /* ── Tab bar ─────────────────────────────────────────────────────────── */
  .tab-bar {
    display: flex;
    flex-shrink: 0;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
    background: var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-editor-background));
    padding: 0 8px;
  }
  .tab {
    padding: 9px 20px 7px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--vscode-tab-inactiveForeground, rgba(255,255,255,0.5));
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
    white-space: nowrap;
  }
  .tab:hover { color: var(--vscode-foreground); }
  .tab.active {
    color: var(--vscode-tab-activeForeground, var(--vscode-foreground));
    border-bottom-color: var(--vscode-focusBorder, #007acc);
  }
  .tab-content { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
  .tab-content.hidden { display: none; }

  ${dashboardTab.getCss()}
  ${scannerTab.getCss()}
</style>
</head>
<body>

<!-- Tab bar -->
<div class="tab-bar">
  <button class="tab active" data-tab="dashboard">Dashboard</button>
  <button class="tab"        data-tab="scanner">Scanner</button>
</div>

<!-- Dashboard tab -->
<div class="tab-content" id="tab-dashboard">
  ${dashboardTab.getHtml()}
</div>

<!-- Scanner tab -->
<div class="tab-content hidden" id="tab-scanner">
  ${scannerTab.getHtml()}
</div>

<script nonce="${nonce}">
(function () {
  'use strict';
  var vscode = acquireVsCodeApi();
  var CONFIG = ${configJson};

  /* ── Tab switching ──────────────────────────────────────────────────── */
  document.querySelectorAll('.tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.add('hidden'); });
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });

  ${dashboardTab.getScript()}
  ${scannerTab.getScript()}

  /* ── Signal extension that webview is ready ─────────────────────────── */
  vscode.postMessage({ command: 'webviewReady' });
}());
</script>
</body>
</html>`;
    }
    _getNonce() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let t = "";
        for (let i = 0; i < 32; i++) {
            t += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return t;
    }
}
exports.ProjectPanel = ProjectPanel;
//# sourceMappingURL=projectPanel.js.map