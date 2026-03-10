import * as vscode from "vscode";
import * as https from "https";
import * as http from "http";
import { URL } from "url";
import { SitemapManager, SitemapQueryOptions } from "./sitemapStore";
import {
  getCookieHeader,
  storeCookies,
  getAuthHeaders,
  storeToken,
  autoDetectTokensFromBody,
  describeWwwAuthenticate,
  getSessionProjectPath,
  exportSession,
} from "../runtime/sessionStore";

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
  /**
   * When true, the tool follows HTTP 3xx redirects automatically (up to 10 hops).
   * Defaults to false so agents can inspect each redirect step explicitly.
   * Set to true in crawl / login flows where you want to land on the final page.
   */
  followRedirects?: boolean;
}

class HttpRequestTool implements vscode.LanguageModelTool<HttpRequestInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<HttpRequestInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const { url, method = "GET", headers = {}, body, followRedirects = false } = options.input;

    // -----------------------------------------------------------------------
    // Session cookie injection — auto-prepend cookies from the project session
    // store unless the caller has already set a Cookie header explicitly.
    // -----------------------------------------------------------------------
    const projectPath = getSessionProjectPath();
    const sessionCookies = projectPath ? getCookieHeader(projectPath, url) : "";
    const mergedHeaders: Record<string, string> = { ...headers };
    if (sessionCookies) {
      const callerCookie = mergedHeaders["Cookie"] ?? mergedHeaders["cookie"] ?? "";
      if (callerCookie) {
        // Merge: session cookies first, then caller overrides
        mergedHeaders["Cookie"] = `${sessionCookies}; ${callerCookie}`;
        delete mergedHeaders["cookie"];
      } else {
        mergedHeaders["Cookie"] = sessionCookies;
      }
    }

    // -----------------------------------------------------------------------
    // Auth header injection — Bearer tokens, API keys, custom auth headers.
    // Stored by the Login Agent via session_set_token. Expired tokens are
    // skipped automatically. Caller-supplied headers always win over stored ones.
    // -----------------------------------------------------------------------
    if (projectPath) {
      const authHeaders = getAuthHeaders(projectPath);
      for (const [name, value] of Object.entries(authHeaders)) {
        const callerHasHeader = Object.keys(mergedHeaders)
          .some(k => k.toLowerCase() === name.toLowerCase());
        if (!callerHasHeader) {
          mergedHeaders[name] = value;
        }
      }
    }

    // If followRedirects is enabled, resolve the chain before returning.
    if (followRedirects) {
      return this._invokeFollowingRedirects(url, method, mergedHeaders, body, projectPath, 10);
    }

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
        headers: mergedHeaders,
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

        // Auto-detect auth tokens from JSON response bodies (best-effort).
        // Handles OAuth2 access_token, id_token, and common custom fields.
        // The Login Agent's explicit session_set_token calls always override.
        if (projectPath) {
          autoDetectTokensFromBody(projectPath, statusCode, bodyText);
        }

        const headerLines = Object.entries(rawResponseHeaders)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");

        // On 401, surface the WWW-Authenticate scheme so agents adapt their
        // login strategy (Bearer, Basic, Digest, NTLM, etc.).
        const wwwAuth = rawResponseHeaders["www-authenticate"];
        const authHint = (statusCode === 401 && wwwAuth)
          ? `\n[AUTH-REQUIRED] ${describeWwwAuthenticate(wwwAuth)}\n`
          : "";

        resolve(
          `HTTP ${statusCode} ${statusMessage}\n` +
            `${headerLines}\n\n` +
            authHint +
            truncatedBody,
        );
      };

      const req = lib.request(url, reqOptions, (res) => {
        statusCode = res.statusCode ?? 0;
        statusMessage = res.statusMessage ?? "";

        rawResponseHeaders = {};
        // Capture Set-Cookie before flattening so we can parse them properly
        const setCookieArray = res.headers["set-cookie"] ?? [];
        for (const [k, v] of Object.entries(res.headers)) {
          rawResponseHeaders[k] = Array.isArray(v) ? v.join(", ") : (v ?? "");
        }
        mimeType = rawResponseHeaders["content-type"];

        // Store any new session cookies emitted by this response
        if (projectPath && setCookieArray.length > 0) {
          storeCookies(projectPath, url, setCookieArray);
        }

        // Accumulate response body chunks; stop early once we hit the 64 KB cap.
        // 64 KB is large enough for most login pages (including CSRF hidden fields)
        // while still bounding memory use for large API responses.
        res.on("data", (c: Buffer) => {
          if (!bodyTruncated) {
            const remaining = 65536 - totalBodyBytes;
            chunks.push(remaining < c.length ? c.slice(0, remaining) : c);
            totalBodyBytes += c.length;
            if (totalBodyBytes >= 65536) {
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

  /**
   * Make a request and follow HTTP 3xx redirects automatically up to maxHops times.
   * Cookies from each redirect response are stored in SessionStore before the next hop.
   */
  private async _invokeFollowingRedirects(
    startUrl: string,
    method: string,
    headers: Record<string, string>,
    body: string | undefined,
    projectPath: string | undefined,
    maxHops: number,
  ): Promise<vscode.LanguageModelToolResult> {
    let currentUrl = startUrl;
    let currentMethod = method;
    let hops = 0;
    const hopLog: string[] = [];

    while (hops <= maxHops) {
      // Build a synthetic input and reuse the core invoke logic (without redirect)
      const syntheticInput: HttpRequestInput = {
        url: currentUrl,
        method: currentMethod,
        headers,
        body: currentMethod === "GET" || currentMethod === "HEAD" ? undefined : body,
        followRedirects: false,
      };

      const result = await this.invoke(
        { input: syntheticInput, toolInvocationToken: undefined as never } as vscode.LanguageModelToolInvocationOptions<HttpRequestInput>,
        new vscode.CancellationTokenSource().token,
      );

      // Extract the text from the result
      const text = (result.content[0] as vscode.LanguageModelTextPart).value;
      hopLog.push(`[Hop ${hops}] ${currentMethod} ${currentUrl}\n${text.split("\n")[0]}`);

      // Check for redirect status code
      const statusMatch = text.match(/^HTTP (\d+)/);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0;

      if (statusCode >= 300 && statusCode < 400) {
        const locationMatch = text.match(/^location:\s*(.+)$/im);
        if (!locationMatch) {
          hopLog.push("[Redirect] No Location header found — stopping.");
          break;
        }
        let nextUrl = locationMatch[1].trim();
        // Resolve relative URLs
        try {
          nextUrl = new URL(nextUrl, currentUrl).toString();
        } catch {
          break;
        }

        // After a POST redirect, follow as GET (PRG pattern)
        if (currentMethod === "POST" && (statusCode === 301 || statusCode === 302 || statusCode === 303)) {
          currentMethod = "GET";
        }

        // Refresh cookie and auth headers for next hop from updated session store
        if (projectPath) {
          const freshCookies = getCookieHeader(projectPath, nextUrl);
          if (freshCookies) {
            headers = { ...headers, Cookie: freshCookies };
          }
          // Also re-inject any Bearer tokens / custom auth headers stored
          // by the Login Agent via session_set_token.
          const freshAuth = getAuthHeaders(projectPath);
          for (const [name, value] of Object.entries(freshAuth)) {
            const already = Object.keys(headers).some(
              (k) => k.toLowerCase() === name.toLowerCase(),
            );
            if (!already) {
              headers = { ...headers, [name]: value };
            }
          }
        }

        currentUrl = nextUrl;
        hops++;
        continue;
      }

      // Non-redirect response — return the final result with hop log prepended
      const finalText = `[Followed ${hops} redirect(s)]\n${hopLog.join("\n")}\n\n[Final Response]\n${text}`;
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(finalText),
      ]);
    }

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        `[Redirect loop or too many hops (${hops}). Stopping.]\n${hopLog.join("\n")}`,
      ),
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
// SessionSetTokenTool — lets the Login Agent explicitly store a non-cookie
// auth credential (Bearer token, API key, custom header) in the session store
// after parsing it from a login JSON response body or a custom response header.
//
// The stored credential is automatically injected into ALL subsequent
// http_request calls for the duration of the scan.
// ---------------------------------------------------------------------------

interface SessionSetTokenInput {
  /** HTTP header name — e.g. "Authorization" or "X-Auth-Token" */
  headerName: string;
  /** Full header value — e.g. "Bearer eyJ..." or a raw API key */
  headerValue: string;
  /** TTL in seconds from the token response (expires_in field). Optional. */
  expiresInSeconds?: number;
  /** Opaque refresh credential. Stored for reference, not injected. Optional. */
  refreshToken?: string;
  /** Human-readable scheme name for session_export display. Optional. */
  scheme?: string;
}

class SessionSetTokenTool implements vscode.LanguageModelTool<SessionSetTokenInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<SessionSetTokenInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const { headerName, headerValue, expiresInSeconds, refreshToken, scheme } = options.input;

    if (!headerName || !headerValue) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart("Error: headerName and headerValue are both required."),
      ]);
    }

    const projectPath = getSessionProjectPath();
    if (!projectPath) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          "No active project path — cannot store token. Ensure the project scan has started.",
        ),
      ]);
    }

    storeToken(projectPath, headerName, headerValue, expiresInSeconds, refreshToken, scheme);

    const expNote = expiresInSeconds != null
      ? ` (expires in ${expiresInSeconds}s)`
      : " (no expiry set)";
    const refreshNote = refreshToken ? " | refresh_token stored" : "";
    const preview = headerValue.length > 40 ? headerValue.slice(0, 37) + "..." : headerValue;

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        `Token stored successfully.\n` +
        `  Header : ${headerName}: ${preview}${expNote}${refreshNote}\n` +
        `  Scheme : ${scheme ?? "(not specified)"}\n` +
        `This header will be injected automatically into all subsequent http_request calls.\n` +
        `Use session_export to verify the full credential set.`,
      ),
    ]);
  }
}

