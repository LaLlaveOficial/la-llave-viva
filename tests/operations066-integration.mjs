import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {managerFixture} from './manager066-integration.mjs';import {operationsTick,operationsStatus} from '../lib/operations066.js';
const {db,sql}=await managerFixture();
try{
 const migration=await fs.readFile(new URL('../migrations/20261017_operations066.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration);
 assert.equal((await operationsStatus(sql)).status,'not_started');let calls=0;
 const deps={refresh:async()=>{calls++;return {checkedAt:new Date().toISOString(),sources:[{source:'ga4',status:'updated'},{source:'googleAds',status:'unavailable'}]};}};
 const results=await Promise.all([operationsTick(sql,{},deps),operationsTick(sql,{},deps)]);assert.equal(calls,1);assert.equal(results.filter(x=>x.status==='already_reserved').length,1);assert.equal(results.filter(x=>x.status==='partial').length,1);
 const status=await operationsStatus(sql);assert.equal(status.status,'partial');assert.ok(status.finished_at);assert.equal(status.detail.modelCalls,0);assert.equal(status.detail.sent,false);assert.equal((await sql`SELECT count(*)::int AS n FROM console066_manager_jobs`)[0].n,6);
 // A failed metrics source must not prevent the independent internal queue stage.
 await sql`DELETE FROM console066_operations_runs`;let prepared=false;
 const failure=await operationsTick(sql,{}, {refresh:async()=>{throw Error('private payload');},prepare:async()=>{prepared=true;return {created:0};}});assert.ok(prepared);assert.equal(failure.status,'partial');assert.ok(!JSON.stringify(failure).includes('private payload'));
 console.log('Operations integration passed: atomic hourly gate, concurrent calls, independent queue, partial provider failure and safe persistent status.');
}finally{await db.close();}
