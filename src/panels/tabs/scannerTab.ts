import * as vscode from "vscode";
import { ProjectConfig } from "../../views/newProjectView";
import * as scannerLeft from "./scanner/scannerLeft";
import * as scannerRight from "./scanner/scannerRight";

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
export function getCss(): string {
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
export function getHtml(): string {
  return /* html */ `
<div class="scanner-layout">
  <div class="scanner-toolbar">
    <button class="btn-run-scanner" id="btnRunScanner" disabled>
      <svg id="scannerIcon" width="12" height="12" viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <!-- play triangle -->
        <polygon points="2,1 11,6 2,11" />
      </svg>
      Run AI Scanner
    </button>
    <span class="model-label">AI Model</span>
    <select id="modelSelect" class="model-select">
      <option value="">Loading models\u2026</option>
    </select>
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
export function getScript(): string {
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

    window.addEventListener('message', function(e) {
      var d = e.data;
      if (d.command === 'modelList') {
        populateModels(d.models);
      }
    });

    document.getElementById('btnRunScanner').addEventListener('click', function() {
      var modelId = document.getElementById('modelSelect').value;
      if (!modelId) { return; }
      vscode.postMessage({ command: 'runScanner', modelId: modelId });
    });

  })(); /* end initScanner */
  ${scannerLeft.getScript()}
  ${scannerRight.getScript()}
  `;
}

// ---------------------------------------------------------------------------
// Extension-side message handler
// ---------------------------------------------------------------------------
export async function handleMessage(
  msg: Record<string, unknown>,
  _panel: vscode.WebviewPanel,
  _config: ProjectConfig,
): Promise<void> {
  if (msg.command === "runScanner") {
    // Placeholder — scanner logic to be implemented later
    vscode.window.showInformationMessage("Scanner coming soon.");
  }
}
