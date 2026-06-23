"use client";

import { useState, useTransition } from "react";
import { toggleHookFavorite } from "@/lib/hooks/actions";

type HookFavoriteButtonProps = {
  hookId: string;
  favorited: boolean;
  size?: "sm" | "md";
  onToggle?: (favorited: boolean) => void;
};

export function HookFavoriteButton({
  hookId,
  favorited,
  size = "sm",
  onToggle,
}: HookFavoriteButtonProps) {
  const [active, setActive] = useState(favorited);
  const [pending, startTransition] = useTransition();

  const dim = size === "md" ? "h-9 w-9" : "h-8 w-8";

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      onClick={() => {
        startTransition(async () => {
          const res = await toggleHookFavorite(hookId);
          if (res.success && res.hook) {
            setActive(res.hook.is_favorited);
            onToggle?.(res.hook.is_favorited);
          }
        });
      }}
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/25"
          : "dashboard-panel text-text-muted hover:text-amber-600"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill={active ? "currentColor" : "none"} aria-hidden>
        <path
          d="M8 2.5L9.8 6.2L13.8 6.7L10.9 9.5L11.7 13.5L8 11.5L4.3 13.5L5.1 9.5L2.2 6.7L6.2 6.2L8 2.5Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
