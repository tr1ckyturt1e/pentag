import * as vscode from "vscode";
import { ProjectConfig } from "../views/newProjectView";
import { Vulnerability } from "./vulnerability";

// ---------------------------------------------------------------------------
// AgentDefinition — loaded from an .md system-prompt file by AgentLoader
// ---------------------------------------------------------------------------
export interface AgentDefinition {
  /** Unique identifier matching the .md filename (e.g. "recon-agent") */
  id: string;

  /** Human-readable display name */
  name: string;

  /** Full system prompt text loaded from the .md file */
  systemPrompt: string;
}

// ---------------------------------------------------------------------------
// AgentStatus — lifecycle states for each agent in a scan run
// ---------------------------------------------------------------------------
export type AgentStatus =
  | "not-started"
  | "running"
  | "done"
  | "failed"
  | "cancelled"
  | "waiting"; // waiting for human input

// ---------------------------------------------------------------------------
// ParsedVuln — a vulnerability extracted from raw agent text output
// ---------------------------------------------------------------------------
export interface ParsedVuln {
  type: "tentative" | "confirmed" | "false-positive";
  /** Human-readable confidence level derived from the classification type. */
  confidence: "Confirmed" | "Tentative";
  severity: string;
  title: string;
  url: string;
  description?: string;
  parameter?: string;
  evidence?: string;
  /** CVSS-style numeric confidence score (0–100), if provided by the agent. */
  confidenceScore?: number;
}

// ---------------------------------------------------------------------------
// AgentContext — passed into every agent invocation
// ---------------------------------------------------------------------------
export interface AgentContext {
  /** Project being scanned */
  projectConfig: ProjectConfig;

  /** ID of the Copilot model to use */
  modelId: string;

  /** Running conversation history for this session */
  conversationHistory: vscode.LanguageModelChatMessage[];

  /** Vulnerabilities accumulated so far in this scan */
  findings: Vulnerability[];

  /** Token to support cancellation */
  cancellationToken: vscode.CancellationToken;

  /** Names of MCP servers the user selected — used to filter vscode.lm.tools */
  selectedMcpServers?: string[];

  /** Fired whenever an agent's lifecycle status changes */
  onStatus?: (agentId: string, status: AgentStatus) => void;

  /**
   * Fired when an agent requires human input mid-loop.
   * The orchestrator awaits the returned Promise — the ReAct loop is paused
   * until the human submits a reply, which resolves the Promise.
   */
  onHitlQuestion?: (agentId: string, question: string) => Promise<string>;

  /** Fired when a vulnerability is parsed from agent output */
  onVuln?: (vuln: ParsedVuln) => void;

  /**
   * Called at the start of every agent turn.
   * Returns immediately when the scan is running normally.
   * When the scan is paused this Promise does not resolve until the user
   * resumes — causing the orchestrator loop to block in place.
   */
  waitIfPaused?: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// AgentResult — returned by every agent invocation
// ---------------------------------------------------------------------------
export interface AgentResult {
  /** Full text response produced by the agent */
  text: string;

  /** Any new vulnerabilities the agent identified */
  findings?: Vulnerability[];

  /** ID of the next agent the orchestrator should invoke, if any */
  nextAgent?: string;
}
