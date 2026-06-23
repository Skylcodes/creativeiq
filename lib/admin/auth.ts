import "server-only";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns true only if the given email matches the ADMIN_USER_EMAIL env var.
 * Case-insensitive comparison. Never exposes the admin email to the client.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_USER_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !email) return false;
  return email.trim().toLowerCase() === adminEmail;
}

/**
 * Returns true if the workspace owner matches ADMIN_USER_EMAIL.
 * Admin workspaces get unlimited usage on all features.
 */
export async function isAdminWorkspace(workspaceId: string): Promise<boolean> {
  const db = createAdminClient();

  const { data: workspace } = await db
    .from("workspaces")
    .select("user_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!workspace?.user_id) return false;

  const { data: authData, error } = await db.auth.admin.getUserById(
    workspace.user_id as string
  );

  if (error || !authData?.user) return false;

  return isAdminEmail(authData.user.email);
}

/** Returns true if the given user ID belongs to ADMIN_USER_EMAIL. */
export async function isAdminUserId(userId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data: authData, error } = await db.auth.admin.getUserById(userId);
  if (error || !authData?.user) return false;
  return isAdminEmail(authData.user.email);
}

/**
 * Verifies the current session user is the admin.
 * Returns { user } on success, or a NextResponse 403 to return immediately.
 * Use in every admin API route handler.
 */
export async function requireAdmin(): Promise<
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, user: { id: user.id, email: user.email! } };
}
