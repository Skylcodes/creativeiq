"use client";

import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export const panelVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -14,
    filter: "blur(4px)",
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export function CountUp({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReducedMotion = useReducedMotion();
  const [animatedDisplay, setAnimatedDisplay] = useState(0);
  const display = prefersReducedMotion ? value : animatedDisplay;

  useEffect(() => {
    if (prefersReducedMotion || !inView) return;
    const controls = animate(0, value, {
      duration: 1.15,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setAnimatedDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, prefersReducedMotion]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

export function ScoreRing({
  score,
  label,
  color = "#6947ff",
  size = 76,
}: {
  score: number;
  label: string;
  color?: string;
  size?: number;
}) {
  const circumference = 2 * Math.PI * (size / 2 - 6);
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="landing-workflow-inset flex flex-col items-center gap-2 rounded-2xl p-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 6}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="5"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 6}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset:
                inView || prefersReducedMotion
                  ? circumference - circumference * (score / 100)
                  : circumference,
            }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <CountUp value={score} className="font-display text-xl font-bold text-white" />
        </div>
      </div>
      <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-white/45">
        {label}
      </p>
    </div>
  );
}

type ShowcaseCardProps = {
  children: ReactNode;
  className?: string;
  float?: boolean;
  accentRgb?: string;
};

export function ShowcaseCard({
  children,
  className = "",
  float = false,
  accentRgb = "105, 71, 255",
}: ShowcaseCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`landing-workflow-card rounded-[1.25rem] ${className}`}
      style={{ "--wf-card-accent-rgb": accentRgb } as CSSProperties}
      whileHover={
        prefersReducedMotion ? undefined : { y: -4, transition: { duration: 0.3 } }
      }
      animate={
        float && !prefersReducedMotion ? { y: [0, -5, 0] } : undefined
      }
      transition={
        float && !prefersReducedMotion
          ? { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    >
      <div className="relative z-[1]">{children}</div>
    </motion.div>
  );
}

export function GlassInset({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`landing-workflow-inset rounded-xl ${className}`}>{children}</div>
  );
}

export function GlassBadge({
  children,
  className = "",
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "success" | "warning" | "accent";
}) {
  const tones = {
    neutral: "text-white/55",
    success: "text-emerald-400",
    warning: "text-amber-400",
    accent: "text-accent-tertiary",
  };

  return (
    <span
      className={`landing-workflow-badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display text-xl font-semibold tracking-[-0.035em] text-white md:text-[1.65rem]">
      {children}
    </h3>
  );
}

export function PanelSubtitle({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/55">{children}</p>
  );
}

export function PanelOrbs({ accentRgb }: { accentRgb: string }) {
  return (
    <>
      <div
        className="landing-workflow-orb -left-16 top-8 h-48 w-48"
        style={{ background: `rgba(${accentRgb}, 0.25)` }}
      />
      <div
        className="landing-workflow-orb -right-12 bottom-4 h-40 w-40"
        style={{ background: `rgba(${accentRgb}, 0.14)` }}
      />
    </>
  );
}

export function MetricBar({
  label,
  value,
  color = "#6947ff",
  delay = 0,
}: {
  label: string;
  value: number;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div variants={staggerItem}>
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="font-medium text-white/50">{label}</span>
        <span className="font-bold text-white/90">
          <CountUp value={value} />%
        </span>
      </div>
      <div className="landing-workflow-metric-track h-2">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 14px ${color}55`,
          }}
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{children}</p>
  );
}
