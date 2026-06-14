import { redirect } from "next/navigation";
import { BriefWizard } from "@/components/brief-wizard/brief-wizard";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

export default async function NewBriefPage({
  searchParams,
}: {
  searchParams: Promise<{ angle?: string; platform?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { workspace } = await getActiveWorkspace(user.id);
  if (!workspace) redirect("/onboarding");

  return (
    <BriefWizard
      workspace={workspace}
      prefill={{
        angleIdea: params.angle,
        platform: params.platform,
      }}
    />
  );
}
