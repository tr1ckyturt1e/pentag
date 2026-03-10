import { URL } from "url";

// ---------------------------------------------------------------------------
// SessionStore — per-project auth credential store
//
// Handles ALL auth material an application may use:
//
//   1. HTTP Cookies        — captured from Set-Cookie headers automatically;
//                            injected via Cookie header (RFC 6265 compliant).
//
//   2. Bearer Tokens       — captured explicitly by the Login Agent from a
//                            JSON response body ({"access_token": "..."}).
//                            Injected as  Authorization: Bearer <token>.
//
//   3. Custom Auth Headers — any other header carrying auth material:
//                            X-Auth-Token, X-API-Key, X-Session-Token, etc.
//                            Stored by the Login Agent via session_set_token.
//
//   4. Combinations        — all of the above co-exist; every http_request
//                            gets cookies + all stored token headers injected
//                            transparently. Caller-supplied headers always win.
//
//   5. Token Refresh       — refresh tokens are stored alongside access tokens
//                            and surfaced in session_export so the Login Agent
//                            can re-issue a refresh grant when the access token
//                            expires.
//
// All stores are keyed by absolute project path. One SessionStore per project.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredCookie {
  name: string;
  value: string;
  /** Domain without leading dot (e.g. "example.com") */
  domain: string;
  /** Cookie Path attribute (e.g. "/") */
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expires?: Date;
  sameSite?: string;
}

/**
 * A non-cookie auth credential injected as an HTTP request header.
 *
 * Examples:
 *   headerName="Authorization"  headerValue="Bearer eyJhbGciO..."
 *   headerName="X-Auth-Token"   headerValue="abc123"
 *   headerName="X-API-Key"      headerValue="key-abc"
 */
export interface StoredToken {
  /** HTTP header name to inject (case-insensitive storage, canonical capitalisation preserved) */
  headerName: string;
  /** Full header value — e.g. "Bearer <jwt>", raw token, or API key */
  headerValue: string;
  /** When this token expires; undefined = no known expiry */
  expires?: Date;
  /**
   * Opaque refresh credential. Not injected automatically.
   * Stored so the Login Agent can inspect it via session_export and
   * perform a refresh-grant POST when the access token expires.
   */
  refreshToken?: string;
  /** Human-readable note: how was this token obtained / what auth scheme */
  scheme?: string;
}

// ---------------------------------------------------------------------------
// In-memory stores — keyed by project path
// ---------------------------------------------------------------------------

/** RFC 6265 cookie jar per project */
const _jarByProject = new Map<string, StoredCookie[]>();

/**
 * Non-cookie auth tokens per project.
 * Key: lowercase header name (e.g. "authorization", "x-auth-token")
 * Value: StoredToken
 */
const _tokensByProject = new Map<string, Map<string, StoredToken>>();

/** Current project path — set once per scan by the panel that opens the project */
let _currentProjectPath: string | undefined;

// ---------------------------------------------------------------------------
// Project path binding
// ---------------------------------------------------------------------------

export function setSessionProjectPath(p: string): void {
  _currentProjectPath = p;
}

export function getSessionProjectPath(): string | undefined {
  return _currentProjectPath;
}

// ---------------------------------------------------------------------------
// Cookie parsing (RFC 6265)
// ---------------------------------------------------------------------------

function parseCookieHeader(raw: string, requestUrl: string): StoredCookie | null {
  const parts = raw.split(";");
  if (!parts.length) return null;

  const namePart = parts[0].trim();
  const eqIdx = namePart.indexOf("=");
  if (eqIdx < 0) return null;

  const name = namePart.slice(0, eqIdx).trim();
  const value = namePart.slice(eqIdx + 1).trim();
  if (!name) return null;

  let parsed: URL;
  try {
    parsed = new URL(requestUrl);
  } catch {
    return null;
  }

  let domain = parsed.hostname;
  let path = "/";
  let secure = false;
  let httpOnly = false;
  let expires: Date | undefined;
  let sameSite: string | undefined;

  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i].trim();
    const lower = seg.toLowerCase();

    if (lower.startsWith("domain=")) {
      domain = seg.slice("domain=".length).trim().replace(/^\./, "");
    } else if (lower.startsWith("path=")) {
      path = seg.slice("path=".length).trim() || "/";
    } else if (lower === "secure") {
      secure = true;
    } else if (lower === "httponly") {
      httpOnly = true;
    } else if (lower.startsWith("max-age=")) {
      const maxAge = parseInt(seg.slice("max-age=".length).trim(), 10);
      if (!isNaN(maxAge)) {
        expires = new Date(Date.now() + maxAge * 1000);
      }
    } else if (lower.startsWith("expires=")) {
      const d = new Date(seg.slice("expires=".length).trim());
      if (!isNaN(d.getTime()) && !expires) {
        expires = d;
      }
    } else if (lower.startsWith("samesite=")) {
      sameSite = seg.slice("samesite=".length).trim();
    }
  }

  return { name, value, domain, path, secure, httpOnly, expires, sameSite };
}

