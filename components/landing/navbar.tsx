"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useState } from "react";

const navLinks = [
  { label: "Problem", href: "#problem" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Agents", href: "#agents" },
  { label: "Report", href: "#output" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  const background = useTransform(
    scrollY,
    [0, 80],
    ["rgba(250, 250, 249, 0)", "rgba(250, 250, 249, 0.92)"]
  );
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);
  const shadow = useTransform(
    scrollY,
    [0, 80],
    ["0 0 0 rgba(0,0,0,0)", "0 1px 24px rgba(0,0,0,0.04)"]
  );

  return (
    <motion.header
      style={{ backgroundColor: background, boxShadow: shadow }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <motion.div
        style={{ opacity: borderOpacity }}
        className="absolute inset-x-0 bottom-0 h-px bg-black/6"
      />
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8"
        aria-label="Main navigation"
      >
        <a href="#" className="group flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-accent to-[#9333ea] shadow-[0_2px_12px_rgba(110,58,255,0.35)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8L7 4L11 8L7 12L3 8Z"
                fill="white"
                fillOpacity="0.9"
              />
              <circle cx="11" cy="5" r="2" fill="white" fillOpacity="0.6" />
            </svg>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-text-primary">
            CreativeIQ
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/sign-in"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Sign in
          </a>
          <a href="/sign-up" className="btn-primary text-sm !py-2.5 !px-5">
            Analyze my funnel
          </a>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-strong bg-white/80 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label="Toggle menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            {mobileOpen ? (
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M2 5H16M2 9H16M2 13H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-border bg-background/95 px-5 py-4 backdrop-blur-xl md:hidden"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="/sign-in"
              className="rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary"
              onClick={() => setMobileOpen(false)}
            >
              Sign in
            </a>
            <a
              href="/sign-up"
              className="btn-primary mt-3 w-full text-center"
              onClick={() => setMobileOpen(false)}
            >
              Analyze my funnel
            </a>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
