# SpecDraft — Voice-First AI Product Copilot

SpecDraft turns a raw brain-dump into a polished PRD and a ready-to-use Kiro spec bundle. You talk, the AI interviews you to fill gaps, and you walk away with structured product documentation in minutes.

## What it does

1. **Brain-dump** — record or upload a voice note describing your idea
2. **AI interview** — a conversational agent asks targeted follow-up questions to surface missing context
3. **Export** — generates a PRD (Markdown) and a Kiro spec bundle (requirements + design + tasks) as a ZIP

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, React 19 |
| Styling | Tailwind CSS 4 |
| Speech-to-text | ElevenLabs Scribe v2 |
| Conversational AI | ElevenLabs ConvAI 2.0 |
| LLM + Embeddings | Google Gemini (via Google AI Studio) |
| Database | NeonDB (PostgreSQL + pgvector) |
| ORM / Migrations | Drizzle ORM |

## Prerequisites

- Node.js 18+
- [NeonDB](https://neon.tech) account (free tier works)
- [ElevenLabs](https://elevenlabs.io) account with a ConvAI agent configured
- [Google AI Studio](https://aistudio.google.com) account for a Gemini API key

## Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd spectre

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in your API keys

# 4. Run database migrations
npm run db:push

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Description |
|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs API key — used for Scribe v2 STT and ConvAI 2.0 |
| `ELEVENLABS_AGENT_ID` | ConvAI agent ID created in the ElevenLabs dashboard |
| `GEMINI_API_KEY` | Google Gemini API key for LLM generation and embeddings |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string (runtime queries) |
| `DATABASE_URL_UNPOOLED` | Neon PostgreSQL direct connection string (migrations) |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app, e.g. `http://localhost:3000` |

## Usage

1. Open the app and click **Start Brain-dump** — record or upload a voice note describing your product idea.
2. The AI interview agent asks follow-up questions to fill in missing context (problem, users, constraints, etc.).
3. Click **Generate PRD** to produce a Markdown PRD and a Kiro spec bundle ZIP you can drop straight into your project.

## Project Structure

```
app/                  # Next.js App Router pages and API routes
  api/                # Route handlers (transcribe, gap-fill, generate-prd, etc.)
  interview/          # AI interview page
  prd/[sessionId]/    # PRD viewer page
components/           # React UI components
  BraindumpRecorder   # Voice recording + file upload
  InterviewAgent      # ElevenLabs ConvAI widget
  PRDViewer           # Markdown PRD display + export
lib/                  # Core logic (Gemini, ElevenLabs, PRD assembler, Kiro spec generator)
db/                   # Drizzle schema and database client
```
