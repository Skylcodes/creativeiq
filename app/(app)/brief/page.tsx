import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefList } from "@/components/brief/brief-list";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { getBriefsForWorkspace } from "@/lib/briefs/queries";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

export default async function BriefsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { workspace } = await getActiveWorkspace(user.id);
  if (!workspace) redirect("/onboarding");

  const briefs = await getBriefsForWorkspace(workspace.id);

  return (
    <PageShell>
      <PageHeader
        title="Creative Briefs"
        description="Production-ready briefs for your next ad — before you film anything"
        action={
          <Link href="/brief/new" className="btn-premium">
            New Brief
          </Link>
        }
      />
      <BriefList briefs={briefs} />
    </PageShell>
  );
}
