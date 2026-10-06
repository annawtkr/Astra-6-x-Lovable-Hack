import { createHandler } from '../_shared/pipeline.mjs';
Deno.serve(createHandler('research', {
  apiKey: Deno.env.get('OPENAI_API_KEY'),
  researchModel: Deno.env.get('OPENAI_RESEARCH_MODEL') || 'gpt-4.1',
  model: Deno.env.get('OPENAI_TEXT_MODEL') || 'gpt-4.1-mini',
  transcriptionModel: Deno.env.get('OPENAI_TRANSCRIPTION_MODEL') || 'gpt-4o-mini-transcribe',
  allowedOrigin: Deno.env.get('ALLOWED_ORIGIN'),
}));
