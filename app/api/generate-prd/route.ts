import { assemblePRD } from "@/lib/prd-assembler";
import { generateKiroSpec } from "@/lib/kiro-spec-generator";
import type { ExtractedContext, InterviewMessage } from "@/lib/types";

export async function POST(req: Request) {
  // 1. Parse request body
  let transcript: string;
  let extractedContext: ExtractedContext;
  let interviewMessages: InterviewMessage[];
  let userId: string;

  try {
    const body = await req.json();
    transcript = body?.transcript;
    extractedContext = body?.extractedContext;
    interviewMessages = body?.interviewMessages;
    userId = body?.userId;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 2. Validate required fields
  if (!transcript || typeof transcript !== "string" || transcript.trim() === "") {
    return Response.json(
      { error: "Missing or empty required field: transcript" },
      { status: 400 }
    );
  }

  if (!extractedContext || typeof extractedContext !== "object" || Array.isArray(extractedContext)) {
    return Response.json(
      { error: "Missing or invalid required field: extractedContext" },
      { status: 400 }
    );
  }

  if (!Array.isArray(interviewMessages)) {
    return Response.json(
      { error: "Missing or invalid required field: interviewMessages" },
      { status: 400 }
    );
  }

  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return Response.json(
      { error: "Missing or empty required field: userId" },
      { status: 400 }
    );
  }

  try {
    // 3. Assemble the PRD
    const prdMarkdown = await assemblePRD({ transcript, extractedContext, interviewMessages });

    // 4. Generate Kiro spec artifacts
    const { requirements, design, tasks, featureName } = await generateKiroSpec({
      prdMarkdown,
      extractedContext,
      interviewMessages,
    });

    // 5. Return success response
    return Response.json({
      prdMarkdown,
      kiroRequirements: requirements,
      kiroDesign: design,
      kiroTasks: tasks,
      featureName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate PRD";
    console.error("generate-prd error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
