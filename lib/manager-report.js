const clean=(value,max=160)=>String(value??'').replace(/[\u0000-\u0008\u000b-\u001f]/g,' ').slice(0,max);
const when=value=>{const date=new Date(value);return Number.isFinite(date.valueOf())?date.toLocaleString('es-CL',{timeZone:'America/Santiago'}):'Fecha no disponible';};
export function renderManagerReport({generatedAt,outputs=[],events=[],videos=[],videoError=false}){
 const lines=['LA LLAVE 066 — INFORME DEL GERENTE','Generado: '+when(generatedAt),'Registro: últimas 24 horas. Hasta 100 propuestas y 500 eventos.','Estado: gerencia de preparación y análisis; ejecución externa autónoma no activada.','Una aprobación o un cambio manual del CRM no confirma un envío ni una publicación.','','PROPUESTAS Y DECISIONES GUARDADAS'];
 for(const r of outputs.slice(0,100)){const d=r.detail||{};lines.push('', '#'+clean(r.id)+' · '+clean(d.title,300),when(r.created_at)+' · '+clean(d.agent)+' · '+clean(d.kind),'Estado: '+(d.status==='approved'?'Texto aprobado; ejecución por comprobar':'Pendiente de revisión'),clean(d.text,30000));}
 if(!outputs.length)lines.push('Sin propuestas guardadas en esta ventana; no implica ausencia de ejecuciones de rutinas.');
 if(outputs.length>100)lines.push('Lista de propuestas recortada.');
 lines.push('','REGISTRO DE OPERACIONES');
 for(const r of events.slice(0,500)){
  const d=r.detail||{};let detail='';
  if(r.entity==='lead')detail='Estado registrado: '+clean(d.status||'creado')+'; texto aprobado: '+(d.approved===true?'sí':'no consta')+'. No acredita contacto externo.';
  else if(r.entity==='task')detail='Estado administrativo: '+clean(d.status)+'. No acredita ejecución por un proveedor.';
  else if(r.entity==='agent-output')detail='Propuesta: '+clean(d.title,300)+'; '+clean(d.status)+'.';
  else if(r.entity==='google-ads-change')detail='Estado registrado: '+clean(d.status||r.action)+'. Verificar la evidencia específica del cambio.';
  else detail='Lectura, importación o inicio registrado; no equivale a venta, envío ni publicación.';
  lines.push(when(r.created_at)+' · #'+clean(r.id)+' · '+clean(r.entity)+' · '+clean(r.action)+' · '+detail);
 }
 if(!events.length)lines.push('Sin eventos registrados en esta ventana.');
 if(events.length>500)lines.push('Lista de eventos recortada.');
 lines.push('','VIDEOS DEL SERVIDOR');
 if(videoError)lines.push('Motor no consultable; estado de videos desconocido.');
 for(const j of videos.slice(0,20))lines.push(when(j.createdAt)+' · '+clean(j.title,300)+' · '+clean(j.duration)+' s · '+clean(j.format)+' · '+(j.status==='ready'?'MP4 terminado y privado; no publicado':j.status==='rendering'?'En proceso':'Render no terminado'));
 lines.push('','COBERTURA Y LÍMITES','El CRM, las propuestas y los MP4 no acreditan ventas ni publicaciones externas.','Videos: últimos 20 proyectos; pueden quedar fuera de la ventana de 24 horas.','No consulta respuestas nuevas de correo/DM ni sustituye los resultados completos de cada rutina.','No calcula gasto ni ventas: consultar fuentes de medición y pagos.','Las compras de prueba de septiembre y octubre son distintas, no una compra duplicada.','TikTok y mensajería: permisos de ejecución por verificar.','');
 return lines.join('\n');
}
export async function managerReport(sql,videoFetcher,generatedAt=new Date().toISOString()){
 const outputs=await sql`SELECT id,detail,created_at FROM console066_audit WHERE entity='agent-output' AND created_at>now()-interval '24 hours' ORDER BY id DESC LIMIT 101`;
 const events=await sql`SELECT id,entity,action,detail,created_at FROM console066_audit WHERE entity IN ('lead','task','agent-output','google-ads-change','google-ads-analysis','metrics','metricool-sync','ga4','meta-ads','apollo') AND created_at>now()-interval '24 hours' ORDER BY id DESC LIMIT 501`;
 let videos=[],videoError=false;try{const result=await videoFetcher();videos=Array.isArray(result.jobs)?result.jobs:[];}catch{videoError=true;}
 return renderManagerReport({generatedAt,outputs,events,videos,videoError});
}
