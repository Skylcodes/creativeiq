"use client";

import { useState } from "react";
import type { AccountLimitOverride } from "@/components/admin/types";
import { FEATURE_LABELS } from "@/lib/billing/feature-keys";

type Props = {
  initialOverrides: AccountLimitOverride[];
};

type UserOption = {
  id: string;
  email: string;
  label: string;
  subscription_tier_key: string | null;
};

function accountLabel(override: AccountLimitOverride): string {
  if (override.account_email) return override.account_email;
  return override.user_id.slice(0, 8);
}

export function OverridesPanel({ initialOverrides }: Props) {
  const [overrides, setOverrides] = useState<AccountLimitOverride[]>(initialOverrides);
  const [showForm, setShowForm] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Delete this override?")) return;

    const res = await fetch(`/api/admin/overrides/${id}`, { method: "DELETE" });
    if (res.ok) {
      setOverrides((prev) => prev.filter((o) => o.id !== id));
    }
  }

  function handleCreated(override: AccountLimitOverride) {
    setOverrides((prev) => [override, ...prev]);
    setShowForm(false);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Account Overrides</h1>
          <p className="mt-1 text-sm text-white/40">
            Grant custom limits to a user account. Overrides apply across all their
            workspaces (account-wide pooled usage).
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
            No active overrides. Add one to comp a beta tester or lift caps for a
            specific account.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Account</th>
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
                      {accountLabel(o)}
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
  onCreated: (o: AccountLimitOverride) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [featureKey, setFeatureKey] = useState("");
  const [limitValue, setLimitValue] = useState("0");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function searchUsers(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const { users: results } = (await res.json()) as { users: UserOption[] };
        setUsers(results);
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit() {
    if (!selectedUser || !featureKey || limitValue === "") return;

    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: selectedUser.id,
        feature_key: featureKey,
        override_limit_value: parseInt(limitValue, 10) || 0,
        reason,
        expires_at: expiresAt || null,
      }),
    });

    const data = (await res.json()) as {
      override?: AccountLimitOverride;
      error?: string;
    };

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
      <h3 className="mb-4 text-sm font-semibold text-white/70">Add Account Override</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-white/40">Account</label>
          {selectedUser ? (
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2">
              <div>
                <p className="text-sm text-white/80">{selectedUser.email}</p>
                <p className="text-xs text-white/35">{selectedUser.label}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
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
                onChange={(e) => searchUsers(e.target.value)}
                placeholder="Search by email or brand name…"
                className="admin-input"
              />
              {users.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-white/[0.07] bg-[#121214] py-1 shadow-xl">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        setUsers([]);
                        setQuery("");
                      }}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-white/[0.04]"
                    >
                      <span className="text-sm text-white/80">{user.email}</span>
                      <span className="text-xs text-white/35">
                        {user.label}
                        {user.subscription_tier_key
                          ? ` · ${user.subscription_tier_key}`
                          : ""}
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
          disabled={saving || !selectedUser || !featureKey}
          className={[
            "rounded-xl px-5 py-2 text-sm font-semibold transition-all",
            saving || !selectedUser || !featureKey
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
