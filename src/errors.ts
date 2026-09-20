/** Machine-readable reason attached to every error thrown by the SDK. */
export type SuperchatErrorCode =
  | "invalid_config"
  | "api_error"
  | "invalid_response"
  | "network_error"
  | "timeout"
  | "aborted"
  | "invalid_payload"
  | "missing_secret"
  | "malformed_header"
  | "timestamp_outside_tolerance"
  | "signature_mismatch";

export interface SuperchatErrorOptions {
  code?: SuperchatErrorCode;
  cause?: unknown;
}

/**
 * Base class of every error the SDK throws. Catch this to handle all SDK
 * failures, or one of its subclasses for finer-grained handling.
 */
export class SuperchatError extends Error {
  readonly code?: SuperchatErrorCode;

  constructor(message: string, options: SuperchatErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "SuperchatError";
    if (options.code !== undefined) this.code = options.code;
  }
}

/** Thrown when the client is constructed with invalid or missing options. */
export class SuperchatConfigError extends SuperchatError {
  constructor(message: string, options: Omit<SuperchatErrorOptions, "code"> = {}) {
    super(message, { ...options, code: "invalid_config" });
    this.name = "SuperchatConfigError";
  }
}

export interface SuperchatAPIErrorInit {
  statusCode: number;
  body?: unknown;
  requestId?: string;
  message?: string;
}

/**
 * Thrown for any non-2xx response. `statusCode` mirrors the HTTP status and
 * `body` contains the parsed error response.
 */
export class SuperchatAPIError extends SuperchatError {
  readonly statusCode: number;
  readonly body?: unknown;
  readonly requestId?: string;

  constructor(init: SuperchatAPIErrorInit) {
    super(init.message ?? describeApiError(init.statusCode, init.body), { code: "api_error" });
    this.name = "SuperchatAPIError";
    this.statusCode = init.statusCode;
    if (init.body !== undefined) this.body = init.body;
    if (init.requestId !== undefined) this.requestId = init.requestId;
  }
}

/** Thrown when a request never reaches the API (network failure, timeout, abort). */
export class SuperchatConnectionError extends SuperchatError {
  constructor(
    message: string,
    options: { code: "network_error" | "timeout" | "aborted"; cause?: unknown },
  ) {
    super(message, options);
    this.name = "SuperchatConnectionError";
  }
}

export type SignatureErrorCode =
  | "missing_secret"
  | "malformed_header"
  | "timestamp_outside_tolerance"
  | "signature_mismatch";

/** Thrown when a webhook signature cannot be verified. */
export class SuperchatSignatureError extends SuperchatError {
  constructor(message: string, code: SignatureErrorCode) {
    super(message, { code });
    this.name = "SuperchatSignatureError";
  }
}

/**
 * Builds a human-readable message from a Superchat API error body. NestJS
 * returns `{ statusCode, message, error }`, where `message` is either a string
 * or an array of validation messages.
 */
export function describeApiError(statusCode: number, body: unknown): string {
  return extractApiMessage(body) ?? `Superchat API request failed with status ${statusCode}`;
}

function extractApiMessage(body: unknown): string | undefined {
  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof body !== "object" || body === null) return undefined;

  const { message, error } = body as { message?: unknown; error?: unknown };

  if (Array.isArray(message)) {
    const parts = message.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
    if (parts.length > 0) return parts.join("; ");
  } else if (typeof message === "string" && message.trim().length > 0) {
    return message.trim();
  }

  if (typeof error === "string" && error.trim().length > 0) return error.trim();

  return undefined;
}
