import { describe, expect, test } from "bun:test";
import { SuperchatSignatureError } from "../src/errors";
import { captureError, createTestClient, jsonResponse, sampleDelivery, samplePaginated, samplePayment, sampleWebhookEndpoint, signPayload, TEST_SECRET } from "./fixtures";

describe("webhooks management", () => {
  test("registers a subscription", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(sampleWebhookEndpoint(), 201));

    const endpoint = await client.webhooks.create({
      url: "https://shop.test/api/webhooks/superchat",
      events: ["payment.completed", "payment.refunded"],
      appId: "app_1",
    });

    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/webhooks");
    expect(requests[0]?.body).toEqual({
      url: "https://shop.test/api/webhooks/superchat",
      events: ["payment.completed", "payment.refunded"],
      appId: "app_1",
    });
    expect(endpoint.secret).toBe(TEST_SECRET);
  });

  test("lists subscriptions", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse([sampleWebhookEndpoint()]));

    const endpoints = await client.webhooks.list();

    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/webhooks");
    expect(endpoints[0]?.events).toEqual(["payment.completed"]);
  });

  test("lists deliveries with filters", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(samplePaginated([sampleDelivery()])));

    const deliveries = await client.webhooks.deliveries({ webhookId: "wh_1", page: 2, limit: 5 });

    expect(requests[0]?.url).toBe(
      "https://api.example.test/api/v1/webhooks/deliveries?webhookId=wh_1&page=2&limit=5",
    );
    expect(deliveries.items[0]?.statusCode).toBe(200);
  });

  test("omits delivery filters when not provided", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(samplePaginated([])));

    await client.webhooks.deliveries();

    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/webhooks/deliveries");
  });

  test("deletes a subscription", async () => {
    const { client, requests } = createTestClient({}, () =>
      jsonResponse({ success: true, message: "Webhook endpoint removed" }),
    );

    const result = await client.webhooks.remove("wh_1");

    expect(requests[0]?.method).toBe("DELETE");
    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/webhooks/wh_1");
    expect(result.success).toBe(true);
  });

  test("sends a test ping", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(sampleDelivery({ event: "test.ping" })));

    const delivery = await client.webhooks.test("wh_1");

    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/webhooks/wh_1/test");
    expect(delivery?.event).toBe("test.ping");
  });

  test("passes through a null delivery record", async () => {
    const { client } = createTestClient({}, () => jsonResponse(null));

    expect(await client.webhooks.test("wh_1")).toBeNull();
  });
});

describe("webhooks signature helpers", () => {
  const payload = JSON.stringify({
    id: "evt_1",
    event: "payment.completed",
    created_at: "2026-09-20T10:00:00.000Z",
    data: samplePayment({ status: "completed" }),
  });

  test("verifySignature returns a boolean", () => {
    const { client } = createTestClient();

    expect(
      client.webhooks.verifySignature({
        payload,
        signatureHeader: signPayload(payload, TEST_SECRET),
        secret: TEST_SECRET,
      }),
    ).toBe(true);
    expect(
      client.webhooks.verifySignature({ payload, signatureHeader: "t=1,v1=00", secret: TEST_SECRET }),
    ).toBe(false);
  });

  test("verifySignature surfaces a missing secret as an error", () => {
    const { client } = createTestClient();

    expect(() => client.webhooks.verifySignature({ payload, signatureHeader: "t=1,v1=00", secret: "" })).toThrow(
      SuperchatSignatureError,
    );
  });

  test("constructEvent parses a verified envelope", () => {
    const { client } = createTestClient({}, () => jsonResponse({}));

    const event = client.webhooks.constructEvent<{ id: string }>({
      payload,
      signatureHeader: signPayload(payload, TEST_SECRET),
      secret: TEST_SECRET,
    });

    expect(event.id).toBe("evt_1");
    expect(event.data.id).toBe("pay_9f1c2d3e4b5a");
  });

  test("constructEvent throws on a bad signature", async () => {
    const { client } = createTestClient({}, () => jsonResponse({}));

    const error = await captureError(
      Promise.resolve().then(() =>
        client.webhooks.constructEvent({ payload, signatureHeader: "t=1,v1=00", secret: TEST_SECRET }),
      ),
    );

    expect(error).toBeInstanceOf(SuperchatSignatureError);
  });
});
