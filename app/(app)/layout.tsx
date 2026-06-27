import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/shell/app-sidebar";
import { TopBar } from "@/components/dashboard/shell/top-bar";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { BillingProvider, BillingBanner } from "@/components/billing/billing-provider";
import { ToastProvider } from "@/components/shared/toast";
import { isAdminEmail } from "@/lib/admin/auth";
import { evaluateAccountState, toAccountSnapshot } from "@/lib/billing/account";
import { getAccountUsageSummary } from "@/lib/billing/usage-summary";
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

  const [accountState, usageSummary] = await Promise.all([
    evaluateAccountState(user.id, isAdminEmail(user.email)),
    getAccountUsageSummary(user.id),
  ]);
  const accountSnapshot = toAccountSnapshot(accountState);

  return (
    <WorkspaceProvider
      initialWorkspaces={workspaces}
      initialActiveWorkspaceId={profile.active_workspace_id}
    >
      <BillingProvider snapshot={accountSnapshot} usageSummary={usageSummary}>
        <ToastProvider>
          <div className="app-shell h-dvh overflow-hidden p-0 sm:p-2 md:p-3">
            <div className="flex h-full min-h-0 gap-0 sm:gap-2.5 md:gap-3">
              <div className="app-sidebar-panel hidden h-full shrink-0 overflow-visible rounded-[18px] md:rounded-[22px] lg:block">
                <AppSidebar
                  showAdminLink={isAdminEmail(user.email)}
                  usageSummary={usageSummary}
                />
              </div>
              <div className="app-canvas relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-none sm:rounded-[18px] md:rounded-[22px]">
                <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 top-1/3 h-48 w-48 rounded-full bg-accent-tertiary/10 blur-3xl" />
                <TopBar
                  email={user.email ?? ""}
                  displayName={displayName}
                  fullName={fullName}
                  avatarUrl={profile.avatar_url}
                  usageSummary={usageSummary}
                  showAdminLink={isAdminEmail(user.email)}
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
