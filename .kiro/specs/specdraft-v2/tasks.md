# Implementation Plan: SpecDraft v2

## Overview

This implementation plan converts the SpecDraft v2 design into a series of incremental coding tasks. The approach follows a phased structure: first extending the database schema and type definitions, then building new library modules for research and steering file generation, followed by API routes, UI components, and pages. Each phase builds on the previous one, ensuring no orphaned code and enabling early validation through checkpoints.

The implementation uses TypeScript with Next.js 16 App Router, React 19, Tailwind 4, Drizzle ORM, and integrates with ElevenLabs ConvAI 2.0 and Google Gemini APIs.

---

## Tasks

### Phase 1: Database Schema & Type Definitions

- [x] 1. Extend database schema and update type definitions
  - [x] 1.1 Extend `db/schema.ts` with v2 columns
    - Add new columns to `sessions` table: `brainstormTranscript` (JSONB), `researchReport` (JSONB), `contextSteeringFile` (TEXT), `audienceSteeringFile` (TEXT), `seedRequirementsFile` (TEXT, nullable)
    - Keep existing v1 columns for backward compatibility
    - Run Drizzle migration to apply schema changes
    - _Requirements: 12.2, 15.5_
  
  - [x] 1.2 Update `lib/types.ts` with v2 interfaces
    - Add `BrainstormMessage` interface with `role`, `message`, `timestamp`, `gapFlagged` fields
    - Add `ResearchReport` interface with `competitors`, `targetAudience`, `antiPersonas`, `marketSize`, `architectureRecommendations`, `resolvedGaps` fields
    - Add supporting interfaces: `Competitor`, `AudienceSegment`, `AntiPersona`, `MarketSize`, `ArchitectureRecommendation`, `ResolvedGap`
    - Update `ClientSessionState` interface to include v2 fields: `brainstormMessages`, `researchReport`, `contextSteeringFile`, `audienceSteeringFile`, `seedRequirementsFile`, `featureName`
    - _Requirements: 12.2, 6.6_

- [x] 2. Checkpoint - Verify schema and types
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 2: Research Pipeline & Steering Generator Libraries

