"use client";

import { useEffect, useState } from "react";
import { ProfileSection, SecuritySection } from "@/components/settings/profile-section";
import { WorkspacesSection } from "@/components/settings/workspaces-section";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import type { AccountSettingsData } from "@/lib/types/workspace";

const NAV_ITEMS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "workspaces", label: "Workspaces" },
] as const;

type SettingsPageProps = AccountSettingsData;

export function SettingsPage({
  email,
  fullName,
  avatarUrl: initialAvatarUrl,
  workspaces,
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
      }
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
        eyebrow="Account"
        title="Settings"
        description="Manage your personal account, security, and workspaces."
      />

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <nav
          className="lg:sticky lg:top-6 lg:self-start"
          aria-label="Settings sections"
        >
          <ul className="premium-card flex gap-1 overflow-x-auto p-1.5 lg:flex-col lg:overflow-visible">
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <li key={item.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                      active
                        ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(110,58,255,0.12)]"
                        : "text-text-secondary hover:bg-black/[0.03] hover:text-text-primary"
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
          <WorkspacesSection workspaces={workspaces} />
        </div>
      </div>
    </PageShell>
  );
}
