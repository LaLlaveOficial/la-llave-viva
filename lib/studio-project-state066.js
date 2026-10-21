import {cloudConfiguration} from './studio-cloud066.js';
import {normalizeProjectState,projectAssetIds} from '../public/centro-066/studio-project-state.js';
export async function studioProjectState066(sql,op,req,env){
 if(!cloudConfiguration(env))return {status:503,data:{error:'Sincronización remota pendiente de activación.'}};
 const b=req.body||{},id=Number(req.method==='GET'?req.query?.projectId:b.projectId);
 if(!Number.isSafeInteger(id)||id<1)return {status:400,data:{error:'Proyecto inválido.'}};
 if(req.method==='GET'&&op==='studio-cloud-project'){
  const row=(await sql`SELECT version,data,updated_at FROM console066_studio_project_state WHERE project_id=${id}`)[0];
  return {status:200,data:row||{version:0,data:null,updated_at:null}};
 }
 if(req.method!=='POST'||op!=='studio-cloud-project-save')return {status:405,data:{error:'Método no permitido.'}};
 const data=normalizeProjectState(b.data);
 if(!data||!Number.isSafeInteger(b.version)||b.version<0)return {status:400,data:{error:'Montaje o versión inválidos.'}};
 const ids=projectAssetIds(data);
 const files=ids.length?await sql`SELECT id::text id FROM console066_studio_media WHERE project_id=${id} AND status='ready' AND deleted_at IS NULL AND id::text IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))`:[];
 if(files.length!==ids.length)return {status:409,data:{error:'Sube y verifica todos los originales antes de guardar el montaje remoto.',reason:'missing_media'}};
 if(!(await sql`SELECT id FROM console066_studio_projects WHERE id=${id}`).length)return {status:404,data:{error:'Proyecto no encontrado.'}};
 const text=JSON.stringify(data);
 const rows=b.version===0?await sql`INSERT INTO console066_studio_project_state(project_id,data) VALUES(${id},${text}::jsonb) ON CONFLICT DO NOTHING RETURNING version,updated_at`:await sql`UPDATE console066_studio_project_state SET version=version+CASE WHEN data IS DISTINCT FROM ${text}::jsonb THEN 1 ELSE 0 END,data=${text}::jsonb,updated_at=now() WHERE project_id=${id} AND version=${b.version} RETURNING version,updated_at`;
 if(!rows.length)return {status:409,data:{error:'El montaje remoto cambió en otro dispositivo. No se sobrescribió.',reason:'version_conflict'}};
 return {status:200,data:{saved:true,...rows[0],media:ids.length,published:false}};
}
