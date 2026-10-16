import {connectRequest,parseRPC} from './metricool-connect.js';
import {payloadHash} from './marketing-workspace.js';
const brandId='6252950',timezone='America/Santiago';
const normalized=s=>String(s).replace(/_/g,'').toLowerCase();
export async function openPublishingSession(env,fetcher=fetch){
 const token=await connectRequest('token',env,fetcher);let session,n=0;
 async function rpc(method,params){const r=await fetcher('https://ai.metricool.com/mcp',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(session?{'Mcp-Session-Id':session,'MCP-Protocol-Version':'2025-03-26'}:{})},body:JSON.stringify({jsonrpc:'2.0',id:++n,method,params}),signal:AbortSignal.timeout(25000),redirect:'error'});session=r.headers.get('mcp-session-id')||session;if(!r.ok)throw Error('Metricool no confirmó la consulta.');const v=parseRPC(await r.text());if(v.error)throw Error('Metricool rechazó la solicitud.');return v.result;}
 await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'Operacion066-publication',version:'1.0.0'}});
 const listing=await rpc('tools/list',{}),tools=listing?.tools||[];
 const allowed=['getbrandsettings','getscheduledposts','createscheduledpost'];
 return {available:tools.map(t=>normalized(t.name)).filter(n=>allowed.includes(n)),async call(name,args){if(!allowed.includes(name))throw Error('Herramienta no permitida.');const tool=tools.find(t=>normalized(t.name)===name);if(!tool)throw Error('La conexión no expone esa herramienta.');const r=await rpc('tools/call',{name:tool.name,arguments:args});if(r?.isError)throw Error('El proveedor rechazó la operación; revisa Metricool.');return decodeResult(r);}};
}
export function decodeResult(result){if(result?.structuredContent)return result.structuredContent;const text=result?.content?.filter(x=>x.type==='text').map(x=>x.text).join('\n');try{return JSON.parse(text);}catch{throw Error('El proveedor no entregó un resultado estructurado verificable.');}}
const unwrap=d=>d?.data??d;
function localDate(iso){const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(iso));return parts.replace(' ','T');}
export function publicationPayload(record,type,now=Date.now()){
 if(!record||record.kind!=='content'||record.status!=='approved'||record.approved_hash!==payloadHash(record.data))return null;
 const d=record.data;if(!['instagram','tiktok','facebook'].includes(d.channel)||!['POST','REEL','STORY'].includes(type)||!d.copy||!d.dueAt||!Number.isFinite(Date.parse(d.dueAt))||Date.parse(d.dueAt)<now+5*60000)return null;
 let asset;try{asset=new URL(d.assetUrl);}catch{return null;}
 if(asset.protocol!=='https:'||asset.username||asset.password||asset.search||asset.hash||!(/\.(mp4|jpg|jpeg|png)$/i.test(asset.pathname)))return null;
 const video=/\.mp4$/i.test(asset.pathname);if((type==='REEL'||d.channel==='tiktok')&&!video)return null;
 // This first adapter deliberately supports video TikTok and explicit IG/FB post types.
 return {brandId,channel:d.channel,type,text:d.copy,media:d.assetUrl,date:new Date(d.dueAt).toISOString(),publicationDate:{dateTime:localDate(d.dueAt),timezone}};
}
export function matchingPost(post,payload){return post&&String(post.id||'')&&post.text===payload.text&&post.draft===false&&post.providers?.some(p=>p.network===payload.channel&&['PENDING','AWAITING_CONFIRMATION'].includes(p.status))&&Array.isArray(post.media)&&post.media.includes(payload.media)&&post.publicationDate?.dateTime?.slice(0,19)===payload.publicationDate.dateTime&&post.publicationDate?.timezone===timezone;}
export async function publicationStatus(env,open=openPublishingSession){
 if(env.MARKETING_PUBLISH_ENABLED!=='1')return {enabled:false,ready:false,reason:'Programación desactivada en el servidor. No se crean publicaciones.'};
 try{const session=await open(env);if(!['getbrandsettings','getscheduledposts','createscheduledpost'].every(x=>session.available.includes(x)))return {enabled:true,ready:false,reason:'La conexión no expone todas las herramientas de programación y verificación.'};const brands=unwrap(await session.call('getbrandsettings',{})),brand=Array.isArray(brands)?brands.find(b=>String(b.id)===brandId):null;if(!brand||brand.timezone!==timezone)return {enabled:true,ready:false,reason:'No se confirmó la marca La Llave Oficial y su zona horaria.'};return {enabled:true,ready:true,networks:Object.keys(brand.networksData||{}).filter(k=>['instagramData','tiktokData','facebookData'].includes(k)),reason:'Herramientas y marca verificadas; la aceptación de cada publicación depende de la red y el plan.'};}catch{return {enabled:true,ready:false,reason:'No se pudo verificar la conexión de Metricool. Autorízala desde Métricas y ventas.'};}
}
export async function preparePublication(sql,body){
 if(typeof body.recordId!=='string'||!Number.isSafeInteger(body.version))return {status:400,error:'Selecciona una versión aprobada.'};
 const rows=await sql`SELECT * FROM console066_marketing_records WHERE id=${body.recordId}`;const r=rows[0];if(!r||r.version!==body.version)return {status:409,error:'La pieza cambió. Revisa la versión actual.'};const payload=publicationPayload(r,body.type);if(!payload)return {status:400,error:'Revisa la aprobación, canal, tipo, copy y fecha futura (mínimo cinco minutos). El activo debe ser HTTPS público, estable y terminar en .mp4, .jpg o .png, sin parámetros temporales.'};
 const jobs=await sql`WITH added AS (INSERT INTO console066_publications(record_id,record_version,payload) SELECT id,version,${JSON.stringify(payload)}::jsonb FROM console066_marketing_records WHERE id=${r.id} AND version=${r.version} AND status='approved' ON CONFLICT DO NOTHING RETURNING *) SELECT * FROM added`;
 return jobs.length?{status:201,job:jobs[0],scheduled:false}:{status:409,error:'La versión cambió o ya tiene una solicitud. Revisa su estado; no se duplica.'};
}
export async function executePublication(sql,body,env,open=openPublishingSession){
 if(env.MARKETING_PUBLISH_ENABLED!=='1')return {status:503,error:'La programación está desactivada.'};
 if(body.confirm!==true||!Number.isSafeInteger(body.id))return {status:400,error:'Revisa la publicación exacta y confirma la programación.'};
 // Verify the provider/brand before reserving a one-shot delivery.
 let session;try{session=await open(env);if(!['getbrandsettings','getscheduledposts','createscheduledpost'].every(n=>session.available.includes(n)))return {status:503,error:'La conexión no expone programación y verificación completas.'};const brands=unwrap(await session.call('getbrandsettings',{}));if(!Array.isArray(brands)||!brands.some(b=>String(b.id)===brandId&&b.timezone===timezone))return {status:409,error:'Marca y zona horaria no verificadas.'};}catch{return {status:503,error:'La conexión no está disponible. No se inició la programación.'};}
 const rows=await sql`UPDATE console066_publications p SET status='sending',approved_at=now() FROM console066_marketing_records r WHERE p.id=${body.id} AND p.status='prepared' AND r.id=p.record_id AND r.version=p.record_version AND r.status='approved' AND (p.payload->>'date')::timestamptz>now()+interval '5 minutes' RETURNING p.*`;
 if(rows.length!==1)return {status:409,error:'La pieza cambió, la fecha venció o la solicitud ya se procesó.'};
 const job=rows[0],p=job.payload;
 const info={text:p.text,providers:[{network:p.channel}],publicationDate:p.publicationDate,draft:false,autoPublish:true,saveExternalMediaFiles:true,shortener:false,...(p.channel==='instagram'?{instagramData:{type:p.type,autoPublish:true,showReelOnFeed:true}}:{}),...(p.channel==='facebook'?{facebookData:{type:p.type}}:{})};
 let state='uncertain',providerId=null;
 try{
  const created=unwrap(await session.call('createscheduledpost',{blogId:brandId,date:p.date,info:JSON.stringify(info),mediaFiles:[p.media]}));const post=Array.isArray(created)?created[0]:created;
  providerId=post?.id===undefined?null:String(post.id);
  if(providerId){const result=unwrap(await session.call('getscheduledposts',{brandId,fromDate:new Date(Date.parse(p.date)-86400000).toISOString(),toDate:new Date(Date.parse(p.date)+86400000).toISOString(),timezone,extendedRange:true}));const posts=Array.isArray(result)?result:(result?.posts||[]),confirmed=posts.find(x=>String(x.id)===providerId);
   if(matchingPost(confirmed,p))state=confirmed.providers.some(x=>x.network===p.channel&&x.status==='AWAITING_CONFIRMATION')?'awaiting_confirmation':'scheduled';
  }
 }catch{/* A timeout or unstructured reply is unknown, never permission to retry. */}
 await sql`WITH changed AS (UPDATE console066_publications SET status=${state},provider_id=${providerId},finished_at=now() WHERE id=${job.id} AND status='sending' RETURNING id) INSERT INTO console066_audit(entity,entity_id,action,detail) SELECT 'publication',0,${state},jsonb_build_object('jobId',id,'providerId',${providerId}::text) FROM changed`;
 return {status:state==='uncertain'?502:200,state,scheduled:state==='scheduled',published:false,...(state==='uncertain'?{error:'Resultado no confirmado. Revisa Metricool antes de preparar otra versión; no se repetirá automáticamente.'}:{})};
}
export async function publicationApi(sql,op,body,env){
 if(op==='publication-list')return {status:200,config:await publicationStatus(env),jobs:await sql`SELECT * FROM console066_publications ORDER BY created_at DESC LIMIT 100`};
 if(op==='publication-prepare')return preparePublication(sql,body);
 if(op==='publication-execute')return executePublication(sql,body,env);
 return {status:404,error:'Operación no disponible.'};
}
