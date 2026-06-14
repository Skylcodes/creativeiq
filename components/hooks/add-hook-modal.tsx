"use client";

import { useState, useTransition } from "react";
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

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <h2 className="font-display text-xl font-semibold text-text-primary">Add Hook</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Save a hook from anywhere — competitor ads, inspiration, or your own ideas.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Hook
            </label>
            <textarea
              value={hookText}
              onChange={(e) => setHookText(e.target.value)}
              rows={4}
              required
              placeholder="The opening line or hook text…"
              className="mt-1.5 w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm leading-relaxed text-text-primary outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Any platform</option>
                {HOOK_PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Angle type
              </label>
              <select
                value={angleTag}
                onChange={(e) => setAngleTag(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm"
              >
                <option value="">None</option>
                {HOOK_PRESET_ANGLE_TAGS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="custom">Custom tag…</option>
              </select>
            </div>
          </div>

          {angleTag === "custom" && (
            <input
              value={customAngle}
              onChange={(e) => setCustomAngle(e.target.value)}
              placeholder="Custom angle tag"
              className="w-full rounded-xl border border-black/[0.08] px-4 py-2.5 text-sm"
            />
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Source
            </label>
            <select
              value={sourceCategory}
              onChange={(e) => setSourceCategory(e.target.value as ManualSourceCategoryId)}
              className="mt-1.5 w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm"
            >
              {MANUAL_SOURCE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Saw on competitor TikTok · 3.2% CTR in August"
              className="mt-1.5 w-full rounded-xl border border-black/[0.08] px-4 py-2.5 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary text-sm">
              {pending ? "Saving…" : "Save Hook"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
