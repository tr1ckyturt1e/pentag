export interface SitemapEntry {
    /** Unique ID for this request/response pair */
    id: string;
    /** ISO 8601 timestamp of when the request was made */
    timestamp: string;
    url: string;
    method: string;
    requestHeaders: Record<string, string>;
    requestBody?: string;
    statusCode: number;
    statusMessage: string;
    responseHeaders: Record<string, string>;
    /** Response body capped at 8 KB */
    responseBody?: string;
    /** Full response length before truncation */
    responseLength: number;
    /** Content-Type of the response */
    mimeType?: string;
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
export declare function setSitemapProjectPath(p: string): void;
export declare function getSitemapPath(): string | undefined;
export declare class SitemapManager {
    /** Append a new request/response entry to the sitemap file.
     * Returns null if the method+URL pair was already recorded (deduplication).
     */
    static append(entry: Omit<SitemapEntry, "id" | "timestamp">): SitemapEntry | null;
    /** Read and filter entries from the sitemap. */
    static query(opts?: SitemapQueryOptions): SitemapEntry[];
    /** Return a concise summary for agent context: unique URLs, status codes, interesting tags. */
    static summary(): string;
    /** Clear the sitemap file and reset deduplication state (called at scan start). */
    static clear(): void;
    /** Return all unique URLs that have been recorded. */
    static getUniqueUrls(): string[];
    /** Annotate an entry by URL — adds notes and tags to the most recent matching entry. */
    static annotate(url: string, notes: string, tags: string[]): boolean;
}
//# sourceMappingURL=sitemapStore.d.ts.map