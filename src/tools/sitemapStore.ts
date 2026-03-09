import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ---------------------------------------------------------------------------
// Sitemap data structure (Burp Suite-inspired)
// ---------------------------------------------------------------------------

export interface SitemapEntry {
  /** Unique ID for this request/response pair */
  id: string;

  /** ISO 8601 timestamp of when the request was made */
  timestamp: string;

  // -- Request ---------------------------------------------------------------
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;

  // -- Response --------------------------------------------------------------
  statusCode: number;
  statusMessage: string;
  responseHeaders: Record<string, string>;
  /** Response body capped at 8 KB */
  responseBody?: string;
  /** Full response length before truncation */
  responseLength: number;
  /** Content-Type of the response */
  mimeType?: string;

  // -- Analysis / annotations (set by agents) --------------------------------
  /** Free-text notes added by an agent about this response */
  notes?: string;
  /** Agent-assigned tags (e.g. "login", "api", "interesting", "form", "admin") */
  tags?: string[];
  /** Query or body parameter names detected in this request */
  parameters?: string[];
}

export interface SitemapQueryOptions {
  /** Substring or regex pattern to match against the URL */
  urlPattern?: string;
  /** Filter by HTTP method (case-insensitive) */
  method?: string;
  /** Filter by minimum HTTP status code */
  statusCodeMin?: number;
  /** Filter by maximum HTTP status code */
  statusCodeMax?: number;
  /** Return only entries that have ALL of these tags */
  tags?: string[];
  /** Maximum number of results to return (default: all) */
  limit?: number;
  /** If set, only return entries not yet seen (skip body for brevity) */
  summaryOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Project path binding — set once per scan, read by tools
// ---------------------------------------------------------------------------

let _projectPath: string | undefined;

// ---------------------------------------------------------------------------
// In-memory deduplication — ensures sitemap.jsonl only contains unique
// method+URL pairs. Seeded from the existing file when a project is opened
// so duplicate prevention survives extension host restarts mid-scan.
// ---------------------------------------------------------------------------
const _seenKeys = new Set<string>();

function _sitemapKey(method: string, url: string): string {
  return `${method.toUpperCase()}|${url}`;
}

export function setSitemapProjectPath(p: string): void {
  _projectPath = p;
  // Seed the deduplication set from any existing sitemap file.
  _seenKeys.clear();
  const sitemapFile = path.join(p, "sitemap.jsonl");
  if (fs.existsSync(sitemapFile)) {
    try {
      const raw = fs.readFileSync(sitemapFile, "utf8");
      for (const line of raw.split("\n").filter(Boolean)) {
        try {
          const entry = JSON.parse(line) as SitemapEntry;
          _seenKeys.add(_sitemapKey(entry.method, entry.url));
        } catch {
          // Skip malformed lines
        }
      }
    } catch {
      // Non-fatal: start with empty set
    }
  }
}

export function getSitemapPath(): string | undefined {
  if (!_projectPath) {
    return undefined;
  }
  return path.join(_projectPath, "sitemap.jsonl");
}

// ---------------------------------------------------------------------------
// SitemapManager — append and query sitemap.jsonl
// ---------------------------------------------------------------------------

export class SitemapManager {
  /** Append a new request/response entry to the sitemap file.
   * Returns null if the method+URL pair was already recorded (deduplication).
   */
  static append(
    entry: Omit<SitemapEntry, "id" | "timestamp">,
  ): SitemapEntry | null {
    // Deduplicate: skip if this exact method+URL was already recorded.
    const key = _sitemapKey(entry.method, entry.url);
    if (_seenKeys.has(key)) {
      return null;
    }
    _seenKeys.add(key);

    const full: SitemapEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const p = getSitemapPath();
    if (p) {
      try {
        fs.appendFileSync(p, JSON.stringify(full) + "\n", "utf8");
      } catch {
        // Non-fatal: if the file can't be written (e.g. no project path yet),
        // the entry is silently discarded. The scan continues normally.
      }
    }
    return full;
  }

  /** Read and filter entries from the sitemap. */
  static query(opts: SitemapQueryOptions = {}): SitemapEntry[] {
    const p = getSitemapPath();
    if (!p || !fs.existsSync(p)) {
      return [];
    }

    const raw = fs.readFileSync(p, "utf8");
    const lines = raw.split("\n").filter(Boolean);

    let entries: SitemapEntry[] = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line) as SitemapEntry);
      } catch {
        // Skip malformed lines
      }
    }

    if (opts.urlPattern) {
      try {
        const re = new RegExp(opts.urlPattern, "i");
        entries = entries.filter((e) => re.test(e.url));
      } catch {
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
      entries = entries.filter((e) => e.statusCode >= opts.statusCodeMin!);
    }

    if (opts.statusCodeMax !== undefined) {
      entries = entries.filter((e) => e.statusCode <= opts.statusCodeMax!);
    }

    if (opts.tags?.length) {
      entries = entries.filter((e) =>
        opts.tags!.every((t) => e.tags?.includes(t)),
      );
    }

    if (opts.limit && opts.limit > 0) {
      entries = entries.slice(0, opts.limit);
    }

    return entries;
  }

  /** Return a concise summary for agent context: unique URLs, status codes, interesting tags. */
  static summary(): string {
    const entries = SitemapManager.query();
    if (entries.length === 0) {
      return "Sitemap is empty. No requests have been recorded yet.";
    }

    const urlSet = new Map<
      string,
      { methods: Set<string>; statusCodes: Set<number>; tags: Set<string> }
    >();
    for (const e of entries) {
      const key = `${e.method.toUpperCase()} ${e.url}`;
      if (!urlSet.has(key)) {
        urlSet.set(key, {
          methods: new Set(),
          statusCodes: new Set(),
          tags: new Set(),
        });
      }
      const rec = urlSet.get(key)!;
      rec.methods.add(e.method.toUpperCase());
      rec.statusCodes.add(e.statusCode);
      for (const t of e.tags ?? []) {
        rec.tags.add(t);
      }
    }

    const lines: string[] = [
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
  static clear(): void {
    const p = getSitemapPath();
    if (p) {
      try {
        fs.writeFileSync(p, "", "utf8");
      } catch {
        // Non-fatal
      }
    }
    _seenKeys.clear();
  }

  /** Return all unique URLs that have been recorded. */
  static getUniqueUrls(): string[] {
    const entries = SitemapManager.query();
    return [...new Set(entries.map((e) => e.url))];
  }

  /** Annotate an entry by URL — adds notes and tags to the most recent matching entry. */
  static annotate(url: string, notes: string, tags: string[]): boolean {
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
        const entry = JSON.parse(line) as SitemapEntry;
        if (entry.url === url || entry.url.startsWith(url)) {
          entry.notes = notes;
          entry.tags = [...new Set([...(entry.tags ?? []), ...tags])];
          updated = true;
          return JSON.stringify(entry);
        }
      } catch {
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
