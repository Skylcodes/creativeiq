import "server-only";
import { NextResponse } from "next/server";
import {
  countTrialUsage,
  evaluateAccountState,
  setAccountStatus,
} from "@/lib/billing/account";
import { TRIAL_HARDWALL_FEATURES, TRIAL_LIMITS } from "@/lib/billing/config";
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
    case "paywalled":
    default:
      return `Upgrade your plan to run ${label}s.`;
  }
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
    case "active":
      return { allowed: true };

    case "paywalled":
      return { allowed: false, reason: "paywalled", feature };

    case "payment_failed":
      return { allowed: false, reason: "payment_failed", feature };

    case "trialing": {
      if (!countTrial) return { allowed: true };

      const limit = TRIAL_LIMITS[feature] ?? 0;

      if (limit === -1) return { allowed: true };

      if (limit === 0) {
        // Feature is not part of the trial at all → straight to upgrade prompt.
        return { allowed: false, reason: "trial_limit", feature };
      }

      const used = await countTrialUsage(userId, feature);
      if (used >= limit) {
        // Exhausting a headline trial allowance ends the trial entirely.
        if (TRIAL_HARDWALL_FEATURES.includes(feature)) {
          await setAccountStatus(userId, "paywalled");
        }
        return { allowed: false, reason: "trial_limit", feature };
      }

      return { allowed: true };
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
