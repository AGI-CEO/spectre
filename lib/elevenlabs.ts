import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

let _client: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  if (!_client) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY");
    _client = new ElevenLabsClient({ apiKey });
  }
  return _client;
}
