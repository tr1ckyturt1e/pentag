import * as vscode from "vscode";
import { SessionManager } from "./sessionManager";

const PARTICIPANT_ID = "pentag.axis";

export class AxisBotChatParticipant {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly sessionManager: SessionManager,
  ) {}

  register(): void {
    if (!vscode.chat) {
      console.error(
        "[AXIS Bot] vscode.chat API is not available. Is GitHub Copilot Chat installed?",
      );
      vscode.window.showErrorMessage(
        "AXIS Bot: GitHub Copilot Chat is required but not found. Please install the GitHub Copilot Chat extension.",
      );
      return;
    }

    const participant = vscode.chat.createChatParticipant(
      PARTICIPANT_ID,
      this._handleRequest.bind(this),
    );

    participant.iconPath = new vscode.ThemeIcon("shield");
    this.context.subscriptions.push(participant);
    console.log("[AXIS Bot] @axis chat participant registered.");
  }

  private async _handleRequest(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<vscode.ChatResult> {
    const command = request.command ?? "";
    const userInput = request.prompt.trim();

    // Handle /clear without needing a model
    if (command === "clear") {
      this.sessionManager.clearSession();
      stream.markdown("Session cleared.");
      return { metadata: { command } };
    }

    // Select model
    const config = vscode.workspace.getConfiguration("pentag");
    const preferredFamily = config.get<string>("defaultModel") ?? "gpt-4o";

    let model: vscode.LanguageModelChat | undefined;
    try {
      const allModels = await vscode.lm.selectChatModels({ vendor: "copilot" });
      if (allModels.length === 0) {
        stream.markdown(
          "No GitHub Copilot AI models available. Ensure GitHub Copilot Chat is installed and you are signed in.",
        );
        return { metadata: { command } };
      }
      model =
        allModels.find(
          (m) =>
            m.family === preferredFamily ||
            m.id.toLowerCase().includes(preferredFamily.toLowerCase()),
        ) ?? allModels[0];
    } catch (err) {
      stream.markdown(`Failed to access AI models: ${String(err)}`);
      return { metadata: { command } };
    }

    // Build history from previous turns
    const history: vscode.LanguageModelChatMessage[] = [];
    for (const turn of chatContext.history.slice(-20)) {
      if (turn instanceof vscode.ChatRequestTurn) {
        history.push(vscode.LanguageModelChatMessage.User(turn.prompt));
      } else if (turn instanceof vscode.ChatResponseTurn) {
        const text = turn.response
          .filter((p) => p instanceof vscode.ChatResponseMarkdownPart)
          .map((p) => (p as vscode.ChatResponseMarkdownPart).value.value)
          .join("");
        if (text) {
          history.push(vscode.LanguageModelChatMessage.Assistant(text));
        }
      }
    }

    // Forward request directly to model
    try {
      const messages = [
        ...history,
        vscode.LanguageModelChatMessage.User(
          command ? `/${command} ${userInput}`.trim() : userInput,
        ),
      ];
      const response = await model.sendRequest(messages, {}, token);
      for await (const chunk of response.text) {
        stream.markdown(chunk);
      }
    } catch (err) {
      if (err instanceof vscode.LanguageModelError) {
        stream.markdown(`AI model error [${err.code}]: ${err.message}`);
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        stream.markdown(`Unexpected error: ${msg}`);
        console.error("[AXIS Bot] Chat handler error:", err);
      }
    }

    return { metadata: { command } };
  }
}
