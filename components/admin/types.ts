export type SubscriptionTier = {
  id: string;
  key: string;
  display_name: string;
  description: string;
  monthly_price: number;
  annual_price: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  founding_price: number | null;
  founding_slots: number | null;
  created_at: string;
  updated_at: string;
};

export type TierFeatureLimit = {
  id: string;
  tier_id: string;
  feature_key: string;
  limit_value: number;
  reset_period: "monthly" | "daily" | "lifetime";
  created_at: string;
  updated_at: string;
};

export type WorkspaceOverride = {
  id: string;
  workspace_id: string;
  feature_key: string;
  override_limit_value: number;
  reason: string;
  expires_at: string | null;
  created_at: string;
  workspaces?: {
    name: string;
    user_id: string;
  } | {
    name: string;
    user_id: string;
  }[] | null;
};
