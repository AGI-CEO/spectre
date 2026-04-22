"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { ExtractedContext, BrainstormMessage } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BrainstormAgentProps {
  transcript: string;
  extractedContext: ExtractedContext;
  onBrainstormComplete: (messages: BrainstormMessage[]) => void;
}

// ── Inner component (must live inside ConversationProvider) ──────────────────

interface InnerProps extends BrainstormAgentProps {
  signedUrl: string | null;
  tokenError: string | null;
  isLoadingToken: boolean;
}

function BrainstormAgentInner({
  transcript,
  extractedContext,
  onBrainstormComplete,
  signedUrl,
  tokenError,
  isLoadingToken,
}: InnerProps) {
  const [brainstormMessages, setBrainstormMessages] = useState<BrainstormMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [textFallback, setTextFallback] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const chatLogRef = useRef<HTMLDivElement>(null);

  // Initialize useConversation with onMessage callback
  const { startSession, endSession, status, isSpeaking, sendUserMessage } =
    useConversation({
      onMessage: useCallback(
        (message: { message: string; source: "user" | "ai" }) => {
          const messageText = message.message.toLowerCase();
          
          // Flag gaps when user says "I don't know" or equivalent
          const gapIndicators = [
            "i don't know",
            "i'm not sure",
            "not sure",
            "don't know",
            "no idea",
            "haven't thought about",
          ];
          const isGap = gapIndicators.some((indicator) => messageText.includes(indicator));

          setBrainstormMessages((prev) => [
            ...prev,
            {
              role: message.source === "ai" ? "agent" : "user",
              message: message.message,
              timestamp: new Date().toISOString(),
              gapFlagged: isGap ? message.message : undefined,
            },
          ]);
        },
        []
      ),
    });

  // If token fetch failed, activate text fallback automatically
  useEffect(() => {
    if (tokenError) {
      setTextFallback(true);
    }
  }, [tokenError]);

  // Auto-scroll chat log
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [brainstormMessages]);

  // Start voice session with dynamic variables
  async function handleStartVoice() {
    if (!signedUrl) return;
    try {
      await startSession({
        signedUrl,
        dynamicVariables: {
          transcript_summary: transcript.slice(0, 500),
          extracted_intent: extractedContext.intent,
          domain: extractedContext.domain,
          gaps: extractedContext.gaps.join(", "),
        },
      });
      setSessionStarted(true);
    } catch (err) {
      console.error("Failed to start voice session:", err);
      setTextFallback(true);
    }
  }

  async function handleEndVoice() {
    if (status === "connected") {
      await endSession();
    }
    setSessionStarted(false);
  }

  // Send text message to agent
  async function handleSendText() {
    const trimmed = textInput.trim();
    if (!trimmed) return;

    // Check for gap indicators
    const messageText = trimmed.toLowerCase();
    const gapIndicators = [
      "i don't know",
      "i'm not sure",
      "not sure",
      "don't know",
      "no idea",
      "haven't thought about",
    ];
    const isGap = gapIndicators.some((indicator) => messageText.includes(indicator));

    // Append user message to local state immediately
    setBrainstormMessages((prev) => [
      ...prev,
      {
        role: "user",
        message: trimmed,
        timestamp: new Date().toISOString(),
        gapFlagged: isGap ? trimmed : undefined,
      },
    ]);
    setTextInput("");

    // If voice session is connected, send via the agent; otherwise just record locally
    if (status === "connected") {
      sendUserMessage(trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }

  // Complete brainstorm and trigger research
  async function handleCompleteBrainstorm() {
    if (status === "connected") {
      await endSession();
    }
    onBrainstormComplete(brainstormMessages);
  }

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoadingToken) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-zinc-400">Connecting to brainstorm agent…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-zinc-700 bg-zinc-900 p-6">
      {/* ── Error notice ─────────────────────────────────────────────────────── */}
      {tokenError && (
        <div
          role="alert"
          className="rounded-lg border border-yellow-700 bg-yellow-950 px-4 py-3 text-sm text-yellow-300"
        >
          <span className="font-medium">Voice mode unavailable:</span>{" "}
          {tokenError}. Text chat is active instead.
        </div>
      )}

      {/* ── Voice controls ───────────────────────────────────────────────────── */}
      {!textFallback && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                isConnected
                  ? isSpeaking
                    ? "bg-indigo-900 text-indigo-300"
                    : "bg-green-900 text-green-300"
                  : isConnecting
                  ? "bg-zinc-800 text-zinc-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected
                    ? isSpeaking
                      ? "animate-pulse bg-indigo-400"
                      : "bg-green-400"
                    : isConnecting
                    ? "animate-pulse bg-zinc-400"
                    : "bg-zinc-600"
                }`}
              />
              {isConnected
                ? isSpeaking
                  ? "Agent speaking…"
                  : "Listening…"
                : isConnecting
                ? "Connecting…"
                : "Disconnected"}
            </span>
          </div>

          {/* Mic toggle button */}
          {!isConnected && !isConnecting ? (
            <button
              type="button"
              onClick={handleStartVoice}
              disabled={!signedUrl}
              aria-label="Start voice brainstorm"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {/* Mic icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEndVoice}
              aria-label="End voice brainstorm"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {/* Stop icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}

          <p className="text-xs text-zinc-500">
            {isConnected
              ? "Click to end voice session"
              : "Click to start voice brainstorm"}
          </p>

          {/* Toggle to text fallback */}
          <button
            type="button"
            onClick={() => setTextFallback(true)}
            className="text-xs text-zinc-500 underline hover:text-zinc-300"
          >
            Switch to text chat instead
          </button>
        </div>
      )}

      {/* ── Text chat fallback ───────────────────────────────────────────────── */}
      {(textFallback || isConnected) && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-300">
            {textFallback && !isConnected ? "Text Chat" : "Chat Log"}
          </h3>

          {/* Chat log */}
          <div
            ref={chatLogRef}
            className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800 p-3"
            aria-live="polite"
            aria-label="Brainstorm chat log"
          >
            {brainstormMessages.length === 0 ? (
              <p className="text-center text-xs text-zinc-500">
                No messages yet. Start the conversation below.
              </p>
            ) : (
              brainstormMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-0.5 ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <span className="text-xs text-zinc-500">
                    {msg.role === "user" ? "You" : "Agent"}
                    {msg.gapFlagged && (
                      <span className="ml-2 text-yellow-500">(gap flagged)</span>
                    )}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-indigo-700 text-white"
                        : "bg-zinc-700 text-zinc-100"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Text input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              aria-label="Message input"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSendText}
              disabled={!textInput.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* ── Complete brainstorm button ───────────────────────────────────────── */}
      <div className="flex justify-end border-t border-zinc-700 pt-4">
        <button
          type="button"
          onClick={handleCompleteBrainstorm}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          Complete Brainstorm →
        </button>
      </div>
    </div>
  );
}

// ── Outer component (fetches token, wraps with ConversationProvider) ─────────

export default function BrainstormAgent(props: BrainstormAgentProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);

  // Fetch signed URL on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchToken() {
      try {
        const res = await fetch("/api/agent-token");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setSignedUrl(data.signedUrl);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to connect to voice agent";
          setTokenError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingToken(false);
        }
      }
    }

    fetchToken();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ConversationProvider>
      <BrainstormAgentInner
        {...props}
        signedUrl={signedUrl}
        tokenError={tokenError}
        isLoadingToken={isLoadingToken}
      />
    </ConversationProvider>
  );
}
