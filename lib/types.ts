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

// v2 interfaces
export interface BrainstormMessage {
  role: "agent" | "user";
  message: string;
  timestamp: string;               // ISO 8601
  gapFlagged?: string;             // if this message flagged a gap for research
}

export interface Competitor {
  name: string;
  positioning: string;
  targetAudience: string;
  differentiator: string;
  pricingModel: string;
}

export interface AudienceSegment {
  segment: string;
  description: string;
  painPoints: string[];
  jobToBeDone: string;
  willingnessToPay: "high" | "medium" | "low";
  willingnessToPayRationale: string;
  channels: string[];
}

export interface AntiPersona {
  name: string;
  reason: string;
}

export interface MarketSize {
  tam: string;                     // e.g. "$2B–$5B"
  sam: string;
  som: string;
  methodology: string;
  confidence: "high" | "medium" | "low";
}

export interface ArchitectureRecommendation {
  concern: string;                 // e.g. "Technology Stack"
  recommendation: string;
  rationale: string;
}

export interface ResolvedGap {
  gap: string;
  finding: string;
  confidence: "high" | "medium" | "low";
}

export interface ResearchReport {
  competitors: Competitor[];
  targetAudience: AudienceSegment[];
  antiPersonas: AntiPersona[];
  marketSize: MarketSize | null;
  architectureRecommendations: ArchitectureRecommendation[];
  resolvedGaps: ResolvedGap[];
}

export interface ClientSessionState {
  sessionId?: number;              // set after /api/save-session
  userId: string;                  // anonymous UUID from localStorage
  transcript: string;
  extractedContext: ExtractedContext;
  interviewMessages: InterviewMessage[];
  prdMarkdown?: string;
  featureName?: string;            // kebab-case slug derived from intent
  // v2 fields
  brainstormMessages?: BrainstormMessage[];
  researchReport?: ResearchReport;
  contextSteeringFile?: string;
  audienceSteeringFile?: string;
  seedRequirementsFile?: string;
}
