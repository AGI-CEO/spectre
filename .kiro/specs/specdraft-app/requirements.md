# Requirements Document

## Introduction

SpecDraft is a voice-first AI product copilot built on an existing Next.js 16 / React 19 / Tailwind 4 scaffold. The user speaks a raw idea (brain-dump), a conversational AI agent interviews them to fill gaps, and the app outputs a fully structured PRD plus a Kiro-compatible spec bundle ready to paste into any AI coding agent. Every session is persisted in NeonDB with pgvector embeddings so future sessions benefit from cross-session learning.

The scaffold already provides:
- `/app/api/transcribe/route.ts` — ElevenLabs Scribe v2 STT (complete)
- `db/schema.ts` — Drizzle ORM schema with NeonDB + pgvector (768 dims, Gemini `text-embedding-004`)
- `db/index.ts` — Drizzle client (Neon serverless)

Everything else — UI pages, components, remaining API routes, and library modules — must be built.

---

## Glossary

- **App**: The SpecDraft Next.js application running on Vercel.
- **Session**: A single end-to-end run from brain-dump intake through PRD export, persisted as one row in the `sessions` table.
- **Brain-Dump**: The user's initial free-form audio recording or uploaded audio file describing their product idea.
- **Transcript**: The text output produced by ElevenLabs Scribe v2 from a Brain-Dump audio input.
- **Extracted_Context**: A structured JSON object derived from the Transcript by the Gemini LLM, containing intent, domain, target user hints, problem hints, constraints, gaps, and confidence level.
- **Interview_Agent**: The ElevenLabs ConvAI 2.0 conversational agent that conducts a structured voice interview using Extracted_Context as dynamic variables.
- **Gap**: A critical product question that was not answered in the Brain-Dump and must be resolved during the interview or via Gap-Fill.
- **Gap_Fill**: An automated backend workflow that performs web research and uses Gemini to synthesize a suggested answer for a Gap.
- **PRD**: The structured Product Requirements Document assembled from all session data.
- **Kiro_Spec_Bundle**: A `.zip` archive containing `requirements.md`, `design.md`, and `tasks.md` formatted for Kiro's spec-driven development workflow, organized under `.kiro/specs/{feature-name}/`.
- **Kiro_Config**: A `.config.kiro` JSON file included in the Kiro_Spec_Bundle that identifies the spec type and workflow.
- **Embedding**: A 768-dimensional vector produced by Gemini `text-embedding-004`, stored in the `embedding` pgvector column of the `sessions` table.
- **RAG**: Retrieval-Augmented Generation — querying past Session embeddings via cosine similarity to pre-fill context for new sessions.
- **Recorder**: The browser-side `MediaRecorder`-based component that captures live microphone audio.
- **Upload_Zone**: The drag-and-drop file upload component that accepts `.mp3`, `.m4a`, `.wav`, and `.webm` audio files.
- **PRD_Viewer**: The UI component that renders the PRD as formatted markdown and provides export controls.
- **Waveform_Visualizer**: The UI component that renders a live audio waveform during recording.
- **Gemini**: Google's Gemini LLM family, accessed via `@google/genai`, used for context extraction, PRD assembly, and embeddings.
- **ElevenLabs**: The third-party service providing Scribe v2 STT and ConvAI 2.0 voice agent capabilities.

---

## Requirements

### Requirement 1: Landing Page & Navigation Shell

**User Story:** As a developer with a product idea, I want a clear landing page that explains SpecDraft and lets me start a session immediately, so that I can begin the brain-dump process without confusion.

#### Acceptance Criteria

1. THE App SHALL replace the default Next.js scaffold at `app/page.tsx` with a SpecDraft landing page that includes a headline, a one-sentence value proposition, and a "Start Brain-Dump" call-to-action button.
2. WHEN the user clicks "Start Brain-Dump", THE App SHALL navigate to the brain-dump intake UI on the same page or a dedicated route without a full page reload.
3. THE App SHALL update the `<title>` and `<meta description>` in `app/layout.tsx` to reflect the SpecDraft product name and purpose.

