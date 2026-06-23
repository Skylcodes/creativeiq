import type {
  AdBudget,
  AngleMode,
  AudienceTemperature,
  BriefGoal,
  ProductionResource,
} from "@/lib/types/brief";

export type BriefWizardState = {
  step: 1 | 2 | 3 | 4 | 5;
  goal: BriefGoal | "";
  platforms: string[];
  audienceTemperature: AudienceTemperature | "";
  audienceNotes: string;
  angleMode: AngleMode;
  angleIdea: string;
  productionResource: ProductionResource | "";
  adBudget: AdBudget | "";
  creativeDuration: string;
  landingPageUrl: string;
};

export type BriefWizardPrefill = {
  platform?: string;
  platforms?: string[];
  landingPageUrl?: string;
  angleIdea?: string;
};

export function createInitialBriefState(
  brandUrl?: string | null,
  prefill?: BriefWizardPrefill
): BriefWizardState {
  const hasAngle = Boolean(prefill?.angleIdea?.trim());
  const prefillPlatforms = prefill?.platforms?.length
    ? prefill.platforms
    : prefill?.platform
      ? prefill.platform.split(",").map((p) => p.trim()).filter(Boolean)
      : [];
  return {
    step: hasAngle ? 3 : 1,
    goal: "",
    platforms: prefillPlatforms,
    audienceTemperature: "",
    audienceNotes: "",
    angleMode: hasAngle ? "user_idea" : "surprise_me",
    angleIdea: prefill?.angleIdea?.trim() ?? "",
    productionResource: "",
    adBudget: "",
    creativeDuration: "",
    landingPageUrl: prefill?.landingPageUrl?.trim() || brandUrl?.trim() || "",
  };
}
