/**
 * Minimal webhook receiver that verifies `X-Superchat-Signature` on every
 * request. It has no dependencies and runs on Bun.
 *
 * Usage (from the `sdk/` folder):
 *   SUPERCHAT_WEBHOOK_SECRET=whsec_… bun run examples/webhook-receiver.ts
 *
 * Point a webhook subscription at http://localhost:4242/webhooks/superchat, or
 * expose the port with a tunnel while developing.
 */
import { SuperchatSignatureError, constructWebhookEvent } from "../src/index";

const secret = process.env.SUPERCHAT_WEBHOOK_SECRET;

if (!secret) {
  console.error("Set SUPERCHAT_WEBHOOK_SECRET to the `secret` of your webhook subscription.");
  process.exit(1);
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 4242),

  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (pathname !== "/webhooks/superchat") {
      return new Response("Not found", { status: 404 });
    }

    // The raw body must be verified byte-for-byte, exactly as received.
    const rawBody = await request.text();

    try {
      const event = constructWebhookEvent<Record<string, unknown>>({
        payload: rawBody,
        signatureHeader: request.headers.get("x-superchat-signature") ?? "",
        secret,
      });

      console.log(`✓ ${event.event} (${event.id}) delivered=${request.headers.get("x-superchat-delivery")}`);
      console.log(event.data);

      return new Response("ok");
    } catch (error) {
      if (error instanceof SuperchatSignatureError) {
        console.warn(`✗ Rejected webhook (${error.code}): ${error.message}`);
        return new Response("invalid signature", { status: 400 });
      }

      throw error;
    }
  },
});

console.log(`Listening on http://localhost:${server.port}/webhooks/superchat`);
