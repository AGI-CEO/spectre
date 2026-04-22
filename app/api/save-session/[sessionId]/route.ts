import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

interface UpdateSessionBody {
  contextSteeringFile?: string;
  audienceSteeringFile?: string;
  seedRequirementsFile?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Parse sessionId from route params
    const { sessionId } = await params;
    const sessionIdNum = parseInt(sessionId, 10);

    if (isNaN(sessionIdNum)) {
      return Response.json(
        { error: "Invalid sessionId" },
        { status: 400 }
      );
    }

    // Parse request body
    const body: UpdateSessionBody = await request.json();

    // Validate at least one field is provided
    if (!body.contextSteeringFile && !body.audienceSteeringFile && !body.seedRequirementsFile) {
      return Response.json(
        { error: "At least one field must be provided for update" },
        { status: 400 }
      );
    }

    // Check if session exists
    const existingSession = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.id, sessionIdNum))
      .limit(1);

    if (existingSession.length === 0) {
      return Response.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: Partial<{
      contextSteeringFile: string;
      audienceSteeringFile: string;
      seedRequirementsFile: string;
    }> = {};

    if (body.contextSteeringFile !== undefined) {
      updateData.contextSteeringFile = body.contextSteeringFile;
    }
    if (body.audienceSteeringFile !== undefined) {
      updateData.audienceSteeringFile = body.audienceSteeringFile;
    }
    if (body.seedRequirementsFile !== undefined) {
      updateData.seedRequirementsFile = body.seedRequirementsFile;
    }

    // Update session
    await db
      .update(sessions)
      .set(updateData)
      .where(eq(sessions.id, sessionIdNum));

    return Response.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update session";
    console.error("Update session error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
