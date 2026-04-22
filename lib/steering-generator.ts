import { getGeminiClient } from "@/lib/gemini";
import type {
  BrainstormMessage,
  ExtractedContext,
  ResearchReport,
} from "@/lib/types";

/**
 * Generate the Context Steering File (project-context.md).
 * Contains project overview, domain knowledge, validated decisions, architecture, and Kiro conventions.
 */
export async function generateContextSteering(params: {
  researchReport: ResearchReport;
  extractedContext: ExtractedContext;
  brainstormMessages: BrainstormMessage[];
}): Promise<string> {
  const { researchReport, extractedContext, brainstormMessages } = params;
  const ai = getGeminiClient();

  const conversationContext = brainstormMessages
    .map((msg) => `${msg.role}: ${msg.message}`)
    .join("\n");

  const unresolvedDimensions = [];
  if (researchReport.competitors.length === 0) unresolvedDimensions.push("competitor analysis");
  if (researchReport.targetAudience.length === 0) unresolvedDimensions.push("target audience");
  if (!researchReport.marketSize) unresolvedDimensions.push("market sizing");
  if (researchReport.architectureRecommendations.length === 0)
    unresolvedDimensions.push("architecture recommendations");

  const unresolvedNote =
    unresolvedDimensions.length > 0
      ? `\n\nNote: The following research dimensions could not be resolved: ${unresolvedDimensions.join(", ")}. These gaps should be addressed through further research.`
      : "";

  const prompt = `You are a technical writer creating a Kiro steering file. This file will be automatically loaded by Kiro in every agent session for this project.

Write in clear, directive prose that an AI coding agent can act on directly. No marketing language.

Generate a project-context.md steering file with these sections:

1. **Project Overview** — one paragraph summarizing the product and its purpose
2. **Domain Knowledge** — key concepts, terminology, and constraints specific to the product's domain
3. **Validated Product Decisions** — decisions made during the brainstorm with the rationale and any research backing
4. **Architecture Recommendations** — technology choices and structural guidance derived from the research report
5. **Kiro Conventions** — project-specific rules for how Kiro should behave when working on this project (e.g. preferred patterns, naming conventions, out-of-scope areas)

Session data:
- Intent: ${extractedContext.intent}
- Domain: ${extractedContext.domain}
- Constraints: ${extractedContext.constraints.join(", ")}
- Brainstorm Q&A:
${conversationContext}
- Research Report: ${JSON.stringify(researchReport, null, 2)}

${unresolvedNote}

Output ONLY the markdown content. Do NOT include YAML front-matter — it will be prepended automatically.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text?.trim() || "";
}

/**
 * Generate the Audience Steering File (product-audience.md).
 * Contains target audience profiles, competitive landscape, positioning, and anti-personas.
 */
export async function generateAudienceSteering(params: {
  researchReport: ResearchReport;
  extractedContext: ExtractedContext;
}): Promise<string> {
  const { researchReport, extractedContext } = params;
  const ai = getGeminiClient();

  const prompt = `You are a product strategist creating a Kiro steering file. This file will be automatically loaded by Kiro in every agent session for this project.

Generate a product-audience.md steering file with these sections:

1. **Target Audience** — structured profiles for each audience segment identified in the research report, each with segment name, pain points, jobs-to-be-done, and willingness-to-pay signal
2. **Competitive Landscape** — a summary of each competitor from the research report with their positioning and key differentiator
3. **Product Positioning** — a one-sentence positioning statement derived from the brainstorm and research
4. **Anti-Personas** — user types the product is explicitly NOT built for, to prevent scope creep

Research Report: ${JSON.stringify(researchReport, null, 2)}
Intent: ${extractedContext.intent}
Domain: ${extractedContext.domain}

Write so Kiro can use this to make product decisions — e.g. when generating UI copy, API design, or feature prioritization.

Output ONLY the markdown content. Do NOT include YAML front-matter — it will be prepended automatically.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text?.trim() || "";
}

/**
 * Generate optional Seed Requirements File (requirements.md).
 * Uses EARS patterns and GIVEN/WHEN/THEN acceptance criteria.
 */
export async function generateSeedRequirements(params: {
  researchReport: ResearchReport;
  extractedContext: ExtractedContext;
  brainstormMessages: BrainstormMessage[];
}): Promise<string> {
  const { researchReport, extractedContext, brainstormMessages } = params;
  const ai = getGeminiClient();

  const conversationContext = brainstormMessages
    .map((msg) => `${msg.role}: ${msg.message}`)
    .join("\n");

  const prompt = `You are a technical writer generating a Kiro-compatible requirements.md file as a starting point for Kiro spec mode refinement.

Output ONLY markdown. Use EARS-pattern requirements (THE system SHALL...) and GIVEN/WHEN/THEN acceptance criteria.
Include priority labels P0/P1/P2. Number requirements as Requirement 1, Requirement 2, etc.

Do NOT duplicate content already present in the steering files (project-context.md, product-audience.md). Focus on functional requirements and acceptance criteria only.

Include a header note: "Generated by SpecDraft v2 as a starting point. Refine in Kiro spec mode."

Session data:
- Intent: ${extractedContext.intent}
- Domain: ${extractedContext.domain}
- Brainstorm Q&A:
${conversationContext}
- Research Report: ${JSON.stringify(researchReport, null, 2)}

Output ONLY markdown content.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text?.trim() || "";
}

/**
 * Derive a kebab-case feature name from the intent string.
 * Falls back to "my-feature" if the result is empty.
 */
export function deriveFeatureName(intent: string): string {
  if (!intent || intent.trim().length === 0) {
    return "my-feature";
  }

  const slug = intent
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse consecutive hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens

  return slug || "my-feature";
}
