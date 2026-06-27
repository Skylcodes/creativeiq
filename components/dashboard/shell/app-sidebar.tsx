"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { PlanUsageSidebarCard } from "@/components/billing/plan-usage-sidebar-card";
import { Logo } from "@/components/shared/logo";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import type { AccountUsageSummary } from "@/lib/billing/usage-summary-types";
import { isAtWorkspaceLimit } from "@/lib/billing/usage-summary-types";
import { ADMIN_NAV_ITEM, NAV_ITEMS, isNavItemActive } from "./nav-config";

export function AppSidebar({
  showAdminLink = false,
  usageSummary,
}: {
  showAdminLink?: boolean;
  usageSummary?: AccountUsageSummary;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("ciq-sidebar-collapsed") === "true";
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ciq-sidebar-collapsed", String(next));
      return next;
    });
  }

  const canAddWorkspace = !usageSummary || !isAtWorkspaceLimit(usageSummary);

  return (
    <aside
      className={`dash-sidebar-nav relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden rounded-[inherit] pb-4 pt-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        collapsed ? "w-[60px] px-2" : "w-[248px] px-3"
      }`}
    >
      <div className={`mb-5 flex h-10 items-center ${collapsed ? "justify-center" : "px-0.5"}`}>
        {collapsed ? (
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-[#2b185f] to-[#6947ff] text-white shadow-[0_6px_20px_rgba(105,71,255,0.32)] transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_28px_rgba(105,71,255,0.4)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 8L7 4L11 8L7 12L3 8Z" fill="white" fillOpacity="0.95" />
            </svg>
          </Link>
        ) : (
          <Logo href="/dashboard" size="sm" tone="dark" />
        )}
      </div>

      <div className={`mb-5 min-w-0 ${collapsed ? "flex flex-col items-center" : ""}`}>
        {!collapsed && (
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
            Workspace
          </p>
        )}
        <WorkspaceSwitcher
          variant="dark"
          canAddWorkspace={canAddWorkspace}
          collapsed={collapsed}
        />
      </div>

      <nav className="scrollbar-none min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1" aria-label="App navigation">
        {!collapsed && (
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
            Menu
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold tracking-[-0.015em] transition-all duration-250 ${
                active ? "text-white" : "nav-pill"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl sidebar-nav-active"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className={`relative flex h-[18px] w-[18px] shrink-0 items-center justify-center ${active ? "text-accent-tertiary" : "opacity-75"}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="relative min-w-0 flex-1 truncate pr-1">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 space-y-0.5 px-0.5 pt-3">
        {usageSummary && (
          <PlanUsageSidebarCard summary={usageSummary} collapsed={collapsed} />
        )}
        {showAdminLink && (
          <Link
            href={ADMIN_NAV_ITEM.href}
            title={collapsed ? ADMIN_NAV_ITEM.label : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold tracking-[-0.015em] transition-all duration-250 ${
              collapsed ? "justify-center px-2" : ""
            } border border-amber-400/25 bg-amber-400/[0.08] text-amber-300 backdrop-blur-sm hover:border-amber-400/35 hover:bg-amber-400/12`}
          >
            <span className="shrink-0 opacity-90">{ADMIN_NAV_ITEM.icon}</span>
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
        {!collapsed && (
          <Link
            href="/settings"
            className={`nav-pill flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold tracking-[-0.015em] transition-all duration-250 ${
              pathname.startsWith("/settings") ? "sidebar-nav-active text-white" : ""
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="opacity-70" aria-hidden>
              <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9 1.5V3M9 15V16.5M1.5 9H3M15 9H16.5M3.4 3.4L4.5 4.5M13.5 13.5L14.6 14.6M14.6 3.4L13.5 4.5M4.5 13.5L3.4 14.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Settings
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`nav-pill flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-250 ${
            collapsed ? "justify-center px-2" : ""
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 18 18"
            fill="none"
            className={`opacity-50 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!collapsed && <span className="text-white/45">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
