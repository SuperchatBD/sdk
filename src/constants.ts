/**
 * Default API origin used when neither `baseUrl` nor the `SUPERCHAT_BASE_URL`
 * environment variable is provided. Exported so applications can compare
 * against, or override, the built-in default.
 */
export const DEFAULT_API_BASE_URL = "https://api.superchatbd.com";

/** Default per-request timeout, in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Default number of retries for retryable requests (in addition to the first attempt). */
export const DEFAULT_MAX_RETRIES = 2;

/** Default webhook replay tolerance, in seconds. `0` disables the timestamp age check. */
export const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300;

/** Environment variable read when no `apiKey` option is provided. */
export const API_KEY_ENV_VAR = "SUPERCHAT_API_KEY";

/** Environment variable read when no `baseUrl` option is provided. */
export const BASE_URL_ENV_VAR = "SUPERCHAT_BASE_URL";

/** Prefix of live developer API keys. */
export const LIVE_KEY_PREFIX = "sk_live_";

/** Prefix of test (sandbox) developer API keys. */
export const TEST_KEY_PREFIX = "sk_test_";
