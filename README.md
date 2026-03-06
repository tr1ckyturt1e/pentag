# 🛡️ Pentester Agent — VS Code Extension

An AI-powered penetration testing assistant fully integrated with **GitHub Copilot Chat**.
Use the `@pentester` chat participant to get expert security guidance, powered by any model available in your Copilot subscription (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, o3-mini, and more).

---

## Features

### 🤖 GitHub Copilot Chat Integration (`@pentester`)

Register as a first-class Copilot Chat participant. Use it directly in the Copilot Chat panel:

```
@pentester /recon example.com
@pentester /scan 192.168.1.0/24
@pentester /exploit SQL injection in login form
@pentester /payload XSS reflected
@pentester /explain CVE-2024-12345
@pentester /checklist web application
@pentester /report
```

The `@pentester` participant sends structured prompts to the AI model, streams full markdown responses with commands, payloads, and methodologies, and suggests follow-up actions after each response.

### 📊 Dashboard Webview Panel

A rich, full-featured dashboard built with VS Code Webview API:

- **Overview** — Risk level badge, finding counts by severity, quick-action cards
- **Recon Tab** — One-click AI recon sessions (OSINT, DNS, subdomain, Google dorks, cloud)
- **Scan Tab** — Launch AI scan guidance (Nmap, web app, API, SSL/TLS, directory brute force)
- **Findings Tab** — View all logged findings grouped and color-coded by severity
- **Log Finding Tab** — Manually log a finding with severity, category, description, recommendation

### 🗂️ Sidebar (Activity Bar)

Three tree views in the dedicated **Pentester Agent** sidebar:

- **Targets** — Add, view, remove in-scope targets; click to recon in chat
- **Findings** — Browse all findings grouped by severity (Critical → Info)
- **Tools** — Pre-built shortcuts to launch AI-powered tool sessions in chat

### 📄 Report Panel

Auto-generate a professional penetration testing report populated from current session data. Sections include Executive Summary, Scope, Findings Table, Detailed Findings, Methodology. Click **"Generate AI Report via Copilot"** for a full AI-written report.

### 💾 Session Persistence

All targets, findings, and chat history are automatically saved to workspace state and restored on next open.

---

## Requirements

- **VS Code 1.90+**
- **GitHub Copilot** extension installed and signed in (provides AI model access)
- **GitHub Copilot Chat** extension (for `@pentester` chat participant)
- Node.js 18+ and npm (for development/building)

---

## Getting Started

### Install & Run (Development)

```bash
cd pentag
npm install
npm run compile
```

Then press **F5** in VS Code to launch the Extension Development Host.

### Usage

1. **Open Sidebar** — Click the 🛡️ shield icon in the Activity Bar
2. **Add a Target** — Click `+` in the Targets view or run `Pentester Agent: Add Target`
3. **Open Dashboard** — Run `Pentester Agent: Open Pentester Dashboard` from Command Palette
4. **Use Copilot Chat** — Open Copilot Chat (`Ctrl+Alt+I`) and type `@pentester /recon yourtarget.com`

---

## Chat Commands

| Command             | Description                             | Example                        |
| ------------------- | --------------------------------------- | ------------------------------ |
| `/recon [target]`   | Full recon strategy with commands       | `/recon example.com`           |
| `/scan [target]`    | Nmap, gobuster, nuclei strategy         | `/scan 10.0.0.1`               |
| `/exploit [vuln]`   | Exploit analysis and PoC                | `/exploit SSRF in image proxy` |
| `/payload [type]`   | Payload generation for authorized tests | `/payload XSS DOM`             |
| `/explain [topic]`  | Deep CVE/technique explanation          | `/explain CVE-2023-44487`      |
| `/checklist [type]` | Full methodology checklist              | `/checklist API`               |
| `/report`           | Generate report from session            | `/report`                      |
| `/clear`            | Reset current session                   | `/clear`                       |

---

## Architecture

```
src/
├── extension.ts          # Entry point — registers all commands, views, participant
├── chatParticipant.ts    # @pentester Copilot Chat participant (vscode.chat API)
├── pentestAgent.ts       # AI prompt logic using vscode.lm API
├── sessionManager.ts     # Targets, findings, chat history (workspace state)
├── panels/
│   ├── DashboardPanel.ts # Main webview dashboard
│   └── ReportPanel.ts    # Report generation webview
└── views/
    ├── targetsView.ts    # Sidebar targets tree view
    ├── findingsView.ts   # Sidebar findings tree view
    └── toolsView.ts      # Sidebar tools tree view
```

### Key VS Code APIs Used

| API                                        | Purpose                                         |
| ------------------------------------------ | ----------------------------------------------- |
| `vscode.chat.createChatParticipant()`      | Register `@pentester` in Copilot Chat           |
| `vscode.lm.selectChatModels()`             | Access Copilot AI models (GPT-4o, Claude, etc.) |
| `vscode.window.createWebviewPanel()`       | Dashboard and Report UI                         |
| `vscode.window.registerTreeDataProvider()` | Sidebar tree views                              |
| `vscode.ExtensionContext.workspaceState`   | Persistent session storage                      |

---

## Configuration

Open VS Code settings and search for **"Pentester Agent"**:

| Setting                      | Default    | Description                                                |
| ---------------------------- | ---------- | ---------------------------------------------------------- |
| `pentag.defaultModel`        | `gpt-4o`   | Preferred Copilot AI model                                 |
| `pentag.sessionAutoSave`     | `true`     | Auto-save session to workspace                             |
| `pentag.reportTemplate`      | `standard` | Report template (standard / executive / technical / owasp) |
| `pentag.maxFindings`         | `500`      | Max findings stored per session                            |
| `pentag.enableNotifications` | `true`     | Notifications for critical/high findings                   |
| `pentag.scopeEnforcement`    | `true`     | Only process defined scope targets                         |

---

## Building & Packaging

```bash
npm run compile          # One-time compile
npm run watch            # Watch mode (for development)
npm run package          # Create .vsix package
```

To install the packaged extension:

```
code --install-extension pentester-agent-0.1.0.vsix
```

---

## ⚠️ Legal Disclaimer

This extension is designed exclusively for **authorized penetration testing and security research**.

- Only test systems you **own** or have **explicit written authorization** to test
- Unauthorized access to computer systems is illegal in most jurisdictions
- The authors are not responsible for any misuse of this tool

---

## Roadmap

- [ ] Metasploit RPC integration
- [ ] Burp Suite proxy integration
- [ ] Automatic CVE lookup via NVD API
- [ ] AI-powered finding deduplication
- [ ] Team collaboration / shared sessions
- [ ] Custom prompt templates
- [ ] SARIF export for findings

---

## License

MIT — See [LICENSE](LICENSE) for details.
