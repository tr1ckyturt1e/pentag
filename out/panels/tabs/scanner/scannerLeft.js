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
    min-width: 0;
    min-height: 0;
    overflow: hidden;
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

  /* ── Vuln cards ────────────────────────────────────────────────────── */
  .vuln-card {
    margin: 6px 10px;
    padding: 10px 12px;
    border-radius: 6px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .vuln-card:hover { background: rgba(255,255,255,0.07); }
  .vuln-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .vuln-severity-badge {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.6px;
    padding: 2px 6px;
    border-radius: 3px;
    color: #fff;
    background: #29b6f6; /* default — overridden by sev-* class */
  }
  /* Severity color palette — CSS classes are CSP-safe, inline style= is not */
  .sev-critical { background: #7f0000; }
  .sev-high     { background: #f44336; }
  .sev-medium   { background: #ff9800; }
  .sev-low      { background: #4caf50; }
  .sev-info     { background: #29b6f6; }
  .vuln-confidence-badge {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.5px;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid currentColor;
  }
  .vuln-confidence-badge.confirmed {
    color: #66bb6a;
    border-color: #66bb6a;
    background: rgba(102,187,106,0.12);
  }
  .vuln-confidence-badge.tentative {
    color: #ffa726;
    border-color: #ffa726;
    background: rgba(255,167,38,0.12);
  }
  .vuln-confidence-score {
    margin-left: auto;
    font-size: 9px;
    opacity: 0.55;
    font-variant-numeric: tabular-nums;
  }
  .vuln-title {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .vuln-url {
    font-size: 10px;
    opacity: 0.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .vuln-meta {
    font-size: 10px;
    opacity: 0.6;
  }
  .vuln-desc, .vuln-evidence {
    font-size: 11px;
    opacity: 0.75;
    line-height: 1.4;
    word-break: break-word;
  }
  .vuln-evidence {
    font-family: var(--vscode-editor-font-family, monospace);
    background: rgba(0,0,0,0.2);
    padding: 4px 6px;
    border-radius: 3px;
    font-size: 10px;
  }

  /* ── Tentative card action buttons ───────────────────────────────────── */
  .vuln-actions {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }
  .vuln-btn {
    flex: 1;
    padding: 4px 0;
    font-size: 10px;
    font-weight: 600;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: pointer;
    letter-spacing: 0.3px;
    transition: opacity 0.15s;
  }
  .vuln-btn:hover { opacity: 0.8; }
  .vuln-btn-confirm {
    background: rgba(102,187,106,0.15);
    border-color: #66bb6a;
    color: #66bb6a;
  }
  .vuln-btn-fp {
    background: rgba(239,83,80,0.12);
    border-color: #ef5350;
    color: #ef5350;
  }
  .vuln-btn-delete {
    background: rgba(239,83,80,0.12);
    border-color: #ef5350;
    color: #ef5350;
  }
  .vuln-sev-select {
    flex: 1;
    padding: 3px 6px;
    font-size: 10px;
    font-weight: 600;
    font-family: inherit;
    border-radius: 4px;
    border: 1px solid var(--vscode-dropdown-border);
    background: var(--vscode-dropdown-background);
    color: var(--vscode-dropdown-foreground);
    cursor: pointer;
  }
  .vuln-sev-select:focus { outline: none; border-color: var(--vscode-focusBorder, #007acc); }
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

    // Returns a CSS class name for the severity badge.
    // CSS classes work reliably in VS Code webviews; inline style= can be stripped by CSP.
    function sevClass(sev) {
      var s = (sev || 'info').toLowerCase().trim();
      return 'sev-' + (['critical','high','medium','low','info'].indexOf(s) !== -1 ? s : 'info');
    }

    function removeEmptyLabel(listEl) {
      var empty = listEl.querySelector('.vuln-empty');
      if (empty) { empty.remove(); }
    }

    /** Build the inner HTML for a vuln card body (shared by tentative + confirmed). */
    function buildCardBody(vuln, sev) {
      var conf = vuln.confidence || (vuln.type === 'confirmed' ? 'Confirmed' : 'Tentative');
      var confClass = conf.toLowerCase();
      // Always render the score span — show N/A when agent omitted the score
      var scoreHtml = '<span class="vuln-confidence-score">' +
        (vuln.confidenceScore != null ? 'Score\u00a0' + vuln.confidenceScore + '%' : 'Score\u00a0N/A') +
        '</span>';
      return (
        '<div class="vuln-card-header">' +
          '<span class="vuln-severity-badge ' + sevClass(sev) + '">' + sev.toUpperCase() + '</span>' +
          '<span class="vuln-confidence-badge ' + confClass + '">' + escHtml(conf) + '</span>' +
          '<span class="vuln-title">' + escHtml(vuln.title || 'Unknown') + '</span>' +
          scoreHtml +
        '</div>' +
        '<div class="vuln-url">' + escHtml(vuln.url || '') + '</div>' +
        (vuln.parameter  ? '<div class="vuln-meta">Parameter: ' + escHtml(vuln.parameter) + '</div>' : '') +
        (vuln.description ? '<div class="vuln-desc">' + escHtml(vuln.description) + '</div>' : '') +
        (vuln.evidence    ? '<div class="vuln-evidence">' + escHtml(vuln.evidence) + '</div>' : '')
      );
    }

    function sevOrder(sev) {
      var order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return order[(sev || 'info').toLowerCase()] ?? 4;
    }

    function sortList(listEl) {
      var cards = Array.from(listEl.querySelectorAll('.vuln-card'));
      if (cards.length < 2) { return; }
      cards.sort(function(a, b) { return sevOrder(a.dataset.sev) - sevOrder(b.dataset.sev); });
      cards.forEach(function(c) { listEl.appendChild(c); });
    }

    function deduplicateList(listEl) {
      var seen = new Set();
      Array.from(listEl.querySelectorAll('.vuln-card')).forEach(function(card) {
        var key = (card.dataset.title || '') + '||' + (card.dataset.url || '');
        if (seen.has(key)) { card.remove(); } else { seen.add(key); }
      });
    }

    /** Append a confirmed card (with delete + severity-adjust controls) to the confirmed list. */
    function appendConfirmedCard(vuln) {
      var listEl = document.getElementById('confirmedList');
      removeEmptyLabel(listEl);
      var card = document.createElement('div');
      card.className = 'vuln-card';
      card.dataset.title = vuln.title || '';
      card.dataset.url = vuln.url || '';
      var sev = (vuln.severity || 'Info');
      card.dataset.sev = sev.toLowerCase();
      var confirmedVuln = Object.assign({}, vuln, { confidence: 'Confirmed', type: 'confirmed' });
      var sevOptions = ['Critical','High','Medium','Low','Info'].map(function(s) {
        return '<option value="' + s + '"' + (sev === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('');
      card.innerHTML =
        buildCardBody(confirmedVuln, sev) +
        '<div class="vuln-actions">' +
          '<select class="vuln-sev-select" title="Adjust severity">' + sevOptions + '</select>' +
          '<button class="vuln-btn vuln-btn-delete">\u2715 Delete</button>' +
        '</div>';

      // Severity selector — update badge CSS class + label live
      card.querySelector('.vuln-sev-select').addEventListener('change', function(e) {
        var newSev = e.target.value;
        var badge = card.querySelector('.vuln-severity-badge');
        badge.className = 'vuln-severity-badge ' + sevClass(newSev);
        badge.textContent = newSev.toUpperCase();
      });

      // Delete button
      card.querySelector('.vuln-btn-delete').addEventListener('click', function() {
        card.remove();
        if (!listEl.querySelector('.vuln-card')) {
          listEl.innerHTML = '<div class="vuln-empty">No confirmed vulnerabilities yet.</div>';
        }
      });

      listEl.appendChild(card);
      sortList(listEl);
      deduplicateList(listEl);
      listEl.scrollTop = listEl.scrollHeight;
    }

    /**
     * Append a tentative card with Confirm + False Positive action buttons.
     * Confirm  → removes card from tentative list, adds to confirmed list.
     * False Pos → removes card from tentative list entirely.
     */
    function appendTentativeCard(vuln) {
      var listEl = document.getElementById('tentativeList');
      removeEmptyLabel(listEl);
      var card = document.createElement('div');
      card.className = 'vuln-card';
      card.dataset.title = vuln.title || '';
      card.dataset.url = vuln.url || '';
      var sev = (vuln.severity || 'Info');
      card.dataset.sev = sev.toLowerCase();
      card.innerHTML =
        buildCardBody(vuln, sev) +
        '<div class="vuln-actions">' +
          '<button class="vuln-btn vuln-btn-confirm">\u2713 Confirm</button>' +
          '<button class="vuln-btn vuln-btn-fp">\u2715 False Positive</button>' +
        '</div>';

      // Confirm button: promote to confirmed list
      card.querySelector('.vuln-btn-confirm').addEventListener('click', function() {
        card.remove();
        if (!listEl.querySelector('.vuln-card')) {
          listEl.innerHTML = '<div class="vuln-empty">No tentative vulnerabilities yet.</div>';
        }
        appendConfirmedCard(vuln);
      });

      // False Positive button: dismiss
      card.querySelector('.vuln-btn-fp').addEventListener('click', function() {
        card.remove();
        if (!listEl.querySelector('.vuln-card')) {
          listEl.innerHTML = '<div class="vuln-empty">No tentative vulnerabilities yet.</div>';
        }
      });

      listEl.appendChild(card);
      sortList(listEl);
      deduplicateList(listEl);
      listEl.scrollTop = listEl.scrollHeight;
    }

    function escHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    window.addEventListener('message', function(e) {
      var d = e.data;
      if (d.command === 'tentativeVuln') {
        appendTentativeCard(d.vuln);
      }
      if (d.command === 'scanStarted') {
        // Clear old results on new scan
        var t = document.getElementById('tentativeList');
        var c = document.getElementById('confirmedList');
        t.innerHTML = '<div class="vuln-empty">No tentative vulnerabilities yet.</div>';
        c.innerHTML = '<div class="vuln-empty">No confirmed vulnerabilities yet.</div>';
      }
    });

  })();
  `;
}
//# sourceMappingURL=scannerLeft.js.map