import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

let cachedStripe: Stripe | null = null;

/** Lazily-constructed Stripe client. Uses test keys in dev, live keys in prod. */
export function getStripe(): Stripe {
  if (cachedStripe) return cachedStripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  cachedStripe = new Stripe(key, {
    // Pin the API version this SDK build expects.
    apiVersion: "2026-05-27.dahlia",
    appInfo: { name: "Advara" },
  });

  return cachedStripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Dollars (numeric on the tier) → integer cents for Stripe. */
export function toStripeAmount(dollars: number): number {
  return Math.round(dollars * 100);
}

export type TierPriceColumns = {
  stripe_product_id: string | null;
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
  stripe_founding_price_id: string | null;
};

type SyncInput = {
  tierId: string;
  key: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  foundingPrice: number | null;
  existing: TierPriceColumns;
  /** Force re-create of price objects even if the amount is unchanged. */
  previousAmounts?: {
    monthly: number | null;
    annual: number | null;
    founding: number | null;
  };
};

/**
 * Ensures a Stripe Product exists for the tier and creates Price objects for
 * monthly / annual / founding intervals as needed. Stripe Prices are immutable,
 * so a new Price is created whenever the amount changes; the old Price is left
 * intact (existing subscribers keep it) and the tier simply points at the new one.
 *
 * Returns the columns to persist on subscription_tiers. Best-effort: if Stripe
 * is not configured this is a no-op returning the existing columns.
 */
export async function syncTierToStripe(
  input: SyncInput
): Promise<TierPriceColumns> {
  if (!isStripeConfigured()) {
    return input.existing;
  }

  const stripe = getStripe();

  // 1. Product — create once, then keep metadata in sync.
  let productId = input.existing.stripe_product_id;
  if (!productId) {
    const product = await stripe.products.create({
      name: `Advara ${input.displayName}`,
      description: input.description || undefined,
      metadata: { tier_id: input.tierId, tier_key: input.key },
    });
    productId = product.id;
  } else {
    await stripe.products.update(productId, {
      name: `Advara ${input.displayName}`,
      description: input.description || undefined,
    });
  }

  const result: TierPriceColumns = {
    stripe_product_id: productId,
    stripe_monthly_price_id: input.existing.stripe_monthly_price_id,
    stripe_annual_price_id: input.existing.stripe_annual_price_id,
    stripe_founding_price_id: input.existing.stripe_founding_price_id,
  };

  // Helper: (re)create a recurring Price when missing or amount changed.
  async function ensurePrice(
    currentId: string | null,
    amountDollars: number | null,
    previousAmount: number | null | undefined,
    interval: "month" | "year",
    nickname: string
  ): Promise<string | null> {
    if (amountDollars === null || amountDollars <= 0) {
      // No paid price for this slot (e.g. founding disabled / free tier).
      return null;
    }

    const amountChanged =
      previousAmount !== undefined &&
      previousAmount !== null &&
      previousAmount !== amountDollars;

    if (currentId && !amountChanged) {
      return currentId;
    }

    const price = await stripe.prices.create({
      product: productId!,
      unit_amount: toStripeAmount(amountDollars),
      currency: "usd",
      recurring: { interval },
      nickname,
      metadata: { tier_id: input.tierId, tier_key: input.key, slot: nickname },
    });
    return price.id;
  }

  result.stripe_monthly_price_id = await ensurePrice(
    input.existing.stripe_monthly_price_id,
    input.monthlyPrice,
    input.previousAmounts?.monthly,
    "month",
    `${input.key}_monthly`
  );

  result.stripe_annual_price_id = await ensurePrice(
    input.existing.stripe_annual_price_id,
    input.annualPrice,
    input.previousAmounts?.annual,
    "year",
    `${input.key}_annual`
  );

  result.stripe_founding_price_id = await ensurePrice(
    input.existing.stripe_founding_price_id,
    input.foundingPrice,
    input.previousAmounts?.founding,
    "month",
    `${input.key}_founding`
  );

  return result;
}

/**
 * Gets (or lazily creates) the Stripe customer for an account and persists the
 * id back onto the profile.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const db = createAdminClient();
  const stripe = getStripe();

  const { data: profile } = await db
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id as string;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  await db
    .from("profiles")
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq("id", userId);

  return customer.id;
}
