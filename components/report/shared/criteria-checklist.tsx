"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CriteriaChecklistItem } from "@/lib/types/report";
import { PremiumCard } from "@/components/ui/premium-card";

type CriteriaChecklistProps = {
  items: CriteriaChecklistItem[];
};

function PassIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" fill="#10b981" fillOpacity="0.12" />
      <path
        d="M5 8.5L7 10.5L11 6"
        stroke="#10b981"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" fill="#ef4444" fillOpacity="0.1" />
      <path
        d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
        stroke="#ef4444"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="#a1a1aa" strokeWidth="1.2" strokeDasharray="2 2" />
      <path d="M5.5 8H10.5" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CategorySection({
  title,
  items,
}: {
  title: string;
  items: CriteriaChecklistItem[];
}) {
  if (items.length === 0) return null;
  const passed = items.filter((i) => i.pass === true).length;
  const failed = items.filter((i) => i.pass === false).length;
  const applicable = items.filter((i) => i.pass !== null).length;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{title}</p>
        {applicable > 0 && (
          <p className="text-[10px] text-text-muted">
            <span className="font-semibold text-emerald-600">{passed}</span>
            <span className="text-text-muted"> / {applicable} passed</span>
            {failed > 0 && (
              <span className="ml-1.5 font-semibold text-red-500">{failed} failed</span>
            )}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="dropdown-item flex items-start gap-2.5 rounded-lg px-2.5 py-2"
          >
            <span className="mt-px shrink-0">
              {item.pass === true ? (
                <PassIcon />
              ) : item.pass === false ? (
                <FailIcon />
              ) : (
                <NaIcon />
              )}
            </span>
            <div className="min-w-0">
              <p
                className={`text-[13px] leading-snug ${
                  item.pass === null
                    ? "text-text-muted line-through"
                    : "text-text-primary"
                }`}
              >
                <span className="mr-1.5 text-[10px] font-bold text-text-muted">{item.id}</span>
                {item.label}
              </p>
              {item.pass === null ? (
                <p className="mt-0.5 text-xs font-medium text-text-muted">
                  {item.note || "Not applicable to this ad's goal."}
                </p>
              ) : item.note ? (
                <p className="mt-0.5 text-xs text-text-muted">{item.note}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CriteriaChecklist({ items }: CriteriaChecklistProps) {
  const [open, setOpen] = useState(false);

  if (!items || items.length === 0) return null;

  const creative = items.filter((i) => i.category === "creative");
  const landingPage = items.filter((i) => i.category === "landing_page");
  const dynamic = items.filter((i) => i.category === "dynamic");

  const totalApplicable = items.filter((i) => i.pass !== null).length;
  const totalPassed = items.filter((i) => i.pass === true).length;
  const totalFailed = items.filter((i) => i.pass === false).length;

  const passRate = totalApplicable > 0
    ? Math.round((totalPassed / totalApplicable) * 100)
    : null;

  return (
    <PremiumCard padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <rect x="2" y="2" width="5" height="5" rx="1" stroke="#6947ff" strokeWidth="1.2" />
            <rect x="2" y="9" width="5" height="5" rx="1" stroke="#6947ff" strokeWidth="1.2" />
            <path d="M9 4H14M9 7H12" stroke="#6947ff" strokeWidth="1.2" strokeLinecap="round" />
            <path
              d="M9.5 11.5L11 13L14 10"
              stroke="#6947ff"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">Evaluation Criteria</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {totalApplicable} criteria checked
            {passRate !== null && (
              <>
                {" · "}
                <span className={passRate >= 70 ? "text-emerald-600" : passRate >= 50 ? "text-amber-600" : "text-red-500"}>
                  {passRate}% pass rate
                </span>
              </>
            )}
            {totalFailed > 0 && (
              <> · <span className="text-red-500">{totalFailed} failed</span></>
            )}
          </p>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-5 border-t border-[rgba(55,41,111,0.07)] px-5 pb-5 pt-4">
              <p className="text-[11px] leading-relaxed text-text-muted">
                Every finding and recommendation in this report was grounded against applicable
                criteria. Items that do not fit this ad&apos;s goal are excluded from scoring.
              </p>

              <CategorySection title="Creative" items={creative} />
              <CategorySection title="Landing Page" items={landingPage} />
              {dynamic.length > 0 && (
                <CategorySection title="Category-Specific" items={dynamic} />
              )}

              <p className="text-[10px] text-text-muted">
                Criteria are locked for 7 days. If the same ad is re-analyzed within this window, it will be held to the exact same standard.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PremiumCard>
  );
}
