"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/components/providers/workspace-provider";

type WorkspaceSwitcherProps = {
  variant?: "light" | "dark";
};

export function WorkspaceSwitcher({ variant = "light" }: WorkspaceSwitcherProps) {
  const { workspaces, activeWorkspace, switching, switchWorkspace } =
    useWorkspace();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = variant === "dark";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!activeWorkspace) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={switching}
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold tracking-[-0.01em] transition-all duration-200 disabled:opacity-60 ${
          isDark
            ? "border border-white/10 bg-white/8 text-white hover:bg-white/12"
            : "border border-black/6 bg-white/70 text-text-primary hover:border-[#6947ff]/20 hover:bg-white"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white ${
            isDark ? "bg-[#6947ff]" : "bg-[#4c3d8f]"
          }`}
        >
          {activeWorkspace.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate">{activeWorkspace.name}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${
            isDark ? "text-white/50" : "text-text-muted"
          }`}
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
      </button>

      {open && (
        <div
          className="dash-card absolute left-0 top-full z-50 mt-2 w-full min-w-[250px] overflow-hidden p-1.5"
          role="listbox"
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            Workspaces
          </p>

          <ul className="max-h-60 overflow-y-auto">
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
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                    workspace.id === activeWorkspace.id
                      ? "bg-[#6947ff]/10 text-[#4c3d8f]"
                      : "text-text-primary hover:bg-[#f6f7fb]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                      workspace.id === activeWorkspace.id
                        ? "bg-[#4c3d8f] text-white"
                        : "bg-[#f0f1f6] text-text-secondary"
                    }`}
                  >
                    {workspace.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{workspace.name}</p>
                    <p className="truncate text-[11px] text-text-muted">
                      {workspace.brand_url}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-1 border-t border-black/5 pt-1">
            <Link
              href="/onboarding?mode=new"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#4c3d8f] transition-colors hover:bg-[#6947ff]/8"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6947ff]/10 text-[#6947ff]">
                +
              </span>
              New workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
