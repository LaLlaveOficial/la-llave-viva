import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdir,chown,stat,readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bootstrapAgents} from './bootstrap.mjs';

const root=resolve(process.env.HOUSTON_WEB_ROOT || '/houston/packages/web/dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon'};

export function createGateway({webRoot=root,enginePort=4318,agentRelay=relayAgentData}={}) {
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/agent-data'){
        // Only runtimes in this container may use the bridge. Proxy headers
        // cannot turn a public request into an internal request.
        if(!internalAgentClient(req))return void res.writeHead(403).end();
        await agentRelay(req,res,url);return;
      }
      if(url.pathname.startsWith('/engine/') || url.pathname==='/health'){
        const path=url.pathname==='/health'?'/health':url.pathname.slice('/engine'.length)+url.search;
        const headers={...req.headers,host:'127.0.0.1:'+enginePort};
        for(const key of ['connection','proxy-authorization','proxy-connection','keep-alive','upgrade','transfer-encoding']) delete headers[key];
        const upstream=http.request({hostname:'127.0.0.1',port:enginePort,path,method:req.method,headers},r=>{
          res.statusCode=r.statusCode;
          for(const [k,v] of Object.entries(r.headers)) if(v!==undefined && !['connection','transfer-encoding'].includes(k))res.setHeader(k,v);
          res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
          r.pipe(res);
        });
        upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"Motor no disponible."}');});
        req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);return;
      }
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
      const requested=resolve(webRoot,'.'+decodeURIComponent(url.pathname));
      if(requested!==webRoot && !requested.startsWith(webRoot+sep)){res.writeHead(404);res.end();return;}
      let file=requested;
      try {if(!(await stat(file)).isFile())file=resolve(webRoot,'index.html');}
      catch {if(extname(file)){res.writeHead(404);res.end();return;}file=resolve(webRoot,'index.html');}
      const bytes=await readFile(file);
      res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
      res.setHeader('Cache-Control',extname(file)==='.html'?'private, no-store':'public, max-age=3600');
      res.end(req.method==='HEAD'?undefined:bytes);
    } catch {if(!res.headersSent)res.writeHead(500);res.end();}
  });
}
export const internalAgentClient=req=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket?.remoteAddress);

export async function relayAgentData(req,res,url,env=process.env,fetcher=fetch){
 const agent=url.searchParams.get('agent'),op=url.searchParams.get('op')||'context';
 if(!['radar-lectores','contactos','prensa','contenidos','analitica','crecimiento'].includes(agent)||!['context','search','save'].includes(op)||!['GET','POST'].includes(req.method)||(req.method==='POST')!==(op==='save'))return void res.writeHead(400).end();
 if(!env.HOUSTON_HOST_TOKEN||env.HOUSTON_HOST_TOKEN.length<32)return void res.writeHead(503).end();
 const target=new URL('https://www.lallaveoficial.com/api/agent-066');target.searchParams.set('agent',agent);target.searchParams.set('op',op);
 if(op==='search')target.searchParams.set('q',(url.searchParams.get('q')||'').slice(0,351));
 let body='';if(req.method==='POST'){for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>14000)return void res.writeHead(413).end();}}
 const r=await fetcher(target,{method:req.method,headers:{Authorization:'Bearer '+env.HOUSTON_HOST_TOKEN,...(body?{'Content-Type':'application/json'}:{})},body:body||undefined,redirect:'error',signal:AbortSignal.timeout(110000)});
 const result=await r.text();if(result.length>400000)return void res.writeHead(502).end();
 res.writeHead(r.status,{'Content-Type':'application/json','Cache-Control':'private, no-store'});res.end(result);
}

async function start(){
  if(!process.env.HOUSTON_HOST_TOKEN || process.env.HOUSTON_HOST_TOKEN.length<32)throw new Error('Configura un token privado de al menos 32 caracteres.');
  for(const dir of ['/data','/data/workspaces','/data/db']){await mkdir(dir,{recursive:true});if(process.getuid?.()===0)await chown(dir,1000,1000);}
  if(process.getuid?.()===0){process.setgid(1000);process.setuid(1000);}
  const engine=spawn(process.execPath,['/houston/dist/host/main.mjs'],{stdio:'inherit',env:process.env});
  const server=createGateway();server.listen(Number(process.env.PORT||8080),'0.0.0.0');
  void bootstrapAgents();
  let stopping=false;
  const stop=()=>{if(stopping)return;stopping=true;server.close();engine.kill('SIGTERM');setTimeout(()=>process.exit(0),10000).unref();};
  process.on('SIGTERM',stop);process.on('SIGINT',stop);
  engine.on('error',()=>{server.close();process.exitCode=1;});
  engine.on('exit',code=>{server.close();process.exit(stopping?0:(code||1));});
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))await start();
