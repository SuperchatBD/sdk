import { createHmac } from "node:crypto";
import { Superchat } from "../src/client";
import type { SuperchatOptions } from "../src/types";

export interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export type MockHandler = (request: CapturedRequest, callIndex: number) => Response | Promise<Response>;

export interface MockFetch {
  fetch: typeof fetch;
  requests: CapturedRequest[];
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function createMockFetch(handler: MockHandler): MockFetch {
  const requests: CapturedRequest[] = [];

  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries((init?.headers ?? {}) as Record<string, string>)) {
      headers[key.toLowerCase()] = value;
    }

    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined;
    const captured: CapturedRequest = { url, method: init?.method ?? "GET", headers, body };
    requests.push(captured);

    return handler(captured, requests.length);
  }) as unknown as typeof fetch;

  return { fetch: fetchImpl, requests };
}

export interface TestClient {
  client: Superchat;
  requests: CapturedRequest[];
  fetch: typeof fetch;
}

export function createTestClient(options: Partial<SuperchatOptions> = {}, handler?: MockHandler): TestClient {
  const mockFetch = createMockFetch(handler ?? (() => jsonResponse({})));
  const client = new Superchat({
    apiKey: "sk_test_0123456789",
    baseUrl: "https://api.example.test",
    maxRetries: 0,
    fetch: mockFetch.fetch,
    ...options,
  });

  return { client, requests: mockFetch.requests, fetch: mockFetch.fetch };
}

export function signPayload(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const hash = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${hash}`;
}

/** Awaits a promise expected to reject and returns the rejection reason. */
export async function captureError(promise: Promise<unknown>): Promise<unknown> {
  let caught: unknown;
  let rejected = false;

  try {
    await promise;
  } catch (error) {
    rejected = true;
    caught = error;
  }

  if (!rejected) throw new Error("Expected the request to reject, but it resolved.");
  return caught;
}

export const TEST_SECRET = "whsec_0123456789abcdef0123456789abcdef";

/** Mirrors the API's `toPublicPayment()` response. */
export function samplePayment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const payment = {
    id: "pay_9f1c2d3e4b5a",
    developerId: "dev_123",
    appId: null,
    merchantTransactionId: "pay_9f1c2d3e4b5a",
    amount: 750,
    currency: "BDT",
    status: "pending",
    rawStatus: "created",
    environment: "test",
    description: "Pro Plan",
    checkout_url: "https://superchatbd.com/checkout/pay_9f1c2d3e4b5a",
    checkoutUrl: "https://superchatbd.com/checkout/pay_9f1c2d3e4b5a",
    platformFeeAmount: 37.5,
    platform_fee: 37.5,
    feePercentage: 5,
    platformFeeRate: 5,
    platform_fee_rate: 5,
    netAmount: 712.5,
    net_amount: 712.5,
    customerName: "Karim Rahman",
    customerEmail: "karim@example.com",
    customerPhone: null,
    customer: { name: "Karim Rahman", email: "karim@example.com", phone: null },
    paymentMethod: null,
    isSimulated: true,
    metadata: { orderId: "9921" },
    success_url: "https://shop.test/orders/success",
    cancel_url: "https://shop.test/cart",
    paid_at: null,
    created_at: "2026-09-20T10:00:00.000Z",
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
    ...overrides,
  };

  return payment;
}

export function samplePaginated<T>(items: T[]): {
  items: T[];
  total: number;
  page: number;
  limit: number;
} {
  return { items, total: items.length, page: 1, limit: 20 };
}

export function sampleAccount(): Record<string, unknown> {
  return {
    workspace: {
      id: "dev_123",
      name: "Acme Software",
      slug: "acme-software",
      website: "https://acme.test",
      status: "active",
    },
    balance: { bdt: 1200.5, usd: 15 },
    volume: { bdt: 48000, usd: 300, total_payments: 42 },
  };
}

export function sampleWebhookEndpoint(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "wh_1",
    developerId: "dev_123",
    appId: null,
    url: "https://shop.test/api/webhooks/superchat",
    secret: TEST_SECRET,
    events: ["payment.completed"],
    isActive: true,
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
    ...overrides,
  };
}

export function sampleDelivery(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "del_1",
    webhookId: "wh_1",
    developerId: "dev_123",
    event: "payment.completed",
    payload: { id: "evt_1", event: "payment.completed", created_at: "2026-09-20T10:00:00.000Z", data: {} },
    responseStatus: 200,
    responseBody: "ok",
    attempts: 1,
    status: "success",
    deliveredAt: "2026-09-20T10:00:01.000Z",
    createdAt: "2026-09-20T10:00:01.000Z",
    statusCode: 200,
    attemptNumber: 1,
    ...overrides,
  };
}
