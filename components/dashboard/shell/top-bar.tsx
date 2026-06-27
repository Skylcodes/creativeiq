"use client";

import Link from "next/link";
import { useState } from "react";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import type { AccountUsageSummary } from "@/lib/billing/usage-summary-types";
import { isAtWorkspaceLimit } from "@/lib/billing/usage-summary-types";

type TopBarProps = {
  email: string;
  displayName: string;
  fullName: string;
  avatarUrl?: string | null;
  usageSummary?: AccountUsageSummary;
  showAdminLink?: boolean;
};

export function TopBar({
  email,
  displayName,
  fullName,
  avatarUrl,
  usageSummary,
  showAdminLink = false,
}: TopBarProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const canAddWorkspace = !usageSummary || !isAtWorkspaceLimit(usageSummary);

  return (
    <>
      <header className="app-topbar sticky top-0 z-40 flex h-[3.25rem] shrink-0 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="app-topbar-icon-btn lg:hidden"
            aria-label="Open navigation menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M3 5H15M3 9H15M3 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0 lg:hidden">
            <WorkspaceSwitcher variant="dark" canAddWorkspace={canAddWorkspace} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2">
          <Link href="/analyses/new" className="dash-btn-topbar px-2.5 sm:px-[0.9375rem]">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">New Analysis</span>
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
            usageSummary={usageSummary}
          />
        </div>
      </header>

      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        showAdminLink={showAdminLink}
        usageSummary={usageSummary}
      />
    </>
  );
}
