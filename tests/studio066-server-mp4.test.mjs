import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {randomUUID,createHash} from 'node:crypto';
import {createStudioEncoder,validateStudioUpload,STUDIO_CHUNK} from '../deploy/console066-houston/studio-encoder.mjs';
import {studioEncodeRequest} from '../lib/studio-encode066.js';
test('upload contract rejects paths, malformed hashes, oversized media and unsupported profiles',()=>{
 const valid={id:randomUUID(),bytes:16,seconds:6,fps:24,quality:'high',resolution:'720p',sha256:'a'.repeat(64)};assert.ok(validateStudioUpload(valid));
 for(const change of [{id:'../../path'},{bytes:129*1024*1024},{seconds:121},{fps:60},{quality:'arbitrary command'},{sha256:'url'}])assert.equal(validateStudioUpload({...valid,...change}),null);
});
test('worker enforces authentication, ordered parts, full-file integrity, serialization and cancellation',async()=>{
 const old=process.env.HOUSTON_HOST_TOKEN,key='studio-unit-test-private-key-only';process.env.HOUSTON_HOST_TOKEN=key;const resources={busy:true};
 const encoder=createStudioEncoder({resources});const server=http.createServer((req,res)=>encoder(req,res,new URL(req.url,'http://localhost')));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,id=randomUUID();
 const request=(op,body={},auth=true)=>fetch(origin+'/?op='+op,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+key}:{})},body:JSON.stringify({id,...body})});
 try{
  assert.equal((await request('init',{},false)).status,401);
  const bytes=Buffer.alloc(STUDIO_CHUNK+32,1);bytes.write('1a45dfa3',0,'hex');const spec={bytes:bytes.length,seconds:6,fps:24,quality:'high',resolution:'720p',sha256:createHash('sha256').update(bytes).digest('hex')};
  assert.equal((await request('init',spec)).status,201);assert.equal((await request('init',spec)).status,200);
  assert.equal((await request('start')).status,409);assert.equal((await request('chunk',{index:1,data:bytes.subarray(0,STUDIO_CHUNK).toString('base64')})).status,400);
  assert.equal((await request('chunk',{index:0,data:'malformed'})).status,400);
  assert.equal((await request('chunk',{index:0,data:bytes.subarray(0,STUDIO_CHUNK).toString('base64')})).status,200);
  assert.equal((await request('chunk',{index:1,data:bytes.subarray(STUDIO_CHUNK).toString('base64')})).status,200);
  assert.equal((await request('start')).status,409,'HyperFrames busy must prevent overlapping encoding');assert.equal((await request('cancel')).status,200);
  assert.equal((await request('start')).status,404);
 }finally{await request('cancel');await new Promise(r=>server.close(r));if(old===undefined)delete process.env.HOUSTON_HOST_TOKEN;else process.env.HOUSTON_HOST_TOKEN=old;}
});
test('console bridge only calls fixed Houston route and never forwards host credentials in the payload',async()=>{
 let args;const fetcher=async(...value)=>{args=value;return {ok:true,json:async()=>({job:{status:'ready'}})};};
 await studioEncodeRequest('status',{id:'local-test-id'},{HOUSTON_HOST_TOKEN:'a'.repeat(64)},fetcher);
 assert.equal(args[0].origin,'https://houston-066-production.up.railway.app');assert.equal(args[0].pathname,'/studio-encode-066');assert.equal(args[1].method,'GET');assert.equal(args[1].redirect,'error');assert.equal(args[1].body,undefined);
 await assert.rejects(studioEncodeRequest('https://attacker.invalid',{},{}));
});
