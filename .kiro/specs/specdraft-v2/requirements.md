# Requirements Document — SpecDraft v2

## Introduction

SpecDraft v2 is a voice-first AI brainstorm copilot built specifically for Kiro users. The user speaks freely about their product idea; an ElevenLabs ConvAI 2.0 agent steers the conversation following startup and product best practices; and after the conversation ends, automated background research fills any gaps the user could not answer. The output is not a PRD — it is a set of Kiro steering files and rich project context that makes every future Kiro session on that project smarter from day one.

The core pivot from v1: instead of generating `requirements.md`, `design.md`, and `tasks.md` (which Kiro's own spec mode already produces), SpecDraft v2 generates the inputs that Kiro *cannot* produce for itself from a voice conversation — domain knowledge, startup-validated product decisions, competitive landscape, target audience profiles, and project-specific steering rules.

The existing scaffold (Next.js 16, React 19, Tailwind 4, ElevenLabs Scribe v2 + ConvAI 2.0, Google Gemini via `@google/genai`, NeonDB + pgvector + Drizzle ORM) is reused and extended. Existing API routes (`/api/transcribe`, `/api/agent-token`, `/api/gap-fill`, `/api/extract-context`) and components (`BraindumpRecorder`, `WaveformVisualizer`, `FileUploadZone`, `InterviewAgent`) are preserved and adapted.

---

## Glossary

- **App**: The SpecDraft v2 Next.js application.
- **Session**: A single end-to-end run from brain-dump intake through Kiro handoff, persisted as one row in the `sessions` table.
- **Brain_Dump**: The user's initial free-form audio recording or uploaded audio file describing their product idea.
- **Transcript**: The text output produced by ElevenLabs Scribe v2 from a Brain_Dump audio input.
- **Extracted_Context**: A structured JSON object derived from the Transcript by Gemini, containing intent, domain, target user hints, problem hints, constraints, gaps, and confidence level.
- **Brainstorm_Agent**: The ElevenLabs ConvAI 2.0 conversational agent that conducts a startup-methodology-guided voice brainstorm using Extracted_Context as dynamic variables.
- **Gap**: A critical product or market question that was not answered during the Brain_Dump or brainstorm conversation.
- **Background_Research**: An automated post-conversation pipeline that performs competitor analysis, target audience profiling, and market sizing to fill Gaps without interrupting the user's flow state.
- **Research_Report**: The structured JSON output of the Background_Research pipeline, containing competitor data, audience profiles, market size estimates, and architecture recommendations.
- **Steering_File**: A Markdown file placed in `.kiro/steering/` that Kiro reads automatically to inform every agent session on a project.
- **Context_Steering_File**: A Steering_File containing project domain knowledge, startup-validated product decisions, and architecture recommendations. Filename: `project-context.md`.
- **Audience_Steering_File**: A Steering_File containing target audience profiles, competitive landscape, and product positioning. Filename: `product-audience.md`.
- **Seed_Requirements_File**: An optional `requirements.md` file placed in `.kiro/specs/{feature-name}/` that Kiro can refine further in spec mode.
- **Handoff_Bundle**: A downloadable `.zip` archive containing all generated Steering_Files and optionally the Seed_Requirements_File, structured for direct drop-in to a user's project.
- **Kiro_Hook**: A Kiro agent hook definition (JSON) that, when placed in a project, automatically applies the Handoff_Bundle contents when a Kiro session starts.
- **Gemini**: Google's Gemini LLM family, accessed via `@google/genai`, used for context extraction, research synthesis, and steering file generation.
- **ElevenLabs**: The third-party service providing Scribe v2 STT and ConvAI 2.0 voice agent capabilities.
- **Recorder**: The browser-side `MediaRecorder`-based component (`BraindumpRecorder`) that captures live microphone audio.
- **Upload_Zone**: The drag-and-drop file upload component (`FileUploadZone`) that accepts `.mp3`, `.m4a`, `.wav`, and `.webm` audio files.
- **Waveform_Visualizer**: The UI component that renders a live audio waveform during recording.
- **Handoff_Viewer**: The new UI component that displays generated Steering_Files with preview, copy, and download controls.
- **RAG**: Retrieval-Augmented Generation — querying past Session embeddings via cosine similarity to pre-fill context for new sessions.

---

## Requirements

### Requirement 1: Landing Page & Session Entry

**User Story:** As a technical founder with a product idea, I want a clear entry point that communicates SpecDraft v2's value and lets me start a brainstorm immediately, so that I can begin talking about my idea without friction.

#### Acceptance Criteria

1. THE App SHALL render a landing page at `/` that communicates the value proposition: voice-first brainstorm → background research → Kiro steering files.
2. WHEN the user clicks the primary call-to-action, THE App SHALL navigate to the brain-dump intake step without a full page reload.
3. THE App SHALL display the three-step flow (Brain-Dump → Brainstorm → Kiro Handoff) visually so the user understands the process before starting.
4. THE App SHALL update the `<title>` and `<meta description>` in `app/layout.tsx` to reflect the SpecDraft v2 product name and purpose.

---

### Requirement 2: Brain-Dump Audio Intake

**User Story:** As a founder, I want to record or upload a voice note describing my idea, so that I can start the brainstorm from a natural brain-dump rather than a blank form.

#### Acceptance Criteria

1. WHEN the user activates the record button, THE Recorder SHALL capture microphone audio using the `MediaRecorder` Web API with `audio/webm` MIME type.
2. WHILE recording is active, THE Waveform_Visualizer SHALL render a live waveform using the Web Audio API `AnalyserNode`.
3. WHILE recording is active, THE Recorder SHALL enforce a maximum recording duration of 10 minutes and automatically stop when that limit is reached.
4. WHEN the user clicks "Stop & Continue", THE Recorder SHALL stop capturing audio and submit the recorded blob to `/api/transcribe` via a `multipart/form-data` POST request with the field name `audio`.
5. THE Upload_Zone SHALL accept audio files via drag-and-drop and via a file input button, accepting only `.mp3`, `.m4a`, `.wav`, and `.webm` files up to 50 MB.
6. IF the user selects a file exceeding 50 MB, THEN THE Upload_Zone SHALL reject the file and display an error message stating the size limit before any upload begins.
7. IF the user's browser does not support `MediaRecorder`, THEN THE App SHALL display a message directing the user to the file upload option.
8. IF microphone permission is denied, THEN THE Recorder SHALL display an error message and offer the file upload alternative.

---

### Requirement 3: Speech-to-Text Transcription

**User Story:** As a founder, I want my audio automatically transcribed, so that the brainstorm agent has text context to work with before the conversation begins.

#### Acceptance Criteria

1. THE App SHALL expose a `POST /api/transcribe` route that accepts a `multipart/form-data` request containing an `audio` field.
2. WHEN a valid audio blob is received, THE App SHALL call ElevenLabs Scribe v2 with `model_id: "scribe_v2"`, `language_code: "eng"`, `tag_audio_events: true`, and `diarize: false`.
3. WHEN transcription succeeds, THE App SHALL return a JSON response containing `transcript` (full text string) and `words` (word-level timing array).
4. IF no `audio` field is present in the request, THEN THE App SHALL return HTTP 400 with a JSON error body.
5. IF the ElevenLabs API returns an error, THEN THE App SHALL return HTTP 500 with a JSON error body containing the upstream error message.
6. WHEN transcription completes, THE App SHALL display the Transcript text in the UI and allow the user to edit it before advancing to the brainstorm step.

---

### Requirement 4: LLM Context Extraction

**User Story:** As a founder, I want the app to automatically extract structured signals from my transcript, so that the brainstorm agent can skip what I already covered and focus on genuine gaps.

#### Acceptance Criteria

1. THE App SHALL expose a `POST /api/extract-context` route that accepts a JSON body containing a `transcript` string.
2. WHEN a Transcript is received, THE App SHALL call Gemini with a prompt instructing it to extract a JSON object with the fields: `intent`, `domain`, `target_user_hints`, `problem_hints`, `constraints`, `gaps`, and `confidence`.
3. WHEN extraction succeeds, THE App SHALL return the Extracted_Context JSON object to the caller.
4. IF the Gemini API returns an error, THEN THE App SHALL return HTTP 500 with a descriptive error message.
5. THE App SHALL store the Extracted_Context in session state and pass it as dynamic variables to the Brainstorm_Agent.

---

### Requirement 5: Startup-Methodology Brainstorm Agent

**User Story:** As a founder, I want a voice AI agent that steers my brainstorm using startup best practices, so that I think through the right dimensions of my idea without needing a co-founder or product coach.

#### Acceptance Criteria

1. THE App SHALL expose a `GET /api/agent-token` route that generates and returns a signed ElevenLabs ConvAI URL, keeping `ELEVENLABS_API_KEY` server-side only.
2. WHEN the brainstorm screen loads, THE App SHALL fetch the signed URL from `/api/agent-token` and initialise the Brainstorm_Agent using the `useConversation` hook from `@elevenlabs/react`.
3. WHEN the Brainstorm_Agent session starts, THE App SHALL inject `transcript_summary`, `extracted_intent`, `domain`, and `gaps` as dynamic variables into the agent's system prompt.
4. WHILE the brainstorm is active, THE Brainstorm_Agent SHALL ask one question at a time, covering: target user (who specifically and their pain), core problem (frequency and severity), success definition (what winning looks like in 30 and 90 days), platform and technical constraints, competitive awareness, and non-negotiables.
5. WHILE the brainstorm is active, THE Brainstorm_Agent SHALL skip any topic already clearly addressed in the Extracted_Context.
6. WHEN the user says "I don't know" or an equivalent phrase, THE Brainstorm_Agent SHALL acknowledge the response, flag the topic as a Gap for Background_Research, and move to the next question without dwelling on the unknown.
7. WHEN the user indicates they are done or ready to proceed, THE Brainstorm_Agent SHALL end the session gracefully and trigger the Background_Research pipeline.
8. WHERE a text chat fallback is needed, THE App SHALL render a text input that sends messages to the Brainstorm_Agent and displays agent responses as text.
9. IF the signed URL request fails, THEN THE App SHALL display an error message and activate the text chat fallback automatically.
10. THE Brainstorm_Agent system prompt SHALL be grounded in startup product methodology: Jobs-to-be-Done framing, problem-before-solution discipline, and evidence-based success metrics.

---

### Requirement 6: Post-Conversation Background Research

**User Story:** As a founder, I want the app to automatically research competitors, target audiences, and market size after our conversation, so that my Kiro steering files contain validated context I couldn't have provided myself.

#### Acceptance Criteria

1. WHEN the brainstorm conversation ends, THE App SHALL automatically initiate the Background_Research pipeline without requiring user action.
2. THE App SHALL display a progress indicator during Background_Research so the user knows work is happening.
3. WHEN Background_Research begins, THE App SHALL identify all Gaps flagged during the brainstorm conversation plus any standard research dimensions not covered: competitor landscape, target audience profile, market size estimate, and technology stack recommendations.
4. FOR EACH research dimension, THE App SHALL call Gemini with a prompt that synthesises available context (Transcript, Extracted_Context, brainstorm Q&A) and any web-search results to produce a structured finding.
5. THE App SHALL expose a `POST /api/gap-fill` route that accepts a JSON body containing `gap`, `domain`, and `intent` fields and returns a synthesised suggestion.
6. WHEN all research dimensions are complete, THE App SHALL assemble the findings into a Research_Report JSON object containing: `competitors` (array of `{name, positioning, differentiator}`), `targetAudience` (array of `{segment, painPoints, jobsToBeDone}`), `marketSize` (object with `tam`, `sam`, `som` estimates and sources), `architectureRecommendations` (array of `{concern, recommendation, rationale}`), and `resolvedGaps` (array of `{gap, finding, confidence}`).
7. IF a web search or Gemini call fails for a specific research dimension, THEN THE App SHALL mark that dimension as `unresolved` in the Research_Report and continue processing remaining dimensions.
8. THE Background_Research pipeline SHALL complete within 60 seconds for a typical session; IF it exceeds 60 seconds, THEN THE App SHALL surface partial results and allow the user to proceed.

---

### Requirement 7: Kiro Context Steering File Generation

**User Story:** As a Kiro user, I want a steering file containing my project's domain knowledge and validated product decisions, so that every Kiro agent session on my project starts with full context.

#### Acceptance Criteria

1. WHEN the Research_Report is complete, THE App SHALL generate a Context_Steering_File (`project-context.md`) using Gemini.
2. THE Context_Steering_File SHALL include the following sections: Project Overview (one-paragraph summary of the product and its purpose), Domain Knowledge (key concepts, terminology, and constraints specific to the product's domain), Validated Product Decisions (decisions made during the brainstorm with the rationale and any research backing), Architecture Recommendations (technology choices and structural guidance derived from the Research_Report), and Kiro Conventions (project-specific rules for how Kiro should behave when working on this project, e.g. preferred patterns, naming conventions, out-of-scope areas).
3. THE Context_Steering_File SHALL begin with a YAML front-matter block containing `inclusion: always` so Kiro automatically includes it in every agent session.
4. THE Context_Steering_File SHALL be written in clear, directive prose that an AI agent can act on directly — not marketing language.
5. IF the Research_Report contains `unresolved` dimensions, THEN THE Context_Steering_File SHALL note those gaps explicitly so Kiro knows what is unknown.

---

### Requirement 8: Kiro Audience Steering File Generation

**User Story:** As a Kiro user, I want a steering file containing my target audience profiles and competitive landscape, so that Kiro generates features and copy that are grounded in real user needs.

#### Acceptance Criteria

1. WHEN the Research_Report is complete, THE App SHALL generate an Audience_Steering_File (`product-audience.md`) using Gemini.
2. THE Audience_Steering_File SHALL include the following sections: Target Audience (structured profiles for each audience segment identified in the Research_Report, each with segment name, pain points, jobs-to-be-done, and willingness-to-pay signal), Competitive Landscape (a summary of each competitor from the Research_Report with their positioning and key differentiator), Product Positioning (a one-sentence positioning statement derived from the brainstorm and research), and Anti-Personas (user types the product is explicitly NOT built for, to prevent scope creep).
3. THE Audience_Steering_File SHALL begin with a YAML front-matter block containing `inclusion: always`.
4. THE Audience_Steering_File SHALL be written so that Kiro can use it to make product decisions — e.g. when generating UI copy, API design, or feature prioritisation.

---

### Requirement 9: Optional Seed Requirements File

**User Story:** As a Kiro user, I want an optional starting requirements.md that Kiro can refine in spec mode, so that I have a head start on the formal spec without duplicating the brainstorm work.

#### Acceptance Criteria

1. WHERE the user opts in to generating a Seed_Requirements_File, THE App SHALL generate a `requirements.md` using Gemini, structured according to EARS patterns and INCOSE quality rules.
2. THE Seed_Requirements_File SHALL be placed at `.kiro/specs/{feature-name}/requirements.md` within the Handoff_Bundle.
3. THE Seed_Requirements_File SHALL include a header note stating it was generated by SpecDraft v2 and is intended as a starting point for Kiro spec mode refinement.
4. THE Seed_Requirements_File SHALL derive the `{feature-name}` slug from the session's `intent` field converted to kebab-case.
5. IF the `intent` field is empty or cannot be slugified, THEN THE App SHALL use `my-feature` as the default `{feature-name}`.
6. THE Seed_Requirements_File SHALL NOT duplicate content already present in the Steering_Files; it SHALL focus on functional requirements and acceptance criteria only.

---

### Requirement 10: Kiro Handoff Bundle Assembly & Export

**User Story:** As a Kiro user, I want to download a bundle of files I can drop directly into my project, so that I can start a Kiro session with full context immediately.

#### Acceptance Criteria

1. WHEN all Steering_Files are generated, THE App SHALL assemble a Handoff_Bundle as a `.zip` archive.
2. THE Handoff_Bundle SHALL contain: `.kiro/steering/project-context.md` (Context_Steering_File), `.kiro/steering/product-audience.md` (Audience_Steering_File), and optionally `.kiro/specs/{feature-name}/requirements.md` (Seed_Requirements_File) if the user opted in.
3. WHEN the user clicks "Download Kiro Bundle", THE App SHALL trigger a browser download of the Handoff_Bundle named `specdraft-{feature-name}.zip`.
4. THE App SHALL also offer individual file download and copy-to-clipboard for each generated file.
5. THE Handoff_Viewer SHALL render each Steering_File as formatted markdown so the user can review the content before downloading.
6. WHERE the user wishes to edit a Steering_File before downloading, THE App SHALL allow inline editing of the file content within the Handoff_Viewer.

---

### Requirement 11: Kiro Agent Hook for Automated Handoff

**User Story:** As a Kiro user, I want an optional agent hook definition I can add to my project, so that Kiro automatically loads my project context at the start of every session without me manually copying files.

#### Acceptance Criteria

1. WHERE the user opts in to the automated handoff option, THE App SHALL generate a Kiro_Hook JSON definition that, when placed in a project's `.kiro/hooks/` directory, instructs Kiro to load the Steering_Files at session start.
2. THE Kiro_Hook SHALL be included in the Handoff_Bundle at `.kiro/hooks/specdraft-context.json`.
3. THE App SHALL display clear instructions explaining how to use the Kiro_Hook, including where to place the file and what it does.
4. THE Kiro_Hook SHALL reference the Steering_Files by their relative paths within `.kiro/steering/` so it works regardless of the project's root directory name.

---

### Requirement 12: Session Persistence & Steering File Storage

**User Story:** As a returning user, I want my sessions saved so I can revisit generated steering files and so the app can learn from my past projects.

#### Acceptance Criteria

1. THE App SHALL expose a `POST /api/save-session` route that accepts the full Session data and persists it to the `sessions` table in NeonDB via Drizzle ORM.
2. THE App SHALL extend the `sessions` table schema to store: `brainstormTranscript` (JSONB array of `{role, message, timestamp}`), `researchReport` (JSONB Research_Report object), `contextSteeringFile` (TEXT), `audienceSteeringFile` (TEXT), and `seedRequirementsFile` (TEXT, nullable).
3. WHEN saving a Session, THE App SHALL generate an Embedding for the Session by calling Gemini `text-embedding-004` with a concatenation of the `intent`, `domain`, and `contextSteeringFile` fields, and store the resulting 768-dimensional vector in the `embedding` column.
4. WHEN a Session is saved successfully, THE App SHALL return the generated `session.id` to the caller.
5. IF the database write fails, THEN THE App SHALL return HTTP 500 with a descriptive error message and SHALL NOT silently discard the error.
6. THE App SHALL save the Session after all Steering_Files are generated and before the Handoff_Viewer is displayed.

---

### Requirement 13: Cross-Session Learning via RAG

**User Story:** As a returning founder, I want the app to remember patterns from my past projects, so that the brainstorm agent can reference my preferences and the research pipeline can build on prior findings.

#### Acceptance Criteria

1. THE App SHALL expose a `GET /api/past-sessions` route that accepts a `query` string parameter containing the current session's intent text.
2. WHEN a query is received, THE App SHALL generate an Embedding for the query using Gemini `text-embedding-004` and perform a cosine similarity search against the `sessions` table using pgvector, returning the top 3 most similar past Sessions.
3. WHEN past Sessions are retrieved, THE App SHALL extract recurring patterns (technology preferences, common audience segments, recurring constraints) and pass them to the Brainstorm_Agent as additional context.
4. WHEN the Brainstorm_Agent opens a new session and past patterns are available, THE Brainstorm_Agent SHALL reference them in its opening message.
5. IF no past Sessions exist for the user, THE App SHALL proceed without pre-fill and the Brainstorm_Agent SHALL open with a standard greeting.
6. IF the pgvector query fails, THEN THE App SHALL log the error and proceed without RAG pre-fill rather than blocking the session.

---

### Requirement 14: Handoff Viewer Page

**User Story:** As a founder, I want a dedicated page to review, edit, and export my generated Kiro files, so that I can verify the output before bringing it into my project.

#### Acceptance Criteria

1. THE App SHALL implement a `/handoff/[sessionId]` route that renders the Handoff_Viewer for a completed Session.
2. WHEN the Handoff_Viewer loads, THE App SHALL fetch the Session data from NeonDB using the `sessionId` route parameter and display all generated Steering_Files.
3. THE Handoff_Viewer SHALL display each file in a tabbed or sectioned layout with the filename, a formatted markdown preview, a copy-to-clipboard button, and an individual download button.
4. THE Handoff_Viewer SHALL display a "Download Kiro Bundle" button that triggers the full Handoff_Bundle zip download.
5. THE Handoff_Viewer SHALL display a summary card showing: session date, product name derived from intent, number of competitors researched, number of audience segments identified, and number of Gaps resolved by Background_Research.
6. IF a `sessionId` in the URL does not correspond to an existing Session, THEN THE App SHALL display a 404-style error page with a link back to the landing page.
7. WHEN the user edits a Steering_File inline and clicks "Save Changes", THE App SHALL persist the updated file content to the Session record in NeonDB.

---

### Requirement 15: Removal of v1 PRD Output

**User Story:** As a Kiro user, I want SpecDraft v2 to stop generating PRD, requirements.md, design.md, and tasks.md as primary outputs, so that the tool does not duplicate what Kiro's spec mode already does better.

#### Acceptance Criteria

1. THE App SHALL remove the `/prd/[sessionId]` route and the `PRDViewer` component from the primary user flow.
2. THE App SHALL remove the `generate-prd` API route from the primary session pipeline.
3. THE App SHALL remove the `kiro-spec-generator.ts` and `prd-assembler.ts` library modules from the primary session pipeline.
4. THE App SHALL remove the `kiroRequirements`, `kiroDesign`, `kiroTasks`, and `prdMarkdown` columns from the active session data model used in the v2 flow.
5. WHERE backward compatibility with existing v1 sessions stored in NeonDB is required, THE App SHALL retain the database columns but SHALL NOT populate them in new v2 sessions.

---

### Requirement 16: Brainstorm Agent System Prompt — Startup Methodology

**User Story:** As a founder, I want the brainstorm agent to follow proven startup product frameworks, so that the conversation surfaces the right insights rather than generic questions.

#### Acceptance Criteria

1. THE Brainstorm_Agent system prompt SHALL instruct the agent to apply Jobs-to-be-Done framing when probing for the target user's motivation.
2. THE Brainstorm_Agent system prompt SHALL instruct the agent to apply problem-before-solution discipline: the agent SHALL NOT suggest technical solutions during the brainstorm phase.
3. THE Brainstorm_Agent system prompt SHALL instruct the agent to probe for evidence of demand before accepting assumptions (e.g. "Have you talked to anyone who has this problem?").
4. THE Brainstorm_Agent system prompt SHALL instruct the agent to identify the riskiest assumption in the user's idea and surface it explicitly before ending the session.
5. THE Brainstorm_Agent system prompt SHALL instruct the agent to keep the conversation energetic and co-founder-like in tone — curious, direct, and encouraging — not clinical or form-like.
6. THE Brainstorm_Agent system prompt SHALL instruct the agent to end the session by summarising the key decisions made and the Gaps that Background_Research will fill, so the user knows what to expect next.

---

### Requirement 17: Research Pipeline — Competitor Analysis

**User Story:** As a founder, I want the app to automatically identify and profile my competitors, so that my Kiro steering files reflect the real competitive landscape without me having to research it manually.

#### Acceptance Criteria

1. WHEN Background_Research begins, THE App SHALL identify up to 5 competitors relevant to the product's `domain` and `intent` using Gemini with web-search grounding.
2. FOR EACH competitor, THE App SHALL extract: product name, one-sentence positioning, primary target audience, key differentiator from the user's idea, and pricing model if publicly available.
3. THE App SHALL include both direct competitors (same problem, same audience) and indirect competitors (same audience, different solution) in the Research_Report.
4. IF fewer than 2 competitors can be identified with reasonable confidence, THEN THE App SHALL note this in the Research_Report as a signal that the user may be in a novel market.
5. THE competitor data SHALL be sourced from Gemini's knowledge and web-search grounding; THE App SHALL NOT fabricate competitor details.

---

### Requirement 18: Research Pipeline — Target Audience Profiling

**User Story:** As a founder, I want the app to build structured audience profiles from my brainstorm, so that Kiro has concrete user context when generating features and copy.

#### Acceptance Criteria

1. WHEN Background_Research begins, THE App SHALL synthesise up to 3 target audience segments from the brainstorm Q&A, Extracted_Context, and Gemini research.
2. FOR EACH audience segment, THE App SHALL produce: a segment name, a one-paragraph description, a list of 3–5 pain points, a Jobs-to-be-Done statement, a willingness-to-pay signal (high / medium / low with rationale), and preferred channels for reaching this audience.
3. THE App SHALL identify at least one Anti-Persona — a user type that might seem like a fit but is explicitly out of scope — to help Kiro avoid building for the wrong user.
4. IF the brainstorm provided strong audience signals, THE App SHALL prioritise those over generic research; the user's direct knowledge SHALL take precedence over inferred data.

---

### Requirement 19: Research Pipeline — Market Sizing

**User Story:** As a founder, I want a rough market size estimate in my steering files, so that Kiro understands the scale and ambition of the product when making architectural and feature decisions.

#### Acceptance Criteria

1. WHEN Background_Research begins, THE App SHALL produce a market size estimate containing TAM (Total Addressable Market), SAM (Serviceable Addressable Market), and SOM (Serviceable Obtainable Market) figures.
2. THE market size estimates SHALL be expressed as annual revenue opportunity in USD with an order-of-magnitude qualifier (e.g. "$2B–$5B TAM").
3. THE App SHALL include a brief rationale for each estimate, citing the methodology (e.g. bottom-up from audience segment size × willingness-to-pay).
4. THE market size section SHALL include a confidence label (high / medium / low) reflecting how well the brainstorm data supports the estimate.
5. IF market size cannot be estimated with low confidence or better, THEN THE App SHALL omit the figures and note that market sizing requires further primary research.

---

### Requirement 20: Research Pipeline — Architecture Recommendations

**User Story:** As a founder, I want architecture recommendations in my steering files based on my constraints, so that Kiro makes sensible technical decisions from the start rather than defaulting to generic patterns.

#### Acceptance Criteria

1. WHEN Background_Research begins, THE App SHALL generate architecture recommendations using the session's `constraints`, `domain`, and `intent` as inputs.
2. THE architecture recommendations SHALL cover: recommended technology stack (with rationale tied to constraints), data model considerations, scalability approach appropriate to the market size estimate, key integration points, and security and compliance considerations relevant to the domain.
3. THE architecture recommendations SHALL be grounded in the existing tech stack (Next.js 16, React 19, Tailwind 4, NeonDB, Drizzle ORM) where the user has not specified otherwise.
4. THE architecture recommendations SHALL explicitly call out any constraints that conflict with the recommended stack and propose resolutions.
5. THE architecture recommendations SHALL be written as directive guidance for Kiro, not as options for the user to choose from — Kiro needs a clear recommendation, not a menu.

---

### Requirement 21: Page Routing & Session State

**User Story:** As a founder, I want a smooth three-step flow from brain-dump to brainstorm to Kiro handoff, so that I always know where I am in the process.

#### Acceptance Criteria

1. THE App SHALL implement three primary routes: `/` (landing + brain-dump intake), `/brainstorm` (voice brainstorm screen), and `/handoff/[sessionId]` (Kiro handoff viewer).
2. WHEN the user completes transcription and context extraction, THE App SHALL navigate to `/brainstorm`, passing the Extracted_Context via URL search parameters or server-side session storage.
3. WHEN the Brainstorm_Agent session ends and Background_Research completes, THE App SHALL navigate to `/handoff/[sessionId]`.
4. WHEN the user is on the `/handoff/[sessionId]` page, THE App SHALL load the Session data from NeonDB using the `sessionId` route parameter.
5. IF a `sessionId` in the URL does not correspond to an existing Session, THEN THE App SHALL display a 404-style error page with a link back to the landing page.

---

### Requirement 22: Environment Configuration

**User Story:** As a developer deploying the app, I want all required environment variables documented and validated, so that the app fails fast with a clear message when configuration is missing.

#### Acceptance Criteria

1. THE App SHALL require the following environment variables: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `GEMINI_API_KEY`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `NEXT_PUBLIC_APP_URL`.
2. IF a required server-side environment variable is absent at API route invocation time, THEN THE App SHALL return HTTP 500 with a message identifying the missing variable by name.
3. THE App SHALL NOT expose `ELEVENLABS_API_KEY` or `GEMINI_API_KEY` to the browser; these SHALL be used only in server-side API routes.
4. THE App SHALL update `.env.example` to list all required variables with placeholder values and inline comments describing each variable's purpose.
5. THE App SHALL NOT introduce new required environment variables beyond those listed in criterion 1 without updating `.env.example` accordingly.
