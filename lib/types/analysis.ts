import type { CreativeGoal } from "@/lib/analyses/creative-goals";
import type { AnalysisReport } from "@/lib/types/report";
import type {
  ComparisonReport,
  ComparisonTestDimension,
  StoredAnalysisVariant,
} from "@/lib/types/comparison";

export type { CreativeGoal };

export type CreativeType = "image" | "video" | "script";
export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";
export type AnalysisMode = "funnel" | "comparison";

export type Analysis = {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  funnel_score: number | null;
  conversion_score: number | null;
  creative_strength_score: number | null;
  creative_type: CreativeType;
  thumbnail_url: string | null;
  status: AnalysisStatus;
  platforms: string[];
  platform_other: string | null;
  landing_page_url: string | null;
  script_content: string | null;
  creative_storage_path: string | null;
  creative_file_name: string | null;
  creative_mime_type: string | null;
  report: AnalysisReport | ComparisonReport | null;
  error_message: string | null;
  completed_at: string | null;
  processing_started_at: string | null;
  created_at: string;
  updated_at: string;
  analysis_mode?: AnalysisMode;
  comparison_test_dimensions?: ComparisonTestDimension[] | null;
  variants?: StoredAnalysisVariant[] | null;
  creative_goal?: CreativeGoal;
};

export type WorkspaceMetrics = {
  totalAnalyses: number;
  averageFunnelScore: number | null;
  analysesThisMonth: number;
};

export type AnalysesHistoryMetrics = {
  totalAnalyses: number;
  averageFunnelScore: number | null;
  highestFunnelScore: number | null;
};

export type AnalysisListItem = Analysis & {
  /** Signed URL for card thumbnail (images + video thumbs); server-only enrichment */
  signedThumbnailUrl?: string | null;
};

export type CreateAnalysisInput = {
  workspaceId: string;
  creativeGoal: CreativeGoal;
  platforms: string[];
  platformOther?: string;
  creativeType: CreativeType;
  landingPageUrl: string;
  scriptContent?: string;
  creativeStoragePath?: string;
  creativeFileName?: string;
  creativeMimeType?: string;
  thumbnailUrl?: string;
};
