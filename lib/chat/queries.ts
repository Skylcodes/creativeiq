import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formatAnalysisDateTime } from "@/lib/analyses/utils";
import { isComparisonReport } from "@/lib/report/normalize-comparison";
import type { Analysis } from "@/lib/types/analysis";
import type {
  ChatAnalysisOption,
  CreativeDirectorChat,
  CreativeDirectorMessage,
} from "@/lib/types/chat";
import {
  buildAnalysisChatContext,
  buildAnalysisContextLabel,
  buildWorkspaceChatContext,
  buildWorkspaceContextLabel,
} from "@/lib/chat/context";
import type { Workspace } from "@/lib/types/workspace";

export async function getOrCreateChatSession(
  userId: string,
  workspaceId: string,
  analysisId: string | null
): Promise<CreativeDirectorChat> {
  const supabase = await createClient();

  let query = supabase
    .from("creative_director_chats")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (analysisId) {
    query = query.eq("analysis_id", analysisId);
  } else {
    query = query.is("analysis_id", null);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    return existing as CreativeDirectorChat;
  }

  const { data: created, error } = await supabase
    .from("creative_director_chats")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      analysis_id: analysisId,
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create chat session.");
  }

  return created as CreativeDirectorChat;
}

export async function getChatMessages(
  chatId: string,
  userId: string
): Promise<CreativeDirectorMessage[]> {
  const supabase = await createClient();

  const { data: chat } = await supabase
    .from("creative_director_chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!chat) return [];

  const { data, error } = await supabase
    .from("creative_director_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CreativeDirectorMessage[];
}

export async function clearChatMessages(
  chatId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { data: chat } = await supabase
    .from("creative_director_chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!chat) throw new Error("Chat not found.");

  const { error } = await supabase
    .from("creative_director_messages")
    .delete()
    .eq("chat_id", chatId);

  if (error) throw new Error(error.message);

  await supabase
    .from("creative_director_chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);
}

export async function insertChatMessage(
  chatId: string,
  role: "user" | "assistant",
  content: string
): Promise<CreativeDirectorMessage> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("creative_director_messages")
    .insert({ chat_id: chatId, role, content })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save message.");
  }

  await supabase
    .from("creative_director_chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);

  return data as CreativeDirectorMessage;
}

export async function loadWorkspaceForChat(
  workspaceId: string,
  userId: string
): Promise<Workspace> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Workspace not found.");
  }

  return data as Workspace;
}

export async function loadAnalysisForChat(
  analysisId: string,
  userId: string
): Promise<Analysis> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", analysisId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Analysis not found.");
  }

  return data as Analysis;
}

export async function getRecentWorkspaceAnalyses(
  workspaceId: string,
  limit = 10
): Promise<Analysis[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Analysis[];
}

export async function buildChatContextForSession(
  chat: CreativeDirectorChat,
  userId: string
): Promise<{ contextBlock: string; contextLabel: string }> {
  const workspace = await loadWorkspaceForChat(chat.workspace_id, userId);

  if (chat.analysis_id) {
    const analysis = await loadAnalysisForChat(chat.analysis_id, userId);
    return buildAnalysisChatContext(workspace, analysis);
  }

  const recent = await getRecentWorkspaceAnalyses(chat.workspace_id, 10);
  return buildWorkspaceChatContext(workspace, recent);
}

export async function getWorkspaceChatOptions(
  workspaceId: string
): Promise<ChatAnalysisOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analyses")
    .select("id, title, completed_at, created_at, funnel_score, analysis_mode, report")
    .eq("workspace_id", workspaceId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: (row.title as string) || "Analysis",
    date: formatAnalysisDateTime(
      (row.completed_at as string) ?? (row.created_at as string)
    ),
    score: row.funnel_score as number | null,
    isComparison:
      row.analysis_mode === "comparison" || isComparisonReport(row.report),
  }));
}

export function contextLabelForAnalysis(analysis: Analysis): string {
  return buildAnalysisContextLabel(analysis);
}

export function contextLabelForWorkspace(count: number): string {
  return buildWorkspaceContextLabel(count);
}
