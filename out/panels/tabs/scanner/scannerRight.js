"use strict";
// ---------------------------------------------------------------------------
// Scanner Right Section — Human-in-the-Loop Chat box
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCss = getCss;
exports.getHtml = getHtml;
exports.getScript = getScript;
function getCss() {
    return /* css */ `
  /* ── Scanner right column ───────────────────────────────────────────────── */
  .scanner-right {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .hitl-header {
    flex-shrink: 0;
    padding: 10px 16px 8px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.9px;
    opacity: 0.5;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  }
  .hitl-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }
  .hitl-empty {
    font-size: 11px;
    opacity: 0.4;
    font-style: italic;
  }
  `;
}
function getHtml() {
    return /* html */ `
<div class="scanner-right">
  <div class="hitl-header">Human-in-the-Loop</div>
  <div class="hitl-messages" id="hitlMessages">
    <div class="hitl-empty">Scanner output will appear here.</div>
  </div>
</div>
  `;
}
function getScript() {
    return /* js */ `
  /* -- Scanner Right ---------------------------------------------------- */
  (function initScannerRight() {
    // Placeholder — chat logic to be implemented later.
  })();
  `;
}
//# sourceMappingURL=scannerRight.js.map