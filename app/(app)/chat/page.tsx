import { redirect } from "next/navigation";
import { WorkspaceChatPage } from "@/components/chat/workspace-chat-page";
import { getWorkspaceChatOptions, getRecentWorkspaceAnalyses } from "@/lib/chat/queries";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?redirectTo=/chat");

  const { workspace } = await getActiveWorkspace(user.id);
  if (!workspace) redirect("/onboarding");

  const [analysisOptions, recent] = await Promise.all([
    getWorkspaceChatOptions(workspace.id),
    getRecentWorkspaceAnalyses(workspace.id, 10),
  ]);

  return (
    <WorkspaceChatPage
      workspaceId={workspace.id}
      analysisOptions={analysisOptions}
      defaultAnalysisCount={recent.length}
    />
  );
}
