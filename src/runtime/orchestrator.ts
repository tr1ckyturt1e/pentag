import * as vscode from "vscode";
import {
  AgentContext,
  AgentResult,
  AgentStatus,
  ParsedVuln,
} from "../types/agent";
import { ProjectConfig } from "../views/newProjectView";
import { AgentLoader } from "./agentLoader";
import { ModelService } from "./modelService";
import { MemoryStore } from "./memoryStore";

// ---------------------------------------------------------------------------
// Orchestrator ReAct agentic pipeline
//
// Two-level loop:
//
//   OUTER (delegation loop) orchestrator.md decides which specialist runs next.
//     Runs up to MAX_DELEGATE_STEPS times.
//
//   INNER (ReAct loop) each specialist agent reasons and acts autonomously
//     across multiple LLM turns until it outputs DONE: <result>.
//     Runs up to MAX_AGENT_TURNS per specialist invocation.
//
// ReAct turn format expected from each specialist agent:
//   Thought: <reasoning>
//   Action: <what the agent is doing this turn>
//   Observation: <result / what was learned>
//   ... (repeating) ...
//   DONE: <final result passed back to the orchestrator>
//
// Orchestrator agent format:
//   DELEGATE: <agent-id>
//   TASK: <instruction for that agent>
//   -- or --
//   COMPLETE
//   SUMMARY: <overall result>
//
// Human-in-the-Loop:
//   Any specialist may pause the loop by outputting:
//   HUMAN_INPUT_REQUIRED: <question for the human>
//   The orchestrator awaits the human reply before continuing.
// ---------------------------------------------------------------------------

/** Max number of times the orchestrator can delegate to a specialist. */
const MAX_DELEGATE_STEPS = 20;

/** Max ReAct turns a single specialist agent may take before being forced to conclude. */
const MAX_AGENT_TURNS = 10;

/** The agent that must always run last before the pipeline can complete. */
const REPORTING_AGENT_ID = "reporting-agent";

/** Names of tools registered by this extension. Agents may only call these. */
const OWN_TOOL_NAMES = new Set([
  "http_request",
  "sitemap_read",
  "sitemap_summary",
  "sitemap_annotate",
]);

// -- Parsers -----------------------------------------------------------------

function parseDelegate(text: string): string | null {
  const m = text.match(/^DELEGATE:\s*(\S+)/m);
  return m ? m[1].trim() : null;
}

function parseTask(text: string): string {
  const m = text.match(/^TASK:\s*(.+)/m);
  return m ? m[1].trim() : text;
}

function parseDone(text: string): string | null {
  const m = text.match(/^DONE:\s*(.+)/ms);
  return m ? m[1].trim() : null;
}

function parseHitlQuestion(text: string): string | null {
  const m = text.match(/^HUMAN_INPUT_REQUIRED:\s*(.+)/m);
  return m ? m[1].trim() : null;
}

function parseTentativeIssues(text: string): ParsedVuln[] {
  const results: ParsedVuln[] = [];
  const regex = /^TENTATIVE_ISSUE:\s*(.+)/gm;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const parts = m[1].split("|").map((s) => s.trim());
    results.push({
      type: "tentative",
      confidence: "Tentative",
      severity: parts[0] || "Info",
      title: parts[1] || "Unknown",
      url: parts[2] || "",
      description: parts[3],
      confidenceScore: parts[4]
        ? parseInt(parts[4], 10) || undefined
        : undefined,
    });
  }
  return results;
}

/**
 * Emit vulnerability findings parsed from a block of agent text.
 * Agents only emit TENTATIVE_ISSUE — confirmed/false-positive are set
 * by the human operator through the UI, not by agents directly.
 */
function emitVulns(text: string, context: AgentContext): void {
  for (const v of parseTentativeIssues(text)) {
    context.onVuln?.(v);
  }
}

/**
 * Join all specialist results into a single findings block suitable for
 * passing to reporting-agent or nudging the orchestrator at step limits.
 */
function buildFindingsSummary(
  results: Array<{ agentId: string; result: string }>,
): string {
  if (results.length === 0) {
    return "No findings collected.";
  }
  return results
    .map((r) => `### Findings from ${r.agentId}\n${r.result}`)
    .join("\n\n");
}

/**
 * Build a structured project context block from the project config.
 * This is prepended to every agent task so all agents have full knowledge
 * of the target scope, URLs, and credentials without needing to ask.
 */
