export const STUDIO_ENGINES = [
  {id:'kling',name:'Kling · referencia de calidad',mode:'manual',description:'Genera en tu proveedor autorizado e importa el clip. API de OP 066 sin conectar.'},
  {id:'veo',name:'Google Veo',mode:'manual',description:'Genera en tu proveedor autorizado e importa el clip. API de OP 066 sin conectar.'},
  {id:'firefly',name:'Adobe Firefly Video',mode:'manual',description:'Genera en Adobe e importa el clip. La conexión de Adobe en ChatGPT no habilita esta API.'},
  {id:'wan',name:'Wan · prueba comparativa',mode:'unconfigured',description:'Modelo abierto. Servicio de GPU todavía sin configurar; calidad por evaluar.'}
];
const text=(v,max)=>typeof v==='string'&&v.length<=max?v.trim():null;
function url(v){if(v==='')return '';if(typeof v!=='string'||v.length>1500)return null;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function validateProject(b){
  if(!b||typeof b!=='object')return null;
  const title=text(b.title,160),brief=text(b.brief,1000),continuity=text(b.continuity,1000);
  if(!title||brief===null||continuity===null||!['9:16','16:9','1:1','4:5'].includes(b.format)||!Array.isArray(b.scenes)||b.scenes.length<1||b.scenes.length>8)return null;
  const scenes=[];
  for(const s of b.scenes){
    if(!s||typeof s!=='object')return null;
    const prompt=text(s.prompt,1200),caption=text(s.caption,300),referenceUrl=url(s.referenceUrl),clipUrl=url(s.clipUrl);
    if(prompt===null||caption===null||referenceUrl===null||clipUrl===null||!STUDIO_ENGINES.some(e=>e.id===s.engine)||!Number.isInteger(s.duration)||s.duration<1||s.duration>30||!['draft','review','accepted'].includes(s.status)||s.status!=='draft'&&!clipUrl)return null;
    scenes.push({prompt,caption,referenceUrl,clipUrl,engine:s.engine,duration:s.duration,status:s.status});
  }
  const result={title,brief,continuity,format:b.format,scenes};
  if(JSON.stringify(result).length>10500)return null;
  return result;
}
export async function studioList(sql){
  const rows=await sql`SELECT id,detail FROM console066_audit WHERE entity='multimedia-project' ORDER BY id DESC LIMIT 50`;
  return {engines:STUDIO_ENGINES,projects:rows.map(r=>({id:r.id,...r.detail})),generationAvailable:false};
}
export async function studioSave(sql,b){
  const project=validateProject(b.project);
  if(!project)return {code:400,error:'Proyecto inválido. Máximo 8 escenas y 10.500 caracteres por proyecto.'};
  if(b.id===undefined){
    const detail={project,version:0,updatedAt:new Date().toISOString()};
    const rows=await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('multimedia-project',0,'create',${JSON.stringify(detail)}::jsonb) RETURNING id,detail`;
    return {code:200,record:{id:rows[0].id,...rows[0].detail}};
  }
  if(!Number.isSafeInteger(b.id)||b.id<1||!Number.isSafeInteger(b.version)||b.version<0)return {code:400,error:'Identificador inválido.'};
  const detail={project,version:b.version+1,updatedAt:new Date().toISOString()};
  const rows=await sql`UPDATE console066_audit SET detail=${JSON.stringify(detail)}::jsonb WHERE id=${b.id} AND entity='multimedia-project' AND (detail->>'version')::integer=${b.version} RETURNING id,detail`;
  return rows.length?{code:200,record:{id:rows[0].id,...rows[0].detail}}:{code:409,error:'El proyecto cambió en otra sesión. Recarga antes de guardar.'};
}
