import { pgTable, serial, text, timestamp, jsonb, vector } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  braindumpTranscript: text("braindump_transcript"),
  extractedContext: jsonb("extracted_context"),
  interviewTranscript: jsonb("interview_transcript"),
  prdMarkdown: text("prd_markdown"),
  kiroRequirements: text("kiro_requirements"),
  kiroDesign: text("kiro_design"),
  kiroTasks: text("kiro_tasks"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow(),
});
