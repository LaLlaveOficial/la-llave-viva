// Called only after console-066 session and origin checks. Keys stay server-side.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REF=1500000,MAX_VIDEO=2500000;
const states=new Set(['IN_QUEUE','IN_PROGRESS','COMPLETED','FAILED','CANCELLED','TIMED_OUT']);
export function wanConfiguration(env){
 const enabled=env.STUDIO_WAN_ENABLED==='true';
 const endpoint=env.STUDIO_WAN_ENDPOINT_ID,key=env.RUNPOD_API_KEY;
 const estimate=Number(env.STUDIO_WAN_TEST_ESTIMATE_USD);
 const ceiling=Number(env.STUDIO_WAN_TEST_CEILING_USD);
 const configured=/^[a-zA-Z0-9_-]{5,100}$/.test(endpoint||'')&&typeof key==='string'&&key.length>10;
 const ready=enabled&&configured&&
  Number.isFinite(estimate)&&estimate>0&&Number.isFinite(ceiling)&&ceiling>0&&estimate<=ceiling;
 return {ready,configured,endpoint,key,estimate,ceiling};
}
export function validateWanJob(body){
 if(!body||!UUID.test(body.id||'')||!Number.isSafeInteger(body.projectId)||body.projectId<1||
  typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>4000||
  ![3,5].includes(body.duration)||!['portrait','landscape'].includes(body.orientation)||
  !Number.isSafeInteger(body.seed)||body.seed<0||body.seed>2147483647||body.approveCost!==true)return null;
 if(typeof body.image_base64!=='string'||body.image_base64.length>Math.ceil(MAX_REF/3)*4||
  body.image_base64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.image_base64))return null;
 const bytes=Buffer.from(body.image_base64,'base64');
 if(!bytes.length||bytes.length>MAX_REF||bytes.toString('base64')!==body.image_base64)return null;
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!png&&!jpeg&&!webp)return null;
 return {image_base64:body.image_base64,prompt:body.prompt.trim(),duration:body.duration,orientation:body.orientation,seed:body.seed};
}
async function provider(config,action,fetcher,payload){
 const response=await fetcher('https://api.runpod.ai/v2/'+config.endpoint+'/'+action,{
  method:payload?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(20000),
  headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},
  ...(payload?{body:JSON.stringify(payload)}:{})});
 if(!response.ok)throw Error('El proveedor no confirmó la operación.');
 return response.json();
}
export async function studioWanApi(sql,op,req,env,fetcher=fetch){
 const config=wanConfiguration(env),reply=(status,data)=>({status,data});
 if(op==='studio-wan-capabilities'&&req.method==='GET'){
  let canSubmit=false;
  if(config.ready){
   const rows=await sql`SELECT EXISTS(SELECT 1 FROM console066_wan_jobs
    WHERE created_at>=date_trunc('day',now()) OR status IN ('SUBMITTING','UNKNOWN','IN_QUEUE','IN_PROGRESS')) AS blocked`;
   canSubmit=rows.length===1&&rows[0].blocked===false;
  }
  return reply(200,{
  ready:config.ready,canSubmit,canCheck:config.configured,model:'Wan2.2 TI2V 5B',fps:24,width:704,height:1280,
  estimatedCostUsd:config.ready?config.estimate:null,qualityValidated:false,
  message:config.ready?(canSubmit?'Prueba GPU habilitada; calidad pendiente de verificar.':'Prueba diaria utilizada o trabajo activo. Puedes consultar el último trabajo.'):'Wan de mayor resolución preparado. Falta habilitar y verificar el endpoint GPU.'});
 }
 if(!config.ready&&!(op==='studio-wan-status'&&config.configured))return reply(503,{error:'El endpoint GPU de Wan todavía no está habilitado.'});
 if(op==='studio-wan-submit'&&req.method==='POST'){
  const body=req.body,input=validateWanJob(body);
  if(!input||body.approvedEstimateUsd!==config.estimate)return reply(400,{error:'Referencia, parámetros o aprobación de costo inválidos.'});
  const prior=await sql`SELECT id,provider_id,status FROM console066_wan_jobs WHERE id=${body.id}::uuid AND project_id=${body.projectId}`;
  if(prior.length)return reply(200,{job:prior[0],reused:true});
  // Atomic global lock also handles distinct request IDs submitted concurrently.
  const reserved=await sql`INSERT INTO console066_wan_jobs(id,project_id,status)
   SELECT ${body.id}::uuid,id,'SUBMITTING' FROM console066_studio_projects WHERE id=${body.projectId}
   AND NOT EXISTS(SELECT 1 FROM console066_wan_jobs WHERE created_at>=date_trunc('day',now()))
   ON CONFLICT DO NOTHING RETURNING id,status`;
  if(reserved.length!==1)return reply(409,{error:'Ya existe una prueba hoy o un trabajo pendiente. Revisa su estado antes de generar.'});
  try{
   const result=await provider(config,'run',fetcher,{input});
   if(typeof result.id!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(result.id))throw Error('No se confirmó el identificador del trabajo.');
   const rows=await sql`UPDATE console066_wan_jobs SET provider_id=${result.id},status='IN_QUEUE',updated_at=now() WHERE id=${body.id}::uuid RETURNING id,status`;
   return reply(202,{job:rows[0]});
  }catch{
   await sql`UPDATE console066_wan_jobs SET status='UNKNOWN',updated_at=now() WHERE id=${body.id}::uuid`;
   return reply(502,{error:'No se confirmó el envío. Puede haberse iniciado: no repitas la solicitud; revisa el proveedor.',job:{id:body.id,status:'UNKNOWN'}});
  }
 }
 if(op==='studio-wan-status'&&req.method==='GET'){
  const {id,projectId}=req.query||{};
  if(!UUID.test(id||'')||!Number.isSafeInteger(Number(projectId))||Number(projectId)<1)return reply(400,{error:'Trabajo inválido.'});
  const rows=await sql`SELECT id,provider_id,status FROM console066_wan_jobs WHERE id=${id}::uuid AND project_id=${Number(projectId)}`;
  if(!rows.length)return reply(404,{error:'Trabajo no encontrado.'});
  const job=rows[0];if(!job.provider_id)return reply(200,{job});
  let result;try{result=await provider(config,'status/'+job.provider_id,fetcher);}catch{return reply(502,{error:'No se pudo consultar el estado. El trabajo conserva su ID.'});}
  if(!states.has(result.status))return reply(502,{error:'Estado del proveedor desconocido.'});
  await sql`UPDATE console066_wan_jobs SET status=${result.status},updated_at=now() WHERE id=${id}::uuid`;
  job.status=result.status;
  if(result.status!=='COMPLETED')return reply(200,{job});
  const out=result.output,m=out?.metadata;
  if(out?.error)return reply(200,{job,error:out.error});
  if(typeof out?.video_base64!=='string'||out.video_base64.length>Math.ceil(MAX_VIDEO/3)*4||
    m?.fps!==24||!((m?.width===704&&m?.height===1280)||(m?.width===1280&&m?.height===704))||m?.audio!==false)
   return reply(502,{job,error:'El resultado no cumple el perfil nativo o el límite de transporte.'});
  return reply(200,{job,output:out});
 }
 return reply(405,{error:'Método no permitido.'});
}
