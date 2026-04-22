import { getElevenLabsClient } from "@/lib/elevenlabs";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
  }

  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) {
    return Response.json({ error: "Missing ELEVENLABS_AGENT_ID" }, { status: 500 });
  }

  try {
    const client = getElevenLabsClient();
    const result = await client.conversationalAi.conversations.getSignedUrl({
      agentId,
    });
    return Response.json({ signedUrl: result.signedUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get agent token";
    console.error("Agent token error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
