import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getOrCreateStripeCustomer,
  getStripe,
  isStripeConfigured,
} from "@/lib/billing/stripe";
import { getAppOrigin } from "@/lib/internal-auth";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  tierKey?: string;
  interval?: "month" | "year";
};

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured yet." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CheckoutBody;
  const interval = body.interval === "year" ? "year" : "month";

  if (!body.tierKey) {
    return NextResponse.json({ error: "tierKey is required" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: tier } = await db
    .from("subscription_tiers")
    .select(
      "key, display_name, is_active, founding_price, founding_slots, stripe_monthly_price_id, stripe_annual_price_id, stripe_founding_price_id"
    )
    .eq("key", body.tierKey)
    .maybeSingle();

  if (!tier || !tier.is_active) {
    return NextResponse.json({ error: "Plan not available." }, { status: 404 });
  }

  // Founding price wins while slots remain and a monthly plan is selected.
  const foundingAvailable =
    tier.founding_price !== null &&
    (tier.founding_slots ?? 0) > 0 &&
    Boolean(tier.stripe_founding_price_id) &&
    interval === "month";

  const priceId = foundingAvailable
    ? (tier.stripe_founding_price_id as string)
    : interval === "year"
      ? (tier.stripe_annual_price_id as string | null)
      : (tier.stripe_monthly_price_id as string | null);

  if (!priceId) {
    return NextResponse.json(
      { error: "This plan is not purchasable yet. Prices are still syncing." },
      { status: 409 }
    );
  }

  const customerId = await getOrCreateStripeCustomer(user.id, user.email);
  const origin = getAppOrigin(request);
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    subscription_data: {
      metadata: {
        user_id: user.id,
        tier_key: tier.key,
        interval,
        used_founding: foundingAvailable ? "true" : "false",
      },
    },
    metadata: {
      user_id: user.id,
      tier_key: tier.key,
      interval,
      used_founding: foundingAvailable ? "true" : "false",
    },
  });

  return NextResponse.json({ url: session.url });
}
