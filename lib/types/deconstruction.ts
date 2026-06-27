import type { CompetitorAd } from "@/lib/types/report";

export type DeconstructionStatus = "processing" | "completed" | "failed";

export type EvidenceConfidence = "high" | "medium" | "low";

export type DeconstructionInput = {
  /** Competitor product landing page — used for brand identification & evidence check */
  landingPageUrl: string;
  creativeType: "image" | "video";
  creativeStoragePath: string;
  creativeMimeType?: string;
  creativeFileName?: string;
  thumbnailUrl?: string;
  userNotes?: string;
};

export type EvidenceSignals = {
  runningDays?: number;
  advertiserAdCount?: number;
  metaAdFound?: boolean;
  tavilyPerformanceMention?: boolean;
  directPerformanceEvidence?: boolean;
  establishedAdvertiser?: boolean;
};

export type EvidenceReport = {
  confidence: EvidenceConfidence;
  summary: string;
  badges: string[];
  signals: EvidenceSignals;
  /** Shown for medium confidence */
  caveat?: string;
  /** Meta ad copy snippet when fetched from Ad Library */
  adCopySnippet?: string;
  /** Sample ads from advertiser lookup — reused for market context */
  sampleAds?: CompetitorAd[];
  resolvedAdvertiser?: string;
};

export type StructuralBeat = {
  role: string;
  description: string;
};

export type DeconstructionAnalysis = {
  psychologicalTrigger: string;
  structuralFramework: StructuralBeat[];
  offerMechanics: string;
  visualProduction: string;
  /** How this ad compares to active market patterns */
  marketComparison?: string;
  competitiveInsights?: string[];
};

export type BrandTranslation = {
  hook: string;
  structuralOutline: StructuralBeat[];
  offerTranslation: string;
  disclaimer: string;
};

export type HonestAnalysis = {
  headline: string;
  strengths: string[];
  weaknesses: string[];
  lessonsExtracted: string[];
  criteriaChecklist: {
    id: string;
    label: string;
    /** null = not applicable for this ad's goal/format/intent */
    pass: boolean | null;
    note?: string;
  }[];
};

export type DeconstructionMarketContext = {
  advertiser?: string;
  category?: string;
  competitorAdCount: number;
  patternsSummary?: string;
  competitiveInsights: string[];
  sampleCompetitorHooks: string[];
};

export type DeconstructionReport = {
  schemaVersion: 1;
  generatedAt: string;
  mode: "deconstruction" | "honest_analysis";
  evidence: EvidenceReport;
  marketContext?: DeconstructionMarketContext;
  /** Present when mode is deconstruction (high/medium) */
  deconstruction?: DeconstructionAnalysis;
  brandTranslation?: BrandTranslation;
  /** Present when mode is honest_analysis (low confidence) */
  honestAnalysis?: HonestAnalysis;
};

export type AdDeconstruction = {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  status: DeconstructionStatus;
  input: DeconstructionInput;
  report: DeconstructionReport | null;
  confidence_level: EvidenceConfidence | null;
  error_message: string | null;
  processing_started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateDeconstructionInput = {
  workspaceId: string;
  input: DeconstructionInput;
};
