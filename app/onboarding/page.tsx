import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

type OnboardingPageProps = {
  searchParams: Promise<{ mode?: string }>;
};

function OnboardingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

async function OnboardingGate({ mode }: { mode?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?redirectTo=/onboarding");
  }

  const profile = await getOrCreateProfile(user.id);
  const isNewWorkspaceMode = mode === "new" && profile.onboarding_complete;

  if (profile.onboarding_complete && !isNewWorkspaceMode) {
    redirect("/dashboard");
  }

  return <OnboardingFlow mode={isNewWorkspaceMode ? "new" : "full"} />;
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams;

  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingGate mode={params.mode} />
    </Suspense>
  );
}
