import type { ReactNode } from "react";

export type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

export const NAV_ITEMS: NavItem[] = [
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
    label: "Compare Variants",
    href: "/analyses/compare",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect x="2" y="4" width="6" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="10" y="4" width="6" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    label: "Ad Deconstructor",
    href: "/deconstructor",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M4 8L12 4L16 8V14L8 18L2 14V8L4 8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M8 4V18M2 8L16 14" stroke="currentColor" strokeWidth="1.2" />
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

export const ADMIN_NAV_ITEM: NavItem = {
  label: "Admin",
  href: "/admin",
  icon: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 9H11.5M9 6.5V11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
};

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/analyses") {
    return (
      pathname === "/analyses" ||
      (pathname.startsWith("/analyses/") &&
        !pathname.startsWith("/analyses/compare"))
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
