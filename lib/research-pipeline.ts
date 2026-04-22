import { getGeminiClient } from "@/lib/gemini";
import type {
  BrainstormMessage,
  ExtractedContext,
  ResearchReport,
  Competitor,
  AudienceSegment,
  AntiPersona,
  MarketSize,
  ArchitectureRecommendation,
  ResolvedGap,
} from "@/lib/types";

const RESEARCH_TIMEOUT = 60000; // 60 seconds

/**
 * Run the full background research pipeline after brainstorm conversation ends.
 * Executes 4 research dimensions in parallel with 60-second timeout.
 * Per-dimension failures are caught and marked as unresolved.
 */
export async function runResearch(params: {
  transcript: string;
  extractedContext: ExtractedContext;
  brainstormMessages: BrainstormMessage[];
}): Promise<ResearchReport> {
  const { transcript, extractedContext, brainstormMessages } = params;

  // Extract flagged gaps from brainstorm messages
  const flaggedGaps = brainstormMessages
    .filter((msg) => msg.gapFlagged)
    .map((msg) => msg.gapFlagged!);

  // Run all research dimensions in parallel with timeout
  const researchPromise = Promise.all([
    analyzeCompetitors(extractedContext, transcript).catch((err) => {
      console.error("Competitor analysis failed:", err);
      return [] as Competitor[];
    }),
    profileAudience(extractedContext, brainstormMessages).catch((err) => {
      console.error("Audience profiling failed:", err);
      return { segments: [] as AudienceSegment[], antiPersonas: [] as AntiPersona[] };
    }),
    estimateMarketSize(extractedContext, transcript).catch((err) => {
      console.error("Market sizing failed:", err);
      return null;
    }),
    recommendArchitecture(extractedContext, transcript).catch((err) => {
      console.error("Architecture recommendations failed:", err);
      return [] as ArchitectureRecommendation[];
    }),
    resolveGaps(flaggedGaps, extractedContext, transcript).catch((err) => {
      console.error("Gap resolution failed:", err);
      return [] as ResolvedGap[];
    }),
  ]);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Research timeout")), RESEARCH_TIMEOUT)
  );

  try {
    const [competitors, audienceData, marketSize, architectureRecommendations, resolvedGaps] =
      await Promise.race([researchPromise, timeoutPromise]);

    return {
      competitors,
      targetAudience: audienceData.segments,
      antiPersonas: audienceData.antiPersonas,
      marketSize,
      architectureRecommendations,
      resolvedGaps,
    };
  } catch (err) {
    // Timeout occurred - return partial results
    console.error("Research pipeline timeout, returning partial results");
    return {
      competitors: [],
      targetAudience: [],
      antiPersonas: [],
      marketSize: null,
      architectureRecommendations: [],
      resolvedGaps: [],
    };
  }
}

/**
 * Analyze competitors using Gemini with Google Search grounding.
 * Identifies up to 5 competitors (direct and indirect).
 */
async function analyzeCompetitors(
  context: ExtractedContext,
  transcript: string
): Promise<Competitor[]> {
  const ai = getGeminiClient();

  const prompt = `You are a product researcher. Identify up to 5 competitors for a product with this description:

Intent: ${context.intent}
Domain: ${context.domain}
Context: ${transcript.slice(0, 1000)}

For each competitor, provide:
- name: product name
- positioning: one-sentence positioning statement
- targetAudience: primary target audience
- differentiator: how this product differs from the user's idea
- pricingModel: pricing model if publicly known, otherwise "unknown"

Include both direct competitors (same problem, same audience) and indirect competitors (same audience, different solution).

If fewer than 2 competitors can be identified with reasonable confidence, note this as a signal that the user may be in a novel market.

Return ONLY valid JSON array, no markdown fences.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text?.trim() || "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  const competitors = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

  return competitors;
}

/**
 * Profile target audience from brainstorm data.
 * Synthesizes up to 3 audience segments and identifies anti-personas.
 */
async function profileAudience(
  context: ExtractedContext,
  brainstormMessages: BrainstormMessage[]
): Promise<{ segments: AudienceSegment[]; antiPersonas: AntiPersona[] }> {
  const ai = getGeminiClient();

  const conversationContext = brainstormMessages
    .map((msg) => `${msg.role}: ${msg.message}`)
    .join("\n");

  const prompt = `You are a product strategist. Based on this brainstorm session, synthesize up to 3 target audience segments:

Intent: ${context.intent}
Domain: ${context.domain}
Brainstorm Q&A:
${conversationContext}

For each segment provide:
- segment: segment name
- description: one-paragraph description
- painPoints: array of 3-5 pain points
- jobToBeDone: JTBD statement ("When I..., I want to..., so I can...")
- willingnessToPay: "high" | "medium" | "low"
- willingnessToPayRationale: one-sentence rationale
- channels: preferred channels to reach this audience

Also identify 1-2 anti-personas (user types explicitly out of scope to prevent scope creep).

Prioritize the user's direct knowledge from the brainstorm over generic research.

Return ONLY valid JSON with keys "segments" and "antiPersonas", no markdown fences.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const text = response.text?.trim() || '{"segments": [], "antiPersonas": []}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { segments: [], antiPersonas: [] };

  return result;
}

