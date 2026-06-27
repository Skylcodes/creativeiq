"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { revealTextSmoothly } from "@/lib/chat/smooth-reveal";
import { useBilling } from "@/components/billing/billing-provider";
import { isAccountBlocked } from "@/lib/billing/checkout-client";
import type { CreativeDirectorMessage } from "@/lib/types/chat";
import { ChatAssistantMessage } from "./chat-assistant-message";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatHeader } from "./chat-header";
import { ChatInputArea } from "./chat-input-area";
import { ChatUserMessage } from "./chat-user-message";

type CreativeDirectorChatProps = {
  workspaceId: string;
  analysisId?: string | null;
  chatId: string | null;
  contextLabel: string;
  onContextLabelChange?: (label: string) => void;
  onSessionUpdated?: () => void;
  variant?: "panel" | "page";
  onClose?: () => void;
  onNewChat?: () => void;
  sessionsSlot?: React.ReactNode;
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
  chatId,
  contextLabel: initialContextLabel,
  onContextLabelChange,
  onSessionUpdated,
  variant = "panel",
  onClose,
  onNewChat,
  sessionsSlot,
}: CreativeDirectorChatProps) {
  const [messages, setMessages] = useState<CreativeDirectorMessage[]>([]);
  const [contextLabel, setContextLabel] = useState(initialContextLabel);
  const [input, setInput] = useState("");
  const [responsePhase, setResponsePhase] = useState<ResponsePhase>("idle");
  const [displayText, setDisplayText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [userHasSent, setUserHasSent] = useState(false);
  const { ensureCanAct, showBlocked } = useBilling();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const revealAbortRef = useRef<AbortController | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  const isResponding = responsePhase !== "idle";

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const scheduleScrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        scrollToBottom(behavior);
      });
    },
    [scrollToBottom],
  );

  useLayoutEffect(() => {
    if (loading) return;
    scheduleScrollToBottom("auto");
    const t = window.setTimeout(() => scrollToBottom("auto"), 0);
    return () => window.clearTimeout(t);
  }, [loading, messages, chatId, isResponding, scheduleScrollToBottom, scrollToBottom]);

  useEffect(() => {
    if (responsePhase === "revealing") {
      scheduleScrollToBottom("auto");
    }
  }, [displayText, responsePhase, scheduleScrollToBottom]);

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
    revealAbortRef.current?.abort();
    setResponsePhase("idle");
    setDisplayText("");
    setInput("");

    if (!chatId) {
      setMessages([]);
      setUserHasSent(false);
      setContextLabel(initialContextLabel);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ chatId });
    const res = await fetch(`/api/chat/sessions?${params}`);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to load chat.");
      setLoading(false);
      return;
    }

    setMessages(data.messages ?? []);
    setContextLabel(data.contextLabel);
    onContextLabelChange?.(data.contextLabel);
    setUserHasSent((data.messages ?? []).some(
      (m: CreativeDirectorMessage) => m.role === "user",
    ));
    setLoading(false);
  }, [chatId, initialContextLabel, onContextLabelChange]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadSession();
    });
    return () => cancelAnimationFrame(frame);
  }, [chatId, loadSession]);

  const runStream = useCallback(
    async (userMessage: string) => {
      if (!chatId || isResponding) return;
      if (!ensureCanAct("chat_messages")) return;

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
      scheduleScrollToBottom("smooth");

      try {
        const res = await fetch(`/api/chat/sessions/${chatId}/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 402 && isAccountBlocked(data)) {
            showBlocked({ reason: data.blockReason, feature: data.feature });
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            setResponsePhase("idle");
            return;
          }
          throw new Error(data.error ?? "Stream failed.");
        }

        const fullText = await consumeSseStream(res);
        if (abortController.signal.aborted) return;

        if (!fullText.trim()) {
          await loadSession();
          onSessionUpdated?.();
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
              scheduleScrollToBottom("auto");
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
        onSessionUpdated?.();
        scheduleScrollToBottom("auto");
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
    [
      chatId,
      isResponding,
      loadSession,
      onSessionUpdated,
      scheduleScrollToBottom,
      ensureCanAct,
      showBlocked,
    ],
  );

  async function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value || isResponding || !chatId) return;
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
    onSessionUpdated?.();
  }

  const noActiveChat = !chatId;
  const lastMessageIndex = messages.length - 1;

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      {sessionsSlot}

      {variant === "panel" ? (
        <ChatHeader
          contextLabel={contextLabel}
          variant="panel"
          onClear={() => void handleClear()}
          onNewChat={onNewChat}
          onClose={onClose}
          clearDisabled={isResponding || noActiveChat}
          newChatDisabled={isResponding}
        />
      ) : (
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#080711]/40 px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[11px] text-white/45">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            Briefed on {contextLabel}
          </div>
          <div className="flex items-center gap-2">
            {onNewChat && (
              <button
                type="button"
                onClick={onNewChat}
                disabled={isResponding}
                className="dash-btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
              >
                New chat
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={isResponding || noActiveChat}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-white/45 hover:text-white/70 disabled:opacity-40"
            >
              Clear conversation
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5">
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
            <p className="mt-3 text-sm text-white/45">
              Loading strategist session…
            </p>
          </div>
        )}

        {!loading && noActiveChat && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-display text-lg font-semibold text-white">
              Start a new conversation
            </p>
            <p className="mt-2 max-w-sm text-sm text-white/55">
              Each chat is saved separately. Click &ldquo;New chat&rdquo; to begin.
            </p>
            {onNewChat && (
              <button
                type="button"
                onClick={onNewChat}
                className="dash-btn-secondary mt-6 text-sm"
              >
                New chat
              </button>
            )}
          </div>
        )}

        {!loading && !noActiveChat && messages.length === 0 && !isResponding && (
          <ChatEmptyState
            contextLabel={contextLabel}
            onSelectPrompt={handleSend}
          />
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        )}

        <div className="mx-auto flex max-w-2xl flex-col justify-end space-y-6">
          {messages.map((msg, index) => {
            const isLatest = index === lastMessageIndex && !isResponding;

            if (msg.role === "user") {
              return (
                <ChatUserMessage
                  key={msg.id}
                  content={msg.content}
                  defaultExpanded={isLatest}
                />
              );
            }

            return (
              <ChatAssistantMessage
                key={msg.id}
                content={msg.content}
                contextLabel={contextLabel}
                defaultExpanded={isLatest}
              />
            );
          })}

          {isResponding && (
            <ChatAssistantMessage
              content=""
              contextLabel={contextLabel}
              animate={false}
              isStreaming
              defaultExpanded
              streamText={
                responsePhase === "revealing" ? displayText : undefined
              }
            />
          )}

          <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
        </div>
      </div>

      <ChatInputArea
        input={input}
        placeholderIndex={placeholderIndex}
        disabled={isResponding || loading || noActiveChat}
        showQuickActions={!userHasSent && !isResponding && !noActiveChat}
        onInputChange={setInput}
        onSend={handleSend}
      />
    </div>
  );
}
