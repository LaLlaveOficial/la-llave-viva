import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {managerFixture} from './manager066-integration.mjs';
import {enqueue066,claim066,finish066,fail066,recover066,probe066} from '../lib/queue066.js';
import {operationsTick,operationsStatus} from '../lib/operations066.js';
const {db,sql}=await managerFixture();
try{
 for(const name of ['operations066','queue066']){const m=await fs.readFile(new URL('../migrations/20261017_'+name+'.sql',import.meta.url),'utf8');await db.exec(m);await db.exec(m);}
 const a=await enqueue066(sql,{key:'one',kind:'probe',payload:{test:true}});const b=await enqueue066(sql,{key:'one',kind:'probe',payload:{test:true}});assert.equal(a.id,b.id);assert.equal(b.created,false);
 await assert.rejects(enqueue066(sql,{key:'one',kind:'probe',payload:{test:false}}));
 const claims=await Promise.all([claim066(sql,'probe-primary',{kind:'probe',id:a.id}),claim066(sql,'probe-backup',{kind:'probe',id:a.id})]);assert.equal(claims.filter(Boolean).length,1);const old=claims.find(Boolean);
 await sql`UPDATE console066_queue SET lease_until=now()-interval '1 second' WHERE id=${a.id}`;
 const next=await claim066(sql,'probe-backup',{kind:'probe',id:a.id});assert.ok(next);assert.ok(next.fence>old.fence);assert.equal(next.attempts,2);
 assert.equal(await finish066(sql,old,{bad:true}),false);assert.equal(await fail066(sql,old),false);assert.equal(await finish066(sql,next,{ok:true}),true);assert.equal(await finish066(sql,next,{duplicate:true}),false);assert.equal(await claim066(sql,'probe-primary',{kind:'probe',id:a.id}),null);
 const quota=await enqueue066(sql,{key:'quota',kind:'probe'});let q=await claim066(sql,'probe-primary',{kind:'probe',id:quota.id});await fail066(sql,q,'quota');assert.equal((await sql`SELECT state FROM console066_queue WHERE id=${quota.id}`)[0].state,'blocked');assert.equal(await claim066(sql,'probe-backup',{kind:'probe',id:quota.id}),null);
 const limited=await enqueue066(sql,{key:'limited',kind:'probe'});for(let i=0;i<3;i++){const j=await claim066(sql,'probe-primary',{kind:'probe',id:limited.id});assert.ok(j);await fail066(sql,j);}assert.equal(await claim066(sql,'probe-backup',{kind:'probe',id:limited.id}),null);
 const external=await enqueue066(sql,{key:'external',kind:'probe',effect:'external'});assert.equal(await claim066(sql,'probe-primary',{kind:'probe',id:external.id}),null);
 // Synthetic fixture: a previously dispatched external action loses its lease.
 await sql`UPDATE console066_queue SET state='running',owner='probe-primary',lease_until=now()-interval '1 second',attempts=1 WHERE id=${external.id}`;await recover066(sql);assert.equal((await sql`SELECT state FROM console066_queue WHERE id=${external.id}`)[0].state,'uncertain');assert.equal(await claim066(sql,'probe-backup',{kind:'probe',id:external.id}),null);
 const proof=await probe066(sql);assert.equal(proof.status,'passed');assert.equal(proof.latePrimaryRejected,true);assert.equal((await probe066(sql)).cached,true);
 // A killed primary from the same hour is recovered by the independent executor.
 const slot=(await sql`SELECT date_trunc('hour',now()) slot`)[0].slot,key='operations:'+new Date(slot).toISOString();
 const ops=await enqueue066(sql,{key,kind:'operations',payload:{slot:new Date(slot).toISOString()}});const killed=await claim066(sql,'houston',{id:ops.id});await sql`UPDATE console066_queue SET lease_until=now()-interval '1 second' WHERE id=${ops.id}`;
 let reads=0;const out=await operationsTick(sql,{}, {owner:'vercel-backup',refresh:async()=>{reads++;return {sources:[{source:'ga4',status:'updated'}]};},prepare:async()=>({created:0})});assert.equal(out.status,'complete');assert.equal(out.executor,'vercel-backup');assert.equal(out.attempt,2);assert.equal(reads,1);assert.equal(await finish066(sql,killed,{bad:true}),false);assert.equal((await operationsTick(sql,{}, {refresh:()=>{throw Error('must not run');}})).status,'already_reserved');
 const projection=(await sql`SELECT status,finished_at,detail FROM console066_operations_runs WHERE slot=${slot}`)[0];assert.equal(projection.status,'complete');assert.ok(projection.finished_at);assert.equal(projection.detail.executor,'vercel-backup');
 assert.equal((await sql`SELECT count(*)::int n FROM console066_queue_events WHERE job_id=${ops.id} AND action='completed'`)[0].n,1);
 await sql`UPDATE console066_operations_runs SET status='running',finished_at=NULL WHERE slot=${slot}`;await sql`UPDATE console066_queue SET state='blocked',reason='attempt_limit' WHERE id=${ops.id}`;assert.equal((await operationsStatus(sql)).status,'failed');
 console.log('Queue failover passed: dedup, concurrent claims, expired lease, stale fences, retry cap, quota block, uncertain external action, backup recovery and atomic completion/projection.');
}finally{await db.close();}
