import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import type { ExtractedContext } from "@/lib/types";
import PRDViewer from "@/components/PRDViewer";

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveFeatureName(intent: string): string {
  return (
    intent
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "my-feature"
  );
}

// ── 404 page ─────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 text-zinc-100">
      <h1 className="text-2xl font-bold">Session not found</h1>
      <p className="text-zinc-400">
        This session doesn&apos;t exist or has been deleted.
      </p>
      <a
        href="/"
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Start New Session
      </a>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PRDPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // Parse and validate the session ID
  const sessionIdNum = parseInt(sessionId, 10);
  if (isNaN(sessionIdNum)) {
    return <NotFound />;
  }

  // Fetch session from NeonDB via Drizzle
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionIdNum),
  });

  if (!session) {
    return <NotFound />;
  }

  // Derive featureName from extractedContext.intent using the same kebab-case
  // logic as lib/kiro-spec-generator.ts
  const extractedContext = session.extractedContext as ExtractedContext | null;
  const featureName = extractedContext?.intent
    ? deriveFeatureName(extractedContext.intent)
    : "my-feature";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <a
              href="/"
              className="text-sm font-medium text-zinc-400 transition hover:text-zinc-100"
            >
              ← SpecDraft
            </a>
            <span className="text-sm text-zinc-500">
              Session #{sessionIdNum}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100">
            {featureName !== "my-feature"
              ? featureName
                  .split("-")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")
              : "Product Requirements Document"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Generated PRD &amp; Kiro Spec Bundle
          </p>
        </div>

        <PRDViewer
          prdMarkdown={session.prdMarkdown ?? ""}
          kiroRequirements={session.kiroRequirements ?? ""}
          kiroDesign={session.kiroDesign ?? ""}
          kiroTasks={session.kiroTasks ?? ""}
          featureName={featureName}
          sessionId={sessionIdNum}
        />
      </main>
    </div>
  );
}
