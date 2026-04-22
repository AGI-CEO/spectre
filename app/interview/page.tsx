"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InterviewAgent from "@/components/InterviewAgent";
import type { ExtractedContext, InterviewMessage } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoredSession {
  transcript: string;
  extractedContext: ExtractedContext;
  userId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InterviewPage() {
  const router = useRouter();

  // Avoid hydration mismatch — don't read localStorage until mounted
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);

  // PRD generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ── Mount: read localStorage ───────────────────────────────────────────────

  useEffect(() => {
    setMounted(true);

    try {
      const raw = localStorage.getItem("specdraft_session");
      if (!raw) {
        router.replace("/");
        return;
      }

      const parsed = JSON.parse(raw) as Partial<StoredSession>;

      if (
        !parsed.transcript ||
        !parsed.extractedContext ||
        !parsed.userId
      ) {
        router.replace("/");
        return;
      }

      setSession({
        transcript: parsed.transcript,
        extractedContext: parsed.extractedContext,
        userId: parsed.userId,
      });
    } catch {
      router.replace("/");
    }
  }, [router]);

  // ── onInterviewComplete callback ───────────────────────────────────────────

  async function handleInterviewComplete(interviewMessages: InterviewMessage[]) {
    if (!session) return;

    setIsGenerating(true);
    setGenerateError(null);

    const { transcript, extractedContext, userId } = session;

    try {
      // 20.4 — POST to /api/generate-prd
      const prdRes = await fetch("/api/generate-prd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          extractedContext,
          interviewMessages,
          userId,
        }),
      });

      if (!prdRes.ok) {
        const data = await prdRes.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ??
            `PRD generation failed (HTTP ${prdRes.status})`
        );
      }

      const {
        prdMarkdown,
        kiroRequirements,
        kiroDesign,
        kiroTasks,
        featureName,
      } = (await prdRes.json()) as {
        prdMarkdown: string;
        kiroRequirements: string;
        kiroDesign: string;
        kiroTasks: string;
        featureName: string;
      };

      // 20.5 — POST to /api/save-session
      const saveRes = await fetch("/api/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          braindumpTranscript: transcript,
          extractedContext,
          interviewTranscript: interviewMessages,
          prdMarkdown,
          kiroRequirements,
          kiroDesign,
          kiroTasks,
        }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ??
            `Failed to save session (HTTP ${saveRes.status})`
        );
      }

      const { sessionId } = (await saveRes.json()) as { sessionId: number };

      // 20.6 — Update localStorage with full session data
      localStorage.setItem(
        "specdraft_session",
        JSON.stringify({
          prdMarkdown,
          kiroRequirements,
          kiroDesign,
          kiroTasks,
          featureName,
          sessionId,
        })
      );

      // 20.7 — Navigate to /prd/{sessionId}
      router.push(`/prd/${sessionId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setGenerateError(message);
      setIsGenerating(false);
    }
  }

  // ── Loading state (pre-mount or redirecting) ───────────────────────────────

  if (!mounted || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // ── Generating PRD overlay ─────────────────────────────────────────────────

  if (isGenerating) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold text-zinc-100">
            Generating your PRD…
          </p>
          <p className="text-sm text-zinc-400">
            This may take a moment. Please don&apos;t close this tab.
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-zinc-200">
            SpecDraft
          </span>
          <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            Interview
          </span>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-zinc-100">
            Let&apos;s refine your idea
          </h1>
          <p className="text-sm text-zinc-400">
            The AI agent will ask you a few questions to fill in the gaps.
            Answer by voice or text, then click &ldquo;Generate PRD&rdquo; when
            you&apos;re ready.
          </p>
        </div>

        {/* Error message */}
        {generateError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/30 bg-red-950/30 px-6 py-4 text-sm text-red-300"
          >
            <span className="font-medium">Error:</span> {generateError}
          </div>
        )}

        {/* Interview agent */}
        <InterviewAgent
          transcript={session.transcript}
          extractedContext={session.extractedContext}
          onInterviewComplete={handleInterviewComplete}
        />
      </main>
    </div>
  );
}
