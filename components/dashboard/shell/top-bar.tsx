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
    <header className="app-topbar sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-4 px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="lg:hidden">
          <WorkspaceSwitcher variant="dark" />
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link href="/analyses/new" className="dash-btn-topbar">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          New Analysis
        </Link>

        <button type="button" className="app-topbar-icon-btn" aria-label="Notifications">
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
