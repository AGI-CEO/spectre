"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

// ── Particle config ─────────────────────────────────────────────────────────

const PARTICLES = [
  { id: 0, size: 6, left: 8, delay: 0, duration: 18, variant: "violet" },
  { id: 1, size: 5, left: 22, delay: 3.2, duration: 24, variant: "cyan" },
  { id: 2, size: 9, left: 38, delay: 7.1, duration: 15, variant: "indigo" },
  { id: 3, size: 7, left: 52, delay: 1.5, duration: 22, variant: "violet" },
  { id: 4, size: 4, left: 65, delay: 9.8, duration: 27, variant: "cyan" },
  { id: 5, size: 10, left: 78, delay: 4.4, duration: 19, variant: "indigo" },
  { id: 6, size: 5, left: 15, delay: 6.7, duration: 21, variant: "violet" },
  { id: 7, size: 8, left: 43, delay: 11.2, duration: 16, variant: "cyan" },
  { id: 8, size: 6, left: 88, delay: 2.9, duration: 25, variant: "indigo" },
  { id: 9, size: 11, left: 33, delay: 8.5, duration: 14, variant: "violet" },
  { id: 10, size: 7, left: 71, delay: 5.6, duration: 23, variant: "cyan" },
  { id: 11, size: 5, left: 56, delay: 10.3, duration: 17, variant: "indigo" },
];

// ── Types ───────────────────────────────────────────────────────────────────

type FunnelStep = "closed" | "choose" | "capture" | "extracting";
type IntakeMethod = "voice" | "upload" | null;

// ── component ─────────────────────────────────────────────────────────────────

