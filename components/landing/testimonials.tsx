"use client";

import { motion } from "framer-motion";
import {
  AnimatedSection,
  StaggerContainer,
  staggerItem,
} from "./animated-section";

const featured = {
  quote:
    "We used to burn through $15k before knowing if a creative worked. Advara told us the landing page was the problem — not the ad. Saved us two weeks of wasted spend.",
  name: "Marcus Klein",
  role: "Founder",
  company: "Velour Skin Co.",
  avatar: "MK",
  color: "#6947ff",
  metric: "$12k saved on first test",
};

const testimonials = [
  {
    quote:
      "The multi-agent debate is what sold me. It's not one AI saying 'looks good' — five different perspectives tearing apart your funnel.",
    name: "Jessica Reyes",
    role: "Head of Media Buying",
    company: "Peak Nutrition",
    avatar: "JR",
    color: "#0d9488",
    metric: "34% CVR lift",
  },
  {
    quote:
      "Advara is now step zero before any launch. The rewrite suggestions alone are worth 10x the subscription.",
    name: "Sarah Lin",
    role: "Creative Strategist",
    company: "8 DTC brands",
    avatar: "SL",
    color: "#f59e0b",
    metric: "40+ creatives",
  },
  {
    quote:
      "Our agency started offering 'pre-launch funnel audits' powered by Advara. Creative approval rate went from 40% to 78%.",
    name: "Alex Porter",
    role: "DTC Operator",
    company: "Scalehouse Agency",
    avatar: "AP",
    color: "#ef4444",
    metric: "78% approval rate",
  },
];

export function Testimonials() {
  return (
    <AnimatedSection className="landing-section-proof section-padding relative overflow-x-clip">
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        {/* Editorial header — asymmetric */}
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              Social proof
            </p>
            <h2 className="font-display max-w-xl text-[2rem] font-semibold leading-[1.05] tracking-[-0.055em] text-text-primary md:text-[3.25rem]">
              Built for people who spend real money on ads
            </h2>
          </div>
          <div className="hidden md:block">
            <div className="flex gap-1" aria-label="5 star rating">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="18" height="18" viewBox="0 0 14 14" fill="#f59e0b" aria-hidden>
                  <path d="M7 1L8.5 5H13L9.5 7.5L11 12L7 9.5L3 12L4.5 7.5L1 5H5.5L7 1Z" />
                </svg>
              ))}
            </div>
            <p className="mt-2 text-sm text-text-muted">From DTC founders & media buyers</p>
          </div>
        </div>

        {/* Featured quote — large editorial block */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-12 overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white p-8 shadow-[0_24px_80px_rgba(43,24,95,0.06)] md:p-12"
        >
          <span className="landing-quote-mark absolute -left-2 top-4 select-none md:left-6" aria-hidden>
            &ldquo;
          </span>

          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:gap-12">
            <blockquote className="font-display text-xl font-medium leading-[1.45] tracking-[-0.02em] text-text-primary md:text-2xl lg:text-[1.65rem]">
              {featured.quote}
            </blockquote>

            <div className="flex shrink-0 flex-col items-start gap-4 md:items-end md:text-right">
              <span className="rounded-full border border-accent/15 bg-accent-light px-4 py-1.5 text-sm font-semibold text-accent">
                {featured.metric}
              </span>
              <div className="flex items-center gap-3 md:flex-row-reverse">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-[0_12px_32px_rgba(105,71,255,0.25)]"
                  style={{ backgroundColor: featured.color }}
                >
                  {featured.avatar}
                </div>
                <div className="md:text-right">
                  <p className="font-semibold text-text-primary">{featured.name}</p>
                  <p className="text-sm text-text-muted">
                    {featured.role} · {featured.company}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Supporting quotes — horizontal strip on mobile, row on desktop */}
        <StaggerContainer className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={staggerItem}
              className="group rounded-2xl border border-zinc-200/60 bg-zinc-50/50 p-5 transition-all duration-300 hover:border-accent/15 hover:bg-white hover:shadow-[0_12px_40px_rgba(43,24,95,0.06)]"
            >
              <p className="text-sm leading-relaxed text-text-secondary">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-zinc-200/60 pt-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-bold text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{t.name}</p>
                    <p className="text-[10px] text-text-muted">
                      {t.role} · {t.company}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-accent">{t.metric}</span>
              </div>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </AnimatedSection>
  );
}