---

### Requirement 2: Live Audio Recording (Brain-Dump Intake)

**User Story:** As a developer, I want to record my product idea directly in the browser using my microphone, so that I can brain-dump without needing to prepare a file.

#### Acceptance Criteria

1. WHEN the user activates the record button, THE Recorder SHALL capture microphone audio using the `MediaRecorder` Web API with `audio/webm` MIME type.
2. WHILE recording is active, THE Waveform_Visualizer SHALL render a live waveform using the Web Audio API `AnalyserNode`.
3. WHILE recording is active, THE Recorder SHALL enforce a maximum recording duration of 10 minutes and automatically stop recording when that limit is reached.
4. WHEN the user clicks "Stop & Continue", THE Recorder SHALL stop capturing audio and submit the recorded blob to `/api/transcribe` via a `multipart/form-data` POST request with the field name `audio`.
5. IF the user's browser does not support `MediaRecorder`, THEN THE App SHALL display a message instructing the user to upload an audio file instead.
6. IF microphone permission is denied by the user, THEN THE Recorder SHALL display an error message explaining that microphone access is required and offer the file upload alternative.

---

### Requirement 3: Audio File Upload (Brain-Dump Intake)

**User Story:** As a developer, I want to upload an existing audio recording of my idea, so that I can use a recording I already have without re-recording.

#### Acceptance Criteria

1. THE Upload_Zone SHALL accept audio files via drag-and-drop and via a file input button.
2. THE Upload_Zone SHALL accept only files with MIME types `audio/mpeg`, `audio/mp4`, `audio/wav`, and `audio/webm`, corresponding to `.mp3`, `.m4a`, `.wav`, and `.webm` extensions.
3. IF the user selects a file exceeding 50 MB, THEN THE Upload_Zone SHALL reject the file and display an error message stating the size limit before any upload begins.
4. IF the user selects a file with an unsupported MIME type, THEN THE Upload_Zone SHALL reject the file and display an error message listing the accepted formats.
5. WHEN a valid file is selected, THE Upload_Zone SHALL display a progress indicator and submit the file to `/api/transcribe` via a `multipart/form-data` POST request with the field name `audio`.

---

### Requirement 4: Speech-to-Text Transcription

**User Story:** As a developer, I want my audio automatically transcribed, so that the AI agent has text to work with without me typing anything.

#### Acceptance Criteria

1. THE App SHALL expose a `POST /api/transcribe` route that accepts a `multipart/form-data` request containing an `audio` field.
2. WHEN a valid audio blob is received, THE App SHALL call ElevenLabs Scribe v2 with `model_id: "scribe_v2"`, `language_code: "eng"`, `tag_audio_events: true`, and `diarize: false`.
3. WHEN transcription succeeds, THE App SHALL return a JSON response containing `transcript` (full text string) and `words` (word-level timing array).
4. IF no `audio` field is present in the request, THEN THE App SHALL return HTTP 400 with a JSON error body.
5. IF the ElevenLabs API returns an error, THEN THE App SHALL return HTTP 500 with a JSON error body containing the upstream error message.
6. WHEN transcription completes, THE App SHALL display the full Transcript text in the UI before proceeding to the interview step.
7. WHERE the user wishes to correct transcription errors, THE App SHALL allow the user to edit the displayed Transcript text in an editable text area before advancing to the interview.

---

### Requirement 5: LLM Context Extraction

**User Story:** As a developer, I want the app to automatically extract structured signals from my transcript, so that the interview agent can skip questions I already answered and focus on genuine gaps.

#### Acceptance Criteria

