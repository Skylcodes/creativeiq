"use client";

import { useMemo, useRef, useState } from "react";
import type { TrialFeatureLimit, TrialSettings } from "@/components/admin/types";
import { FEATURE_LABELS, FEATURE_RESET_PERIODS } from "@/lib/billing/feature-keys";

type LimitDraft = {
  feature_key: string;
  limit_value: string;
  reset_period: string;
  ends_trial_on_exhaust: boolean;
};

type Props = {
  initialSettings: TrialSettings | null;
  initialLimits: TrialFeatureLimit[];
  onSaved: (settings: TrialSettings | null, limits: TrialFeatureLimit[]) => void;
};

function limitsToDrafts(limits: TrialFeatureLimit[]): LimitDraft[] {
  const knownKeys = Object.keys(FEATURE_LABELS);
  const existingMap = Object.fromEntries(limits.map((l) => [l.feature_key, l]));

  return knownKeys.map((key) => ({
    feature_key: key,
    limit_value: existingMap[key] ? String(existingMap[key].limit_value) : "0",
    reset_period:
      existingMap[key]?.reset_period ?? FEATURE_RESET_PERIODS[key] ?? "monthly",
    ends_trial_on_exhaust: existingMap[key]?.ends_trial_on_exhaust ?? false,
  }));
}

export function TrialCard({ initialSettings, initialLimits, onSaved }: Props) {
  const [durationDays, setDurationDays] = useState(
    String(initialSettings?.duration_days ?? 14)
  );
  const [baselineDuration, setBaselineDuration] = useState(durationDays);
  const [limitDrafts, setLimitDrafts] = useState<LimitDraft[]>(() =>
    limitsToDrafts(initialLimits)
  );
  const [baselineLimitDrafts, setBaselineLimitDrafts] = useState<LimitDraft[]>(() =>
    limitsToDrafts(initialLimits)
  );
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = useMemo(
    () =>
      durationDays !== baselineDuration ||
      JSON.stringify(limitDrafts) !== JSON.stringify(baselineLimitDrafts),
    [durationDays, baselineDuration, limitDrafts, baselineLimitDrafts]
  );

  function setLimitValue(featureKey: string, value: string) {
    setLimitDrafts((prev) =>
      prev.map((l) =>
        l.feature_key === featureKey ? { ...l, limit_value: value } : l
      )
    );
  }

  function setHardwall(featureKey: string, checked: boolean) {
    setLimitDrafts((prev) =>
      prev.map((l) =>
        l.feature_key === featureKey
          ? { ...l, ends_trial_on_exhaust: checked }
          : l
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/admin/trial", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_days: parseInt(durationDays, 10) || 14,
          limits: limitDrafts.map((l) => ({
            feature_key: l.feature_key,
            limit_value: parseInt(l.limit_value, 10) || 0,
            reset_period: l.reset_period,
            ends_trial_on_exhaust: l.ends_trial_on_exhaust,
          })),
        }),
      });

      const data = (await res.json()) as {
        settings?: TrialSettings | null;
        limits?: TrialFeatureLimit[];
        error?: string;
      };

      if (!res.ok) {
        setSaveError(data.error ?? "Save failed");
        return;
      }

      const newDuration = String(data.settings?.duration_days ?? 14);
      const newLimitDrafts = limitsToDrafts(data.limits ?? []);

      setDurationDays(newDuration);
      setBaselineDuration(newDuration);
      setLimitDrafts(newLimitDrafts);
      setBaselineLimitDrafts(newLimitDrafts);
      onSaved(data.settings ?? null, data.limits ?? []);

      setSavedFlash(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSavedFlash(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-[#7c3aed]/25 bg-[#7c3aed]/[0.06] overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white">
            Free trial ({durationDays} days)
          </span>
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-mono text-white/40">
            trial
          </span>
          {dirty && !savedFlash && (
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
              Unsaved
            </span>
          )}
          {savedFlash && (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
              Saved ✓
            </span>
          )}
        </div>
        <svg
          className={[
            "h-4 w-4 text-white/30 transition-transform",
            expanded ? "rotate-180" : "",
          ].join(" ")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.05] px-6 pb-6 pt-5">
          <p className="mb-5 text-sm text-white/45">
            Controls what new accounts get during the free trial. Changes apply to
            new signups and enforcement immediately — existing trial end dates are
            not retroactively extended.
          </p>

          <div className="max-w-xs">
            <label className="text-xs font-medium text-white/40">
              Trial duration (days)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              step={1}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="admin-input mt-1.5"
            />
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/70">Trial limits</h3>
              <span className="text-xs text-white/30">Use -1 for unlimited · 0 = blocked</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {limitDrafts.map((l) => (
                <div
                  key={l.feature_key}
                  className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
                >
                  <label className="text-xs font-medium text-white/40">
                    {FEATURE_LABELS[l.feature_key] ?? l.feature_key}
                  </label>
                  <input
                    type="number"
                    step={1}
                    value={l.limit_value}
                    onChange={(e) => setLimitValue(l.feature_key, e.target.value)}
                    className="admin-input mt-1.5"
                  />
                  {l.feature_key !== "workspaces" &&
                    l.feature_key !== "user_seats" && (
                      <label className="mt-2 flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={l.ends_trial_on_exhaust}
                          onChange={(e) =>
                            setHardwall(l.feature_key, e.target.checked)
                          }
                          className="admin-checkbox"
                        />
                        <span className="text-[11px] text-white/45">
                          End trial when exhausted
                        </span>
                      </label>
                    )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/[0.05] pt-5">
            {saveError ? (
              <p className="text-sm text-red-400">{saveError}</p>
            ) : (
              <span />
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={[
                "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
                saving || !dirty
                  ? "cursor-not-allowed bg-white/[0.05] text-white/30"
                  : "bg-white text-black hover:bg-white/90",
              ].join(" ")}
            >
              {saving ? "Saving…" : "Save trial settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
