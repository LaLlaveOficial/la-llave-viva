import test from 'node:test';
import assert from 'node:assert/strict';
import {houstonConnect} from '../lib/houston-connect.js';
import {makeHandler} from '../api/console-066.js';
const env={HOUSTON_HOST_TOKEN:'test-only-token-'.repeat(5)};
const response=body=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
test('device flow accepts only official OpenAI URL and keeps host token server-side',async()=>{
  const r=await houstonConnect('start',env,async(url,opts)=>{
    assert.equal(url,'https://houston-066-production.up.railway.app/engine/setup-runtime/auth/openai-codex/login?deviceAuth=true');
    assert.equal(opts.method,'POST');assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,'Bearer '+env.HOUSTON_HOST_TOKEN);
    return response({kind:'device_code',verificationUri:'https://auth.openai.com/codex/device',userCode:'TEST-ONLY',hidden:env.HOUSTON_HOST_TOKEN});
  });
  assert.equal(r.verificationUri,'https://auth.openai.com/codex/device');assert.equal(r.userCode,'TEST-ONLY');assert.ok(!JSON.stringify(r).includes(env.HOUSTON_HOST_TOKEN));
});
test('foreign URLs and credential-bearing URLs cannot become authorization links',async()=>{
  for(const verificationUri of ['https://evil.example/device','https://auth.openai.com/codex/device?secret=test','http://auth.openai.com/device','https://user:password@auth.openai.com/device'])
    await assert.rejects(houstonConnect('start',env,async()=>response({kind:'device_code',verificationUri,userCode:'TEST-ONLY'})));
});
test('status strips login codes and credentials; finish cannot capture without authorization',async()=>{
  let calls=0;
  const r=await houstonConnect('finish',env,async()=>{calls++;return response({providers:[{provider:'openai-codex',configured:false,login:{status:'awaiting_user',info:{userCode:'DO-NOT-RETURN'}}}]});});
  assert.deepEqual(r,{status:'awaiting_user'});assert.equal(calls,1);
});
test('successful authorization captures credentials centrally for all agents without returning them',async()=>{
  const paths=[];
  const r=await houstonConnect('finish',env,async(url,opts)=>{
    paths.push(url);
    if(url.endsWith('/auth/status'))return response({providers:[{provider:'openai-codex',configured:true}]});
    assert.ok(url.endsWith('/credential/capture'));assert.equal(opts.body,JSON.stringify({provider:'openai-codex'}));return response({ok:true,provider:'openai-codex',hidden:'never return'});
  });
  assert.deepEqual(r,{status:'connected'});assert.equal(paths.length,2);
});
test('no credentials go to a substituted host and invalid actions fail closed',async()=>{
  let calls=0;const fetcher=()=>{calls++;throw new Error();};
  await assert.rejects(houstonConnect('start',{...env,HOUSTON_ORIGIN:'https://evil.example'},fetcher));
  await assert.rejects(houstonConnect('logout',env,fetcher));assert.equal(calls,0);
});
test('device flow requires a console session and same-origin POST before reaching Houston',async()=>{
  let calls=0;const config={...env,CONSOLE_ORIGIN:'https://www.lallaveoficial.com',CONSOLE_PASSWORD:'test-only-password',CONSOLE_SESSION_SECRET:'test-only-secret'.repeat(4),DATABASE_URL:'postgresql://test-only'};
  const handler=makeHandler(()=>async()=>{calls++;return [];},config);
  const res=()=>({setHeader(){},status(n){this.code=n;return this;},json(){return this;}});
  const first=res();await handler({method:'POST',query:{op:'houston-connect'},headers:{origin:config.CONSOLE_ORIGIN,'content-type':'application/json'},body:{action:'start'}},first);assert.equal(first.code,401);
  const second=res();await handler({method:'POST',query:{op:'houston-connect'},headers:{origin:'https://evil.example','content-type':'application/json'},body:{action:'start'}},second);assert.equal(second.code,403);assert.equal(calls,0);
});
