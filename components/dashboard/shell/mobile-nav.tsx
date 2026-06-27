"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { PlanUsageSidebarCard } from "@/components/billing/plan-usage-sidebar-card";
import { Logo } from "@/components/shared/logo";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import type { AccountUsageSummary } from "@/lib/billing/usage-summary-types";
import { isAtWorkspaceLimit } from "@/lib/billing/usage-summary-types";
import { ADMIN_NAV_ITEM, NAV_ITEMS, isNavItemActive } from "./nav-config";

type MobileNavProps = {
  open: boolean;
  onClose: () => void;
  showAdminLink?: boolean;
  usageSummary?: AccountUsageSummary;
};

export function MobileNav({
  open,
  onClose,
  showAdminLink = false,
  usageSummary,
}: MobileNavProps) {
  const pathname = usePathname();
  const canAddWorkspace = !usageSummary || !isAtWorkspaceLimit(usageSummary);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-[#080711]/75 backdrop-blur-sm"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col border-r border-white/[0.08] bg-[#0a0714]/98 shadow-[24px_0_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-4">
          <Logo href="/dashboard" size="sm" tone="dark" />
          <button
            type="button"
            onClick={onClose}
            className="app-topbar-icon-btn"
            aria-label="Close navigation"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="border-b border-white/[0.08] px-4 py-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
            Workspace
          </p>
          <WorkspaceSwitcher variant="dark" canAddWorkspace={canAddWorkspace} />
        </div>

        <nav
          className="scrollbar-none min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-4"
          aria-label="Mobile navigation"
        >
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-semibold tracking-[-0.015em] ${
                  active
                    ? "sidebar-nav-active text-white"
                    : "nav-pill text-white/60"
                }`}
              >
                <span
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center ${
                    active ? "text-accent-tertiary" : "opacity-75"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/[0.08] px-3 py-4">
          {usageSummary && (
            <PlanUsageSidebarCard summary={usageSummary} collapsed={false} />
          )}
          {showAdminLink && (
            <Link
              href={ADMIN_NAV_ITEM.href}
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-3 py-3 text-[14px] font-semibold text-amber-300"
            >
              <span className="shrink-0 opacity-90">{ADMIN_NAV_ITEM.icon}</span>
              Admin
            </Link>
          )}
          <Link
            href="/settings"
            onClick={onClose}
            className={`nav-pill flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-semibold ${
              pathname.startsWith("/settings") ? "sidebar-nav-active text-white" : ""
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="opacity-70" aria-hidden>
              <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9 1.5V3M9 15V16.5M1.5 9H3M15 9H16.5M3.4 3.4L4.5 4.5M13.5 13.5L14.6 14.6M14.6 3.4L13.5 4.5M4.5 13.5L3.4 14.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Settings
          </Link>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
