import { NextResponse } from "next/server";
import {
  getChatMessages,
  getOrCreateChatSession,
  getRecentWorkspaceAnalyses,
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
  const workspaceId = searchParams.get("workspaceId");
  const analysisId = searchParams.get("analysisId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  try {
    const chat = await getOrCreateChatSession(
      user.id,
      workspaceId,
      analysisId || null
    );
    const messages = await getChatMessages(chat.id, user.id);

    let contextLabel: string;
    if (analysisId) {
      const analysis = await loadAnalysisForChat(analysisId, user.id);
      contextLabel = contextLabelForAnalysis(analysis);
    } else {
      const recent = await getRecentWorkspaceAnalyses(workspaceId, 10);
      contextLabel = contextLabelForWorkspace(recent.length);
    }

    return NextResponse.json({ chat, messages, contextLabel });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
