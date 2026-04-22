import { getGeminiClient } from "@/lib/gemini";
import type { ExtractedContext, InterviewMessage } from "@/lib/types";

const REQUIREMENTS_PROMPT = `You are a technical writer generating a Kiro-compatible requirements.md file.
Output ONLY markdown. Use EARS-pattern requirements (THE system SHALL...) and GIVEN/WHEN/THEN acceptance criteria.
Include priority labels P0/P1/P2. Number requirements as Requirement 1, Requirement 2, etc.

PRD content:
{{prdMarkdown}}`;

const DESIGN_PROMPT = `You are a software architect generating a Kiro-compatible design.md file.
Output ONLY markdown. Include:
1. Overview paragraph
2. Architecture diagram (ASCII or Mermaid)
3. Component breakdown
4. Key sequence diagrams in Mermaid format
5. Data models
6. Integration points

Base the design on the domain, constraints, and tech stack from the PRD.

PRD content:
{{prdMarkdown}}
Extracted context: {{extractedContext}}`;

const TASKS_PROMPT = `You are a senior engineer generating a Kiro-compatible tasks.md file.
Output ONLY markdown. Rules:
- Use checkbox syntax: "- [ ] N. Task title" for required tasks
- Use "- [ ]* N. Task title" for optional tasks  
- Use "- [x] N. Task title" for completed tasks
- Group tasks by phase: ## Phase 1: Setup, ## Phase 2: Core, ## Phase 3: Polish
- Each top-level task may have sub-tasks indented with two spaces
- Order tasks to unblock dependencies (infrastructure before features)
- Estimate complexity inline: (S), (M), (L)

PRD content:
{{prdMarkdown}}
Requirements: {{kiroRequirements}}`;

function deriveFeatureName(intent: string): string {
  return (
    intent
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "my-feature"
  );
}

export async function generateKiroSpec(params: {
  prdMarkdown: string;
  extractedContext: ExtractedContext;
  interviewMessages: InterviewMessage[];
}): Promise<{
  requirements: string;
  design: string;
  tasks: string;
  featureName: string;
}> {
  const { prdMarkdown, extractedContext } = params;

  const ai = getGeminiClient();

  const requirementsPrompt = REQUIREMENTS_PROMPT.replace(
    "{{prdMarkdown}}",
    prdMarkdown
  );

  const designPrompt = DESIGN_PROMPT.replace(
    "{{prdMarkdown}}",
    prdMarkdown
  ).replace("{{extractedContext}}", JSON.stringify(extractedContext, null, 2));

  // Requirements must be generated first so tasks can reference them
  const requirementsResponse = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: requirementsPrompt,
  });

  const requirements = requirementsResponse.text?.trim();
  if (!requirements) {
    throw new Error("Empty response from Gemini during requirements generation");
  }

  const tasksPrompt = TASKS_PROMPT.replace(
    "{{prdMarkdown}}",
    prdMarkdown
  ).replace("{{kiroRequirements}}", requirements);

  // Design and tasks can run in parallel once requirements are ready
  const [designResponse, tasksResponse] = await Promise.all([
    ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: designPrompt,
    }),
    ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: tasksPrompt,
    }),
  ]);

  const design = designResponse.text?.trim();
  if (!design) {
    throw new Error("Empty response from Gemini during design generation");
  }

  const tasks = tasksResponse.text?.trim();
  if (!tasks) {
    throw new Error("Empty response from Gemini during tasks generation");
  }

  const featureName = deriveFeatureName(extractedContext.intent);

  return { requirements, design, tasks, featureName };
}
