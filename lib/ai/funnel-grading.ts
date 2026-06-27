import { callClaude, callClaudeJSON, CLAUDE_JSON_MODEL, type ImageInput } from "@/lib/ai/client";
import { truncateLandingPageForAgents } from "@/lib/ai/brand-profile-prompt";
import {
  buildContextBlock,
  buildDrCriticSystemPrompt,
  buildFunnelReportSystemPrompt,
  buildSkepticalBuyerSystemPrompt,
  toGradingPromptScenario,
} from "@/lib/ai/prompts";
import { getCreativeGoalScoringBlock, normalizeCreativeGoal } from "@/lib/analyses/creative-goals";
import type { CreativeGoal } from "@/lib/analyses/creative-goals";
import { extractDrRewriteSeed } from "@/lib/report/script-rewrite";
import type {
  AnalysisReport,
  ConversionCategory,
  CriteriaSeverityTier,
  IcpSimulation,
} from "@/lib/types/report";

const AGENT_SUFFIX = "Give your analysis now, fully in character.";

export const FUNNEL_SYNTHESIS_INSTRUCTIONS = [
  "0. BEFORE SCORING — ESTABLISH FLOOR: Name 2–3 specific mechanisms this ad uses that clearly work (quote the exact phrase, frame, or format). These establish your score floor. An ad that stops scroll + communicates its offer clearly cannot score below 65/65 on strategic/retention regardless of other agent findings. Deduct only from confirmed critical problems on top of that floor.",
  "1. Grade creative strength through the CREATIVE GOAL lens in context — not generic conversion-first unless goal is drive_purchases.",
  "2. scriptRewrite MUST be a complete spoken script (80+ words): hook → body → proof → offer → CTA, THEN a final line starting with 'Production note:'. NEVER output only a production note — that field is INVALID without the full script above it. Extend the DR Critic REWRITE section when present.",
  "3. agentFindings: EXACTLY 2 entries (skeptical_buyer, direct_response) — quote THIS ad; 3+ keyFindings each.",
  "4. priorityActions: 3-5 only when each has a real mechanism of harm or clear upside; full strategic breakdown on every item.",
  "5. SCORING — SIX-QUESTION CHECK (answer before setting scores): (1) Would a stranger stop scrolling at the opening frame? (2) Would they understand the offer in under 10 seconds? (3) Would the target customer care about this angle? (4) Would they trust the brand enough to click? (5) Is the next action obvious? (6) Is this competitive vs real ads in this niche? 'Yes' answers are your score floor — do NOT let minor imperfections erase genuine strengths. 'No' answers require a named mechanism of harm or they don't affect scores.",
  "6. SCORING INDEPENDENCE: strategicScore and retentionScore reflect raw creative quality only — messaging strength and organic watchability. Do NOT factor criteriaChecklist pass/fail results into these scores. The system applies a separate deterministic calibration for checklist results after your response. If you also reduce scores for checklist failures, the flaw gets penalized twice.",
  "7. AGENT TONE VS. SCORE CALIBRATION: Both agents are designed to push-test the creative — their harsh language is for critique quality, not score calibration. Extract their observations. Set scores from the six-question framework and SCORE CALIBRATION rules — not from the volume or harshness of agent criticism. When Skeptical Buyer and DR Critic disagree significantly: use DR Critic for strategic/messaging assessment; use Skeptical Buyer for organic watchability feel. Their disagreement is data, not a reason to average down.",
  "8. Never lower scores because this ad omitted product features outside its chosen angle.",
  "9. AUDIENCE: If the ad targets a valid buyer who could purchase this product — even when the landing page hero copy describes a different entry-point persona — do NOT penalize, block, or call it 'wrong audience'. Different ad/LP entry points are normal DTC strategy.",
  "10. IN-AD PRICE: Whether the ad mentions price is irrelevant to creative quality — never score down, block, or criticize for omitting price. Only flag price when the ad explicitly promised a specific deal and failed to state it.",
  "11. IN-AD SOCIAL PROOF: Testimonials, review counts, and stat stacks in the ad are not required — LP handles trust. Missing LP social proof = recommend adding it + light funnel deduction only, never a major penalty or blocker.",
  "12. RELEVANCE: Missing data proof, hard CTA, or LP angle mirroring is not a flaw unless this ad's goal required it and the absence creates specific harm.",
  "13. COMMON HOOKS: Do not penalize familiar TikTok/Reels openers — judge whether the hook works, not whether viewers have seen the format before.",
  "14. ICP personas: simulate plausible product buyers reacting honestly — not landing-page demographic clones.",
  "15. VIDEO: If creative is video, analyze ONLY primary ad messaging + on-screen text — never song lyrics or background audio as brand copy.",
  "16. RETENTION SCORING: retentionScore uses the organic-post test (algorithm logic — completion rate, skip rate, replay signals) and should reflect likely organic distribution tier (above-average / average / below-average / poor). strategicScore = messaging quality. creativeStrengthScore blends both.",
  "17. Use Meta Ad Library intelligence for engagement benchmarks — what formats/pacing scaled advertisers run in this niche.",
  "18. SEVERITY: After relevance gate confirms pass=false, classify each flaw critical/moderate/minor using CATEGORY TOLERANCE SIGNALS. Critical flaws drive most score reduction; minor/tolerable flaws cost almost nothing. Same fail count + different severities = different scores.",
  "19. ACTION PLAN: Lead with critical fixes. Do not present minor/tolerable flaws with the same urgency as conversion killers — no severity labels in user-facing text.",
  "20. META-CRITIQUE: If the ad shows a reference clip/ad on screen while VO critiques/reacts, viewers understand the format — do NOT block or score down for 'whose ad is this' or OS text 'contradicting' voiceover. Grade the teardown hook + pivot to YOUR product.",
  "21. STATIC IMAGE: When AD CREATIVE is an image, grade thumb-stop + in-frame message only — NEVER penalize for lacking video, motion, pacing, creator voice, or 'competing against video'. Static is a valid format.",
  "22. WEAK AD FLOOR: A genuinely weak ad (2+ 'no' answers from the six-question check with named mechanisms of harm) should score in the 40–58 range. Do not inflate weak ads just because they have a few decent elements — elements that work cannot compensate for a broken hook or an unclear offer.",
  "23. BUSINESS CONTEXT: Read category, offerStructure, and offerGuarantee from the brand profile before criticizing policies, guarantees, pricing, or trust elements. Do not recommend 'add 30-day returns' or similar unless the product category expects it AND the absence creates a real conversion doubt for THIS buyer.",
  "24. INTENTIONAL BRAND DECISIONS: No return policy, subscription-only offers, premium pricing, or minimal guarantees are not automatic flaws. Penalize only when they leave a meaningful unresolved doubt that would stop purchase for someone who clicked THIS ad.",
  "25. OBJECTION HANDLING SCORE: Grade whether the page resolves the MAIN doubts for THIS product type (efficacy, safety, value, fit) — not whether every generic ecommerce trust badge exists.",
  "26. VIDEO VISUAL EVIDENCE: For video ads, read VISUAL TIMELINE in the creative brief. Gemini full-video mode = trust persistence claims from the timeline. Frame-sampled mode = do not claim one-off timing unless a single frame shows it.",
].join("\n");

