import {neon} from '@neondatabase/serverless';
import {agentAuthorized,agentContext,agentSlug,agentSearch,refreshAgentMetrics,validateAgentOutput} from '../lib/agent-data.js';
export function makeAgentHandler(connect=neon,env=process.env){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
 if(!agentAuthorized(req,env))return res.status(401).json({error:'Acceso interno requerido.'});
 const slug=req.query?.agent;if(!agentSlug(slug))return res.status(400).json({error:'Agente inválido.'});
 if(!env.DATABASE_URL)return res.status(503).json({error:'Base de datos no disponible.'});
 const sql=connect(env.DATABASE_URL),op=req.query?.op||'context';
 try{
  if(req.method==='GET'&&op==='search'){
   if(!['radar-lectores','prensa','crecimiento'].includes(slug))return res.status(403).json({error:'Este agente no tiene búsqueda habilitada.'});
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
  if(req.method==='POST'&&op==='save'){
   if(!String(req.headers?.['content-type']||'').startsWith('application/json')||req.body?.agent!==slug)return res.status(400).json({error:'Solicitud inválida.'});
   const output=validateAgentOutput(req.body);if(!output)return res.status(400).json({error:'Propuesta inválida.'});
   const rows=await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('agent-output',0,'draft',${JSON.stringify(output)}::jsonb) RETURNING id`;
   return res.status(201).json({saved:true,id:rows[0].id,status:'pending_review',published:false,sent:false});
  }
  return res.status(405).json({error:'Operación no permitida.'});
 }catch{return res.status(502).json({error:'No se pudo completar la lectura o guardado interno. No se enviaron mensajes ni se publicaron contenidos.'});}
};}
export default makeAgentHandler();
