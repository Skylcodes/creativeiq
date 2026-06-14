import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/shell/app-sidebar";
import { TopBar } from "@/components/dashboard/shell/top-bar";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { ToastProvider } from "@/components/shared/toast";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?redirectTo=/dashboard");
  }

  const { profile, workspaces } = await getActiveWorkspace(user.id);

  if (!profile.onboarding_complete) {
    redirect("/onboarding");
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "User";

  const fullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    displayName;

  return (
    <WorkspaceProvider
      initialWorkspaces={workspaces}
      initialActiveWorkspaceId={profile.active_workspace_id}
    >
      <ToastProvider>
        <div className="app-shell h-dvh overflow-hidden p-2 md:p-3">
          <div className="flex h-full min-h-0 gap-1.5 md:gap-2">
            <AppSidebar />
            <div className="app-canvas noise-overlay flex min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] md:rounded-[26px]">
              <TopBar
                email={user.email ?? ""}
                displayName={displayName}
                fullName={fullName}
                avatarUrl={profile.avatar_url}
              />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </div>
      </ToastProvider>
    </WorkspaceProvider>
  );
}
