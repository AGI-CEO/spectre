export interface ExtractedContext {
  intent: string;                  // one-sentence summary
  domain: string;                  // industry/category
  target_user_hints: string[];
  problem_hints: string[];
  constraints: string[];
  gaps: string[];                  // unanswered critical questions
  confidence: "low" | "medium" | "high";
}

export interface InterviewMessage {
  role: "agent" | "user";
  message: string;
  timestamp: string;               // ISO 8601
  gapFill?: {
    gap: string;
    suggestion: string;
    decision: "accepted" | "rejected" | "custom";
    customAnswer?: string;
  };
}

export interface ClientSessionState {
  sessionId?: number;              // set after /api/save-session
  userId: string;                  // anonymous UUID from localStorage
  transcript: string;
  extractedContext: ExtractedContext;
  interviewMessages: InterviewMessage[];
  prdMarkdown?: string;
  featureName?: string;            // kebab-case slug derived from intent
}
