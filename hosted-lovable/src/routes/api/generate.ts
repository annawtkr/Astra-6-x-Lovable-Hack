import { createFileRoute } from "@tanstack/react-router";
import { runOperation } from "@/lib/studio/handlers.server";

export const Route = createFileRoute("/api/generate")({
  server: { handlers: { POST: ({ request }) => runOperation("generate", request) } },
});
