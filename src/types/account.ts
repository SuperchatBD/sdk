/** Developer workspace of the authenticated API key. */
export interface DeveloperWorkspace {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  status: string;
}

/** Available balance per currency. */
export interface AccountBalance {
  bdt: number;
  usd: number;
}

/** Lifetime volume of successfully paid transactions. */
export interface AccountVolume {
  bdt: number;
  usd: number;
  total_payments: number;
}

/** Response of `superchat.account.retrieve()`. */
export interface AccountDetails {
  workspace: DeveloperWorkspace;
  balance: AccountBalance;
  volume: AccountVolume;
}

/** Response of `superchat.account.balance()`. */
export interface AccountBalanceResponse {
  bdt_balance: number;
  usd_balance: number;
}

/** An application registered on the developer workspace. */
export interface DeveloperApp {
  id: string;
  developerId: string;
  name: string;
  description: string | null;
  /** Redirect URIs registered by the application. */
  redirectUris: string[] | null;
  webhookUrl: string | null;
  status: string;
  /** `true` when `status` is `active`. */
  isActive: boolean;
  /** Backend currently mirrors {@link DeveloperApp.webhookUrl} here. */
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
