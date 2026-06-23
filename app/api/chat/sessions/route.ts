import { NextResponse } from "next/server";
import {
  createChatSession,
  getChatMessages,
  getChatSessionById,
  getRecentWorkspaceAnalyses,
  listChatSessions,
  loadAnalysisForChat,
  contextLabelForAnalysis,
  contextLabelForWorkspace,
} from "@/lib/chat/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");
  const workspaceId = searchParams.get("workspaceId");
  const analysisId = searchParams.get("analysisId");

  try {
    if (chatId) {
      const chat = await getChatSessionById(chatId, user.id);
      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }

      const messages = await getChatMessages(chat.id, user.id);

      let contextLabel: string;
      if (chat.analysis_id) {
        const analysis = await loadAnalysisForChat(chat.analysis_id, user.id);
        contextLabel = contextLabelForAnalysis(analysis);
      } else {
        const recent = await getRecentWorkspaceAnalyses(chat.workspace_id, 10);
        contextLabel = contextLabelForWorkspace(recent.length);
      }

      return NextResponse.json({ chat, messages, contextLabel });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const sessions = await listChatSessions(
      user.id,
      workspaceId,
      analysisId || null,
    );

    return NextResponse.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    workspaceId?: string;
    analysisId?: string | null;
  };

  if (!body.workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  try {
    const chat = await createChatSession(
      user.id,
      body.workspaceId,
      body.analysisId ?? null,
    );

    let contextLabel: string;
    if (body.analysisId) {
      const analysis = await loadAnalysisForChat(body.analysisId, user.id);
      contextLabel = contextLabelForAnalysis(analysis);
    } else {
      const recent = await getRecentWorkspaceAnalyses(body.workspaceId, 10);
      contextLabel = contextLabelForWorkspace(recent.length);
    }

    return NextResponse.json({
      chat,
      messages: [],
      contextLabel,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create chat session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
