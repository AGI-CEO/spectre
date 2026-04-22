"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import JSZip from "jszip";

// ── Types ────────────────────────────────────────────────────────────────────

interface PRDViewerProps {
  prdMarkdown: string;
  kiroRequirements: string;
  kiroDesign: string;
  kiroTasks: string;
  featureName: string;
  sessionId: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PRDViewer({
  prdMarkdown,
  kiroRequirements,
  kiroDesign,
  kiroTasks,
  featureName,
  sessionId,
}: PRDViewerProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [editedMarkdown, setEditedMarkdown] = useState(prdMarkdown);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // 21.4 — Download PRD as .md file
  function handleDownloadPRD() {
    downloadFile(editedMarkdown, `prd-${sessionId}.md`, "text/markdown");
  }

  // 21.5 — Copy to clipboard with 2-second confirmation
  async function handleCopyToClipboard() {
    try {
      await navigator.clipboard.writeText(editedMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  }

  // 21.6 — Download Kiro Spec Bundle as .zip
  async function handleDownloadKiroBundle() {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const specDir = `.kiro/specs/${featureName}`;

      // 21.6.2 – 21.6.5: add files to zip
      zip.file(`${specDir}/requirements.md`, kiroRequirements);
      zip.file(`${specDir}/design.md`, kiroDesign);
      zip.file(`${specDir}/tasks.md`, kiroTasks);
      zip.file(
        `${specDir}/.config.kiro`,
        JSON.stringify(
          {
            specId: crypto.randomUUID(),
            workflowType: "requirements-first",
            specType: "feature",
          },
          null,
          2
        )
      );

      // 21.6.6: generate and trigger download
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kiro-spec-${featureName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate Kiro spec bundle:", err);
    } finally {
      setIsZipping(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Export toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
        <span className="mr-auto text-sm font-medium text-zinc-300">
          Export
        </span>

        {/* Download PRD */}
        <button
          type="button"
          onClick={handleDownloadPRD}
          className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
          Download PRD
        </button>

        {/* Copy to Clipboard */}
        <button
          type="button"
          onClick={handleCopyToClipboard}
          className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {copied ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-emerald-400"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
                <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
              </svg>
              Copy to Clipboard
            </>
          )}
        </button>

        {/* Download Kiro Spec Bundle */}
        <button
          type="button"
          onClick={handleDownloadKiroBundle}
          disabled={isZipping}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isZipping ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden="true"
              />
              Packaging…
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
                  clipRule="evenodd"
                />
              </svg>
              Download Kiro Spec Bundle
            </>
          )}
        </button>
      </div>

      {/* ── Tab switcher ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            activeTab === "preview"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            activeTab === "edit"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Edit
        </button>
      </div>

      {/* ── Preview tab (21.2) ──────────────────────────────────────────────── */}
      {activeTab === "preview" && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 md:p-8">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="mb-4 mt-8 text-3xl font-bold text-zinc-100 first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-3 mt-6 text-2xl font-semibold text-zinc-100">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-2 mt-5 text-xl font-semibold text-zinc-200">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-4 leading-7 text-zinc-300">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-4 list-disc pl-6 text-zinc-300">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-4 list-decimal pl-6 text-zinc-300">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="mb-1 leading-7">{children}</li>
              ),
              table: ({ children }) => (
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full border-collapse text-sm text-zinc-300">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-zinc-700 bg-zinc-800 px-4 py-2 text-left font-semibold text-zinc-200">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-zinc-700 px-4 py-2">{children}</td>
              ),
              code: ({ children }) => (
                <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-sm text-indigo-300">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="mb-4 overflow-x-auto rounded-lg bg-zinc-800 p-4 font-mono text-sm text-zinc-300">
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="mb-4 border-l-4 border-indigo-500 pl-4 text-zinc-400 italic">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-6 border-zinc-700" />,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-indigo-400 underline hover:text-indigo-300"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {editedMarkdown}
          </ReactMarkdown>
        </div>
      )}

      {/* ── Edit tab (21.3) ─────────────────────────────────────────────────── */}
      {activeTab === "edit" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500">
            Edit the PRD markdown directly. Changes are reflected in all export
            actions above.
          </p>
          <textarea
            value={editedMarkdown}
            onChange={(e) => setEditedMarkdown(e.target.value)}
            aria-label="PRD markdown editor"
            spellCheck={false}
            className="min-h-[600px] w-full rounded-xl border border-zinc-700 bg-zinc-900 p-6 font-mono text-sm leading-7 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}
    </div>
  );
}
