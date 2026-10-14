import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createStudioEncoder} from '../deploy/console066-houston/studio-encoder.mjs';
export async function startStudioTestServer(port=4175){
 const old=process.env.HOUSTON_HOST_TOKEN,key='studio-test-only-token-with-no-production-access';process.env.HOUSTON_HOST_TOKEN=key;
 const handler=createStudioEncoder(),ids=new Set(),root=resolve('.');
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/console-066'){
   const op=url.searchParams.get('op')?.replace('studio-encode-','');url.searchParams.set('op',op);req.headers.authorization='Bearer '+key;
   const end=res.end.bind(res);res.end=(bytes,...args)=>{try{const j=JSON.parse(bytes).job;if(j?.id)ids.add(j.id);}catch{}return end(bytes,...args);};await handler(req,res,url);return;
  }
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root+'/'))return res.writeHead(403).end();
  try{const bytes=await readFile(path);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return {origin:'http://127.0.0.1:'+server.address().port,stop:async()=>{for(const id of ids)await fetch('http://127.0.0.1:'+server.address().port+'/api/console-066?op=studio-encode-cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});await new Promise(resolve=>server.close(resolve));if(old===undefined)delete process.env.HOUSTON_HOST_TOKEN;else process.env.HOUSTON_HOST_TOKEN=old;}};
}