1. THE App SHALL expose a `POST /api/extract-context` route that accepts a JSON body containing a `transcript` string.
2. WHEN a Transcript is received, THE App SHALL call Gemini via `@google/genai` with a system prompt instructing it to extract a JSON object with the fields: `intent`, `domain`, `target_user_hints`, `problem_hints`, `constraints`, `gaps`, and `confidence`.
3. WHEN extraction succeeds, THE App SHALL return the Extracted_Context JSON object to the caller.
4. IF the Gemini API returns an error, THEN THE App SHALL return HTTP 500 with a descriptive error message.
5. THE App SHALL store the Extracted_Context in session state and pass it as dynamic variables to the Interview_Agent.

---

### Requirement 6: Conversational Interview Agent

**User Story:** As a developer, I want a voice AI agent to interview me about my idea, so that I can flesh out the details conversationally without filling in a form.

#### Acceptance Criteria

1. THE App SHALL expose a `GET /api/agent-token` route that generates and returns a signed ElevenLabs ConvAI URL, keeping the `ELEVENLABS_API_KEY` server-side only.
2. WHEN the interview screen loads, THE App SHALL fetch the signed URL from `/api/agent-token` and initialise the Interview_Agent using the `useConversation` hook from `@elevenlabs/react`.
3. WHEN the Interview_Agent session starts, THE App SHALL inject `transcript_summary`, `extracted_intent`, `domain`, and `gaps` as dynamic variables into the agent's system prompt.
4. WHILE the interview is active, THE Interview_Agent SHALL ask one question at a time, covering: target user, core problem, success metrics, platform and constraints, and non-negotiables.
5. WHILE the interview is active, THE Interview_Agent SHALL skip any topic that was already clearly addressed in the Extracted_Context.
6. WHEN the user says "I don't know" or an equivalent phrase, THE Interview_Agent SHALL acknowledge the response, flag the topic as a Gap, and move to the next question.
7. WHEN the user indicates they are done or requests PRD generation, THE Interview_Agent SHALL end the session and trigger the PRD assembly workflow.
8. WHERE a text chat fallback is needed, THE App SHALL render a text input that sends messages to the Interview_Agent and displays agent responses as text.
9. IF the signed URL request fails, THEN THE App SHALL display an error message and offer the text chat fallback.

---

### Requirement 7: Gap-Fill Automation

**User Story:** As a developer, I want the app to automatically research answers to questions I couldn't answer, so that my PRD doesn't have empty sections.

#### Acceptance Criteria

1. THE App SHALL expose a `POST /api/gap-fill` route that accepts a JSON body containing `gap`, `domain`, and `intent` fields.
2. WHEN a Gap is received, THE App SHALL perform a web search using a query constructed from the `domain` and `gap` fields to retrieve comparable product patterns.
3. WHEN search results are available, THE App SHALL call Gemini to synthesise a single confident suggested answer for the Gap, incorporating the search results as context.
4. WHEN a suggestion is ready, THE App SHALL return the suggestion text to the caller so the Interview_Agent can surface it to the user.
5. WHEN the user accepts a Gap-Fill suggestion, THE App SHALL record the accepted answer in the Session's interview transcript data.
6. WHEN the user rejects a Gap-Fill suggestion, THE App SHALL record the rejection and the user's custom answer (if provided) in the Session's interview transcript data.
7. IF the web search or Gemini call fails, THEN THE App SHALL return HTTP 500 and the Interview_Agent SHALL note the Gap as unresolved rather than surfacing a fabricated answer.

---

### Requirement 8: PRD Assembly

**User Story:** As a developer, I want a complete, structured PRD generated automatically from my session, so that I have a document I can hand to an AI coding agent immediately.

#### Acceptance Criteria

1. THE App SHALL expose a `POST /api/generate-prd` route that accepts a JSON body containing the full Session data (transcript, Extracted_Context, interview Q&A, Gap-Fill answers).
2. WHEN Session data is received, THE App SHALL call Gemini to assemble a PRD conforming to the template defined in the PRD Output Template section of the product PRD, including: Problem Statement, Target Audience, Goals & Success Metrics, Solution Overview, User Stories (GIVEN/WHEN/THEN format), Scope, Technical Constraints, and Risks & Open Questions.
3. WHEN PRD assembly succeeds, THE App SHALL return the PRD as a markdown string.
4. IF Gemini returns an error during assembly, THEN THE App SHALL return HTTP 500 with a descriptive error message.
5. THE App SHALL simultaneously generate the three Kiro spec files (`requirements.md`, `design.md`, `tasks.md`) as part of the same assembly pipeline call.

