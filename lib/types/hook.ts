import type { ManualSourceCategoryId } from "@/lib/hooks/constants";

export type HookSourceType = "advara_generated" | "manual";
export type HookSourceKind = "analysis" | "comparison" | "brief";

export type HookLibraryEntry = {
  id: string;
  workspace_id: string;
  user_id: string;
  hook_text: string;
  platform: string | null;
  angle_tags: string[];
  source_type: HookSourceType;
  manual_source_category: ManualSourceCategoryId | null;
  source_kind: HookSourceKind | null;
  source_analysis_id: string | null;
  source_brief_id: string | null;
  source_score: number | null;
  notes: string | null;
  is_favorited: boolean;
  custom_tags: string[];
  is_in_test_queue: boolean;
  capture_key: string | null;
  created_at: string;
  updated_at: string;
};

export type HookLibraryStats = {
  total: number;
  advaraGenerated: number;
  manual: number;
  favorited: number;
  testQueue: number;
};

export type CreateManualHookInput = {
  workspaceId: string;
  hookText: string;
  platform?: string;
  angleTags?: string[];
  manualSourceCategory?: ManualSourceCategoryId;
  notes?: string;
  customTags?: string[];
  isInTestQueue?: boolean;
};

export type SaveGeneratedHookInput = {
  workspaceId: string;
  hookText: string;
  sourceKind: HookSourceKind;
  sourceAnalysisId?: string | null;
  sourceBriefId?: string | null;
  platform?: string | null;
  angleTags?: string[];
  notes?: string | null;
  sourceScore?: number | null;
  captureKeySuffix?: string;
};

export type UpdateHookInput = {
  hookText?: string;
  platform?: string | null;
  angleTags?: string[];
  notes?: string | null;
  isFavorited?: boolean;
  customTags?: string[];
  isInTestQueue?: boolean;
};
