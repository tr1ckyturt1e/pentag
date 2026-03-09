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
exports.SitemapManager = void 0;
exports.setSitemapProjectPath = setSitemapProjectPath;
exports.getSitemapPath = getSitemapPath;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
// ---------------------------------------------------------------------------
// Project path binding — set once per scan, read by tools
// ---------------------------------------------------------------------------
let _projectPath;
// ---------------------------------------------------------------------------
// In-memory deduplication — ensures sitemap.jsonl only contains unique
// method+URL pairs. Seeded from the existing file when a project is opened
// so duplicate prevention survives extension host restarts mid-scan.
// ---------------------------------------------------------------------------
const _seenKeys = new Set();
function _sitemapKey(method, url) {
    return `${method.toUpperCase()}|${url}`;
}
function setSitemapProjectPath(p) {
    _projectPath = p;
    // Seed the deduplication set from any existing sitemap file.
    _seenKeys.clear();
    const sitemapFile = path.join(p, "sitemap.jsonl");
    if (fs.existsSync(sitemapFile)) {
        try {
            const raw = fs.readFileSync(sitemapFile, "utf8");
            for (const line of raw.split("\n").filter(Boolean)) {
                try {
                    const entry = JSON.parse(line);
                    _seenKeys.add(_sitemapKey(entry.method, entry.url));
                }
                catch {
                    // Skip malformed lines
                }
            }
        }
        catch {
            // Non-fatal: start with empty set
        }
    }
}
function getSitemapPath() {
    if (!_projectPath) {
        return undefined;
    }
    return path.join(_projectPath, "sitemap.jsonl");
}
// ---------------------------------------------------------------------------
// SitemapManager — append and query sitemap.jsonl
// ---------------------------------------------------------------------------
class SitemapManager {
    /** Append a new request/response entry to the sitemap file.
     * Returns null if the method+URL pair was already recorded (deduplication).
     */
    static append(entry) {
        // Deduplicate: skip if this exact method+URL was already recorded.
        const key = _sitemapKey(entry.method, entry.url);
        if (_seenKeys.has(key)) {
            return null;
        }
        _seenKeys.add(key);
        const full = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            ...entry,
        };
        const p = getSitemapPath();
        if (p) {
            try {
                fs.appendFileSync(p, JSON.stringify(full) + "\n", "utf8");
            }
            catch {
                // Non-fatal: if the file can't be written (e.g. no project path yet),
                // the entry is silently discarded. The scan continues normally.
            }
        }
        return full;
    }
    /** Read and filter entries from the sitemap. */
    static query(opts = {}) {
        const p = getSitemapPath();
        if (!p || !fs.existsSync(p)) {
            return [];
        }
        const raw = fs.readFileSync(p, "utf8");
        const lines = raw.split("\n").filter(Boolean);
        let entries = [];
        for (const line of lines) {
            try {
                entries.push(JSON.parse(line));
            }
            catch {
                // Skip malformed lines
            }
        }
        if (opts.urlPattern) {
            try {
                const re = new RegExp(opts.urlPattern, "i");
                entries = entries.filter((e) => re.test(e.url));
            }
            catch {
                // If invalid regex, treat as substring
                const sub = opts.urlPattern.toLowerCase();
                entries = entries.filter((e) => e.url.toLowerCase().includes(sub));
            }
        }
        if (opts.method) {
            const m = opts.method.toUpperCase();
            entries = entries.filter((e) => e.method.toUpperCase() === m);
        }
        if (opts.statusCodeMin !== undefined) {
            entries = entries.filter((e) => e.statusCode >= opts.statusCodeMin);
        }
        if (opts.statusCodeMax !== undefined) {
            entries = entries.filter((e) => e.statusCode <= opts.statusCodeMax);
        }
        if (opts.tags?.length) {
            entries = entries.filter((e) => opts.tags.every((t) => e.tags?.includes(t)));
        }
        if (opts.limit && opts.limit > 0) {
            entries = entries.slice(0, opts.limit);
        }
        return entries;
    }
    /** Return a concise summary for agent context: unique URLs, status codes, interesting tags. */
    static summary() {
        const entries = SitemapManager.query();
        if (entries.length === 0) {
            return "Sitemap is empty. No requests have been recorded yet.";
        }
        const urlSet = new Map();
        for (const e of entries) {
            const key = `${e.method.toUpperCase()} ${e.url}`;
            if (!urlSet.has(key)) {
                urlSet.set(key, {
                    methods: new Set(),
                    statusCodes: new Set(),
                    tags: new Set(),
                });
            }
            const rec = urlSet.get(key);
            rec.methods.add(e.method.toUpperCase());
            rec.statusCodes.add(e.statusCode);
            for (const t of e.tags ?? []) {
                rec.tags.add(t);
            }
        }
        const lines = [
            `Sitemap: ${entries.length} request(s), ${urlSet.size} unique method+URL combinations\n`,
        ];
        for (const [key, rec] of urlSet) {
            const tagStr = rec.tags.size ? ` [${[...rec.tags].join(",")}]` : "";
            const statusStr = [...rec.statusCodes].join(",");
            lines.push(`  ${key} → HTTP ${statusStr}${tagStr}`);
        }
        return lines.join("\n");
    }
    /** Clear the sitemap file and reset deduplication state (called at scan start). */
    static clear() {
        const p = getSitemapPath();
        if (p) {
            try {
                fs.writeFileSync(p, "", "utf8");
            }
            catch {
                // Non-fatal
            }
        }
        _seenKeys.clear();
    }
    /** Return all unique URLs that have been recorded. */
    static getUniqueUrls() {
        const entries = SitemapManager.query();
        return [...new Set(entries.map((e) => e.url))];
    }
    /** Annotate an entry by URL — adds notes and tags to the most recent matching entry. */
    static annotate(url, notes, tags) {
        const p = getSitemapPath();
        if (!p || !fs.existsSync(p)) {
            return false;
        }
        const raw = fs.readFileSync(p, "utf8");
        const lines = raw.split("\n").filter(Boolean);
        let updated = false;
        // Find last matching entry and update it
        const updatedLines = lines.map((line) => {
            try {
                const entry = JSON.parse(line);
                if (entry.url === url || entry.url.startsWith(url)) {
                    entry.notes = notes;
                    entry.tags = [...new Set([...(entry.tags ?? []), ...tags])];
                    updated = true;
                    return JSON.stringify(entry);
                }
            }
            catch {
                // Keep malformed lines as-is
            }
            return line;
        });
        if (updated) {
            fs.writeFileSync(p, updatedLines.join("\n") + "\n", "utf8");
        }
        return updated;
    }
}
exports.SitemapManager = SitemapManager;
//# sourceMappingURL=sitemapStore.js.map