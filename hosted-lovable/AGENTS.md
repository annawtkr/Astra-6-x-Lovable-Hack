<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- AI calls go directly to OpenAI via the shared pipeline in src/lib/studio/pipeline.server.ts, wrapped by server routes under src/routes/api/ — keeps OPENAI_API_KEY server-only and matches the original repo; do not route through the Lovable AI gateway.
- Evidence search and source verification use a separate reasoning-capable research model (OPENAI_RESEARCH_MODEL) with low effort; extraction, scope check, drafting and transcription keep the text/transcription models — non-reasoning models cannot open pages, so verification would always fail.
- Research is bounded to a small number of de-duplicated questions run in parallel — keeps demo latency and cost predictable.
