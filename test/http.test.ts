import { describe, expect, test } from "bun:test";
import { Superchat } from "../src/client";
import { SuperchatAPIError, SuperchatConnectionError, SuperchatError } from "../src/errors";
import { SDK_VERSION } from "../src/version";
import { captureError, createTestClient, jsonResponse, samplePayment } from "./fixtures";

const hangingFetch = ((_input: string | URL | Request, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  })) as unknown as typeof fetch;

describe("request pipeline", () => {
  test("sends the API key, user agent and JSON body", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(samplePayment(), 201));

    await client.payments.create({
      amount: 100,
      success_url: "https://shop.test/ok",
      cancel_url: "https://shop.test/cancel",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers.authorization).toBe("Bearer sk_test_0123456789");
    expect(requests[0]?.headers["user-agent"]).toBe(`Superchat-Node-SDK/${SDK_VERSION}`);
    expect(requests[0]?.headers.accept).toBe("application/json");
    expect(requests[0]?.headers["content-type"]).toBe("application/json");
  });

  test("omits the content type on requests without a body", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse({ bdt_balance: 0, usd_balance: 0 }));

    await client.account.balance();

    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/account/balance");
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.headers["content-type"]).toBeUndefined();
  });

  test("skips undefined query parameters and keeps the provided ones", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse({ items: [], total: 0, page: 1, limit: 20 }));

    await client.payments.list();
    await client.payments.list({ page: 2, limit: 50, status: "refunded" });

    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/payments");
    expect(requests[1]?.url).toBe("https://api.example.test/api/v1/payments?page=2&limit=50&status=refunded");
  });

  test("joins NestJS validation messages into one readable error", async () => {
    const { client } = createTestClient({}, () =>
      jsonResponse(
        {
          statusCode: 400,
          message: ["amount must be a positive number", "success_url must be a string"],
          error: "Bad Request",
        },
        400,
      ),
    );

    const error = (await captureError(client.account.retrieve())) as SuperchatAPIError;

    expect(error).toBeInstanceOf(SuperchatAPIError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("amount must be a positive number; success_url must be a string");
    expect(error.body).toEqual({
      statusCode: 400,
      message: ["amount must be a positive number", "success_url must be a string"],
      error: "Bad Request",
    });
  });

  test("falls back to the error field and then to the status code", async () => {
    const forbidden = createTestClient({}, () => jsonResponse({ statusCode: 403, error: "Forbidden" }, 403));
    const empty = createTestClient({}, () => new Response("", { status: 500 }));

    const forbiddenError = (await captureError(forbidden.client.account.retrieve())) as SuperchatAPIError;
    const emptyError = (await captureError(empty.client.account.retrieve())) as SuperchatAPIError;

    expect(forbiddenError.message).toBe("Forbidden");
    expect(emptyError.message).toBe("Superchat API request failed with status 500");
  });

  test("wraps network failures in a connection error", async () => {
    const { client } = createTestClient(
      {},
      () => {
        throw new TypeError("fetch failed");
      },
    );

    const error = (await captureError(client.account.retrieve())) as SuperchatConnectionError;

    expect(error).toBeInstanceOf(SuperchatConnectionError);
    expect(error.code).toBe("network_error");
    expect(error.message).toContain("fetch failed");
  });

  test("aborts a request that exceeds the timeout", async () => {
    const client = new Superchat({
      apiKey: "sk_test_1",
      baseUrl: "https://api.example.test",
      fetch: hangingFetch,
      maxRetries: 0,
      timeoutMs: 20,
    });

    const error = (await captureError(client.account.retrieve())) as SuperchatConnectionError;

    expect(error).toBeInstanceOf(SuperchatConnectionError);
    expect(error.code).toBe("timeout");
    expect(error.message).toContain("20ms");
  });

  test("does not retry a POST that has no idempotency key", async () => {
    let calls = 0;
    const { client } = createTestClient({ maxRetries: 2 }, () => {
      calls += 1;
      return jsonResponse({ statusCode: 500, message: "boom" }, 500);
    });

    await captureError(client.payments.refund("pay_1"));

    expect(calls).toBe(1);
  });

  test("does not retry client errors", async () => {
    let calls = 0;
    const { client } = createTestClient({ maxRetries: 2 }, () => {
      calls += 1;
      return jsonResponse({ statusCode: 400, message: "bad" }, 400);
    });

    await captureError(client.account.retrieve());

    expect(calls).toBe(1);
  });

  test("retries a POST that carries an idempotency key", async () => {
    let calls = 0;
    const { client, requests } = createTestClient({}, () => {
      calls += 1;
      return calls < 2 ? jsonResponse({ statusCode: 503 }, 503) : jsonResponse(samplePayment({ status: "completed" }));
    });

    const payment = await client.payments.refund("pay_1", { reason: "requested" }, { idempotencyKey: "idem_1", maxRetries: 1 });

    expect(calls).toBe(2);
    expect(requests.every((request) => request.headers["idempotency-key"] === "idem_1")).toBe(true);
    expect(payment.status).toBe("completed");
  });

  test("retries 429 responses immediately when retry-after is present", async () => {
    let calls = 0;
    const { client } = createTestClient({ maxRetries: 2 }, () => {
      calls += 1;
      return calls === 1
        ? jsonResponse({ statusCode: 429, message: "slow down" }, 429, { "retry-after": "0" })
        : jsonResponse(samplePayment());
    });

    const payment = await client.payments.retrieve("pay_1");

    expect(calls).toBe(2);
    expect(payment.id).toBe("pay_9f1c2d3e4b5a");
  });

  test("stops retrying after the retry budget is exhausted", async () => {
    let calls = 0;
    const { client } = createTestClient({ maxRetries: 2 }, () => {
      calls += 1;
      return jsonResponse({ statusCode: 502, message: "bad gateway" }, 502);
    });

    const error = (await captureError(client.account.retrieve())) as SuperchatAPIError;

    expect(calls).toBe(3);
    expect(error.statusCode).toBe(502);
  });

  test("rejects a successful response that is not JSON", async () => {
    const { client } = createTestClient({}, () => new Response("<html>proxy</html>", { status: 200 }));

    const error = (await captureError(client.account.retrieve())) as SuperchatError;

    expect(error).toBeInstanceOf(SuperchatError);
    expect(error.code).toBe("invalid_response");
  });

  test("treats an empty 204 response as no content", async () => {
    const { client } = createTestClient({}, () => new Response(null, { status: 204 }));

    await expect(client.webhooks.remove("wh_1")).resolves.toBeUndefined();
  });

  test("does not retry an aborted request", async () => {
    let calls = 0;
    const { client } = createTestClient({ maxRetries: 2 }, () => {
      calls += 1;
      const abort = new Error("aborted");
      abort.name = "AbortError";
      throw abort;
    });

    const error = (await captureError(client.account.retrieve())) as SuperchatConnectionError;

    expect(calls).toBe(1);
    expect(error.code).toBe("aborted");
  });
});
