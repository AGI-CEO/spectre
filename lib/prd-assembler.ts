import { getGeminiClient } from "@/lib/gemini";
import type { ExtractedContext, InterviewMessage } from "@/lib/types";

const PRD_SYSTEM_PROMPT = `You are a senior product manager. Assemble a complete Product Requirements Document from the following session data. 
Output ONLY markdown, no preamble.

Use this exact structure:
# [Product Name] — Product Requirements Document
## Problem Statement
## Target Audience
## Goals & Success Metrics (table: Goal | Metric | Target)
## Solution Overview
## User Stories (GIVEN/WHEN/THEN format, US-001 numbering, Priority P0/P1/P2)
## Scope (In Scope / Out of Scope)
## Technical Constraints
## Risks & Open Questions (table: Risk | Likelihood | Mitigation)

Session data:
- Brain-dump transcript: {{transcript}}
- Extracted context: {{extractedContext}}
- Interview Q&A: {{interviewMessages}}`;

export async function assemblePRD(params: {
  transcript: string;
  extractedContext: ExtractedContext;
  interviewMessages: InterviewMessage[];
}): Promise<string> {
  const { transcript, extractedContext, interviewMessages } = params;

  const prompt = PRD_SYSTEM_PROMPT
    .replace("{{transcript}}", transcript)
    .replace("{{extractedContext}}", JSON.stringify(extractedContext, null, 2))
    .replace("{{interviewMessages}}", JSON.stringify(interviewMessages, null, 2));

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini during PRD assembly");
  }

  return text.trim();
}
