export type BriefStatus =
  | "processing"
  | "awaiting_angle"
  | "completed"
  | "failed";

export type BriefGenerationPhase = "angles" | "full_brief";

export type BriefGoal =
  | "drive_purchases"
  | "generate_leads"
  | "brand_awareness"
  | "promote_sale"
  | "launch_product"
  | "retarget_warm";

export type AudienceTemperature = "cold" | "warm" | "hot";

export type ProductionResource =
  | "full_production"
  | "in_house"
  | "ugc_creator"
  | "phone_only";

export type AdBudget = "under_500" | "500_2000" | "2000_10000" | "10000_plus";

export type AngleMode = "user_idea" | "surprise_me";

export type BriefWizardInput = {
  goal: BriefGoal;
  platform: string;
  audienceTemperature: AudienceTemperature;
  audienceNotes?: string;
  angleMode: AngleMode;
  angleIdea?: string;
  productionResource: ProductionResource;
  adBudget: AdBudget;
  creativeDuration: string;
  landingPageUrl: string;
};

export type BriefAngleOption = {
  id: string;
  name: string;
  description: string;
  emotionalHook: string;
  productionFormat: string;
};

export type BriefHookOption = {
  rank: number;
  hook: string;
  openingVisual?: string;
  rationale: string;
};

export type BriefShot = {
  shotNumber: number;
  onScreen: string;
  textOverlay?: string;
  durationSeconds?: number;
  direction: string;
};

export type CreativeBriefDocument = {
  schemaVersion: 1;
  generatedAt: string;
  header: {
    campaignGoal: string;
    targetAudience: string;
    platform: string;
    audienceTemperature: string;
    productionResources: string;
    strategicRationale: string;
  };
  angle: {
    name: string;
    explanation: string;
    emotion: string;
    belief: string;
  };
  hookOptions: BriefHookOption[];
  script: string;
  shotList: BriefShot[];
  productionNotes: string;
  ctaGuidance: {
    primary: string;
    alternative: string;
    placement: string;
    rationale: string;
  };
  whatToAvoid: string[];
};

export type CreativeBrief = {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  status: BriefStatus;
  generation_phase: BriefGenerationPhase;
  input: BriefWizardInput;
  angle_options: BriefAngleOption[] | null;
  selected_angle_id: string | null;
  brief: CreativeBriefDocument | null;
  error_message: string | null;
  processing_started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateBriefInput = {
  workspaceId: string;
  input: BriefWizardInput;
};
