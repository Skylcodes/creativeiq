"use client";

import Link from "next/link";
const PREVIEW_HOOKS = [
  { hook: "I used to lie awake doing sleep math at 2am…", platform: "TikTok", tag: "Founder Story" },
  { hook: "Nobody told me this about [product category] until I spent $400 finding out", platform: "Meta Feed", tag: "Curiosity Gap" },
  { hook: "POV: you finally found the thing your dermatologist keeps recommending", platform: "Instagram", tag: "Social Proof" },
];

export function HookLibraryEmpty() {
  return (
    <div className="premium-card premium-card-glass relative mt-10 overflow-hidden rounded-[32px] p-10 text-center shadow-premium">
      <div className="pointer-events-none absolute inset-0 opacity-40 blur-[2px]">
        <div className="grid gap-3 p-6 md:grid-cols-3">
          {PREVIEW_HOOKS.map((p, i) => (
            <div key={i} className="surface-inset rounded-2xl p-4 text-left">
              <p className="text-sm font-medium text-text-primary/70">&ldquo;{p.hook}&rdquo;</p>
              <div className="mt-3 flex gap-2">
                <span className="insight-chip px-2 py-0.5 text-[10px]">{p.platform}</span>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">{p.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="icon-badge mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/10 bg-accent/[0.1]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 8H20M4 12H16M4 16H12" stroke="#6947ff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.04em] text-text-primary">
          Your hook library is empty
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
          Save hook variants from your analyses and briefs, or add your own ideas manually. Over time
          this becomes your personal swipe file — searchable, filterable, and impossible to replicate
          elsewhere.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/analyses/new" className="btn-premium text-sm">
            Run your first analysis
          </Link>
          <Link href="/hooks?add=1" className="btn-outline text-sm">
            Add a hook manually
          </Link>
        </div>
      </div>
    </div>
  );
}
