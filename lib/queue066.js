import {harnessStatus} from './harness066.js';
import {randomUUID,createHash} from 'node:crypto';
const owners=['houston','n8n-backup','vercel-backup','probe-primary','probe-backup'];
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const ownerOK=v=>owners.includes(v);
export async function enqueue066(sql,{key,kind,payload={},effect='internal'}){
 if(typeof key!=='string'||key.length>180||!key||!['operations','probe'].includes(kind)||!['internal','external'].includes(effect)||JSON.stringify(payload).length>4000)throw Error('Tarea inválida.');
 const id=randomUUID(),encoded=JSON.stringify(payload),digest=hash({kind,effect,payload});
 const rows=await sql`INSERT INTO console066_queue(id,dedupe_key,kind,effect,payload,payload_hash) VALUES(${id},${key},${kind},${effect},${encoded}::jsonb,${digest}) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id`;
 const row=rows[0]||(await sql`SELECT id,payload_hash FROM console066_queue WHERE dedupe_key=${key}`)[0];
 if(row?.payload_hash&&row.payload_hash!==digest)throw Error('La clave ya pertenece a otra tarea.');
 return {id:row.id,created:rows.length===1};
}
export async function recover066(sql){
 return sql`WITH recovered AS (
 UPDATE console066_queue SET state=CASE WHEN effect='external' THEN 'uncertain' WHEN attempts>=3 THEN 'blocked' ELSE 'queued' END,
 reason=CASE WHEN effect='external' THEN 'external_result_unknown' WHEN attempts>=3 THEN 'attempt_limit' ELSE 'lease_expired' END,
 owner=NULL,lease_until=NULL,fence=fence+1,updated_at=now()
 WHERE state='running' AND lease_until<=now() RETURNING id,state,fence
 ),events AS (INSERT INTO console066_queue_events(job_id,action,fence) SELECT id,'recovered_'||state,fence FROM recovered RETURNING id)
 SELECT id,state FROM recovered`;
}
export async function claim066(sql,owner,{kind='operations',id=null}={}){
 if(!ownerOK(owner)||!['operations','probe'].includes(kind))throw Error('Ejecutor inválido.');
 await recover066(sql);
 const rows=await sql`WITH candidate AS (
 SELECT id FROM console066_queue WHERE state='queued' AND effect='internal' AND kind=${kind} AND attempts<3 AND available_at<=now() AND (${id}::text IS NULL OR id=${id})
 ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1
 ),claimed AS (
 UPDATE console066_queue q SET state='running',owner=${owner},lease_until=now()+interval '5 minutes',attempts=attempts+1,fence=fence+1,reason=NULL,updated_at=now()
 FROM candidate c WHERE q.id=c.id RETURNING q.*
 ),events AS (INSERT INTO console066_queue_events(job_id,action,owner,fence) SELECT id,'claimed',owner,fence FROM claimed RETURNING id)
 SELECT * FROM claimed`;
 return rows[0]||null;
}
export async function finish066(sql,job,result){
 if(!job||!ownerOK(job.owner)||JSON.stringify(result).length>100000)throw Error('Resultado inválido.');
 const rows=await sql`WITH finished AS (
 UPDATE console066_queue SET state='complete',result=${JSON.stringify(result)}::jsonb,owner=NULL,lease_until=NULL,updated_at=now()
 WHERE id=${job.id} AND state='running' AND owner=${job.owner} AND fence=${job.fence} AND lease_until>now() RETURNING id,fence
 ),events AS (INSERT INTO console066_queue_events(job_id,action,owner,fence) SELECT id,'completed',${job.owner},fence FROM finished RETURNING id)
 SELECT id FROM finished`;
 return rows.length===1;
}
export async function fail066(sql,job,reason='transient'){
 if(!job||!ownerOK(job.owner)||!['transient','quota','permission','external_unknown','simulated_unavailable'].includes(reason))throw Error('Fallo inválido.');
 const rows=await sql`WITH failed AS (
 UPDATE console066_queue SET state=CASE WHEN effect='external' THEN 'uncertain' WHEN ${reason} IN ('quota','permission','external_unknown') OR attempts>=3 THEN 'blocked' ELSE 'queued' END,
 reason=${reason},owner=NULL,lease_until=NULL,fence=fence+1,available_at=now()+CASE WHEN kind='probe' THEN interval '0 seconds' ELSE interval '1 minute' END,updated_at=now()
 WHERE id=${job.id} AND state='running' AND owner=${job.owner} AND fence=${job.fence} AND lease_until>now() RETURNING id,state,fence
 ),events AS (INSERT INTO console066_queue_events(job_id,action,owner,fence) SELECT id,'failed_'||state,${job.owner},fence FROM failed RETURNING id)
 SELECT id FROM failed`;
 return rows.length===1;
}
export async function queueStatus066(sql){
 const jobs=await sql`SELECT id,dedupe_key,kind,effect,state,attempts,fence,owner,lease_until,reason,result,created_at,updated_at FROM console066_queue ORDER BY created_at DESC LIMIT 30`;
 const events=await sql`SELECT job_id,action,owner,fence,created_at FROM console066_queue_events ORDER BY id DESC LIMIT 40`;
 return {jobs,events,harness:await harnessStatus(sql),scope:'Métricas y preparación interna sin IA. Respaldo diario Vercel y ejecución manual desde la consola. n8n y respaldo de modelos no conectados.'};
}
export async function probe066(sql){
 const day=(await sql`SELECT to_char(now() AT TIME ZONE 'America/Santiago','YYYY-MM-DD') AS day`)[0].day;
 const {id}=await enqueue066(sql,{key:'probe:'+day,kind:'probe',payload:{scenario:'primary_unavailable'}});
 const before=(await sql`SELECT state,result FROM console066_queue WHERE id=${id}`)[0];
 if(before.state==='complete')return {cached:true,...before.result};
 const primary=await claim066(sql,'probe-primary',{kind:'probe',id});if(!primary)return {status:'busy',completed:false};
 if(!await fail066(sql,primary,'simulated_unavailable'))return {status:'lost_lease',completed:false};
 const backup=await claim066(sql,'probe-backup',{kind:'probe',id});if(!backup)return {status:'busy',completed:false};
 const result={status:'passed',simulatedFailure:true,completedBy:'probe-backup',modelCalls:0,published:false,sent:false};
 if(!await finish066(sql,backup,result))return {status:'lost_lease',completed:false};
 const latePrimaryAccepted=await finish066(sql,primary,{status:'late'});
 return {...result,completed:true,latePrimaryRejected:!latePrimaryAccepted};
}
