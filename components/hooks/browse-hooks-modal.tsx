"use client";

import { useMemo, useState } from "react";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { filterAndSortHooks, DEFAULT_HOOK_FILTERS } from "@/lib/hooks/filter";
import { platformLabel } from "@/lib/hooks/constants";
import { HookTagPill } from "./hook-tag-pill";

type BrowseHooksModalProps = {
  hooks: HookLibraryEntry[];
  open: boolean;
  onClose: () => void;
  onSelect: (hookText: string) => void;
};

export function BrowseHooksModal({
  hooks,
  open,
  onClose,
  onSelect,
}: BrowseHooksModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => filterAndSortHooks(hooks, { ...DEFAULT_HOOK_FILTERS, search }),
    [hooks, search],
  );

  if (!open) return null;

  return (
    <div className="modal-overlay p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="modal-panel relative z-10 flex max-h-[80vh] w-full max-w-xl flex-col">
        <div className="border-b border-white/65 p-5">
          <h2 className="font-display text-lg font-semibold">
            Browse hook library
          </h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hooks…"
            className="input-field mt-3 px-4 py-2.5 text-sm"
            autoFocus
          />
        </div>
        <ul className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 && (
            <li className="p-6 text-center text-sm text-text-muted">
              No hooks found.
            </li>
          )}
          {filtered.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(h.hook_text);
                  onClose();
                }}
                className="w-full rounded-xl p-4 text-left transition-colors hover:bg-accent/[0.04]"
              >
                <p className="text-sm font-medium leading-relaxed text-text-primary">
                  &ldquo;{h.hook_text}&rdquo;
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {h.platform && (
                    <HookTagPill
                      label={platformLabel(h.platform)}
                      variant="platform"
                    />
                  )}
                  {h.is_favorited && (
                    <HookTagPill label="Favorited" variant="custom" />
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