export type FunnelGradingInput = {
  brandProfileText: string;
  creativeText: string;
  creativeIsImage: boolean;
  creativeIsVideo: boolean;
  creativeGoal?: CreativeGoal;
  landingPageText: string;
  landingPageStatus: "ok" | "partial" | "failed";
  platformText: string;
  intelligenceBriefText?: string;
  criteriaText?: string;
  visionImage?: ImageInput;
};

export type FunnelReportRaw = {
  conversionCategories: ConversionCategory[];
  verdictSummary: string;
  headline: string;
  creativeStrengthScore: number;
  strategicScore?: number;
  retentionScore?: number;
  retentionVerdict?: string;
  angleTags: AnalysisReport["angleTags"];
  agentFindings: AnalysisReport["agentFindings"];
  angleRecommendations: AnalysisReport["angleRecommendations"];
  topBlockers: AnalysisReport["topBlockers"];
  hookVariants: AnalysisReport["hookVariants"];
  scriptRewrite: string;
  priorityActions: AnalysisReport["priorityActions"];
  criteriaChecklist?: {
    id: string;
    pass: boolean | null;
    note: string;
    severity?: CriteriaSeverityTier;
  }[];
  icpSimulation?: IcpSimulation;
  competitiveInsights?: string[];
};

export type FunnelGradingResult = {
  report: FunnelReportRaw;
  buyer: string;
  drCritic: string;
  drRewriteSeed: string;
};

