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
exports.AgentLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ---------------------------------------------------------------------------
// AgentLoader — discovers and loads agent system prompts from .md files
//
// Each agent is represented by a Markdown file whose content is the full
// system prompt.  The file name (without extension) becomes the agent id.
// ---------------------------------------------------------------------------
class AgentLoader {
    _agentsDir;
    constructor(
    /** Absolute path to the directory that contains the .md agent files */
    _agentsDir) {
        this._agentsDir = _agentsDir;
    }
    /** Load a single agent by id (e.g. "recon-agent"). */
    load(agentId) {
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
    loadAll() {
        if (!fs.existsSync(this._agentsDir)) {
            return [];
        }
        return fs
            .readdirSync(this._agentsDir)
            .filter((f) => f.endsWith(".md"))
            .map((f) => this.load(path.basename(f, ".md")));
    }
    /** Convert a kebab-case id to a display name (e.g. "recon-agent" → "Recon Agent"). */
    _idToName(id) {
        return id
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    }
}
exports.AgentLoader = AgentLoader;
//# sourceMappingURL=agentLoader.js.map