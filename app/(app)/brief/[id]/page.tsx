import { redirect } from "next/navigation";
import { BriefExperience } from "@/components/brief/brief-experience";
import { getBriefById } from "@/lib/briefs/queries";
import { getHooksBySource } from "@/lib/hooks/queries";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

type BriefDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BriefDetailPage({ params }: BriefDetailPageProps) {
  const user = await (async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  })();

  if (!user) redirect("/sign-in");

  const { workspace } = await getActiveWorkspace(user.id);
  if (!workspace) redirect("/onboarding");

  const { id } = await params;
  const brief = await getBriefById(id, user.id);

  if (!brief || brief.workspace_id !== workspace.id) {
    redirect("/brief");
  }

  const savedHooks =
    brief.status === "completed"
      ? await getHooksBySource(workspace.id, { briefId: brief.id })
      : [];

  return (
    <BriefExperience
      brief={brief}
      workspaceName={workspace.name}
      savedHooks={savedHooks}
    />
  );
}