// ---------------------------------------------------------------------------
// Cookie API — called automatically by HttpRequestTool
// ---------------------------------------------------------------------------

export function storeCookies(
  projectPath: string,
  requestUrl: string,
  setCookies: string[],
): void {
  if (!_jarByProject.has(projectPath)) {
    _jarByProject.set(projectPath, []);
  }
  const jar = _jarByProject.get(projectPath)!;

  for (const raw of setCookies) {
    const cookie = parseCookieHeader(raw, requestUrl);
    if (!cookie) continue;

    const idx = jar.findIndex(
      (c) => c.name === cookie.name && c.domain === cookie.domain && c.path === cookie.path,
    );

    if (idx >= 0) {
      if (cookie.expires && cookie.expires <= new Date()) {
        jar.splice(idx, 1);
      } else {
        jar[idx] = cookie;
      }
    } else if (!cookie.expires || cookie.expires > new Date()) {
      jar.push(cookie);
    }
  }
}

export function getCookieHeader(projectPath: string, requestUrl: string): string {
  const jar = _jarByProject.get(projectPath);
  if (!jar || jar.length === 0) return "";

  let parsed: URL;
  try {
    parsed = new URL(requestUrl);
  } catch {
    return "";
  }

  const now = new Date();
  const isSecure = parsed.protocol === "https:";
  const hostname = parsed.hostname.toLowerCase();
  const urlPath = parsed.pathname;

  const matching = jar.filter((c) => {
    if (c.expires && c.expires < now) return false;
    if (c.secure && !isSecure) return false;
    const dom = c.domain.toLowerCase();
    if (hostname !== dom && !hostname.endsWith("." + dom)) return false;
    if (!urlPath.startsWith(c.path)) return false;
    return true;
  });

  if (matching.length === 0) return "";
  return matching.map((c) => `${c.name}=${c.value}`).join("; ");
}

// ---------------------------------------------------------------------------
// Token API — used by Login Agent via session_set_token tool
// ---------------------------------------------------------------------------

/**
 * Store a non-cookie auth token. Called explicitly by the Login Agent after
 * parsing a JSON response body that contains an access_token, or after
 * identifying a custom header auth scheme.
 *
 * @param projectPath     Absolute path to the project directory
 * @param headerName      HTTP header to inject (e.g. "Authorization", "X-Auth-Token")
 * @param headerValue     Full header value (e.g. "Bearer eyJ...", raw token)
 * @param expiresInSeconds  Optional TTL in seconds (from expires_in field)
 * @param refreshToken    Optional refresh token string
 * @param scheme          Optional human-readable scheme description
 */
export function storeToken(
  projectPath: string,
  headerName: string,
  headerValue: string,
  expiresInSeconds?: number,
  refreshToken?: string,
  scheme?: string,
): void {
  if (!_tokensByProject.has(projectPath)) {
    _tokensByProject.set(projectPath, new Map());
  }
  const tokenMap = _tokensByProject.get(projectPath)!;
  const key = headerName.toLowerCase();

  const expires = expiresInSeconds != null
    ? new Date(Date.now() + expiresInSeconds * 1000)
    : undefined;

  tokenMap.set(key, { headerName, headerValue, expires, refreshToken, scheme });
}

/**
 * Return all active (non-expired) stored tokens as a header key-value map
 * ready for injection into an outgoing request.
 *
 * @param projectPath  Absolute path to the project directory
 */
