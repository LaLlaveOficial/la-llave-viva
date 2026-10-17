import {refreshAgentMetrics} from './agent-data.js';
import {managerTick} from './manager066.js';
import {enqueue066,claim066,fail066} from './queue066.js';

// Only bounded read-only provider sync and internal preparation. No LLM calls.
export async function operationsTick(sql,env,{refresh=refreshAgentMetrics,prepare=managerTick,owner='houston'}={}){
 const current=(await sql`SELECT date_trunc('hour',now()) AS slot`)[0].slot;
 const previous=(await sql`SELECT status FROM console066_operations_runs WHERE slot=${current}`)[0];
 if(!previous||!['complete','partial'].includes(previous.status))await enqueue066(sql,{key:'operations:'+new Date(current).toISOString(),kind:'operations',payload:{slot:new Date(current).toISOString()}});
 const job=await claim066(sql,owner);if(!job)return {status:'already_reserved',modelCalls:0};
 const slot=job.payload.slot,detail={modelCalls:0,published:false,sent:false,executor:owner,attempt:job.attempts,queueId:job.id};
 await sql`INSERT INTO console066_operations_runs(slot) VALUES(${slot}) ON CONFLICT(slot) DO NOTHING`;
 try{
 for(const [key,run] of [['metrics',()=>refresh(sql,env)],['preparation',()=>prepare(sql)]]){
  try{detail[key]=await run();}catch{detail[key]={status:'failed',reason:'No se pudo completar esta etapa. Se conserva el último dato disponible.'};}
 }
 const failed=Object.values(detail).some(x=>x?.status==='failed');
 const unavailable=detail.metrics?.sources?.some(x=>x.status==='unavailable');
 const status=failed||unavailable?'partial':'complete';
 const done=await sql`WITH finished AS (
 UPDATE console066_queue SET state='complete',result=${JSON.stringify({status,slot,...detail})}::jsonb,owner=NULL,lease_until=NULL,updated_at=now()
 WHERE id=${job.id} AND state='running' AND owner=${owner} AND fence=${job.fence} AND lease_until>now() RETURNING id,fence
 ),projected AS (
 UPDATE console066_operations_runs SET status=${status},finished_at=now(),detail=${JSON.stringify(detail)}::jsonb WHERE slot=${slot} AND EXISTS(SELECT 1 FROM finished) RETURNING slot
 ),events AS (INSERT INTO console066_queue_events(job_id,action,owner,fence) SELECT id,'completed',${owner},fence FROM finished RETURNING id)
 SELECT id FROM finished`;
 if(!done.length)return {status:'lost_lease',modelCalls:0};
 return {slot,status,...detail};
 }catch{await fail066(sql,job,'transient');return {status:'retry_pending',modelCalls:0};}
}
export async function operationsStatus(sql){
 try{return (await sql`SELECT slot,started_at,finished_at,status,detail FROM console066_operations_runs ORDER BY slot DESC LIMIT 1`)[0]||{status:'not_started'};}
 catch{return {status:'unavailable'};}
}
