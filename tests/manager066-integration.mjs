import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {scryptSync} from 'node:crypto';
import {customerFixture} from './customer-mail-fixture.mjs';import {payloadHash} from '../lib/marketing-workspace.js';
import {managerApi,managerTick,planManager,validatePublicSignal,creativeSVG} from '../lib/manager066.js';
import {makeHandler} from '../api/console-066.js';import {makeAgentHandler} from '../api/agent-066.js';
export async function managerFixture(){
 const {db,sql}=await customerFixture();const migration=await fs.readFile(new URL('../migrations/20261016_manager066.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration);
 const brand={title:'La Llave I',author:'Enrique G. Santibañez',rules:'Universo propio; portada real.'},product={title:'La Llave I: Ciudad Central',country:'Chile',format:'físico',url:'https://www.lallaveoficial.com/comprar',stock:null};
 for(const [id,kind,data] of [['brand','brand',brand],['physical-chile','product',product]])await sql`INSERT INTO console066_marketing_records(id,kind,data,status,version,approved_hash,approved_at) VALUES(${id},${kind},${JSON.stringify(data)}::jsonb,'approved',1,${payloadHash(data)},now())`;
 return {db,sql};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const {db,sql}=await managerFixture();
 try{
  const salt='ae'.repeat(16),password='test-only-manager',env={CONSOLE_ORIGIN:'https://example.com',CONSOLE_PASSWORD_HASH:salt+':'+scryptSync(password,salt,64).toString('hex'),CONSOLE_SESSION_SECRET:'test-manager-secret-'.repeat(3),HOUSTON_HOST_TOKEN:'synthetic-manager-secret-'.repeat(3),DATABASE_URL:'test-only'};
  const handler=makeHandler(()=>sql,env);let cookie='';
  const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.data=v;return this}});
  async function call(op,body,origin=env.CONSOLE_ORIGIN){const r=response();await handler({method:body?'POST':'GET',query:{op},body,headers:{origin,cookie,'content-type':'application/json'}},r);return r;}
  assert.equal((await call('manager-read')).code,401);cookie=(await call('login',{password})).headers['Set-Cookie'].split(';')[0];
  assert.equal((await call('manager-tick',{},'https://evil.example')).code,403);
  const concurrent=await Promise.all([managerTick(sql,new Date('2026-10-16T15:00:00Z')),managerTick(sql,new Date('2026-10-16T15:00:00Z'))]);assert.equal(concurrent.reduce((a,r)=>a+r.created,0),6);
  assert.equal((await managerTick(sql,new Date('2026-10-16T16:00:00Z'))).created,0);
  let r=await call('manager-read');assert.equal(r.code,200);assert.equal(r.data.jobs.length,6);assert.equal(r.data.jobs.filter(j=>j.kind==='creative').length,4);assert.equal(r.data.jobs.filter(j=>j.role==='radar-lectores').length,1);
  const image=r.data.jobs.find(j=>j.kind==='creative'),research=r.data.jobs.find(j=>j.kind==='research');
  const svg=await call('manager-creative',{id:image.id});assert.equal(svg.code,200);assert.match(svg.data.svg,/Santibañez/);assert.ok(!creativeSVG({...image.data,hook:'<script>alert(1)</script>'}).includes('<script>'));
  const agent=makeAgentHandler(()=>sql,env),body={agent:'contenidos',kind:'instagram',title:'Propuesta para revisión',text:'Texto completo de propuesta sintética.',managerJobId:image.id};
  const save=async(data)=>{const r=response();await agent({method:'POST',headers:{authorization:'Bearer '+env.HOUSTON_HOST_TOKEN,'content-type':'application/json'},query:{agent:data.agent,op:'save'},body:data},r);return r;};
  assert.equal((await save({...body,agent:'analitica'})).code,409);assert.equal((await save(body)).code,201);assert.equal((await save(body)).code,409);assert.equal((await call('manager-read')).data.jobs.find(j=>j.id===image.id).output_text,body.text);
  assert.equal((await save({...body,managerJobId:research.id})).code,409);
  await db.exec("UPDATE console066_marketing_records SET version=2,status='draft',approved_hash=NULL,approved_at=NULL WHERE id='brand'");
  assert.equal((await call('manager-creative',{id:image.id})).code,409);assert.ok((await managerTick(sql,new Date('2026-10-17T15:00:00Z'))).blocked);
  const signal={id:'source-qa',version:0,sourceUrl:'https://example.com/public-post',category:'community',state:'research',title:'Club de lectura QA',evidence:'Observación pública de una lectura de misterio; actividad por verificar.',observedAt:new Date().toISOString()};
  assert.equal((await call('manager-signal-save',signal)).code,200);assert.equal((await call('manager-signal-save',{...signal,id:'duplicate'})).code,409);
  assert.equal(validatePublicSignal({...signal,evidence:'Correo privado reader@example.test'}),null);assert.equal(validatePublicSignal({...signal,sourceUrl:'https://example.com/?token=private'}),null);assert.equal(validatePublicSignal({...signal,observedAt:'2099-01-01'}),null);
  assert.equal((await call('manager-policy',{version:1,enabled:false,maxDailyDrafts:6})).code,200);assert.equal((await call('manager-policy',{version:1,enabled:true,maxDailyDrafts:12})).code,409);assert.equal(planManager([], {enabled:false}).jobs.length,0);
  assert.equal((await call('manager-job-state',{id:image.id,version:2,state:'published'})).code,400);
  assert.equal((await sql`SELECT count(*)::int n FROM console066_audit WHERE entity='agent-output'`)[0].n,1);assert.equal((await sql`SELECT count(*)::int n FROM console066_mail_recipients WHERE status='sent'`)[0].n,0);
  console.log('Manager Postgres/API passed: auth/CSRF, atomic daily dedup/caps, approved brand/product dependency, stale creative rejection, role-bound one-shot deliveries, linked output evidence, public-signal validation, pause/concurrency and no external actions/spend.');
 }finally{await db.close();}
}
