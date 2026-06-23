export const CREATIVE_GOALS = [
  {
    id: "drive_purchases",
    label: "Drive purchases",
    description:
      "This ad is built to convert cold or warm traffic into buyers directly.",
    icon: "cart",
  },
  {
    id: "generate_leads",
    label: "Generate leads",
    description:
      "This ad is designed to collect emails, sign-ups, or form submissions.",
    icon: "leads",
  },
  {
    id: "build_brand_awareness",
    label: "Build brand awareness",
    description:
      "This ad is built to get eyeballs, build recognition, and expand reach — not direct conversion.",
    icon: "awareness",
  },
  {
    id: "promote_sale",
    label: "Promote a sale or offer",
    description:
      "This ad is announcing a specific deal, discount, or limited time offer.",
    icon: "sale",
  },
  {
    id: "launch_product",
    label: "Launch a new product",
    description:
      "This ad is introducing something new to the market for the first time.",
    icon: "launch",
  },
  {
    id: "retarget_warm",
    label: "Retarget warm audiences",
    description:
      "This ad speaks to people who already know the brand — past visitors, engagers, or customers.",
    icon: "retarget",
  },
] as const;

export type CreativeGoal = (typeof CREATIVE_GOALS)[number]["id"];

export const DEFAULT_CREATIVE_GOAL: CreativeGoal = "drive_purchases";

export function isCreativeGoal(value: string | null | undefined): value is CreativeGoal {
  return CREATIVE_GOALS.some((g) => g.id === value);
}

export function normalizeCreativeGoal(
  value: string | null | undefined
): CreativeGoal {
  return isCreativeGoal(value) ? value : DEFAULT_CREATIVE_GOAL;
}

export function getCreativeGoalMeta(goal: CreativeGoal) {
  return CREATIVE_GOALS.find((g) => g.id === goal) ?? CREATIVE_GOALS[0];
}

export function getCreativeGoalLabel(goal: CreativeGoal): string {
  return getCreativeGoalMeta(goal).label;
}

/** One-line note shown on reports explaining score calibration. */
export function getCreativeGoalScoreContext(goal: CreativeGoal): string {
  switch (goal) {
    case "drive_purchases":
      return "This score reflects how well this creative drives direct purchases — conversion-first calibration.";
    case "generate_leads":
      return "This score reflects how well this creative generates leads — not direct purchase conversion.";
    case "build_brand_awareness":
      return "This score reflects how well this creative performs as a brand awareness ad — not a direct response ad.";
    case "promote_sale":
      return "This score reflects how clearly and urgently this creative promotes a specific offer.";
    case "launch_product":
      return "This score reflects how well this creative introduces and excites buyers about a new product.";
    case "retarget_warm":
      return "This score reflects how well this creative re-engages warm audiences — not cold-traffic conversion.";
    default:
      return "This score is calibrated to your selected creative goal.";
  }
}

/** Agent + synthesis evaluation framework per goal. */
export function getCreativeGoalEvaluationBlock(goal: CreativeGoal): string {
  switch (goal) {
    case "drive_purchases":
      return `CREATIVE GOAL: DRIVE PURCHASES (baseline conversion-first mode)
Evaluate as a direct response ad. Hook must stop scroll and create desire. CTA must be direct. Landing page alignment is critical. Score harshly on friction between ad and purchase decision.
IN-AD PRICE IS IRRELEVANT: whether the ad shows price does not affect creative quality — omitting price is normal and never a score penalty.`;

    case "generate_leads":
      return `CREATIVE GOAL: GENERATE LEADS
Do NOT evaluate on direct sales language — that is not the goal. Evaluate: curiosity created, barrier to giving information lowered, value of the lead magnet crystal clear, CTA soft and benefit-led (not purchase-driven). Friction reduction is paramount — does signing up feel effortless and worthwhile? Score lower on hard-sell purchase CTAs.`;

    case "build_brand_awareness":
      return `CREATIVE GOAL: BUILD BRAND AWARENESS
Do NOT score on conversion metrics. Do NOT penalize lacking a strong purchase CTA — that is not what this ad is for. Evaluate: memorability, emotional resonance, brand distinctiveness, visual impact, shareability, whether brand identity is communicated clearly and memorably. A beautifully produced aspirational ad should score highly even if it would fail as DR. Skeptical Buyer: would someone remember the brand positively — not buy immediately.`;

    case "promote_sale":
      return `CREATIVE GOAL: PROMOTE A SALE OR OFFER
Evaluate urgency, deal clarity, and specificity. Is the deal immediately obvious when the ad IS selling a deal? Is urgency genuine (real deadline, discount amount, quantity limit) vs vague manufactured urgency? Does the offer stand out? Landing page must match the exact deal shown in the ad.
If the ad does not lead with a specific deal, in-ad price omission is still not a flaw.`;

    case "launch_product":
      return `CREATIVE GOAL: LAUNCH A NEW PRODUCT
Evaluate how well the ad introduces something unfamiliar. Does it make the new product feel necessary and exciting without relying on prior brand awareness? Is purpose immediately clear to someone who never heard of it? Educational clarity + excitement simultaneously — explain AND excite.`;

    case "retarget_warm":
      return `CREATIVE GOAL: RETARGET WARM AUDIENCES
This audience already knows the brand. Evaluate: acknowledges implicit familiarity without being presumptuous, addresses the specific objection that stopped first conversion, messaging more specific/direct than cold ads (assumes prior knowledge), creates a fresh reason to return not repetitive rehash. Score lower on long explanatory brand copy — they don't need the brand explained.`;

    default:
      return getCreativeGoalEvaluationBlock(DEFAULT_CREATIVE_GOAL);
  }
}

