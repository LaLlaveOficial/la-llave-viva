import {METRIC_FIELDS,validateMetricImport} from './console-metrics.js';
import {SOCIAL_POST_FIELDS,socialPostReport} from './social-analytics.js';
const UID='ai.metricool.com/la-llave-viva';
const SUBJECT={type:'user',id:'console066-owner'};
export async function connectRequest(action,env,fetcher=fetch){
 if(!env.VERCEL_OIDC_TOKEN)throw new Error('Vercel no entregó la identidad del proyecto para esta conexión.');
 const response=await fetcher(`https://api.vercel.com/v1/connect/${action}/${encodeURIComponent(UID)}`,{method:'POST',headers:{Authorization:`Bearer ${env.VERCEL_OIDC_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({subject:SUBJECT,...(action==='authorize'?{returnUrl:'https://www.lallaveoficial.com/operaciones-066'}:{})}),signal:AbortSignal.timeout(20000)});
 const data=await response.json();
 if(!response.ok){const code=String(data.error?.code||data.code||'');throw new Error(/authorization|no_valid_token/i.test(code)?'Autoriza tu cuenta de Metricool con el botón Conectar Metricool.':`Metricool no está disponible desde Vercel (${response.status}; ${code.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)}).`);}
 if(action==='authorize'){
  const url=data.url||data.authorizationUrl;let parsed;try{parsed=new URL(url);}catch{throw new Error('Vercel no devolvió un enlace de autorización válido.');}
  if(parsed.protocol!=='https:'||!['vercel.com','connect.vercel.com','app.metricool.com'].includes(parsed.hostname))throw new Error('El destino de autorización no fue reconocido.');
  return {url};
 }
 if(typeof data.token!=='string'||!data.token)throw new Error('Vercel no devolvió el permiso de lectura de Metricool.');
 return data.token;
}
export function parseRPC(text){
 try{return JSON.parse(text);}catch{
  for(const event of text.split(/\r?\n\r?\n/)){const value=event.split(/\r?\n/).filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trim()).join('\n');try{const data=JSON.parse(value);if(data.result||data.error)return data;}catch{}}
  throw new Error('La respuesta de Metricool no pudo leerse.');
 }
}
export async function metricoolSync(sql,env,fetcher=fetch){
 const recent=await sql`SELECT detail FROM console066_audit WHERE entity='metricool-sync' AND action='success' AND created_at>now()-interval '2 hours' ORDER BY id DESC LIMIT 1`;
 if(recent.length)return {ok:true,cached:true,...recent[0].detail};
 const token=await connectRequest('token',env,fetcher);let session;let n=0;
 async function rpc(method,params){
  const response=await fetcher('https://ai.metricool.com/mcp',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(session?{'Mcp-Session-Id':session,'MCP-Protocol-Version':'2025-03-26'}:{})},body:JSON.stringify({jsonrpc:'2.0',id:++n,method,params}),signal:AbortSignal.timeout(25000)});
  session=response.headers.get('mcp-session-id')||session;
  if(!response.ok)throw new Error(`Metricool no pudo responder la consulta (${response.status}).`);
  const data=parseRPC(await response.text());if(data.error)throw new Error('Metricool rechazó la consulta de lectura.');return data.result;
 }
 await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'La Llave 066',version:'1.0.0'}});
 // Discovery is read-only. Only the analytic tool below may be called; publishing is never exposed.
 const listing=await rpc('tools/list',{});
 const tool=listing.tools?.find(t=>t.name.replace(/_/g,'').toLowerCase()==='getanalyticsdatabymetrics');
 if(!tool)throw new Error('Metricool no expone la herramienta de métricas esperada para este permiso.');
 const localDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const to=new Date().toISOString();const from=new Date(Date.parse(localDay+'T12:00:00Z')-6*86400000).toISOString().slice(0,10)+'T00:00:00-03:00';
 const saved=[];
 for(const [network,fields] of Object.entries(METRIC_FIELDS)){
  const result=await rpc('tools/call',{name:tool.name,arguments:{brandId:'6252950',from,to,metrics:fields.map(f=>f[0])}});
  if(result.isError)throw new Error(`Metricool no pudo consultar ${network}; las consultas anteriores se conservan.`);
  const raw=result.structuredContent||result.content?.filter(x=>x.type==='text').map(x=>x.text).join('\n');
  let value=raw; if(typeof raw==='string'){try{value=JSON.parse(raw);}catch{throw new Error(`Formato de métricas no reconocido para ${network}.`);}}
  const rows=Array.isArray(value)?value:(value?.data?.rows||value?.rows||value?.data);
  const item=validateMetricImport({network,brandId:'6252950',from,to,rows});
  if(!item)throw new Error(`Las columnas de ${network} no coinciden con la consulta; no se guardaron datos inválidos.`);
  item.collection='oauth';
  await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('metrics',0,'import',${JSON.stringify(item)}::jsonb)`;saved.push(network);
 }
 const postWarnings=[];
 const postFrom=new Date(Date.parse(localDay+'T12:00:00Z')-29*86400000).toISOString().slice(0,10)+'T00:00:00-03:00';
 for(const [network,fields] of Object.entries(SOCIAL_POST_FIELDS)){
  try{
   const result=await rpc('tools/call',{name:tool.name,arguments:{brandId:'6252950',from:postFrom,to,metrics:fields}});
   if(result.isError)throw new Error('Consulta de publicaciones no disponible.');
   const raw=result.structuredContent||result.content?.filter(x=>x.type==='text').map(x=>x.text).join('\n');
   const value=typeof raw==='string'?JSON.parse(raw):raw;
   const report=socialPostReport(network,Array.isArray(value)?value:(value?.data?.rows||value?.rows||value?.data),{from:postFrom,to,checkedAt:new Date().toISOString()});
   await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('social-posts',0,'read',${JSON.stringify(report)}::jsonb)`;
  }catch{postWarnings.push(network+': no se pudo actualizar la consulta de publicaciones; se conserva la anterior.');}
 }
 const detail={networks:saved,postWarnings,syncedAt:new Date().toISOString(),source:'Metricool OAuth'};
 await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('metricool-sync',0,'success',${JSON.stringify(detail)}::jsonb)`;
 return {ok:true,...detail};
}