export function getAuthHeaders(projectPath: string): Record<string, string> {
  const tokenMap = _tokensByProject.get(projectPath);
  if (!tokenMap) return {};

  const now = new Date();
  const result: Record<string, string> = {};

  for (const token of tokenMap.values()) {
    if (token.expires && token.expires < now) continue; // skip expired
    result[token.headerName] = token.headerValue;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Auto-detect tokens from JSON response bodies
//
// Called by HttpRequestTool after receiving a response to a POST /login,
// /token, /auth, /oauth/token, /api/login endpoint. Looks for well-known
// OAuth2 / custom JSON token field names and auto-stores them as Bearer or
// custom header tokens WITHOUT requiring explicit agent tool calls.
//
// This is a best-effort heuristic. The Login Agent's explicit session_set_token
// call always takes precedence (it runs last and overwrites these values).
// ---------------------------------------------------------------------------

const _TOKEN_FIELD_PRIORITY: Array<{ field: string; header: string; scheme: string; prefix: string }> = [
  // OAuth 2.0 / OIDC standard fields
  { field: "access_token",  header: "Authorization",  scheme: "OAuth2 Bearer",       prefix: "Bearer " },
  { field: "id_token",      header: "Authorization",  scheme: "OIDC ID Token",        prefix: "Bearer " },
  { field: "token",         header: "Authorization",  scheme: "Bearer (generic)",     prefix: "Bearer " },
  { field: "jwt",           header: "Authorization",  scheme: "JWT Bearer",           prefix: "Bearer " },
  { field: "auth_token",    header: "Authorization",  scheme: "Auth Token",           prefix: "Bearer " },
  { field: "authToken",     header: "Authorization",  scheme: "Auth Token (camel)",   prefix: "Bearer " },
  // Custom header patterns — stored without a prefix
  { field: "api_key",       header: "X-API-Key",      scheme: "API Key",              prefix: "" },
  { field: "apiKey",        header: "X-API-Key",      scheme: "API Key (camel)",      prefix: "" },
  { field: "session_token", header: "X-Session-Token",scheme: "Session Token",        prefix: "" },
  { field: "sessionToken",  header: "X-Session-Token",scheme: "Session Token (camel)",prefix: "" },
  { field: "x_auth_token",  header: "X-Auth-Token",   scheme: "X-Auth-Token",         prefix: "" },
];

/**
 * Try to extract auth tokens from a JSON response body and auto-store them.
 * Only runs for successful (2xx) responses to avoid storing error tokens.
 *
 * @param projectPath   Project directory path
 * @param statusCode    HTTP status code of the response
 * @param responseBody  Raw response body text
 */
export function autoDetectTokensFromBody(
  projectPath: string,
  statusCode: number,
  responseBody: string,
): void {
  if (statusCode < 200 || statusCode >= 300) return;
  if (!responseBody.trimStart().startsWith("{")) return; // must look like JSON

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(responseBody) as Record<string, unknown>;
  } catch {
    return;
  }

  let expiresInSeconds: number | undefined;
  if (typeof json["expires_in"] === "number") {
    expiresInSeconds = json["expires_in"] as number;
  }

  const refreshToken = typeof json["refresh_token"] === "string"
    ? (json["refresh_token"] as string)
    : undefined;

  const stored = new Set<string>(); // track which headers we already wrote

  for (const rule of _TOKEN_FIELD_PRIORITY) {
    const rawValue = json[rule.field];
    if (typeof rawValue !== "string" || !rawValue) continue;
    const headerKey = rule.header.toLowerCase();
    if (stored.has(headerKey)) continue; // first match per header wins

    const headerValue = rule.prefix + rawValue;
    storeToken(
      projectPath,
      rule.header,
      headerValue,
      expiresInSeconds,
      // Only attach refresh to the primary access_token entry
      rule.field === "access_token" ? refreshToken : undefined,
      rule.scheme,
    );
    stored.add(headerKey);
  }
}

// ---------------------------------------------------------------------------
// WWW-Authenticate parsing — surfaces auth scheme requirements to agents
// ---------------------------------------------------------------------------

/**
 * Parse a WWW-Authenticate header and return a human-readable one-liner
 * describing what the server expects, so agents can adapt their login strategy.
 */
export function describeWwwAuthenticate(headerValue: string): string {
  if (!headerValue) return "";
  const lower = headerValue.toLowerCase();
  if (lower.startsWith("bearer")) {
    const realmMatch = headerValue.match(/realm="([^"]+)"/i);
    const realm = realmMatch ? ` realm="${realmMatch[1]}"` : "";
    return `Server requires Bearer token auth${realm}. Login agent must obtain a token via POST to the token endpoint and call session_set_token.`;
  }
  if (lower.startsWith("basic")) {
    return `Server requires HTTP Basic auth. Use Base64-encoded credentials in Authorization header.`;
  }
  if (lower.startsWith("digest")) {
    return `Server requires HTTP Digest auth — challenge-response protocol.`;
  }
  if (lower.startsWith("ntlm") || lower.startsWith("negotiate")) {
    return `Server requires Windows/Kerberos auth (NTLM/Negotiate). Typically enterprise SSO.`;
  }
  return `Server requires auth scheme: ${headerValue}`;
}