function buildProjectContext(config: ProjectConfig): string {
  const lines: string[] = [
    "## Project Context",
    `Project Name : ${config.name}`,
    `Project Type : ${config.type}`,
  ];

  if (config.apps.length > 0) {
    lines.push("");
    lines.push("### Target Applications");
    config.apps.forEach((app, i) => {
      lines.push(``);
      lines.push(`**App ${i + 1}**`);
      lines.push(`  URL         : ${app.url}`);
      lines.push(`  SSO Enabled : ${app.sso ? "Yes" : "No"}`);
      if (app.credentials.length > 0) {
        lines.push(`  Credentials :`);
        app.credentials.forEach((c) => {
          lines.push(
            `    - Role: ${c.role}  |  Username: ${c.username}  |  Password: ${c.password}`,
          );
        });
      } else {
        lines.push(`  Credentials : None provided`);
      }
    });
  }

  if (config.collectionFile) {
    lines.push("");
    lines.push(`API Collection File: ${config.collectionFile}`);
  }

  lines.push("");
  lines.push(
    "> All information above is already known. Only use HUMAN_INPUT_REQUIRED: if you need" +
      " something that is NOT listed here (e.g. out-of-scope clarification, missing credentials," +
      " or operator approval for a risky action).",
  );

  return lines.join("\n");
}

// -- Orchestrator class -------------------------------------------------------

export class Orchestrator {
  constructor(
    private readonly _agentLoader: AgentLoader,
    private readonly _modelService: ModelService,
    private readonly _memoryStore: MemoryStore,
  ) {}

  /**
   * Run the full ReAct agentic pipeline for a given intent.
   *
   * @param intent     Top-level goal (e.g. "Run a full pentest scan")
   * @param context    Project config, model id, findings list, cancellation token
   * @param sessionKey Scopes conversation memory (e.g. projectPath)
   * @param onChunk    Streamed text callback -- receives each chunk + agentId
   */
  async run(
    intent: string,
    context: AgentContext,
    sessionKey: string,
    onChunk?: (chunk: string, agentId: string) => void,
  ): Promise<AgentResult> {
    const model = await this._modelService.getModel(context.modelId);
    let lastText = "";

    // Accumulate each specialist's final result so reporting-agent can get
    // a complete picture regardless of what the orchestrator passes in its TASK.
    const specialistResults: Array<{ agentId: string; result: string }> = [];
    let reportingAgentRan = false;

    // Prepend project context so the orchestrator always knows the full scope.
    const projectContext = buildProjectContext(context.projectConfig);
    let orchestratorInput = `${projectContext}\n\n---\n\n${intent}`;

    context.onStatus?.("orchestrator", "running");

    // -- Outer delegation loop -----------------------------------------------
    for (let step = 0; step < MAX_DELEGATE_STEPS; step++) {
      await context.waitIfPaused?.();
      if (context.cancellationToken.isCancellationRequested) {
        context.onStatus?.("orchestrator", "cancelled");
        break;
      }

      // 1. Run orchestrator agent (single routing call)
      const orchAgent = this._agentLoader.load("orchestrator");
      const orchKey = `${sessionKey}:orchestrator`;
      let orchText: string;
      try {
        orchText = await this._singleTurn(
          model,
          orchAgent.systemPrompt,
          orchestratorInput,
          orchKey,
          "orchestrator",
          context,
          onChunk,
        );
      } catch (err) {
        const status =
          err instanceof vscode.CancellationError ? "cancelled" : "failed";
        context.onStatus?.("orchestrator", status);
        throw err;
      }
      lastText = orchText;

      // 2. Check for completion
      if (/^COMPLETE/m.test(orchText)) {
        // Safety net: if the LLM tries to complete without running the reporting
        // agent, force a final reporting pass before we accept COMPLETE.
        if (!reportingAgentRan) {
          const findingsSummary = buildFindingsSummary(specialistResults);
          const forcedTask = `The scan is complete. Compile a full penetration test report from the findings below.\n\n${findingsSummary}`;
          let reportResult: string;
          try {
            reportResult = await this._runReAct(
              model,
              REPORTING_AGENT_ID,
              forcedTask,
              sessionKey,
              context,
              onChunk,
            );
          } catch (err) {
            const isCancel = err instanceof vscode.CancellationError;
            context.onStatus?.(
              "orchestrator",
              isCancel ? "cancelled" : "failed",
            );
            throw err;
          }
          lastText = reportResult;
          reportingAgentRan = true;
          if (context.cancellationToken.isCancellationRequested) {
            context.onStatus?.("orchestrator", "cancelled");
            break;
          }
        }
        context.onStatus?.("orchestrator", "done");
        break;
      }

      // 3. Parse which specialist to run and what task to give it
      const delegateId = parseDelegate(orchText);
      if (!delegateId) {
        context.onStatus?.("orchestrator", "done");
        break;
      }
      const task = parseTask(orchText);

      // 4. Run the specialist in its own ReAct inner loop
      //    When delegating to reporting-agent, inject all prior findings so
      //    the report covers the entire scan regardless of what the LLM wrote
      //    in its TASK line.
      let enrichedTask = task;
      if (delegateId === REPORTING_AGENT_ID && specialistResults.length > 0) {
        enrichedTask = `${task}\n\n---\n\n${buildFindingsSummary(specialistResults)}`;
      }

      let specialistResult: string;
      try {
        specialistResult = await this._runReAct(
          model,
          delegateId,
          enrichedTask,
          sessionKey,
          context,
          onChunk,
        );
      } catch (err) {
        // A specialist failure or cancellation must stop the whole pipeline.
        const isCancel = err instanceof vscode.CancellationError;
        context.onStatus?.("orchestrator", isCancel ? "cancelled" : "failed");
        throw err;
      }
      lastText = specialistResult;

      // Track which specialists have run and accumulate their results
      specialistResults.push({ agentId: delegateId, result: specialistResult });
      if (delegateId === REPORTING_AGENT_ID) {
        reportingAgentRan = true;
      }

      // If the specialist detected cancellation but returned normally (instead
      // of throwing), stop the outer loop now without emitting a second status.
      if (context.cancellationToken.isCancellationRequested) {
        context.onStatus?.("orchestrator", "cancelled");
        break;
      }

      // 5. Feed the specialist's final result back into the orchestrator
      orchestratorInput = `Agent "${delegateId}" completed.\n\nResult:\n${specialistResult}`;

      // If this was the last allowed step and reporting-agent still hasn’t run,
      // use the final slot for it rather than letting the loop expire silently.
      if (step === MAX_DELEGATE_STEPS - 2 && !reportingAgentRan) {
        const findingsSummary = buildFindingsSummary(specialistResults);
        orchestratorInput = `All testing steps are complete. You MUST now delegate to reporting-agent.\n\n${findingsSummary}`;
      }
    }

    return { text: lastText };
  }