- [x] 3. Implement research pipeline module
  - [x] 3.1 Create `lib/research-pipeline.ts` with core structure
    - Implement `runResearch()` function that accepts `transcript`, `extractedContext`, `brainstormMessages`
    - Set up parallel execution framework using `Promise.all` with 60-second timeout via `Promise.race`
    - Implement per-dimension error handling (catch failures, mark as `unresolved`, continue)
    - Return `ResearchReport` object
    - _Requirements: 6.1, 6.3, 6.6, 6.7, 6.8_
  
  - [x] 3.2 Implement competitor analysis dimension
    - Create `analyzeCompetitors()` function
    - Use Gemini `gemini-2.0-flash` with Google Search grounding enabled
    - Extract up to 5 competitors with `name`, `positioning`, `targetAudience`, `differentiator`, `pricingModel`
    - Include both direct and indirect competitors
    - Handle case where fewer than 2 competitors found
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [x] 3.3 Implement target audience profiling dimension
    - Create `profileAudience()` function
    - Synthesize up to 3 audience segments from brainstorm data
    - For each segment extract: `segment`, `description`, `painPoints`, `jobToBeDone`, `willingnessToPay`, `willingnessToPayRationale`, `channels`
    - Identify 1-2 anti-personas
    - Prioritize user's direct knowledge over generic research
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  
  - [x] 3.4 Implement market sizing dimension
    - Create `estimateMarketSize()` function
    - Generate TAM, SAM, SOM estimates with order-of-magnitude qualifiers
    - Include methodology rationale and confidence level
    - Return null if confidence would be below low
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [x] 3.5 Implement architecture recommendations dimension
    - Create `recommendArchitecture()` function
    - Generate recommendations covering: stack, dataModel, scalability, integrations, securityCompliance
    - Ground recommendations in existing tech stack (Next.js 16, React 19, Tailwind 4, NeonDB, Drizzle ORM)
    - Write as directive guidance for Kiro, not options
    - Call out any constraint conflicts
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 4. Implement steering file generator module
  - [x] 4.1 Create `lib/steering-generator.ts` with core functions
    - Implement `generateContextSteering()` function
    - Implement `generateAudienceSteering()` function
    - Implement `generateSeedRequirements()` function
    - Implement `deriveFeatureName()` utility (kebab-case conversion)
    - All functions use Gemini `gemini-2.0-flash` with structured prompts from design document
    - _Requirements: 7.1, 8.1, 9.1, 9.4, 9.5_
  
  - [x] 4.2 Implement context steering file generation
    - Generate markdown with sections: Project Overview, Domain Knowledge, Validated Product Decisions, Architecture Recommendations, Kiro Conventions
    - Write in clear, directive prose for AI agent consumption
    - Note unresolved gaps explicitly if present
    - Return raw markdown (front-matter prepended by caller)
    - _Requirements: 7.2, 7.4, 7.5_
  
  - [x] 4.3 Implement audience steering file generation
    - Generate markdown with sections: Target Audience, Competitive Landscape, Product Positioning, Anti-Personas
    - Write for Kiro to make product decisions (UI copy, API design, feature prioritization)
    - Return raw markdown (front-matter prepended by caller)
    - _Requirements: 8.2, 8.4_
  
  - [x] 4.4 Implement seed requirements file generation
    - Generate EARS-pattern requirements with GIVEN/WHEN/THEN acceptance criteria
    - Include priority labels (P0/P1/P2) and numbered requirements
    - Add header note about SpecDraft v2 generation and Kiro refinement
    - Focus on functional requirements only (no duplication with steering files)
    - _Requirements: 9.1, 9.3, 9.6_

- [x] 5. Checkpoint - Test research and generation modules
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 3: API Routes

- [x] 6. Implement new research API route
  - [x] 6.1 Create `app/api/research/route.ts`
    - Accept POST request with `transcript`, `extractedContext`, `brainstormMessages`
    - Extract flagged gaps from brainstorm messages
    - Call `lib/research-pipeline.ts` → `runResearch()`
    - Handle 60-second timeout with partial results
    - Return `ResearchReport` object and duration
    - Return HTTP 500 with error message on failure
    - _Requirements: 6.1, 6.3, 6.4, 6.6, 6.7, 6.8_

- [x] 7. Implement steering file generation API route
  - [x] 7.1 Create `app/api/generate-steering/route.ts`
    - Accept POST request with `researchReport`, `extractedContext`, `brainstormMessages`, `generateSeedRequirements` flag
    - Call `generateContextSteering()` and `generateAudienceSteering()`
    - Conditionally call `generateSeedRequirements()` if flag is true
    - Prepend YAML front-matter (`---\ninclusion: always\n---\n`) to each steering file
    - Derive feature name using `deriveFeatureName()`
    - Return all generated markdown strings and feature name
    - Return HTTP 500 with error message on failure
    - _Requirements: 7.1, 7.3, 8.1, 8.3, 9.1, 9.4_

- [x] 8. Extend session persistence API routes
  - [x] 8.1 Update `app/api/save-session/route.ts` for v2
    - Accept v2 fields in POST request: `brainstormTranscript`, `researchReport`, `contextSteeringFile`, `audienceSteeringFile`, `seedRequirementsFile`
    - Generate embedding using Gemini `text-embedding-004` from concatenated `intent + domain + contextSteeringFile`
    - Insert row with v2 columns populated, v1 columns left NULL
    - Return `sessionId` on success
    - Return HTTP 500 with descriptive error on database failure
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  
  - [x] 8.2 Create `app/api/save-session/[sessionId]/route.ts`
    - Accept PATCH request with optional `contextSteeringFile`, `audienceSteeringFile`, `seedRequirementsFile`
    - Validate sessionId exists in database
    - Update only provided fields
    - Return success or HTTP 404/500 with error message
    - _Requirements: 14.7_

