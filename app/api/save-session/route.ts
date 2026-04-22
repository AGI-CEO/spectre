import { db } from "@/db";
import { sessions } from "@/db/schema";
import { embed } from "@/lib/embeddings";
import type { ExtractedContext, InterviewMessage, BrainstormMessage, ResearchReport } from "@/lib/types";

interface SaveSessionBodyV1 {
  userId: string;
  braindumpTranscript: string;
  extractedContext: ExtractedContext;
  interviewTranscript: InterviewMessage[];
  prdMarkdown: string;
  kiroRequirements: string;
  kiroDesign: string;
  kiroTasks: string;
}

interface SaveSessionBodyV2 {
  userId: string;
  braindumpTranscript: string;
  extractedContext: ExtractedContext;
  brainstormTranscript: BrainstormMessage[];
  researchReport: ResearchReport;
  contextSteeringFile: string;
  audienceSteeringFile: string;
  seedRequirementsFile?: string;
}

type SaveSessionBody = SaveSessionBodyV1 | SaveSessionBodyV2;

function isV2Session(body: SaveSessionBody): body is SaveSessionBodyV2 {
  return "brainstormTranscript" in body && "researchReport" in body;
}

export async function POST(req: Request) {
  // 1. Parse request body
  let body: SaveSessionBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 2. Validate required fields based on version
  if (!body.userId || !body.braindumpTranscript || !body.extractedContext) {
    return Response.json(
      { error: "Missing required fields: userId, braindumpTranscript, extractedContext" },
      { status: 400 }
    );
  }

  const { userId, braindumpTranscript, extractedContext } = body;
  const { intent, domain } = extractedContext;

  try {
    if (isV2Session(body)) {
      // V2 session
      const {
        brainstormTranscript,
        researchReport,
        contextSteeringFile,
        audienceSteeringFile,
        seedRequirementsFile,
      } = body;

      // Validate v2 required fields
      if (!brainstormTranscript || !researchReport || !contextSteeringFile || !audienceSteeringFile) {
        return Response.json(
          { error: "Missing required v2 fields" },
          { status: 400 }
        );
      }

      // Generate embedding from intent + domain + contextSteeringFile
      const embedding = await embed(`${intent} ${domain} ${contextSteeringFile}`);

      // Insert v2 session
      const result = await db
        .insert(sessions)
        .values({
          userId,
          braindumpTranscript,
          extractedContext,
          brainstormTranscript,
          researchReport,
          contextSteeringFile,
          audienceSteeringFile,
          seedRequirementsFile: seedRequirementsFile || null,
          embedding,
        })
        .returning({ id: sessions.id });

      return Response.json({ sessionId: result[0].id });
    } else {
      // V1 session (backward compatibility)
      const {
        interviewTranscript,
        prdMarkdown,
        kiroRequirements,
        kiroDesign,
        kiroTasks,
      } = body;

      // Validate v1 required fields
      if (!interviewTranscript || !prdMarkdown || !kiroRequirements || !kiroDesign || !kiroTasks) {
        return Response.json(
          { error: "Missing required v1 fields" },
          { status: 400 }
        );
      }

      // Generate embedding from intent + domain + prdMarkdown
      const embedding = await embed(`${intent} ${domain} ${prdMarkdown}`);

      // Insert v1 session
      const result = await db
        .insert(sessions)
        .values({
          userId,
          braindumpTranscript,
          extractedContext,
          interviewTranscript,
          prdMarkdown,
          kiroRequirements,
          kiroDesign,
          kiroTasks,
          embedding,
        })
        .returning({ id: sessions.id });

      return Response.json({ sessionId: result[0].id });
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save session";
    console.error("save-session error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
