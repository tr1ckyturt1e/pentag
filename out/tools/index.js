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
exports.toolRegistry = void 0;
exports.registerTools = registerTools;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const url_1 = require("url");
const sitemapStore_1 = require("./sitemapStore");
// ---------------------------------------------------------------------------
// Tool registry — maps tool names to their implementations for direct dispatch
// when vscode.lm.invokeTool() is unavailable (webview-triggered scans).
// ---------------------------------------------------------------------------
exports.toolRegistry = new Map();
class HttpRequestTool {
    async invoke(options, _token) {
        const { url, method = "GET", headers = {}, body } = options.input;
        let parsed;
        try {
            parsed = new url_1.URL(url);
        }
        catch {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error: invalid URL "${url}"`),
            ]);
        }
        const isHttps = parsed.protocol === "https:";
        const lib = isHttps ? https : http;
        const rawHeaders = {};
        let statusCode = 0;
        let statusMessage = "";
        let rawResponseHeaders = {};
        let mimeType;
        const result = await new Promise((resolve) => {
            const reqOptions = {
                method: method.toUpperCase(),
                headers,
                timeout: 30000,
            };
            // Hoist body-accumulation state to Promise scope so both the response
            // callback and the error handler share the same variables.
            const chunks = [];
            let totalBodyBytes = 0;
            let bodyTruncated = false;
            let responseSettled = false;
            // Called once after all body data is available (or after early truncation).
            const settle = () => {
                if (responseSettled)
                    return;
                responseSettled = true;
                const bodyText = Buffer.concat(chunks).toString("utf8");
                const truncatedBody = bodyTruncated
                    ? bodyText + "\n[... truncated]"
                    : bodyText;
                // Detect query parameters
                const parameters = [];
                try {
                    const u = new url_1.URL(url);
                    u.searchParams.forEach((_v, k) => parameters.push(k));
                }
                catch {
                    // ignore
                }
                // Auto-write to sitemap (method+URL deduplication happens inside SitemapManager)
                sitemapStore_1.SitemapManager.append({
                    url,
                    method: method.toUpperCase(),
                    requestHeaders: headers,
                    requestBody: body,
                    statusCode,
                    statusMessage,
                    responseHeaders: rawResponseHeaders,
                    responseBody: truncatedBody,
                    responseLength: totalBodyBytes,
                    mimeType,
                    parameters: parameters.length ? parameters : undefined,
                });
                const headerLines = Object.entries(rawResponseHeaders)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n");
                resolve(`HTTP ${statusCode} ${statusMessage}\n` +
                    `${headerLines}\n\n` +
                    truncatedBody);
            };
            const req = lib.request(url, reqOptions, (res) => {
                statusCode = res.statusCode ?? 0;
                statusMessage = res.statusMessage ?? "";
                rawResponseHeaders = {};
                for (const [k, v] of Object.entries(res.headers)) {
                    rawResponseHeaders[k] = Array.isArray(v) ? v.join(", ") : (v ?? "");
                }
                mimeType = rawResponseHeaders["content-type"];
                // Accumulate response body chunks; stop early once we hit the 8 KB cap.
                res.on("data", (c) => {
                    if (!bodyTruncated) {
                        const remaining = 8192 - totalBodyBytes;
                        chunks.push(remaining < c.length ? c.slice(0, remaining) : c);
                        totalBodyBytes += c.length;
                        if (totalBodyBytes >= 8192) {
                            bodyTruncated = true;
                            res.destroy(); // stop downloading the rest of the body
                        }
                    }
                });
                res.on("end", settle);
                res.on("close", settle); // also fires when res.destroy() is called
            });
            req.on("timeout", () => {
                req.destroy(new Error("Request timed out after 30s"));
            });
            req.on("error", (err) => {
                // If res.destroy() was called for early truncation, the connection error
                // is expected — finalize what we already have instead of treating it as failure.
                if (bodyTruncated && chunks.length > 0) {
                    settle();
                }
                else if (!responseSettled) {
                    responseSettled = true;
                    resolve(`Error: ${err.message}`);
                }
            });
            if (body) {
                req.write(body);
            }
            req.end();
        });
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(result),
        ]);
    }
}
class SitemapReadTool {
    async invoke(options, _token) {
        const opts = {
            urlPattern: options.input.urlPattern,
            method: options.input.method,
            statusCodeMin: options.input.statusCodeMin,
            statusCodeMax: options.input.statusCodeMax,
            tags: options.input.tags,
            limit: options.input.limit ?? 50,
            summaryOnly: options.input.summaryOnly,
        };
        const entries = sitemapStore_1.SitemapManager.query(opts);
        if (entries.length === 0) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart("No sitemap entries match the given filter. " +
                    "Use http_request to explore the application first."),
            ]);
        }
        // Build a concise text representation for each entry
        const lines = [`Found ${entries.length} sitemap entries:\n`];
        for (const e of entries) {
            lines.push(`--- ${e.method} ${e.url}`);
            lines.push(`    Status : HTTP ${e.statusCode} ${e.statusMessage}`);
            lines.push(`    MIME   : ${e.mimeType ?? "unknown"}`);
            if (e.parameters?.length) {
                lines.push(`    Params : ${e.parameters.join(", ")}`);
            }
            if (e.tags?.length) {
                lines.push(`    Tags   : ${e.tags.join(", ")}`);
            }
            if (e.notes) {
                lines.push(`    Notes  : ${e.notes}`);
            }
            if (!options.input.summaryOnly && e.responseBody) {
                const preview = e.responseBody.slice(0, 500);
                lines.push(`    Body   : ${preview}${e.responseBody.length > 500 ? "..." : ""}`);
            }
            lines.push("");
        }
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(lines.join("\n")),
        ]);
    }
}
// ---------------------------------------------------------------------------
// SitemapSummaryTool — gives agents a high-level overview of everything
// discovered so far: unique URLs, methods, status codes, interesting tags.
// ---------------------------------------------------------------------------
class SitemapSummaryTool {
    async invoke(_options, _token) {
        const summary = sitemapStore_1.SitemapManager.summary();
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(summary),
        ]);
    }
}
class SitemapAnnotateTool {
    async invoke(options, _token) {
        const { url, notes, tags = [] } = options.input;
        const ok = sitemapStore_1.SitemapManager.annotate(url, notes, tags);
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(ok
                ? `Annotated sitemap entry for ${url}: notes="${notes}", tags=[${tags.join(",")}]`
                : `No sitemap entry found for URL "${url}". Make an http_request to this URL first.`),
        ]);
    }
}
// ---------------------------------------------------------------------------
// registerTools — call once from extension.ts activate()
// ---------------------------------------------------------------------------
/**
 * Register all AXIS Bot tools with VS Code and populate the local registry
 * for direct dispatch when toolInvocationToken is unavailable (webview scans).
 */
function registerTools(context) {
    const httpTool = new HttpRequestTool();
    const sitemapReadTool = new SitemapReadTool();
    const sitemapSummaryTool = new SitemapSummaryTool();
    const sitemapAnnotateTool = new SitemapAnnotateTool();
    // Populate local registry for direct dispatch
    exports.toolRegistry.set("http_request", httpTool);
    exports.toolRegistry.set("sitemap_read", sitemapReadTool);
    exports.toolRegistry.set("sitemap_summary", sitemapSummaryTool);
    exports.toolRegistry.set("sitemap_annotate", sitemapAnnotateTool);
    // Register with VS Code LM API
    context.subscriptions.push(vscode.lm.registerTool("http_request", httpTool), vscode.lm.registerTool("sitemap_read", sitemapReadTool), vscode.lm.registerTool("sitemap_summary", sitemapSummaryTool), vscode.lm.registerTool("sitemap_annotate", sitemapAnnotateTool));
}
//# sourceMappingURL=index.js.map