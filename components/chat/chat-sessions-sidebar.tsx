"use client";

import { formatAnalysisDateTime } from "@/lib/analyses/utils";
import type { ChatSessionSummary } from "@/lib/types/chat";

type ChatSessionsSidebarProps = {
  sessions: ChatSessionSummary[];
  activeChatId: string | null;
  loading?: boolean;
  onSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDelete: (chatId: string) => void;
  compact?: boolean;
};

function sessionLabel(session: ChatSessionSummary): string {
  if (session.title) return session.title;
  return "New conversation";
}

function sessionDate(session: ChatSessionSummary): string {
  return formatAnalysisDateTime(session.updated_at);
}

export function ChatSessionsSidebar({
  sessions,
  activeChatId,
  loading = false,
  onSelect,
  onNewChat,
  onDelete,
  compact = false,
}: ChatSessionsSidebarProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 border-b border-white/[0.08] bg-[#080711]/40 px-3 py-2 backdrop-blur-xl">
        <button
          type="button"
          onClick={onNewChat}
          className="dash-btn-secondary shrink-0 px-3 py-1.5 text-[12px]"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          New chat
        </button>
        {sessions.length > 0 && (
          <select
            value={activeChatId ?? ""}
            onChange={(e) => {
              if (e.target.value) onSelect(e.target.value);
            }}
            className="input-field min-w-0 flex-1 truncate px-2.5 py-1.5 text-[12px]"
            aria-label="Previous chats"
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {sessionLabel(session)}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-white/[0.08] bg-[#080711]/30 backdrop-blur-xl">
      <div className="border-b border-white/[0.08] p-3">
        <button
          type="button"
          onClick={onNewChat}
          className="dash-btn-secondary w-full py-2.5 text-[13px]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-none">
        {loading && (
          <p className="px-2 py-4 text-center text-[12px] text-white/40">
            Loading chats…
          </p>
        )}

        {!loading && sessions.length === 0 && (
          <p className="px-2 py-4 text-center text-[12px] leading-relaxed text-white/40">
            No conversations yet. Start a new chat.
          </p>
        )}

        <ul className="space-y-0.5">
          {sessions.map((session) => {
            const active = session.id === activeChatId;
            return (
              <li key={session.id}>
                <div
                  className={`group flex items-stretch rounded-lg transition-colors ${
                    active
                      ? "border-l-2 border-l-accent bg-white/[0.06]"
                      : "border-l-2 border-l-transparent hover:bg-white/[0.04]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(session.id)}
                    className="min-w-0 flex-1 px-3 py-2.5 text-left"
                  >
                    <p
                      className={`truncate text-[13px] ${
                        active ? "font-semibold text-white" : "font-medium text-white/75"
                      }`}
                    >
                      {sessionLabel(session)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/40">
                      {sessionDate(session)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(session.id)}
                    className="flex w-8 shrink-0 items-center justify-center rounded-r-lg text-white/35 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    aria-label={`Delete ${sessionLabel(session)}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path
                        d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
