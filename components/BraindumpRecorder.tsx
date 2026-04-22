"use client";

import { useEffect, useRef, useState } from "react";
import WaveformVisualizer from "./WaveformVisualizer";

interface BraindumpRecorderProps {
  onTranscriptConfirmed: (transcript: string) => void;
}

const MAX_RECORDING_SECONDS = 600; // 10 minutes

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function BraindumpRecorder({
  onTranscriptConfirmed,
}: BraindumpRecorderProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(MAX_RECORDING_SECONDS);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 16.1 — detect MediaRecorder support on mount
  useEffect(() => {
    if (typeof MediaRecorder === "undefined") {
      setIsSupported(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // 16.2 — startRecording
  async function startRecording() {
    setError(null);
    chunksRef.current = [];
    setAudioChunks([]);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      // 16.4 — mic permission denied
      setError(
        "Microphone access was denied. Please allow microphone access or upload an audio file instead."
      );
      return;
    }

    streamRef.current = stream;

    // Wire up Web Audio API for waveform visualisation
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    setAnalyserNode(analyser);

    // Create MediaRecorder
    const mimeType = "audio/webm";
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
        setAudioChunks((prev) => [...prev, e.data]);
      }
    };

    recorder.onstop = () => {
      // Handled by stopRecording — collect chunks and POST
      handleRecorderStop();
    };

    recorder.start(250); // collect data every 250 ms
    setMediaRecorder(recorder);
    setIsRecording(true);
    setTimeRemaining(MAX_RECORDING_SECONDS);

    // 10-minute countdown timer
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-stop when limit reached
          recorder.stop();
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // 16.3 — stopRecording (called by user clicking "Stop & Continue")
  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    clearTimer();

    // Stop all mic tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setAnalyserNode(null);
    setIsRecording(false);
    setTimeRemaining(MAX_RECORDING_SECONDS);
  }

  // Called when the MediaRecorder fires onstop — collect chunks and POST
  // 16.5 — POST blob to /api/transcribe
  async function handleRecorderStop() {
    const chunks = chunksRef.current;
    if (chunks.length === 0) {
      setError("No audio was recorded. Please try again.");
      return;
    }

    const blob = new Blob(chunks, { type: "audio/webm" });

    // 16.6 — loading state
    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Transcription failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      // 16.7 — show transcript
      setTranscript(data.transcript ?? "");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transcription failed. Please try again.";
      setError(message);
    } finally {
      setIsTranscribing(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  // 16.1 — unsupported browser
  if (!isSupported) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-center text-zinc-300">
        <p className="text-sm">
          Your browser doesn&apos;t support recording. Please upload an audio
          file instead.
        </p>
      </div>
    );
  }

  // 16.6 — transcribing
  if (isTranscribing) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-zinc-400">Transcribing&hellip;</p>
      </div>
    );
  }

  // 16.7 — transcript ready
  if (transcript !== null) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-6">
        <h3 className="text-sm font-medium text-zinc-300">
          Review &amp; edit your transcript
        </h3>
        <textarea
          className="min-h-[160px] w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          aria-label="Transcript"
        />
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => onTranscriptConfirmed(transcript)}
          className="self-end rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Confirm &amp; Continue
        </button>
      </div>
    );
  }

  // Recording UI
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-6">
      {/* Error message */}
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}{" "}
          {error.toLowerCase().includes("microphone") && (
            <span className="text-zinc-400">
              You can{" "}
              <a href="#upload" className="underline text-indigo-400 hover:text-indigo-300">
                upload an audio file
              </a>{" "}
              instead.
            </span>
          )}
        </p>
      )}

      {/* Waveform + timer while recording */}
      {isRecording && (
        <>
          <WaveformVisualizer analyserNode={analyserNode} />
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Recording
            </span>
            <span className="font-mono tabular-nums">{formatTime(timeRemaining)}</span>
          </div>
        </>
      )}

      {/* Action button */}
      {!isRecording ? (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
            <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
          </svg>
          Start Recording
        </button>
      ) : (
        <button
          type="button"
          onClick={stopRecording}
          className="flex items-center justify-center gap-2 rounded-lg bg-zinc-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z"
              clipRule="evenodd"
            />
          </svg>
          Stop &amp; Continue
        </button>
      )}
    </div>
  );
}
