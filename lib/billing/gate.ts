import "server-only";
import { NextResponse } from "next/server";
import {
  countTrialUsage,
  countAccountUsage,
  evaluateAccountState,
  setAccountStatus,
  type AccountState,
} from "@/lib/billing/account";
import { getTrialConfig } from "@/lib/billing/trial-limits";
import {
  getAccountFeatureLimit,
  getAccountLimitOverride,
  isUnlimitedLimit,
} from "@/lib/billing/feature-limits";
import {
  ACCOUNT_BLOCKED_CODE,
  type AccountBlockedPayload,
  type ActionFeature,
  type BlockReason,
} from "@/lib/billing/account-types";

export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: BlockReason; feature: ActionFeature };

const FEATURE_LABELS: Record<ActionFeature, string> = {
  funnel_analyses: "funnel analysis",
  variant_comparisons: "variant comparison",
  creative_briefs: "creative brief",
  ad_deconstructions: "ad deconstruction",
  chat_messages: "Creative Director message",
};

function messageFor(reason: BlockReason, feature: ActionFeature): string {
  const label = FEATURE_LABELS[feature];
  switch (reason) {
    case "payment_failed":
      return `Your last payment failed. Update your payment method to continue running ${label}s.`;
    case "trial_limit":
      return `You've used your free trial allowance. Upgrade to keep running ${label}s.`;
    case "trial_expired":
      return `Your free trial has ended. Upgrade to keep running ${label}s.`;
    case "plan_limit":
      return `You've reached your plan's ${label} limit for this period. Upgrade for more capacity.`;
    case "paywalled":
    default:
      return `Upgrade your plan to run ${label}s.`;
  }
}

function trialStillOpen(state: AccountState): boolean {
  if (!state.trial_ends_at) return true;
  return new Date(state.trial_ends_at).getTime() > Date.now();
}

/**
 * Trial / unpaid-paywall allowance check.
 * Admin account_limit_overrides take precedence over default trial caps.
 *
 * Important: exhausting a hardwall feature flips the account to `paywalled`.
 * Overrides must still be honored for unpaid paywalled users, otherwise the
 * admin UI can show remaining allowance while the gate hard-blocks.
 */
async function assertTrialAllowance(
  userId: string,
  feature: ActionFeature,
  state: AccountState,
  options?: { restoreTrialingOnAllow?: boolean }
): Promise<GateResult> {
  const override = await getAccountLimitOverride(userId, feature);
  const trialConfig = await getTrialConfig();
  const limit = override ?? trialConfig.limits[feature] ?? 0;

  if (limit === -1) {
    if (
      options?.restoreTrialingOnAllow &&
      state.account_status === "paywalled" &&
      trialStillOpen(state)
    ) {
      await setAccountStatus(userId, "trialing");
    }
    return { allowed: true };
  }

  if (limit === 0) {
    return { allowed: false, reason: "trial_limit", feature };
  }

  const used = await countTrialUsage(userId, feature);
  if (used >= limit) {
    if (trialConfig.hardwallFeatures.includes(feature)) {
      await setAccountStatus(userId, "paywalled");
    }
    return { allowed: false, reason: "trial_limit", feature };
  }

  if (
    options?.restoreTrialingOnAllow &&
    state.account_status === "paywalled" &&
    trialStillOpen(state)
  ) {
    await setAccountStatus(userId, "trialing");
  }

  return { allowed: true };
}

/**
 * THE server-side gate. Re-verified at the moment of every AI-consuming action.
 * Never trust client state — this is the call that actually matters.
 *
 * `countTrial` (default true) controls whether trial per-feature allowances are
 * counted. Set it to false on follow-up endpoints (e.g. the /run route) where
 * the creation step already authorized and recorded the action — otherwise the
 * just-created row would be double-counted and wrongly blocked.
 */
export async function assertActionAllowed(
  userId: string,
  feature: ActionFeature,
  options?: { countTrial?: boolean }
): Promise<GateResult> {
  const countTrial = options?.countTrial ?? true;
  const state = await evaluateAccountState(userId);

  if (state.isAdmin) return { allowed: true };

  switch (state.account_status) {
    case "active": {
      if (!countTrial) return { allowed: true };

      const limit = await getAccountFeatureLimit(userId, feature);
      if (isUnlimitedLimit(limit)) return { allowed: true };
      if (limit <= 0) {
        return { allowed: false, reason: "plan_limit", feature };
      }
      const used = await countAccountUsage(userId, feature);
      if (used >= limit) {
        return { allowed: false, reason: "plan_limit", feature };
      }
      return { allowed: true };
    }

    case "paywalled": {
      // Cancelled / unpaid subscribers stay hard-blocked.
      if (state.stripe_subscription_id) {
        return { allowed: false, reason: "paywalled", feature };
      }

      // Trial-exhaust paywall: honor admin overrides + remaining trial caps.
      if (!countTrial) return { allowed: true };
      return assertTrialAllowance(userId, feature, state, {
        restoreTrialingOnAllow: true,
      });
    }

    case "payment_failed":
      return { allowed: false, reason: "payment_failed", feature };

    case "trialing": {
      if (!countTrial) return { allowed: true };
      return assertTrialAllowance(userId, feature, state);
    }

    default:
      return { allowed: false, reason: "paywalled", feature };
  }
}

/** 402 Payment Required response the frontend recognises (not a generic 403). */
export function blockedResponse(
  result: Extract<GateResult, { allowed: false }>
): NextResponse {
  const payload: AccountBlockedPayload = {
    error: messageFor(result.reason, result.feature),
    code: ACCOUNT_BLOCKED_CODE,
    blockReason: result.reason,
    feature: result.feature,
  };
  return NextResponse.json(payload, { status: 402 });
}

/** Shape merged into server-action `{ success: false }` results when blocked. */
export function blockedActionResult(
  result: Extract<GateResult, { allowed: false }>
): { success: false; error: string; blocked: { reason: BlockReason; feature: ActionFeature } } {
  return {
    success: false,
    error: messageFor(result.reason, result.feature),
    blocked: { reason: result.reason, feature: result.feature },
  };
}
