import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ProjectPanel } from "../panels/projectPanel";

interface ProjectEntry {
  name: string;
  folderName: string;
  type: string;
  createdAt: string;
}

export class OpenProjectViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "pentag.openProjectView";
  private _view?: vscode.WebviewView;
  /** Folder name (basename) of the project currently being scanned, or null */
  private _scanningFolder: string | null = null;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  /** Called whenever the workspace path changes so the list can refresh. */
  public notifyWorkspaceChanged(): void {
    this._refresh();
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml(webviewView.webview);

    // Listen for scan state changes from ProjectPanel and push live updates
    // to the webview so the indicator appears without a full HTML refresh.
    ProjectPanel.onScanStateChanged = (folder) => {
      this._scanningFolder = folder;
      this._view?.webview.postMessage({ command: "scanState", folder: folder ?? null });
    };

    webviewView.webview.onDidReceiveMessage(
      (message: { command: string; folderName?: string }) => {
        if (message.command === "loadProject" && message.folderName) {
          const workspacePath = this._context.globalState.get<string>(
            "pentag.workspacePath",
          );
          if (!workspacePath) {
            return;
          }
          const projectPath = path.join(workspacePath, message.folderName);
          const configPath = path.join(projectPath, "proj_config.json");
          if (!fs.existsSync(configPath)) {
            vscode.window.showErrorMessage(
              "AXIS Bot: Project config not found.",
            );
            return;
          }
          try {
            const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
            ProjectPanel.open(this._context, config, projectPath);
          } catch (err) {
            vscode.window.showErrorMessage(
              `AXIS Bot: Failed to open project: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        } else if (message.command === "refresh") {
          this._refresh();
        }
      },
      undefined,
      this._context.subscriptions,
    );
  }

  private _refresh(): void {
    if (this._view) {
      this._view.webview.html = this._getHtml(this._view.webview);
    }
  }

  private _scanProjects(): ProjectEntry[] {
    const workspacePath = this._context.globalState.get<string>(
      "pentag.workspacePath",
    );
    if (!workspacePath || !fs.existsSync(workspacePath)) {
      return [];
    }

    try {
      const entries = fs.readdirSync(workspacePath, { withFileTypes: true });
      const projects: ProjectEntry[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const configPath = path.join(
          workspacePath,
          entry.name,
          "proj_config.json",
        );
        if (fs.existsSync(configPath)) {
          try {
            const raw = fs.readFileSync(configPath, "utf8");
            const config = JSON.parse(raw);
            projects.push({
              name: config.name || entry.name,
              folderName: entry.name,
              type: config.type || "Web",
              createdAt: config.createdAt || "",
            });
          } catch {
            // skip unreadable / malformed configs
          }
        }
      }

      return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return [];
    }
  }

  private _getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private _getHtml(_webview: vscode.Webview): string {
    const nonce = this._getNonce();
    const workspacePath =
      this._context.globalState.get<string>("pentag.workspacePath") ?? "";
    const projects = this._scanProjects();
    const scanningFolder = this._scanningFolder;

    const listHtml =
      projects.length === 0
        ? `<p class="empty-msg">${workspacePath ? "No projects found in workspace." : "No workspace configured - set one in Settings."}</p>`
        : projects
            .map(
              (p) => {
                const isScanning = p.folderName === scanningFolder;
                return `
      <div class="project-item${isScanning ? " scanning" : ""}" data-folder="${p.folderName.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">
        <div class="proj-main">
          <div class="proj-info">
            <div class="proj-name-row">
              <span class="proj-name">${p.name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
              <span class="scan-badge" title="Scan running">&#9679; scanning</span>
            </div>
            <div class="proj-meta">
              <span class="proj-type ${p.type.toLowerCase()}">${p.type}</span>
              ${p.createdAt ? `<span class="proj-date">${new Date(p.createdAt).toLocaleDateString()}</span>` : ""}
            </div>
          </div>
          <button class="btn-load" data-action="load" data-folder="${p.folderName.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">Load</button>
        </div>
      </div>`;
              },
            )
            .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<title>Open Project</title>
<style nonce="${nonce}">
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 10px 12px;
    line-height: 1.5;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .count {
    font-size: 10px;
    opacity: 0.5;
  }

  .btn-refresh {
    background: none;
    border: none;
    color: var(--vscode-textLink-foreground, #4fc1ff);
    cursor: pointer;
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 3px;
  }
  .btn-refresh:hover { background: var(--vscode-toolbar-hoverBackground); }

  .empty-msg {
    font-size: 11px;
    opacity: 0.5;
    text-align: center;
    padding: 20px 0;
    line-height: 1.5;
  }

  .project-item {
    padding: 8px 10px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    margin-bottom: 5px;
    background: rgba(255,255,255,0.03);
    transition: background 0.1s;
  }
  .project-item:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder, transparent);
  }

  .proj-name {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .proj-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .proj-type {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 2px;
  }
  .proj-type.web {
    background: rgba(79, 193, 255, 0.15);
    color: #4fc1ff;
  }
  .proj-type.api {
    background: rgba(78, 201, 176, 0.15);
    color: #4ec9b0;
  }

  .proj-date {
    font-size: 10px;
    opacity: 0.45;
  }

  .proj-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .proj-info { flex: 1; min-width: 0; }

  .proj-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }

  /* Scanning badge — hidden by default, shown on .project-item.scanning */
  .scan-badge {
    display: none;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.4px;
    color: #4fc3f7;
    background: rgba(79,195,247,0.12);
    border: 1px solid rgba(79,195,247,0.3);
    padding: 1px 5px;
    border-radius: 10px;
    white-space: nowrap;
    animation: scan-pulse 1.4s ease-in-out infinite;
    flex-shrink: 0;
  }
  .project-item.scanning .scan-badge { display: inline-flex; align-items: center; gap: 3px; }
  .project-item.scanning {
    border-color: rgba(79,195,247,0.25);
    background: rgba(79,195,247,0.04);
  }
  @keyframes scan-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }

  .btn-load {
    flex-shrink: 0;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn-load:hover { background: var(--vscode-button-hoverBackground); }
</style>
</head>
<body>

<div class="toolbar">
  <span class="count">${projects.length} project${projects.length !== 1 ? "s" : ""}</span>
  <button class="btn-refresh" id="btnRefresh" title="Refresh list">Refresh</button>
</div>

${listHtml}

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();

  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action="load"]');
    if (btn) {
      vscode.postMessage({ command: 'loadProject', folderName: btn.dataset.folder });
      return;
    }
  });

  document.getElementById('btnRefresh').addEventListener('click', function() {
    vscode.postMessage({ command: 'refresh' });
  });

  // Live scan-state updates from ProjectPanel (no full-page refresh needed)
  window.addEventListener('message', function(e) {
    var d = e.data;
    if (d.command === 'scanState') {
      // Remove scanning class from all items first
      document.querySelectorAll('.project-item.scanning').forEach(function(el) {
        el.classList.remove('scanning');
      });
      // Apply to the scanning project if one is active
      if (d.folder) {
        var match = document.querySelector('[data-folder="' + d.folder + '"]');
        if (match) { match.classList.add('scanning'); }
      }
    }
  });
</script>
</body>
</html>`;
  }
}
