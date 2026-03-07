import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ProjectConfig } from "../../views/newProjectView";

// ---------------------------------------------------------------------------
// CSS for the Dashboard tab
// ---------------------------------------------------------------------------
export function getCss(): string {
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

  /* ── Agent status panel ───────────────────────────────────────────────── */
  .agent-status-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-top: 4px;
  }

  /* Top-level orchestrator row */
  .agent-status-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 5px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
    transition: background 0.2s;
  }
  .agent-status-row.orchestrator-row {
    background: rgba(79,195,247,0.05);
    border-color: rgba(79,195,247,0.18);
  }

  /* Sub-agents block — indented tree below the orchestrator */
  .subagents-block {
    display: flex;
    flex-direction: column;
    margin-left: 18px;          /* indent from orchestrator */
    padding-left: 12px;         /* room for the tree line */
    border-left: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.12));
    margin-top: 4px;
    margin-bottom: 4px;
    gap: 4px;
  }
  .subagent-row-wrap {
    display: flex;
    align-items: stretch;
  }
  /* horizontal connector ── before each sub-agent */
  .subagent-row-wrap::before {
    content: '';
    display: block;
    width: 12px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.12));
    margin-bottom: auto;
    margin-top: 16px; /* vertically centers on the row */
  }
  .agent-status-row.subagent-row {
    flex: 1;
    padding: 6px 10px;
    background: rgba(255,255,255,0.02);
    border-color: rgba(255,255,255,0.06);
    border-radius: 4px;
  }
  .agent-status-row.subagent-row .agent-status-name {
    font-size: 11px;
    opacity: 0.9;
  }

  /* Dots */
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--vscode-foreground);
    opacity: 0.2;
    transition: background 0.3s, opacity 0.3s;
  }
  .status-dot[data-status='running'],
  .status-dot[data-status='waiting'] {
    opacity: 1;
    animation: pulse-dot 1.4s ease-in-out infinite;
  }
  .status-dot[data-status='running']  { background: #4fc3f7; }
  .status-dot[data-status='waiting']  { background: #ffb74d; }
  .status-dot[data-status='done']     { background: #66bb6a; opacity: 1; }
  .status-dot[data-status='failed']   { background: #ef5350; opacity: 1; }
  .status-dot[data-status='cancelled']{ background: #9e9e9e; opacity: 0.6; }
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1);   opacity: 1; }
    50%       { transform: scale(1.5); opacity: 0.6; }
  }
  .agent-status-name {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
  }
  .status-badge {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.4px;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(255,255,255,0.07);
    color: var(--vscode-foreground);
    opacity: 0.55;
    transition: background 0.3s, color 0.3s, opacity 0.3s;
    white-space: nowrap;
  }
  .status-badge[data-status='running']  { background: rgba(79,195,247,0.15);  color: #4fc3f7; opacity: 1; }
  .status-badge[data-status='waiting']  { background: rgba(255,183,77,0.15);  color: #ffb74d; opacity: 1; }
  .status-badge[data-status='done']     { background: rgba(102,187,106,0.15); color: #66bb6a; opacity: 1; }
  .status-badge[data-status='failed']   { background: rgba(239,83,80,0.15);   color: #ef5350; opacity: 1; }
  .status-badge[data-status='cancelled']{ background: rgba(158,158,158,0.1);  color: #9e9e9e; opacity: 0.8; }
  .status-scan-idle {
    font-size: 11px;
    opacity: 0.35;
    font-style: italic;
    padding: 6px 2px;
  }
  /* Orchestrator icon label */
  .orchestrator-icon {
    font-size: 11px;
    opacity: 0.4;
    margin-right: 2px;
  }

  /* Independent-agent divider between orchestrator block and peer agents */
  .agent-divider {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 10px 0 6px;
    opacity: 0.35;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }
  .agent-divider::before,
  .agent-divider::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
  }

  /* Burp Agent — independent peer, orange accent */
  .agent-status-row.burp-row {
    background: rgba(255,152,0,0.05);
    border-color: rgba(255,152,0,0.2);
  }
  .burp-icon {
    font-size: 11px;
    opacity: 0.45;
    margin-right: 2px;
  }

  `;
}

// ---------------------------------------------------------------------------
// HTML markup for the Dashboard tab content
// ---------------------------------------------------------------------------
export function getHtml(): string {
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
    <div id="statusContent">
      <div class="status-scan-idle">No scan running.</div>
      <div class="agent-status-list" id="agentStatusList" style="display:none">

        <!-- ── Orchestrator (top-level) ──────────────────────────────── -->
        <div class="agent-status-row orchestrator-row" id="status-orchestrator">
          <span class="status-dot" data-status="not-started"></span>
          <span class="agent-status-name">
            <span class="orchestrator-icon">&#9670;</span> Orchestrator
          </span>
          <span class="status-badge" data-status="not-started">Not Started</span>
        </div>

        <!-- ── Specialist sub-agents (nested under orchestrator) ─────── -->
        <div class="subagents-block" id="subagentsBlock">

          <div class="subagent-row-wrap">
            <div class="agent-status-row subagent-row" id="status-recon-agent">
              <span class="status-dot" data-status="not-started"></span>
              <span class="agent-status-name">Recon Agent</span>
              <span class="status-badge" data-status="not-started">Not Started</span>
            </div>
          </div>

          <div class="subagent-row-wrap">
            <div class="agent-status-row subagent-row" id="status-auth-agent">
              <span class="status-dot" data-status="not-started"></span>
              <span class="agent-status-name">Auth Agent</span>
              <span class="status-badge" data-status="not-started">Not Started</span>
            </div>
          </div>

          <div class="subagent-row-wrap">
            <div class="agent-status-row subagent-row" id="status-exploit-agent">
              <span class="status-dot" data-status="not-started"></span>
              <span class="agent-status-name">Exploit Agent</span>
              <span class="status-badge" data-status="not-started">Not Started</span>
            </div>
          </div>

          <div class="subagent-row-wrap">
            <div class="agent-status-row subagent-row" id="status-reporting-agent">
              <span class="status-dot" data-status="not-started"></span>
              <span class="agent-status-name">Reporting Agent</span>
              <span class="status-badge" data-status="not-started">Not Started</span>
            </div>
          </div>

        </div><!-- /subagentsBlock -->

        <!-- Burp Agent (independent peer to Orchestrator) -->
        <div class="agent-status-row burp-row" id="status-burp-agent">
          <span class="status-dot" data-status="not-started"></span>
          <span class="agent-status-name">
            <span class="burp-icon">&#9632;</span> Burp Agent
          </span>
          <span class="status-badge" data-status="not-started">Not Started</span>
        </div>

      </div><!-- /agentStatusList -->
    </div>
  </div>

</div>
  `;
}

// ---------------------------------------------------------------------------
// Inline JS for the Dashboard tab (no module system — runs in webview)
// ---------------------------------------------------------------------------
export function getScript(): string {
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
      if (d.command === 'agentStatus') {
        updateAgentStatus(d.agentId, d.status);
      }
      if (d.command === 'scanStarted') {
        document.querySelector('.status-scan-idle').style.display = 'none';
        document.getElementById('agentStatusList').style.display = 'flex';
        // Reset all agents to not-started
        document.querySelectorAll('.agent-status-row').forEach(function(row) {
          updateAgentStatus(row.id.replace('status-', ''), 'not-started');
        });
      }
      if (d.command === 'scanEnded') {
        /* leave statuses as-is so user can see final state */
      }
    });

    function updateAgentStatus(agentId, status) {
      var row = document.getElementById('status-' + agentId);
      if (!row) { return; }
      var dot   = row.querySelector('.status-dot');
      var badge = row.querySelector('.status-badge');
      dot.dataset.status   = status;
      badge.dataset.status = status;
      var labels = {
        'not-started': 'Not Started',
        'running':     'Running',
        'done':        'Complete',
        'failed':      'Failed',
        'cancelled':   'Cancelled',
        'waiting':     'Waiting for Input'
      };
      badge.textContent = labels[status] || status;
    }

  })(); // end initDashboard
  `;
}

// ---------------------------------------------------------------------------
// Extension-side message handler for dashboard commands
// ---------------------------------------------------------------------------
export async function handleMessage(
  msg: Record<string, unknown>,
  panel: vscode.WebviewPanel,
  config: ProjectConfig,
  projectPath: string,
  onConfigUpdated: (cfg: ProjectConfig) => void,
): Promise<void> {
  if (msg.command === "updateProject" && msg.config) {
    try {
      const cfg = msg.config as ProjectConfig;
      const configPath = path.join(projectPath, "proj_config.json");
      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf8");
      onConfigUpdated(cfg);
      panel.title = cfg.name;
      panel.webview.postMessage({ command: "saved" });
      vscode.window.showInformationMessage(`Project "${cfg.name}" updated.`);
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to save: ${err instanceof Error ? err.message : String(err)}`,
      );
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
