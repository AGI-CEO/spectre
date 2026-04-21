import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function POST(req: Request) {
  try {
    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY || "" });

    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;

    if (!audioFile) {
      return Response.json({ error: "No audio file provided" }, { status: 400 });
    }

    const transcription = await client.speechToText.convert({
      file: audioFile,
      model_id: "scribe_v2",
      tag_audio_events: true,
      language_code: "eng",
      diarize: false,
    } as any); // using mapped names to be safe against both camelCase and snake_case API mappings

    return Response.json({ transcript: (transcription as any).text, words: (transcription as any).words });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return Response.json({ error: error.message || "Failed to transcribe audio" }, { status: 500 });
  }
}
