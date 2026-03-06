import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { AxisBotChatParticipant } from "./chatParticipant";
import { SessionManager } from "./sessionManager";
import { NewProjectViewProvider } from "./views/newProjectView";
import { SettingsViewProvider } from "./views/settingsView";
import { OpenProjectViewProvider } from "./views/openProjectView";

/** Ensures the `agents` subfolder exists inside the configured workspace. */
function ensureAgentsFolder(workspacePath: string | undefined): void {
  if (!workspacePath || !fs.existsSync(workspacePath)) {
    return;
  }
  const agentsDir = path.join(workspacePath, "agents");
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
    console.log("[AXIS Bot] Created agents folder:", agentsDir);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("[AXIS Bot] Extension activating...");

  // Ensure agents folder exists in the currently saved workspace (if any)
  const savedWorkspace = context.globalState.get<string>(
    "pentag.workspacePath",
  );
  ensureAgentsFolder(savedWorkspace);

  // Shared session manager
  const sessionManager = new SessionManager(context);

  // -------------------------------------------------------------------------
  // Register Sidebar Webview Views
  // -------------------------------------------------------------------------
  const newProjectProvider = new NewProjectViewProvider(context);
  const openProjectProvider = new OpenProjectViewProvider(context);
  const settingsProvider = new SettingsViewProvider(context);

  // When workspace path changes in Settings, push the update to both other views
  // and re-validate the agents folder for the new path.
  settingsProvider.setOnWorkspacePathChanged((newPath) => {
    ensureAgentsFolder(newPath);
    newProjectProvider.notifyWorkspaceChanged(newPath);
    openProjectProvider.notifyWorkspaceChanged();
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      NewProjectViewProvider.viewType,
      newProjectProvider,
    ),
    vscode.window.registerWebviewViewProvider(
      OpenProjectViewProvider.viewType,
      openProjectProvider,
    ),
    vscode.window.registerWebviewViewProvider(
      SettingsViewProvider.viewType,
      settingsProvider,
    ),
  );

  // -------------------------------------------------------------------------
  // Register GitHub Copilot Chat Participant (@pentester)
  // -------------------------------------------------------------------------
  const chatParticipant = new AxisBotChatParticipant(context, sessionManager);
  chatParticipant.register();

  // -------------------------------------------------------------------------
  // Register Commands
  // -------------------------------------------------------------------------

  context.subscriptions.push(
    vscode.commands.registerCommand("pentag.clearSession", async () => {
      const confirm = await vscode.window.showWarningMessage(
        "Are you sure you want to clear the current session? All findings and history will be lost.",
        { modal: true },
        "Clear Session",
      );
      if (confirm === "Clear Session") {
        sessionManager.clearSession();
        vscode.window.showInformationMessage("[AXIS Bot] Session cleared.");
      }
    }),
    vscode.commands.registerCommand("pentag.openCopilotChat", async () => {
      await vscode.commands.executeCommand("workbench.action.chat.open", {
        query: "@axis ",
      });
    }),
  );

  // Show welcome message on first install
  const installed = context.globalState.get<boolean>("pentag.installed");
  if (!installed) {
    context.globalState.update("pentag.installed", true);
    vscode.window
      .showInformationMessage(
        "AXIS Bot installed! Open the sidebar or use @axis in Copilot Chat to get started.",
        "Open Chat",
      )
      .then((choice) => {
        if (choice === "Open Chat") {
          vscode.commands.executeCommand("workbench.action.chat.open", {
            query: "@axis ",
          });
        }
      });
  }

  console.log("[AXIS Bot] Extension activated successfully.");
}

export function deactivate() {
  console.log("[AXIS Bot] Extension deactivated.");
}
