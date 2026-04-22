CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"braindump_transcript" text,
	"extracted_context" jsonb,
	"interview_transcript" jsonb,
	"prd_markdown" text,
	"kiro_requirements" text,
	"kiro_design" text,
	"kiro_tasks" text,
	"brainstorm_transcript" jsonb,
	"research_report" jsonb,
	"context_steering_file" text,
	"audience_steering_file" text,
	"seed_requirements_file" text,
	"embedding" vector(768),
	"created_at" timestamp DEFAULT now()
);
