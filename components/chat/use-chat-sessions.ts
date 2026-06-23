"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatSessionSummary } from "@/lib/types/chat";

type UseChatSessionsOptions = {
  workspaceId: string;
  analysisId: string | null;
};

export function useChatSessions({
  workspaceId,
  analysisId,
}: UseChatSessionsOptions) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSessions = useCallback(async () => {
    const params = new URLSearchParams({ workspaceId });
    if (analysisId) params.set("analysisId", analysisId);

    const res = await fetch(`/api/chat/sessions?${params}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to load chats.");
    }

    const list = (data.sessions ?? []) as ChatSessionSummary[];
    setSessions(list);
    return list;
  }, [workspaceId, analysisId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setActiveChatId(null);
      try {
        const list = await refreshSessions();
        if (cancelled) return;
        if (list.length > 0) {
          setActiveChatId(list[0].id);
        }
      } catch {
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSessions]);

  const createSession = useCallback(async () => {
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        analysisId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to create chat.");
    }

    const chat = data.chat as ChatSessionSummary;
    setSessions((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    return chat.id;
  }, [workspaceId, analysisId]);

  const deleteSession = useCallback(
    async (chatId: string) => {
      const res = await fetch(`/api/chat/sessions/${chatId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete chat.");
      }

      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== chatId);
        setActiveChatId((current) => {
          if (current !== chatId) return current;
          return next[0]?.id ?? null;
        });
        return next;
      });
    },
    [],
  );

  const notifySessionUpdated = useCallback(() => {
    void refreshSessions();
  }, [refreshSessions]);

  return {
    sessions,
    activeChatId,
    setActiveChatId,
    loading,
    createSession,
    deleteSession,
    notifySessionUpdated,
  };
}
