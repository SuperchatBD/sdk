import { describe, expect, test } from "bun:test";
import type { CheckoutSimulationResult } from "../src/types/checkout";
import { createTestClient, jsonResponse } from "./fixtures";

const session = {
  id: "pay_1",
  amount: 750,
  currency: "BDT",
  description: "Pro Plan",
  customerName: "Karim Rahman",
  customerEmail: "karim@example.com",
  customerPhone: null,
  status: "created",
  environment: "test",
  merchantName: "Acme Store",
  appName: "Acme Store",
  appLogoUrl: null,
  website: "https://acme.test",
  websiteUrl: "https://acme.test",
  isExpired: false,
  isSimulated: true,
  epsEnabled: true,
  stripeEnabled: true,
  successUrl: "https://shop.test/orders/success",
  cancelUrl: "https://shop.test/cart",
};

describe("checkout resource", () => {
  test("retrieves a public checkout session", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(session));

    const result = await client.checkout.retrieve("pay_1");

    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/checkout/pay_1");
    expect(result.merchantName).toBe("Acme Store");
  });

  test("simulates a test payment", async () => {
    const { client, requests } = createTestClient({}, () =>
      jsonResponse({ status: "paid", redirectUrl: "https://shop.test/orders/success?status=paid", success: true }),
    );

    const result = await client.checkout.simulate("pay_1", { status: "completed" });

    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/checkout/pay_1/simulate");
    expect(requests[0]?.body).toEqual({ status: "completed" });
    expect(result.success).toBe(true);
  });

  test("simulates a failure", async () => {
    const { client, requests } = createTestClient({}, () =>
      jsonResponse({ status: "failed", redirectUrl: "https://shop.test/cart?status=failed", success: false }),
    );

    const result = await client.checkout.simulate("pay_1", { action: "fail" });

    expect(requests[0]?.body).toEqual({ action: "fail" });
    expect(result.status).toBe("failed");
  });

  test("initiates a gateway checkout and can return a simulator result in test mode", async () => {
    const { client, requests } = createTestClient({}, () =>
      jsonResponse({ status: "paid", redirectUrl: "https://shop.test/ok?status=paid", success: true }),
    );

    const result = (await client.checkout.pay("pay_1", { paymentMethod: "eps" })) as CheckoutSimulationResult;

    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/checkout/pay_1/pay");
    expect(requests[0]?.body).toEqual({ paymentMethod: "eps" });
    expect(result.success).toBe(true);
  });

  test("returns the gateway redirect URL for live sessions", async () => {
    const { client } = createTestClient({}, () => jsonResponse({ redirectUrl: "https://gateway.test/checkout/abc" }));

    const result = await client.checkout.pay("pay_1", { paymentMethod: "stripe", phoneNumber: "01700000000" });

    expect(result.redirectUrl).toBe("https://gateway.test/checkout/abc");
  });

  test("creates a throwaway demo session", async () => {
    const { client, requests } = createTestClient({}, () =>
      jsonResponse({
        id: "test_pay_1",
        amount: 100,
        currency: "BDT",
        status: "pending",
        checkoutUrl: "/checkout/test_pay_1",
        checkout_url: "https://superchatbd.com/checkout/test_pay_1",
      }),
    );

    const demo = await client.checkout.createDemoSession({ amount: 100, customerName: "Demo Customer" });

    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/checkout/demo-session");
    expect(requests[0]?.body).toEqual({ amount: 100, customerName: "Demo Customer" });
    expect(demo.checkout_url).toBe("https://superchatbd.com/checkout/test_pay_1");
  });
});
