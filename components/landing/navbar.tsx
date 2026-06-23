"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/shared/logo";

const navLinks = [
  { label: "Problem", href: "#problem" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Agents", href: "#agents" },
  { label: "Features", href: "#output" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (value) => {
    setIsScrolled(value > 48);
  });

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 md:px-6 md:pt-5">
      <motion.div
        layout
        className={`landing-nav-island pointer-events-auto w-full max-w-4xl overflow-hidden transition-[border-radius,box-shadow,background] duration-300 ${
          isScrolled ? "landing-nav-island-scrolled" : ""
        } ${mobileOpen ? "rounded-[22px]" : "rounded-full"}`}
      >
        <nav
          className="flex items-center justify-between gap-3 px-3 py-2.5 md:gap-4 md:px-5 md:py-3"
          aria-label="Main navigation"
        >
          <Logo href="/" size="sm" tone="dark" />

          <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-white/65 transition-colors hover:bg-white/8 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <a
              href="/sign-in"
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-white/70 transition-colors hover:text-white"
            >
              Sign in
            </a>
            <a
              href="/sign-up"
              className="rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(105,71,255,0.35)] transition-transform hover:scale-[1.02]"
            >
              Analyze my funnel
            </a>
          </div>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/80 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle menu"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
              {mobileOpen ? (
                <path
                  d="M4 4L14 14M14 4L4 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M2 5H16M2 9H16M2 13H16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </nav>

        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="border-t border-white/10 px-3 pb-3 pt-1 md:hidden"
          >
            <div className="flex flex-col gap-0.5">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/8 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/sign-in"
                className="rounded-xl px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/8 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </a>
              <a
                href="/sign-up"
                className="mt-2 rounded-full bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white"
                onClick={() => setMobileOpen(false)}
              >
                Analyze my funnel
              </a>
            </div>
          </motion.div>
        )}
      </motion.div>
    </header>
  );
}
