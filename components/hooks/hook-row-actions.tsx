"use client";

import type { HookLibraryEntry } from "@/lib/types/hook";
import { hookTextKey } from "@/lib/hooks/utils";
import { HookFavoriteButton } from "./hook-favorite-button";
import { CopyButton } from "@/components/report/shared/copy-button";

type HookRowActionsProps = {
  hookText: string;
  hookEntry?: HookLibraryEntry | null;
  onFavoriteChange?: (favorited: boolean) => void;
};

export function HookSavedIndicator({ hookEntry }: { hookEntry?: HookLibraryEntry | null }) {
  if (!hookEntry) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#0d9488]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0d9488]">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      Saved to library
    </span>
  );
}

export function matchHookInLibrary(
  hookText: string,
  lookup: Map<string, HookLibraryEntry>
): HookLibraryEntry | undefined {
  return lookup.get(hookTextKey(hookText));
}

export function HookRowActions({ hookText, hookEntry, onFavoriteChange }: HookRowActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <HookSavedIndicator hookEntry={hookEntry} />
      {hookEntry && (
        <HookFavoriteButton
          hookId={hookEntry.id}
          favorited={hookEntry.is_favorited}
          onToggle={onFavoriteChange}
        />
      )}
      <CopyButton text={hookText} label="Copy" />
    </div>
  );
}
