import Link from "next/link";
import { Pricing } from "@/components/landing/pricing";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Plans & Pricing — Advara",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentTierKey: string | null = null;
  let signedIn = false;

  if (user) {
    signedIn = true;
    const db = createAdminClient();
    const { data: profile } = await db
      .from("profiles")
      .select("subscription_tier_key, account_status")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.account_status === "active") {
      currentTierKey = (profile.subscription_tier_key as string | null) ?? null;
    }
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          "linear-gradient(180deg, #0a0714 0%, #120d24 42%, #0c0918 100%)",
      }}
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <Link href={signedIn ? "/dashboard" : "/"} className="font-display text-lg font-semibold">
          Advara
        </Link>
        <Link
          href={signedIn ? "/dashboard" : "/"}
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          {signedIn ? "Back to dashboard" : "Back to home"}
        </Link>
      </header>

      <Pricing
        currentTierKey={currentTierKey}
        ctaLabel={signedIn ? "Upgrade" : "Get started"}
      />
    </div>
  );
}
