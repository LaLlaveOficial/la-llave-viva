import {facebookCandidate,facebookDraft} from '../lib/facebook-groups066.js';
import {operationsTick} from '../lib/operations066.js';
import {timingSafeEqual} from 'node:crypto';
import {makeInstagramWebhook} from '../lib/instagram-webhook.js';
export const config={api:{bodyParser:false}};
import {neon} from '@neondatabase/serverless';
import {agentAuthorized,agentContext,agentSlug,agentSearch,refreshAgentMetrics,validateAgentOutput} from '../lib/agent-data.js';
export function makeAgentHandler(connect=neon,env=process.env,{maintain=operationsTick}={}){return async(req,res)=>{
 if(req.query?.op==='instagram-webhook')return makeInstagramWebhook(connect,env)(req,res);
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
 if(req.query?.op==='queue-backup'){
  const expected=env.N8N_BACKUP_ENABLED==='1'&&typeof env.N8N_BACKUP_TOKEN==='string'&&env.N8N_BACKUP_TOKEN.length>=32?'Bearer '+env.N8N_BACKUP_TOKEN:null,actual=req.headers?.authorization;
  if(req.method!=='POST'||!expected||typeof actual!=='string'||Buffer.byteLength(actual)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return res.status(401).json({error:'Acceso de respaldo requerido.'});
  if(!env.DATABASE_URL)return res.status(503).json({error:'Base de datos no disponible.'});
  try{
   const result=await maintain(connect(env.DATABASE_URL),{...env,VERCEL_OIDC_TOKEN:req.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN},{owner:'n8n-backup'});
   return res.status(200).json({status:result.status,executor:result.executor||null,slot:result.slot||null,attempt:result.attempt||null,modelCalls:0,published:false,sent:false});
  }catch{return res.status(503).json({error:'Respaldo no disponible. La tarea se conserva.'});}
 }
 if(req.query?.op==='queue-cron'){
  const expected=typeof env.CRON_SECRET==='string'&&env.CRON_SECRET.length>=32?'Bearer '+env.CRON_SECRET:null,actual=req.headers?.authorization;
  if(req.method!=='GET'||!expected||typeof actual!=='string'||Buffer.byteLength(actual)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return res.status(401).json({error:'Acceso interno requerido.'});
  if(!env.DATABASE_URL)return res.status(503).json({error:'Base de datos no disponible.'});
  try{return res.status(200).json(await maintain(connect(env.DATABASE_URL),{...env,VERCEL_OIDC_TOKEN:req.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN},{owner:'vercel-backup'}));}
  catch{return res.status(503).json({error:'Respaldo no disponible. La tarea se conserva.'});}
 }
 if(!agentAuthorized(req,env))return res.status(401).json({error:'Acceso interno requerido.'});
 const slug=req.query?.agent;if(!agentSlug(slug))return res.status(400).json({error:'Agente inválido.'});
 if(!env.DATABASE_URL)return res.status(503).json({error:'Base de datos no disponible.'});
 const sql=connect(env.DATABASE_URL),op=req.query?.op||'context';
 try{
  if(req.method==='POST'&&op==='maintenance'){
   if(slug!=='analitica')return res.status(403).json({error:'Operación reservada a supervisión.'});
   return res.status(200).json(await maintain(sql,{...env,VERCEL_OIDC_TOKEN:req.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN}));
  }
  if(req.method==='GET'&&op==='search'){
   if(!['radar-lectores','prensa','crecimiento','facebook-comunidad'].includes(slug))return res.status(403).json({error:'Este agente no tiene búsqueda habilitada.'});
   const q=req.query?.q;
   const recent=await sql`SELECT COUNT(*)::int AS count FROM console066_audit WHERE entity='agent-search' AND created_at>now()-interval '24 hours'`;
   if(recent[0]?.count>=24)return res.status(429).json({error:'Se alcanzó el límite diario de búsqueda del equipo.'});
   const result=await agentSearch(q,env);
   await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('agent-search',0,'read',${JSON.stringify({agent:slug,source:result.source,checkedAt:result.checkedAt,resultCount:result.results.length})}::jsonb)`;
   return res.status(200).json(result);
  }
  if(req.method==='GET'&&op==='context'){
   let refresh=null;
   if(['analitica','crecimiento','contenidos'].includes(slug))refresh=await refreshAgentMetrics(sql,{...env,VERCEL_OIDC_TOKEN:req.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN});
   return res.status(200).json(await agentContext(sql,slug,refresh));
  }
  if(req.method==='POST'&&['save','facebook-candidate','facebook-draft'].includes(op)){
   if(op!=='save'&&slug!=='facebook-comunidad')return res.status(403).json({error:'Operación reservada al agente de Facebook.'});
   if(req.body===undefined){
    const chunks=[];let size=0;
    for await(const chunk of req){const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=b.length;if(size>12000)return res.status(413).json({error:'Solicitud demasiado grande.'});chunks.push(b);}
    try{req.body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return res.status(400).json({error:'JSON inválido.'});}
   }
   if(!String(req.headers?.['content-type']||'').startsWith('application/json')||req.body?.agent!==slug)return res.status(400).json({error:'Solicitud inválida.'});
   if(op!=='save'){const {status,...result}=await (op==='facebook-candidate'?facebookCandidate(sql,req.body,{agent:true}):facebookDraft(sql,req.body));return res.status(status).json(result);}
   const output=validateAgentOutput(req.body);if(!output)return res.status(400).json({error:'Propuesta inválida.'});
   if(output.managerJobId){
    const rows=await sql`WITH claimed AS (UPDATE console066_manager_jobs SET state='drafted',version=version+1,updated_at=now(),output_id=nextval(pg_get_serial_sequence('console066_audit','id')) WHERE id=${output.managerJobId} AND role=${slug} AND state='queued' AND ((kind='creative' AND channel=${output.kind}) OR (kind='research' AND ${output.kind}='oportunidades') OR (kind='campaign-review' AND ${output.kind}='analitica')) RETURNING output_id),saved AS (INSERT INTO console066_audit(id,entity,entity_id,action,detail) OVERRIDING SYSTEM VALUE SELECT output_id,'agent-output',0,'draft',${JSON.stringify(output)}::jsonb FROM claimed RETURNING id) SELECT id FROM saved`;
    if(!rows.length)return res.status(409).json({error:'La tarea no corresponde al agente o formato, o ya tiene una entrega. Relee manager.jobs antes de continuar.'});
    return res.status(201).json({saved:true,id:rows[0].id,status:'pending_review',published:false,sent:false});
   }
   const rows=await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) SELECT 'agent-output',0,'draft',${JSON.stringify(output)}::jsonb WHERE NOT EXISTS (SELECT 1 FROM console066_manager_jobs WHERE role=${slug} AND state='queued') RETURNING id`;
   if(!rows.length)return res.status(409).json({error:'Hay encargos pendientes para este agente. Relee manager.jobs y entrega uno con managerJobId antes de crear propuestas genéricas.'});
   return res.status(201).json({saved:true,id:rows[0].id,status:'pending_review',published:false,sent:false});
  }
  return res.status(405).json({error:'Operación no permitida.'});
 }catch{return res.status(502).json({error:'No se pudo completar la lectura o guardado interno. No se enviaron mensajes ni se publicaron contenidos.'});}
};}
export default makeAgentHandler();
