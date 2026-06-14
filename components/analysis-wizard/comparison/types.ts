import type { CreativeGoal } from "@/lib/analyses/creative-goals";
import type { CreativeTab, WizardCreativeState } from "../types";
import type { ComparisonTestDimension } from "@/lib/types/comparison";

export type VariantSlotState = {
  label: string;
  creativeTab: CreativeTab;
  creative: WizardCreativeState;
};

export type ComparisonWizardState = {
  step: 1 | 2 | 3 | 4 | 5;
  creativeGoal: CreativeGoal | null;
  testDimensions: ComparisonTestDimension[];
  variants: VariantSlotState[];
  platform: string;
  platformOther: string;
  landingPageUrl: string;
};

export const COMPARISON_WIZARD_STEPS = [
  { num: 1, label: "Goal" },
  { num: 2, label: "What to test" },
  { num: 3, label: "Variants" },
  { num: 4, label: "Context" },
  { num: 5, label: "Review" },
] as const;

export function createEmptyVariant(): VariantSlotState {
  return {
    label: "",
    creativeTab: "image",
    creative: {
      imageFile: null,
      imagePreview: null,
      videoFile: null,
      videoPreview: null,
      videoThumbnail: null,
      scriptContent: "",
    },
  };
}

export function createInitialComparisonState(
  brandUrl?: string | null
): ComparisonWizardState {
  return {
    step: 1,
    creativeGoal: null,
    testDimensions: [],
    variants: [createEmptyVariant(), createEmptyVariant()],
    platform: "",
    platformOther: "",
    landingPageUrl: brandUrl?.trim() || "",
  };
}
