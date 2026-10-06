// Run from project root: node backend/smoke.mjs [path/to/audio.wav]
// Prints only structural results, never credentials or provider responses.
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { createPipeline } from '../supabase/functions/_shared/pipeline.mjs';
try { process.loadEnvFile('.env.local'); } catch {}
const pipeline=createPipeline({apiKey:process.env.OPENAI_API_KEY});
try {
 let transcript='I find voice notes useful when my thoughts feel scattered. Yesterday I recorded a two minute note before writing a LinkedIn post. Reviewing the transcript helped me find my main point, but this is only my personal experience. I still needed to edit the final draft.';
 if(process.argv[2]){const audio=await readFile(process.argv[2]);const form=new FormData();form.append('audio',new Blob([audio]),basename(process.argv[2]));const result=await pipeline.transcribe(new Request('http://localhost/api/transcribe',{method:'POST',body:form}));transcript=result.transcript;console.log('LIVE_TRANSCRIBE_OK',transcript.length,'characters');}
 const {brief}=await pipeline.analyse({transcript});console.log('LIVE_ANALYSE_OK',Object.keys(brief).join(','));
 const {drafts}=await pipeline.generate({transcript,brief});console.log('LIVE_GENERATE_OK',JSON.stringify(drafts.map(d=>({format:d.format,posts:d.posts.length,warnings:d.warnings.length}))));
} catch(error){console.log('LIVE_CHECK_FAILED',error.status||'local',error.status?error.message:'Local file or configuration failure');process.exitCode=1;}
