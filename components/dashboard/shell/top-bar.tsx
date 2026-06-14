"use client";

import Link from "next/link";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import { UserMenu } from "./user-menu";

type TopBarProps = {
  email: string;
  displayName: string;
  fullName: string;
  avatarUrl?: string | null;
};

export function TopBar({
  email,
  displayName,
  fullName,
  avatarUrl,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-[56px] shrink-0 items-center justify-between border-b border-black/[0.03] bg-white/40 px-5 backdrop-blur-xl md:px-7">
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <WorkspaceSwitcher />
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[12px] font-medium text-text-muted">
            Intelligence workspace active
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/analyses/new"
          className="btn-premium hidden sm:inline-flex"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          New Analysis
        </Link>

        <Link
          href="/analyses/new"
          className="btn-premium flex h-9 w-9 items-center justify-center p-0 sm:hidden"
          aria-label="New Analysis"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </Link>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted transition-all duration-200 hover:bg-black/[0.04] hover:text-text-primary"
          aria-label="Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M9 2C6.5 2 5 4 5 6.5V10L3 13H15L13 10V6.5C13 4 11.5 2 9 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M7.5 14.5C7.8 15.3 8.4 16 9 16C9.6 16 10.2 15.3 10.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>

        <UserMenu
          email={email}
          displayName={displayName}
          fullName={fullName}
          avatarUrl={avatarUrl}
        />
      </div>
    </header>
  );
}
