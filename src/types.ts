/** `live` for `sk_live_…` keys, `test` for `sk_test_…` keys. */
export type Environment = "live" | "test";

/** Offset-based pagination parameters, shared by every list endpoint. */
export interface PaginationParams {
  /** 1-based page number. Defaults to `1` on the server. */
  page?: number;
  /** Items per page. Defaults to `20` on the server. */
  limit?: number;
}

/** Offset-based pagination envelope returned by list endpoints. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Per-call overrides accepted by every resource method that supports them. */
export interface RequestOptions {
  /**
   * Value sent as the `Idempotency-Key` header. Responses are cached server-side
   * for 24 hours per developer and replay with `Idempotent-Replayed: true`.
   * Sending a key also makes the request eligible for automatic retries.
   */
  idempotencyKey?: string;
  /** Overrides the client-level timeout for this call, in milliseconds. */
  timeoutMs?: number;
  /** Overrides the client-level retry budget for this call. */
  maxRetries?: number;
}

/** Constructor options for {@link Superchat}. */
export interface SuperchatOptions {
  /** Secret API key (`sk_live_…` or `sk_test_…`). Falls back to `SUPERCHAT_API_KEY`. */
  apiKey?: string;
  /** API origin. Falls back to `SUPERCHAT_BASE_URL`, then the built-in default. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Defaults to `30000`. */
  timeoutMs?: number;
  /** Retry budget for retryable requests. Defaults to `2`; `0` disables retries. */
  maxRetries?: number;
  /**
   * Asserts the key's environment. Throws at construction if it contradicts the
   * `sk_live_` / `sk_test_` prefix of `apiKey`.
   */
  environment?: Environment;
  /** `fetch` implementation to use. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/** Shape of the error body returned by the Superchat API. */
export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  [key: string]: unknown;
}
