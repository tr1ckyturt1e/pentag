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
const scannerLeft = __importStar(require("./scanner/scannerLeft"));
const scannerRight = __importStar(require("./scanner/scannerRight"));
// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
function getCss() {
    return /* css */ `
  .scanner-layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .scanner-toolbar {
    flex-shrink: 0;
    padding: 10px 16px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .model-label {
    font-size: 11px;
    opacity: 0.55;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .model-select {
    width: auto;
    min-width: 200px;
    max-width: 340px;
    flex-shrink: 0;
  }

  /* ── MCP server selector ────────────────────────────────────────────────── */
  .tools-wrapper {
    position: relative;
    flex-shrink: 0;
  }
  .tools-label {
    font-size: 11px;
    opacity: 0.55;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .btn-tools {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    background: var(--vscode-dropdown-background);
    color: var(--vscode-dropdown-foreground);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 3px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    min-width: 120px;
  }
  .btn-tools:hover { background: var(--vscode-list-hoverBackground); }
  .tools-dropdown {
    display: none;
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 200;
    min-width: 200px;
    max-height: 280px;
    overflow-y: auto;
    background: var(--vscode-editorWidget-background, var(--vscode-dropdown-background));
    border: 1px solid var(--vscode-focusBorder, var(--vscode-dropdown-border));
    border-radius: 4px;
    padding: 4px 0;
    box-shadow: 0 6px 18px rgba(0,0,0,0.55);
  }
  .tools-dropdown.open { display: block; }
  .tools-dropdown-empty {
    padding: 10px 14px;
    font-size: 11px;
    opacity: 0.55;
    font-style: italic;
  }
  /* Clean click-to-select MCP server rows (no checkboxes) */
  .mcp-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 12px;
    border-left: 2px solid transparent;
    user-select: none;
    transition: background 0.1s;
    color: var(--vscode-foreground);
  }
  .mcp-item:hover { background: var(--vscode-list-hoverBackground); }
  .mcp-item.selected {
    background: rgba(79,195,247,0.1);
    border-left-color: #4fc3f7;
    color: #4fc3f7;
  }
  .mcp-item-check {
    width: 14px;
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 700;
    opacity: 0;
  }
  .mcp-item.selected .mcp-item-check { opacity: 1; }
  .mcp-item-name { flex: 1; }

  .btn-run-scanner {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 18px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .btn-run-scanner:hover { background: var(--vscode-button-hoverBackground); }
  .btn-run-scanner:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-run-scanner svg { flex-shrink: 0; }

  .btn-pause-scanner, .btn-cancel-scanner {
    display: none;
    align-items: center;
    gap: 7px;
    padding: 7px 14px;
    border: none;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .btn-pause-scanner {
    background: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.1));
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
  }
  .btn-pause-scanner:hover { background: var(--vscode-button-secondaryHoverBackground, rgba(255,255,255,0.18)); }
  .btn-cancel-scanner {
    background: transparent;
    color: var(--vscode-errorForeground, #f48771);
    border: 1px solid var(--vscode-errorForeground, #f48771);
  }
  .btn-cancel-scanner:hover { background: rgba(244,135,113,0.1); }
  /* shown while a scan is active */
  .scanner-toolbar.scanning .btn-run-scanner  { display: none; }
  .scanner-toolbar.scanning .btn-pause-scanner { display: inline-flex; }
  .scanner-toolbar.scanning .btn-cancel-scanner { display: inline-flex; }
  /* disable model + server selectors while scanning */
  .scanner-toolbar.scanning .model-select,
  .scanner-toolbar.scanning .btn-tools { opacity: 0.4; pointer-events: none; }

  /* ── Scanner body (left + right) ──────────────────────────────────────── */
  .scanner-body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  ${scannerLeft.getCss()}
  ${scannerRight.getCss()}
  `;
}
// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------
function getHtml() {
    return /* html */ `
<div class="scanner-layout">
  <div class="scanner-toolbar" id="scannerToolbar">
    <button class="btn-run-scanner" id="btnRunScanner" disabled>
      <svg id="scannerIcon" width="12" height="12" viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <!-- play triangle -->
        <polygon points="2,1 11,6 2,11" />
      </svg>
      Run AI Scanner
    </button>
    <button class="btn-pause-scanner" id="btnPauseScanner">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="1" width="3" height="10" />
        <rect x="7" y="1" width="3" height="10" />
      </svg>
      Pause
    </button>
    <button class="btn-cancel-scanner" id="btnCancelScanner">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" />
        <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" />
      </svg>
      Cancel
    </button>
    <span class="model-label">AI Model</span>
    <select id="modelSelect" class="model-select">
      <option value="">Loading models\u2026</option>
    </select>
    <span class="tools-label">MCP Servers</span>
    <div class="tools-wrapper">
      <button class="btn-tools" id="btnTools">None selected &#9660;</button>
      <div class="tools-dropdown" id="toolsDropdown">
        <span class="tools-dropdown-empty">Loading MCP servers\u2026</span>
      </div>
    </div>
  </div>

  <div class="scanner-body">
    ${scannerLeft.getHtml()}
    ${scannerRight.getHtml()}
  </div>
</div>
  `;
}
// ---------------------------------------------------------------------------
// Script
// ---------------------------------------------------------------------------
function getScript() {
    return /* js */ `
  /* -- Scanner ------------------------------------------------------------ */
  (function initScanner() {

    function populateModels(models) {
      var sel = document.getElementById('modelSelect');
      var btn = document.getElementById('btnRunScanner');
      sel.innerHTML = '';
      if (!models || models.length === 0) {
        sel.innerHTML = '<option value="">No models available</option>';
        btn.disabled = true;
        return;
      }
      models.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        sel.appendChild(opt);
      });
      btn.disabled = false;
    }

    /* -- MCP Server selector -------------------------------------------- */
    var selectedServers = [];

    function populateMcpServers(servers) {
      var dd = document.getElementById('toolsDropdown');
      dd.innerHTML = '';
      if (!servers || servers.length === 0) {
        dd.innerHTML = '<span class="tools-dropdown-empty">No MCP servers detected</span>';
        updateToolsButton();
        return;
      }
      servers.forEach(function(serverName) {
        var item = document.createElement('div');
        item.className = 'mcp-item';
        item.dataset.server = serverName;

        var check = document.createElement('span');
        check.className = 'mcp-item-check';
        check.textContent = '\u2713';  // ✓

        var nameEl = document.createElement('span');
        nameEl.className = 'mcp-item-name';
        nameEl.textContent = serverName;

        item.appendChild(check);
        item.appendChild(nameEl);

        item.addEventListener('click', function(e) {
          e.stopPropagation();
          if (selectedServers.indexOf(serverName) !== -1) {
            selectedServers = selectedServers.filter(function(n) { return n !== serverName; });
            item.classList.remove('selected');
          } else {
            selectedServers.push(serverName);
            item.classList.add('selected');
          }
          updateToolsButton();
        });

        dd.appendChild(item);
      });
      updateToolsButton();
    }

    function updateToolsButton() {
      var btn = document.getElementById('btnTools');
      if (selectedServers.length === 0) {
        btn.textContent = 'MCP: none \u25BC';
      } else if (selectedServers.length === 1) {
        btn.textContent = selectedServers[0] + ' \u25BC';
      } else {
        btn.textContent = selectedServers.length + ' servers \u25BC';
      }
    }

    document.getElementById('btnTools').addEventListener('click', function(e) {
      e.stopPropagation();
      document.getElementById('toolsDropdown').classList.toggle('open');
    });
    document.addEventListener('click', function() {
      document.getElementById('toolsDropdown').classList.remove('open');
    });
    document.getElementById('toolsDropdown').addEventListener('click', function(e) {
      e.stopPropagation();
    });

    window.addEventListener('message', function(e) {
      var d = e.data;
      if (d.command === 'modelList')     { populateModels(d.models); }
      if (d.command === 'mcpServerList') { populateMcpServers(d.servers); }

      if (d.command === 'scanStarted') { setScanState('running'); }
      if (d.command === 'scanEnded')   { setScanState('idle'); }
      if (d.command === 'scanPaused')  { setScanState('paused'); }
      if (d.command === 'scanResumed') { setScanState('running'); }
    });

    /* -- Scan-state machine ------------------------------------------- */
    var scanState = 'idle'; // 'idle' | 'running' | 'paused'

    function setScanState(state) {
      scanState = state;
      var toolbar   = document.getElementById('scannerToolbar');
      var runBtn    = document.getElementById('btnRunScanner');
      var pauseBtn  = document.getElementById('btnPauseScanner');
      var pauseIcon = pauseBtn.querySelector('svg');
      var pauseText = pauseBtn.lastChild;

      toolbar.classList.toggle('scanning', state !== 'idle');

      if (state === 'paused') {
        // Swap pause icon to a play/resume icon
        pauseIcon.innerHTML = '<polygon points="2,1 11,6 2,11" />';
        pauseText.textContent = ' Resume';
      } else {
        pauseIcon.innerHTML = '<rect x="2" y="1" width="3" height="10" /><rect x="7" y="1" width="3" height="10" />';
        pauseText.textContent = ' Pause';
      }

      if (state === 'idle') {
        // Re-enable run button only if a model is selected
        var modelId = document.getElementById('modelSelect').value;
        runBtn.disabled = !modelId;
      }
    }

    document.getElementById('btnRunScanner').addEventListener('click', function() {
      var modelId = document.getElementById('modelSelect').value;
      if (!modelId || scanState !== 'idle') { return; }
      vscode.postMessage({ command: 'runScanner', modelId: modelId, mcpServers: selectedServers });
    });

    document.getElementById('btnPauseScanner').addEventListener('click', function() {
      if (scanState === 'running') {
        vscode.postMessage({ command: 'pauseScanner' });
      } else if (scanState === 'paused') {
        vscode.postMessage({ command: 'resumeScanner' });
      }
    });

    document.getElementById('btnCancelScanner').addEventListener('click', function() {
      if (scanState !== 'idle') {
        vscode.postMessage({ command: 'cancelScanner' });
      }
    });

  })(); /* end initScanner */
  ${scannerLeft.getScript()}
  ${scannerRight.getScript()}
  `;
}
function handleMessage(msg, _panel, _config, handlers) {
    if (msg.command === "runScanner" && handlers) {
        handlers.onRunScanner(msg.modelId, msg.mcpServers ?? []);
    }
    if (msg.command === "pauseScanner" && handlers) {
        handlers.onPauseScanner();
    }
    if (msg.command === "resumeScanner" && handlers) {
        handlers.onResumeScanner();
    }
    if (msg.command === "cancelScanner" && handlers) {
        handlers.onCancelScanner();
    }
    if (msg.command === "hitlResponse" && handlers) {
        handlers.onHitlResponse(msg.text);
    }
}
//# sourceMappingURL=scannerTab.js.map