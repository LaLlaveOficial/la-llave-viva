import test from 'node:test';
import assert from 'node:assert/strict';
import {houstonStatus,AGENT_ROLES,HOUSTON_ORIGIN,agentState} from '../lib/houston-status.js';
import {makeHandler} from '../api/console-066.js';
import {ensureAgents} from '../deploy/console066-houston/bootstrap.mjs';
const secret='test-only-'.repeat(8);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
test('public health cannot claim a private connection or installed agents',async()=>{
  const r=await houstonStatus({},async(url,opts)=>{assert.equal(url,HOUSTON_ORIGIN+'/health');assert.equal(opts.headers.Authorization,undefined);return json({status:'ok'});});
  assert.equal(r.status,'Servidor en línea');assert.ok(r.agents.every(a=>a.status==='Por comprobar'));
});
test('a wrong secret or unreachable engine never produces a connected status',async()=>{
  const r=await houstonStatus({HOUSTON_HOST_TOKEN:secret},async()=>json({privateData:'do not relay'},401));
  assert.equal(r.status,'Sin conexión');assert.ok(!JSON.stringify(r).includes(secret));assert.ok(!JSON.stringify(r).includes('privateData'));
});
test('credential never travels to a configurable foreign host',async()=>{
  let calls=0;const r=await houstonStatus({HOUSTON_HOST_TOKEN:secret,HOUSTON_ORIGIN:'https://foreign.example'},async()=>{calls++;});assert.equal(calls,0);assert.equal(r.status,'Error de configuración');
});
test('mere open requests are not work; live turns and approvals are distinct',()=>{
  assert.equal(agentState({busy:true,turnBusy:false,runningRoutineRuns:0,activeRequests:3},[]),'Inactivo');
  assert.equal(agentState({turnBusy:true},[]),'Trabajando');
  assert.equal(agentState({turnBusy:false},[{pending_interaction:{kind:'approval'}}]),'Esperando aprobación');
});
test('live telemetry sanitizes credentials and runtime payloads while preserving mission titles',async()=>{
  const r=await houstonStatus({HOUSTON_HOST_TOKEN:secret},async(url,opts)=>{
    assert.equal(opts.headers.Authorization,'Bearer '+secret);assert.equal(opts.redirect,'error');
    if(url.endsWith('/engine/agents'))return json([{id:'Work/Radar',name:AGENT_ROLES[0].name,privateField:secret}]);
    if(url.endsWith('/auth/status'))return json({providers:[{provider:'openai-codex',configured:false,login:{info:secret}}]});
    if(url.endsWith('/activity'))return json({turnBusy:true,runningRoutineRuns:0});
    if(url.endsWith('/activities'))return json({items:[{title:'Buscar clubes',status:'running',updated_at:'2026-10-07T17:00:00Z'},{title:'Revisión anterior',status:'done',updated_at:'2026-10-06T17:00:00Z'}]});
    throw new Error('unexpected route');
  });
  assert.equal(r.status,'Conectado');assert.equal(r.modelStatus,'Pendiente');assert.equal(r.agents[0].task,'Buscar clubes');assert.equal(r.agents[0].result,'Revisión anterior');assert.equal(r.agents[0].status,'Trabajando');assert.equal(r.agents[1].status,'Pendiente de importar');assert.ok(!JSON.stringify(r).includes(secret));
});
test('telemetry route requires the same private console session as the CRM',async()=>{
  let calls=0;const env={CONSOLE_ORIGIN:'https://www.lallaveoficial.com',CONSOLE_PASSWORD:'test-only-password',CONSOLE_SESSION_SECRET:secret,DATABASE_URL:'postgresql://test-only',HOUSTON_HOST_TOKEN:secret};
  const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await makeHandler(()=>async()=>{calls++;return [];},env)({method:'GET',query:{op:'houston'},headers:{}},res);assert.equal(res.code,401);assert.equal(calls,0);
});
test('restart import keeps existing agents and their instructions',async()=>{
  const existing=AGENT_ROLES.map((a,i)=>({id:String(i),name:a.name}));let posts=0;
  const fetcher=async(url,opts)=>{if(opts.method==='POST'){posts++;throw new Error('must not overwrite');}return json(existing);};
  const count=await ensureAgents({token:secret,seedRoot:new URL('../agents/',import.meta.url).pathname,fetcher});assert.equal(count,6);assert.equal(posts,0);
});
