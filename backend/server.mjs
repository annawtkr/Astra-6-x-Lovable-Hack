import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createHandler } from '../supabase/functions/_shared/pipeline.mjs';
try { process.loadEnvFile('.env.local'); } catch(error) { if(error.code!=='ENOENT')throw error; }
const port=Number(process.env.API_PORT||8787);
const handlers=Object.fromEntries(['transcribe','analyse','research','generate'].map(name=>[name,createHandler(name,{apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_TEXT_MODEL||'gpt-4.1-mini',researchModel:process.env.OPENAI_RESEARCH_MODEL||'gpt-4.1',transcriptionModel:process.env.OPENAI_TRANSCRIPTION_MODEL||'gpt-4o-mini-transcribe'})]));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  const allowedHosts=new Set([`localhost:${port}`,`127.0.0.1:${port}`]);
  if(!allowedHosts.has(req.headers.host)){res.writeHead(403);res.end('Invalid host');return;}
  const origin=req.headers.origin;
  if(origin&&!new Set([`http://localhost:${port}`,`http://127.0.0.1:${port}`,'http://localhost:5173','http://127.0.0.1:5173']).has(origin)){res.writeHead(403);res.end('Invalid origin');return;}
  const operation=url.pathname.match(/^\/api\/(transcribe|analyse|research|generate)$/)?.[1];
  if(operation){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>26*1024*1024){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Audio must be smaller than 25 MB.'}));return;}chunks.push(chunk);}const request=new Request(url,{method:req.method,headers:req.headers,...(req.method!=='GET'&&req.method!=='HEAD'?{body:Buffer.concat(chunks)}:{})});const response=await handlers[operation](request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
  if(url.pathname==='/api/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({configured:Boolean(process.env.OPENAI_API_KEY)}));return;}
  const dist=resolve('dist');let file=resolve(dist,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(dist+'/')&&file!==dist){res.writeHead(403);res.end();return;}if(file===dist)file=resolve(dist,'index.html');let body;try{body=await readFile(file);}catch{file=resolve(dist,'index.html');body=await readFile(file);}res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(body);
 }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'The server could not complete this request.'}));}
});
server.listen(port,'127.0.0.1',()=>console.log(`Voice Note Studio server ready at http://127.0.0.1:${port}`));
