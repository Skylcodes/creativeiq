import type { CreativeGoal, CreativeType } from "@/lib/types/analysis";

export type ComparisonTestDimension =
  | "hook"
  | "script_copy"
  | "visual_style"
  | "cta"
  | "full_creative";

export type StoredAnalysisVariant = {
  id: string;
  label: string;
  creative_type: CreativeType;
  script_content?: string | null;
  creative_storage_path?: string | null;
  creative_file_name?: string | null;
  creative_mime_type?: string | null;
  thumbnail_url?: string | null;
  /** Individual evaluation score from pass 1 */
  score?: number;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string | null;
  production_note?: string | null;
  score_breakdown?: Record<string, number>;
};

export type ComparisonVariantInput = {
  label: string;
  creativeType: CreativeType;
  scriptContent?: string;
  creativeStoragePath?: string;
  creativeFileName?: string;
  creativeMimeType?: string;
  thumbnailUrl?: string;
};

export type CreateComparisonInput = {
  workspaceId: string;
  creativeGoal: CreativeGoal;
  platform: string;
  platformOther?: string;
  landingPageUrl: string;
  testDimensions: ComparisonTestDimension[];
  creativeType: CreativeType;
  variants: ComparisonVariantInput[];
};

export type ComparisonRanking = {
  variantId: string;
  label: string;
  rank: number;
  score: number;
  reason: string;
};

export type ComparisonVariantDetail = {
  variantId: string;
  label: string;
  score: number;
  scoreBreakdown: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  improvements?: string | null;
  productionNote?: string | null;
};

export type ComparisonReport = {
  schemaVersion: 2;
  generatedAt: string;
  testDimensions: ComparisonTestDimension[];
  platform: string;
  winnerVariantId: string;
  winnerVerdict: string;
  rankings: ComparisonRanking[];
  variantDetails: ComparisonVariantDetail[];
  keyInsights: {
    decidingFactor: string;
    pattern: string;
    nextTest: string;
  };
  noneStrongEnough: boolean;
  recommendedHybrid?: {
    script: string;
    productionNote: string;
  };
  structuralDifferences: string;
  rawComparativeAnalysis?: string;
};
