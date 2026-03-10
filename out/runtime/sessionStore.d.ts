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
export declare function setSessionProjectPath(p: string): void;
export declare function getSessionProjectPath(): string | undefined;
export declare function storeCookies(projectPath: string, requestUrl: string, setCookies: string[]): void;
export declare function getCookieHeader(projectPath: string, requestUrl: string): string;
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
export declare function storeToken(projectPath: string, headerName: string, headerValue: string, expiresInSeconds?: number, refreshToken?: string, scheme?: string): void;
/**
 * Return all active (non-expired) stored tokens as a header key-value map
 * ready for injection into an outgoing request.
 *
 * @param projectPath  Absolute path to the project directory
 */
export declare function getAuthHeaders(projectPath: string): Record<string, string>;
/**
 * Try to extract auth tokens from a JSON response body and auto-store them.
 * Only runs for successful (2xx) responses to avoid storing error tokens.
 *
 * @param projectPath   Project directory path
 * @param statusCode    HTTP status code of the response
 * @param responseBody  Raw response body text
 */
export declare function autoDetectTokensFromBody(projectPath: string, statusCode: number, responseBody: string): void;
/**
 * Parse a WWW-Authenticate header and return a human-readable one-liner
 * describing what the server expects, so agents can adapt their login strategy.
 */
export declare function describeWwwAuthenticate(headerValue: string): string;
/**
 * Returns a human-readable summary of ALL active session credentials:
 * cookies + tokens + refresh hints.
 */
export declare function exportSession(projectPath: string): string;
/**
 * Returns true if at least one non-expired credential (cookie or token) exists.
 */
export declare function hasActiveSession(projectPath: string): boolean;
/**
 * Clear ALL credentials (cookies + tokens) for the project.
 * Called at scan start so each scan begins from an unauthenticated state.
 */
export declare function clearSession(projectPath: string): void;
//# sourceMappingURL=sessionStore.d.ts.map