import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { HookLibraryEntry, HookLibraryStats } from "@/lib/types/hook";
import { buildHookLookup, hookTextKey } from "@/lib/hooks/utils";

export { buildHookLookup, hookTextKey };

export async function getHooksForWorkspace(
  workspaceId: string
): Promise<HookLibraryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hook_library")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as HookLibraryEntry[];
}

export async function getHookLibraryStats(
  workspaceId: string
): Promise<HookLibraryStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hook_library")
    .select("source_type, is_favorited, is_in_test_queue")
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  return {
    total: rows.length,
    advaraGenerated: rows.filter((r) => r.source_type === "advara_generated")
      .length,
    manual: rows.filter((r) => r.source_type === "manual").length,
    favorited: rows.filter((r) => r.is_favorited).length,
    testQueue: rows.filter((r) => r.is_in_test_queue).length,
  };
}

export async function getCustomTagsForWorkspace(
  workspaceId: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hook_library_tags")
    .select("tag_name")
    .eq("workspace_id", workspaceId)
    .order("tag_name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.tag_name as string);
}

export async function getTestQueueCount(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("hook_library")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("is_in_test_queue", true);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getHooksBySource(
  workspaceId: string,
  opts: { analysisId?: string; briefId?: string }
): Promise<HookLibraryEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("hook_library")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (opts.analysisId) {
    query = query.eq("source_analysis_id", opts.analysisId);
  } else if (opts.briefId) {
    query = query.eq("source_brief_id", opts.briefId);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as HookLibraryEntry[];
}
