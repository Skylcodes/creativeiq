import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HookLibraryExperience } from "@/components/hooks/hook-library-experience";
import {
  getCustomTagsForWorkspace,
  getHookLibraryStats,
  getHooksForWorkspace,
} from "@/lib/hooks/queries";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

export default async function HooksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { workspace } = await getActiveWorkspace(user.id);
  if (!workspace) redirect("/onboarding");

  const [hooks, stats, customTags] = await Promise.all([
    getHooksForWorkspace(workspace.id),
    getHookLibraryStats(workspace.id),
    getCustomTagsForWorkspace(workspace.id),
  ]);

  return (
    <Suspense fallback={null}>
      <HookLibraryExperience
        workspace={workspace}
        hooks={hooks}
        stats={stats}
        customTags={customTags}
      />
    </Suspense>
  );
}