- [x] 9. Checkpoint - Test API routes
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 4: UI Components

- [x] 10. Create BrainstormAgent component
  - [x] 10.1 Rename and adapt `components/InterviewAgent.tsx` to `components/BrainstormAgent.tsx`
    - Update system prompt to follow startup methodology (Jobs-to-be-Done, problem-before-solution, evidence-based)
    - Implement voice mode using `useConversation` hook from `@elevenlabs/react`
    - Fetch signed URL from `/api/agent-token` on mount
    - Inject dynamic variables: `transcript_summary`, `extracted_intent`, `domain`, `gaps`
    - Track brainstorm messages in state as `BrainstormMessage[]`
    - Flag gaps when user says "I don't know" or equivalent
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [x] 10.2 Implement text chat fallback in BrainstormAgent
    - Render text input and chat log when voice mode unavailable
    - Send messages to Brainstorm_Agent and display responses
    - Activate automatically if signed URL request fails
    - _Requirements: 5.8, 5.9_
  
  - [x] 10.3 Add session end handling in BrainstormAgent
    - Detect when user indicates completion
    - End ElevenLabs session gracefully
    - Summarize key decisions and gaps for Background_Research
    - Trigger research pipeline automatically
    - _Requirements: 5.7, 6.1, 16.6_

- [x] 11. Create ResearchProgress component
  - [x] 11.1 Create `components/ResearchProgress.tsx`
    - Display animated progress indicator during Background_Research
    - Show current research dimension being processed
    - Display completion status for each of 4 dimensions
    - Handle partial results if timeout occurs
    - _Requirements: 6.2, 6.8_

- [x] 12. Create HandoffViewer component
  - [x] 12.1 Create `components/HandoffViewer.tsx` with tabbed layout
    - Display session summary card with date, product name, competitor count, audience segment count, resolved gaps count
    - Implement tabbed viewer for each steering file
    - Render markdown preview using `react-markdown`
    - Add per-file controls: copy-to-clipboard, individual download
    - _Requirements: 14.3, 14.5, 10.5_
  
  - [x] 12.2 Implement inline editing in HandoffViewer
    - Allow editing of steering file content within tabs
    - Add "Save Changes" button that calls `PATCH /api/save-session/[sessionId]`
    - Update local state on successful save
    - _Requirements: 10.6, 14.7_
  
  - [x] 12.3 Implement bundle export in HandoffViewer
    - Add "Download Kiro Bundle" button
    - Use `jszip` to create client-side zip archive
    - Include files at correct paths: `.kiro/steering/project-context.md`, `.kiro/steering/product-audience.md`, `.kiro/specs/{feature-name}/requirements.md` (optional), `.kiro/hooks/specdraft-context.json` (optional)
    - Trigger browser download with filename `specdraft-{feature-name}.zip`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 11.1, 11.2_

- [x] 13. Checkpoint - Test UI components
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 5: Pages & Routing

- [x] 14. Update landing page
  - [x] 14.1 Update `app/page.tsx` with v2 landing content
    - Communicate value proposition: voice-first brainstorm → background research → Kiro steering files
    - Display three-step flow visual (Brain-Dump → Brainstorm → Kiro Handoff)
    - Add primary CTA that navigates to brain-dump intake without full page reload
    - Reuse existing `BraindumpRecorder` and `FileUploadZone` components
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 14.2 Update `app/layout.tsx` metadata
    - Update `<title>` to "SpecDraft v2 - Voice-First AI Brainstorm for Kiro"
    - Update `<meta description>` to reflect v2 purpose
    - _Requirements: 1.4_

