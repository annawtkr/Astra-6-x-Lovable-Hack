import { createFileRoute } from "@tanstack/react-router";
import { health } from "@/lib/studio/handlers.server";

export const Route = createFileRoute("/api/health")({
  server: { handlers: { GET: () => health() } },
});
