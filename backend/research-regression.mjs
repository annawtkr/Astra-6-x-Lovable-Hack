// Opt-in live regression: uses the configured OpenAI key and incurs API usage.
// Run from the project root: node backend/research-regression.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPipeline, evidenceCitations, hasEvidenceCitation } from '../supabase/functions/_shared/pipeline.mjs';
try { process.loadEnvFile('.env.local'); } catch {}
const { transcript } = JSON.parse(await readFile(new URL('../examples/cognitive-offloading-regression.json', import.meta.url), 'utf8'));
const pipeline = createPipeline({ apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
  researchModel: process.env.OPENAI_RESEARCH_MODEL || 'gpt-4.1',
  searchModel: process.env.OPENAI_SEARCH_MODEL || 'gpt-5.5' });
try {
  const { brief } = await pipeline.analyse({ transcript });
  const result = await pipeline.research({ transcript, brief });
  const evidence = result.claims.filter(c => ['supported', 'mixed'].includes(c.status) && evidenceCitations([c]).length);
  assert.ok(evidence.length, 'No selectable, cited research was returned for the regression claim.');
  const { drafts } = await pipeline.generate({ transcript, brief, acceptedEvidence: evidence, format: 'linkedin' });
  const text = drafts[0].posts.join('\n');
  assert.ok(hasEvidenceCitation(text, evidenceCitations(evidence)), 'Draft omitted verified author-year attribution.');
  console.log(JSON.stringify({ claims: result.claims.map(c => ({ status: c.status, sources: c.sources.map(s => ({ title: s.title, year: s.year })) })), draft: text, warnings: drafts[0].warnings }, null, 2));
} catch (e) {
  console.error(e.status ? e.message : e.name === 'AssertionError' ? e.message : 'Regression failed; check local configuration.');
  process.exitCode = 1;
}