/** Landing-page scoring categories + weights for synthesis JSON (sum = 100). */
export function getCreativeGoalScoringBlock(goal: CreativeGoal): string {
  switch (goal) {
    case "build_brand_awareness":
      return `SCORING CATEGORIES FOR THIS GOAL (sum = 100) — brand awareness calibration:
- message_match (25): does the page reinforce brand identity and the ad's emotional/aspirational promise?
- hook_strength (20): above-fold brand presence and memorability
- social_proof (5): minimal — not primary for awareness; light deduction if missing
- offer_clarity (5): minimal — do NOT penalize weak purchase offer on awareness ads
- objection_handling (10): trust and brand credibility
- visual_ux (15): visual impact and brand distinctiveness
- brand_memorability (20): REPLACE funnel_continuity — will viewers remember this brand? Distinctive identity, emotional stickiness, shareability signals

Do NOT include funnel_continuity. Use key "brand_memorability" with label "Brand Memorability", maxScore 20.`;

    case "generate_leads":
      return `SCORING CATEGORIES FOR THIS GOAL (sum = 100) — lead generation calibration:
- message_match (20): page delivers on ad's lead promise
- hook_strength (15)
- social_proof (8): LP trust signals — recommend when missing; deduct lightly only
- lead_magnet_clarity (22): REPLACE offer_clarity — is the value exchange for the lead unmistakable?
- objection_handling (15): friction and trust around giving information
- visual_ux (10)
- funnel_continuity (10): destination may be a simple form

Use key "lead_magnet_clarity" with label "Lead Magnet Clarity", maxScore 22. social_proof maxScore 8.`;

    case "retarget_warm":
      return `SCORING CATEGORIES FOR THIS GOAL (sum = 100) — retargeting calibration:
- message_match (22)
- hook_strength (10): reduced — warm audiences need less pattern interrupt
- social_proof (8): LP trust — light deduction if missing; not required in ad
- offer_clarity (15)
- objection_handling (25): INCREASED — addressing hesitation that blocked first conversion is critical
- visual_ux (10)
- funnel_continuity (10)

Increase objection_handling maxScore to 25. Reduce hook_strength maxScore to 10. social_proof maxScore 8.`;

    case "promote_sale":
      return `SCORING CATEGORIES FOR THIS GOAL (sum = 100) — sale/offer calibration:
- message_match (25): page must show the EXACT deal from the ad
- hook_strength (15)
- social_proof (8): LP trust — recommend when missing; modest deduction only
- offer_clarity (27): INCREASED — deal specificity and urgency
- objection_handling (10)
- visual_ux (5)
- funnel_continuity (10): deal continuity ad → page is critical`;

    case "launch_product":
      return `SCORING CATEGORIES FOR THIS GOAL (sum = 100) — product launch calibration:
- message_match (20): page explains the new product clearly
- hook_strength (22): curiosity and novelty in first impression
- social_proof (8): LP trust — light deduction if missing
- offer_clarity (15): what it is and how to get it
- objection_handling (15): "what is this?" and "why now?" for unfamiliar buyers
- visual_ux (10)
- funnel_continuity (10): launch narrative continuity`;

    case "drive_purchases":
    default:
      return `SCORING CATEGORIES FOR THIS GOAL (sum = 100) — standard conversion calibration:
- message_match (22), hook_strength (15), social_proof (8): LP trust only — recommend when missing, deduct lightly; NOT required in ad, offer_clarity (15), objection_handling (17), visual_ux (10), funnel_continuity (13)`;
  }
}
