"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BraindumpRecorder from "@/components/BraindumpRecorder";
import FileUploadZone from "@/components/FileUploadZone";
import type { ExtractedContext } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function getOrCreateUserId(): string {
  const key = "specdraft_user_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function BraindumpPage() {
  const router = useRouter();
  const intakeSectionRef = useRef<HTMLDivElement>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Scroll to the intake section when the CTA is clicked
  function scrollToIntake() {
    intakeSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // Called by both BraindumpRecorder and FileUploadZone when the user confirms
  async function handleTranscriptConfirmed(transcript: string) {
    setIsExtracting(true);
    setExtractError(null);

    try {
      // 18.4a — POST to /api/extract-context
      const extractRes = await fetch("/api/extract-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!extractRes.ok) {
        const data = await extractRes.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ??
            `Context extraction failed (HTTP ${extractRes.status})`
        );
      }

      const { context: extractedContext } = (await extractRes.json()) as {
        context: ExtractedContext;
      };

      // 18.4b — GET /api/past-sessions (fire-and-forget; result not needed for navigation)
      const userId = getOrCreateUserId();
      const pastSessionsUrl = `/api/past-sessions?query=${encodeURIComponent(
        extractedContext.intent
      )}&userId=${encodeURIComponent(userId)}`;
      await fetch(pastSessionsUrl).catch(() => {
        // Non-fatal — past sessions are advisory only
      });

      // 18.5 — persist session to localStorage
      localStorage.setItem(
        "specdraft_v2_session",
        JSON.stringify({
          transcript,
          extractedContext,
          userId,
        })
      );

      // 18.6 — navigate to /brainstorm
      router.push("/brainstorm");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setExtractError(message);
      setIsExtracting(false);
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center gap-8 px-6 py-28 text-center">
        {/* Badge */}
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-1 text-xs font-medium text-indigo-300 tracking-wide uppercase">
          Voice-First AI Product Copilot
        </span>

        {/* Headline */}
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Voice-First AI Brainstorm{" "}
          <span className="text-indigo-400">for Kiro</span>
        </h1>

        {/* Subheadline */}
        <p className="max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Brain-dump your product idea → Brainstorm with AI → Get Kiro steering files with validated context, research, and architecture recommendations.
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={scrollToIntake}
          className="rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          Start Brain-Dump
        </button>
      </section>

      {/* ── Intake section ────────────────────────────────────────────────── */}
      <section
        ref={intakeSectionRef}
        id="intake"
        className="mx-auto w-full max-w-5xl px-6 pb-24"
      >
        <h2 className="mb-8 text-center text-xl font-semibold text-zinc-200">
          Choose how you want to brain-dump
        </h2>

        {/* Loading overlay */}
        {isExtracting && (
          <div className="mb-6 flex items-center justify-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/40 px-6 py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            <p className="text-sm font-medium text-indigo-300">
              Extracting context&hellip;
            </p>
          </div>
        )}

        {/* Error message */}
        {extractError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/30 bg-red-950/30 px-6 py-4 text-sm text-red-300"
          >
            {extractError}
          </div>
        )}

        {/*
         * Side-by-side on md+, stacked (tabbed feel) on mobile.
         * Each panel is visually separated with a divider label.
         */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {/* Voice recorder */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              🎙 Record your voice
            </p>
            <BraindumpRecorder
              onTranscriptConfirmed={handleTranscriptConfirmed}
            />
          </div>

          {/* Divider — visible only on mobile */}
          <div className="flex items-center gap-4 md:hidden">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-500">or</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* File upload */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              📁 Upload an audio file
            </p>
            <FileUploadZone
              onTranscriptConfirmed={handleTranscriptConfirmed}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
