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
  platform: string;
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
  landingPageUrl?: string;
  angleIdea?: string;
};

export function createInitialBriefState(
  brandUrl?: string | null,
  prefill?: BriefWizardPrefill
): BriefWizardState {
  const hasAngle = Boolean(prefill?.angleIdea?.trim());
  return {
    step: hasAngle ? 3 : 1,
    goal: "",
    platform: prefill?.platform ?? "",
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
