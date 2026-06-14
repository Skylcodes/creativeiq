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
        className="transition-transform hover:scale-105"
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
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl bg-white/95 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium text-text-primary">
              {displayName}
            </p>
            <p className="truncate text-xs text-text-muted">{email}</p>
          </div>
          <div className="space-y-0.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-black/[0.04] hover:text-text-primary"
            >
              Account settings
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
