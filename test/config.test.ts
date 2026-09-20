import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Superchat } from "../src/client";
import { SuperchatConfigError } from "../src/errors";
import { createTestClient } from "./fixtures";

const ENV_KEYS = ["SUPERCHAT_API_KEY", "SUPERCHAT_BASE_URL"] as const;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Superchat constructor", () => {
  test("requires an API key", () => {
    expect(() => new Superchat({})).toThrow(SuperchatConfigError);
    expect(() => new Superchat({})).toThrow(/Missing API key/);
  });

  test("reads the API key and base URL from the environment", () => {
    process.env.SUPERCHAT_API_KEY = "sk_live_from_env";
    process.env.SUPERCHAT_BASE_URL = "https://env.example.test";

    const client = new Superchat();

    expect(client.baseUrl).toBe("https://env.example.test");
    expect(client.environment).toBe("live");
  });

  test("prefers explicit options over the environment", () => {
    process.env.SUPERCHAT_API_KEY = "sk_test_from_env";
    process.env.SUPERCHAT_BASE_URL = "https://env.example.test";

    const client = new Superchat({ apiKey: "sk_live_explicit", baseUrl: "https://explicit.example.test" });

    expect(client.baseUrl).toBe("https://explicit.example.test");
    expect(client.environment).toBe("live");
  });

  test("falls back to the default API origin", () => {
    const client = new Superchat({ apiKey: "sk_test_1" });

    expect(client.baseUrl).toBe("https://api.superchatbd.com");
  });

  test("strips trailing slashes from the base URL", () => {
    const client = new Superchat({ apiKey: "sk_test_1", baseUrl: "https://api.example.test///" });

    expect(client.baseUrl).toBe("https://api.example.test");
  });

  test("rejects a base URL that is not an absolute http(s) URL", () => {
    expect(() => new Superchat({ apiKey: "sk_test_1", baseUrl: "api.example.test" })).toThrow(SuperchatConfigError);
    expect(() => new Superchat({ apiKey: "sk_test_1", baseUrl: "ftp://api.example.test" })).toThrow(
      SuperchatConfigError,
    );
  });

  test("validates timeoutMs and maxRetries", () => {
    expect(() => new Superchat({ apiKey: "sk_test_1", timeoutMs: 0 })).toThrow(/timeoutMs/);
    expect(() => new Superchat({ apiKey: "sk_test_1", timeoutMs: Number.NaN })).toThrow(/timeoutMs/);
    expect(() => new Superchat({ apiKey: "sk_test_1", maxRetries: -1 })).toThrow(/maxRetries/);
    expect(() => new Superchat({ apiKey: "sk_test_1", maxRetries: 1.5 })).toThrow(/maxRetries/);
  });

  test("derives the environment from the key prefix", () => {
    expect(new Superchat({ apiKey: "sk_live_abc" }).environment).toBe("live");
    expect(new Superchat({ apiKey: "sk_test_abc" }).environment).toBe("test");
    expect(new Superchat({ apiKey: "custom_key" }).environment).toBeUndefined();
  });

  test("rejects an environment that contradicts the key prefix", () => {
    expect(() => new Superchat({ apiKey: "sk_live_abc", environment: "test" })).toThrow(
      /does not match the "live" environment/,
    );
    expect(new Superchat({ apiKey: "sk_live_abc", environment: "live" }).environment).toBe("live");
    expect(new Superchat({ apiKey: "custom_key", environment: "test" }).environment).toBe("test");
  });

  test("exposes the resources and request options", async () => {
    const { client, requests } = createTestClient({ timeoutMs: 1_234, maxRetries: 3 }, () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    expect(client.baseUrl).toBe("https://api.example.test");
    expect(typeof client.payments.create).toBe("function");
    expect(typeof client.account.retrieve).toBe("function");
    expect(typeof client.webhooks.create).toBe("function");
    expect(typeof client.checkout.retrieve).toBe("function");

    await client.account.retrieve();
    expect(requests).toHaveLength(1);
  });
});
