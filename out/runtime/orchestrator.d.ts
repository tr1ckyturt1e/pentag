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
    private _singleTurn;
}
//# sourceMappingURL=orchestrator.d.ts.map