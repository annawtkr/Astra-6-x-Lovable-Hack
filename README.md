# Voice Note Studio

A working personal demo: audio or transcript → reviewed meaning → X, X thread and LinkedIn drafts → user-approved simulated publishing. **No real social posts are sent.**

## Run locally
Requires Node.js 22+ and pnpm. Run `pnpm install`, then `pnpm build`, then `pnpm start`. Open http://127.0.0.1:8787.

The server reads `OPENAI_API_KEY` from `.env.local` (ignored by Git). Never put this key into browser code or a VITE_ variable. Optional settings are documented in `.env.example`.

For development, run `pnpm start` and `pnpm dev` in separate terminals. Vite proxies /api to the local server. For a no-key walkthrough, leave OPENAI_API_KEY unset: the app offers explicitly labelled sample content and manual editing.

## Behaviour
- Record with MediaRecorder, upload audio up to 25 MB / five minutes, or paste a transcript.
- Review the main point, supporting details, qualifications and uncertainties with verified original excerpts. Contradictions are surfaced, not silently reconciled.
- Generate an X post, a 3–5 post thread and a LinkedIn draft. A separate OpenAI call checks fidelity against both the transcript and the reviewed brief.
- Generation and regeneration propose replacements; apply or discard explicitly. Editing clears approval. Warnings from the original check remain visible; edited text is labelled as not rechecked.
- Approve each draft and simulate publishing. Activity snapshots preserve the exact approved text and always say “Demo — no post was sent.”
- The browser keeps content only in memory. Reloading clears it. The app does not write audio or transcripts to disk; audio is sent to OpenAI only on transcription. OpenAI's own data policies apply to API processing.

## Architecture
React/Vite interface adapted from the initial Lovable scaffold. `backend/server.mjs` serves the built frontend and three endpoints; the reusable pipeline is in `supabase/functions/_shared/pipeline.mjs`.

- POST /api/transcribe: multipart audio → transcript
- POST /api/analyse: transcript → structured source-backed brief
- POST /api/generate: transcript + brief + optional format → drafts with fidelity warnings
- GET /api/health: server credential presence (does not prove provider availability)

Supabase edge-function wrappers for transcribe, analyse and generate are included. To deploy them, configure OPENAI_API_KEY and ALLOWED_ORIGIN server-side, retain JWT verification, and connect an authenticated frontend. The local backend is loopback-only; do not expose it publicly as-is.

## Verification
`pnpm test` runs frontend approval rules. `pnpm test:backend` runs validation, source verification, repair, error handling and independent-audit tests. `node backend/smoke.mjs [audio.wav]` performs live API checks using a fictional fixture and optionally a supplied audio file.

## Built with Lovable and Codex
Lovable generated the initial React interface, visual design, capture controls, meaning editor, draft cards and simulated publishing flow. Codex integrated a source-verified OpenAI pipeline, independent fidelity checks, local runtime, tests and Supabase edge-function wrappers. The functional demo currently runs locally; hosted deployment and Lovable sync remain to be configured.

## Limits
English text-only output; approximate 280-character X guidance rather than platform weighted counting. AI fidelity review can miss errors: user review remains necessary. Uploaded audio relies on readable browser duration metadata. Recording needs browser microphone permission. No scheduling, social connections, persistent history or analytics.
