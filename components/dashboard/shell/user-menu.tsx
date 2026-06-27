"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/providers/auth-provider";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { AccountUsageSummary } from "@/lib/billing/usage-summary-types";
import { dispatchCloseDropdowns } from "@/lib/ui/dropdown-events";

type UserMenuProps = {
  email: string;
  displayName: string;
  fullName: string;
  avatarUrl?: string | null;
  usageSummary?: AccountUsageSummary;
};

const MENU_WIDTH = 240;

type MenuPosition = {
  top: number;
  left: number;
};

function computeMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const margin = 12;
  const width = MENU_WIDTH;

  let left = rect.right - width;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

  return {
    top: rect.bottom + 8,
    left,
  };
}

export function UserMenu({
  email,
  displayName,
  fullName,
  avatarUrl,
  usageSummary,
}: UserMenuProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setPosition(computeMenuPosition(trigger));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    refreshPosition();
  }, [open, refreshPosition]);

  useEffect(() => {
    if (!open) return;

    function handleReposition() {
      refreshPosition();
    }

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, refreshPosition]);

  useEffect(() => {
    function handleCloseDropdowns(e: Event) {
      const except = (e as CustomEvent<{ except?: string }>).detail?.except;
      if (except === "user-menu") return;
      setOpen(false);
    }

    window.addEventListener("app:close-dropdowns", handleCloseDropdowns);
    return () => window.removeEventListener("app:close-dropdowns", handleCloseDropdowns);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 0);

    document.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function openMenu() {
    dispatchCloseDropdowns("user-menu");
    const trigger = triggerRef.current;
    if (trigger) {
      setPosition(computeMenuPosition(trigger));
    }
    setOpen(true);
  }

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    openMenu();
  }

  async function handleSignOut() {
    setSigningOut(true);
    setOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  }

  const menu =
    open && position && mounted
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Account menu"
            className="fixed z-[500] overflow-hidden rounded-xl border border-white/10 bg-[#0f0c1a] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
            style={{
              top: position.top,
              left: position.left,
              width: MENU_WIDTH,
            }}
          >
            <div className="border-b border-white/[0.08] px-3 py-2.5">
              <p className="truncate text-sm font-semibold tracking-[-0.02em] text-white">
                {displayName}
              </p>
              <p className="truncate text-xs text-white/55">{email}</p>
              {usageSummary && (
                <Link
                  href="/settings#billing"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-white/75 transition-colors hover:bg-white/[0.07]"
                >
                  <span className="truncate">{usageSummary.planDisplayName} plan</span>
                  <span className="shrink-0 text-white/45">· usage</span>
                </Link>
              )}
            </div>

            <div className="space-y-0.5 p-1.5">
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Account settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          toggleMenu();
        }}
        className="rounded-full focus:outline-none focus:ring-4 focus:ring-accent/[0.12]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="User menu"
      >
        <UserAvatar
          name={fullName}
          email={email}
          avatarUrl={avatarUrl}
          size="sm"
        />
      </button>

      {menu}
    </div>
  );
}
