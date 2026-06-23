import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStripeConfigured, syncTierToStripe } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    display_name?: string;
    description?: string;
    monthly_price?: number;
    annual_price?: number;
    is_active?: boolean;
    is_featured?: boolean;
    sort_order?: number;
    founding_price?: number | null;
    founding_slots?: number | null;
    limits?: Array<{ feature_key: string; limit_value: number; reset_period: string }>;
  };

  const db = createAdminClient();

  // Snapshot the tier before the update so we can detect price changes and
  // create new (immutable) Stripe Price objects only when amounts actually move.
  const { data: before } = await db
    .from("subscription_tiers")
    .select(
      "monthly_price, annual_price, founding_price, stripe_product_id, stripe_monthly_price_id, stripe_annual_price_id, stripe_founding_price_id"
    )
    .eq("id", id)
    .maybeSingle();

  // If setting this tier as featured, unfeature all others first
  if (body.is_featured) {
    await db
      .from("subscription_tiers")
      .update({ is_featured: false })
      .neq("id", id);
  }

  // Update tier
  const tierUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.display_name !== undefined) tierUpdate.display_name = body.display_name;
  if (body.description !== undefined) tierUpdate.description = body.description;
  if (body.monthly_price !== undefined) tierUpdate.monthly_price = body.monthly_price;
  if (body.annual_price !== undefined) tierUpdate.annual_price = body.annual_price;
  if (body.is_active !== undefined) tierUpdate.is_active = body.is_active;
  if (body.is_featured !== undefined) tierUpdate.is_featured = body.is_featured;
  if (body.sort_order !== undefined) tierUpdate.sort_order = body.sort_order;
  if (Object.prototype.hasOwnProperty.call(body, "founding_price")) {
    tierUpdate.founding_price = body.founding_price ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "founding_slots")) {
    tierUpdate.founding_slots = body.founding_slots ?? null;
  }

  const { data: tier, error: tierError } = await db
    .from("subscription_tiers")
    .update(tierUpdate)
    .eq("id", id)
    .select("*")
    .single();

  if (tierError) {
    return NextResponse.json({ error: tierError.message }, { status: 500 });
  }

  // Sync Stripe Products/Prices. New Price objects are created when the
  // monthly / annual / founding amount changed; old Prices are kept so existing
  // subscribers stay on them until they change plans.
  let stripeWarning: string | undefined;
  if (isStripeConfigured()) {
    try {
      const priceCols = await syncTierToStripe({
        tierId: tier.id,
        key: tier.key,
        displayName: tier.display_name,
        description: tier.description,
        monthlyPrice: Number(tier.monthly_price),
        annualPrice: Number(tier.annual_price),
        foundingPrice: tier.founding_price !== null ? Number(tier.founding_price) : null,
        existing: {
          stripe_product_id: (before?.stripe_product_id as string | null) ?? null,
          stripe_monthly_price_id: (before?.stripe_monthly_price_id as string | null) ?? null,
          stripe_annual_price_id: (before?.stripe_annual_price_id as string | null) ?? null,
          stripe_founding_price_id: (before?.stripe_founding_price_id as string | null) ?? null,
        },
        previousAmounts: {
          monthly: before ? Number(before.monthly_price) : null,
          annual: before ? Number(before.annual_price) : null,
          founding: before?.founding_price != null ? Number(before.founding_price) : null,
        },
      });

      await db.from("subscription_tiers").update(priceCols).eq("id", id);
      Object.assign(tier, priceCols);
    } catch (err) {
      stripeWarning = err instanceof Error ? err.message : "Stripe sync failed";
    }
  }

  // Upsert feature limits if provided
  if (body.limits && body.limits.length > 0) {
    const upserts = body.limits.map((l) => ({
      tier_id: id,
      feature_key: l.feature_key,
      limit_value: l.limit_value,
      reset_period: l.reset_period,
      updated_at: new Date().toISOString(),
    }));

    const { error: limitsError } = await db
      .from("tier_feature_limits")
      .upsert(upserts, { onConflict: "tier_id,feature_key" });

    if (limitsError) {
      return NextResponse.json({ error: limitsError.message }, { status: 500 });
    }
  }

  // Return updated tier + all its limits
  const { data: limits } = await db
    .from("tier_feature_limits")
    .select("*")
    .eq("tier_id", id)
    .order("feature_key");

  return NextResponse.json({ tier, limits: limits ?? [], stripeWarning });
}
