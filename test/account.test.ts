import { describe, expect, test } from "bun:test";
import { createTestClient, jsonResponse, sampleAccount } from "./fixtures";

describe("account resource", () => {
  test("retrieves the workspace, balance and volume", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse(sampleAccount()));

    const account = await client.account.retrieve();

    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/account");
    expect(account.workspace.slug).toBe("acme-software");
    expect(account.balance).toEqual({ bdt: 1200.5, usd: 15 });
    expect(account.volume.total_payments).toBe(42);
  });

  test("retrieves the balance", async () => {
    const { client, requests } = createTestClient({}, () => jsonResponse({ bdt_balance: 1200.5, usd_balance: 15 }));

    const balance = await client.account.balance();

    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/account/balance");
    expect(balance).toEqual({ bdt_balance: 1200.5, usd_balance: 15 });
  });

  test("lists applications", async () => {
    const apps = [
      {
        id: "app_1",
        developerId: "dev_123",
        name: "Acme Store",
        description: null,
        redirectUris: ["https://acme.test/checkout/success"],
        webhookUrl: "https://acme.test/api/webhooks/superchat",
        websiteUrl: "https://acme.test/api/webhooks/superchat",
        status: "active",
        isActive: true,
        createdAt: "2026-09-20T10:00:00.000Z",
        updatedAt: "2026-09-20T10:00:00.000Z",
      },
    ];
    const { client, requests } = createTestClient({}, () => jsonResponse(apps));

    const result = await client.account.apps();

    expect(requests[0]?.url).toBe("https://api.example.test/api/v1/account/apps");
    expect(result).toHaveLength(1);
    expect(result[0]?.redirectUris).toEqual(["https://acme.test/checkout/success"]);
  });
});
