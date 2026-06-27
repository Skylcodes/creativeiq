"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { platformLabel } from "@/lib/hooks/constants";
import { findSimilarHooks } from "@/lib/hooks/filter";
import { HookTagPill } from "./hook-tag-pill";
import { HookFavoriteButton } from "./hook-favorite-button";
import { CopyButton } from "@/components/report/shared/copy-button";
import { updateHook, toggleTestQueue } from "@/lib/hooks/actions";
import { useState, useTransition } from "react";
import { HOOK_PRESET_ANGLE_TAGS } from "@/lib/hooks/constants";

type HookDetailPanelProps = {
  hook: HookLibraryEntry;
  allHooks: HookLibraryEntry[];
  onClose: () => void;
  onUpdated: (hook: HookLibraryEntry) => void;
};

export function HookDetailPanel({
  hook,
  allHooks,
  onClose,
  onUpdated,
}: HookDetailPanelProps) {
  const [notes, setNotes] = useState(hook.notes ?? "");
  const [angleTags, setAngleTags] = useState(hook.angle_tags.join(", "));
  const [pending, startTransition] = useTransition();
  const similar = findSimilarHooks(hook, allHooks);

  const sourceLink =
    hook.source_analysis_id
      ? `/report/${hook.source_analysis_id}`
      : hook.source_brief_id
        ? `/brief/${hook.source_brief_id}`
        : null;

  function saveNotes() {
    startTransition(async () => {
      const tags = angleTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await updateHook(hook.id, { notes: notes || null, angleTags: tags });
      if (res.success && res.hook) onUpdated(res.hook);
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close panel"
        className="fixed inset-0 z-40 modal-overlay"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col dashboard-panel rounded-none rounded-l-[var(--radius-xl)] border-y-0 border-r-0 shadow-[-16px_0_48px_rgba(43,24,95,0.08)]"
      >
        <div className="app-topbar flex items-center justify-between px-5 py-4">
          <p className="text-sm font-semibold text-text-primary">Hook detail</p>
          <button type="button" onClick={onClose} className="app-topbar-icon-btn">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <p className="font-display text-xl font-semibold leading-snug text-text-primary">
            &ldquo;{hook.hook_text}&rdquo;
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {hook.platform && <HookTagPill label={platformLabel(hook.platform)} variant="platform" />}
            {hook.angle_tags.map((t) => (
              <HookTagPill key={t} label={t} variant="angle" />
            ))}
            {hook.source_score != null && (
              <HookTagPill label="" variant="score" score={hook.source_score} />
            )}
          </div>

          <div className="mt-6 space-y-4 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Source</p>
              <p className="mt-1 text-text-secondary">
                {hook.source_type === "manual" ? "Manually added" : "Advara generated"}
              </p>
              {sourceLink && (
                <Link href={sourceLink} className="mt-1 inline-block text-accent hover:underline">
                  View source {hook.source_kind === "brief" ? "brief" : "report"} →
                </Link>
              )}
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Added</p>
              <p className="mt-1 text-text-secondary">
                {new Date(hook.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="field-stack">
              <label className="field-label text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Angle tags (comma-separated)
              </label>
              <input
                value={angleTags}
                onChange={(e) => setAngleTags(e.target.value)}
                list="preset-angles"
                className="input-field"
              />
              <datalist id="preset-angles">
                {HOOK_PRESET_ANGLE_TAGS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div className="field-stack">
              <label className="field-label text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="input-field leading-relaxed"
              />
              <button
                type="button"
                disabled={pending}
                onClick={saveNotes}
                className="mt-2 text-xs font-semibold text-accent hover:underline"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>

            {similar.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Similar hooks
                </p>
                <ul className="mt-2 space-y-2">
                  {similar.map((s) => (
                    <li key={s.id} className="dashboard-list-row p-3 text-sm text-text-secondary">
                      &ldquo;{s.hook_text.length > 100 ? `${s.hook_text.slice(0, 100)}…` : s.hook_text}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="app-topbar border-t border-white/65 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CopyButton text={hook.hook_text} label="Copy hook" className="flex-1 justify-center py-2.5" />
            <HookFavoriteButton hookId={hook.id} favorited={hook.is_favorited} size="md" />
            <button
              type="button"
              onClick={() => {
                startTransition(async () => {
                  const res = await toggleTestQueue(hook.id);
                  if (res.success && res.hook) onUpdated(res.hook);
                });
              }}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                hook.is_in_test_queue
                  ? "bg-violet-500/10 text-violet-700"
                  : "dashboard-panel text-text-secondary hover:text-amber-600"
              }`}
            >
              {hook.is_in_test_queue ? "In test queue" : "Add to test queue"}
            </button>
          </div>
          <Link
            href={`/brief/new?angle=${encodeURIComponent(hook.hook_text)}&platform=${hook.platform ?? ""}`}
            className="btn-premium w-full justify-center text-sm"
          >
            Use as brief starting point
          </Link>
        </div>
      </motion.aside>
    </>
  );
}
