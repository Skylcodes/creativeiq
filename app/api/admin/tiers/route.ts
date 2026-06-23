import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStripeConfigured, syncTierToStripe } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = createAdminClient();

  const { data: tiers, error: tiersError } = await db
    .from("subscription_tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  if (tiersError) {
    return NextResponse.json({ error: tiersError.message }, { status: 500 });
  }

  const { data: limits, error: limitsError } = await db
    .from("tier_feature_limits")
    .select("*")
    .order("feature_key", { ascending: true });

  if (limitsError) {
    return NextResponse.json({ error: limitsError.message }, { status: 500 });
  }

  return NextResponse.json({ tiers, limits });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    key?: string;
    display_name?: string;
    description?: string;
    monthly_price?: number;
    annual_price?: number;
    is_active?: boolean;
    is_featured?: boolean;
    sort_order?: number;
    founding_price?: number | null;
    founding_slots?: number | null;
  };

  if (!body.key || !body.display_name) {
    return NextResponse.json(
      { error: "key and display_name are required" },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // If this new tier is featured, unfeature all others first
  if (body.is_featured) {
    await db
      .from("subscription_tiers")
      .update({ is_featured: false })
      .neq("key", body.key);
  }

  const { data, error } = await db
    .from("subscription_tiers")
    .insert({
      key: body.key,
      display_name: body.display_name,
      description: body.description ?? "",
      monthly_price: body.monthly_price ?? 0,
      annual_price: body.annual_price ?? 0,
      is_active: body.is_active ?? true,
      is_featured: body.is_featured ?? false,
      sort_order: body.sort_order ?? 99,
      founding_price: body.founding_price ?? null,
      founding_slots: body.founding_slots ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create matching Stripe Product + Price objects for the new tier.
  if (isStripeConfigured()) {
    try {
      const priceCols = await syncTierToStripe({
        tierId: data.id,
        key: data.key,
        displayName: data.display_name,
        description: data.description,
        monthlyPrice: Number(data.monthly_price),
        annualPrice: Number(data.annual_price),
        foundingPrice: data.founding_price !== null ? Number(data.founding_price) : null,
        existing: {
          stripe_product_id: null,
          stripe_monthly_price_id: null,
          stripe_annual_price_id: null,
          stripe_founding_price_id: null,
        },
      });

      const { data: synced } = await db
        .from("subscription_tiers")
        .update(priceCols)
        .eq("id", data.id)
        .select("*")
        .single();

      return NextResponse.json({ tier: synced ?? data });
    } catch (err) {
      // Tier is created; surface the Stripe error but don't lose the row.
      const message = err instanceof Error ? err.message : "Stripe sync failed";
      return NextResponse.json({ tier: data, stripeWarning: message });
    }
  }

  return NextResponse.json({ tier: data });
}
