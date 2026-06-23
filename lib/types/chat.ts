export type ChatMessageRole = "user" | "assistant";

export type CreativeDirectorMessage = {
  id: string;
  chat_id: string;
  role: ChatMessageRole;
  content: string;
  created_at: string;
};

export type CreativeDirectorChat = {
  id: string;
  workspace_id: string;
  user_id: string;
  analysis_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatSessionSummary = {
  id: string;
  title: string | null;
  analysis_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatContextMode = "analysis" | "workspace";

export type ChatSessionPayload = {
  chat: CreativeDirectorChat;
  messages: CreativeDirectorMessage[];
  contextLabel: string;
};

export type ChatAnalysisOption = {
  id: string;
  title: string;
  date: string;
  score: number | null;
  isComparison: boolean;
};
