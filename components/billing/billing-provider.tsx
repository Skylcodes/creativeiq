"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { openBillingPortal } from "@/lib/billing/checkout-client";
import type {
  AccountSnapshot,
  ActionBlocked,
  ActionFeature,
  BlockReason,
} from "@/lib/billing/account-types";

type ModalState = { reason: BlockReason; feature?: ActionFeature } | null;

type BillingContextValue = {
  snapshot: AccountSnapshot;
  /** True when the account can definitely act (active / admin / trialing). */
  canActNow: boolean;
  /**
   * Fast client-side pre-check. Returns true if the action may proceed.
   * Hard-blocks (paywalled / payment_failed) open the upgrade modal and
   * return false — the authoritative check still runs server-side.
   */
  ensureCanAct: (feature: ActionFeature) => boolean;
  /** Open the upgrade modal in response to a server 402 block. */
  showBlocked: (blocked: ActionBlocked) => void;
  /** Open the generic upgrade modal. */
  openUpgrade: (feature?: ActionFeature) => void;
};

const BillingContext = createContext<BillingContextValue | undefined>(undefined);

// ─── Inline icons (codebase convention: no icon-library imports) ─────────────

type IconProps = { className?: string };

function IconSparkles({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.8 4.9L18.7 8.7 13.8 10.5 12 15.4l-1.8-4.9L5.3 8.7l4.9-1.8L12 2zM5 14l.9 2.4L8.3 17.3l-2.4.9L5 20.6l-.9-2.4L1.7 17.3l2.4-.9L5 14zm14 0l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9L19 14z" />
    </svg>
  );
}

function IconCard({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path strokeLinecap="round" d="M2 10h20" />
    </svg>
  );
}

function IconCheck({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconX({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function IconBolt({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

export function BillingProvider({
  snapshot,
  children,
}: {
  snapshot: AccountSnapshot;
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
      // trialing / active → let the server make the final call.
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
      <UpgradeModal modal={modal} onClose={() => setModal(null)} />
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within a BillingProvider");
  return ctx;
}

// ─── Upgrade modal ─────────────────────────────────────────────────────────

const VALUE_BULLETS = [
  "Unlimited funnel analyses & variant tests",
  "Creative briefs that turn insights into scripts",
  "Ad deconstructions of any winning competitor",
  "Your Creative Director strategist, on demand",
];

function copyFor(reason: BlockReason): {
  eyebrow: string;
  title: string;
  body: string;
  primaryLabel: string;
  mode: "upgrade" | "portal";
} {
  switch (reason) {
    case "payment_failed":
      return {
        eyebrow: "Payment issue",
        title: "Update your payment method",
        body: "Your last payment didn't go through. Update your card to keep your analyses, briefs, and strategist running without interruption.",
        primaryLabel: "Update payment method",
        mode: "portal",
      };
    case "trial_limit":
      return {
        eyebrow: "Trial complete",
        title: "You're clearly getting value — keep going",
        body: "You've used your free trial runs. Upgrade now to unlock unlimited creative intelligence and never lose momentum on a winning test.",
        primaryLabel: "View plans",
        mode: "upgrade",
      };
    case "trial_expired":
      return {
        eyebrow: "Trial ended",
        title: "Your 14-day trial has ended",
        body: "Pick a plan to keep analyzing creatives, generating briefs, and shipping higher-converting ads.",
        primaryLabel: "View plans",
        mode: "upgrade",
      };
    case "paywalled":
    default:
      return {
        eyebrow: "Upgrade required",
        title: "Unlock the full creative engine",
        body: "Your plan doesn't include this action right now. Upgrade to keep turning ad data into winning creative.",
        primaryLabel: "View plans",
        mode: "upgrade",
      };
  }
}

function UpgradeModal({
  modal,
  onClose,
}: {
  modal: ModalState;
  onClose: () => void;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const reason = modal?.reason ?? "paywalled";
  const copy = copyFor(reason);

  async function handlePrimary() {
    if (copy.mode === "portal") {
      setWorking(true);
      const result = await openBillingPortal();
      if (!result.ok) setWorking(false);
      return;
    }
    onClose();
    router.push("/pricing");
  }

  return (
    <AnimatePresence>
      {modal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] modal-overlay"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="modal-panel fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#4338ca] px-7 pb-8 pt-7 text-white">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                <IconX className="h-4 w-4" />
              </button>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
                {copy.mode === "portal" ? (
                  <IconCard className="h-3.5 w-3.5" />
                ) : (
                  <IconSparkles className="h-3.5 w-3.5" />
                )}
                {copy.eyebrow}
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold leading-tight">
                {copy.title}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">
                {copy.body}
              </p>
            </div>

            <div className="bg-surface px-7 py-6">
              {copy.mode === "upgrade" && (
                <ul className="mb-6 space-y-2.5">
                  {VALUE_BULLETS.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7c3aed]/12 text-[#7c3aed]">
                        <IconCheck className="h-3 w-3" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handlePrimary}
                  disabled={working}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#7c3aed]/25 transition-all hover:bg-[#6d28d9] disabled:opacity-60"
                >
                  <IconBolt className="h-4 w-4" />
                  {working ? "Opening…" : copy.primaryLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-outline flex-1 text-sm sm:flex-none"
                >
                  Maybe later
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-text-muted">
                Cancel anytime · Secure checkout by Stripe
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
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
          Upgrade to unlock unlimited analyses and briefs.
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
