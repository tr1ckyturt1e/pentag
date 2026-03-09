"use strict";
// ---------------------------------------------------------------------------
// Scanner Right Section — Human-in-the-Loop Chat
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
    flex: 0 0 60%;
    min-width: 300px;
    min-height: 0;
    overflow: hidden;
    background: var(--vscode-editor-background);
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
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hitl-agent-indicator {
    display: none;
    align-items: center;
    gap: 5px;
    margin-left: auto;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0;
    opacity: 1;
    color: #ffb74d;
  }
  .hitl-agent-indicator.visible { display: flex; }
  .hitl-indicator-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ffb74d;
    animation: pulse-dot 1.4s ease-in-out infinite;
  }

  /* ── Messages feed ───────────────────────────────────────────────────────── */
  .hitl-messages {
    flex: 1;
    overflow-y: auto;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .hitl-empty {
    font-size: 11px;
    opacity: 0.3;
    font-style: italic;
    text-align: center;
    margin-top: 20px;
  }

  /* Bubbles */
  .hitl-bubble-row {
    display: flex;
    flex-direction: column;
    max-width: 88%;
  }
  .hitl-bubble-row.agent  { align-self: flex-start; }
  .hitl-bubble-row.human  { align-self: flex-end; }
  .hitl-bubble-row.system { align-self: center; max-width: 100%; }

  .hitl-bubble-label {
    font-size: 10px;
    opacity: 0.45;
    margin-bottom: 3px;
    padding: 0 4px;
  }
  .hitl-bubble-row.human .hitl-bubble-label { text-align: right; }
  .hitl-bubble-row.system .hitl-bubble-label { text-align: center; }

  .hitl-bubble {
    padding: 9px 13px;
    border-radius: 12px;
    font-size: 12px;
    line-height: 1.55;
    word-break: break-word;
    white-space: pre-wrap;
  }
  .hitl-bubble-row.agent .hitl-bubble {
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
    border-bottom-left-radius: 4px;
    color: var(--vscode-foreground);
  }
  .hitl-bubble-row.human .hitl-bubble {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-bottom-right-radius: 4px;
  }
  .hitl-bubble-row.system .hitl-bubble {
    background: transparent;
    border: 1px dashed var(--vscode-panel-border, rgba(255,255,255,0.15));
    font-size: 11px;
    opacity: 0.55;
    border-radius: 6px;
    padding: 6px 12px;
    width: 100%;
    text-align: center;
  }

  /* Streaming chunk bubble — agent reasoning output */
  .hitl-bubble-row.stream .hitl-bubble {
    background: rgba(79,195,247,0.06);
    border: 1px solid rgba(79,195,247,0.15);
    border-bottom-left-radius: 4px;
    color: var(--vscode-foreground);
    font-size: 11px;
    opacity: 0.8;
  }
  .hitl-bubble-row.stream .hitl-bubble-label { color: #4fc3f7; }

  /* Typing indicator */
  .hitl-typing {
    display: none;
    align-self: flex-start;
    padding: 8px 14px;
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    border-bottom-left-radius: 4px;
    border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  }
  .hitl-typing.visible { display: flex; gap: 4px; align-items: center; }
  .hitl-typing span {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--vscode-foreground);
    opacity: 0.4;
    animation: typing-bounce 1.2s ease-in-out infinite;
  }
  .hitl-typing span:nth-child(2) { animation-delay: 0.2s; }
  .hitl-typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typing-bounce {
    0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
    40%            { transform: translateY(-5px); opacity: 1;   }
  }

  /* ── Input area ──────────────────────────────────────────────────────────── */
  .hitl-input-area {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    border-top: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
    padding: 10px 12px;
    background: var(--vscode-editor-background);
  }
  .hitl-waiting-label {
    font-size: 10px;
    font-weight: 600;
    color: #ffb74d;
    opacity: 0;
    margin-bottom: 5px;
    letter-spacing: 0.3px;
    transition: opacity 0.25s;
  }
  .hitl-waiting-label.visible { opacity: 1; }
  .hitl-input-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }
  .hitl-input {
    flex: 1;
    resize: none;
    min-height: 36px;
    max-height: 120px;
    padding: 8px 10px;
    font-size: 12px;
    font-family: inherit;
    border-radius: 6px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.15));
    outline: none;
    overflow-y: auto;
    line-height: 1.4;
    transition: border-color 0.2s;
  }
  .hitl-input:focus {
    border-color: var(--vscode-focusBorder, #007acc);
  }
  .hitl-input:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .hitl-send {
    flex-shrink: 0;
    padding: 8px 16px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s, opacity 0.2s;
  }
  .hitl-send:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
  .hitl-send:disabled { opacity: 0.35; cursor: not-allowed; }
  `;
}
function getHtml() {
    return /* html */ `
<div class="scanner-right">
  <div class="hitl-header">
    Human-in-the-Loop
    <span class="hitl-agent-indicator" id="hitlAgentIndicator">
      <span class="hitl-indicator-dot"></span>
      <span id="hitlAgentName">Agent</span> is waiting
    </span>
  </div>

  <div class="hitl-messages" id="hitlMessages">
    <div class="hitl-empty" id="hitlEmpty">
      Start a scan to see agent output here.<br>
      Agents will ask for your input when needed.
    </div>
    <!-- Typing indicator (animated dots when agent is generating) -->
    <div class="hitl-typing" id="hitlTyping">
      <span></span><span></span><span></span>
    </div>
  </div>

  <div class="hitl-input-area">
    <div class="hitl-waiting-label" id="hitlWaitingLabel">
      Agent is waiting for your response
    </div>
    <div class="hitl-input-row">
      <textarea
        class="hitl-input"
        id="hitlInput"
        rows="1"
        placeholder="Waiting for agent\u2026"
        disabled></textarea>
      <button class="hitl-send" id="hitlSend" disabled>Send</button>
    </div>
  </div>
</div>
  `;
}
function getScript() {
    return /* js */ `
  /* -- Scanner Right (HITL) --------------------------------------------- */
  (function initScannerRight() {

    var messagesEl  = document.getElementById('hitlMessages');
    var emptyEl     = document.getElementById('hitlEmpty');
    var typingEl    = document.getElementById('hitlTyping');
    var inputEl     = document.getElementById('hitlInput');
    var sendBtn     = document.getElementById('hitlSend');
    var waitLabel   = document.getElementById('hitlWaitingLabel');
    var agentInd    = document.getElementById('hitlAgentIndicator');
    var agentName   = document.getElementById('hitlAgentName');

    // Line buffer — accumulates chunks until a newline is received
    var lineBuffer    = '';
    // Guard: show "Scan cancelled" only once per scan session
    var scanCancelled = false;
    // Track which agents have already been announced so HITL-resume doesn't
    // re-print "Agent X started" on every subsequent 'running' status.
    var announcedAgents = {};

    function hideEmpty() {
      if (emptyEl) { emptyEl.style.display = 'none'; }
    }

    function scrollToBottom() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function agentLabel(agentId) {
      var labels = {
        'orchestrator':    'Orchestrator',
        'recon-agent':     'Recon Agent',
        'auth-agent':      'Auth Agent',
        'exploit-agent':   'Exploit Agent',
        'reporting-agent': 'Reporting Agent'
      };
      return labels[agentId] || agentId;
    }

    function addBubble(type, label, text) {
      hideEmpty();
      var row = document.createElement('div');
      row.className = 'hitl-bubble-row ' + type;
      var labelEl = document.createElement('div');
      labelEl.className = 'hitl-bubble-label';
      labelEl.textContent = label;
      var bubble = document.createElement('div');
      bubble.className = 'hitl-bubble';
      bubble.textContent = text;
      row.appendChild(labelEl);
      row.appendChild(bubble);
      // Insert before typing indicator
      messagesEl.insertBefore(row, typingEl);
      scrollToBottom();
      return bubble;
    }

    function addSystemBubble(text) {
      addBubble('system', '', text);
    }

    // Append a new activity bubble for each parsed line.
    function showActivityLine(agentId, prefix, text) {
      var display = text ? (text.length > 140 ? text.slice(0, 140) + '...' : text) : '';
      addBubble('stream', agentLabel(agentId), display ? prefix + ' ' + display : prefix);
    }

    // Parse incoming stream chunks for ReAct-format lines.
    // Thought/Action/DONE are shown for specialist agents.
    // DELEGATE/TASK/COMPLETE/SUMMARY are shown for the orchestrator.
    // Observation: (raw tool output) is intentionally suppressed.
    function appendStreamChunk(agentId, chunk) {
      hideEmpty();
      lineBuffer += chunk;
      var nl = lineBuffer.indexOf('\\n');
      while (nl !== -1) {
        var line = lineBuffer.slice(0, nl).trim();
        lineBuffer = lineBuffer.slice(nl + 1);
        nl = lineBuffer.indexOf('\\n');
        if (!line) { continue; }
        if (line.indexOf('Thought:') === 0) {
          showActivityLine(agentId, '[Thought]', line.slice(8).trim());
        } else if (line.indexOf('Action:') === 0) {
          showActivityLine(agentId, '[Action]', line.slice(7).trim());
        } else if (line.indexOf('DONE:') === 0) {
          var summary = line.slice(5).trim();
          // If summary is just an opening brace the real content is on subsequent
          // lines (multi-line block) — show only the label with no body text.
          var doneDisplay = (summary && summary !== '{' && summary !== '{}')
            ? summary.slice(0, 120) + (summary.length > 120 ? '...' : '')
            : '';
          showActivityLine(agentId, '[Done]', doneDisplay);
        } else if (line.indexOf('DELEGATE:') === 0) {
          showActivityLine(agentId, '[Delegating to]', line.slice(9).trim());
        } else if (line.indexOf('TASK:') === 0) {
          showActivityLine(agentId, '[Task]', line.slice(5).trim());
        } else if (/^COMPLETE/.test(line)) {
          showActivityLine(agentId, '[Complete]', '');
        } else if (line.indexOf('SUMMARY:') === 0) {
          showActivityLine(agentId, '[Summary]', line.slice(8).trim());
        }
        // Observation: and other lines are intentionally suppressed
      }
    }

    function endStreamBubble() {
      lineBuffer = '';  // discard any partial line from the previous turn
    }

    function setTyping(visible) {
      typingEl.classList.toggle('visible', visible);
      scrollToBottom();
    }

    function setWaiting(agentId) {
      endStreamBubble();
      setTyping(false);
      agentName.textContent = agentLabel(agentId);
      agentInd.classList.add('visible');
      waitLabel.classList.add('visible');
      inputEl.disabled  = false;
      inputEl.placeholder = 'Type your response to ' + agentLabel(agentId) + '\u2026';
      inputEl.focus();
      sendBtn.disabled = false;
    }

    function clearWaiting() {
      agentInd.classList.remove('visible');
      waitLabel.classList.remove('visible');
      inputEl.disabled    = true;
      inputEl.placeholder = 'Waiting for agent\u2026';
      inputEl.value       = '';
      sendBtn.disabled    = true;
    }

    function sendHumanReply() {
      var text = inputEl.value.trim();
      if (!text) { return; }
      addBubble('human', 'You', text);
      clearWaiting();
      vscode.postMessage({ command: 'hitlResponse', text: text });
    }

    // Send on button click or Ctrl+Enter / Cmd+Enter
    sendBtn.addEventListener('click', sendHumanReply);
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sendHumanReply();
      }
    });

    // Auto-resize textarea
    inputEl.addEventListener('input', function() {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    });

    window.addEventListener('message', function(e) {
      var d = e.data;

      // Streaming agent reasoning chunks
      if (d.command === 'scannerChunk') {
        setTyping(false);
        appendStreamChunk(d.agentId, d.text);
      }

      // Agent started — show typing indicator
      if (d.command === 'agentStatus') {
        if (d.status === 'running') {
          endStreamBubble();
          setTyping(true);
          if (!announcedAgents[d.agentId]) {
            announcedAgents[d.agentId] = true;
            addSystemBubble(agentLabel(d.agentId) + ' started');
          }
        }
        if (d.status === 'done') {
          setTyping(false);
          endStreamBubble();
          addSystemBubble(agentLabel(d.agentId) + ' completed');
        }
        if (d.status === 'failed') {
          setTyping(false);
          endStreamBubble();
          addSystemBubble(agentLabel(d.agentId) + ' failed');
        }
        if (d.status === 'cancelled' && !scanCancelled) {
          scanCancelled = true;
          setTyping(false);
          endStreamBubble();
          addSystemBubble('Scan cancelled');
          clearWaiting();
        }
      }

      // Agent is waiting for human input
      if (d.command === 'hitlQuestion') {
        setTyping(false);
        addBubble('agent', agentLabel(d.agentId), d.text);
        setWaiting(d.agentId);
      }

      // Scan started
      if (d.command === 'scanStarted') {
        // Clear previous messages (keep empty + typing els)
        var toRemove = [];
        messagesEl.childNodes.forEach(function(n) {
          if (n !== emptyEl && n !== typingEl) { toRemove.push(n); }
        });
        toRemove.forEach(function(n) { messagesEl.removeChild(n); });
        if (emptyEl) { emptyEl.style.display = ''; }
        lineBuffer = '';
        scanCancelled = false;
        announcedAgents = {};
        clearWaiting();
        setTyping(false);
        addSystemBubble('Scan started');
      }

      // Hint shown after the webview opens Copilot Chat for @axis /scan
      if (d.command === 'scanNotice') {
        addSystemBubble(d.text);
      }
    });

  })();
  `;
}
//# sourceMappingURL=scannerRight.js.map