"use client";

import { useState } from "react";
import type { WorkspaceOverride } from "@/components/admin/types";
import { FEATURE_LABELS } from "@/lib/billing/feature-keys";

type Props = {
  initialOverrides: WorkspaceOverride[];
};

type WorkspaceOption = { id: string; name: string; subscription_tier_key: string };

function workspaceName(override: WorkspaceOverride): string {
  const ws = override.workspaces;
  if (!ws) return override.workspace_id.slice(0, 8);
  if (Array.isArray(ws)) return ws[0]?.name ?? override.workspace_id.slice(0, 8);
  return ws.name;
}

export function OverridesPanel({ initialOverrides }: Props) {
  const [overrides, setOverrides] = useState<WorkspaceOverride[]>(initialOverrides);
  const [showForm, setShowForm] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Delete this override?")) return;

    const res = await fetch(`/api/admin/overrides/${id}`, { method: "DELETE" });
    if (res.ok) {
      setOverrides((prev) => prev.filter((o) => o.id !== id));
    }
  }

  function handleCreated(override: WorkspaceOverride) {
    setOverrides((prev) => [override, ...prev]);
    setShowForm(false);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Workspace Overrides</h1>
          <p className="mt-1 text-sm text-white/40">
            Comp beta testers or grant custom limits without changing tiers.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Override
        </button>
      </div>

      {showForm && (
        <AddOverrideForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      )}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
        {overrides.length === 0 ? (
          <div className="py-16 text-center text-sm text-white/30">
            No active overrides. Add one to comp a beta tester.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Feature</th>
                <th>Override Limit</th>
                <th>Reason</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span className="font-medium text-white/80">
                      {workspaceName(o)}
                    </span>
                  </td>
                  <td>{FEATURE_LABELS[o.feature_key] ?? o.feature_key}</td>
                  <td>
                    <span
                      className={
                        o.override_limit_value === -1
                          ? "text-green-400"
                          : "text-white/70"
                      }
                    >
                      {o.override_limit_value === -1
                        ? "Unlimited"
                        : o.override_limit_value}
                    </span>
                  </td>
                  <td className="max-w-xs truncate text-white/40">{o.reason || "—"}</td>
                  <td className="text-white/40">
                    {o.expires_at
                      ? new Date(o.expires_at).toLocaleDateString()
                      : "Permanent"}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(o.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AddOverrideForm({
  onCreated,
  onCancel,
}: {
  onCreated: (o: WorkspaceOverride) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceOption | null>(null);
  const [featureKey, setFeatureKey] = useState("");
  const [limitValue, setLimitValue] = useState("0");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function searchWorkspaces(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setWorkspaces([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/workspaces?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const { workspaces: results } = (await res.json()) as { workspaces: WorkspaceOption[] };
        setWorkspaces(results);
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit() {
    if (!selectedWorkspace || !featureKey || limitValue === "") return;

    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: selectedWorkspace.id,
        feature_key: featureKey,
        override_limit_value: parseInt(limitValue) || 0,
        reason,
        expires_at: expiresAt || null,
      }),
    });

    const data = (await res.json()) as { override?: WorkspaceOverride; error?: string };

    if (!res.ok || !data.override) {
      setError(data.error ?? "Failed to create override");
      setSaving(false);
      return;
    }

    onCreated(data.override);
  }

  const featureKeys = Object.keys(FEATURE_LABELS);

  return (
    <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white/70">Add Workspace Override</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Workspace search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-white/40">Workspace</label>
          {selectedWorkspace ? (
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2">
              <span className="text-sm text-white/80">{selectedWorkspace.name}</span>
              <button
                onClick={() => setSelectedWorkspace(null)}
                className="text-xs text-white/30 hover:text-white/60"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => searchWorkspaces(e.target.value)}
                placeholder="Search by name…"
                className="admin-input"
              />
              {workspaces.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-white/[0.07] bg-[#121214] py-1 shadow-xl">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setSelectedWorkspace(ws);
                        setWorkspaces([]);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm text-white/70 hover:bg-white/[0.04] hover:text-white"
                    >
                      <span>{ws.name}</span>
                      <span className="text-xs text-white/30">
                        {ws.subscription_tier_key}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {searching && (
                <p className="mt-1 text-xs text-white/30">Searching…</p>
              )}
            </div>
          )}
        </div>

        {/* Feature key */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-white/40">Feature</label>
          <select
            value={featureKey}
            onChange={(e) => setFeatureKey(e.target.value)}
            className="admin-select"
          >
            <option value="">Select feature…</option>
            {featureKeys.map((k) => (
              <option key={k} value={k}>
                {FEATURE_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        {/* Limit value */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-white/40">
            Override Limit <span className="text-white/20">(-1 = unlimited)</span>
          </label>
          <input
            type="number"
            step={1}
            value={limitValue}
            onChange={(e) => setLimitValue(e.target.value)}
            className="admin-input"
          />
        </div>

        {/* Expires at */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-white/40">
            Expires At <span className="text-white/20">(leave blank = permanent)</span>
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="admin-input"
          />
        </div>

        {/* Reason */}
        <div className="col-span-full flex flex-col gap-1.5">
          <label className="text-xs font-medium text-white/40">
            Reason <span className="text-white/20">(internal note)</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. beta tester, comped for feedback"
            className="admin-input"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm text-white/40 transition-colors hover:text-white/70"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !selectedWorkspace || !featureKey}
          className={[
            "rounded-xl px-5 py-2 text-sm font-semibold transition-all",
            saving || !selectedWorkspace || !featureKey
              ? "cursor-not-allowed bg-white/[0.05] text-white/30"
              : "bg-white text-black hover:bg-white/90",
          ].join(" ")}
        >
          {saving ? "Saving…" : "Add Override"}
        </button>
      </div>
    </div>
  );
}
