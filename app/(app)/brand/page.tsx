import { redirect } from "next/navigation";
import { BrandProfilePage } from "@/components/brand/brand-profile-page";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { normalizeLegacyProfile } from "@/lib/brand-profile/normalize";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { workspace } = await getActiveWorkspace(user.id);
  if (!workspace) redirect("/onboarding");

  let profile = null;

  try {
    profile = workspace.brand_profile
      ? normalizeLegacyProfile(workspace.brand_profile)
      : null;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load brand profile.";
    return <DashboardError message={message} />;
  }

  return (
    <BrandProfilePage
      key={workspace.id}
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      websiteUrl={workspace.brand_url}
      profile={profile}
      updatedAt={workspace.brand_profile_generated_at}
    />
  );
}
