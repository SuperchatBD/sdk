/**
 * Lists recent payments and optionally refunds one of them.
 *
 * Usage (from the `sdk/` folder):
 *   SUPERCHAT_API_KEY=sk_test_… bun run examples/list-and-refund.ts
 *   SUPERCHAT_API_KEY=sk_test_… bun run examples/list-and-refund.ts pay_123
 */
import { Superchat } from "../src/index";

const superchat = new Superchat({ apiKey: process.env.SUPERCHAT_API_KEY });

const account = await superchat.account.retrieve();
console.log(`Workspace: ${account.workspace.name}`);
console.log(`Balance: BDT ${account.balance.bdt} / USD ${account.balance.usd}\n`);

const page = await superchat.payments.list({ limit: 5 });

for (const payment of page.items) {
  console.log(`${payment.id}  ${payment.currency} ${payment.amount}  ${payment.status}`);
}
console.log(`Showing ${page.items.length} of ${page.total} payments\n`);

const paymentId = process.argv[2];

if (!paymentId) {
  console.log("Pass a payment id to refund it, for example: bun run examples/list-and-refund.ts pay_123");
} else {
  const refunded = await superchat.payments.refund(
    paymentId,
    { reason: "Requested from the example script" },
    { idempotencyKey: `example_refund_${paymentId}` },
  );

  console.log(`Refund of ${refunded.id} is now ${refunded.status}`);
}
