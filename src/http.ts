import { SuperchatAPIError, SuperchatConnectionError, SuperchatError } from "./errors";
import { SDK_VERSION } from "./version";

/** `User-Agent` sent with every request. */
export const USER_AGENT = `Superchat-Node-SDK/${SDK_VERSION}`;

const RETRY_BASE_DELAY_MS = 200;
const RETRY_MAX_DELAY_MS = 4_000;

/** Everything the request pipeline needs, resolved once per client. */
export interface ClientContext {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly fetch: typeof fetch;
}

export type HttpMethod = "GET" | "POST" | "DELETE";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestParams {
  method: HttpMethod;
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  idempotencyKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export async function request<T>(context: ClientContext, params: RequestParams): Promise<T> {
  const url = buildUrl(context.baseUrl, params.path, params.query);
  const headers = buildHeaders(context, params);
  const body = params.body === undefined ? undefined : JSON.stringify(params.body);

  // GET requests never mutate state, and POSTs carrying an idempotency key are
  // safe to replay because the API caches the first response for 24 hours.
  const retryable = params.method === "GET" || Boolean(params.idempotencyKey);
  const maxRetries = Math.max(0, params.maxRetries ?? context.maxRetries);
  const timeoutMs = params.timeoutMs ?? context.timeoutMs;

  let attempt = 0;

  for (;;) {
    attempt += 1;

    try {
      const response = await context.fetch(url, {
        method: params.method,
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok) {
        return await decodeResponse<T>(response);
      }

      const errorBody = await readBodySafely(response);

      if (retryable && attempt <= maxRetries && isRetryableStatus(response.status)) {
        await sleep(retryDelayMs(attempt, parseRetryAfter(response.headers.get("retry-after"))));
        continue;
      }

      throw new SuperchatAPIError({
        statusCode: response.status,
        body: errorBody,
        requestId: response.headers.get("x-request-id") ?? undefined,
      });
    } catch (error) {
      // API errors and response-decoding errors are terminal: only transport
      // failures are retried and wrapped as connection errors.
      if (error instanceof SuperchatError && !(error instanceof SuperchatConnectionError)) throw error;

      const connectionError = toConnectionError(error, timeoutMs);

      if (retryable && attempt <= maxRetries && connectionError.code !== "aborted") {
        await sleep(retryDelayMs(attempt));
        continue;
      }

      throw connectionError;
    }
  }
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function buildHeaders(context: ClientContext, params: RequestParams): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${context.apiKey}`,
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };

  if (params.body !== undefined) headers["Content-Type"] = "application/json";
  if (params.idempotencyKey) headers["Idempotency-Key"] = params.idempotencyKey;

  return headers;
}

async function decodeResponse<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 205) return undefined as T;

  const text = await response.text();
  if (text.length === 0) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new SuperchatError(
      `Expected a JSON response from ${response.url || "the Superchat API"} but received a non-JSON body.`,
      { code: "invalid_response" },
    );
  }
}

async function readBodySafely(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (text.length === 0) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;

  const seconds = Number(header.trim());
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);

  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());

  return undefined;
}

function retryDelayMs(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined) return Math.min(retryAfterMs, RETRY_MAX_DELAY_MS);

  const exponential = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 50);

  return Math.min(exponential, RETRY_MAX_DELAY_MS) + jitter;
}

function errorName(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("name" in error)) return undefined;
  return String((error as { name: unknown }).name);
}

function toConnectionError(error: unknown, timeoutMs: number): SuperchatConnectionError {
  if (error instanceof SuperchatConnectionError) return error;

  const name = errorName(error);
  if (name === "TimeoutError") {
    return new SuperchatConnectionError(`Request timed out after ${timeoutMs}ms`, { code: "timeout" });
  }
  if (name === "AbortError") {
    return new SuperchatConnectionError("Request was aborted before it completed", { code: "aborted" });
  }

  const message = error instanceof Error ? error.message : String(error);
  return new SuperchatConnectionError(`Network request to the Superchat API failed: ${message}`, {
    code: "network_error",
    cause: error,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
