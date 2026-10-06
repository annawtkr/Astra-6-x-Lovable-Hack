# iYap

*Your thoughts. Clearly expressed.* (formerly Voice Note Studio)

A working personal demo: audio or transcript → reviewed meaning → X, X thread and LinkedIn drafts → user-approved simulated publishing. **No real social posts are sent.**

## Run on Lovable
This version is hosted on Lovable (TanStack Start). Add an `OPENAI_API_KEY` secret in the project (Cloud → Secrets) to enable live AI. The key is read only inside server handlers and never reaches the browser. Without it the app shows a clearly labelled sample walkthrough and manual mode. Optional: `OPENAI_TEXT_MODEL`, `OPENAI_TRANSCRIPTION_MODEL`. AI calls go directly to OpenAI — not the Lovable AI gateway.

Source of truth: https://github.com/annawtkr/Astra-6-x-Lovable-Hack (unchanged by this port).

## Behaviour
- Record with MediaRecorder, upload audio up to 25 MB / five minutes, or paste a transcript.
- Review the main point, supporting details, qualifications and uncertainties with verified original excerpts. Contradictions are surfaced, not silently reconciled.
- **Evidence review (optional, step 03).** "Find evidence" turns up to 3 de-duplicated, impersonal, checkable claims into research *questions* (no anecdotes or identifying details) and searches the web with the OpenAI Responses API `web_search` tool (`store: false`), using a reasoning-capable research model (`OPENAI_RESEARCH_MODEL`, default `gpt-5.5` with low reasoning effort) because non-reasoning models cannot open pages for verification. Drafting and transcription models are unchanged. If the research model is unavailable to the key, a recoverable error is shown and your work is preserved. Each original question is kept verbatim. An independent source-verification pass opens every cited page and uses its actual title, year, method, population and measured outcome, noting counterevidence; sources that can't be opened and verified are dropped. A separate scope check caps indirect evidence (e.g. long-form student essays for a question about adults' short posts) at Mixed and turns "no direct study" into Not found — never a new Supported claim. Only URLs returned by tool citations are shown. Percentages without population context are withheld. Cards show status, finding, population, study type/year, limitations, source links and the search date (not exhaustive). Findings are unticked by default; only sourced Supported/Mixed ones can be ticked. Editing the transcript or brief clears stale research; changing selections clears approvals and pending replacements. Drafts cite selected findings compactly as (Surname, Year) or (Surname et al., Year), built only from authors and year printed on the opened source page — never raw links; full source links stay in Evidence review. Findings without a trustworthy author-year citation cannot be selected. Generation and the fidelity audit use only selected evidence; any link in a post, or any citation not matching selected research, is flagged. Sample mode never fakes research.
- Generate an X post, a 3–5 post thread and a LinkedIn draft. A separate OpenAI call checks fidelity against both the transcript and the reviewed brief.
- Generation and regeneration propose replacements; apply or discard explicitly. Editing clears approval. Warnings from the original check remain visible; edited text is labelled as not rechecked.
- Approve each draft and simulate publishing. Activity snapshots preserve the exact approved text and always say “Demo — no post was sent.”
- The browser keeps content only in memory. Reloading clears it. The app does not write audio or transcripts to disk; audio is sent to OpenAI only on transcription. OpenAI's own data policies apply to API processing.

## Architecture
`src/components/Studio.tsx` is the interface. The shared OpenAI pipeline lives in `src/lib/studio/pipeline.server.ts` and is wrapped by TanStack Start server routes:

- POST /api/transcribe: multipart audio → transcript (audio is streamed to OpenAI, never stored)
- POST /api/analyse: transcript → structured source-backed brief
- POST /api/research: transcript + brief → verified evidence cards (web search)
- POST /api/generate: transcript + brief + selected evidence + optional format → drafts with independent fidelity warnings
- GET /api/health: server credential presence (does not prove provider availability)

## Verification
`bun run test` runs the approval rules and the review/approval journey test.

## Built with Lovable and Codex
Lovable generated the initial React interface, visual design, capture controls, meaning editor, draft cards and simulated publishing flow. Codex integrated a source-verified OpenAI pipeline, independent fidelity checks, local runtime, tests and Supabase edge-function wrappers. Lovable then ported the working Codex-built source into this Lovable-hosted app, wrapping the same pipeline in server routes.

## Limits
English text-only output; approximate 280-character X guidance rather than platform weighted counting. AI fidelity review can miss errors: user review remains necessary. Uploaded audio relies on readable browser duration metadata. Recording needs browser microphone permission. No scheduling, social connections, persistent history or analytics.
