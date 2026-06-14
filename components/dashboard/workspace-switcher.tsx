"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/components/providers/workspace-provider";

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, switching, switchWorkspace } =
    useWorkspace();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        className="flex w-full items-center gap-2.5 rounded-xl bg-black/[0.03] px-3 py-2.5 text-left text-[13px] font-medium text-text-primary transition-all duration-200 hover:bg-black/[0.05] disabled:opacity-60"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-accent to-[#9333ea] text-[10px] font-bold text-white">
          {activeWorkspace.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate">{activeWorkspace.name}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={`shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
          className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[240px] overflow-hidden rounded-2xl bg-white/95 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl"
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    workspace.id === activeWorkspace.id
                      ? "bg-accent/8 text-accent"
                      : "text-text-primary hover:bg-black/[0.04]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                      workspace.id === activeWorkspace.id
                        ? "bg-accent text-white"
                        : "bg-black/[0.05] text-text-secondary"
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

          <div className="mt-1 pt-1">
            <Link
              href="/onboarding?mode=new"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/8"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
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
