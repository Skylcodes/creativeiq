"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { UserAvatar } from "@/components/shared/user-avatar";

type UserMenuProps = {
  email: string;
  displayName: string;
  fullName: string;
  avatarUrl?: string | null;
};

export function UserMenu({
  email,
  displayName,
  fullName,
  avatarUrl,
}: UserMenuProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/[0.12]"
        aria-expanded={open}
        aria-label="User menu"
      >
        <UserAvatar
          name={fullName}
          email={email}
          avatarUrl={avatarUrl}
          size="sm"
        />
      </button>

      {open && (
        <div className="dash-card absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden p-1.5">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold tracking-[-0.01em] text-text-primary">
              {displayName}
            </p>
            <p className="truncate text-xs text-text-muted">{email}</p>
          </div>
          <div className="space-y-0.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-[#f6f7fb] hover:text-text-primary"
            >
              Account settings
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50/80 disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
