"use client";

type HookTagPillProps = {
  label: string;
  variant?: "platform" | "angle" | "source" | "custom" | "score";
  score?: number | null;
};

const VARIANT_CLASSES: Record<NonNullable<HookTagPillProps["variant"]>, string> = {
  platform: "bg-[#1877f2]/10 text-[#1877f2]",
  angle: "bg-accent/10 text-accent",
  source: "bg-black/[0.05] text-text-secondary",
  custom: "bg-[#9333ea]/10 text-[#9333ea]",
  score: "bg-emerald-500/10 text-emerald-700",
};

function scoreClass(score: number): string {
  if (score >= 75) return "bg-emerald-500/10 text-emerald-700";
  if (score >= 55) return "bg-amber-500/10 text-amber-700";
  return "bg-red-500/10 text-red-600";
}

export function HookTagPill({ label, variant = "custom", score }: HookTagPillProps) {
  const cls =
    variant === "score" && score != null
      ? scoreClass(score)
      : VARIANT_CLASSES[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {variant === "score" && score != null ? `Score ${score}` : label}
    </span>
  );
}
