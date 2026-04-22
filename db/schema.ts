import { pgTable, serial, text, timestamp, jsonb, vector } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  
  // v1 columns (keep for backward compatibility)
  braindumpTranscript: text("braindump_transcript"),
  extractedContext: jsonb("extracted_context"),
  interviewTranscript: jsonb("interview_transcript"),      // deprecated in v2
  prdMarkdown: text("prd_markdown"),                       // deprecated in v2
  kiroRequirements: text("kiro_requirements"),             // deprecated in v2
  kiroDesign: text("kiro_design"),                         // deprecated in v2
  kiroTasks: text("kiro_tasks"),                           // deprecated in v2
  
  // v2 columns (new)
  brainstormTranscript: jsonb("brainstorm_transcript"),    // BrainstormMessage[]
  researchReport: jsonb("research_report"),                // ResearchReport object
  contextSteeringFile: text("context_steering_file"),      // project-context.md content
  audienceSteeringFile: text("audience_steering_file"),    // product-audience.md content
  seedRequirementsFile: text("seed_requirements_file"),    // optional requirements.md
  
  // Shared
  embedding: vector("embedding", { dimensions: 768 }),     // Gemini text-embedding-004
  createdAt: timestamp("created_at").defaultNow(),
});
