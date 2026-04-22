import { type NextRequest } from "next/server";
import { embed, ragQuery } from "@/lib/embeddings";
import type { ExtractedContext } from "@/lib/types";

const EMPTY_PATTERNS = {
  stackPreferences: [] as string[],
  commonAudiences: [] as string[],
  recurringConstraints: [] as string[],
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");
  const userId = searchParams.get("userId") ?? "";

  // 1. Validate required param
  if (!query || query.trim() === "") {
    return Response.json(
      { error: "Missing or empty required parameter: query" },
      { status: 400 }
    );
  }

  // 2. Embed + RAG query — on failure return empty patterns (no 500)
  let results: Record<string, unknown>[];
  try {
    const embedding = await embed(query);
    results = (await ragQuery(embedding, userId, 3)) as Record<string, unknown>[];
  } catch (error) {
    console.error("past-sessions: embed/ragQuery failed:", error);
    return Response.json(
      { patterns: EMPTY_PATTERNS, sessionCount: 0 },
      { status: 200 }
    );
  }

  // 3. Extract patterns from returned sessions
  const stackPreferences: string[] = [];
  const commonAudiences: string[] = [];
  const recurringConstraints: string[] = [];

  for (const row of results) {
    // DB column is snake_case: extracted_context
    const raw = row["extracted_context"];
    if (!raw || typeof raw !== "object") continue;

    const ctx = raw as ExtractedContext;

    if (Array.isArray(ctx.constraints)) {
      for (const c of ctx.constraints) {
        if (typeof c === "string" && c.trim()) {
          // constraints feed both stackPreferences and recurringConstraints
          if (!recurringConstraints.includes(c)) recurringConstraints.push(c);
          // Heuristic: treat constraints that mention tech/stack keywords as stackPreferences
          if (
            /\b(react|vue|angular|next|nuxt|node|python|django|rails|java|kotlin|swift|flutter|typescript|javascript|postgres|mysql|mongodb|redis|aws|gcp|azure|docker|kubernetes|graphql|rest|api|mobile|ios|android|web|frontend|backend|fullstack|serverless)\b/i.test(
              c
            ) &&
            !stackPreferences.includes(c)
          ) {
            stackPreferences.push(c);
          }
        }
      }
    }

    if (Array.isArray(ctx.target_user_hints)) {
      for (const hint of ctx.target_user_hints) {
        if (typeof hint === "string" && hint.trim() && !commonAudiences.includes(hint)) {
          commonAudiences.push(hint);
        }
      }
    }
  }

  return Response.json({
    patterns: { stackPreferences, commonAudiences, recurringConstraints },
    sessionCount: results.length,
  });
}
