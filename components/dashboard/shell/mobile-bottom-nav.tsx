"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, NAV_ITEMS } from "./nav-config";

const PRIMARY_HREFS = ["/dashboard", "/analyses", "/chat"] as const;

type MobileBottomNavProps = {
  onOpenMenu: () => void;
};

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();
  const primary = PRIMARY_HREFS.map(
    (href) => NAV_ITEMS.find((item) => item.href === href)!
  ).filter(Boolean);

  const moreActive = !PRIMARY_HREFS.some((href) => isNavItemActive(pathname, href));

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="app-mobile-bottom-nav lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2">
        {primary.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold tracking-[-0.01em] transition-colors ${
                  active
                    ? "bg-white/[0.08] text-white"
                    : "text-white/50 active:bg-white/[0.06] active:text-white/80"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center ${
                    active ? "text-accent-tertiary" : "opacity-80"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label === "Creative Director" ? "Chat" : item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenMenu}
            className={`flex w-full min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold tracking-[-0.01em] transition-colors ${
              moreActive
                ? "bg-white/[0.08] text-white"
                : "text-white/50 active:bg-white/[0.06] active:text-white/80"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center ${
                moreActive ? "text-accent-tertiary" : "opacity-80"
              }`}
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M4 5H14M4 9H14M4 13H14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
