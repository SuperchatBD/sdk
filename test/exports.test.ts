import { describe, expect, test } from "bun:test";
import * as sdk from "../src/index";

/**
 * The public runtime surface of the package. Every entry here is documented on
 * the Superchat docs page, and anything not listed must not be exported — this
 * test fails loudly if the API (and therefore the documentation) drifts.
 */
const RUNTIME_EXPORTS = [
  "API_KEY_ENV_VAR",
  "BASE_URL_ENV_VAR",
  "DEFAULT_API_BASE_URL",
  "DEFAULT_MAX_RETRIES",
  "DEFAULT_SIGNATURE_TOLERANCE_SECONDS",
  "DEFAULT_TIMEOUT_MS",
  "SDK_VERSION",
  "Superchat",
  "SuperchatAPIError",
  "SuperchatConfigError",
  "SuperchatConnectionError",
  "SuperchatError",
  "SuperchatSignatureError",
  "computeSignature",
  "constructWebhookEvent",
  "verifyWebhookSignature",
];

describe("public exports", () => {
  test("exposes exactly the documented runtime surface", () => {
    expect(Object.keys(sdk).sort()).toEqual([...RUNTIME_EXPORTS].sort());
  });

  test("exposes Superchat as a class with the documented resources", () => {
    const instance = new sdk.Superchat({
      apiKey: "sk_test_1",
      fetch: (() => Promise.resolve(new Response("{}"))) as unknown as typeof fetch,
    });

    expect(typeof sdk.Superchat).toBe("function");
    expect(instance.environment).toBe("test");
    expect(instance.payments).toBeDefined();
    expect(instance.account).toBeDefined();
    expect(instance.webhooks).toBeDefined();
    expect(instance.checkout).toBeDefined();
  });

  test("keeps the default API origin and retry defaults configurable", () => {
    expect(sdk.DEFAULT_API_BASE_URL).toBe("https://api.superchatbd.com");
    expect(sdk.API_KEY_ENV_VAR).toBe("SUPERCHAT_API_KEY");
    expect(sdk.BASE_URL_ENV_VAR).toBe("SUPERCHAT_BASE_URL");
    expect(sdk.DEFAULT_MAX_RETRIES).toBe(2);
    expect(sdk.DEFAULT_TIMEOUT_MS).toBe(30_000);
    expect(sdk.DEFAULT_SIGNATURE_TOLERANCE_SECONDS).toBe(300);
  });

  test("keeps the error hierarchy catchable through SuperchatError", () => {
    expect(new sdk.SuperchatConfigError("x")).toBeInstanceOf(sdk.SuperchatError);
    expect(new sdk.SuperchatAPIError({ statusCode: 400 })).toBeInstanceOf(sdk.SuperchatError);
    expect(new sdk.SuperchatConnectionError("x", { code: "timeout" })).toBeInstanceOf(sdk.SuperchatError);
    expect(new sdk.SuperchatSignatureError("x", "malformed_header")).toBeInstanceOf(sdk.SuperchatError);
  });
});
