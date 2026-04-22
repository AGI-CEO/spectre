"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import JSZip from "jszip";
import type { ResearchReport } from "@/lib/types";

export interface HandoffViewerProps {
  sessionId: number;
  sessionDate: string;
  productName: string;
  contextSteeringFile: string;
  audienceSteeringFile: string;
  seedRequirementsFile?: string;
  researchReport: ResearchReport;
  featureName: string;
}

type TabId = "context" | "audience" | "requirements";

interface FileTab {
  id: TabId;
  label: string;
  filename: string;
  content: string;
}

export default function HandoffViewer({
  sessionId,
  sessionDate,
  productName,
  contextSteeringFile,
  audienceSteeringFile,
  seedRequirementsFile,
  researchReport,
  featureName,
}: HandoffViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("context");
  const [editedFiles, setEditedFiles] = useState<Record<TabId, string>>({
    context: contextSteeringFile,
    audience: audienceSteeringFile,
    requirements: seedRequirementsFile || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const tabs: FileTab[] = [
    {
      id: "context",
      label: "Project Context",
      filename: "project-context.md",
      content: editedFiles.context,
    },
    {
      id: "audience",
      label: "Product Audience",
      filename: "product-audience.md",
      content: editedFiles.audience,
    },
  ];

  if (seedRequirementsFile) {
    tabs.push({
      id: "requirements",
      label: "Seed Requirements",
      filename: "requirements.md",
      content: editedFiles.requirements,
    });
  }

  const activeTabData = tabs.find((tab) => tab.id === activeTab)!;

  // Handle file content editing
  function handleEdit(tabId: TabId, newContent: string) {
    setEditedFiles((prev) => ({ ...prev, [tabId]: newContent }));
    setSaveSuccess(false);
  }

  // Save changes to server
  async function handleSaveChanges() {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/save-session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextSteeringFile: editedFiles.context,
          audienceSteeringFile: editedFiles.audience,
          seedRequirementsFile: editedFiles.requirements || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // Copy file content to clipboard
  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      alert("Copied to clipboard!");
    } catch (error) {
      console.error("Copy error:", error);
      alert("Failed to copy to clipboard");
    }
  }

  // Download individual file
  function handleDownloadFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Download full Kiro bundle as zip
  async function handleDownloadBundle() {
    const zip = new JSZip();

    // Add steering files
    zip.file(".kiro/steering/project-context.md", editedFiles.context);
    zip.file(".kiro/steering/product-audience.md", editedFiles.audience);

    // Add seed requirements if present
    if (editedFiles.requirements) {
      zip.file(`.kiro/specs/${featureName}/requirements.md`, editedFiles.requirements);
    }

    // Add optional Kiro hook
    const hookJson = {
      name: "SpecDraft Project Context",
      version: "1.0.0",
      description: "Automatically loads SpecDraft-generated project context at session start",
      when: {
        type: "promptSubmit",
      },
      then: {
        type: "askAgent",
        prompt:
          "Before responding, read and internalize the project context in .kiro/steering/project-context.md and .kiro/steering/product-audience.md. These files contain validated product decisions, domain knowledge, and target audience profiles that should inform all your responses.",
      },
    };
    zip.file(".kiro/hooks/specdraft-context.json", JSON.stringify(hookJson, null, 2));

    // Generate and download zip
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `specdraft-${featureName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const competitorCount = researchReport.competitors.length;
  const audienceSegmentCount = researchReport.targetAudience.length;
  const resolvedGapCount = researchReport.resolvedGaps.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Session summary card */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xl font-semibold text-zinc-100">{productName}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-zinc-500">Session Date</p>
            <p className="font-medium text-zinc-300">{new Date(sessionDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-zinc-500">Competitors</p>
            <p className="font-medium text-zinc-300">{competitorCount}</p>
          </div>
          <div>
            <p className="text-zinc-500">Audience Segments</p>
            <p className="font-medium text-zinc-300">{audienceSegmentCount}</p>
          </div>
          <div>
            <p className="text-zinc-500">Resolved Gaps</p>
            <p className="font-medium text-zinc-300">{resolvedGapCount}</p>
          </div>
        </div>
      </div>

      {/* Tabbed file viewer */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900">
        {/* Tab headers */}
        <div className="flex gap-2 border-b border-zinc-700 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">{activeTabData.filename}</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCopy(activeTabData.content)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => handleDownloadFile(activeTabData.filename, activeTabData.content)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Download
              </button>
            </div>
          </div>

          {/* Editable textarea */}
          <textarea
            value={activeTabData.content}
            onChange={(e) => handleEdit(activeTab, e.target.value)}
            className="mb-4 h-96 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-4 font-mono text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            spellCheck={false}
          />

          {/* Markdown preview */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <h4 className="mb-2 text-xs font-medium text-zinc-500">Preview</h4>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{activeTabData.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* Export toolbar */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
          {saveSuccess && (
            <span className="text-sm text-green-400">✓ Changes saved</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleDownloadBundle}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          Download Kiro Bundle
        </button>
      </div>
    </div>
  );
}
