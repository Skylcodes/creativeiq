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
    <header className="premium-card-glass relative shrink-0 overflow-hidden border-b border-[rgba(55,41,111,0.09)]">
      <div
        className={`relative ${isPanel ? "px-4 py-4" : "px-5 py-5 md:px-6"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="icon-badge h-10 w-10 shrink-0 rounded-xl">
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden
              >
                <path
                  d="M9 2L11 6.5H16L12 9.5L13.5 15L9 12L4.5 15L6 9.5L2 6.5H7L9 2Z"
                  stroke="#6947ff"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-tight text-text-primary">
                Creative Director
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
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
                className="dropdown-item rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted disabled:opacity-40"
              >
                Clear
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="dropdown-item flex h-8 w-8 items-center justify-center rounded-lg text-text-muted"
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
          <span className="insight-chip gap-1.5 px-2.5 py-1 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0d9488]" />
            Briefed on your analysis
          </span>
          <span className="truncate text-[11px] text-text-muted">
            {contextLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
