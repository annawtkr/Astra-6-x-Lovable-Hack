import { createFileRoute } from "@tanstack/react-router";
import { researchHandler } from "@/lib/studio/evidence.server";

export const Route = createFileRoute("/api/research")({
  server: {
    handlers: {
      POST: ({ request }) =>
        researchHandler(request, {
          apiKey: process.env["OPENAI_API_KEY"],
          // Extraction + scope check keep the text model; search/verification need a reasoning model (open_page).
          model: process.env["OPENAI_TEXT_MODEL"] || "gpt-4.1-mini",
          searchModel: process.env["OPENAI_RESEARCH_MODEL"] || "gpt-5.5",
          searchEffort: process.env["OPENAI_RESEARCH_EFFORT"] || "low",
        }),
    },
  },
});
