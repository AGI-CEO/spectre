import { getGeminiClient } from "@/lib/gemini";
import type { ExtractedContext } from "@/lib/types";

const REQUIRED_FIELDS: (keyof ExtractedContext)[] = [
  "intent",
  "domain",
  "target_user_hints",
  "problem_hints",
  "constraints",
  "gaps",
  "confidence",
];

const SYSTEM_PROMPT = `You are a product analyst. Given this raw brain-dump transcript, extract the following as a JSON object. Return ONLY valid JSON, no markdown fences.

{
  "intent": "one sentence summary of what they want to build",
  "domain": "industry/category (e.g. developer tools, fintech, health)",
  "target_user_hints": ["array of any mentioned user types"],
  "problem_hints": ["array of any mentioned problems or pain points"],
  "constraints": ["platform, tech stack, time, or budget constraints mentioned"],
  "gaps": ["list of critical product questions NOT answered in the transcript"],
  "confidence": "low | medium | high"
}

Transcript:
{{transcript}}`;

export async function POST(req: Request) {
  // 1. Parse request body and validate transcript
  let transcript: string;
  try {
    const body = await req.json();
    transcript = body?.transcript;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!transcript || typeof transcript !== "string" || transcript.trim() === "") {
    return Response.json(
      { error: "Missing or empty required field: transcript" },
      { status: 400 }
    );
  }

  // 2. Build prompt by substituting the transcript
  const prompt = SYSTEM_PROMPT.replace("{{transcript}}", transcript);

  try {
    // 3. Call Gemini
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("Empty response from Gemini");
    }

    // 4. Strip accidental markdown fences and parse JSON
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse Gemini response as JSON: ${cleaned.slice(0, 200)}`);
    }

    // 5. Validate all required fields are present
    const missingFields = REQUIRED_FIELDS.filter(
      (field) => !(field in parsed) || parsed[field] === undefined || parsed[field] === null
    );
    if (missingFields.length > 0) {
      throw new Error(`Gemini response missing required fields: ${missingFields.join(", ")}`);
    }

    const context = parsed as unknown as ExtractedContext;

    // 6. Return success
    return Response.json({ context });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to extract context";
    console.error("extract-context error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
