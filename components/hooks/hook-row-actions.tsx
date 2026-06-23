"use client";

import { useState, useTransition } from "react";
import type { HookLibraryEntry, SaveGeneratedHookInput } from "@/lib/types/hook";
import { hookTextKey } from "@/lib/hooks/utils";
import { saveGeneratedHook } from "@/lib/hooks/actions";
import { HookFavoriteButton } from "./hook-favorite-button";
import { CopyButton } from "@/components/report/shared/copy-button";
import { useToast } from "@/components/shared/toast";

export type HookSaveContext = Omit<SaveGeneratedHookInput, "hookText">;

type HookRowActionsProps = {
  hookText: string;
  hookEntry?: HookLibraryEntry | null;
  saveContext?: HookSaveContext;
  onSaved?: (hook: HookLibraryEntry) => void;
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

export function HookRowActions(props: HookRowActionsProps) {
  const entryKey = props.hookEntry?.id ?? hookTextKey(props.hookText);
  return <HookRowActionsInner key={entryKey} {...props} />;
}

function HookRowActionsInner({
  hookText,
  hookEntry,
  saveContext,
  onSaved,
  onFavoriteChange,
}: HookRowActionsProps) {
  const [saved, setSaved] = useState(hookEntry);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleSave() {
    if (!saveContext) return;
    startTransition(async () => {
      const res = await saveGeneratedHook({ ...saveContext, hookText });
      if (res.success && res.hook) {
        setSaved(res.hook);
        onSaved?.(res.hook);
        showToast("Hook saved to library.");
      } else if (!res.success) {
        showToast(res.error ?? "Could not save hook.");
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {saved ? (
        <HookSavedIndicator hookEntry={saved} />
      ) : saveContext ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0d9488]/25 bg-[#0d9488]/8 px-3 py-1.5 text-xs font-semibold text-[#0d9488] transition-colors hover:bg-[#0d9488]/12 disabled:opacity-60"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M6 2V10M2 6H10"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          {pending ? "Saving…" : "Save to library"}
        </button>
      ) : null}
      {saved && (
        <HookFavoriteButton
          hookId={saved.id}
          favorited={saved.is_favorited}
          onToggle={onFavoriteChange}
        />
      )}
      <CopyButton text={hookText} label="Copy" />
    </div>
  );
}
