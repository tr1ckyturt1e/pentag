import { AgentDefinition } from "../types/agent";
export declare class AgentLoader {
    /** Absolute path to the directory that contains the .md agent files */
    private readonly _agentsDir;
    constructor(
    /** Absolute path to the directory that contains the .md agent files */
    _agentsDir: string);
    /** Load a single agent by id (e.g. "recon-agent"). */
    load(agentId: string): AgentDefinition;
    /** Load all .md files in the agents directory. */
    loadAll(): AgentDefinition[];
    /** Convert a kebab-case id to a display name (e.g. "recon-agent" → "Recon Agent"). */
    private _idToName;
}
//# sourceMappingURL=agentLoader.d.ts.map