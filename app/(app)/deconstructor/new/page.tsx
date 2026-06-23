import { redirect } from "next/navigation";
import { DeconstructorWizard } from "@/components/deconstructor/deconstructor-wizard";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

export default async function NewDeconstructorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { workspace } = await getActiveWorkspace(user.id);
  if (!workspace) redirect("/onboarding");

  return <DeconstructorWizard workspace={workspace} />;
}
