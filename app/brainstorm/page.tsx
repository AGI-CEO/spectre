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
          <div className="flex flex-col gap-6">
            <ResearchProgress isResearching={true} />
            <DemoEngagementCTA />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Demo Engagement CTA (shown during research wait) ────────────────────────

function DemoEngagementCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="rounded-xl border border-zinc-700 bg-zinc-900 p-6"
      style={{ animation: "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both" }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2 text-zinc-400">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="text-xs font-medium uppercase tracking-wider">
            While you wait
          </span>
        </div>

        <p className="text-sm text-zinc-300 max-w-md">
          Spectre is a hackathon project — every like and repost helps us win.
          If this tool saved you time, show some love on the demo post. 🙏
        </p>

        <a
          href="https://x.com/AGI_CEO/status/2047062315372081603"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 hover:border-zinc-500"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Like &amp; Repost the Demo
        </a>
      </div>
    </div>
  );
}
