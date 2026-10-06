import { createHandler } from '../_shared/pipeline.mjs';
Deno.serve(createHandler('generate', {
  apiKey: Deno.env.get('OPENAI_API_KEY'),
  model: Deno.env.get('OPENAI_TEXT_MODEL') || 'gpt-4.1-mini',
  transcriptionModel: Deno.env.get('OPENAI_TRANSCRIPTION_MODEL') || 'gpt-4o-mini-transcribe',
  allowedOrigin: Deno.env.get('ALLOWED_ORIGIN'),
}));
