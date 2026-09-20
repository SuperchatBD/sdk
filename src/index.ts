/**
 * Official SDK for the Superchat BD Developer Platform.
 *
 * @packageDocumentation
 */

export { Superchat } from "./client";

export { computeSignature, constructWebhookEvent, verifyWebhookSignature } from "./signature";

export {
  SuperchatAPIError,
  SuperchatConfigError,
  SuperchatConnectionError,
  SuperchatError,
  SuperchatSignatureError,
} from "./errors";
export type { SignatureErrorCode, SuperchatErrorCode } from "./errors";

export {
  API_KEY_ENV_VAR,
  BASE_URL_ENV_VAR,
  DEFAULT_API_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_SIGNATURE_TOLERANCE_SECONDS,
  DEFAULT_TIMEOUT_MS,
} from "./constants";

export { SDK_VERSION } from "./version";

export type {
  ApiErrorBody,
  Environment,
  Paginated,
  PaginationParams,
  RequestOptions,
  SuperchatOptions,
} from "./types";

export type {
  CreatePaymentParams,
  ListPaymentsParams,
  Payment,
  PaymentCustomer,
  PaymentCustomerInput,
  PaymentRawStatus,
  PaymentStatus,
  RefundPaymentParams,
} from "./types/payments";

export type {
  AccountBalance,
  AccountBalanceResponse,
  AccountDetails,
  AccountVolume,
  DeveloperApp,
  DeveloperWorkspace,
} from "./types/account";

export type {
  CreateWebhookParams,
  ListDeliveriesParams,
  TestPingPayload,
  WebhookDeleted,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventEnvelope,
  WebhookEventType,
  WebhookVerifyOptions,
} from "./types/webhooks";

export type {
  CheckoutPayResult,
  CheckoutRedirect,
  CheckoutSession,
  CheckoutSimulationResult,
  CreateDemoSessionParams,
  DemoCheckoutSession,
  PayCheckoutParams,
  SimulatePaymentParams,
} from "./types/checkout";
