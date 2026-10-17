import {refreshAgentMetrics} from './agent-data.js';
import {managerTick} from './manager066.js';

// Only bounded read-only provider sync and internal preparation. No LLM calls.
export async function operationsTick(sql,env,{refresh=refreshAgentMetrics,prepare=managerTick}={}){
 const claimed=await sql`INSERT INTO console066_operations_runs(slot) VALUES(date_trunc('hour',now())) ON CONFLICT DO NOTHING RETURNING slot`;
 if(!claimed.length)return {status:'already_reserved',modelCalls:0};
 const slot=claimed[0].slot,detail={modelCalls:0,published:false,sent:false};
 for(const [key,run] of [['metrics',()=>refresh(sql,env)],['preparation',()=>prepare(sql)]]){
  try{detail[key]=await run();}catch{detail[key]={status:'failed',reason:'No se pudo completar esta etapa. Se conserva el último dato disponible.'};}
 }
 const failed=Object.values(detail).some(x=>x?.status==='failed');
 const unavailable=detail.metrics?.sources?.some(x=>x.status==='unavailable');
 const status=failed||unavailable?'partial':'complete';
 await sql`UPDATE console066_operations_runs SET status=${status},finished_at=now(),detail=${JSON.stringify(detail)}::jsonb WHERE slot=${slot}`;
 return {slot,status,...detail};
}
export async function operationsStatus(sql){
 try{return (await sql`SELECT slot,started_at,finished_at,status,detail FROM console066_operations_runs ORDER BY slot DESC LIMIT 1`)[0]||{status:'not_started'};}
 catch{return {status:'unavailable'};}
}
