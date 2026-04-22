import {
  generateContextSteering,
  generateAudienceSteering,
  generateSeedRequirements,
  deriveFeatureName,
} from "@/lib/steering-generator";
import type {
  BrainstormMessage,
  ExtractedContext,
  ResearchReport,
} from "@/lib/types";

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { researchReport, extractedContext, brainstormMessages, generateSeedRequirements: shouldGenerateSeed } = body;

    // Validate required fields
    if (!researchReport || typeof researchReport !== "object") {
      return Response.json(
        { error: "Missing or invalid required field: researchReport" },
        { status: 400 }
      );
    }

    if (!extractedContext || typeof extractedContext !== "object") {
      return Response.json(
        { error: "Missing or invalid required field: extractedContext" },
        { status: 400 }
      );
    }

    if (!Array.isArray(brainstormMessages)) {
      return Response.json(
        { error: "Missing or invalid required field: brainstormMessages" },
        { status: 400 }
      );
    }

    // Generate steering files
    const [contextSteeringContent, audienceSteeringContent] = await Promise.all([
      generateContextSteering({
        researchReport: researchReport as ResearchReport,
        extractedContext: extractedContext as ExtractedContext,
        brainstormMessages: brainstormMessages as BrainstormMessage[],
      }),
      generateAudienceSteering({
        researchReport: researchReport as ResearchReport,
        extractedContext: extractedContext as ExtractedContext,
      }),
    ]);

    // Prepend YAML front-matter
    const frontMatter = "---\ninclusion: always\n---\n\n";
    const contextSteeringFile = frontMatter + contextSteeringContent;
    const audienceSteeringFile = frontMatter + audienceSteeringContent;

    // Optionally generate seed requirements
    let seedRequirementsFile: string | undefined;
    if (shouldGenerateSeed === true) {
      const seedContent = await generateSeedRequirements({
        researchReport: researchReport as ResearchReport,
        extractedContext: extractedContext as ExtractedContext,
        brainstormMessages: brainstormMessages as BrainstormMessage[],
      });
      seedRequirementsFile = seedContent;
    }

    // Derive feature name
    const featureName = deriveFeatureName((extractedContext as ExtractedContext).intent);

    return Response.json({
      contextSteeringFile,
      audienceSteeringFile,
      seedRequirementsFile,
      featureName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Steering file generation failed";
    console.error("Generate steering API error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
