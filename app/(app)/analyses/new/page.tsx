import { redirect } from "next/navigation";
import { NewAnalysisWizard } from "@/components/analysis-wizard/new-analysis-wizard";
import { getHooksForWorkspace } from "@/lib/hooks/queries";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

type NewAnalysisPageProps = {
  searchParams: Promise<{ platform?: string; landing?: string }>;
};

export default async function NewAnalysisPage({ searchParams }: NewAnalysisPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { workspace } = await getActiveWorkspace(user.id);
  if (!workspace) redirect("/onboarding");

  const libraryHooks = await getHooksForWorkspace(workspace.id);

  return (
    <NewAnalysisWizard
      workspace={workspace}
      libraryHooks={libraryHooks}
      prefill={{
        platform: params.platform,
        landingPageUrl: params.landing,
      }}
    />
  );
}
