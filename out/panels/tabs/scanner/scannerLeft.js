"use strict";
// ---------------------------------------------------------------------------
// Scanner Left Section — Tentative & Confirmed Vulnerabilities panels
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCss = getCss;
exports.getHtml = getHtml;
exports.getScript = getScript;
function getCss() {
    return /* css */ `
  /* ── Scanner left column ────────────────────────────────────────────────── */
  .scanner-left {
    display: flex;
    flex-direction: column;
    flex: 0 0 40%;
    min-height: 0;
    border-right: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
  }

  /* Shared subsection styles */
  .vuln-section {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .vuln-section + .vuln-section {
    border-top: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
  }
  .vuln-section-header {
    flex-shrink: 0;
    padding: 10px 16px 8px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.9px;
    opacity: 0.5;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  }
  .vuln-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }
  .vuln-empty {
    padding: 16px;
    font-size: 11px;
    opacity: 0.4;
    font-style: italic;
  }
  `;
}
function getHtml() {
    return /* html */ `
<div class="scanner-left">

  <!-- Top: Tentative Vulnerabilities -->
  <div class="vuln-section">
    <div class="vuln-section-header">Tentative Vulnerabilities</div>
    <div class="vuln-list" id="tentativeList">
      <div class="vuln-empty">No tentative vulnerabilities yet.</div>
    </div>
  </div>

  <!-- Bottom: Confirmed Vulnerabilities -->
  <div class="vuln-section">
    <div class="vuln-section-header">Confirmed Vulnerabilities</div>
    <div class="vuln-list" id="confirmedList">
      <div class="vuln-empty">No confirmed vulnerabilities yet.</div>
    </div>
  </div>

</div>
  `;
}
function getScript() {
    return /* js */ `
  /* -- Scanner Left ----------------------------------------------------- */
  (function initScannerLeft() {
    // Placeholder — population logic to be implemented later.
  })();
  `;
}
//# sourceMappingURL=scannerLeft.js.map