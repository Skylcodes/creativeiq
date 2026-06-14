import { createClient } from "@/lib/supabase/server";
import type { CreativeBrief } from "@/lib/types/brief";

export async function getBriefsForWorkspace(
  workspaceId: string
): Promise<CreativeBrief[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("creative_briefs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as CreativeBrief[];
}

export async function getBriefById(
  briefId: string,
  userId: string
): Promise<CreativeBrief | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("creative_briefs")
    .select("*")
    .eq("id", briefId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as CreativeBrief) ?? null;
}

export async function getRecentBriefs(
  workspaceId: string,
  limit = 3
): Promise<CreativeBrief[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("creative_briefs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []) as CreativeBrief[];
}