  // -- Inner ReAct loop -------------------------------------------------------

  private async _runReAct(
    model: vscode.LanguageModelChat,
    agentId: string,
    task: string,
    sessionKey: string,
    context: AgentContext,
    onChunk?: (chunk: string, agentId: string) => void,
  ): Promise<string> {
    const agent = this._agentLoader.load(agentId);
    const agentKey = `${sessionKey}:${agentId}`;

    context.onStatus?.(agentId, "running");

    // Prepend full project context to the first turn so the specialist has
    // complete knowledge of the target before it starts reasoning.
    const projectContext = buildProjectContext(context.projectConfig);
    let currentInput = `${projectContext}\n\n---\n\n${task}`;
    let lastText = "";

    // Tracks which turns have already been offered a HITL error-recovery so we
    // don't loop indefinitely if the same error keeps recurring after a retry.
    const recoveredTurns = new Set<number>();

    for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
      await context.waitIfPaused?.();
      if (context.cancellationToken.isCancellationRequested) {
        context.onStatus?.(agentId, "cancelled");
        return lastText; // return immediately — avoids the "done" emit below
      }

      let turnText: string;
      try {
        turnText = await this._singleTurn(
          model,
          agent.systemPrompt,
          currentInput,
          agentKey,
          agentId,
          context,
          onChunk,
        );
      } catch (err) {
        if (err instanceof vscode.CancellationError) {
          context.onStatus?.(agentId, "cancelled");
          return lastText;
        }
        // Before giving up on this agent, ask the operator if they can help.
        if (!recoveredTurns.has(turn) && context.onHitlQuestion) {
          recoveredTurns.add(turn);
          const recovery = await this._recoverFromError(agentId, err, context);
          if (recovery === "retry") {
            turn--; // undo the upcoming increment — re-run the same turn
            continue;
          }
          if (recovery === "skip") {
            context.onStatus?.(agentId, "done");
            return (
              lastText || `Agent ${agentId} was skipped at operator request.`
            );
          }
          if (recovery !== null) {
            // Operator provided context — inject as an observation and continue
            currentInput = `Observation: Human provided assistance: ${recovery}`;
            continue;
          }
        }
        context.onStatus?.(agentId, "failed");
        throw err;
      }
      lastText = turnText;

      // Emit any vulnerabilities found in this turn's output
      emitVulns(turnText, context);

      // Check for HITL pause before DONE so the agent can ask mid-turn
      const hitlQ = parseHitlQuestion(turnText);
      if (hitlQ !== null && context.onHitlQuestion) {
        context.onStatus?.(agentId, "waiting");
        let humanReply: string;
        try {
          humanReply = await context.onHitlQuestion(agentId, hitlQ);
        } catch {
          // Panel closed or cancelled while waiting
          context.onStatus?.(agentId, "cancelled");
          return lastText;
        }
        context.onStatus?.(agentId, "running");
        currentInput = `Observation: Human responded: ${humanReply}`;
        continue;
      }

      // Check if the agent has finished its ReAct cycle
      const done = parseDone(turnText);
      if (done !== null) {
        context.onStatus?.(agentId, "done");
        return done;
      }

      // Extract Observation from this turn to feed back as next input
      const obsMatch = turnText.match(/^Observation:\s*(.+)/ms);
      currentInput = obsMatch ? `Observation: ${obsMatch[1].trim()}` : turnText;

      // On the last allowed turn, force the agent to conclude
      if (turn === MAX_AGENT_TURNS - 2) {
        currentInput += "\n\nYou must now output DONE: <your final result>.";
      }
    }

