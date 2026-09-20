import {
  API_KEY_ENV_VAR,
  BASE_URL_ENV_VAR,
  DEFAULT_API_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  LIVE_KEY_PREFIX,
  TEST_KEY_PREFIX,
} from "./constants";
import { SuperchatConfigError } from "./errors";
import type { Environment, SuperchatOptions } from "./types";

export interface ResolvedConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly environment: Environment | undefined;
  readonly fetch: typeof fetch;
}

/**
 * Reads an environment variable without assuming a Node.js `process` global, so
 * the SDK also loads in Bun, Deno and bundler-based runtimes.
 */
export function readEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = env?.[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Derives the environment from an API key prefix, or `undefined` if unknown. */
export function detectEnvironment(apiKey: string): Environment | undefined {
  if (apiKey.startsWith(LIVE_KEY_PREFIX)) return "live";
  if (apiKey.startsWith(TEST_KEY_PREFIX)) return "test";
  return undefined;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new SuperchatConfigError(
      `Invalid \`baseUrl\`: "${value}" is not a valid absolute URL (for example "https://api.superchatbd.com").`,
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new SuperchatConfigError(
      `Invalid \`baseUrl\`: expected an http(s) URL but received "${parsed.protocol}".`,
    );
  }

  return trimmed;
}

/** Validates and normalises the client options, applying environment fallbacks. */
export function resolveConfig(options: SuperchatOptions = {}): ResolvedConfig {
  const apiKey = options.apiKey?.trim() || readEnv(API_KEY_ENV_VAR);
  if (!apiKey) {
    throw new SuperchatConfigError(
      `Missing API key. Pass \`apiKey\` to the Superchat constructor or set the ${API_KEY_ENV_VAR} environment variable.`,
    );
  }

  const baseUrl = normalizeBaseUrl(options.baseUrl ?? readEnv(BASE_URL_ENV_VAR) ?? DEFAULT_API_BASE_URL);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new SuperchatConfigError("`timeoutMs` must be a positive number of milliseconds.");
  }

  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new SuperchatConfigError("`maxRetries` must be a non-negative integer.");
  }

  const detectedEnvironment = detectEnvironment(apiKey);
  if (options.environment && detectedEnvironment && options.environment !== detectedEnvironment) {
    throw new SuperchatConfigError(
      `Configured environment "${options.environment}" does not match the "${detectedEnvironment}" environment of the provided API key.`,
    );
  }

  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new SuperchatConfigError(
      "No global `fetch` implementation is available. Use Node.js 18+ or pass a `fetch` implementation explicitly.",
    );
  }

  return {
    apiKey,
    baseUrl,
    timeoutMs,
    maxRetries,
    environment: options.environment ?? detectedEnvironment,
    fetch: fetchImpl,
  };
}
