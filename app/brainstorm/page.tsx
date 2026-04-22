"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrainstormAgent from "@/components/BrainstormAgent";
import ResearchProgress from "@/components/ResearchProgress";
import type { BrainstormMessage, ExtractedContext, ResearchReport } from "@/lib/types";
import { deriveFeatureName } from "@/lib/steering-generator";

export default function BrainstormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      }
    >
      <BrainstormContent />
    </Suspense>
  );
}

function BrainstormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transcript, setTranscript] = useState("");
  const [extractedContext, setExtractedContext] = useState<ExtractedContext | null>(null);
  const [userId, setUserId] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipTriggered = useRef(false);

  // Load session from localStorage
  useEffect(() => {
    const sessionData = localStorage.getItem("specdraft_v2_session");
    if (!sessionData) {
      router.push("/");
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      setTranscript(session.transcript);
      setExtractedContext(session.extractedContext);
      setUserId(session.userId);
    } catch (err) {
      console.error("Failed to parse session data:", err);
      router.push("/");
    }
  }, [router]);

  async function handleBrainstormComplete(messages: BrainstormMessage[]) {
    if (!extractedContext) return;

    setIsResearching(true);
    setError(null);

    try {
      // Run research pipeline
      const researchRes = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          extractedContext,
          brainstormMessages: messages,
        }),
      });

      if (!researchRes.ok) {
        throw new Error("Research pipeline failed");
      }

      const { researchReport } = (await researchRes.json()) as {
        researchReport: ResearchReport;
      };

      // Generate steering files
      const steeringRes = await fetch("/api/generate-steering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchReport,
          extractedContext,
          brainstormMessages: messages,
          generateSeedRequirements: true, // opt-in for seed requirements
        }),
      });

      if (!steeringRes.ok) {
        throw new Error("Steering file generation failed");
      }

      const {
        contextSteeringFile,
        audienceSteeringFile,
        seedRequirementsFile,
        featureName,
      } = await steeringRes.json();

      // Save session to database
      const saveRes = await fetch("/api/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          braindumpTranscript: transcript,
          extractedContext,
          brainstormTranscript: messages,
          researchReport,
          contextSteeringFile,
          audienceSteeringFile,
          seedRequirementsFile,
        }),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save session");
      }

      const { sessionId } = (await saveRes.json()) as { sessionId: number };

      // Store in localStorage for immediate access
      localStorage.setItem(
        "specdraft_v2_handoff",
        JSON.stringify({
          sessionId,
          contextSteeringFile,
          audienceSteeringFile,
          seedRequirementsFile,
          researchReport,
          featureName,
        })
      );

      // Navigate to handoff viewer
      router.push(`/handoff/${sessionId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setIsResearching(false);
    }
  }

  // DEV: Skip interview when ?skip=true — uses cached brainstorm messages
  useEffect(() => {
    if (
      searchParams.get("skip") !== "true" ||
      !extractedContext ||
      skipTriggered.current
    )
      return;

    const skipData = localStorage.getItem("specdraft_v2_skip");
    if (!skipData) {
      console.warn("[DEV SKIP] No skip data in localStorage. Run: node scripts/dev-skip-brainstorm.mjs");
      return;
    }

    skipTriggered.current = true;
    try {
      const { brainstormMessages } = JSON.parse(skipData);
      console.log("[DEV SKIP] Auto-triggering research with", brainstormMessages.length, "cached messages");
      handleBrainstormComplete(brainstormMessages);
    } catch (err) {
      console.error("[DEV SKIP] Failed to parse skip data:", err);
    }
  }, [searchParams, extractedContext]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!extractedContext) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-white">
          Brainstorm Session
        </h1>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/30 bg-red-950/30 px-6 py-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {!isResearching ? (
          <BrainstormAgent
            transcript={transcript}
            extractedContext={extractedContext}
            onBrainstormComplete={handleBrainstormComplete}
          />
        ) : (
          <ResearchProgress isResearching={true} />
        )}
      </div>
    </div>
  );
}
