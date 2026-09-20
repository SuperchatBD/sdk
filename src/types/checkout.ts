import type { Environment } from "../types";

/** Public details of a hosted checkout session. */
export interface CheckoutSession {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  environment: Environment;
  /** Merchant name shown on the checkout page. */
  merchantName: string;
  appName: string;
  appLogoUrl: string | null;
  website: string | null;
  /** Alias of {@link CheckoutSession.website}. */
  websiteUrl: string | null;
  /** `true` when the one-hour session lifetime has elapsed. */
  isExpired: boolean;
  isSimulated: boolean;
  epsEnabled: boolean;
  stripeEnabled: boolean;
  successUrl: string | null;
  cancelUrl: string | null;
}

/** Parameters accepted by `superchat.checkout.simulate()`. */
export interface SimulatePaymentParams {
  /** Desired outcome. `completed` maps to the `success` action. */
  status?: "completed" | "failed" | "cancelled";
  /** Lower-level action override. Takes precedence over `status`. */
  action?: "success" | "fail" | "cancel";
}

/** Result of simulating a test payment. */
export interface CheckoutSimulationResult {
  /** Resolved payment status: `paid`, `failed` or `cancelled`. */
  status: string;
  /** URL the checkout page redirects to, with `payment_id` and `status` appended. */
  redirectUrl: string;
  success: boolean;
}

/** Result of initiating a real gateway checkout. */
export interface CheckoutRedirect {
  /** Gateway URL the customer must be redirected to. */
  redirectUrl: string;
}

/**
 * `superchat.checkout.pay()` returns a {@link CheckoutRedirect} for live
 * sessions. Test sessions are routed through the sandbox simulator and return a
 * {@link CheckoutSimulationResult} instead — check for the `success` property to
 * tell them apart.
 */
export type CheckoutPayResult = CheckoutRedirect | CheckoutSimulationResult;

/** Parameters accepted by `superchat.checkout.pay()`. */
export interface PayCheckoutParams {
  /** Gateway to invoke. Defaults to `eps`; USD payments always use `stripe`. */
  paymentMethod?: "eps" | "stripe" | "test";
  /** Customer mobile number, forwarded to the EPS gateway. */
  phoneNumber?: string;
  /** Optional redirect URL for the gateway return. */
  redirectUrl?: string;
}

/** Parameters accepted by `superchat.checkout.createDemoSession()`. */
export interface CreateDemoSessionParams {
  /** Defaults to `100`. */
  amount?: number;
  /** Defaults to `BDT`. */
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  description?: string;
}

/**
 * A throwaway demo session. It is generated locally by the API and is not
 * persisted, so it cannot be paid or simulated.
 */
export interface DemoCheckoutSession {
  id: string;
  amount: number;
  currency: string;
  status: string;
  /** Relative checkout path. */
  checkoutUrl: string;
  /** Absolute checkout URL. */
  checkout_url: string;
}
