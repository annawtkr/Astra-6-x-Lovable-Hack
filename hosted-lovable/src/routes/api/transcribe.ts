import { createFileRoute } from "@tanstack/react-router";
import { runOperation } from "@/lib/studio/handlers.server";

export const Route = createFileRoute("/api/transcribe")({
  server: { handlers: { POST: ({ request }) => runOperation("transcribe", request) } },
});
