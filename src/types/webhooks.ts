/**
 * Event names dispatched by the platform. Unknown names are preserved so new
 * event types do not break consumers.
 */
export type WebhookEventType =
  | "payment.created"
  | "payment.completed"
  | "payment.refunded"
  | "test.ping"
  | (string & {});

/** A registered webhook subscription. */
export interface WebhookEndpoint {
  id: string;
  developerId: string;
  appId: string | null;
  url: string;
  /** Signing secret (`whsec_…`) used for the `X-Superchat-Signature` header. */
  secret: string;
  /** Subscribed event names. `*` subscribes to every event. */
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A logged webhook delivery attempt. */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  developerId: string;
  event: string;
  /** The exact envelope that was POSTed to the endpoint. */
  payload: unknown;
  responseStatus: number | null;
  responseBody: string | null;
  /** Number of attempts made by the platform; always `1` today. */
  attempts: number;
  status: "success" | "failed" | "pending" | (string & {});
  deliveredAt: string | null;
  createdAt: string;
  /** Alias of {@link WebhookDelivery.responseStatus}. */
  statusCode: number | null;
  /** Alias of {@link WebhookDelivery.attempts}. */
  attemptNumber: number;
}

/** Parameters accepted by `superchat.webhooks.create()`. */
export interface CreateWebhookParams {
  /** Destination URL. Must be a valid absolute URL. */
  url: string;
  /** Event names to subscribe to, for example `["payment.completed"]` or `["*"]`. */
  events: string[];
  /** Optional application to scope the subscription to. */
  appId?: string;
}

/** Parameters accepted by `superchat.webhooks.deliveries()`. */
export interface ListDeliveriesParams {
  /** Restricts the result to a single subscription. */
  webhookId?: string;
  /** 1-based page number. Defaults to `1`. */
  page?: number;
  /** Items per page. Defaults to `20`. */
  limit?: number;
}

/** Result of deleting a webhook subscription. */
export interface WebhookDeleted {
  success: true;
  message: string;
}

/** Envelope delivered to webhook endpoints. */
export interface WebhookEventEnvelope<T = unknown> {
  /** Event ID, `evt_…`. */
  id: string;
  event: WebhookEventType;
  /** ISO 8601 timestamp of dispatch. */
  created_at: string;
  /** Event-specific payload. */
  data: T;
}

/** Payload of a `test.ping` event. */
export interface TestPingPayload {
  event: "test.ping";
  /** ISO 8601 timestamp. */
  timestamp: string;
  developer_id: string;
  message: string;
}

/** Options accepted by the webhook signature helpers. */
export interface WebhookVerifyOptions {
  /**
   * Raw request body exactly as received — a string, `Buffer` or `Uint8Array`.
   * Parse it only after verification succeeds.
   */
  payload: string | Uint8Array;
  /** Value of the `X-Superchat-Signature` header: `t=<unix-seconds>,v1=<hex>`. */
  signatureHeader: string;
  /** Signing secret of the subscription (`whsec_…`). */
  secret: string;
  /**
   * Maximum accepted age of the signature timestamp, in seconds. Defaults to
   * `300`. Pass `0` to disable the replay check.
   */
  toleranceInSeconds?: number;
}
