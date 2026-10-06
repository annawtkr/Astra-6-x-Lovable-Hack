import { createHandler } from "./pipeline.server";

type Op = "transcribe" | "analyse" | "generate";

// Wraps the shared OpenAI pipeline. OPENAI_API_KEY is read per request, server-side only.
export function runOperation(op: Op, request: Request): Promise<Response> {
  const handler = createHandler(op, {
    apiKey: process.env["OPENAI_API_KEY"],
    model: process.env["OPENAI_TEXT_MODEL"] || "gpt-4.1-mini",
    transcriptionModel: process.env["OPENAI_TRANSCRIPTION_MODEL"] || "gpt-4o-mini-transcribe",
    allowedOrigin: new URL(request.url).origin,
  });
  return handler(request);
}

export function health(): Response {
  return new Response(JSON.stringify({ configured: Boolean(process.env["OPENAI_API_KEY"]) }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
