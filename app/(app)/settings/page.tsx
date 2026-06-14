import { redirect } from "next/navigation";
import { SettingsPage } from "@/components/settings/settings-page";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { getAccountSettingsData } from "@/lib/settings/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?redirectTo=/settings");

  let data;

  try {
    data = await getAccountSettingsData(user);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load settings.";
    return <DashboardError message={message} />;
  }

  return (
    <SettingsPage
      email={data.email}
      fullName={data.fullName}
      avatarUrl={data.avatarUrl}
      workspaces={data.workspaces}
      activeWorkspaceId={data.activeWorkspaceId}
    />
  );
}
