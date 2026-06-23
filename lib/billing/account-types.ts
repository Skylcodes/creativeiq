/** Client-safe billing types shared between server and client components. */

export type AccountStatus = "trialing" | "active" | "paywalled" | "payment_failed";

/** Features that consume AI work and are gated by the paywall/trial system. */
export type ActionFeature =
  | "funnel_analyses"
  | "variant_comparisons"
  | "creative_briefs"
  | "ad_deconstructions"
  | "chat_messages";

export type BlockReason =
  | "paywalled"
  | "payment_failed"
  | "trial_limit"
  | "trial_expired";

/** Attached to server-action results when an action is blocked by billing. */
export type ActionBlocked = { reason: BlockReason; feature: ActionFeature };

/** Serializable account snapshot handed to the client for fast pre-checks. */
export type AccountSnapshot = {
  status: AccountStatus;
  isAdmin: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  paymentFailedAt: string | null;
  graceDaysLeft: number | null;
  subscriptionTierKey: string | null;
  hasStripeCustomer: boolean;
};

/** Error code returned by gated API routes (HTTP 402). */
export const ACCOUNT_BLOCKED_CODE = "ACCOUNT_BLOCKED" as const;

export type AccountBlockedPayload = {
  error: string;
  code: typeof ACCOUNT_BLOCKED_CODE;
  blockReason: BlockReason;
  feature: ActionFeature;
};
