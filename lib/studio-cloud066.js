// Private Studio 066 media cloud. Credentials are server-only and optional.
// OFF unless a private preview bucket and branch-scoped credentials are explicitly configured.
import {createHmac,createHash} from 'node:crypto';

const allowedMime={
 image:['image/png','image/jpeg','image/webp'],
 video:['video/mp4','video/webm','video/quicktime'],
 audio:['audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm','audio/x-wav']
};
export const CLOUD_MAX_FILE=50*1024*1024;
export const CLOUD_MAX_PROJECT=256*1024*1024;
export const CLOUD_MAX_ITEMS=80;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hex64=/^[a-f0-9]{64}$/;
const positive=n=>Number.isSafeInteger(n)&&n>=1;
const safeFileName=s=>typeof s==='string'&&s.length>0&&s.length<=180&&!/[\x00-\x1f\x7f]/.test(s);
const sha=(s)=>createHash('sha256').update(s).digest('hex');
const encode=x=>encodeURIComponent(x).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const hashHmac=(key,val)=>createHmac('sha256',key).update(val).digest();
const dateTime=(date)=>new Date(date).toISOString().replace(/[:-]|\.\d{3}/g,'');
export function validateAssetIntent(value) {
 if(!value||typeof value!=='object'||!positive(value.projectId)||!uuid.test(String(value.id||'')))return null;
 if(!['image','video','audio'].includes(value.kind)||!allowedMime[value.kind].includes(value.mime))return null;
 if(!safeFileName(value.name)||!Number.isSafeInteger(value.size)||value.size<1||value.size>CLOUD_MAX_FILE||!hex64.test(value.sha256))return null;
 return {projectId:value.projectId,id:value.id,kind:value.kind,mime:value.mime,name:value.name,size:value.size,sha256:value.sha256};
}
export function cloudConfiguration(env) {
 // A disabled or incomplete connector must fail closed and never return remote object links.
 if(env.STUDIO_CLOUD_ENABLED!=='1')return null;
 const {STUDIO_STORAGE_ENDPOINT:raw,STUDIO_STORAGE_BUCKET:bucket,STUDIO_STORAGE_ACCESS_KEY_ID:accessKey,STUDIO_STORAGE_SECRET_ACCESS_KEY:secret,STUDIO_STORAGE_REGION:region,STUDIO_STORAGE_BRANCH_ID:branch}=env;
 if(!raw||!bucket||!accessKey||!secret||!region||!branch)return null;
 if(!/^br-[a-z0-9-]+$/.test(branch)||!/^studio066-[a-z0-9-]{3,55}$/.test(bucket)||!/^[a-zA-Z0-9/_+=.-]{8,256}$/.test(accessKey)||secret.length<16)return null;
 if(!/^[a-z0-9-]+$/.test(region))return null;
 let url;
 try{url=new URL(raw);}catch{return null;}
 if(url.protocol!=='https:'||url.port||url.username||url.password||url.search||url.hash||url.pathname!=='/')return null;
 // Trust only the already selected Neon preview branch, not user-provided hosts or object URLs.
 if(url.hostname!==branch+'.storage.c-11.us-east-1.aws.neon.tech')return null;
 return {endpoint:url.origin,bucket,accessKey,secret,region,branch};
}
export function signCloudUrl(config,method,key,{mime='',checksum='',now=new Date(),expires=120}={}) {
 if(!['PUT','GET','HEAD'].includes(method)||!Number.isSafeInteger(expires)||expires<1||expires>300)throw new Error('Unsupported storage request');
 if(!/^studio066\/projects\/[1-9]\d{0,15}\/[a-f0-9-]{36}$/.test(key))throw new Error('Invalid cloud storage key');
 if(!config||!config.endpoint||!config.secret)throw new Error('Cloud is disabled');
 if(method==='PUT'&&(!mime||!allowedMime[Object.keys(allowedMime).find(k=>allowedMime[k].includes(mime))]?.includes(mime)||!hex64.test(checksum)))throw new Error('Invalid upload headers');
 const host=new URL(config.endpoint).host;
 const datetime=dateTime(now),ymd=datetime.slice(0,8),scope=ymd+'/'+config.region+'/s3/aws4_request';
 const canonicalURI='/'+[config.bucket,...key.split('/')].map(encode).join('/');
 const headers={host};
 if(method==='PUT'){
   headers['content-type']=mime;
   headers['x-amz-checksum-sha256']=Buffer.from(checksum,'hex').toString('base64');
 }
 const headerKeys=Object.keys(headers).sort();
 const signed=headerKeys.join(';');
 const query=[
 ['X-Amz-Algorithm','AWS4-HMAC-SHA256'],
 ['X-Amz-Credential',config.accessKey+'/'+scope],
 ['X-Amz-Date',datetime],
 ['X-Amz-Expires',String(expires)],
 ['X-Amz-SignedHeaders',signed]
 ];
 const canonicalQuery=query.map(([a,b])=>encode(a)+'='+encode(b)).sort().join('&');
 const canonicalHeaders=headerKeys.map(k=>k+':'+headers[k].trim()+'\n').join('');
 const canonicalRequest=[method,canonicalURI,canonicalQuery,canonicalHeaders,signed,'UNSIGNED-PAYLOAD'].join('\n');
 const toSign=['AWS4-HMAC-SHA256',datetime,scope,sha(canonicalRequest)].join('\n');
 const kDate=hashHmac('AWS4'+config.secret,ymd),kRegion=hashHmac(kDate,config.region),kService=hashHmac(kRegion,'s3'),kSigning=hashHmac(kService,'aws4_request');
 const signature=createHmac('sha256',kSigning).update(toSign).digest('hex');
 return {url:config.endpoint+canonicalURI+'?'+canonicalQuery+'&X-Amz-Signature='+signature,headers:method==='PUT'?{'Content-Type':mime,'x-amz-checksum-sha256':headers['x-amz-checksum-sha256']}:{},expiresInSeconds:expires};
}
const keyFor=(projectId,id)=>'studio066/projects/'+projectId+'/'+id;
const allowedOp=['studio-cloud','studio-cloud-assets','studio-cloud-trash-assets','studio-cloud-upload','studio-cloud-confirm','studio-cloud-download','studio-cloud-trash','studio-cloud-restore'];
export async function studioCloudApi(sql,op,req,env,fetcher=fetch){
 if(!allowedOp.includes(op))return {status:404,data:{error:'Acción no disponible.'}};
 const config=cloudConfiguration(env);
 if(op==='studio-cloud'&&req.method==='GET')return {status:200,data:{enabled:!!config,maxFileBytes:CLOUD_MAX_FILE,maxProjectBytes:CLOUD_MAX_PROJECT,maxFiles:CLOUD_MAX_ITEMS,mediaStoredRemotely:!!config,requiresApproval:!config}};
 if(!config)return {status:503,data:{error:'Biblioteca remota no habilitada. Los originales siguen guardados localmente.'}};
 if(['studio-cloud-assets','studio-cloud-trash-assets'].includes(op)&&req.method==='GET'){
   const id=Number(req.query?.projectId);
   if(!positive(id))return {status:400,data:{error:'Proyecto inválido.'}};
   const rows=op==='studio-cloud-assets'
     ?await sql`SELECT id::text id,project_id,name,kind,mime,size_bytes,sha256_hex,status,created_at
        FROM console066_studio_media WHERE project_id=${id} AND status='ready' AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT ${CLOUD_MAX_ITEMS}`
     :await sql`SELECT id::text id,project_id,name,kind,mime,size_bytes,sha256_hex,status,created_at
        FROM console066_studio_media WHERE project_id=${id} AND status='ready' AND deleted_at IS NOT NULL
        ORDER BY deleted_at DESC LIMIT ${CLOUD_MAX_ITEMS}`;
   return {status:200,data:{assets:rows}};
 }
 if(['studio-cloud-trash','studio-cloud-restore'].includes(op)&&req.method==='POST'){
   const {projectId,id}=req.body||{};
   if(!positive(projectId)||!uuid.test(String(id||'')))return {status:400,data:{error:'Archivo o proyecto inválido.'}};
   const rows=op==='studio-cloud-trash'
    ?await sql`UPDATE console066_studio_media SET deleted_at=now(),updated_at=now()
       WHERE id=${id}::uuid AND project_id=${projectId} AND status='ready' AND deleted_at IS NULL
       RETURNING id::text id`
    :await sql`UPDATE console066_studio_media SET deleted_at=NULL,updated_at=now()
       WHERE id=${id}::uuid AND project_id=${projectId} AND status='ready' AND deleted_at IS NOT NULL
       RETURNING id::text id`;
   if(rows.length!==1)return {status:409,data:{error:'No se encontró el archivo en el estado solicitado. Actualiza la biblioteca.'}};
   return {status:200,data:{ok:true,id,trashed:op==='studio-cloud-trash',objectPreserved:true}};
 }
 if(op==='studio-cloud-upload'&&req.method==='POST'){
   const input=validateAssetIntent(req.body);
   if(!input)return {status:400,data:{error:'Archivo o metadatos inválidos.'}};
   const [projectRows,usage]=await Promise.all([
     sql`SELECT EXISTS(SELECT 1 FROM console066_studio_projects WHERE id=${input.projectId}) AS exists`,
     sql`SELECT count(*)::int n,coalesce(sum(size_bytes),0)::bigint::text bytes FROM console066_studio_media WHERE project_id=${input.projectId}`
   ]);
   if(!projectRows[0]?.exists)return {status:404,data:{error:'El proyecto no existe.'}};
   const existing=await sql`SELECT id::text id,project_id,name,mime,size_bytes,sha256_hex,status,object_key
      FROM console066_studio_media WHERE id=${input.id}::uuid AND project_id=${input.projectId} LIMIT 1`;
   if(existing.length===1){
      const e=existing[0];
      if(e.status==='ready')return {status:409,data:{error:'Este original ya está en la nube.'}};
      if(e.sha256_hex!==input.sha256||e.mime!==input.mime||Number(e.size_bytes)!==input.size)return {status:409,data:{error:'El identificador pertenece a otro archivo.'}};
      const retry=signCloudUrl(config,'PUT',e.object_key,{mime:input.mime,checksum:input.sha256});
      return {status:200,data:{id:input.id,uploadUrl:retry.url,headers:retry.headers,expiresInSeconds:retry.expiresInSeconds,resumed:true}};
   }
   if(Number(usage[0].n)>=CLOUD_MAX_ITEMS||Number(usage[0].bytes)+input.size>CLOUD_MAX_PROJECT)return {status:413,data:{error:'Límite de almacenamiento de pruebas alcanzado.'}};
   const key=keyFor(input.projectId,input.id);
   const rows=await sql`INSERT INTO console066_studio_media(id,project_id,name,kind,mime,size_bytes,sha256_hex,object_key,status)
    VALUES (${input.id}::uuid,${input.projectId},${input.name},${input.kind},${input.mime},${input.size},${input.sha256},${key},'pending')
    ON CONFLICT DO NOTHING RETURNING id`;
   if(rows.length!==1)return {status:409,data:{error:'Archivo ya registrado. No se permite sobrescribir originales.'}};
   const signed=signCloudUrl(config,'PUT',key,{mime:input.mime,checksum:input.sha256});
   return {status:201,data:{id:input.id,uploadUrl:signed.url,headers:signed.headers,expiresInSeconds:signed.expiresInSeconds}};
 }
 if(op==='studio-cloud-confirm'&&req.method==='POST'){
   const {projectId,id}=req.body||{};
   if(!positive(projectId)||!uuid.test(String(id||'')))return {status:400,data:{error:'Confirmación inválida.'}};
   const rows=await sql`SELECT id::text id,project_id,object_key,size_bytes,status
     FROM console066_studio_media WHERE id=${id}::uuid AND project_id=${projectId} LIMIT 1`;
   if(rows.length!==1)return {status:404,data:{error:'Archivo no registrado.'}};
   if(rows[0].status==='ready')return {status:200,data:{ok:true,id}};
   const signed=signCloudUrl(config,'HEAD',rows[0].object_key,{expires:60});
   let response;
   try{response=await fetcher(signed.url,{method:'HEAD',signal:AbortSignal.timeout(6000)});}catch{return {status:502,data:{error:'No se pudo comprobar la subida al almacenamiento.'}};}
   if(!response.ok||Number(response.headers.get('content-length'))!==Number(rows[0].size_bytes))
    return {status:409,data:{error:'El archivo todavía no está disponible o su tamaño no coincide.'}};
   const updated=await sql`UPDATE console066_studio_media SET status='ready',updated_at=now()
     WHERE id=${id}::uuid AND project_id=${projectId} AND status='pending' RETURNING id`;
   if(updated.length!==1)return {status:409,data:{error:'El archivo cambió. Actualiza antes de continuar.'}};
   return {status:200,data:{ok:true,id}};
 }
 if(op==='studio-cloud-download'&&req.method==='POST'){
   const {projectId,id}=req.body||{};
   if(!positive(projectId)||!uuid.test(String(id||'')))return {status:400,data:{error:'Archivo inválido.'}};
   const rows=await sql`SELECT id::text id,object_key,name,kind,mime,size_bytes,sha256_hex
     FROM console066_studio_media WHERE id=${id}::uuid AND project_id=${projectId} AND status='ready' AND deleted_at IS NULL LIMIT 1`;
   if(rows.length!==1)return {status:404,data:{error:'Archivo no encontrado o todavía pendiente.'}};
   const signed=signCloudUrl(config,'GET',rows[0].object_key,{expires:90});
   return {status:200,data:{url:signed.url,expiresInSeconds:signed.expiresInSeconds,asset:rows[0]}};
 }
 return {status:405,data:{error:'Método no permitido.'}};
}
