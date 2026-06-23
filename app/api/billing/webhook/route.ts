import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyTierToUserWorkspaces, setAccountStatus } from "@/lib/billing/account";

export const dynamic = "force-dynamic";

// Stripe needs the raw request body to verify the signature.
async function readRawBody(request: Request): Promise<string> {
  return request.text();
}

function unixToIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

/** current_period_end moved onto subscription items in recent API versions. */
function getPeriodEnd(subscription: Stripe.Subscription): string | null {
  const top = (subscription as unknown as { current_period_end?: number })
    .current_period_end;
  if (top) return unixToIso(top);
  const item = subscription.items?.data?.[0] as
    | { current_period_end?: number }
    | undefined;
  return unixToIso(item?.current_period_end);
}

async function userIdForCustomer(customerId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data?.id as string | null) ?? null;
}

/** Maps a Stripe price id back to the tier it belongs to. */
async function tierForPriceId(
  priceId: string
): Promise<{ key: string; monthly_price: number; annual_price: number } | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("subscription_tiers")
    .select(
      "key, monthly_price, annual_price, stripe_monthly_price_id, stripe_annual_price_id, stripe_founding_price_id"
    )
    .or(
      `stripe_monthly_price_id.eq.${priceId},stripe_annual_price_id.eq.${priceId},stripe_founding_price_id.eq.${priceId}`
    )
    .maybeSingle();

  if (!data) return null;
  return {
    key: data.key as string,
    monthly_price: Number(data.monthly_price),
    annual_price: Number(data.annual_price),
  };
}

async function activateSubscription(
  userId: string,
  tierKey: string,
  subscriptionId: string | null,
  interval: "month" | "year",
  periodEnd: string | null,
  options?: { resnapshot?: boolean }
): Promise<void> {
  const db = createAdminClient();
  await db
    .from("profiles")
    .update({
      account_status: "active",
      subscription_tier_key: tierKey,
      subscription_interval: interval,
      stripe_subscription_id: subscriptionId,
      current_period_end: periodEnd,
      payment_failed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  await applyTierToUserWorkspaces(userId, tierKey, {
    resnapshot: options?.resnapshot ?? true,
  });
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const raw = await readRawBody(request);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      signature,
      webhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  const db = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};
        const userId =
          meta.user_id ?? (await userIdForCustomer(session.customer as string));
        const tierKey = meta.tier_key;
        const interval = (meta.interval === "year" ? "year" : "month") as
          | "month"
          | "year";

        if (!userId || !tierKey) break;

        let periodEnd: string | null = null;
        let subscriptionId: string | null = null;
        if (session.subscription) {
          subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          periodEnd = getPeriodEnd(subscription);
        }

        await activateSubscription(
          userId,
          tierKey,
          subscriptionId,
          interval,
          periodEnd,
          { resnapshot: true }
        );

        // Atomically claim a founding slot if this checkout used founding pricing.
        if (meta.used_founding === "true") {
          await db.rpc("claim_founding_slot", { p_tier_key: tierKey });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await userIdForCustomer(invoice.customer as string);
        if (!userId) break;

        const { data: profile } = await db
          .from("profiles")
          .select("subscription_tier_key, subscription_interval")
          .eq("id", userId)
          .maybeSingle();

        const tierKey = profile?.subscription_tier_key as string | null;
        if (!tierKey) break;

        // Renewal moment → re-snapshot the tier's current live limits.
        const subId =
          (invoice as unknown as { subscription?: string }).subscription ?? null;
        let periodEnd: string | null = unixToIso(invoice.period_end);
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          periodEnd = getPeriodEnd(subscription) ?? periodEnd;
        }

        await activateSubscription(
          userId,
          tierKey,
          subId,
          (profile?.subscription_interval as "month" | "year") ?? "month",
          periodEnd,
          { resnapshot: true }
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await userIdForCustomer(invoice.customer as string);
        if (!userId) break;

        await setAccountStatus(userId, "payment_failed", {
          payment_failed_at: new Date().toISOString(),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await userIdForCustomer(subscription.customer as string);
        if (!userId) break;

        await setAccountStatus(userId, "paywalled", {
          stripe_subscription_id: null,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await userIdForCustomer(subscription.customer as string);
        if (!userId) break;

        const item = subscription.items?.data?.[0];
        const priceId = item?.price?.id;
        if (!priceId) break;

        const newTier = await tierForPriceId(priceId);
        if (!newTier) break;

        const { data: profile } = await db
          .from("profiles")
          .select("subscription_tier_key")
          .eq("id", userId)
          .maybeSingle();

        const currentKey = profile?.subscription_tier_key as string | null;
        const interval = (item?.price?.recurring?.interval === "year"
          ? "year"
          : "month") as "month" | "year";
        const periodEnd = getPeriodEnd(subscription);

        // Determine upgrade vs downgrade by comparing prices of the two tiers.
        let isUpgrade = true;
        if (currentKey && currentKey !== newTier.key) {
          const { data: currentTier } = await db
            .from("subscription_tiers")
            .select("monthly_price")
            .eq("key", currentKey)
            .maybeSingle();
          if (currentTier) {
            isUpgrade =
              newTier.monthly_price >= Number(currentTier.monthly_price);
          }
        }

        // If the subscription was cancelled/inactive, paywall and stop.
        if (subscription.status === "canceled" || subscription.status === "unpaid") {
          await setAccountStatus(userId, "paywalled");
          break;
        }

        // Upgrade → apply immediately (re-snapshot now).
        // Downgrade → change the tier reference but keep the more generous
        // snapshot; the next renewal (invoice.payment_succeeded) re-snapshots.
        await db
          .from("profiles")
          .update({
            account_status: "active",
            subscription_tier_key: newTier.key,
            subscription_interval: interval,
            stripe_subscription_id: subscription.id,
            current_period_end: periodEnd,
            payment_failed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        await applyTierToUserWorkspaces(userId, newTier.key, {
          resnapshot: isUpgrade,
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
