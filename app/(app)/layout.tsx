import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/shell/app-sidebar";
import { TopBar } from "@/components/dashboard/shell/top-bar";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { BillingProvider, BillingBanner } from "@/components/billing/billing-provider";
import { ToastProvider } from "@/components/shared/toast";
import { isAdminEmail } from "@/lib/admin/auth";
import { evaluateAccountState, toAccountSnapshot } from "@/lib/billing/account";
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

  // Lazy account-state evaluation on every app load (the "check on login").
  const accountState = await evaluateAccountState(
    user.id,
    isAdminEmail(user.email)
  );
  const accountSnapshot = toAccountSnapshot(accountState);

  return (
    <WorkspaceProvider
      initialWorkspaces={workspaces}
      initialActiveWorkspaceId={profile.active_workspace_id}
    >
      <BillingProvider snapshot={accountSnapshot}>
        <ToastProvider>
          <div className="app-shell h-dvh overflow-hidden p-2 md:p-3">
            <div className="flex h-full min-h-0 gap-2.5 md:gap-3">
              <div className="app-sidebar-panel h-full shrink-0 overflow-hidden rounded-[18px] md:rounded-[22px]">
                <AppSidebar showAdminLink={isAdminEmail(user.email)} />
              </div>
              <div className="app-canvas flex min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] md:rounded-[22px]">
                <TopBar
                  email={user.email ?? ""}
                  displayName={displayName}
                  fullName={fullName}
                  avatarUrl={profile.avatar_url}
                />
                <BillingBanner />
                <main className="app-main flex-1 overflow-y-auto">{children}</main>
              </div>
            </div>
          </div>
        </ToastProvider>
      </BillingProvider>
    </WorkspaceProvider>
  );
}
