import type { StrategicBreakdown as StrategicBreakdownType } from "@/lib/types/report";

type StrategicBreakdownProps = {
  breakdown: StrategicBreakdownType;
  compact?: boolean;
};

const FIELDS = [
  { key: "currentProblem" as const, label: "Current problem" },
  { key: "whyItMatters" as const, label: "Why it matters" },
  { key: "strategicFix" as const, label: "Strategic fix" },
  { key: "expectedImpact" as const, label: "Expected impact" },
];

export function StrategicBreakdown({
  breakdown,
  compact,
}: StrategicBreakdownProps) {
  const items = FIELDS.filter((f) => breakdown[f.key]?.trim());

  if (items.length === 0) return null;

  return (
    <div className={`mt-3 space-y-2.5 ${compact ? "text-sm" : ""}`}>
      {items.map(({ key, label }) => (
        <div key={key}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {label}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
            {breakdown[key]}
          </p>
        </div>
      ))}
    </div>
  );
}

export function hasStrategicBreakdown(
  breakdown: StrategicBreakdownType,
): boolean {
  return FIELDS.some((f) => Boolean(breakdown[f.key]?.trim()));
}
