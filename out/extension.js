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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chatParticipant_1 = require("./chatParticipant");
const sessionManager_1 = require("./sessionManager");
const newProjectView_1 = require("./views/newProjectView");
const settingsView_1 = require("./views/settingsView");
const openProjectView_1 = require("./views/openProjectView");
const tools_1 = require("./tools");
/** Ensures the `agents` subfolder exists inside the configured workspace. */
function ensureAgentsFolder(workspacePath) {
    if (!workspacePath || !fs.existsSync(workspacePath)) {
        return;
    }
    const agentsDir = path.join(workspacePath, "agents");
    if (!fs.existsSync(agentsDir)) {
        fs.mkdirSync(agentsDir, { recursive: true });
        console.log("[AXIS Bot] Created agents folder:", agentsDir);
    }
}
function activate(context) {
    console.log("[AXIS Bot] Extension activating...");
    // Register any built-in LM tools
    (0, tools_1.registerTools)(context);
    // Ensure agents folder exists in the currently saved workspace (if any)
    const savedWorkspace = context.globalState.get("pentag.workspacePath");
    ensureAgentsFolder(savedWorkspace);
    // Shared session manager
    const sessionManager = new sessionManager_1.SessionManager(context);
    // -------------------------------------------------------------------------
    // Register Sidebar Webview Views
    // -------------------------------------------------------------------------
    const newProjectProvider = new newProjectView_1.NewProjectViewProvider(context);
    const openProjectProvider = new openProjectView_1.OpenProjectViewProvider(context);
    const settingsProvider = new settingsView_1.SettingsViewProvider(context);
    // When workspace path changes in Settings, push the update to both other views
    // and re-validate the agents folder for the new path.
    settingsProvider.setOnWorkspacePathChanged((newPath) => {
        ensureAgentsFolder(newPath);
        newProjectProvider.notifyWorkspaceChanged(newPath);
        openProjectProvider.notifyWorkspaceChanged();
    });
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(newProjectView_1.NewProjectViewProvider.viewType, newProjectProvider), vscode.window.registerWebviewViewProvider(openProjectView_1.OpenProjectViewProvider.viewType, openProjectProvider), vscode.window.registerWebviewViewProvider(settingsView_1.SettingsViewProvider.viewType, settingsProvider));
    // -------------------------------------------------------------------------
    // Register GitHub Copilot Chat Participant (@pentester)
    // -------------------------------------------------------------------------
    const chatParticipant = new chatParticipant_1.AxisBotChatParticipant(context, sessionManager);
    chatParticipant.register();
    // -------------------------------------------------------------------------
    // Register Commands
    // -------------------------------------------------------------------------
    context.subscriptions.push(vscode.commands.registerCommand("pentag.clearSession", async () => {
        const confirm = await vscode.window.showWarningMessage("Are you sure you want to clear the current session? All findings and history will be lost.", { modal: true }, "Clear Session");
        if (confirm === "Clear Session") {
            sessionManager.clearSession();
            vscode.window.showInformationMessage("[AXIS Bot] Session cleared.");
        }
    }), vscode.commands.registerCommand("pentag.openCopilotChat", async () => {
        await vscode.commands.executeCommand("workbench.action.chat.open", {
            query: "@axis ",
        });
    }));
    // Show welcome message on first install
    const installed = context.globalState.get("pentag.installed");
    if (!installed) {
        context.globalState.update("pentag.installed", true);
        vscode.window
            .showInformationMessage("AXIS Bot installed! Open the sidebar or use @axis in Copilot Chat to get started.", "Open Chat")
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
function deactivate() {
    console.log("[AXIS Bot] Extension deactivated.");
}
//# sourceMappingURL=extension.js.map