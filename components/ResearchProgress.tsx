"use client";

import { useEffect, useState } from "react";

export interface ResearchProgressProps {
  isResearching: boolean;
  completedDimensions?: string[];
}

const RESEARCH_DIMENSIONS = [
  "Competitor Analysis",
  "Target Audience Profiling",
  "Market Sizing",
  "Architecture Recommendations",
];

export default function ResearchProgress({
  isResearching,
  completedDimensions = [],
}: ResearchProgressProps) {
  const [currentDimension, setCurrentDimension] = useState(0);

  // Animate through dimensions while researching
  useEffect(() => {
    if (!isResearching) return;

    const interval = setInterval(() => {
      setCurrentDimension((prev) => (prev + 1) % RESEARCH_DIMENSIONS.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isResearching]);

  if (!isResearching && completedDimensions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-6">
      <div className="flex items-center gap-3">
        {isResearching && (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        )}
        <h3 className="text-lg font-medium text-zinc-100">
          {isResearching ? "Running Background Research…" : "Research Complete"}
        </h3>
      </div>

      {isResearching && (
        <p className="text-sm text-zinc-400">
          Currently processing: <span className="font-medium text-indigo-400">{RESEARCH_DIMENSIONS[currentDimension]}</span>
        </p>
      )}

      <div className="flex flex-col gap-2">
        {RESEARCH_DIMENSIONS.map((dimension, index) => {
          const isCompleted = completedDimensions.includes(dimension);
          const isCurrent = isResearching && index === currentDimension;

          return (
            <div
              key={dimension}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition ${
                isCompleted
                  ? "border-green-700 bg-green-950"
                  : isCurrent
                  ? "border-indigo-700 bg-indigo-950"
                  : "border-zinc-700 bg-zinc-800"
              }`}
            >
              {/* Status icon */}
              <div className="flex h-6 w-6 items-center justify-center">
                {isCompleted ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5 text-green-400"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : isCurrent ? (
                  <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-zinc-600" />
                )}
              </div>

              {/* Dimension name */}
              <span
                className={`text-sm font-medium ${
                  isCompleted
                    ? "text-green-300"
                    : isCurrent
                    ? "text-indigo-300"
                    : "text-zinc-400"
                }`}
              >
                {dimension}
              </span>
            </div>
          );
        })}
      </div>

      {!isResearching && (
        <p className="text-sm text-zinc-500">
          Research completed in {completedDimensions.length} of {RESEARCH_DIMENSIONS.length} dimensions.
        </p>
      )}
    </div>
  );
}
