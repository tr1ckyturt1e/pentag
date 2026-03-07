import * as vscode from "vscode";

// ---------------------------------------------------------------------------
// ModelService — wraps the VS Code Language Model API
//
// Centralises model selection and request streaming so the rest of the
// runtime never imports vscode.lm directly.
// ---------------------------------------------------------------------------
export class ModelService {
  /**
   * Resolve a LanguageModelChat instance.
   * If modelId is provided it is used as a hint; falls back to the first
   * available Copilot model.
   */
  async getModel(modelId?: string): Promise<vscode.LanguageModelChat> {
    const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
    if (models.length === 0) {
      throw new Error("No Copilot language models are available.");
    }
    if (modelId) {
      const match = models.find((m) => m.id === modelId);
      if (match) {
        return match;
      }
    }
    return models[0];
  }

  /**
   * Send a request to the model and return an async iterable of text chunks.
   *
   * When tools are provided, the model may emit LanguageModelToolCallPart
   * responses. This method handles the dispatch loop automatically:
   *   1. Stream the model response.
   *   2. If the model requests a tool call, invoke it via vscode.lm.invokeTool.
   *   3. Feed the tool result back as a User message and send another request.
   *   4. Repeat until the model returns a pure-text response.
   *
   * @param tools  Pass vscode.lm.tools to expose all registered tools
   *               (ours + MCP). Omit to disable tool calling.
   */
  async *stream(
    model: vscode.LanguageModelChat,
    messages: vscode.LanguageModelChatMessage[],
    token: vscode.CancellationToken,
    tools?: readonly vscode.LanguageModelToolInformation[],
  ): AsyncIterable<string> {
    const opts: vscode.LanguageModelChatRequestOptions = tools?.length
      ? { tools: [...tools] }
      : {};

    // Mutable copy — tool results are appended here for follow-up requests.
    const runningMessages = [...messages];

    // Tool dispatch loop: keep sending until the model produces pure text.
    while (true) {
      if (token.isCancellationRequested) {
        return;
      }

      const response = await model.sendRequest(runningMessages, opts, token);

      const pendingToolCalls: vscode.LanguageModelToolCallPart[] = [];
      const assistantParts: Array<
        vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart
      > = [];

      for await (const part of response.stream) {
        if (token.isCancellationRequested) {
          return;
        }
        if (part instanceof vscode.LanguageModelTextPart) {
          assistantParts.push(part);
          yield part.value;
        } else if (part instanceof vscode.LanguageModelToolCallPart) {
          pendingToolCalls.push(part);
          assistantParts.push(part);
        }
      }

      // Pure text response — nothing left to dispatch.
      if (pendingToolCalls.length === 0) {
        break;
      }

      // Record the assistant turn (text + tool call parts).
      runningMessages.push(
        vscode.LanguageModelChatMessage.Assistant(assistantParts),
      );

      // Invoke each requested tool and collect its result.
      const resultParts: vscode.LanguageModelToolResultPart[] = [];
      for (const tc of pendingToolCalls) {
        const result = await vscode.lm.invokeTool(
          tc.name,
          { input: tc.input as object, toolInvocationToken: undefined },
          token,
        );
        resultParts.push(
          new vscode.LanguageModelToolResultPart(tc.callId, result.content),
        );
      }

      // Feed all results back as a single User message and loop.
      runningMessages.push(vscode.LanguageModelChatMessage.User(resultParts));
    }
  }
}
