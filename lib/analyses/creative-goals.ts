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

