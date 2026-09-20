import type { ClientContext } from "../http";
import { request } from "../http";
import type { AccountBalanceResponse, AccountDetails, DeveloperApp } from "../types/account";

/** Account, balance and application endpoints. */
export class AccountResource {
  constructor(private readonly context: ClientContext) {}

  /** Returns the workspace, balance and lifetime volume of the API key's account. */
  async retrieve(): Promise<AccountDetails> {
    return request<AccountDetails>(this.context, { method: "GET", path: "/api/v1/account" });
  }

  /** Returns the available balance per currency. */
  async balance(): Promise<AccountBalanceResponse> {
    return request<AccountBalanceResponse>(this.context, { method: "GET", path: "/api/v1/account/balance" });
  }

  /** Lists the applications registered on the workspace. */
  async apps(): Promise<DeveloperApp[]> {
    return request<DeveloperApp[]>(this.context, { method: "GET", path: "/api/v1/account/apps" });
  }
}