---

### Requirement 9: Kiro Spec Bundle Generation

**User Story:** As a developer using Kiro, I want to download a spec bundle formatted exactly for Kiro's spec-driven workflow, so that I can drop it into my project and start building immediately.

#### Acceptance Criteria

1. THE App SHALL generate a `requirements.md` file containing user stories written with GIVEN/WHEN/THEN acceptance criteria and EARS-pattern requirements, with priority labels (P0/P1/P2).
2. THE App SHALL generate a `design.md` file containing a technical architecture overview, Mermaid sequence diagrams for key flows, and integration point descriptions, auto-suggested based on the Session's domain and constraints.
3. THE App SHALL generate a `tasks.md` file containing ordered implementation tasks using Kiro checkbox syntax: `- [ ]` for incomplete tasks, `- [x]` for completed tasks, and `- [ ] *` for optional tasks, grouped by phase (Setup → Core → Polish).
4. THE App SHALL generate a `.config.kiro` JSON file with the structure `{"specId": "<uuid>", "workflowType": "requirements-first", "specType": "feature"}`.
5. WHEN the user requests a Kiro export, THE App SHALL package all four files into a `.zip` archive with the internal directory structure `.kiro/specs/{feature-name}/requirements.md`, `.kiro/specs/{feature-name}/design.md`, `.kiro/specs/{feature-name}/tasks.md`, and `.kiro/specs/{feature-name}/.config.kiro`.
6. THE App SHALL derive the `{feature-name}` slug from the Session's `intent` field, converted to kebab-case.
7. IF the `intent` field is empty or cannot be slugified, THEN THE App SHALL use `my-feature` as the default `{feature-name}`.

---

### Requirement 10: PRD Preview & Export

**User Story:** As a developer, I want to preview my generated PRD in the browser and export it in multiple formats, so that I can use it wherever I need it.

#### Acceptance Criteria

1. THE PRD_Viewer SHALL render the PRD markdown as formatted HTML using a markdown rendering library.
2. WHEN the user clicks "Download PRD", THE App SHALL trigger a browser download of the PRD as a `.md` file named `prd-{sessionId}.md`.
3. WHEN the user clicks "Download Kiro Spec Bundle", THE App SHALL generate the Kiro_Spec_Bundle zip and trigger a browser download named `kiro-spec-{feature-name}.zip`.
4. WHEN the user clicks "Copy to Clipboard", THE App SHALL copy the raw PRD markdown string to the system clipboard and display a confirmation message.
5. WHERE the user wishes to refine the PRD before export, THE App SHALL allow inline editing of individual PRD sections within the PRD_Viewer.

---

### Requirement 11: Session Persistence

**User Story:** As a developer, I want my session automatically saved, so that I don't lose my work and the app can learn from my past sessions.

#### Acceptance Criteria

1. THE App SHALL expose a `POST /api/save-session` route that accepts the full Session data and persists it to the `sessions` table in NeonDB via Drizzle ORM.
2. WHEN saving a Session, THE App SHALL generate an Embedding for the Session by calling Gemini `text-embedding-004` with a concatenation of the `intent`, `domain`, and `prdMarkdown` fields, and store the resulting 768-dimensional vector in the `embedding` column.
3. WHEN a Session is saved successfully, THE App SHALL return the generated `session.id` to the caller.
4. IF the database write fails, THEN THE App SHALL return HTTP 500 with a descriptive error message and THE App SHALL NOT silently discard the error.
5. THE App SHALL save the Session after PRD generation completes and before the PRD preview page is displayed to the user.

