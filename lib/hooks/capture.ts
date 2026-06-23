import "server-only";
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreativeBriefDocument } from "@/lib/types/brief";
import type { HookLibraryEntry, HookSourceKind, SaveGeneratedHookInput } from "@/lib/types/hook";

type CaptureRow = {
  hook_text: string;
  platform: string | null;
  angle_tags: string[];
  source_kind: HookSourceKind;
  source_analysis_id?: string | null;
  source_brief_id?: string | null;
  source_score: number | null;
  notes: string | null;
  capture_key: string;
};

function hashKey(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

function normalizeHook(text: string): string {
  return text.trim().replace(/^["'""]|["'""]$/g, "").replace(/\s+/g, " ");
}

/** Extract quoted hook from angle brief title format: Hook: "..." */
export function extractHookFromAngleString(angle: string): string | null {
  const match = angle.match(/Hook:\s*["']([^"']+)["']/i);
  if (match?.[1]) return normalizeHook(match[1]);
  const alt = angle.match(/Hook:\s*([^—]+)/i);
  if (alt?.[1]) return normalizeHook(alt[1]);
  return null;
}

export function extractHooksFromBriefDocument(
  doc: CreativeBriefDocument,
  briefId: string,
  platform: string | null
): CaptureRow[] {
  const rows: CaptureRow[] = [];

  for (const h of doc.hookOptions ?? []) {
    const hook = normalizeHook(h.hook);
    if (hook.length < 8) continue;
    const notes = [
      h.rationale,
      h.openingVisual ? `Opening frame: ${h.openingVisual}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    rows.push({
      hook_text: hook,
      platform,
      angle_tags: [],
      source_kind: "brief",
      source_brief_id: briefId,
      source_score: null,
      notes: notes || null,
      capture_key: hashKey(["brief", briefId, hook, `rank-${h.rank}`]),
    });
  }

  return rows;
}

export async function saveHookToLibrary(
  supabase: SupabaseClient,
  userId: string,
  input: SaveGeneratedHookInput
): Promise<{ hook: HookLibraryEntry | null; error: string | null }> {
  const hook = normalizeHook(input.hookText);
  if (hook.length < 8) {
    return { hook: null, error: "Hook must be at least 8 characters." };
  }

  const sourceId = input.sourceAnalysisId ?? input.sourceBriefId ?? "";
  const captureKey = hashKey([
    input.sourceKind,
    sourceId,
    hook,
    input.captureKeySuffix ?? "manual",
  ]);

  const now = new Date().toISOString();
  const row = {
    workspace_id: input.workspaceId,
    user_id: userId,
    hook_text: hook,
    platform: input.platform ?? null,
    angle_tags: input.angleTags ?? [],
    source_type: "advara_generated" as const,
    source_kind: input.sourceKind,
    source_analysis_id: input.sourceAnalysisId ?? null,
    source_brief_id: input.sourceBriefId ?? null,
    source_score: input.sourceScore ?? null,
    notes: input.notes?.trim() || null,
    is_favorited: false,
    custom_tags: [] as string[],
    is_in_test_queue: false,
    capture_key: captureKey,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("hook_library")
    .upsert(row, { onConflict: "workspace_id,capture_key" })
    .select("*")
    .single();

  if (error) {
    return { hook: null, error: error.message };
  }

  return { hook: data as HookLibraryEntry, error: null };
}

export async function captureHooksFromBrief(
  supabase: SupabaseClient,
  briefId: string,
  workspaceId: string,
  userId: string,
  doc: CreativeBriefDocument,
  platform: string | null
): Promise<void> {
  const rows = extractHooksFromBriefDocument(doc, briefId, platform);
  if (rows.length === 0) return;

  const now = new Date().toISOString();
  const inserts = rows.map((r) => ({
    workspace_id: workspaceId,
    user_id: userId,
    hook_text: r.hook_text,
    platform: r.platform,
    angle_tags: r.angle_tags,
    source_type: "advara_generated" as const,
    source_kind: r.source_kind,
    source_analysis_id: null,
    source_brief_id: r.source_brief_id ?? null,
    source_score: null,
    notes: r.notes,
    is_favorited: false,
    custom_tags: [] as string[],
    is_in_test_queue: false,
    capture_key: r.capture_key,
    created_at: now,
    updated_at: now,
  }));

  const { error } = await supabase.from("hook_library").upsert(inserts, {
    onConflict: "workspace_id,capture_key",
    ignoreDuplicates: true,
  });

  if (error) {
    console.error("[hook_library] capture brief failed:", error.message);
  }
}
