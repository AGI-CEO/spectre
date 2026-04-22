import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
  }

  try {
    const client = new ElevenLabsClient({ apiKey });

    const formData = await req.formData();
    const audioBlob = formData.get("audio") as Blob;

    if (!audioBlob) {
      return Response.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Convert Blob to File with proper name and type
    const file = new File([audioBlob], "recording.webm", { type: "audio/webm" });

    const transcription = await client.speechToText.convert({
      file: file,
      modelId: "scribe_v2",
      languageCode: "eng",
      timestampsGranularity: "word",
    });

    return Response.json({ 
      transcript: transcription.text || "", 
      words: transcription.words || [] 
    });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return Response.json({ error: error.message || "Failed to transcribe audio" }, { status: 500 });
  }
}