---

### Requirement 12: Cross-Session Learning via RAG

**User Story:** As a returning developer, I want the app to remember patterns from my past sessions, so that it can pre-fill likely answers and make the interview faster.

#### Acceptance Criteria

1. THE App SHALL expose a `GET /api/past-sessions` route that accepts a `query` string parameter containing the current session's intent text.
2. WHEN a query is received, THE App SHALL generate an Embedding for the query using Gemini `text-embedding-004` and perform a cosine similarity search against the `sessions` table using pgvector, returning the top 3 most similar past Sessions.
3. WHEN past Sessions are retrieved, THE App SHALL extract recurring patterns (stack preferences, common audiences, recurring constraints) and pass them to the Interview_Agent as additional context.
4. WHEN the Interview_Agent opens a new session and past patterns are available, THE Interview_Agent SHALL reference them in its opening message (e.g., "Based on your past projects, I suspect you'll want to use TypeScript — should I assume that?").
5. IF no past Sessions exist for the user, THE App SHALL proceed without pre-fill and the Interview_Agent SHALL open with a standard greeting.
6. IF the pgvector query fails, THEN THE App SHALL log the error and proceed without RAG pre-fill rather than blocking the session.

---

### Requirement 13: Page Routing & Session State

**User Story:** As a developer, I want a smooth multi-step flow from brain-dump to interview to PRD, so that I always know where I am in the process and can navigate back if needed.

#### Acceptance Criteria

1. THE App SHALL implement three primary routes: `/` (landing + brain-dump intake), `/interview` (conversational interview screen), and `/prd/[sessionId]` (PRD preview and export).
2. WHEN the user completes transcription and context extraction, THE App SHALL navigate to `/interview`, passing the `sessionId` and Extracted_Context via URL search parameters or server-side session storage.
3. WHEN the Interview_Agent session ends and PRD generation completes, THE App SHALL navigate to `/prd/[sessionId]`.
4. WHEN the user is on the `/prd/[sessionId]` page, THE App SHALL load the PRD data from NeonDB using the `sessionId` route parameter.
5. IF a `sessionId` in the URL does not correspond to an existing Session in the database, THEN THE App SHALL display a 404-style error page with a link back to the landing page.

---

### Requirement 14: Dependency Installation

**User Story:** As a developer setting up the project, I want all required packages available, so that the app compiles and runs without missing module errors.

#### Acceptance Criteria

1. THE App SHALL declare `@elevenlabs/react` as a production dependency for the `useConversation` hook.
2. THE App SHALL declare `react-markdown` as a production dependency for PRD rendering in the PRD_Viewer.
3. THE App SHALL declare `react-dropzone` as a production dependency for the Upload_Zone drag-and-drop functionality.
4. THE App SHALL declare `jszip` as a production dependency for client-side Kiro_Spec_Bundle zip generation.
5. THE App SHALL NOT introduce `openai` as a dependency; all LLM and embedding calls SHALL use `@google/genai` (already installed) with Gemini models.
6. THE App SHALL NOT introduce `@elevenlabs/react` SDK version conflicts with the existing `@elevenlabs/elevenlabs-js` package already installed.

---

### Requirement 15: Environment Configuration

**User Story:** As a developer deploying the app, I want all required environment variables documented and validated, so that the app fails fast with a clear message when configuration is missing.

#### Acceptance Criteria

1. THE App SHALL require the following environment variables: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `GOOGLE_GENERATIVE_AI_API_KEY`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `NEXT_PUBLIC_APP_URL`.
2. IF a required server-side environment variable is absent at API route invocation time, THEN THE App SHALL return HTTP 500 with a message identifying the missing variable by name.
3. THE App SHALL NOT expose `ELEVENLABS_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` to the browser; these SHALL be used only in server-side API routes.
4. THE App SHALL update `.env.example` to list all required variables with placeholder values and inline comments describing each variable's purpose.
