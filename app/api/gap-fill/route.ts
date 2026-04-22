import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: Request) {
  // 1. Parse request body
  let gap: string;
  let domain: string;
  let intent: string;

  try {
    const body = await request.json();
    gap = body?.gap;
    domain = body?.domain;
    intent = body?.intent;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 2. Validate required fields
  if (!gap || typeof gap !== "string" || gap.trim() === "") {
    return Response.json(
      { error: "Missing or empty required field: gap" },
      { status: 400 }
    );
  }
  if (!domain || typeof domain !== "string" || domain.trim() === "") {
    return Response.json(
      { error: "Missing or empty required field: domain" },
      { status: 400 }
    );
  }
  if (!intent || typeof intent !== "string" || intent.trim() === "") {
    return Response.json(
      { error: "Missing or empty required field: intent" },
      { status: 400 }
    );
  }

  // 3. Build prompt
  const prompt = `You are a product research assistant. A product manager is building a product in the "${domain}" space and needs help answering this question: "${gap}"

Search for: "${domain} ${gap} best practices"

Based on your research, provide a single confident, actionable suggested answer (2-4 sentences). Focus on what similar products in this space typically do. Be specific and practical.

Context: The product intent is: "${intent}"`;

  try {
    // 4. Call Gemini with Google Search grounding
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // 5. Extract text from response
    const suggestion = response.text;
    if (!suggestion) {
      throw new Error("Empty response from Gemini");
    }

    // 6. Return success
    return Response.json({ suggestion: suggestion.trim() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate suggestion";
    console.error("gap-fill error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
