import { AgentContext, AgentResult } from "../types/agent";
import { AgentLoader } from "./agentLoader";
import { ModelService } from "./modelService";
import { MemoryStore } from "./memoryStore";
export declare class Orchestrator {
    private readonly _agentLoader;
    private readonly _modelService;
    private readonly _memoryStore;
    constructor(_agentLoader: AgentLoader, _modelService: ModelService, _memoryStore: MemoryStore);
    /**
     * Run the full ReAct agentic pipeline for a given intent.
     *
     * @param intent     Top-level goal (e.g. "Run a full pentest scan")
     * @param context    Project config, model id, findings list, cancellation token
     * @param sessionKey Scopes conversation memory (e.g. projectPath)
     * @param onChunk    Streamed text callback -- receives each chunk + agentId
     */
    run(intent: string, context: AgentContext, sessionKey: string, onChunk?: (chunk: string, agentId: string) => void): Promise<AgentResult>;
    private _runReAct;
    /**
     * Present an error to the human operator and offer recovery options.
     * Returns:
     *   "retry"  — operator wants the agent to try the same turn again
     *   "skip"   — operator wants to abandon this agent and move on
     *   string   — operator provided context to inject as an observation
     *   null     — no HITL available, or panel was closed
     */
    private _recoverFromError;
    private _singleTurn;
}
//# sourceMappingURL=orchestrator.d.ts.map