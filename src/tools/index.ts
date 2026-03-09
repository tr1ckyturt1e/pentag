import * as vscode from "vscode";
import * as https from "https";
import * as http from "http";
import { URL } from "url";
import { SitemapManager, SitemapQueryOptions } from "./sitemapStore";

// ---------------------------------------------------------------------------
// Tool registry — maps tool names to their implementations for direct dispatch
// when vscode.lm.invokeTool() is unavailable (webview-triggered scans).
// ---------------------------------------------------------------------------

export const toolRegistry = new Map<
  string,
  vscode.LanguageModelTool<Record<string, unknown>>
>();

// ---------------------------------------------------------------------------
// HttpRequestTool — lets agents make real HTTP/HTTPS requests and see the
// full response status, headers, and body. Auto-writes each response to the
// project sitemap for later analysis by other agents.
// ---------------------------------------------------------------------------

interface HttpRequestInput {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

class HttpRequestTool implements vscode.LanguageModelTool<HttpRequestInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<HttpRequestInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const { url, method = "GET", headers = {}, body } = options.input;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`Error: invalid URL "${url}"`),
      ]);
    }

    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;

    const rawHeaders: Record<string, string> = {};
    let statusCode = 0;
    let statusMessage = "";
    let rawResponseHeaders: Record<string, string> = {};
    let mimeType: string | undefined;

    const result = await new Promise<string>((resolve) => {
      const reqOptions: http.RequestOptions = {
        method: method.toUpperCase(),
        headers,
        timeout: 30000,
      };

      // Hoist body-accumulation state to Promise scope so both the response
      // callback and the error handler share the same variables.
      const chunks: Buffer[] = [];
      let totalBodyBytes = 0;
      let bodyTruncated = false;
      let responseSettled = false;

      // Called once after all body data is available (or after early truncation).
      const settle = () => {
        if (responseSettled) return;
        responseSettled = true;

        const bodyText = Buffer.concat(chunks).toString("utf8");
        const truncatedBody = bodyTruncated
          ? bodyText + "\n[... truncated]"
          : bodyText;

        // Detect query parameters
        const parameters: string[] = [];
        try {
          const u = new URL(url);
          u.searchParams.forEach((_v, k) => parameters.push(k));
        } catch {
          // ignore
        }

        // Auto-write to sitemap (method+URL deduplication happens inside SitemapManager)
        SitemapManager.append({
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

        resolve(
          `HTTP ${statusCode} ${statusMessage}\n` +
            `${headerLines}\n\n` +
            truncatedBody,
        );
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
        res.on("data", (c: Buffer) => {
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
      req.on("error", (err: Error) => {
        // If res.destroy() was called for early truncation, the connection error
        // is expected — finalize what we already have instead of treating it as failure.
        if (bodyTruncated && chunks.length > 0) {
          settle();
        } else if (!responseSettled) {
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

// ---------------------------------------------------------------------------
// SitemapReadTool — lets agents query the sitemap for previously seen
// requests/responses. Returns a JSON-formatted list of matching entries.
// ---------------------------------------------------------------------------

interface SitemapReadInput {
  urlPattern?: string;
  method?: string;
  statusCodeMin?: number;
  statusCodeMax?: number;
  tags?: string[];
  limit?: number;
  summaryOnly?: boolean;
}

class SitemapReadTool implements vscode.LanguageModelTool<SitemapReadInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<SitemapReadInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const opts: SitemapQueryOptions = {
      urlPattern: options.input.urlPattern,
      method: options.input.method,
      statusCodeMin: options.input.statusCodeMin,
      statusCodeMax: options.input.statusCodeMax,
      tags: options.input.tags,
      limit: options.input.limit ?? 50,
      summaryOnly: options.input.summaryOnly,
    };

    const entries = SitemapManager.query(opts);

    if (entries.length === 0) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          "No sitemap entries match the given filter. " +
            "Use http_request to explore the application first.",
        ),
      ]);
    }

    // Build a concise text representation for each entry
    const lines: string[] = [`Found ${entries.length} sitemap entries:\n`];

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
        lines.push(
          `    Body   : ${preview}${e.responseBody.length > 500 ? "..." : ""}`,
        );
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

class SitemapSummaryTool implements vscode.LanguageModelTool<
  Record<string, never>
> {
  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const summary = SitemapManager.summary();
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(summary),
    ]);
  }
}

// ---------------------------------------------------------------------------
// SitemapAnnotateTool — lets agents add notes/tags to a sitemap entry by URL
// ---------------------------------------------------------------------------

interface SitemapAnnotateInput {
  url: string;
  notes: string;
  tags?: string[];
}

class SitemapAnnotateTool implements vscode.LanguageModelTool<SitemapAnnotateInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<SitemapAnnotateInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const { url, notes, tags = [] } = options.input;
    const ok = SitemapManager.annotate(url, notes, tags);
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        ok
          ? `Annotated sitemap entry for ${url}: notes="${notes}", tags=[${tags.join(",")}]`
          : `No sitemap entry found for URL "${url}". Make an http_request to this URL first.`,
      ),
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
export function registerTools(context: vscode.ExtensionContext): void {
  const httpTool = new HttpRequestTool();
  const sitemapReadTool = new SitemapReadTool();
  const sitemapSummaryTool = new SitemapSummaryTool();
  const sitemapAnnotateTool = new SitemapAnnotateTool();

  // Populate local registry for direct dispatch
  toolRegistry.set(
    "http_request",
    httpTool as unknown as vscode.LanguageModelTool<Record<string, unknown>>,
  );
  toolRegistry.set(
    "sitemap_read",
    sitemapReadTool as unknown as vscode.LanguageModelTool<
      Record<string, unknown>
    >,
  );
  toolRegistry.set(
    "sitemap_summary",
    sitemapSummaryTool as unknown as vscode.LanguageModelTool<
      Record<string, unknown>
    >,
  );
  toolRegistry.set(
    "sitemap_annotate",
    sitemapAnnotateTool as unknown as vscode.LanguageModelTool<
      Record<string, unknown>
    >,
  );

  // Register with VS Code LM API
  context.subscriptions.push(
    vscode.lm.registerTool("http_request", httpTool),
    vscode.lm.registerTool("sitemap_read", sitemapReadTool),
    vscode.lm.registerTool("sitemap_summary", sitemapSummaryTool),
    vscode.lm.registerTool("sitemap_annotate", sitemapAnnotateTool),
  );
}
