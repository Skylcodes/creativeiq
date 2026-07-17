import type {
  DerivedOutcomeMetrics,
  RawOutcomeMetrics,
} from "@/lib/types/outcome";

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null || denominator <= 0) return null;
  return numerator / denominator;
}

/**
 * Derived metrics are always computed from raw inputs — never stored or
 * edited directly — so a record can't contradict itself.
 */
export function computeDerivedMetrics(
  raw: RawOutcomeMetrics,
  goalKind: "purchases" | "leads"
): DerivedOutcomeMetrics {
  const conversions = goalKind === "leads" ? raw.leads : raw.purchases;

  return {
    ctr: ratio(raw.clicks, raw.impressions),
    cpc: ratio(raw.spend, raw.clicks),
    cpa: ratio(raw.spend, conversions),
    roas: ratio(raw.revenue, raw.spend),
    conversionRate: ratio(conversions, raw.clicks),
  };
}

/** Lead-gen analyses measure leads; every other creative goal measures purchases. */
export function goalKindForCreativeGoal(
  goal: string | undefined
): "purchases" | "leads" {
  return goal === "generate_leads" ? "leads" : "purchases";
}