// ---------------------------------------------------------------------------
// SessionExportTool — lets agents inspect ALL active session credentials
// (cookies + tokens) to confirm login succeeded and understand what auth
// material is available for the current scan.
// ---------------------------------------------------------------------------

class SessionExportTool implements vscode.LanguageModelTool<Record<string, never>> {
  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const projectPath = getSessionProjectPath();
    if (!projectPath) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          "No active project path — session store is not initialised yet.",
        ),
      ]);
    }
    const summary = exportSession(projectPath);
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(summary),
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
  const sessionExportTool = new SessionExportTool();
  const sessionSetTokenTool = new SessionSetTokenTool();

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
  toolRegistry.set(
    "session_export",
    sessionExportTool as unknown as vscode.LanguageModelTool<
      Record<string, unknown>
    >,
  );
  toolRegistry.set(
    "session_set_token",
    sessionSetTokenTool as unknown as vscode.LanguageModelTool<
      Record<string, unknown>
    >,
  );

  // Register with VS Code LM API
  context.subscriptions.push(
    vscode.lm.registerTool("http_request", httpTool),
    vscode.lm.registerTool("sitemap_read", sitemapReadTool),
    vscode.lm.registerTool("sitemap_summary", sitemapSummaryTool),
    vscode.lm.registerTool("sitemap_annotate", sitemapAnnotateTool),
    vscode.lm.registerTool("session_export", sessionExportTool),
    vscode.lm.registerTool("session_set_token", sessionSetTokenTool),
  );
}
