"use client";

import { useMemo, useState } from "react";
import type { HookLibraryEntry, HookLibraryStats } from "@/lib/types/hook";
import type { Workspace } from "@/lib/types/workspace";
import {
  HOOK_PLATFORMS,
  HOOK_PRESET_ANGLE_TAGS,
  HOOK_SORT_OPTIONS,
  HOOK_SOURCE_TYPES,
  platformLabel,
} from "@/lib/hooks/constants";
import {
  DEFAULT_HOOK_FILTERS,
  filterAndSortHooks,
  type HookFilters,
} from "@/lib/hooks/filter";
import { downloadHooksCsv, formatHooksForClipboard } from "@/lib/hooks/export";
import {
  deleteHook,
  deleteHooksBulk,
  addCustomTagToHooks,
} from "@/lib/hooks/actions";
import { AddHookModal } from "./add-hook-modal";
import { HookDetailPanel } from "./hook-detail-panel";
import { HookLibraryEmpty } from "./hook-library-empty";
import { ManageTagsModal } from "./manage-tags-modal";
import { HookTagPill } from "./hook-tag-pill";
import { HookFavoriteButton } from "./hook-favorite-button";
import { CopyButton } from "@/components/report/shared/copy-button";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell, PageHeader } from "@/components/ui/page-shell";

type HookLibraryExperienceProps = {
  workspace: Workspace;
  hooks: HookLibraryEntry[];
  stats: HookLibraryStats;
  customTags: string[];
};

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? "bg-accent text-white"
          : "insight-chip hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

