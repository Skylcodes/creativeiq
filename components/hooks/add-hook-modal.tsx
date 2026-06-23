"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  HOOK_PLATFORMS,
  HOOK_PRESET_ANGLE_TAGS,
  MANUAL_SOURCE_CATEGORIES,
} from "@/lib/hooks/constants";
import { createManualHook } from "@/lib/hooks/actions";
import type { ManualSourceCategoryId } from "@/lib/hooks/constants";

type AddHookModalProps = {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const fieldClass =
  "w-full rounded-2xl border border-border-strong bg-white/[0.88] px-4 py-3 text-sm text-text-primary shadow-[0_1px_1px_rgba(255,255,255,0.75)_inset,0_8px_24px_rgba(43,24,95,0.045)] outline-none transition-all placeholder:text-text-muted focus:border-accent/[0.45] focus:bg-white focus:ring-4 focus:ring-accent/[0.12]";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted";

export function AddHookModal({
  workspaceId,
  open,
  onClose,
  onCreated,
}: AddHookModalProps) {
  const [hookText, setHookText] = useState("");
  const [platform, setPlatform] = useState("");
  const [angleTag, setAngleTag] = useState("");
  const [customAngle, setCustomAngle] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceCategory, setSourceCategory] = useState<ManualSourceCategoryId>("my_own_idea");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const angleTags =
    angleTag === "custom" && customAngle.trim()
      ? [customAngle.trim()]
      : angleTag
        ? [angleTag]
        : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createManualHook({
        workspaceId,
        hookText,
        platform: platform || undefined,
        angleTags,
        manualSourceCategory: sourceCategory,
        notes: notes || undefined,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setHookText("");
      setPlatform("");
      setAngleTag("");
      setCustomAngle("");
      setNotes("");
      onCreated();
      onClose();
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[rgba(8,7,17,0.42)] backdrop-blur-[6px]"
            onClick={pending ? undefined : onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="premium-card premium-card-elevated fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,720px)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-hook-title"
          >
            <div className="shrink-0 border-b border-white/65 px-6 py-5">
              <h2
                id="add-hook-title"
                className="font-display text-xl font-semibold text-text-primary"
              >
                Add Hook
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Save a hook from anywhere — competitor ads, inspiration, or your own ideas.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <div>
                  <label htmlFor="hook-text" className={labelClass}>
                    Hook
                  </label>
                  <textarea
                    id="hook-text"
                    value={hookText}
                    onChange={(e) => setHookText(e.target.value)}
                    rows={4}
                    required
                    autoFocus
                    placeholder="The opening line or hook text…"
                    className={`${fieldClass} resize-none leading-relaxed`}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="hook-platform" className={labelClass}>
                      Platform
                    </label>
                    <select
                      id="hook-platform"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Any platform</option>
                      {HOOK_PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="hook-angle" className={labelClass}>
                      Angle type
                    </label>
                    <select
                      id="hook-angle"
                      value={angleTag}
                      onChange={(e) => setAngleTag(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">None</option>
                      {HOOK_PRESET_ANGLE_TAGS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="custom">Custom tag…</option>
                    </select>
                  </div>
                </div>

                {angleTag === "custom" && (
                  <div>
                    <label htmlFor="hook-custom-angle" className={labelClass}>
                      Custom angle
                    </label>
                    <input
                      id="hook-custom-angle"
                      value={customAngle}
                      onChange={(e) => setCustomAngle(e.target.value)}
                      placeholder="Custom angle tag"
                      className={fieldClass}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="hook-source" className={labelClass}>
                    Source
                  </label>
                  <select
                    id="hook-source"
                    value={sourceCategory}
                    onChange={(e) =>
                      setSourceCategory(e.target.value as ManualSourceCategoryId)
                    }
                    className={fieldClass}
                  >
                    {MANUAL_SOURCE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="hook-notes" className={labelClass}>
                    Notes (optional)
                  </label>
                  <textarea
                    id="hook-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g. Saw on competitor TikTok · 3.2% CTR in August"
                    className={`${fieldClass} resize-none`}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-white/65 bg-white/40 px-6 py-4 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  className="btn-surface text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-premium text-sm"
                >
                  {pending ? "Saving…" : "Save Hook"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
