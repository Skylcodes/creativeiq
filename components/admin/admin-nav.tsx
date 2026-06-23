"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/tiers", label: "Subscription Tiers" },
  { href: "/admin/overrides", label: "Workspace Overrides" },
  { href: "/admin/usage", label: "Usage Dashboard" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-white/[0.08] text-white"
                : "text-white/40 hover:text-white/70",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
