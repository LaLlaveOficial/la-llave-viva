// Studio 066 generation metadata API: authentication performed by console-066.
import {validateGenerationMetadata,VIDEO_PROVIDER_CAPABILITIES} from './studio-generation-server.js';
export async function studioGenerationApi(sql,op,req){
 const body=req.body;
 if(op==='studio-video-capabilities'&&req.method==='GET')
  return {status:200,data:{providers:VIDEO_PROVIDER_CAPABILITIES,canGenerate:false,canCharge:false,canExportRemote:false}};
 if(op==='studio-generations'&&req.method==='GET'){
  const projectId=Number(req.query?.projectId);
  if(!Number.isSafeInteger(projectId)||projectId<1)return {status:400,data:{error:'Proyecto inválido.'}};
  const rows=await sql`
   SELECT id::text id,project_id,request,results,status,version,created_at,updated_at
   FROM console066_studio_generations WHERE project_id=${projectId}
   ORDER BY updated_at DESC,id DESC LIMIT 80
  `;
  return {status:200,data:{records:rows,mediaStoredRemotely:false}};
 }
 if(op==='studio-generation'&&req.method==='POST'){
  const item=validateGenerationMetadata(body);
  if(!item)return {status:400,data:{error:'La ficha contiene parámetros o referencias inválidos.'}};
  const reqJSON=JSON.stringify(item.request),resultJSON=JSON.stringify(item.results);
  if(item.action==='create'){
   const saved=await sql`
    WITH created AS (
     INSERT INTO console066_studio_generations(id,project_id,request,results,status)
     SELECT ${item.id}::uuid,id,${reqJSON}::jsonb,${resultJSON}::jsonb,${item.status}
     FROM console066_studio_projects WHERE id=${item.projectId}
     ON CONFLICT (id) DO NOTHING RETURNING *
    ), logged AS (
     INSERT INTO console066_audit(entity,entity_id,action,detail)
     SELECT 'studio-generation',0,'create',
      jsonb_build_object('generationId',id,'projectId',project_id,'status',status)
     FROM created
    ) SELECT id::text id,project_id,request,results,status,version,created_at,updated_at FROM created
   `;
   if(saved.length!==1)return {status:409,data:{error:'No se pudo crear la ficha. Comprueba el proyecto o la existencia de este ID.'}};
   return {status:201,data:{record:saved[0],mediaStoredRemotely:false}};
  }
  const saved=await sql`
   WITH changed AS (
    UPDATE console066_studio_generations
    SET request=${reqJSON}::jsonb,results=${resultJSON}::jsonb,status=${item.status},
      version=version+1,updated_at=now()
    WHERE id=${item.id}::uuid AND project_id=${item.projectId} AND version=${item.version}
    RETURNING *
   ), logged AS (
    INSERT INTO console066_audit(entity,entity_id,action,detail)
    SELECT 'studio-generation',0,'update',
     jsonb_build_object('generationId',id,'projectId',project_id,'version',version,'status',status)
    FROM changed
   ) SELECT id::text id,project_id,request,results,status,version,created_at,updated_at FROM changed
  `;
  if(saved.length!==1)return {status:409,data:{error:'La ficha cambió en otro dispositivo. Actualiza la biblioteca antes de guardar.'}};
  return {status:200,data:{record:saved[0],mediaStoredRemotely:false}};
 }
 return {status:404,data:{error:'Acción de generación no disponible.'}};
}
