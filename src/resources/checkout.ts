import type { ClientContext } from "../http";
import { request } from "../http";
import type {
  CheckoutPayResult,
  CheckoutSession,
  CheckoutSimulationResult,
  CreateDemoSessionParams,
  DemoCheckoutSession,
  PayCheckoutParams,
  SimulatePaymentParams,
} from "../types/checkout";

/**
 * Hosted checkout page endpoints. These routes do not require API-key
 * authentication, but are exposed here so checkout flows can be driven and
 * simulated from a server.
 */
export class CheckoutResource {
  constructor(private readonly context: ClientContext) {}

  /** Retrieves the public details of a checkout session. */
  async retrieve(sessionId: string): Promise<CheckoutSession> {
    return request<CheckoutSession>(this.context, {
      method: "GET",
      path: `/api/v1/checkout/${encodeURIComponent(sessionId)}`,
    });
  }

  /**
   * Sandbox simulator: settles a **test** session as paid, failed or cancelled.
   * Only sessions created with a test API key can be simulated.
   */
  async simulate(sessionId: string, params: SimulatePaymentParams = {}): Promise<CheckoutSimulationResult> {
    return request<CheckoutSimulationResult>(this.context, {
      method: "POST",
      path: `/api/v1/checkout/${encodeURIComponent(sessionId)}/simulate`,
      body: { status: params.status, action: params.action },
    });
  }

  /**
   * Initiates the real gateway checkout (EPS for BDT, Stripe for USD) and
   * returns the URL to redirect the customer to.
   *
   * Test sessions short-circuit into the simulator, so the resolved value can
   * also be a {@link CheckoutSimulationResult}.
   */
  async pay(sessionId: string, params: PayCheckoutParams = {}): Promise<CheckoutPayResult> {
    return request<CheckoutPayResult>(this.context, {
      method: "POST",
      path: `/api/v1/checkout/${encodeURIComponent(sessionId)}/pay`,
      body: {
        paymentMethod: params.paymentMethod,
        phoneNumber: params.phoneNumber,
        redirectUrl: params.redirectUrl,
      },
    });
  }

  /**
   * Creates a throwaway demo checkout session. The session is not persisted, so
   * it cannot be paid or simulated.
   */
  async createDemoSession(params: CreateDemoSessionParams = {}): Promise<DemoCheckoutSession> {
    return request<DemoCheckoutSession>(this.context, {
      method: "POST",
      path: "/api/v1/checkout/demo-session",
      body: {
        amount: params.amount,
        currency: params.currency,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        description: params.description,
      },
    });
  }
}
