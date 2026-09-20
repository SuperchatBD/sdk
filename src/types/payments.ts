import type { Environment } from "../types";

/**
 * Status of a payment as exposed by the public API. The API maps its internal
 * statuses (`created` → `pending`, `paid` → `completed`) and is extended over
 * time, so unknown values are preserved.
 */
export type PaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded"
  | "expired"
  | (string & {});

/** Internal payment status, exposed as `rawStatus`. */
export type PaymentRawStatus =
  | "created"
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded"
  | (string & {});

/** Customer details attached to a payment. */
export interface PaymentCustomer {
  name: string | null;
  email: string | null;
  phone: string | null;
}

/** Customer details accepted when creating a payment. */
export interface PaymentCustomerInput {
  name?: string;
  email?: string;
  phone?: string;
}

/** A hosted checkout payment session. */
export interface Payment {
  /** Payment session ID (`pay_…`). */
  id: string;
  developerId: string;
  appId: string | null;
  /** Merchant-facing transaction reference; defaults to the payment ID. */
  merchantTransactionId: string;
  amount: number;
  currency: string;
  /** Public status (`pending`, `completed`, `failed`, `cancelled`, `refunded`, `expired`). */
  status: PaymentStatus;
  /** Internal status (`created`, `processing`, `paid`, …). */
  rawStatus: PaymentRawStatus;
  environment: Environment;
  description: string | null;
  /** URL of the hosted checkout page to redirect the customer to. */
  checkoutUrl: string;
  /** @deprecated Snake-case alias of {@link Payment.checkoutUrl}; still returned by the API. */
  checkout_url: string;
  /** Platform fee for this payment, in `currency`. */
  platformFeeAmount: number;
  /** Effective platform fee percentage (for example `5` for 5%). */
  feePercentage: number;
  /** Effective platform fee rate; same value as {@link Payment.feePercentage}. */
  platformFeeRate: number;
  /** @deprecated Alias of {@link Payment.platformFeeRate}. */
  platform_fee_rate?: number;
  /** @deprecated Alias of {@link Payment.platformFeeAmount}. */
  platform_fee?: number;
  /** Amount credited to the developer workspace (amount minus platform fee). */
  netAmount: number;
  /** @deprecated Alias of {@link Payment.netAmount}. */
  net_amount?: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customer: PaymentCustomer;
  /** Gateway used, once the payment has been attempted. */
  paymentMethod: string | null;
  /** `true` for payments created with a test API key. */
  isSimulated: boolean;
  metadata: Record<string, unknown>;
  success_url: string | null;
  cancel_url: string | null;
  paid_at: string | null;
  /** ISO 8601 creation timestamp. */
  created_at: string;
  /** ISO 8601 creation timestamp (camelCase alias of {@link Payment.created_at}). */
  createdAt: string;
  /** ISO 8601 last-update timestamp. */
  updatedAt: string;
  /**
   * Only present on `payment.refunded` webhook payloads: the reason supplied to
   * the refund call.
   */
  refund_reason?: string;
}

/** Parameters accepted by `superchat.payments.create()`. */
export interface CreatePaymentParams {
  /** Amount in `currency`. Must be greater than zero. */
  amount: number;
  /** Absolute URL the customer returns to after a successful payment. Required. */
  success_url: string;
  /** Absolute URL the customer returns to when the payment is cancelled. Required. */
  cancel_url: string;
  /** Defaults to `BDT`. Only `BDT` and `USD` are supported. */
  currency?: "BDT" | "USD";
  description?: string;
  customer?: PaymentCustomerInput;
  metadata?: Record<string, unknown>;
}

/** Parameters accepted by `superchat.payments.list()`. */
export interface ListPaymentsParams {
  /** 1-based page number. Defaults to `1`. */
  page?: number;
  /** Items per page. Defaults to `20`. */
  limit?: number;
  /** Filters by public payment status. `completed` also matches `paid`; `pending` also matches `created`/`processing`. */
  status?: PaymentStatus;
}

/** Parameters accepted by `superchat.payments.refund()`. */
export interface RefundPaymentParams {
  /** Reason recorded with the refund and forwarded to `payment.refunded` webhooks. */
  reason?: string;
}
