"use client";

import { useEffect, useState } from "react";
import {
  ProfileSection,
  SecuritySection,
} from "@/components/settings/profile-section";
import { WorkspacesSection } from "@/components/settings/workspaces-section";
import { BillingSection } from "@/components/settings/billing-section";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import type { AccountUsageSummary } from "@/lib/billing/usage-summary-types";
import type { AccountSettingsData } from "@/lib/types/workspace";

const NAV_ITEMS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "billing", label: "Billing" },
  { id: "workspaces", label: "Workspaces" },
] as const;

type SettingsPageProps = AccountSettingsData & {
  usageSummary: AccountUsageSummary;
};

export function SettingsPage({
  email,
  fullName,
  avatarUrl: initialAvatarUrl,
  workspaces,
  usageSummary,
}: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<string>("profile");
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const avatarUrl = avatarOverride ?? initialAvatarUrl;

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => item.id);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.1, 0.3, 0.6],
      },
    );

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  function scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Settings"
        description="Manage your personal account, security, and workspaces."
      />

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <nav
          className="lg:sticky lg:top-6 lg:self-start"
          aria-label="Settings sections"
        >
          <ul className="dash-card grid grid-cols-4 gap-1 overflow-x-auto p-1.5 lg:flex lg:flex-col lg:overflow-visible">
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <li key={item.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`dropdown-item min-h-11 w-full rounded-xl px-2 py-2.5 text-center text-[12px] font-medium sm:px-3 sm:text-left sm:text-sm lg:text-left ${
                      active
                        ? "dropdown-item-active"
                        : "text-white/55"
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-10">
          <ProfileSection
            email={email}
            fullName={fullName}
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarOverride}
          />
          <SecuritySection />
          <BillingSection usageSummary={usageSummary} />
          <WorkspacesSection workspaces={workspaces} usageSummary={usageSummary} />
        </div>
      </div>
    </PageShell>
  );
}