export function HookLibraryExperience({
  workspace,
  hooks: initialHooks,
  stats,
  customTags,
}: HookLibraryExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hooks, setHooks] = useState(initialHooks);
  const [filters, setFilters] = useState<HookFilters>(() => ({
    ...DEFAULT_HOOK_FILTERS,
    testQueue: searchParams.get("queue") === "1",
  }));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailHook, setDetailHook] = useState<HookLibraryEntry | null>(null);
  const [addOpen, setAddOpen] = useState(searchParams.get("add") === "1");
  const [tagsOpen, setTagsOpen] = useState(false);
  const [bulkTag, setBulkTag] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterAndSortHooks(hooks, filters),
    [hooks, filters],
  );

  const allTags = useMemo(
    () =>
      [
        ...new Set([...customTags, ...hooks.flatMap((h) => h.custom_tags)]),
      ].sort(),
    [customTags, hooks],
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function refreshFromServer() {
    router.refresh();
  }

  function updateHookLocal(updated: HookLibraryEntry) {
    setHooks((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    if (detailHook?.id === updated.id) setDetailHook(updated);
  }

  async function handleDelete(id: string) {
    await deleteHook(id);
    setHooks((prev) => prev.filter((h) => h.id !== id));
    setConfirmDeleteId(null);
    if (detailHook?.id === id) setDetailHook(null);
  }

  async function handleBulkDelete() {
    await deleteHooksBulk([...selected]);
    setHooks((prev) => prev.filter((h) => !selected.has(h.id)));
    setSelected(new Set());
  }

  async function handleBulkTag() {
    if (!bulkTag.trim()) return;
    await addCustomTagToHooks([...selected], bulkTag.trim());
    setBulkTag("");
    refreshFromServer();
  }

  const sourceLink = (h: HookLibraryEntry) => {
    if (h.source_analysis_id) return `/report/${h.source_analysis_id}`;
    if (h.source_brief_id) return `/brief/${h.source_brief_id}`;
    return null;
  };

  return (
    <PageShell className="pb-28 md:pb-16">
      <PageHeader
        title="Hook Library"
        description="Your growing collection of hooks — auto-captured and hand-picked"
        action={
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadHooksCsv(hooks)}
              className="btn-ghost text-sm"
            >
              Export Library
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="btn-premium text-sm"
            >
              Add Hook
            </button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { label: `${stats.total} total` },
          {
            label: `${stats.advaraGenerated} from Advara`,
            accent: true,
          },
          { label: `${stats.manual} manual` },
        ].map((pill) => (
          <span
            key={pill.label}
            className={`insight-chip text-xs font-semibold ${pill.accent ? "border-accent/15 text-accent" : ""}`}
          >
            {pill.label}
          </span>
        ))}
      </div>

      {hooks.length === 0 ? (
        <HookLibraryEmpty />
      ) : (
        <>
          <div className="mt-8">
            <input
              type="search"
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              placeholder="Search hooks and notes…"
              className="premium-card w-full px-5 py-3.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/10"
            />
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mr-1">
                Platform
              </span>
              <FilterPill
                active={!filters.platform}
                onClick={() => setFilters((f) => ({ ...f, platform: null }))}
              >
                All
              </FilterPill>
              {HOOK_PLATFORMS.map((p) => (
                <FilterPill
                  key={p.id}
                  active={filters.platform === p.id}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      platform: f.platform === p.id ? null : p.id,
                    }))
                  }
                >
                  {p.label}
                </FilterPill>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mr-1">
                Angle
              </span>
              <FilterPill
                active={!filters.angleTag}
                onClick={() => setFilters((f) => ({ ...f, angleTag: null }))}
              >
                All
              </FilterPill>
              {HOOK_PRESET_ANGLE_TAGS.map((t) => (
                <FilterPill
                  key={t}
                  active={filters.angleTag === t}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      angleTag: f.angleTag === t ? null : t,
                    }))
                  }
                >
                  {t}
                </FilterPill>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterPill
                active={filters.sourceType === "all"}
                onClick={() => setFilters((f) => ({ ...f, sourceType: "all" }))}
              >
                All sources
              </FilterPill>
              {HOOK_SOURCE_TYPES.map((s) => (
                <FilterPill
                  key={s.id}
                  active={filters.sourceType === s.id}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      sourceType: f.sourceType === s.id ? "all" : s.id,
                    }))
                  }
                >
                  {s.label}
                </FilterPill>
              ))}
              <FilterPill
                active={filters.favorited === "yes"}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    favorited: f.favorited === "yes" ? "all" : "yes",
                  }))
                }
              >
                Favorited
              </FilterPill>
              <FilterPill
                active={filters.testQueue}
                onClick={() =>
                  setFilters((f) => ({ ...f, testQueue: !f.testQueue }))
                }
              >
                Test queue
              </FilterPill>
              <select
                value={filters.sort}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    sort: e.target.value as HookFilters["sort"],
                  }))
                }
                className="insight-chip ml-auto cursor-pointer px-3 py-1.5 text-xs font-medium"
              >
                {HOOK_SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setTagsOpen(true)}
                className="text-xs font-semibold text-accent hover:underline"
              >
                Manage tags
              </button>
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Custom
                </span>
                {allTags.map((t) => (
                  <FilterPill
                    key={t}
                    active={filters.customTag === t}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        customTag: f.customTag === t ? null : t,
                      }))
                    }
                  >
                    {t}
                  </FilterPill>
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 text-xs text-text-muted">
            {filtered.length} hook{filtered.length !== 1 ? "s" : ""}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((h) => {
              const link = sourceLink(h);
              const isSelected = selected.has(h.id);
              return (
                <motion.article
                  key={h.id}
                  layout
                  onClick={() => setDetailHook(h)}
                  className={`premium-card premium-card-interactive group relative cursor-pointer p-5 ${
                    isSelected ? "ring-2 ring-accent/20" : ""
                  }`}
                >
                  <label
                    className="absolute left-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 has-[:checked]:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(h.id)}
                      className="h-4 w-4 rounded border-[rgba(55,41,111,0.2)] accent-accent"
                    />
                  </label>

                  <p className="pr-6 font-display text-[17px] font-medium leading-snug text-text-primary">
                    &ldquo;{h.hook_text}&rdquo;
                  </p>

                  {h.notes && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-muted">
                      {h.notes}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {h.platform && (
                      <HookTagPill
                        label={platformLabel(h.platform)}
                        variant="platform"
                      />
                    )}
                    {h.angle_tags.slice(0, 2).map((t) => (
                      <HookTagPill key={t} label={t} variant="angle" />
                    ))}
                    <HookTagPill
                      label={
                        h.source_type === "manual" ? "Manual" : "Advara"
                      }
                      variant="source"
                    />
                    {h.source_score != null && (
                      <HookTagPill
                        label=""
                        variant="score"
                        score={h.source_score}
                      />
                    )}
                    {h.is_in_test_queue && (
                      <HookTagPill label="Test queue" variant="custom" />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-text-muted">
                    <span>
                      {new Date(h.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {link && (
                      <Link
                        href={link}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-accent hover:underline"
                      >
                        View source
                      </Link>
                    )}
                  </div>

                  <div
                    className="mt-4 flex items-center justify-end gap-2 border-t border-white/65 pt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {confirmDeleteId === h.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDelete(h.id)}
                          className="text-xs font-semibold text-red-600"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-text-muted"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(h.id)}
                        className="text-xs text-text-muted hover:text-red-600"
                      >
                        Delete
                      </button>
                    )}
                    <HookFavoriteButton
                      hookId={h.id}
                      favorited={h.is_favorited}
                      onToggle={() => {
                        setHooks((prev) =>
                          prev.map((x) =>
                            x.id === h.id
                              ? { ...x, is_favorited: !x.is_favorited }
                              : x,
                          ),
                        );
                      }}
                    />
                    <CopyButton text={h.hook_text} label="Copy" />
                  </div>
                </motion.article>
              );
            })}
          </div>
        </>
      )}

      {selected.size > 0 && (
        <div className="premium-card premium-card-elevated fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-wrap items-center gap-3 px-5 py-3">
          <span className="text-sm font-medium text-text-primary">
            {selected.size} selected
          </span>
          <button
            type="button"
            className="text-sm font-semibold text-accent"
            onClick={() => {
              const texts = hooks.filter((h) => selected.has(h.id));
              void navigator.clipboard.writeText(
                formatHooksForClipboard(texts),
              );
            }}
          >
            Copy selected
          </button>
          <input
            value={bulkTag}
            onChange={(e) => setBulkTag(e.target.value)}
            placeholder="Tag name"
            className="input-field px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={handleBulkTag}
            className="text-sm font-semibold text-accent"
          >
            Add tag
          </button>
          <button
            type="button"
            onClick={() =>
              downloadHooksCsv(hooks.filter((h) => selected.has(h.id)))
            }
            className="text-sm text-text-secondary"
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="text-sm font-semibold text-red-600"
          >
            Delete
          </button>
        </div>
      )}

      <AddHookModal
        workspaceId={workspace.id}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={refreshFromServer}
      />

      <ManageTagsModal
        workspaceId={workspace.id}
        tags={allTags}
        open={tagsOpen}
        onClose={() => setTagsOpen(false)}
        onChanged={refreshFromServer}
      />

      <AnimatePresence>
        {detailHook && (
          <HookDetailPanel
            hook={detailHook}
            allHooks={hooks}
            onClose={() => setDetailHook(null)}
            onUpdated={updateHookLocal}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}
