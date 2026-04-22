"use client";

import { useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";

interface FileUploadZoneProps {
  onTranscriptConfirmed: (transcript: string) => void;
}

const ACCEPTED_TYPES = {
  "audio/mpeg": [".mp3"],
  "audio/mp4": [".m4a"],
  "audio/wav": [".wav"],
  "audio/webm": [".webm"],
};

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export default function FileUploadZone({
  onTranscriptConfirmed,
}: FileUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Transcription failed (HTTP ${res.status})`
        );
      }

      const data = await res.json();
      setTranscript(data.transcript ?? "");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Transcription failed. Please try again.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
    onDrop(acceptedFiles, rejectedFiles: FileRejection[]) {
      setError(null);

      if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0].errors[0];
        if (firstError?.code === "file-too-large") {
          setError(
            "File exceeds the 50 MB size limit. Please use a smaller file."
          );
        } else if (firstError?.code === "file-invalid-type") {
          setError(
            "Unsupported format. Please upload an .mp3, .m4a, .wav, or .webm file."
          );
        } else {
          setError("File could not be accepted. Please try a different file.");
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        uploadFile(acceptedFiles[0]);
      }
    },
  });

  // Uploading state
  if (isUploading) {
    return (
      <div
        id="upload"
        className="flex flex-col items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-8"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-zinc-400">Uploading &amp; transcribing&hellip;</p>
      </div>
    );
  }

  // Transcript ready
  if (transcript !== null) {
    return (
      <div
        id="upload"
        className="flex flex-col gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-6"
      >
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

  // Dropzone UI
  return (
    <div id="upload" className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={[
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition",
          isDragActive
            ? "border-indigo-500 bg-indigo-950/30 text-indigo-300"
            : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300",
        ].join(" ")}
        role="button"
        aria-label="Upload audio file"
      >
        <input {...getInputProps()} />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-8 w-8 opacity-60"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M11.47 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06l-3.22-3.22V16.5a.75.75 0 0 1-1.5 0V4.81L8.03 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5Z"
            clipRule="evenodd"
          />
          <path d="M3 15.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5H6.31l-.97 3.462a.75.75 0 0 1-1.44-.404L4.94 16.5H3.75a.75.75 0 0 1-.75-.75ZM20.25 15a.75.75 0 0 1 .75.75v.75h-1.19l1.05 3.558a.75.75 0 0 1-1.44.404L18.44 16.5h-2.69a.75.75 0 0 1 0-1.5h4.5Z" />
        </svg>
        {isDragActive ? (
          <p className="text-sm font-medium">Drop your audio file here</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Drag &amp; drop an audio file, or{" "}
              <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-xs opacity-60">
              .mp3, .m4a, .wav, .webm &mdash; max 50 MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
