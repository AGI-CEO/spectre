import { runResearch } from "@/lib/research-pipeline";
import type { BrainstormMessage, ExtractedContext } from "@/lib/types";

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { transcript, extractedContext, brainstormMessages } = body;

    // Validate required fields
    if (!transcript || typeof transcript !== "string") {
      return Response.json(
        { error: "Missing or invalid required field: transcript" },
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

    // Run research pipeline
    const researchReport = await runResearch({
      transcript,
      extractedContext: extractedContext as ExtractedContext,
      brainstormMessages: brainstormMessages as BrainstormMessage[],
    });

    const duration = Date.now() - startTime;

    return Response.json({
      researchReport,
      duration,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Research pipeline failed";
    console.error("Research API error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