    context.onStatus?.(agentId, "done");
    return lastText;
  }

  // -- Error recovery HITL ---------------------------------------------------

  /**
   * Present an error to the human operator and offer recovery options.
   * Returns:
   *   "retry"  — operator wants the agent to try the same turn again
   *   "skip"   — operator wants to abandon this agent and move on
   *   string   — operator provided context to inject as an observation
   *   null     — no HITL available, or panel was closed
   */
  private async _recoverFromError(
    agentId: string,
    err: unknown,
    context: AgentContext,
  ): Promise<"retry" | "skip" | string | null> {
    if (!context.onHitlQuestion) {
      return null;
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    context.onStatus?.(agentId, "waiting");
    let reply: string;
    try {
      reply = await context.onHitlQuestion(
        agentId,
        `Agent encountered an error: "${errMsg}"\n\n` +
          `How would you like to proceed?\n` +
          `• Type “retry” to try again\n` +
          `• Type “skip” to abandon this agent and continue the scan\n` +
          `• Or provide any information that might help the agent continue`,
      );
    } catch {
      return null; // panel closed or cancelled
    }
    context.onStatus?.(agentId, "running");
    if (/^skip\b/i.test(reply.trim())) {
      return "skip";
    }
    if (/^retry\b/i.test(reply.trim())) {
      return "retry";
    }
    return reply;
  }

  // -- Single LLM turn --------------------------------------------------------

  private async _singleTurn(
    model: vscode.LanguageModelChat,
    systemPrompt: string,
    userInput: string,
    memoryKey: string,
    agentId: string,
    context: AgentContext,
    onChunk?: (chunk: string, agentId: string) => void,
  ): Promise<string> {
    // Retry up to 3 times on transient model/network errors (e.g. ERR_HTTP2_PROTOCOL_ERROR).
    const MAX_RETRIES = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Build a bounded tool set to avoid exceeding the 128-tool-per-request
        // limit imposed by the model API. Never pass vscode.lm.tools unfiltered —
        // other installed extensions contribute tools to that list and the total
        // can far exceed 128.
        //
        // The orchestrator only routes work; it never calls tools itself.
        // Specialist agents get our own 4 tools plus any user-selected MCP tools.
        const ownTools = vscode.lm.tools.filter((t) => OWN_TOOL_NAMES.has(t.name));
        const mcpTools =
          agentId !== "orchestrator" && context.selectedMcpServers?.length
            ? vscode.lm.tools.filter((t) =>
                context.selectedMcpServers!.some((s) =>
                  t.name.startsWith(`mcp_${s}_`),
                ),
              )
            : [];
        const tools =
          agentId === "orchestrator"
            ? []
            : [...ownTools, ...mcpTools].slice(0, 128);

        const history = this._memoryStore.get(memoryKey);
        const messages: vscode.LanguageModelChatMessage[] = [
          vscode.LanguageModelChatMessage.User(systemPrompt),
          ...history,
          vscode.LanguageModelChatMessage.User(userInput),
        ];

        let fullText = "";
        for await (const chunk of this._modelService.stream(
          model,
          messages,
          context.cancellationToken,
          tools,
          context.toolInvocationToken,
        )) {
          fullText += chunk;
          onChunk?.(chunk, agentId);
        }

        if (context.cancellationToken.isCancellationRequested) {
          throw new vscode.CancellationError();
        }

        this._memoryStore.append(
          memoryKey,
          vscode.LanguageModelChatMessage.User(userInput),
        );
        this._memoryStore.append(
          memoryKey,
          vscode.LanguageModelChatMessage.Assistant(fullText),
        );

        return fullText;
      } catch (err) {
        if (err instanceof vscode.CancellationError) {
          throw err; // never retry on cancellation
        }
        lastError = err;
        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 2 s, 4 s before the 2nd and 3rd attempts
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }
    throw lastError;
  }
}
