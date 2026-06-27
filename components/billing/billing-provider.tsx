"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { UpgradePaywallModal } from "@/components/billing/upgrade-paywall-modal";
import { openBillingPortal } from "@/lib/billing/checkout-client";
import type {
  AccountSnapshot,
  ActionBlocked,
  ActionFeature,
  BlockReason,
} from "@/lib/billing/account-types";
import type { AccountUsageSummary } from "@/lib/billing/usage-summary-types";

type ModalState = { reason: BlockReason; feature?: ActionFeature } | null;

type BillingContextValue = {
  snapshot: AccountSnapshot;
  canActNow: boolean;
  ensureCanAct: (feature: ActionFeature) => boolean;
  showBlocked: (blocked: ActionBlocked) => void;
  openUpgrade: (feature?: ActionFeature) => void;
};

const BillingContext = createContext<BillingContextValue | undefined>(undefined);

export function BillingProvider({
  snapshot,
  usageSummary,
  children,
}: {
  snapshot: AccountSnapshot;
  usageSummary: AccountUsageSummary;
  children: React.ReactNode;
}) {
  const [modal, setModal] = useState<ModalState>(null);

  const isHardBlocked =
    snapshot.status === "paywalled" || snapshot.status === "payment_failed";

  const canActNow = snapshot.isAdmin || !isHardBlocked;

  const ensureCanAct = useCallback(
    (feature: ActionFeature) => {
      if (snapshot.isAdmin) return true;
      if (snapshot.status === "paywalled") {
        setModal({ reason: "paywalled", feature });
        return false;
      }
      if (snapshot.status === "payment_failed") {
        setModal({ reason: "payment_failed", feature });
        return false;
      }
      return true;
    },
    [snapshot.isAdmin, snapshot.status]
  );

  const showBlocked = useCallback((blocked: ActionBlocked) => {
    setModal({ reason: blocked.reason, feature: blocked.feature });
  }, []);

  const openUpgrade = useCallback((feature?: ActionFeature) => {
    setModal({ reason: "paywalled", feature });
  }, []);

  const value = useMemo<BillingContextValue>(
    () => ({ snapshot, canActNow, ensureCanAct, showBlocked, openUpgrade }),
    [snapshot, canActNow, ensureCanAct, showBlocked, openUpgrade]
  );

  return (
    <BillingContext.Provider value={value}>
      {children}
      <UpgradePaywallModal
        modal={modal}
        snapshot={snapshot}
        usageSummary={usageSummary}
        onClose={() => setModal(null)}
      />
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within a BillingProvider");
  return ctx;
}

// ─── Slim status banner (trial countdown / payment grace) ────────────────────

export function BillingBanner() {
  const { snapshot, openUpgrade } = useBilling();
  const router = useRouter();

  if (snapshot.isAdmin) return null;

  if (snapshot.status === "payment_failed") {
    const days = snapshot.graceDaysLeft ?? 0;
    return (
      <BannerShell tone="danger">
        <span>
          <strong className="font-semibold">Payment failed.</strong> Update your
          payment method{days > 0 ? ` within ${days} day${days === 1 ? "" : "s"}` : ""} to
          keep your account active.
        </span>
        <button
          type="button"
          onClick={() => openBillingPortal()}
          className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#b91c1c] transition-transform hover:scale-[1.03]"
        >
          Update payment
        </button>
      </BannerShell>
    );
  }

  if (snapshot.status === "paywalled") {
    return (
      <BannerShell tone="danger">
        <span>
          <strong className="font-semibold">Your access is limited.</strong>{" "}
          Upgrade to keep creating analyses, briefs, and more.
        </span>
        <button
          type="button"
          onClick={() => router.push("/pricing")}
          className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#b91c1c] transition-transform hover:scale-[1.03]"
        >
          View plans
        </button>
      </BannerShell>
    );
  }

  if (snapshot.status === "trialing") {
    const days = snapshot.trialDaysLeft ?? 0;
    const urgent = days <= 3;
    return (
      <BannerShell tone={urgent ? "warn" : "info"}>
        <span>
          <strong className="font-semibold">
            {days > 0 ? `${days} day${days === 1 ? "" : "s"} left` : "Last day"} in
            your free trial.
          </strong>{" "}
          Upgrade to unlock the full platform.
        </span>
        <button
          type="button"
          onClick={() => openUpgrade()}
          className="shrink-0 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#7c3aed] transition-transform hover:scale-[1.03]"
        >
          Upgrade now
        </button>
      </BannerShell>
    );
  }

  return null;
}

function BannerShell({
  tone,
  children,
}: {
  tone: "info" | "warn" | "danger";
  children: React.ReactNode;
}) {
  const bg =
    tone === "danger"
      ? "bg-gradient-to-r from-[#dc2626] to-[#b91c1c]"
      : tone === "warn"
        ? "bg-gradient-to-r from-[#7c3aed] to-[#6d28d9]"
        : "bg-gradient-to-r from-[#6366f1] to-[#7c3aed]";

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-xs text-white sm:text-sm ${bg}`}
    >
      {children}
    </div>
  );
}
