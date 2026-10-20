import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {managerFixture} from './manager066-integration.mjs';
import {admitHarnessTool,recordHarnessOutcome,harnessStatus} from '../lib/harness066.js';
import {makeAgentHandler} from '../api/agent-066.js';
import {refreshAgentMetrics} from '../lib/agent-data.js';
const {db,sql}=await managerFixture();
try{
 await db.exec(await fs.readFile(new URL('../migrations/20261020_harness066.sql',import.meta.url),'utf8'));
 const concurrent=await Promise.all(Array.from({length:20},()=>admitHarnessTool(sql,'prensa','search')));
 assert.equal(concurrent.filter(x=>x.allowed).length,6);
 assert.equal((await sql`SELECT used FROM console066_harness_budget WHERE agent='prensa' AND operation='search'`)[0].used,6);
 assert.equal((await sql`SELECT used FROM console066_harness_budget WHERE agent='team' AND operation='search'`)[0].used,6);
 // Rejected role requests do not consume another agent's team allowance.
 for(const role of ['crecimiento','radar-lectores','facebook-comunidad'])await Promise.all(Array.from({length:10},()=>admitHarnessTool(sql,role,'search')));
 assert.equal((await sql`SELECT used FROM console066_harness_budget WHERE agent='team' AND operation='search'`)[0].used,24);
 assert.equal((await admitHarnessTool(sql,'contactos','search')).status,403);
 for(let i=0;i<3;i++){assert.equal((await admitHarnessTool(sql,'contenidos','save')).allowed,true);await recordHarnessOutcome(sql,'contenidos','save',false);}
 assert.equal((await admitHarnessTool(sql,'contenidos','save')).allowed,false);
 await sql`UPDATE console066_harness_budget SET blocked_until=now()-interval '1 second' WHERE agent='contenidos'`;
 assert.equal((await admitHarnessTool(sql,'contenidos','save')).allowed,true);
 await recordHarnessOutcome(sql,'contenidos','save',true);
 assert.equal((await harnessStatus(sql)).usage.find(x=>x.agent==='contenidos').failures,0);
 const env={DATABASE_URL:'qa',HOUSTON_HOST_TOKEN:'qa-only-'.repeat(8)},handler=makeAgentHandler(()=>sql,env);
 const save=async(body)=>{const r={setHeader(){},status(n){this.code=n;return this;},json(x){this.body=x;return this;}};await handler({method:'POST',query:{agent:body.agent,op:'save'},headers:{authorization:'Bearer '+env.HOUSTON_HOST_TOKEN,'content-type':'application/json'},body},r);return r;};
 assert.equal((await save({agent:'contenidos',kind:'analitica',title:'Incorrecto',text:'Este formato no corresponde al agente.'})).code,422);
 assert.equal((await sql`SELECT count(*)::int AS n FROM console066_audit WHERE entity='agent-output'`)[0].n,0);
 const saved=await save({agent:'contenidos',kind:'instagram',title:'Propuesta',text:'Una propuesta completa para revisión de Kike.'});
 assert.equal(saved.code,201);assert.equal(saved.body.published,false);
 const retry=await save({agent:'contenidos',kind:'instagram',title:'Propuesta',text:'Una propuesta completa para revisión de Kike.'});
 assert.equal(retry.code,201);assert.equal(retry.body.id,saved.body.id);
 assert.equal((await sql`SELECT count(*)::int AS n FROM console066_audit WHERE entity='agent-output'`)[0].n,1);
 const output=(await sql`SELECT detail FROM console066_audit WHERE entity='agent-output' ORDER BY id DESC LIMIT 1`)[0].detail;
 assert.equal(output.verification.ok,true);assert.equal(output.status,'pending_review');
 let providerCalls=0;
 const refreshes=await Promise.all(Array.from({length:12},()=>refreshAgentMetrics(sql,{}, {ga4:async()=>{providerCalls++;return {};}})));
 assert.equal(providerCalls,1);assert.equal(refreshes.filter(x=>!x.cached).length,1);
 assert.equal((await refreshAgentMetrics(sql,{}, {ga4:async()=>{throw Error('must not call');}})).cached,true);
 console.log('Harness integration passed: atomic role/team budgets, cooldown, migration replay, server verification and persisted pending-review receipt.');
}finally{await db.close();}
