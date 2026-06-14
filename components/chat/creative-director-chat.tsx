"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { revealTextSmoothly } from "@/lib/chat/smooth-reveal";
import type { CreativeDirectorMessage } from "@/lib/types/chat";
import { ChatAssistantMessage } from "./chat-assistant-message";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatHeader } from "./chat-header";
import { ChatInputArea } from "./chat-input-area";
import { ChatUserMessage } from "./chat-user-message";

type CreativeDirectorChatProps = {
  workspaceId: string;
  analysisId?: string | null;
  contextLabel: string;
  onContextLabelChange?: (label: string) => void;
  variant?: "panel" | "page";
  onClose?: () => void;
};

type ResponsePhase = "idle" | "buffering" | "revealing";

async function consumeSseStream(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream.");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return fullText;
      try {
        const parsed = JSON.parse(payload) as { text?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) fullText += parsed.text;
      } catch (err) {
        if (err instanceof SyntaxError) continue;
        throw err;
      }
    }
  }

  return fullText;
}

export function CreativeDirectorChat({
  workspaceId,
  analysisId = null,
  contextLabel: initialContextLabel,
  onContextLabelChange,
  variant = "panel",
  onClose,
}: CreativeDirectorChatProps) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CreativeDirectorMessage[]>([]);
  const [contextLabel, setContextLabel] = useState(initialContextLabel);
  const [input, setInput] = useState("");
  const [responsePhase, setResponsePhase] = useState<ResponsePhase>("idle");
  const [displayText, setDisplayText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [userHasSent, setUserHasSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const revealAbortRef = useRef<AbortController | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  const isResponding = responsePhase !== "idle";

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const scheduleScrollToBottom = useCallback(() => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      scrollToBottom();
    });
  }, [scrollToBottom]);

  useEffect(() => {
    if (responsePhase === "revealing") {
      scheduleScrollToBottom();
    }
  }, [displayText, responsePhase, scheduleScrollToBottom]);

  useEffect(() => {
    scheduleScrollToBottom();
  }, [messages, scheduleScrollToBottom]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % 4);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      revealAbortRef.current?.abort();
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const loadSession = useCallback(async () => {
    const params = new URLSearchParams({ workspaceId });
    if (analysisId) params.set("analysisId", analysisId);

    const res = await fetch(`/api/chat/sessions?${params}`);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to load chat.");
      setLoading(false);
      return;
    }

    setChatId(data.chat.id);
    setMessages(data.messages ?? []);
    setContextLabel(data.contextLabel);
    onContextLabelChange?.(data.contextLabel);
    setLoading(false);
  }, [workspaceId, analysisId, onContextLabelChange]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams({ workspaceId });
      if (analysisId) params.set("analysisId", analysisId);

      const res = await fetch(`/api/chat/sessions?${params}`);
      const data = await res.json();
      if (cancelled) return;

      if (!res.ok) {
        setError(data.error ?? "Failed to load chat.");
        setLoading(false);
        return;
      }

      setChatId(data.chat.id);
      setMessages(data.messages ?? []);
      setContextLabel(data.contextLabel);
      onContextLabelChange?.(data.contextLabel);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, analysisId, onContextLabelChange]);

  const runStream = useCallback(
    async (userMessage: string) => {
      if (!chatId || isResponding) return;

      revealAbortRef.current?.abort();
      const abortController = new AbortController();
      revealAbortRef.current = abortController;

      setResponsePhase("buffering");
      setDisplayText("");
      setError(null);
      setUserHasSent(true);

      const optimisticId = `optimistic-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          chat_id: chatId,
          role: "user",
          content: userMessage,
          created_at: new Date().toISOString(),
        },
      ]);

      try {
        const res = await fetch(`/api/chat/sessions/${chatId}/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Stream failed.");
        }

        const fullText = await consumeSseStream(res);
        if (abortController.signal.aborted) return;

        if (!fullText.trim()) {
          await loadSession();
          return;
        }

        setResponsePhase("revealing");

        let scrollCounter = 0;
        await revealTextSmoothly(fullText, setDisplayText, {
          charsPerStep: 6,
          stepMs: 18,
          signal: abortController.signal,
          onStep: () => {
            scrollCounter += 1;
            if (scrollCounter % 4 === 0) {
              scheduleScrollToBottom();
            }
          },
        });

        if (abortController.signal.aborted) return;

        const trimmed = fullText.trim();
        setMessages((prev) => [
          ...prev,
          {
            id: `optimistic-assistant-${Date.now()}`,
            chat_id: chatId,
            role: "assistant",
            content: trimmed,
            created_at: new Date().toISOString(),
          },
        ]);
        setDisplayText("");
        setResponsePhase("idle");
        await loadSession();
        scheduleScrollToBottom();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        await loadSession();
      } finally {
        if (!abortController.signal.aborted) {
          setResponsePhase("idle");
          setDisplayText("");
        }
      }
    },
    [chatId, isResponding, loadSession, scheduleScrollToBottom]
  );

  async function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value || isResponding) return;
    setInput("");
    await runStream(value);
  }

  async function handleClear() {
    if (!chatId || isResponding) return;

    revealAbortRef.current?.abort();

    const res = await fetch(`/api/chat/sessions/${chatId}/messages`, {
      method: "DELETE",
    });
    if (!res.ok) return;

    setMessages([]);
    setUserHasSent(false);
    setDisplayText("");
    setResponsePhase("idle");
    setError(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fafaf9]">
      {variant === "panel" ? (
        <ChatHeader
          contextLabel={contextLabel}
          variant="panel"
          onClear={() => void handleClear()}
          onClose={onClose}
          clearDisabled={isResponding}
        />
      ) : (
        <div className="flex shrink-0 items-center justify-between border-b border-black/[0.05] bg-white/60 px-5 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0d9488]" />
            Briefed on {contextLabel}
          </div>
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={isResponding}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-black/[0.04] hover:text-text-primary disabled:opacity-40"
          >
            Clear conversation
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-5"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent/40"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm text-text-muted">Loading strategist session…</p>
          </div>
        )}

        {!loading && messages.length === 0 && !isResponding && (
          <ChatEmptyState contextLabel={contextLabel} onSelectPrompt={handleSend} />
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        )}

        <div className="mx-auto max-w-2xl space-y-8">
          {messages.map((msg) => {
            if (msg.role === "user") {
              return <ChatUserMessage key={msg.id} content={msg.content} />;
            }

            return (
              <ChatAssistantMessage
                key={msg.id}
                content={msg.content}
                contextLabel={contextLabel}
              />
            );
          })}

          {isResponding && (
            <ChatAssistantMessage
              content=""
              contextLabel={contextLabel}
              animate={false}
              isStreaming
              streamText={responsePhase === "revealing" ? displayText : undefined}
            />
          )}
        </div>
      </div>

      <ChatInputArea
        input={input}
        placeholderIndex={placeholderIndex}
        disabled={isResponding || loading}
        showQuickActions={!userHasSent && !isResponding}
        onInputChange={setInput}
        onSend={handleSend}
      />
    </div>
  );
}
