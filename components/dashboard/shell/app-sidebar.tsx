"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/shared/logo";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    label: "Creative Director",
    href: "/chat",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M2.5 4.5H15.5V11.5C15.5 12.6 14.6 13.5 13.5 13.5H7.5L4 16V13.5H3.5C2.4 13.5 1.5 12.6 1.5 11.5V5C1.5 3.9 2.4 3 3.5 3H2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M5.5 7H12.5M5.5 9.5H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Analyses",
    href: "/analyses",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M3 14L7 8L10 11L15 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 16H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Briefs",
    href: "/brief",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6 6H12M6 9H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Hook Library",
    href: "/hooks",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M4 5H14M4 9H12M4 13H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M14 13L16 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Performance",
    href: "/performance",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M3 15V9M7 15V5M11 15V11M15 15V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M2 15H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Brand Profile",
    href: "/brand",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6 7H12M6 10H12M6 13H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AppSidebar() {
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

  return (
    <aside
      className={`flex h-full min-h-0 shrink-0 flex-col pt-3 pb-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        collapsed ? "w-[60px] px-1.5" : "w-[228px] px-3"
      }`}
    >
      <div className={`mb-6 flex h-10 items-center ${collapsed ? "justify-center" : "px-1"}`}>
        {collapsed ? (
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-accent to-[#9333ea] shadow-[0_4px_14px_rgba(110,58,255,0.35)] transition-transform hover:scale-105"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 8L7 4L11 8L7 12L3 8Z" fill="white" fillOpacity="0.9" />
            </svg>
          </Link>
        ) : (
          <Logo href="/dashboard" size="sm" />
        )}
      </div>

      {!collapsed && (
        <div className="mb-5 px-1">
          <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Workspace
          </p>
          <WorkspaceSwitcher />
        </div>
      )}

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1" aria-label="App navigation">
        {!collapsed && (
          <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Intelligence
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-200 ${
                active ? "text-accent" : "nav-pill"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl sidebar-nav-active"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className={`relative shrink-0 ${active ? "text-accent" : "opacity-70"}`}>
                {item.icon}
              </span>
              {!collapsed && <span className="relative">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 space-y-1 px-1 pt-3">
        {!collapsed && (
          <Link
            href="/settings"
            className={`nav-pill flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
              pathname.startsWith("/settings") ? "sidebar-nav-active" : ""
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="opacity-60" aria-hidden>
              <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9 1.5V3M9 15V16.5M1.5 9H3M15 9H16.5M3.4 3.4L4.5 4.5M13.5 13.5L14.6 14.6M14.6 3.4L13.5 4.5M4.5 13.5L3.4 14.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Settings
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`nav-pill flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200 ${
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
          {!collapsed && <span className="text-text-muted">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
