import type { CreativeGoal } from "@/lib/analyses/creative-goals";

export type CreativeTab = "image" | "video" | "script";

export type WizardCreativeState = {
  imageFile: File | null;
  imagePreview: string | null;
  videoFile: File | null;
  videoPreview: string | null;
  videoThumbnail: string | null;
  scriptContent: string;
};

export const FUNNEL_WIZARD_STEPS = [
  { num: 1, label: "Goal" },
  { num: 2, label: "Platform" },
  { num: 3, label: "Creative" },
  { num: 4, label: "Landing page" },
  { num: 5, label: "Review" },
] as const;

export type WizardState = {
  step: 1 | 2 | 3 | 4 | 5;
  creativeGoal: CreativeGoal | null;
  platforms: string[];
  platformOther: string;
  creativeTab: CreativeTab;
  creative: WizardCreativeState;
  landingPageUrl: string;
};

export const INITIAL_CREATIVE: WizardCreativeState = {
  imageFile: null,
  imagePreview: null,
  videoFile: null,
  videoPreview: null,
  videoThumbnail: null,
  scriptContent: "",
};

export function createInitialWizardState(defaultLandingUrl: string): WizardState {
  return {
    step: 1,
    creativeGoal: null,
    platforms: [],
    platformOther: "",
    creativeTab: "image",
    creative: { ...INITIAL_CREATIVE },
    landingPageUrl: defaultLandingUrl,
  };
}