export default function BraindumpPage() {
  const router = useRouter();

  const [funnelStep, setFunnelStep] = useState<FunnelStep>("closed");
  const [intakeMethod, setIntakeMethod] = useState<IntakeMethod>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Open the funnel
  function openFunnel() {
    setFunnelStep("choose");
    setIntakeMethod(null);
    setExtractError(null);
  }

  // Close the funnel
  function closeFunnel() {
    setFunnelStep("closed");
    setIntakeMethod(null);
    setExtractError(null);
  }

  // Select intake method → advance to capture
  function selectMethod(method: "voice" | "upload") {
    setIntakeMethod(method);
    setFunnelStep("capture");
  }

  // Go back from capture → choose
  function goBackToChoose() {
    setIntakeMethod(null);
    setFunnelStep("choose");
    setExtractError(null);
  }

  // Called by both BraindumpRecorder and FileUploadZone when the user confirms
  const handleTranscriptConfirmed = useCallback(
    async (transcript: string) => {
      setIsExtracting(true);
      setExtractError(null);
      setFunnelStep("extracting");

      try {
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

        const userId = getOrCreateUserId();
        const pastSessionsUrl = `/api/past-sessions?query=${encodeURIComponent(
          extractedContext.intent
        )}&userId=${encodeURIComponent(userId)}`;
        await fetch(pastSessionsUrl).catch(() => {});

        localStorage.setItem(
          "specdraft_v2_session",
          JSON.stringify({
            transcript,
            extractedContext,
            userId,
          })
        );

        router.push("/brainstorm");
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
        setExtractError(message);
        setFunnelStep("capture");
        setIsExtracting(false);
      }
    },
    [router]
  );

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && funnelStep !== "closed" && funnelStep !== "extracting") {
        closeFunnel();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [funnelStep]);

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-zinc-100 font-sans relative">
      {/* ── Animated Background ────────────────────────────────────────── */}
      <div className="spectre-bg">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className={`particle particle--${p.variant}`}
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="hero">
        {/* Spectre logo mark */}
        <div className="spectre-glow fade-in-up">
          <svg
            width="56"
            height="56"
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <path
              d="M256 48c-97 0-176 79-176 176v192c0 8 10 13 16 7l40-40c6-6 16-6 22 0l40 40c6 6 16 6 22 0l36-36c6-6 16-6 22 0l36 36c6 6 16 6 22 0l40-40c6-6 16-6 22 0l40 40c6 6 16 1 16-7V224c0-97-79-176-176-176z"
              fill="url(#logo-g)"
            />
            <ellipse cx="200" cy="240" rx="28" ry="36" fill="#0f0f23" opacity="0.9" />
            <ellipse cx="312" cy="240" rx="28" ry="36" fill="#0f0f23" opacity="0.9" />
            <ellipse cx="210" cy="228" rx="10" ry="12" fill="white" opacity="0.7" />
            <ellipse cx="322" cy="228" rx="10" ry="12" fill="white" opacity="0.7" />
          </svg>
        </div>

        {/* Badge */}
        <span className="badge fade-in-up fade-in-up-delay-1">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#8b5cf6",
              boxShadow: "0 0 8px rgba(139, 92, 246, 0.6)",
            }}
          />
          For founders tired of &ldquo;someday&rdquo;
        </span>

        {/* Headline */}
        <h1 className="hero__title fade-in-up fade-in-up-delay-2">
          You don&apos;t have an execution problem.{" "}
          <span className="hero__title-accent">You have a starting problem.</span>
        </h1>

        {/* Subheadline */}
        <p className="hero__subtitle fade-in-up fade-in-up-delay-3">
          That notes app full of &ldquo;billion-dollar ideas&rdquo;? Pick one.
          Talk about it for 2 minutes. Spectre turns your raw ramble into a
          production-ready spec you can paste into Kiro and let it do all the work.
        </p>

        {/* CTA */}
        <button
          id="cta-start"
          type="button"
          onClick={openFunnel}
          className="btn-cta fade-in-up fade-in-up-delay-4"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
            <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
          </svg>
          Pick an Idea. Go.
        </button>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <div className="process-steps">
        <div className="process-card">
          <span className="process-card__number">1</span>
          <h3 className="process-card__title">Stop organizing. Start talking.</h3>
          <p className="process-card__desc">
            No templates. No 47-field forms. Hit record and ramble about your idea like you&apos;re telling a friend at a bar.
          </p>
        </div>
        <div className="process-card">
          <span className="process-card__number">2</span>
          <h3 className="process-card__title">Get the hard questions you&apos;ve been dodging</h3>
          <p className="process-card__desc">
            Spectre plays devil&apos;s advocate — poking holes, filling gaps with real market research, and forcing clarity on the parts you&apos;ve been hand-waving.
          </p>
        </div>
        <div className="process-card">
          <span className="process-card__number">3</span>
          <h3 className="process-card__title">Walk away with something buildable</h3>
          <p className="process-card__desc">
            Not a pitch deck. Not a Notion doc. A real product spec you paste into Kiro and let it build the whole thing for you.
          </p>
        </div>
      </div>

      {/* ── Funnel Modal ─────────────────────────────────────────────── */}
      {funnelStep !== "closed" && (
        <div
          className="funnel-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && funnelStep !== "extracting") {
              closeFunnel();
            }
          }}
        >
          <div className="funnel-container">
            {/* Step indicator */}
            <div className="step-indicator">
              <div
                className={`step-dot ${
                  funnelStep === "choose"
                    ? "step-dot--active"
                    : "step-dot--completed"
                }`}
              />
              <div
                className={`step-line ${
                  funnelStep !== "choose" ? "step-line--active" : ""
                }`}
              />
              <div
                className={`step-dot ${
                  funnelStep === "capture"
                    ? "step-dot--active"
                    : funnelStep === "extracting"
                    ? "step-dot--completed"
                    : ""
                }`}
              />
              <div
                className={`step-line ${
                  funnelStep === "extracting" ? "step-line--active" : ""
                }`}
              />
              <div
                className={`step-dot ${
                  funnelStep === "extracting" ? "step-dot--active" : ""
                }`}
              />
            </div>

            {/* ── Step 1: Choose Method ─────────────────────────────────── */}
            {funnelStep === "choose" && (
              <div className="step-enter" key="choose">
                <div className="glass rounded-2xl p-8 relative">
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeFunnel}
                    aria-label="Close"
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
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  <div className="text-center mb-8">
                    <h2
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Alright, let&apos;s get this one out of your head.
                    </h2>
                    <p
                      style={{
                        fontSize: "0.9375rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Pick how you want to capture it — messy is fine, that&apos;s the point
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Voice Recording Card */}
                    <button
                      id="method-voice"
                      type="button"
                      className="method-card"
                      onClick={() => selectMethod("voice")}
                    >
                      <div className="method-card__icon">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#a78bfa"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="22" />
                        </svg>
                      </div>
                      <span className="method-card__title">
                        Just Talk
                      </span>
                      <span className="method-card__desc">
                        Hit record and ramble — no structure needed, Spectre will make sense of it
                      </span>
                    </button>

                    {/* Upload Card */}
                    <button
                      id="method-upload"
                      type="button"
                      className="method-card"
                      onClick={() => selectMethod("upload")}
                    >
                      <div className="method-card__icon">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <span className="method-card__title">
                        Upload a Voice Memo
                      </span>
                      <span className="method-card__desc">
                        Got a 3 AM voice note already? Perfect. Drop it here.
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Capture ───────────────────────────────────────── */}
            {funnelStep === "capture" && (
              <div className="step-enter" key="capture">
                <div className="glass rounded-2xl p-8 relative">
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeFunnel}
                    aria-label="Close"
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
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  <div className="mb-6">
                    <button
                      type="button"
                      className="btn-back"
                      onClick={goBackToChoose}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                      Back
                    </button>
                  </div>

                  <div className="text-center mb-6">
                    <h2
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {intakeMethod === "voice"
                        ? "Let it rip"
                        : "Drop your voice memo"}
                    </h2>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {intakeMethod === "voice"
                        ? "Talk for up to 10 minutes — the messier, the better"
                        : "Drag & drop that 3 AM voice note right here"}
                    </p>
                  </div>

                  {/* Error message */}
                  {extractError && (
                    <div
                      role="alert"
                      className="mb-6 rounded-xl border border-red-500/30 bg-red-950/30 px-6 py-4 text-sm text-red-300"
                    >
                      {extractError}
                    </div>
                  )}

                  {/* Intake component */}
                  {intakeMethod === "voice" ? (
                    <BraindumpRecorder
                      onTranscriptConfirmed={handleTranscriptConfirmed}
                    />
                  ) : (
                    <FileUploadZone
                      onTranscriptConfirmed={handleTranscriptConfirmed}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: Extracting ───────────────────────────────────── */}
            {funnelStep === "extracting" && (
              <div className="step-enter" key="extracting">
                <div className="glass rounded-2xl p-12 relative">
                  <div className="flex flex-col items-center gap-6 text-center">
                    {/* Pulsing logo */}
                    <div className="extract-pulse">
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 512 512"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <defs>
                          <linearGradient
                            id="extract-g"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#a78bfa" />
                            <stop offset="50%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M256 48c-97 0-176 79-176 176v192c0 8 10 13 16 7l40-40c6-6 16-6 22 0l40 40c6 6 16 6 22 0l36-36c6-6 16-6 22 0l36 36c6 6 16 6 22 0l40-40c6-6 16-6 22 0l40 40c6 6 16 1 16-7V224c0-97-79-176-176-176z"
                          fill="url(#extract-g)"
                        />
                        <ellipse
                          cx="200"
                          cy="240"
                          rx="28"
                          ry="36"
                          fill="#0f0f23"
                          opacity="0.9"
                        />
                        <ellipse
                          cx="312"
                          cy="240"
                          rx="28"
                          ry="36"
                          fill="#0f0f23"
                          opacity="0.9"
                        />
                        <ellipse
                          cx="210"
                          cy="228"
                          rx="10"
                          ry="12"
                          fill="white"
                          opacity="0.7"
                        />
                        <ellipse
                          cx="322"
                          cy="228"
                          rx="10"
                          ry="12"
                          fill="white"
                          opacity="0.7"
                        />
                      </svg>
                    </div>

                    <div>
                      <p
                        style={{
                          fontSize: "1.125rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Turning your ramble into a real plan&hellip;
                      </p>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Extracting the product vision, spotting gaps, and
                        prepping your brainstorm session
                      </p>
                    </div>

                    {/* Animated dots */}
                    <div className="dna-helix">
                      <div className="dna-dot" />
                      <div className="dna-dot" />
                      <div className="dna-dot" />
                      <div className="dna-dot" />
                      <div className="dna-dot" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
