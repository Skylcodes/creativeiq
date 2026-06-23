"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import { AnimatedSection } from "../animated-section";
import {
  BriefsPanel,
  ChatPanel,
  ComparisonPanel,
  DeconstructorPanel,
  FunnelAnalysisPanel,
} from "./panels";
import { panelVariants } from "./shared";

const WORKFLOW_TABS = [
  {
    id: "funnel",
    label: "Funnel Analysis",
    shortLabel: "Funnel",
    chrome: "Advara · Funnel analysis",
    accentRgb: "105, 71, 255",
    accentColor: "#6947ff",
    panel: FunnelAnalysisPanel,
  },
  {
    id: "deconstructor",
    label: "Ad Deconstructor",
    shortLabel: "Deconstruct",
    chrome: "Advara · Ad deconstruction",
    accentRgb: "239, 68, 68",
    accentColor: "#ef4444",
    panel: DeconstructorPanel,
  },
  {
    id: "comparison",
    label: "Variant Comparison",
    shortLabel: "Compare",
    chrome: "Advara · Variant comparison",
    accentRgb: "14, 165, 233",
    accentColor: "#0ea5e9",
    panel: ComparisonPanel,
  },
  {
    id: "briefs",
    label: "Creative Briefs",
    shortLabel: "Briefs",
    chrome: "Advara · Creative brief",
    accentRgb: "139, 92, 246",
    accentColor: "#8b5cf6",
    panel: BriefsPanel,
  },
  {
    id: "director",
    label: "AI Creative Director",
    shortLabel: "Director",
    chrome: "Advara · Creative Director",
    accentRgb: "13, 148, 136",
    accentColor: "#0d9488",
    panel: ChatPanel,
  },
] as const;

export function Features() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = WORKFLOW_TABS[activeIndex];
  const ActivePanel = activeTab.panel;

  return (
    <AnimatedSection
      id="output"
      className="landing-section-workflow section-padding relative overflow-x-clip"
    >
      {/* Grid overlay — war room feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
              Everything You Need To Create Better Ads
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="font-display text-[2rem] font-semibold leading-[1.06] tracking-[-0.055em] text-white md:text-[3rem]"
          >
            One Platform.{" "}
            <span className="text-accent-tertiary">Every Creative Decision.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg"
          >
            Analyze, deconstruct, compare, generate, and improve your advertising with an
            AI-powered creative intelligence system.
          </motion.p>
        </div>

        {/* Workflow navigator — agent-style pills */}
        <div className="mt-10 flex justify-center overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div
            role="tablist"
            aria-label="Advara workflow"
            className="inline-flex flex-nowrap items-stretch gap-1.5 sm:gap-2"
          >
            {WORKFLOW_TABS.map((tab, i) => {
              const isActive = activeIndex === i;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveIndex(i)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-2 transition-all duration-300 sm:px-3 sm:py-2.5 ${
                    isActive
                      ? "border-white/20 bg-white/10"
                      : "border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/8"
                  }`}
                >
                  <span
                    className="hidden h-2 w-2 shrink-0 rounded-full sm:block"
                    style={{
                      backgroundColor: isActive ? tab.accentColor : "rgba(255,255,255,0.25)",
                      boxShadow: isActive ? `0 0 8px ${tab.accentColor}` : undefined,
                    }}
                  />
                  <span className="whitespace-nowrap text-[10px] font-medium leading-none text-white/90 sm:text-[11px]">
                    <span className="hidden md:inline">{tab.label}</span>
                    <span className="md:hidden">{tab.shortLabel}</span>
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="workflow-pill-dot"
                      className="h-1 w-1 shrink-0 rounded-full bg-accent-tertiary sm:h-1.5 sm:w-1.5"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Showcase stage */}
        <div className="mt-8 md:mt-10">
          <motion.div
            layout
            className="landing-workflow-stage rounded-[28px]"
            style={{ "--wf-accent-rgb": activeTab.accentRgb } as CSSProperties}
          >
            {/* Chrome bar */}
            <div className="relative flex items-center gap-3 border-b border-white/8 px-5 py-4 md:px-6">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="text-[11px] font-medium text-white/45">{activeTab.chrome}</span>
              <span
                className="landing-workflow-badge ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white/55"
                style={{
                  borderColor: `rgba(${activeTab.accentRgb}, 0.25)`,
                  background: `rgba(${activeTab.accentRgb}, 0.12)`,
                  color: activeTab.accentColor,
                }}
              >
                Live preview
              </span>
            </div>

            <div className="relative p-5 md:p-8 lg:p-10">
              <PanelOrbs accentRgb={activeTab.accentRgb} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab.id}
                  role="tabpanel"
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative z-[1]"
                >
                  <ActivePanel accentRgb={activeTab.accentRgb} accentColor={activeTab.accentColor} />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatedSection>
  );
}

function PanelOrbs({ accentRgb }: { accentRgb: string }) {
  return (
    <>
      <div
        className="landing-workflow-orb -left-16 top-4 h-52 w-52"
        style={{ background: `rgba(${accentRgb}, 0.22)` }}
      />
      <div
        className="landing-workflow-orb -right-10 bottom-8 h-44 w-44"
        style={{ background: `rgba(${accentRgb}, 0.12)` }}
      />
    </>
  );
}
