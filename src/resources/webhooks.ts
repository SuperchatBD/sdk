import type { ClientContext } from "../http";
import { request } from "../http";
import { constructWebhookEvent, verifyWebhookSignature } from "../signature";
import type { Paginated } from "../types";
import type {
  CreateWebhookParams,
  ListDeliveriesParams,
  WebhookDeleted,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventEnvelope,
  WebhookVerifyOptions,
} from "../types/webhooks";

/**
 * Webhook subscription management, plus helpers to verify the signatures of
 * events delivered to your endpoint.
 */
export class WebhooksResource {
  constructor(private readonly context: ClientContext) {}

  /** Registers a webhook endpoint. The response contains its signing `secret`. */
  async create(params: CreateWebhookParams): Promise<WebhookEndpoint> {
    return request<WebhookEndpoint>(this.context, {
      method: "POST",
      path: "/api/v1/webhooks",
      body: { url: params.url, events: params.events, appId: params.appId },
    });
  }

  /** Lists the webhook endpoints of the account. */
  async list(): Promise<WebhookEndpoint[]> {
    return request<WebhookEndpoint[]>(this.context, { method: "GET", path: "/api/v1/webhooks" });
  }

  /** Lists delivery attempts, newest first. */
  async deliveries(params: ListDeliveriesParams = {}): Promise<Paginated<WebhookDelivery>> {
    return request<Paginated<WebhookDelivery>>(this.context, {
      method: "GET",
      path: "/api/v1/webhooks/deliveries",
      query: { webhookId: params.webhookId, page: params.page, limit: params.limit },
    });
  }

  /** Deletes a webhook endpoint. */
  async remove(webhookId: string): Promise<WebhookDeleted> {
    return request<WebhookDeleted>(this.context, {
      method: "DELETE",
      path: `/api/v1/webhooks/${encodeURIComponent(webhookId)}`,
    });
  }

  /**
   * Sends a `test.ping` event to the endpoint and returns the delivery record.
   * The platform returns `null` when the delivery could not be logged.
   */
  async test(webhookId: string): Promise<WebhookDelivery | null> {
    return request<WebhookDelivery | null>(this.context, {
      method: "POST",
      path: `/api/v1/webhooks/${encodeURIComponent(webhookId)}/test`,
    });
  }

  /**
   * Checks a `X-Superchat-Signature` header against the raw request body.
   * Returns `false` for missing, malformed, expired or mismatched signatures;
   * only an empty `secret` throws.
   */
  verifySignature(options: WebhookVerifyOptions): boolean {
    return verifyWebhookSignature(options);
  }

  /**
   * Verifies the signature and returns the parsed event envelope. Throws a
   * `SuperchatSignatureError` when verification fails.
   */
  constructEvent<T = unknown>(options: WebhookVerifyOptions): WebhookEventEnvelope<T> {
    return constructWebhookEvent<T>(options);
  }
}
