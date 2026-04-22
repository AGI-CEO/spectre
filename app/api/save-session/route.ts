import { db } from "@/db";
import { sessions } from "@/db/schema";
import { embed } from "@/lib/embeddings";
import type { ExtractedContext, InterviewMessage } from "@/lib/types";

interface SaveSessionBody {
  userId: string;
  braindumpTranscript: string;
  extractedContext: ExtractedContext;
  interviewTranscript: InterviewMessage[];
  prdMarkdown: string;
  kiroRequirements: string;
  kiroDesign: string;
  kiroTasks: string;
}

const REQUIRED_FIELDS: (keyof SaveSessionBody)[] = [
  "userId",
  "braindumpTranscript",
  "extractedContext",
  "interviewTranscript",
  "prdMarkdown",
  "kiroRequirements",
  "kiroDesign",
  "kiroTasks",
];

export async function POST(req: Request) {
  // 1. Parse request body
  let body: SaveSessionBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 2. Validate all required fields are present
  const missingFields = REQUIRED_FIELDS.filter(
    (field) => body[field] === undefined || body[field] === null
  );
  if (missingFields.length > 0) {
    return Response.json(
      { error: `Missing required fields: ${missingFields.join(", ")}` },
      { status: 400 }
    );
  }

  const {
    userId,
    braindumpTranscript,
    extractedContext,
    interviewTranscript,
    prdMarkdown,
    kiroRequirements,
    kiroDesign,
    kiroTasks,
  } = body;

  // 3. Extract intent and domain from extractedContext
  const { intent, domain } = extractedContext;

  try {
    // 4. Generate 768-dim embedding
    const embedding = await embed(`${intent} ${domain} ${prdMarkdown}`);

    // 5. Insert session row into DB
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

    // 6. Return sessionId on success
    return Response.json({ sessionId: result[0].id });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save session";
    console.error("save-session error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
