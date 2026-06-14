import type { BrandProfile, BrandProfileProgress, BrandProfileStatus } from "@/lib/types/report";

export type Workspace = {
  id: string;
  user_id: string;
  name: string;
  brand_url: string;
  brand_profile: BrandProfile | null;
  brand_profile_generated_at: string | null;
  brand_profile_status: BrandProfileStatus;
  brand_profile_progress: BrandProfileProgress | null;
  brand_profile_error: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  onboarding_complete: boolean;
  active_workspace_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceWithStats = Workspace & {
  analysis_count: number;
};

export type AccountSettingsData = {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  workspaces: WorkspaceWithStats[];
  activeWorkspaceId: string | null;
};
