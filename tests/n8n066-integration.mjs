import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {managerFixture} from './manager066-integration.mjs';
import {enqueue066,claim066,finish066} from '../lib/queue066.js';
import {operationsTick} from '../lib/operations066.js';
import {makeAgentHandler} from '../api/agent-066.js';
const {db,sql}=await managerFixture();
try{
 for(const name of ['operations066','queue066'])await db.exec(await fs.readFile(new URL('../migrations/20261017_'+name+'.sql',import.meta.url),'utf8'));
 const slot=(await sql`SELECT date_trunc('hour',now()) slot`)[0].slot;
 const job=await enqueue066(sql,{key:'operations:'+new Date(slot).toISOString(),kind:'operations',payload:{slot:new Date(slot).toISOString()}});
 const primary=await claim066(sql,'houston',{id:job.id});
 const options={owner:'n8n-backup',refresh:async()=>({sources:[{source:'qa',status:'updated'}]}),prepare:async()=>({created:0})};
 assert.equal((await operationsTick(sql,{},options)).status,'already_reserved');
 await sql`UPDATE console066_queue SET lease_until=now()-interval '1 second' WHERE id=${job.id}`;
 const out=await operationsTick(sql,{},options);assert.equal(out.status,'complete');assert.equal(out.executor,'n8n-backup');assert.equal(out.attempt,2);
 assert.equal(await finish066(sql,primary,{stale:true}),false);
 assert.equal((await sql`SELECT count(*)::int n FROM console066_queue_events WHERE job_id=${job.id} AND action='completed'`)[0].n,1);
 let calls=0;const token='synthetic-n8n-only-token-'.repeat(3),env={N8N_BACKUP_ENABLED:'1',N8N_BACKUP_TOKEN:token,HOUSTON_HOST_TOKEN:'different-houston-token-'.repeat(3),DATABASE_URL:'qa'};
 const handler=makeAgentHandler(()=>sql,env,{maintain:async(_,__,opts)=>{calls++;assert.equal(opts.owner,'n8n-backup');return {...out,metrics:{private:'not-returned'}};}});
 const call=async({auth=token,method='POST',op='queue-backup',handle=handler}={})=>{const r={setHeader(){},status(n){this.code=n;return this;},json(v){this.data=v;return this;}};await handle({method,query:{op},headers:{authorization:'Bearer '+auth}},r);return r;};
 assert.equal((await call({auth:env.HOUSTON_HOST_TOKEN})).code,401);assert.equal((await call({method:'GET'})).code,401);assert.equal(calls,0);
 const result=await call();assert.equal(result.code,200);assert.equal(result.data.executor,'n8n-backup');assert.equal(result.data.metrics,undefined);assert.equal(result.data.modelCalls,0);
 assert.equal((await call({op:'save'})).code,401);
 const disabled=makeAgentHandler(()=>{throw Error('must not connect');},{...env,N8N_BACKUP_ENABLED:'0'});assert.equal((await call({handle:disabled})).code,401);
 const workflow=JSON.parse(await fs.readFile(new URL('../deploy/console066-n8n/operations-backup.json',import.meta.url),'utf8'));assert.equal(workflow.active,false);assert.equal(workflow.nodes.length,2);assert.equal(workflow.nodes[1].parameters.url,'https://www.lallaveoficial.com/api/agent-066?op=queue-backup');assert.equal(workflow.settings.timezone,'America/Santiago');
 console.log('n8n backup passed: narrow auth, disabled gate, no duplicated live lease, expired Houston recovery, stale fence rejection, one completion, inactive secret-free workflow.');
}finally{await db.close();}
