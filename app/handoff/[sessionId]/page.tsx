import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import HandoffViewer from "@/components/HandoffViewer";
import type { ExtractedContext, ResearchReport } from "@/lib/types";

export default async function HandoffPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const sessionIdNum = parseInt(sessionId, 10);

  if (isNaN(sessionIdNum)) {
    notFound();
  }

  // Fetch session from database
  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionIdNum))
    .limit(1);

  if (sessionRows.length === 0) {
    notFound();
  }

  const session = sessionRows[0];

  // Validate v2 session
  if (
    !session.brainstormTranscript ||
    !session.researchReport ||
    !session.contextSteeringFile ||
    !session.audienceSteeringFile
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">Invalid Session</h1>
          <p className="text-zinc-400">
            This session does not contain v2 data. Please start a new brainstorm session.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  const extractedContext = session.extractedContext as ExtractedContext;
  const researchReport = session.researchReport as ResearchReport;

  // Derive feature name from intent
  const featureName = extractedContext.intent
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "my-feature";

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-white">
          Kiro Handoff
        </h1>

        <HandoffViewer
          sessionId={session.id}
          sessionDate={session.createdAt?.toISOString() || new Date().toISOString()}
          productName={extractedContext.intent}
          contextSteeringFile={session.contextSteeringFile}
          audienceSteeringFile={session.audienceSteeringFile}
          seedRequirementsFile={session.seedRequirementsFile || undefined}
          researchReport={researchReport}
          featureName={featureName}
        />
      </div>
    </div>
  );
}
