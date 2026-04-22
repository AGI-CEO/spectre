# Implementation Tasks

## Phase 1: Setup & Infrastructure

- [x] 1. Install missing dependencies
  - [x] 1.1. Run `npm install @elevenlabs/react react-markdown react-dropzone jszip`
  - [x] 1.2. Run `npm install --save-dev @types/jszip`
  - [x] 1.3. Verify no version conflicts between `@elevenlabs/react` and `@elevenlabs/elevenlabs-js` in `package.json`

- [x] 2. Update environment configuration
  - [x] 2.1. Update `.env.example` to document all required variables: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `GEMINI_API_KEY`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEXT_PUBLIC_APP_URL`
  - [x] 2.2. Update `.env` with the same variable keys (values remain empty placeholders)

- [x] 3. Update app metadata
  - [x] 3.1. Update `app/layout.tsx` title to "SpecDraft — Voice-First AI Product Copilot"
  - [x] 3.2. Update `app/layout.tsx` meta description to reflect the SpecDraft value proposition

- [x] 4. Create shared TypeScript types
  - [x] 4.1. Create `lib/types.ts` exporting `ExtractedContext`, `InterviewMessage`, and `ClientSessionState` interfaces as defined in the design doc

- [x] 5. Create library singletons
  - [x] 5.1. Create `lib/gemini.ts` with `getGeminiClient()` singleton using `GEMINI_API_KEY`
  - [x] 5.2. Create `lib/elevenlabs.ts` with `getElevenLabsClient()` singleton using `ELEVENLABS_API_KEY`

## Phase 2: API Routes

- [x] 6. Implement `POST /api/extract-context`
  - [x] 6.1. Create `app/api/extract-context/route.ts`
  - [x] 6.2. Validate `transcript` field is present and non-empty; return HTTP 400 if missing
  - [x] 6.3. Call Gemini with the context extraction system prompt from the design doc
  - [x] 6.4. Parse and validate the JSON response contains all required fields (`intent`, `domain`, `target_user_hints`, `problem_hints`, `constraints`, `gaps`, `confidence`)
  - [x] 6.5. Return `{ context: ExtractedContext }` on success or `{ error: string }` with HTTP 500 on failure

- [x] 7. Implement `GET /api/agent-token`
  - [x] 7.1. Create `app/api/agent-token/route.ts`
  - [x] 7.2. Validate `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` env vars are present; return HTTP 500 with variable name if missing
  - [x] 7.3. Call ElevenLabs API to generate a signed conversation URL scoped to `ELEVENLABS_AGENT_ID`
  - [x] 7.4. Return `{ signedUrl: string }` — never expose the raw API key in the response

- [x] 8. Implement `POST /api/gap-fill`
  - [x] 8.1. Create `app/api/gap-fill/route.ts`
  - [x] 8.2. Validate `gap`, `domain`, and `intent` fields are present; return HTTP 400 if any are missing
  - [x] 8.3. Use Gemini with Google Search grounding enabled to research the gap query `"${domain} ${gap} best practices"`
  - [x] 8.4. Synthesise a single confident suggested answer from the search results
  - [x] 8.5. Return `{ suggestion: string }` on success or `{ error: string }` with HTTP 500 on failure

- [x] 9. Create `lib/embeddings.ts`
  - [x] 9.1. Implement `embed(text: string): Promise<number[]>` using Gemini `text-embedding-004` via `@google/genai`
  - [x] 9.2. Implement `ragQuery(queryEmbedding: number[], userId: string, limit: number): Promise<any[]>` using pgvector cosine similarity via Drizzle `sql` template tag

- [x] 10. Implement `GET /api/past-sessions`
  - [x] 10.1. Create `app/api/past-sessions/route.ts`
  - [x] 10.2. Read `query` and `userId` from URL search params; return HTTP 400 if `query` is missing
  - [x] 10.3. Call `embed(query)` then `ragQuery()` to retrieve top 3 similar past sessions
  - [x] 10.4. Extract `stackPreferences`, `commonAudiences`, and `recurringConstraints` patterns from returned sessions
  - [x] 10.5. Return `{ patterns, sessionCount }` — if pgvector query fails, log error and return empty patterns rather than HTTP 500

- [x] 11. Create `lib/prd-assembler.ts`
  - [x] 11.1. Implement `assemblePRD({ transcript, extractedContext, interviewMessages })` using `gemini-2.0-flash`
  - [x] 11.2. Use the PRD assembly system prompt from the design doc, interpolating all session data
  - [x] 11.3. Return the raw PRD markdown string

- [x] 12. Create `lib/kiro-spec-generator.ts`
  - [x] 12.1. Implement `generateKiroSpec({ prdMarkdown, extractedContext, interviewMessages })` making three parallel Gemini calls
  - [x] 12.2. Generate `requirements` using the Kiro Requirements Generation prompt (EARS-pattern, GIVEN/WHEN/THEN, P0/P1/P2 labels)
  - [x] 12.3. Generate `design` using the Kiro Design Generation prompt (architecture overview, Mermaid diagrams, data models)
  - [x] 12.4. Generate `tasks` using the Kiro Tasks Generation prompt (Kiro checkbox syntax: `- [ ]`, `- [x]`, `- [ ]*`, grouped by phase)
  - [x] 12.5. Derive `featureName` from `extractedContext.intent` by lowercasing, replacing non-alphanumeric chars with hyphens, collapsing consecutive hyphens, trimming, and falling back to `"my-feature"`
  - [x] 12.6. Return `{ requirements, design, tasks, featureName }`

- [x] 13. Implement `POST /api/generate-prd`
  - [x] 13.1. Create `app/api/generate-prd/route.ts`
  - [x] 13.2. Validate required fields (`transcript`, `extractedContext`, `interviewMessages`, `userId`) are present
  - [x] 13.3. Call `assemblePRD()` from `lib/prd-assembler.ts`
  - [x] 13.4. Call `generateKiroSpec()` from `lib/kiro-spec-generator.ts` with the assembled PRD
  - [x] 13.5. Return `{ prdMarkdown, kiroRequirements, kiroDesign, kiroTasks, featureName }` on success

- [x] 14. Implement `POST /api/save-session`
  - [x] 14.1. Create `app/api/save-session/route.ts`
  - [x] 14.2. Validate all required session fields are present in the request body
  - [x] 14.3. Call `embed(intent + " " + domain + " " + prdMarkdown)` to generate the 768-dim session embedding
  - [x] 14.4. Insert the full session row into the `sessions` table via Drizzle ORM
  - [x] 14.5. Return `{ sessionId: number }` on success or `{ error: string }` with HTTP 500 on DB failure — do not silently discard errors

## Phase 3: UI Components

- [x] 15. Create `components/WaveformVisualizer.tsx`
  - [x] 15.1. Accept an `analyserNode: AnalyserNode | null` prop
  - [x] 15.2. Use `requestAnimationFrame` to read frequency data from the `AnalyserNode` and draw a bar waveform on a `<canvas>` element
  - [x] 15.3. Stop the animation loop when `analyserNode` is null or the component unmounts

- [x] 16. Create `components/BraindumpRecorder.tsx`
  - [x] 16.1. On mount, detect `MediaRecorder` support; if unsupported, render an upload-only message
  - [x] 16.2. Implement `startRecording()`: call `getUserMedia({ audio: true })`, create `MediaRecorder` with `audio/webm`, wire `AnalyserNode` to `WaveformVisualizer`, start a 10-minute countdown timer
  - [x] 16.3. Implement `stopRecording()`: stop `MediaRecorder`, collect chunks into a `Blob`, reset timer
  - [x] 16.4. On mic permission denial, catch the `getUserMedia` rejection and display an error message with a link to the upload zone
  - [x] 16.5. On "Stop & Continue", POST the audio blob to `/api/transcribe` as `multipart/form-data` with field name `audio`
  - [x] 16.6. Display a loading state while transcription is in progress
  - [x] 16.7. On transcription success, display the transcript in an editable `<textarea>` and show a "Confirm & Continue" button

- [x] 17. Create `components/FileUploadZone.tsx`
  - [x] 17.1. Use `react-dropzone` with `accept` restricted to `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/webm`
  - [x] 17.2. Reject files over 50 MB before upload and display a size-limit error message
  - [x] 17.3. Reject files with unsupported MIME types and display an accepted-formats error message
  - [x] 17.4. On valid file selection, show an upload progress indicator and POST to `/api/transcribe`
  - [x] 17.5. On transcription success, display the transcript in an editable `<textarea>` and show a "Confirm & Continue" button

- [x] 18. Build the landing + brain-dump intake page
  - [x] 18.1. Replace `app/page.tsx` with a `BraindumpPage` client component
  - [x] 18.2. Render a hero section with the SpecDraft headline, value proposition, and "Start Brain-Dump" CTA
  - [x] 18.3. Below the hero, render `BraindumpRecorder` and `FileUploadZone` side by side (or tabbed on mobile)
  - [x] 18.4. On transcript confirmation, POST to `/api/extract-context`, then GET `/api/past-sessions?query=<intent>&userId=<userId>`
  - [x] 18.5. Store `{ transcript, extractedContext, interviewMessages: [], userId }` in `localStorage` under key `"specdraft_session"`
  - [x] 18.6. Navigate to `/interview` using `router.push` after context extraction completes

- [x] 19. Create `components/InterviewAgent.tsx`
  - [x] 19.1. On mount, fetch signed URL from `GET /api/agent-token`
  - [x] 19.2. Initialise `useConversation` from `@elevenlabs/react` with `onMessage` callback that appends to `interviewMessages` state
  - [x] 19.3. On session start, pass `transcript_summary`, `extracted_intent`, `domain`, and `gaps` as dynamic variables
  - [x] 19.4. Render a mic toggle button for voice mode; show agent speaking/listening status
  - [x] 19.5. Render a text chat fallback input below the voice controls; send text messages to the agent and display responses in a chat log
  - [x] 19.6. If `agent-token` fetch fails, skip voice mode and activate text fallback automatically with an error notice
  - [x] 19.7. Render a "Generate PRD" button; on click, call `endSession()` and invoke the `onInterviewComplete` callback with the collected `interviewMessages`

- [x] 20. Build the interview page
  - [x] 20.1. Create `app/interview/page.tsx` as a client component
  - [x] 20.2. On mount, read `{ transcript, extractedContext, userId }` from `localStorage`; redirect to `/` if missing
  - [x] 20.3. Render `InterviewAgent` with the loaded context
  - [x] 20.4. On `onInterviewComplete`, POST to `/api/generate-prd` with full session data
  - [x] 20.5. On PRD generation success, POST to `/api/save-session` with all session data including generated PRD and Kiro files
  - [x] 20.6. Store `{ prdMarkdown, kiroRequirements, kiroDesign, kiroTasks, featureName, sessionId }` in `localStorage` under `"specdraft_session"`
  - [x] 20.7. Navigate to `/prd/{sessionId}` using `router.push`

- [x] 21. Create `components/PRDViewer.tsx`
  - [x] 21.1. Accept `prdMarkdown`, `kiroRequirements`, `kiroDesign`, `kiroTasks`, `featureName`, and `sessionId` as props
  - [x] 21.2. Render the PRD markdown using `react-markdown` with appropriate heading and paragraph styles
  - [x] 21.3. Make each top-level PRD section individually editable via `contentEditable` divs; sync edits back to local state
  - [x] 21.4. Implement "Download PRD" button: create a `Blob` from the markdown string and trigger a download as `prd-{sessionId}.md`
  - [x] 21.5. Implement "Copy to Clipboard" button: write the markdown string to `navigator.clipboard` and show a "Copied!" confirmation for 2 seconds
  - [x] 21.6. Implement "Download Kiro Spec Bundle" button using `jszip`:
    - [x] 21.6.1. Create a new `JSZip` instance
    - [x] 21.6.2. Add `.kiro/specs/{featureName}/requirements.md` with `kiroRequirements` content
    - [x] 21.6.3. Add `.kiro/specs/{featureName}/design.md` with `kiroDesign` content
    - [x] 21.6.4. Add `.kiro/specs/{featureName}/tasks.md` with `kiroTasks` content
    - [x] 21.6.5. Add `.kiro/specs/{featureName}/.config.kiro` with JSON `{"specId":"<uuid>","workflowType":"requirements-first","specType":"feature"}`
    - [x] 21.6.6. Generate the zip blob and trigger download as `kiro-spec-{featureName}.zip`

- [x] 22. Build the PRD preview page
  - [x] 22.1. Create `app/prd/[sessionId]/page.tsx` as a Server Component
  - [x] 22.2. Fetch the session row from NeonDB using the `sessionId` route param via Drizzle
  - [x] 22.3. If no session is found, render a 404-style error page with a "Start New Session" link back to `/`
  - [x] 22.4. Pass `prdMarkdown`, `kiroRequirements`, `kiroDesign`, `kiroTasks`, `featureName`, and `sessionId` as props to `PRDViewer`

## Phase 4: Polish & Verification

- [x] 23. Anonymous user identity
  - [x] 23.1. On first visit to `/`, generate a UUID and store it in `localStorage` under `"specdraft_user_id"` if not already present
  - [x] 23.2. Read this UUID as `userId` in all subsequent API calls from the client

- [ ] ]* 24. Pre-seed synthetic sessions for RAG demo
  - [ ] 24.1. Create a `scripts/seed-sessions.ts` script that inserts 3–5 synthetic past sessions with embeddings into NeonDB
  - [ ] 24.2. Run the seed script against the development database to demonstrate cross-session learning in the demo

- [x] 25. End-to-end flow verification
  - [x] 25.1. Verify the full flow: record/upload → transcribe → extract context → interview → generate PRD → save → view PRD
  - [x] 25.2. Verify the Kiro spec bundle zip extracts to the correct `.kiro/specs/{feature-name}/` directory structure
  - [x] 25.3. Verify error states: mic denied, file too large, unsupported format, missing env vars, DB failure
  - [x] 25.4. Verify the `/prd/[sessionId]` 404 path when an invalid session ID is used

- [x] 26. Update `.env.example` and README
  - [x] 26.1. Confirm `.env.example` lists all six required variables with inline comments
  - [x] 26.2. Update `README.md` with setup instructions: clone → install deps → configure env vars → run `npm run dev`

