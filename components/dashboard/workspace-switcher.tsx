"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWorkspace } from "@/components/providers/workspace-provider";
import {
  dispatchCloseDropdowns,
  shouldCloseDropdown,
} from "@/lib/ui/dropdown-events";

type WorkspaceSwitcherProps = {
  variant?: "light" | "dark";
  canAddWorkspace?: boolean;
  /** Icon-only trigger for collapsed sidebar */
  collapsed?: boolean;
};

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

const DROPDOWN_WIDTH = 248;

export function WorkspaceSwitcher({
  variant = "light",
  canAddWorkspace = true,
  collapsed = false,
}: WorkspaceSwitcherProps) {
  const { workspaces, activeWorkspace, switching, switchWorkspace } =
    useWorkspace();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = variant === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();

    if (collapsed) {
      setPosition({
        top: rect.top,
        left: rect.right + 8,
        width: DROPDOWN_WIDTH,
      });
      return;
    }

    setPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, DROPDOWN_WIDTH),
    });
  }

  useEffect(() => {
    if (!open) return;

    updatePosition();

    function handleReposition() {
      updatePosition();
    }

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, collapsed]);

  useEffect(() => {
    function handleCloseDropdowns(e: Event) {
      if (!shouldCloseDropdown(e, "workspace")) return;
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

  if (!activeWorkspace) return null;

  const initial = activeWorkspace.name.charAt(0).toUpperCase();

  function openMenu() {
    dispatchCloseDropdowns("workspace");
    updatePosition();
    setOpen(true);
  }

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    openMenu();
  }

  const dropdown =
    open && position && mounted
      ? createPortal(
          <div
            ref={menuRef}
            data-workspace-dropdown
            className="fixed z-[240] overflow-hidden rounded-xl border border-white/10 bg-[#0f0c1a] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            role="listbox"
          >
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
              Workspaces
            </p>

            <ul className="scrollbar-none max-h-60 overflow-y-auto">
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={workspace.id === activeWorkspace.id}
                    onClick={() => {
                      switchWorkspace(workspace.id);
                      setOpen(false);
                    }}
                    className={`flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      workspace.id === activeWorkspace.id
                        ? "bg-accent/15 text-white"
                        : "text-white/78 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                        workspace.id === activeWorkspace.id
                          ? "bg-linear-to-br from-[#2b185f] to-[#6947ff] text-white"
                          : "border border-white/10 bg-white/[0.04] text-white/55"
                      }`}
                    >
                      {workspace.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{workspace.name}</p>
                      <p className="truncate text-[11px] text-white/40">
                        {workspace.brand_url}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {canAddWorkspace && (
              <div className="mt-1 border-t border-white/[0.08] pt-1">
                <Link
                  href="/onboarding?mode=new"
                  onClick={() => setOpen(false)}
                  className="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-accent-tertiary transition-colors hover:bg-white/[0.06]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/15 text-accent-tertiary">
                    +
                  </span>
                  <span className="truncate">New workspace</span>
                </Link>
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  const triggerClass = isDark
    ? "border border-white/10 bg-white/[0.06] text-white hover:border-white/16 hover:bg-white/[0.09]"
    : "border border-white/10 bg-white/[0.04] text-white/90 hover:border-white/16 hover:bg-white/[0.07]";

  return (
    <div
      ref={containerRef}
      className={`relative min-w-0 ${collapsed ? "flex flex-col items-center gap-1.5" : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        disabled={switching}
        title={collapsed ? activeWorkspace.name : undefined}
        className={`flex min-w-0 items-center transition-colors disabled:opacity-60 ${
          collapsed
            ? `h-9 w-9 shrink-0 justify-center rounded-xl p-0 ${triggerClass}`
            : `w-full gap-2 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-semibold tracking-[-0.015em] ${triggerClass}`
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Workspace: ${activeWorkspace.name}`}
      >
        {collapsed ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-[#2b185f] to-[#6947ff] text-[11px] font-bold text-white">
            {initial}
          </span>
        ) : (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-[#2b185f] to-[#6947ff] text-[10px] font-bold text-white">
              {initial}
            </span>
            <span className="min-w-0 flex-1 truncate pr-1">{activeWorkspace.name}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} text-white/45`}
              aria-hidden
            >
              <path
                d="M3 5L7 9L11 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>

      {collapsed && canAddWorkspace && (
        <Link
          href="/onboarding?mode=new"
          title="New workspace"
          aria-label="New workspace"
          className="flex h-8 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-bold text-accent-tertiary transition-colors hover:border-accent/30 hover:bg-accent/10"
        >
          +
        </Link>
      )}

      {dropdown}
    </div>
  );
}
