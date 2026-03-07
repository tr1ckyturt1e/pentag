import * as fs from "fs";
import * as path from "path";
import { AgentDefinition } from "../types/agent";

// ---------------------------------------------------------------------------
// AgentLoader — discovers and loads agent system prompts from .md files
//
// Each agent is represented by a Markdown file whose content is the full
// system prompt.  The file name (without extension) becomes the agent id.
// ---------------------------------------------------------------------------
export class AgentLoader {
  constructor(
    /** Absolute path to the directory that contains the .md agent files */
    private readonly _agentsDir: string,
  ) {}

  /** Load a single agent by id (e.g. "recon-agent"). */
  load(agentId: string): AgentDefinition {
    const filePath = path.join(this._agentsDir, `${agentId}.md`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Agent definition not found: ${filePath}`);
    }
    const systemPrompt = fs.readFileSync(filePath, "utf8");
    return {
      id: agentId,
      name: this._idToName(agentId),
      systemPrompt,
    };
  }

  /** Load all .md files in the agents directory. */
  loadAll(): AgentDefinition[] {
    if (!fs.existsSync(this._agentsDir)) {
      return [];
    }
    return fs
      .readdirSync(this._agentsDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => this.load(path.basename(f, ".md")));
  }

  /** Convert a kebab-case id to a display name (e.g. "recon-agent" → "Recon Agent"). */
  private _idToName(id: string): string {
    return id
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
}
