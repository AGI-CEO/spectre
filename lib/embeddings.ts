import { getGeminiClient } from "@/lib/gemini";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Generate an embedding vector for the given text using Gemini embedding.
 * Returns a 768-dimensional float array (MRL truncated from 3072).
 */
export async function embed(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: {
      outputDimensionality: 768,
    },
  });
  if (!response.embeddings || !response.embeddings[0]?.values) {
    throw new Error("Failed to generate embedding");
  }
  return response.embeddings[0].values;
}

/**
 * Find sessions similar to the given query embedding for a specific user,
 * using pgvector cosine distance (<=>).
 * Lower distance = more similar.
 */
export async function ragQuery(
  queryEmbedding: number[],
  userId: string,
  limit: number
): Promise<any[]> {
  const vectorStr = `[${queryEmbedding.join(",")}]`;
  const results = await db.execute(
    sql`SELECT * FROM sessions WHERE user_id = ${userId} ORDER BY embedding <=> ${vectorStr}::vector ASC LIMIT ${limit}`
  );
  return results.rows;
}
