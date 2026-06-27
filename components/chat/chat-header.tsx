"use client";

type ChatHeaderProps = {
  contextLabel: string;
  variant?: "panel" | "page";
  onClear?: () => void;
  onNewChat?: () => void;
  onClose?: () => void;
  clearDisabled?: boolean;
  newChatDisabled?: boolean;
};

export function ChatHeader({
  contextLabel,
  variant = "panel",
  onClear,
  onNewChat,
  onClose,
  clearDisabled,
  newChatDisabled,
}: ChatHeaderProps) {
  const isPanel = variant === "panel";

  return (
    <header className="relative shrink-0 overflow-hidden border-b border-white/[0.08] bg-[#080711]/50 backdrop-blur-xl">
      <div
        className={`relative ${isPanel ? "px-4 py-4" : "px-5 py-5 md:px-6"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="icon-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.1]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden
              >
                <path
                  d="M9 2L11 6.5H16L12 9.5L13.5 15L9 12L4.5 15L6 9.5L2 6.5H7L9 2Z"
                  stroke="#a78bfa"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-tight text-white">
                Creative Director
              </p>
              <p className="mt-0.5 text-xs text-white/45">
                Senior creative strategist · AI-powered
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {onNewChat && (
              <button
                type="button"
                onClick={onNewChat}
                disabled={newChatDisabled}
                className="dash-btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40"
              >
                New chat
              </button>
            )}
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                disabled={clearDisabled}
                className="dropdown-item rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                Clear
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="dropdown-item flex h-8 w-8 items-center justify-center rounded-lg"
                aria-label="Close chat"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M4 4L12 12M12 4L4 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="app-chip gap-1.5 px-2.5 py-1 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            Briefed on your analysis
          </span>
          <span className="truncate text-[11px] text-white/45">
            {contextLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