function buildFunnelSynthesisPrompt(
  buyer: string,
  drCritic: string,
  drRewriteSeed: string,
  goalScoringBlock: string
): string {
  return [
    "=== AGENT — THE SKEPTICAL BUYER ===",
    buyer,
    "",
    "=== AGENT — THE DIRECT RESPONSE CRITIC ===",
    drCritic,
    "",
    ...(drRewriteSeed
      ? [
          "=== DR CRITIC SCRIPT SEED (extend this — do NOT replace with generic copy) ===",
          drRewriteSeed.slice(0, 1200),
          "",
        ]
      : []),
    "GOAL-SPECIFIC SCORING (conversionCategories + creativeStrengthScore):",
    goalScoringBlock,
    "",
    "SYNTHESIS INSTRUCTIONS:",
    FUNNEL_SYNTHESIS_INSTRUCTIONS,
    "",
    "Produce the complete funnel report JSON now.",
  ].join("\n");
}

/** Shared funnel grading: same agents + FUNNEL_REPORT_SYSTEM synthesis as standalone analysis. */
export async function runFunnelGrading(
  input: FunnelGradingInput
): Promise<FunnelGradingResult> {
  const creativeGoal = normalizeCreativeGoal(input.creativeGoal);
  const agentLandingPageText = truncateLandingPageForAgents(input.landingPageText);
  const goalScoringBlock = getCreativeGoalScoringBlock(creativeGoal);

  const promptScenario = toGradingPromptScenario({
    creativeIsImage: input.creativeIsImage,
    creativeIsVideo: input.creativeIsVideo,
    criteriaText: input.criteriaText,
    intelligenceBriefText: input.intelligenceBriefText,
  });

  const agentContext = buildContextBlock({
    brandProfileText: input.brandProfileText,
    creativeText: input.creativeText,
    creativeIsImage: input.creativeIsImage,
    creativeIsVideo: input.creativeIsVideo,
    creativeGoal,
    landingPageText: agentLandingPageText,
    landingPageStatus: input.landingPageStatus,
    platformText: input.platformText,
    intelligenceBriefText: input.intelligenceBriefText,
    criteriaText: input.criteriaText,
  });

  const gradingContext = buildContextBlock({
    brandProfileText: input.brandProfileText,
    creativeText: input.creativeText,
    creativeIsImage: input.creativeIsImage,
    creativeIsVideo: input.creativeIsVideo,
    creativeGoal,
    landingPageText: input.landingPageText,
    landingPageStatus: input.landingPageStatus,
    platformText: input.platformText,
    intelligenceBriefText: input.intelligenceBriefText,
    criteriaText: input.criteriaText,
  });

  const agentImage = input.creativeIsImage ? undefined : input.visionImage;

  const [buyer, drCritic] = await Promise.all([
    callClaude({
      system: buildSkepticalBuyerSystemPrompt(promptScenario),
      cachedContext: agentContext,
      prompt: AGENT_SUFFIX,
      maxTokens: 1100,
      temperature: 0.8,
      model: CLAUDE_JSON_MODEL,
    }),
    callClaude({
      system: buildDrCriticSystemPrompt(promptScenario),
      cachedContext: agentContext,
      prompt: AGENT_SUFFIX,
      image: agentImage,
      maxTokens: 1700,
      temperature: 0.8,
    }),
  ]);

  const drRewriteSeed = extractDrRewriteSeed(drCritic);

  const report = await callClaudeJSON<FunnelReportRaw>({
    system: buildFunnelReportSystemPrompt(promptScenario),
    cachedContext: gradingContext,
    prompt: buildFunnelSynthesisPrompt(
      buyer,
      drCritic,
      drRewriteSeed,
      goalScoringBlock
    ),
    maxTokens: 7168,
    temperature: 0.2,
    grading: true,
  });

  return { report, buyer, drCritic, drRewriteSeed };
}