/**
 * Estimate market size (TAM/SAM/SOM).
 * Returns null if confidence would be below low.
 */
async function estimateMarketSize(
  context: ExtractedContext,
  transcript: string
): Promise<MarketSize | null> {
  const ai = getGeminiClient();

  const prompt = `You are a market analyst. Estimate the market size for:

Intent: ${context.intent}
Domain: ${context.domain}
Context: ${transcript.slice(0, 1000)}

Provide TAM (Total Addressable Market), SAM (Serviceable Addressable Market), and SOM (Serviceable Obtainable Market) as annual USD revenue opportunity with order-of-magnitude qualifiers (e.g. "$2B–$5B TAM").

Include:
- tam: TAM estimate
- sam: SAM estimate
- som: SOM estimate
- methodology: brief rationale citing the approach
- confidence: "high" | "medium" | "low" reflecting how well the data supports the estimate

If confidence would be below low, return null with a note that market sizing requires further primary research.

Return ONLY valid JSON, no markdown fences.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text?.trim() || "null";
  if (text === "null" || text.includes("requires further")) {
    return null;
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const marketSize = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

  return marketSize;
}

/**
 * Generate architecture recommendations based on constraints and domain.
 */
async function recommendArchitecture(
  context: ExtractedContext,
  transcript: string
): Promise<ArchitectureRecommendation[]> {
  const ai = getGeminiClient();

  const prompt = `You are a senior software architect advising a technical founder. Based on this product:

Intent: ${context.intent}
Domain: ${context.domain}
Constraints: ${context.constraints.join(", ")}

Generate architecture recommendations covering:
- stack: recommended technology stack with rationale tied to constraints
- dataModel: key data model considerations
- scalability: approach appropriate to the market scale
- integrations: key third-party integrations needed
- securityCompliance: security and compliance considerations relevant to this domain

Default to Next.js 16, React 19, Tailwind 4, NeonDB, Drizzle ORM unless constraints suggest otherwise.

Explicitly call out any constraints that conflict with the recommended stack and propose resolutions.

Write as directive guidance for an AI coding agent (Kiro), not as options for the user to choose from. Kiro needs a clear recommendation, not a menu.

Return ONLY valid JSON array with objects containing "concern", "recommendation", and "rationale" fields, no markdown fences.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const text = response.text?.trim() || "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

  return recommendations;
}

/**
 * Resolve flagged gaps from brainstorm conversation.
 */
async function resolveGaps(
  gaps: string[],
  context: ExtractedContext,
  transcript: string
): Promise<ResolvedGap[]> {
  if (gaps.length === 0) {
    return [];
  }

  const ai = getGeminiClient();
  const resolvedGaps: ResolvedGap[] = [];

  for (const gap of gaps) {
    try {
      const prompt = `You are a product researcher. The user couldn't answer this question during brainstorm:

Gap: ${gap}

Product context:
Intent: ${context.intent}
Domain: ${context.domain}

Provide a research-backed finding that addresses this gap. Include your confidence level (high/medium/low).

Return ONLY valid JSON with keys "finding" and "confidence", no markdown fences.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text?.trim() || '{"finding": "unresolved", "confidence": "low"}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { finding: "unresolved", confidence: "low" };

      resolvedGaps.push({
        gap,
        finding: result.finding,
        confidence: result.confidence,
      });
    } catch (err) {
      console.error(`Failed to resolve gap: ${gap}`, err);
      resolvedGaps.push({
        gap,
        finding: "unresolved",
        confidence: "low",
      });
    }
  }

  return resolvedGaps;
}