// ---------------------------------------------------------------------------
// Export / introspection — session_export tool
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable summary of ALL active session credentials:
 * cookies + tokens + refresh hints.
 */
export function exportSession(projectPath: string): string {
  const lines: string[] = [];
  const now = new Date();

  // ── Cookies ──────────────────────────────────────────────────────────────
  const jar = _jarByProject.get(projectPath) ?? [];
  const activeCookies = jar.filter((c) => !c.expires || c.expires > now);

  lines.push("┌─ SESSION CREDENTIAL SUMMARY ─────────────────────────────────┐");

  if (activeCookies.length === 0) {
    lines.push("│ COOKIES      : none");
  } else {
    lines.push(`│ COOKIES (${activeCookies.length})`);
    for (const c of activeCookies) {
      const preview = c.value.length > 50 ? c.value.slice(0, 47) + "..." : c.value;
      const flags = [
        c.secure ? "Secure" : null,
        c.httpOnly ? "HttpOnly" : null,
        c.sameSite ? `SameSite=${c.sameSite}` : null,
        c.expires ? `Exp=${c.expires.toISOString()}` : "Session",
      ].filter(Boolean).join(", ");
      lines.push(`│   ${c.name}=${preview}`);
      lines.push(`│     domain=${c.domain}  path=${c.path}  [${flags}]`);
    }
  }

  // ── Tokens / custom headers ───────────────────────────────────────────────
  const tokenMap = _tokensByProject.get(projectPath);
  const activeTokens = tokenMap
    ? [...tokenMap.values()].filter((t) => !t.expires || t.expires > now)
    : [];

  lines.push("├──────────────────────────────────────────────────────────────┤");

  if (activeTokens.length === 0) {
    lines.push("│ AUTH HEADERS : none (cookie-only session or login not yet run)");
  } else {
    lines.push(`│ AUTH HEADERS (${activeTokens.length})`);
    for (const t of activeTokens) {
      const preview = t.headerValue.length > 50
        ? t.headerValue.slice(0, 47) + "..."
        : t.headerValue;
      const expiry = t.expires ? `expires ${t.expires.toISOString()}` : "no expiry";
      lines.push(`│   ${t.headerName}: ${preview}`);
      lines.push(`│     scheme=${t.scheme ?? "unknown"}  [${expiry}]`);
      if (t.refreshToken) {
        const rpreview = t.refreshToken.length > 30
          ? t.refreshToken.slice(0, 27) + "..."
          : t.refreshToken;
        lines.push(`│     refresh_token=${rpreview}  ← use to refresh access token`);
      }
    }
  }

  // ── Expired tokens (advisory) ─────────────────────────────────────────────
  const expiredTokens = tokenMap
    ? [...tokenMap.values()].filter((t) => t.expires && t.expires <= now)
    : [];
  if (expiredTokens.length > 0) {
    lines.push("├──────────────────────────────────────────────────────────────┤");
    lines.push(`│ EXPIRED AUTH HEADERS (${expiredTokens.length}) — re-login or refresh required`);
    for (const t of expiredTokens) {
      lines.push(`│   ${t.headerName} [expired ${t.expires!.toISOString()}]`);
      if (t.refreshToken) {
        lines.push(`│     refresh_token available — call session_set_token after refresh`);
      }
    }
  }

  lines.push("└──────────────────────────────────────────────────────────────┘");

  if (activeCookies.length === 0 && activeTokens.length === 0) {
    lines.push("");
    lines.push("⚠ No active credentials. Login agent may not have run, or login failed.");
  }

  return lines.join("\n");
}

/**
 * Returns true if at least one non-expired credential (cookie or token) exists.
 */
export function hasActiveSession(projectPath: string): boolean {
  const now = new Date();
  const jar = _jarByProject.get(projectPath) ?? [];
  if (jar.some((c) => !c.expires || c.expires > now)) return true;
  const tokenMap = _tokensByProject.get(projectPath);
  if (!tokenMap) return false;
  return [...tokenMap.values()].some((t) => !t.expires || t.expires > now);
}

/**
 * Clear ALL credentials (cookies + tokens) for the project.
 * Called at scan start so each scan begins from an unauthenticated state.
 */
export function clearSession(projectPath: string): void {
  _jarByProject.delete(projectPath);
  _tokensByProject.delete(projectPath);
}

