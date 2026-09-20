import { randomUUID } from "node:crypto";
import type { ClientContext } from "../http";
import { request } from "../http";
import type { Paginated, RequestOptions } from "../types";
import type {
  CreatePaymentParams,
  ListPaymentsParams,
  Payment,
  RefundPaymentParams,
} from "../types/payments";

/** Request body accepted by `POST /api/v1/payments`. */
interface CreatePaymentRequestBody {
  amount: number;
  currency: string;
  success_url: string;
  cancel_url: string;
  description?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  metadata?: Record<string, unknown>;
}

/** Hosted checkout payments. */
export class PaymentsResource {
  constructor(private readonly context: ClientContext) {}

  /**
   * Creates a hosted checkout session and returns it together with the
   * `checkoutUrl` the customer should be redirected to.
   *
   * An `Idempotency-Key` is generated automatically unless one is supplied, so a
   * retried request can never create a second charge.
   */
  async create(params: CreatePaymentParams, options: RequestOptions = {}): Promise<Payment> {
    const body: CreatePaymentRequestBody = {
      amount: params.amount,
      currency: params.currency ?? "BDT",
      success_url: params.success_url,
      cancel_url: params.cancel_url,
      description: params.description,
      customer: params.customer,
      metadata: params.metadata,
    };

    return request<Payment>(this.context, {
      method: "POST",
      path: "/api/v1/payments",
      body,
      idempotencyKey: options.idempotencyKey ?? randomUUID(),
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
    });
  }

  /** Retrieves a single payment, including its fee breakdown. */
  async retrieve(paymentId: string): Promise<Payment> {
    return request<Payment>(this.context, {
      method: "GET",
      path: `/api/v1/payments/${encodeURIComponent(paymentId)}`,
    });
  }

  /** Lists payments of the account, newest first. */
  async list(params: ListPaymentsParams = {}): Promise<Paginated<Payment>> {
    return request<Paginated<Payment>>(this.context, {
      method: "GET",
      path: "/api/v1/payments",
      query: { page: params.page, limit: params.limit, status: params.status },
    });
  }

  /**
   * Refunds a paid payment and debits the developer balance.
   *
   * Only payments in the `paid` raw status can be refunded. Pass an
   * `idempotencyKey` to make the call retryable (and replayable) after a network
   * failure; without one the SDK will not retry the request.
   */
  async refund(paymentId: string, params: RefundPaymentParams = {}, options: RequestOptions = {}): Promise<Payment> {
    return request<Payment>(this.context, {
      method: "POST",
      path: `/api/v1/payments/${encodeURIComponent(paymentId)}/refund`,
      body: { reason: params.reason },
      idempotencyKey: options.idempotencyKey,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
    });
  }
}
