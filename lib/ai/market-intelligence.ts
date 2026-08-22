import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildIntelligenceBrief, formatIntelligenceForPrompt } from "@/lib/ai/intelligence";
import type { MarketIntelligenceResult } from "@/lib/ai/pipeline-types";

/**
 * JOB 2 — Market Intelligence. Reuses the existing Tavily + Meta Ad Library
 * integration (`buildIntelligenceBrief`) unchanged — no new model calls.
 * Degrades gracefully: if research is unavailable/fails, downstream jobs
 * receive `degraded: true` and no market context, rather than fabricated
 * competitive claims.
 */
export async function buildMarketIntelligence(
  supabase: SupabaseClient,
  workspaceId: string,
  category: string,
  platforms: string[]
): Promise<MarketIntelligenceResult> {
  try {
    const brief = await buildIntelligenceBrief(supabase, workspaceId, category, platforms);
    if (!brief) {
      return { brief: null, degraded: true };
    }
    return {
      brief,
      briefText: formatIntelligenceForPrompt(brief),
      degraded: false,
    };
  } catch {
    return { brief: null, degraded: true };
  }
}
