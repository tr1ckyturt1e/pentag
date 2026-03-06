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
exports.getCss = getCss;
exports.getHtml = getHtml;
exports.getScript = getScript;
exports.handleMessage = handleMessage;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ---------------------------------------------------------------------------
// CSS for the Dashboard tab
// ---------------------------------------------------------------------------
function getCss() {
    return /* css */ `
  /* ── Dashboard layout ─────────────────────────────────────────────────── */
  .dashboard-layout {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .panel-left {
    flex: 0 0 60%;
    min-height: 0;
    padding: 20px 24px;
    overflow-y: auto;
    border-right: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
  }
  .panel-right {
    flex: 1;
    min-height: 0;
    padding: 20px 24px;
    overflow-y: auto;
  }
  .panel-header {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.9px;
    opacity: 0.5;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  }
  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 7px 0;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
    font-size: 12px;
  }
  .meta-row:last-child { border-bottom: none; }
  .meta-label { opacity: 0.5; flex-shrink: 0; margin-right: 12px; }
  .meta-value {
    font-weight: 500;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    opacity: 0.7;
    margin: 14px 0 6px;
  }
  .section-label:first-child { margin-top: 0; }
  .field-row { margin-bottom: 6px; }
  .path-row { display: flex; gap: 4px; align-items: center; }
  .path-row input { flex: 1; min-width: 0; }

  /* endpoint blocks */
  .endpoint-block {
    border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.12));
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 6px;
    background: rgba(255,255,255,0.03);
  }
  .endpoint-header {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
  }
  .endpoint-header input { flex: 1; }
  .app-sso-row { margin-bottom: 8px; }
  .toggle-group {
    display: inline-flex;
    border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.2));
    border-radius: 3px;
    overflow: hidden;
  }
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
  .cred-section {
    padding-left: 8px;
    border-left: 2px solid var(--vscode-input-border, rgba(255,255,255,0.1));
    margin-top: 4px;
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
  .btn-browse:hover {
    background: var(--vscode-button-secondaryHoverBackground, rgba(255,255,255,0.14));
  }
  .btn-update {
    margin-top: 16px;
    padding: 7px 22px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .btn-update:hover { background: var(--vscode-button-hoverBackground); }
  .save-msg {
    display: inline-block;
    margin-top: 10px;
    font-size: 11px;
    color: #4ec9b0;
    opacity: 0;
    transition: opacity 0.25s;
    margin-left: 10px;
  }
  .save-msg.visible { opacity: 1; }

  `;
}
// ---------------------------------------------------------------------------
// HTML markup for the Dashboard tab content
// ---------------------------------------------------------------------------
function getHtml() {
    return /* html */ `
<div class="dashboard-layout">

  <!-- Left: Project Details form -->
  <div class="panel-left">
    <div class="panel-header">Project Details</div>

    <div class="section-label">Project Name</div>
    <div class="field-row">
      <input type="text" id="fName" placeholder="e.g. AcmeCorp WebApp" maxlength="80">
    </div>

    <div class="section-label">Type</div>
    <div class="field-row">
      <select id="fType">
        <option value="Web">Web</option>
        <option value="API">API</option>
      </select>
    </div>

    <div id="webSection">
      <div class="section-label">Apps &amp; Credentials</div>
      <div id="appList"></div>
      <button class="btn-add" id="btnAddApp">+ Add App</button>
    </div>

    <div id="apiSection" class="hidden">
      <div class="section-label">Collection File</div>
      <div class="path-row">
        <input type="text" id="fCollectionFile" placeholder="/path/to/collection.json" readonly>
        <button class="btn-browse" id="btnBrowseCollection">Browse&hellip;</button>
      </div>
    </div>

    <div>
      <button class="btn-update" id="btnUpdate">Update</button>
      <span class="save-msg" id="saveMsg">Saved</span>
    </div>
  </div>

  <!-- Right: Status section -->
  <div class="panel-right">
    <div class="panel-header">Status</div>
    <div id="statusContent"></div>
  </div>

</div>
  `;
}
// ---------------------------------------------------------------------------
// Inline JS for the Dashboard tab (no module system — runs in webview)
// ---------------------------------------------------------------------------
function getScript() {
    return /* js */ `
  /* ── Dashboard ─────────────────────────────────────────────────────────── */
  (function initDashboard() {
    var appCounter = 0;

    // ── helpers ──────────────────────────────────────────────────────────
    function esc(v) {
      return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function appendCredRow(credList, cred) {
      var row = document.createElement('div');
      row.className = 'cred-row';
      row.innerHTML =
        '<input type="text"      class="cred-role" placeholder="Admin"'
          + ' value="' + (cred ? esc(cred.role)     : '') + '">'
        + '<input type="text"      class="cred-user" placeholder="user@example.com"'
          + ' value="' + (cred ? esc(cred.username) : '') + '">'
        + '<input type="password"  class="cred-pass" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"'
          + ' value="' + (cred ? esc(cred.password) : '') + '">'
        + '<button class="btn-remove" data-action="remove-cred" title="Remove">\u2715</button>';
      credList.appendChild(row);
    }

    function addApp(data) {
      var list = document.getElementById('appList');
      var idx  = appCounter++;
      var ssoVal = data ? (data.sso ? 'yes' : 'no') : 'no';

      var block = document.createElement('div');
      block.className = 'endpoint-block';
      block.innerHTML =
        '<div class="endpoint-header">'
          + '<input type="text" class="app-url" placeholder="https://example.com/login"'
            + ' value="' + (data ? esc(data.url) : '') + '">'
          + '<button class="btn-remove" data-action="remove-endpoint" title="Remove app">\u2715</button>'
        + '</div>'
        + '<div class="app-sso-row"><div class="toggle-group">'
          + '<input type="radio" name="sso-' + idx + '" id="sso-yes-' + idx + '" value="yes"' + (ssoVal==='yes'?' checked':'') + '>'
          + '<label for="sso-yes-' + idx + '">SSO</label>'
          + '<input type="radio" name="sso-' + idx + '" id="sso-no-'  + idx + '" value="no"'  + (ssoVal==='no' ?' checked':'') + '>'
          + '<label for="sso-no-'  + idx + '">Non-SSO</label>'
        + '</div></div>'
        + '<div class="cred-section">'
          + '<div class="cred-headers"><span>Role</span><span>Username</span><span>Password</span><span></span></div>'
          + '<div class="cred-list"></div>'
          + '<button class="btn-add-cred" data-action="add-cred">+ Add Credential</button>'
        + '</div>';

      list.appendChild(block);
      var credList = block.querySelector('.cred-list');
      var creds = (data && data.credentials && data.credentials.length > 0)
        ? data.credentials : [null];
      creds.forEach(function(c) { appendCredRow(credList, c); });
      if (!data) { block.querySelector('.app-url').focus(); }
      return block;
    }

    function collectConfig() {
      var updated = JSON.parse(JSON.stringify(CONFIG));
      updated.name = document.getElementById('fName').value.trim();
      updated.type = document.getElementById('fType').value;
      if (updated.type === 'API') {
        updated.collectionFile = document.getElementById('fCollectionFile').value.trim() || undefined;
        updated.apps = [];
      } else {
        updated.collectionFile = undefined;
        updated.apps = [];
        document.querySelectorAll('#appList .endpoint-block').forEach(function(b) {
          var ssoYes = b.querySelector('input[value="yes"]');
          var creds  = [];
          b.querySelectorAll('.cred-row').forEach(function(r) {
            var role = r.querySelector('.cred-role').value.trim();
            var user = r.querySelector('.cred-user').value.trim();
            var pass = r.querySelector('.cred-pass').value;
            if (role || user || pass) { creds.push({ role: role, username: user, password: pass }); }
          });
          updated.apps.push({
            url: b.querySelector('.app-url').value.trim(),
            sso: ssoYes ? ssoYes.checked : false,
            credentials: creds
          });
        });
      }
      return updated;
    }

    // ── populate from CONFIG ─────────────────────────────────────────────
    try {
      document.getElementById('fName').value = CONFIG.name || '';
      var typeEl = document.getElementById('fType');
      typeEl.value = (CONFIG.type === 'API') ? 'API' : 'Web';
      var isWeb = typeEl.value === 'Web';
      document.getElementById('webSection').classList.toggle('hidden', !isWeb);
      document.getElementById('apiSection').classList.toggle('hidden', isWeb);

      if (isWeb) {
        var apps = Array.isArray(CONFIG.apps) ? CONFIG.apps : [];
        apps.forEach(function(app) { addApp(app); });
      } else {
        document.getElementById('fCollectionFile').value = CONFIG.collectionFile || '';
      }
    } catch (e) {
      console.error('AXIS dashboard populate:', e);
    }

    // ── event listeners ───────────────────────────────────────────────────
    document.getElementById('fType').addEventListener('change', function() {
      var isWeb = this.value === 'Web';
      document.getElementById('webSection').classList.toggle('hidden', !isWeb);
      document.getElementById('apiSection').classList.toggle('hidden', isWeb);
    });

    document.getElementById('btnAddApp').addEventListener('click', function() {
      addApp(null);
    });

    document.getElementById('appList').addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) { return; }
      var action = btn.dataset.action;
      if (action === 'remove-endpoint') {
        btn.closest('.endpoint-block').remove();
      } else if (action === 'remove-cred') {
        var row  = btn.closest('.cred-row');
        var list = row.parentElement;
        if (list.children.length > 1) { row.remove(); }
        else { row.querySelectorAll('input').forEach(function(i) { i.value = ''; }); }
      } else if (action === 'add-cred') {
        var block    = btn.closest('.endpoint-block');
        var credList = block.querySelector('.cred-list');
        appendCredRow(credList, null);
        credList.lastElementChild.querySelector('input').focus();
      }
    });

    document.getElementById('btnBrowseCollection').addEventListener('click', function() {
      vscode.postMessage({ command: 'browseCollection' });
    });

    document.getElementById('btnUpdate').addEventListener('click', function() {
      vscode.postMessage({ command: 'updateProject', config: collectConfig() });
    });

    // ── messages from extension ───────────────────────────────────────────
    window.addEventListener('message', function(e) {
      var d = e.data;
      if (d.command === 'saved') {
        var el = document.getElementById('saveMsg');
        el.classList.add('visible');
        setTimeout(function() { el.classList.remove('visible'); }, 2500);
      }
      if (d.command === 'collectionSelected') {
        document.getElementById('fCollectionFile').value = d.path;
      }
    });

  })(); // end initDashboard
  `;
}
// ---------------------------------------------------------------------------
// Extension-side message handler for dashboard commands
// ---------------------------------------------------------------------------
async function handleMessage(msg, panel, config, projectPath, onConfigUpdated) {
    if (msg.command === "updateProject" && msg.config) {
        try {
            const cfg = msg.config;
            const configPath = path.join(projectPath, "proj_config.json");
            fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf8");
            onConfigUpdated(cfg);
            panel.title = cfg.name;
            panel.webview.postMessage({ command: "saved" });
            vscode.window.showInformationMessage(`Project "${cfg.name}" updated.`);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
        }
        return;
    }
    if (msg.command === "browseCollection") {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { "Collection files": ["json", "yaml", "yml"] },
            title: "Select collection file",
        });
        if (uris?.[0]) {
            panel.webview.postMessage({
                command: "collectionSelected",
                path: uris[0].fsPath,
            });
        }
        return;
    }
}
//# sourceMappingURL=dashboardTab.js.map