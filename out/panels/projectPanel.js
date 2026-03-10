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
const path = __importStar(require("path"));
const dashboardTab = __importStar(require("./tabs/dashboardTab"));
const scannerTab = __importStar(require("./tabs/scannerTab"));
const orchestrator_1 = require("../runtime/orchestrator");
const agentLoader_1 = require("../runtime/agentLoader");
const modelService_1 = require("../runtime/modelService");
const memoryStore_1 = require("../runtime/memoryStore");
const sitemapStore_1 = require("../tools/sitemapStore");
const sessionStore_1 = require("../runtime/sessionStore");
// ---------------------------------------------------------------------------
// ProjectPanel — full-editor webview that opens per project
// ---------------------------------------------------------------------------
class ProjectPanel {
    static _open = new Map();
    /**
     * Optional callback invoked whenever a scan starts or ends.
     * Receives the folder name (basename of projectPath) while scanning, or
     * null when the scan finishes. Wired up by OpenProjectViewProvider so the
     * My Projects sidebar can show a live "scanning" indicator.
     */
    static onScanStateChanged;
    _panel;
    _config;
    // -- Scanner state -------------------------------------------------------
    _cts;
    _hitlResolve;
    _hitlReject;
    _isPaused = false;
    _pauseResolve;
    _projectPath;
    _agentLoader;
    _modelService;
    _memoryStore;
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
        this._projectPath = projectPath;
        // Resolve the agents directory (relative to the extension root)
        const agentsDir = path.join(context.extensionPath, "src", "agents");
        this._agentLoader = new agentLoader_1.AgentLoader(agentsDir);
        this._modelService = new modelService_1.ModelService();
        this._memoryStore = new memoryStore_1.MemoryStore();
        // Scanner event handlers passed to scannerTab.handleMessage
        const handlers = {
            onRunScanner: (modelId, mcpServers) => {
                void this._startScan(modelId, mcpServers);
            },
            onPauseScanner: () => {
                if (!this._isPaused && this._cts) {
                    this._isPaused = true;
                    try {
                        this._panel.webview.postMessage({ command: "scanPaused" });
                    }
                    catch {
                        /* panel may be disposed */
                    }
                }
            },
            onResumeScanner: () => {
                if (this._isPaused) {
                    this._isPaused = false;
                    this._pauseResolve?.();
                    this._pauseResolve = undefined;
                    try {
                        this._panel.webview.postMessage({ command: "scanResumed" });
                    }
                    catch {
                        /* panel may be disposed */
                    }
                }
            },
            onCancelScanner: () => {
                // Unblock pause gate so the cancellation check fires immediately
                this._isPaused = false;
                this._pauseResolve?.();
                this._pauseResolve = undefined;
                // Reject any pending HITL promise so the orchestrator isn't deadlocked
                this._hitlReject?.(new Error("Cancelled"));
                this._hitlReject = undefined;
                this._hitlResolve = undefined;
                this._cts?.cancel();
            },
            onHitlResponse: (text) => {
                if (this._hitlResolve) {
                    this._hitlResolve(text);
                    this._hitlResolve = undefined;
                }
            },
        };
        this._panel = vscode.window.createWebviewPanel("pentag.projectView", config.name, vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
        ProjectPanel._open.set(projectPath, this);
        this._panel.webview.html = this._getHtml();
        this._panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.command === "webviewReady") {
                await this._pushModels();
                await this._pushTools();
                return;
            }
            await dashboardTab.handleMessage(msg, this._panel, this._config, projectPath, (updated) => {
                this._config = updated;
            });
            scannerTab.handleMessage(msg, this._panel, this._config, handlers);
        }, undefined, context.subscriptions);
        this._panel.onDidDispose(() => {
            this._isPaused = false;
            this._pauseResolve?.();
            this._pauseResolve = undefined;
            this._hitlReject?.(new Error("Cancelled"));
            this._hitlReject = undefined;
            this._hitlResolve = undefined;
            this._cts?.cancel();
            this._cts = undefined;
            ProjectPanel._open.delete(projectPath);
        }, null, context.subscriptions);
    }
    //  Start the AI scanner
    //
    //  Instead of running the orchestrator directly (which has no
    //  toolInvocationToken and triggers web-access permission pop-ups), this
    //  method registers all scan state in ScanBridge and opens Copilot Chat
    //  with "@axis /scan" pre-filled.  The chat participant handler fires with
    //  a valid request.toolInvocationToken, consumes the registered scan, and
    //  runs the orchestrator — all MCP tool calls are then authorised silently.
    async _startScan(modelId, mcpServers) {
        if (this._cts) {
            vscode.window.showWarningMessage("A scan is already in progress.");
            return;
        }
        // Point sitemap tools at this project's directory and clear previous results.
        (0, sitemapStore_1.setSitemapProjectPath)(this._projectPath);
        (0, sessionStore_1.setSessionProjectPath)(this._projectPath);
        sitemapStore_1.SitemapManager.clear();
        (0, sessionStore_1.clearSession)(this._projectPath);
        this._cts = new vscode.CancellationTokenSource();
        ProjectPanel.onScanStateChanged?.(path.basename(this._projectPath));
        this._panel.webview.postMessage({ command: "scanStarted" });
        const context = {
            projectConfig: this._config,
            modelId,
            conversationHistory: this._memoryStore.get(this._projectPath),
            findings: [],
            cancellationToken: this._cts.token,
            selectedMcpServers: mcpServers,
            projectPath: this._projectPath,
            onStatus: (agentId, status) => {
                try {
                    this._panel.webview.postMessage({
                        command: "agentStatus",
                        agentId,
                        status,
                    });
                }
                catch {
                    /* panel may be disposed */
                }
            },
            onHitlQuestion: (agentId, question) => {
                try {
                    this._panel.webview.postMessage({
                        command: "hitlQuestion",
                        agentId,
                        text: question,
                    });
                }
                catch {
                    /* panel may be disposed */
                }
                return new Promise((resolve, reject) => {
                    this._hitlResolve = resolve;
                    this._hitlReject = reject;
                });
            },
            onVuln: (vuln) => {
                const command = vuln.type === "confirmed" ? "confirmedVuln" : "tentativeVuln";
                try {
                    this._panel.webview.postMessage({ command, vuln });
                }
                catch {
                    /* panel may be disposed */
                }
            },
            waitIfPaused: () => {
                if (!this._isPaused) {
                    return Promise.resolve();
                }
                return new Promise((resolve) => {
                    this._pauseResolve = resolve;
                });
            },
        };
        const intent = `Run a full penetration test on ${this._config.apps[0]?.url ?? "the configured target"}. ` +
            `Project: ${this._config.name}.`;
        const orchestrator = new orchestrator_1.Orchestrator(this._agentLoader, this._modelService, this._memoryStore);
        try {
            await orchestrator.run(intent, context, this._projectPath, (chunk, agentId) => {
                try {
                    this._panel.webview.postMessage({
                        command: "scannerChunk",
                        agentId,
                        text: chunk,
                    });
                }
                catch {
                    /* panel may be disposed */
                }
            });
        }
        catch (err) {
            if (!(err instanceof vscode.CancellationError)) {
                vscode.window.showErrorMessage(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        finally {
            this._cts.dispose();
            this._cts = undefined;
            this._hitlResolve = undefined;
            this._hitlReject = undefined;
            this._isPaused = false;
            this._pauseResolve = undefined;
            ProjectPanel.onScanStateChanged?.(null);
            try {
                this._panel.webview.postMessage({ command: "scanEnded" });
            }
            catch {
                /* panel may be disposed */
            }
        }
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
    //  Push MCP server names to the webview.
    //  VS Code's getConfiguration() re-interprets dots in server IDs (e.g.
    //  "com.microsoft/playwright-mcp") as nested object paths, so Object.keys()
    //  there yields "com" and "io" instead of the real identifiers.
    //  We bypass that by reading .vscode/mcp.json directly from disk, and fall
    //  back to inspecting the raw settings value, then LM tool names.
    async _pushTools() {
        try {
            let serverNames = [];
            // ── 1. Read .vscode/mcp.json directly (most reliable source) ─────────
            for (const folder of vscode.workspace.workspaceFolders ?? []) {
                try {
                    const uri = vscode.Uri.joinPath(folder.uri, ".vscode", "mcp.json");
                    const raw = await vscode.workspace.fs.readFile(uri);
                    const parsed = JSON.parse(Buffer.from(raw).toString("utf8"));
                    const servers = (parsed["servers"] ?? {});
                    const keys = Object.keys(servers);
                    if (keys.length > 0) {
                        serverNames = keys;
                        break;
                    }
                }
                catch {
                    /* file absent or invalid JSON — try next source */
                }
            }
            // ── 2. inspect() the raw merged settings value (avoids dot-splitting) ─
            if (serverNames.length === 0) {
                const insp = vscode.workspace
                    .getConfiguration()
                    .inspect("mcp.servers");
                for (const val of [
                    insp?.workspaceFolderValue,
                    insp?.workspaceValue,
                    insp?.globalValue,
                ]) {
                    if (val && typeof val === "object") {
                        const keys = Object.keys(val);
                        if (keys.length > 0) {
                            serverNames = keys;
                            break;
                        }
                    }
                }
            }
            // ── 3. Last resort: derive from registered LM tool names ─────────────
            if (serverNames.length === 0) {
                serverNames = [
                    ...new Set(vscode.lm.tools
                        .filter((t) => t.name.startsWith("mcp_") || t.name.startsWith("mcp__"))
                        .map((t) => {
                        // Double-underscore (VS Code 1.96+): mcp__<serverId>__<tool>
                        const d = t.name.match(/^mcp__(.+?)__/);
                        if (d) {
                            return d[1];
                        }
                        // Single-underscore: return full remainder as-is
                        const s = t.name.match(/^mcp_(.+)/);
                        return s ? s[1] : null;
                    })
                        .filter((s) => s !== null)),
                ];
            }
            this._panel.webview.postMessage({
                command: "mcpServerList",
                servers: serverNames,
            });
        }
        catch {
            this._panel.webview.postMessage({
                command: "mcpServerList",
                servers: [],
            });
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