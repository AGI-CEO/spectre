import { getGeminiClient } from "@/lib/gemini";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Generate an embedding vector for the given text using Gemini text-embedding-004.
 * Returns a 768-dimensional float array.
 */
export async function embed(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: text,
  });
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
