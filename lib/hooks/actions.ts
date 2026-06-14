"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CreateManualHookInput, HookLibraryEntry, UpdateHookInput } from "@/lib/types/hook";
export type HookActionResult =
  | { success: true; hook?: HookLibraryEntry }
  | { success: false; error: string };

async function verifyWorkspace(supabase: Awaited<ReturnType<typeof createClient>>, workspaceId: string, userId: string) {
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function createManualHook(
  input: CreateManualHookInput
): Promise<HookActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const hookText = input.hookText.trim();
  if (hookText.length < 8) {
    return { success: false, error: "Hook must be at least 8 characters." };
  }

  if (!(await verifyWorkspace(supabase, input.workspaceId, user.id))) {
    return { success: false, error: "Workspace not found." };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("hook_library")
    .insert({
      workspace_id: input.workspaceId,
      user_id: user.id,
      hook_text: hookText,
      platform: input.platform ?? null,
      angle_tags: input.angleTags ?? [],
      source_type: "manual",
      manual_source_category: input.manualSourceCategory ?? "my_own_idea",
      source_kind: null,
      source_analysis_id: null,
      source_brief_id: null,
      source_score: null,
      notes: input.notes?.trim() || null,
      is_favorited: false,
      custom_tags: input.customTags ?? [],
      is_in_test_queue: input.isInTestQueue ?? false,
      capture_key: null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/hooks");
  revalidatePath("/dashboard");
  return { success: true, hook: data as HookLibraryEntry };
}

export async function updateHook(
  hookId: string,
  input: UpdateHookInput
): Promise<HookActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.hookText !== undefined) patch.hook_text = input.hookText.trim();
  if (input.platform !== undefined) patch.platform = input.platform;
  if (input.angleTags !== undefined) patch.angle_tags = input.angleTags;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.isFavorited !== undefined) patch.is_favorited = input.isFavorited;
  if (input.customTags !== undefined) patch.custom_tags = input.customTags;
  if (input.isInTestQueue !== undefined) patch.is_in_test_queue = input.isInTestQueue;

  const { data, error } = await supabase
    .from("hook_library")
    .update(patch)
    .eq("id", hookId)
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/hooks");
  revalidatePath("/dashboard");
  return { success: true, hook: data as HookLibraryEntry };
}

export async function toggleHookFavorite(hookId: string): Promise<HookActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: existing } = await supabase
    .from("hook_library")
    .select("is_favorited")
    .eq("id", hookId)
    .maybeSingle();

  if (!existing) return { success: false, error: "Hook not found." };

  return updateHook(hookId, { isFavorited: !existing.is_favorited });
}

export async function deleteHook(hookId: string): Promise<HookActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { error } = await supabase.from("hook_library").delete().eq("id", hookId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/hooks");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteHooksBulk(hookIds: string[]): Promise<HookActionResult> {
  if (hookIds.length === 0) return { success: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { error } = await supabase.from("hook_library").delete().in("id", hookIds);
  if (error) return { success: false, error: error.message };

  revalidatePath("/hooks");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addCustomTagToHooks(
  hookIds: string[],
  tagName: string
): Promise<HookActionResult> {
  const tag = tagName.trim();
  if (!tag) return { success: false, error: "Tag name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: hooks } = await supabase
    .from("hook_library")
    .select("id, workspace_id, custom_tags")
    .in("id", hookIds);

  if (!hooks?.length) return { success: false, error: "No hooks found." };

  const workspaceId = hooks[0].workspace_id as string;

  await supabase.from("hook_library_tags").upsert(
    { workspace_id: workspaceId, tag_name: tag },
    { onConflict: "workspace_id,tag_name" }
  );

  for (const h of hooks) {
    const tags = new Set([...(h.custom_tags as string[]), tag]);
    await supabase
      .from("hook_library")
      .update({ custom_tags: [...tags], updated_at: new Date().toISOString() })
      .eq("id", h.id);
  }

  revalidatePath("/hooks");
  return { success: true };
}

export async function createCustomTag(
  workspaceId: string,
  tagName: string
): Promise<HookActionResult> {
  const tag = tagName.trim();
  if (!tag) return { success: false, error: "Tag name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  if (!(await verifyWorkspace(supabase, workspaceId, user.id))) {
    return { success: false, error: "Workspace not found." };
  }

  const { error } = await supabase.from("hook_library_tags").upsert(
    { workspace_id: workspaceId, tag_name: tag },
    { onConflict: "workspace_id,tag_name" }
  );

  if (error) return { success: false, error: error.message };
  revalidatePath("/hooks");
  return { success: true };
}

export async function renameCustomTag(
  workspaceId: string,
  oldName: string,
  newName: string
): Promise<HookActionResult> {
  const next = newName.trim();
  if (!next) return { success: false, error: "Tag name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: hooks } = await supabase
    .from("hook_library")
    .select("id, custom_tags")
    .eq("workspace_id", workspaceId)
    .contains("custom_tags", [oldName]);

  for (const h of hooks ?? []) {
    const tags = (h.custom_tags as string[]).map((t) => (t === oldName ? next : t));
    await supabase
      .from("hook_library")
      .update({ custom_tags: [...new Set(tags)], updated_at: new Date().toISOString() })
      .eq("id", h.id);
  }

  await supabase
    .from("hook_library_tags")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("tag_name", oldName);

  await supabase.from("hook_library_tags").upsert(
    { workspace_id: workspaceId, tag_name: next },
    { onConflict: "workspace_id,tag_name" }
  );

  revalidatePath("/hooks");
  return { success: true };
}

export async function deleteCustomTag(
  workspaceId: string,
  tagName: string
): Promise<HookActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: hooks } = await supabase
    .from("hook_library")
    .select("id, custom_tags")
    .eq("workspace_id", workspaceId)
    .contains("custom_tags", [tagName]);

  for (const h of hooks ?? []) {
    const tags = (h.custom_tags as string[]).filter((t) => t !== tagName);
    await supabase
      .from("hook_library")
      .update({ custom_tags: tags, updated_at: new Date().toISOString() })
      .eq("id", h.id);
  }

  await supabase
    .from("hook_library_tags")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("tag_name", tagName);

  revalidatePath("/hooks");
  return { success: true };
}

export async function toggleTestQueue(hookId: string): Promise<HookActionResult> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("hook_library")
    .select("is_in_test_queue")
    .eq("id", hookId)
    .maybeSingle();

  if (!existing) return { success: false, error: "Hook not found." };
  return updateHook(hookId, { isInTestQueue: !existing.is_in_test_queue });
}
