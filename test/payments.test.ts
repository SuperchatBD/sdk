import { describe, expect, test } from "bun:test";
import type { Payment } from "../src/types/payments";
import { createTestClient, jsonResponse, samplePaginated, samplePayment } from "./fixtures";

const LEGACY_FIELD_NAMES = [
  "successUrl",
  "cancelUrl",
  "customerName",
  "customerEmail",
  "customerPhone",
  "appId",
];

describe("payments.create", () => {
  test("sends the snake_case contract the API validates", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(samplePayment(), 201));

    const payment = await client.payments.create({
      amount: 750,
      description: "Pro Plan",
      success_url: "https://shop.test/orders/success",
      cancel_url: "https://shop.test/cart",
      customer: { name: "Karim Rahman", email: "karim@example.com" },
      metadata: { orderId: "9921" },
    });

    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/payments");
    expect(requests[0]?.body).toEqual({
      amount: 750,
      currency: "BDT",
      description: "Pro Plan",
      success_url: "https://shop.test/orders/success",
      cancel_url: "https://shop.test/cart",
      customer: { name: "Karim Rahman", email: "karim@example.com" },
      metadata: { orderId: "9921" },
    });

    for (const legacy of LEGACY_FIELD_NAMES) {
      expect(requests[0]?.body).not.toHaveProperty(legacy);
    }

    expect((payment as Payment).checkoutUrl).toBe("https://superchatbd.com/checkout/pay_9f1c2d3e4b5a");
  });

  test("defaults the currency to BDT", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(samplePayment(), 201));

    await client.payments.create({
      amount: 10,
      success_url: "https://shop.test/ok",
      cancel_url: "https://shop.test/cancel",
    });

    expect(requests[0]?.body).toEqual({
      amount: 10,
      currency: "BDT",
      success_url: "https://shop.test/ok",
      cancel_url: "https://shop.test/cancel",
    });
  });

  test("generates an idempotency key per call", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(samplePayment(), 201));

    await client.payments.create({ amount: 1, success_url: "https://s.test/ok", cancel_url: "https://s.test/no" });
    await client.payments.create({ amount: 1, success_url: "https://s.test/ok", cancel_url: "https://s.test/no" });

    const first = requests[0]?.headers["idempotency-key"];
    const second = requests[1]?.headers["idempotency-key"];

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(second).not.toBe(first);
  });

  test("uses a caller-supplied idempotency key", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(samplePayment(), 201));

    await client.payments.create(
      { amount: 1, success_url: "https://s.test/ok", cancel_url: "https://s.test/no" },
      { idempotencyKey: "order_ref_9921" },
    );

    expect(requests[0]?.headers["idempotency-key"]).toBe("order_ref_9921");
  });
});

describe("payments.retrieve and payments.list", () => {
  test("retrieves a payment by id and escapes it", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(samplePayment()));

    await client.payments.retrieve("pay_1/2");

    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/payments/pay_1%2F2");
  });

  test("lists payments with pagination", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(samplePaginated([samplePayment()])));

    const page = await client.payments.list({ page: 3, limit: 10, status: "completed" });

    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/payments?page=3&limit=10&status=completed");
    expect(page.total).toBe(1);
    expect(page.items).toHaveLength(1);
  });
});

describe("payments.refund", () => {
  test("sends the refund reason", async () => {
    const { client, requests } = createTestClient({}, () =>
      jsonResponse(samplePayment({ status: "refunded", rawStatus: "refunded" })),
    );

    const payment = await client.payments.refund("pay_9f1c2d3e4b5a", { reason: "Customer requested cancellation" });

    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/payments/pay_9f1c2d3e4b5a/refund");
    expect(requests[0]?.body).toEqual({ reason: "Customer requested cancellation" });
    expect(payment.status).toBe("refunded");
  });

  test("sends an empty body when no reason is given and no idempotency key by default", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(samplePayment({ status: "refunded" })));

    await client.payments.refund("pay_1");

    expect(requests[0]?.body).toEqual({});
    expect(requests[0]?.headers["idempotency-key"]).toBeUndefined();
  });

  test("forwards a caller-supplied idempotency key", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(samplePayment({ status: "refunded" })));

    await client.payments.refund("pay_1", {}, { idempotencyKey: "refund_1" });

    expect(requests[0]?.headers["idempotency-key"]).toBe("refund_1");
  });
});
