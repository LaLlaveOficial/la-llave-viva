import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGateway} from '../deploy/console066-houston/gateway.mjs';

const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=server=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});

test('web gateway serves the app but does not add authentication to anonymous engine requests',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'houston-gateway-'));await writeFile(join(dir,'index.html'),'<h1>Houston</h1>');
  const engine=http.createServer((req,res)=>{if(req.url==='/health')return res.end('{"status":"ok"}');res.writeHead(req.headers.authorization==='Bearer owner-test'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify({path:req.url}));});
  const enginePort=await listen(engine);const gateway=createGateway({webRoot:dir,enginePort});const port=await listen(gateway);const base='http://127.0.0.1:'+port;
  try {
    const page=await fetch(base+'/');assert.equal(page.status,200);assert.equal(page.headers.get('x-frame-options'),'DENY');assert.match(await page.text(),/Houston/);
    assert.equal((await fetch(base+'/engine/v1/workspaces')).status,401);
    const authorized=await fetch(base+'/engine/v1/workspaces?limit=1',{headers:{Authorization:'Bearer owner-test'}});assert.equal(authorized.status,200);assert.deepEqual(await authorized.json(),{path:'/v1/workspaces?limit=1'});
    assert.equal((await fetch(base+'/health')).status,200);
    assert.equal((await fetch(base+'/missing.js')).status,404);
    assert.equal((await fetch(base+'/somewhere',{method:'POST'})).status,405);
    assert.equal((await fetch(base+'/%2e%2e%2foutside.txt')).status,404);
  } finally {await close(gateway);await close(engine);await rm(dir,{recursive:true,force:true});}
});

test('engine downtime returns unavailable rather than a fake connected status',async()=>{
  const closed=http.createServer();const enginePort=await listen(closed);await close(closed);
  const gateway=createGateway({enginePort});const port=await listen(gateway);
  try {assert.equal((await fetch('http://127.0.0.1:'+port+'/health')).status,503);}finally{await close(gateway);}
});