- [x] 15. Create brainstorm page
  - [x] 15.1 Create `app/brainstorm/page.tsx`
    - Implement Server Component shell
    - Create Client Component for brainstorm flow
    - Read session state from localStorage: `transcript`, `extractedContext`, `userId`
    - Fetch past sessions via `GET /api/past-sessions?query={intent}&userId={userId}`
    - Render `BrainstormAgent` component with context and past patterns
    - Render `ResearchProgress` component after brainstorm ends
    - _Requirements: 5.1, 5.2, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 21.2_
  
  - [x] 15.2 Implement research pipeline trigger in brainstorm page
    - Call `POST /api/research` with transcript, extractedContext, brainstormMessages
    - Display ResearchProgress during processing
    - Call `POST /api/generate-steering` with researchReport
    - Store results in localStorage
    - Call `POST /api/save-session` with full session data
    - Navigate to `/handoff/[sessionId]` on completion
    - _Requirements: 6.1, 7.1, 8.1, 12.6, 21.3_

- [x] 16. Create handoff viewer page
  - [x] 16.1 Create `app/handoff/[sessionId]/page.tsx`
    - Implement Server Component that fetches session from NeonDB by sessionId
    - Pass session data to `HandoffViewer` Client Component
    - Handle 404 case: display error page with link to landing page
    - Fall back to localStorage if DB fetch fails (for immediate post-save view)
    - _Requirements: 14.1, 14.2, 14.6, 21.4, 21.5_

- [x] 17. Checkpoint - Test end-to-end flow
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 6: Cleanup & Verification

- [x] 18. Remove v1 components from primary flow
  - [x] 18.1 Remove v1 routes and components
    - Remove `app/prd/[sessionId]/page.tsx` from primary flow (keep file for backward compat)
    - Remove `app/api/generate-prd/route.ts` from primary flow
    - Remove `components/PRDViewer.tsx` from primary flow
    - Remove `lib/kiro-spec-generator.ts` and `lib/prd-assembler.ts` from primary flow
    - Update navigation to not reference v1 routes
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 19. Update environment configuration
  - [x] 19.1 Update `.env.example` with v2 requirements
    - Document all required variables: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `GEMINI_API_KEY`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEXT_PUBLIC_APP_URL`
    - Add inline comments describing each variable's purpose
    - _Requirements: 22.1, 22.4, 22.5_
  
  - [x] 19.2 Add environment variable validation
    - Add validation checks in API routes that fail fast with HTTP 500 and clear error messages
    - Ensure no server-side keys are exposed to browser
    - _Requirements: 22.2, 22.3_

- [x] 20. Final verification and testing
  - [x] 20.1 Test complete user flow
    - Test brain-dump recording and file upload
    - Test transcription and context extraction
    - Test brainstorm conversation with voice and text fallback
    - Test research pipeline with all 4 dimensions
    - Test steering file generation
    - Test handoff viewer with editing and export
    - Test session persistence and RAG retrieval
    - _Requirements: All_
  
  - [x] 20.2 Verify error handling
    - Test MediaRecorder not supported fallback
    - Test microphone permission denied fallback
    - Test ElevenLabs API failures
    - Test Gemini API failures
    - Test database write failures
    - Test research pipeline timeout handling
    - Test per-dimension failure handling
    - _Requirements: 2.7, 2.8, 3.4, 3.5, 4.4, 5.9, 6.7, 6.8, 12.5, 13.6_

- [x] 21. Final checkpoint - Production readiness
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- All tasks reference specific requirements for traceability
- Checkpoints ensure incremental validation at phase boundaries
- The implementation follows a bottom-up approach: data layer → business logic → API → UI → pages
- Existing v1 components are reused where possible (`BraindumpRecorder`, `FileUploadZone`, `WaveformVisualizer`)
- v1 database columns and routes are retained for backward compatibility but not used in v2 flow
- Error handling is defensive: per-dimension failures in research pipeline don't block the entire session
- The design uses TypeScript with Next.js 16 App Router conventions
