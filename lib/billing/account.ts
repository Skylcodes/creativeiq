import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUserId } from "@/lib/admin/auth";
import { PAYMENT_GRACE_DAYS } from "@/lib/billing/config";
import type {
  AccountSnapshot,
  AccountStatus,
  ActionFeature,
} from "@/lib/billing/account-types";

type ProfileBillingRow = {
  account_status: AccountStatus;
  trial_ends_at: string | null;
  payment_failed_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_tier_key: string | null;
  subscription_interval: string | null;
  current_period_end: string | null;
};

export type AccountState = ProfileBillingRow & {
  userId: string;
  isAdmin: boolean;
};

const BILLING_COLUMNS =
  "account_status, trial_ends_at, payment_failed_at, stripe_customer_id, stripe_subscription_id, subscription_tier_key, subscription_interval, current_period_end";

function daysFromNow(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Loads account billing state and applies lazy status transitions:
 *   - trialing + trial window elapsed → paywalled (persisted)
 * Admins are always reported as `active` and never transitioned.
 * Run this on login and at the start of any gated action.
 */
export async function evaluateAccountState(
  userId: string,
  knownIsAdmin?: boolean
): Promise<AccountState> {
  const isAdmin = knownIsAdmin ?? (await isAdminUserId(userId));
  const db = createAdminClient();

  const { data } = await db
    .from("profiles")
    .select(BILLING_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  const row: ProfileBillingRow = {
    account_status: (data?.account_status as AccountStatus) ?? "trialing",
    trial_ends_at: (data?.trial_ends_at as string | null) ?? null,
    payment_failed_at: (data?.payment_failed_at as string | null) ?? null,
    stripe_customer_id: (data?.stripe_customer_id as string | null) ?? null,
    stripe_subscription_id: (data?.stripe_subscription_id as string | null) ?? null,
    subscription_tier_key: (data?.subscription_tier_key as string | null) ?? null,
    subscription_interval: (data?.subscription_interval as string | null) ?? null,
    current_period_end: (data?.current_period_end as string | null) ?? null,
  };

  if (isAdmin) {
    return { ...row, account_status: "active", userId, isAdmin: true };
  }

  // Lazy transition: expired trial → paywalled.
  if (
    row.account_status === "trialing" &&
    row.trial_ends_at &&
    new Date(row.trial_ends_at).getTime() <= Date.now()
  ) {
    await setAccountStatus(userId, "paywalled");
    return { ...row, account_status: "paywalled", userId, isAdmin: false };
  }

  return { ...row, userId, isAdmin: false };
}

export async function setAccountStatus(
  userId: string,
  status: AccountStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const db = createAdminClient();
  await db
    .from("profiles")
    .update({ account_status: status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", userId);
}

/** Serializable snapshot for client-side fast pre-checks. */
export function toAccountSnapshot(state: AccountState): AccountSnapshot {
  const graceEnd = state.payment_failed_at
    ? new Date(
        new Date(state.payment_failed_at).getTime() +
          PAYMENT_GRACE_DAYS * 86_400_000
      ).toISOString()
    : null;

  return {
    status: state.account_status,
    isAdmin: state.isAdmin,
    trialEndsAt: state.trial_ends_at,
    trialDaysLeft:
      state.account_status === "trialing" ? daysFromNow(state.trial_ends_at) : null,
    paymentFailedAt: state.payment_failed_at,
    graceDaysLeft:
      state.account_status === "payment_failed" ? daysFromNow(graceEnd) : null,
    subscriptionTierKey: state.subscription_tier_key,
    hasStripeCustomer: Boolean(state.stripe_customer_id),
  };
}

/**
 * Counts how much of a trial allowance has been consumed by this account.
 * The trial is always at the very start of an account's life, so counting all
 * rows the account has created is an accurate measure of trial usage.
 * chat_messages resets daily, so it counts only today's user messages.
 */
export async function countTrialUsage(
  userId: string,
  feature: ActionFeature
): Promise<number> {
  const db = createAdminClient();

  if (feature === "funnel_analyses" || feature === "variant_comparisons") {
    let query = db
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    query =
      feature === "variant_comparisons"
        ? query.eq("analysis_mode", "comparison")
        : query.neq("analysis_mode", "comparison");

    const { count } = await query;
    return count ?? 0;
  }

  if (feature === "creative_briefs") {
    const { count } = await db
      .from("creative_briefs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    return count ?? 0;
  }

  if (feature === "ad_deconstructions") {
    const { count } = await db
      .from("ad_deconstructions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    return count ?? 0;
  }

  // chat_messages — today's user messages across this account's chats.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await db
    .from("creative_director_messages")
    .select("id, creative_director_chats!inner(user_id)", {
      count: "exact",
      head: true,
    })
    .eq("role", "user")
    .eq("creative_director_chats.user_id", userId)
    .gte("created_at", todayStart.toISOString());

  return count ?? 0;
}

/**
 * Propagates the account's paid tier + a fresh limit snapshot down to every
 * workspace the user owns, so the existing per-workspace getFeatureLimit lookup
 * keeps working. Called from webhook handlers at checkout / renewal / plan change.
 */
export async function applyTierToUserWorkspaces(
  userId: string,
  tierKey: string,
  options?: { resnapshot?: boolean }
): Promise<void> {
  const db = createAdminClient();

  const { data: tier } = await db
    .from("subscription_tiers")
    .select("id")
    .eq("key", tierKey)
    .maybeSingle();

  let snapshot: Record<string, number> | null = null;
  if (tier && options?.resnapshot !== false) {
    const { data: rows } = await db
      .from("tier_feature_limits")
      .select("feature_key, limit_value")
      .eq("tier_id", tier.id);

    snapshot = {};
    for (const row of rows ?? []) {
      snapshot[row.feature_key] = row.limit_value as number;
    }
  }

  const update: Record<string, unknown> = { subscription_tier_key: tierKey };
  if (snapshot) update.subscription_limit_snapshot = snapshot;

  await db.from("workspaces").update(update).eq("user_id", userId);
}
