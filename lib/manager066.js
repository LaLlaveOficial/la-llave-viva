import {createHash} from 'node:crypto';
import {payloadHash} from './marketing-workspace.js';
import {chileDay} from './customer-mail066.js';
const sha=v=>createHash('sha256').update(v).digest('hex');
const fail=(error,status=400)=>({status,error});
const idOK=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id);
const clean=(v,max)=>typeof v==='string'&&v.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)?v.trim():null;
export const MANAGER_CAPABILITIES=[
 {id:'planning',label:'Priorización y preparación interna',mode:'automatic',detail:'Cola diaria deduplicada al consultar contexto y desde la supervisión operativa de Houston. No acredita que el agente haya terminado.'},
 {id:'image',label:'Imagen publicitaria con portada',mode:'template',detail:'Plantilla vectorial descargable con la portada real. No es generación de imágenes por IA.'},
 {id:'video',label:'Video publicitario',mode:'existing',detail:'Guiones y formatos coordinados con Estudio 066. El render existente monta texto y portada; motores generativos requieren conexión y comprobación.'},
 {id:'publishing',label:'Publicar en redes',mode:'approval',detail:'Requiere pieza exacta aprobada, activo exportado y permiso del canal. Una conexión de métricas no demuestra permiso de publicación.'},
 {id:'outreach',label:'Invitaciones y respuestas',mode:'approval',detail:'Solo destinatarios y conversaciones válidos para el canal, con texto aprobado. Una señal pública no habilita mensajes masivos.'},
 {id:'ads',label:'Presupuesto y anuncios',mode:'approval',detail:'No se concede gasto nuevo. Las modificaciones pasan por las propuestas y aprobaciones existentes de cada plataforma.'},
 {id:'audience',label:'Inteligencia de audiencia',mode:'research',detail:'Contenido, comunidades y contactos profesionales con URL y evidencia. No importa listas de seguidores ni crea suscripciones desde perfiles públicos.'},
 {id:'preferences',label:'Preferencias de clientes',mode:'pending',detail:'Pendiente de formulario voluntario y segmentación. No se infieren gustos privados o atributos sensibles desde fotos o perfiles.'},
 {id:'n8n',label:'n8n como complemento',mode:'pending',detail:'Evaluación pendiente: flujo aislado, costo, recuperación ante fallos y mantenimiento. No instalado.'}
];
const CHOICE=[['instagram','vertical',1080,1920],['facebook','square',1080,1080],['tiktok','vertical',1080,1920],['instagram','square',1080,1080],['facebook','vertical',1080,1920],['instagram','landscape',1920,1080]];
export function planManager(records,policy,now=new Date()){
 if(!policy?.enabled)return {jobs:[],blocked:'Preparación automática pausada.'};
 const approved=kind=>records.filter(r=>r.kind===kind&&r.status==='approved'&&r.approved_hash===payloadHash(r.data));
 const brand=approved('brand')[0],product=approved('product').find(r=>r.data.country==='Chile'&&r.data.format&&r.data.stock!==0);
 if(!brand||!product)return {jobs:[],blocked:'Aprueba la marca y un producto de Chile con formato, enlace y disponibilidad revisada antes de preparar piezas.'};
 const day=chileDay(now),n=Math.max(1,Math.min(12,policy.max_daily_drafts||6));
 const key=`${day}:${brand.id}:${brand.version}:${product.id}:${product.version}`;
 const hooks=['¿Qué puerta abre el código 066?','El silencio tiene un precio.','Tu próxima lectura empieza en Ciudad Central.'];
 const jobs=CHOICE.slice(0,Math.max(1,Math.min(6,n-2))).map(([channel,format,width,height],i)=>{
  const dedupe=`creative:${key}:${channel}:${format}`;
  const link=new URL(product.data.url);link.searchParams.set('utm_source',channel);link.searchParams.set('utm_medium','social');link.searchParams.set('utm_campaign','gerencia066_'+day);link.searchParams.set('utm_content',format+'_'+i);
  return {id:'mgr-'+sha(dedupe).slice(0,28),dedupe,kind:'creative',role:'contenidos',channel,data:{title:`${product.data.title} · ${channel} · ${format}`,day,format,width,height,hook:hooks[i%hooks.length],message:'Misterio, suspenso y distopía en español.',cta:'Conoce el primer libro de la saga',link:link.href,brandId:brand.id,brandVersion:brand.version,brandHash:brand.approved_hash,productId:product.id,productVersion:product.version,productHash:product.approved_hash,goal:'Compra del libro físico en Chile',scope:'Borrador de plantilla y guion. No contiene un MP4 generado, no publica y no ofrece descuento.',instructions:'Preparar copy, guion por tiempos y dirección visual, respetando portada real, autor Santibañez sin tilde y universo propio. No inventar testimonios, escenas ni promociones. Guardar el resultado como propuesta para revisión vinculando managerJobId.'}};
 });
 const tasks=[
  {kind:'research',role:'radar-lectores',channel:'web',title:'Radar de comunidades y contenido afín',instructions:'Investiga hasta tres fuentes públicas con fecha y URL exacta: contenido de referencia, clubes o contactos profesionales. Distingue observación y afinidad hipotética de intención de compra expresada. No extraigas seguidores ni añadas perfiles a mailing. No envíes mensajes; prepara invitaciones para revisión solo para canales y destinatarios apropiados.'},
  {kind:'campaign-review',role:'analitica',channel:'ads',title:'Revisión comercial con evidencia',instructions:'Consulta métricas directas con fuente, fecha y periodo. Prioriza tres decisiones para ventas de Chile y comunidad de los países acordados. Separa pagos, pruebas y atribución, declara muestra insuficiente. No cambies anuncios, presupuesto ni públicos; entrega propuestas exactas para revisión.'}
 ];
 for(const task of tasks){if(jobs.length>=n)break;const dedupe=task.kind+':'+day;jobs.push({id:'mgr-'+sha(dedupe).slice(0,28),dedupe,kind:task.kind,role:task.role,channel:task.channel,data:{title:task.title,day,instructions:task.instructions,goal:'Ventas y comunidad con evidencia'}});}
 return {jobs,blocked:null};
}
export async function managerTick(sql,now=new Date()){
 const policy=(await sql`SELECT * FROM console066_manager_policy WHERE id=1`)[0];
 const records=await sql`SELECT id,kind,data,status,version,approved_hash FROM console066_marketing_records WHERE kind IN ('brand','product')`;
 const plan=planManager(records,policy,now);let created=0;
 // One atomic daily gate freezes the selection. Concurrent contexts cannot create another batch.
 // The same query enforces the 24-open-task cap; no external execution happens here.
 if(plan.jobs.length){
  const packed=plan.jobs.map(j=>({id:j.id,dedupe_key:j.dedupe,kind:j.kind,role:j.role,channel:j.channel,data:j.data}));
  const r=await sql`WITH gate AS (INSERT INTO console066_manager_days(day) SELECT ${chileDay(now)} WHERE (SELECT count(*) FROM console066_manager_jobs WHERE state IN ('queued','drafted','review','blocked'))<24 ON CONFLICT DO NOTHING RETURNING day), added AS (INSERT INTO console066_manager_jobs(id,dedupe_key,kind,role,channel,data) SELECT x.id,x.dedupe_key,x.kind,x.role,x.channel,x.data FROM gate CROSS JOIN jsonb_to_recordset(${JSON.stringify(packed)}::jsonb) AS x(id text,dedupe_key text,kind text,role text,channel text,data jsonb) LIMIT GREATEST(0,24-(SELECT count(*)::int FROM console066_manager_jobs WHERE state IN ('queued','drafted','review','blocked'))) ON CONFLICT DO NOTHING RETURNING id) SELECT count(*)::int n FROM added`;
  created=r[0]?.n||0;
 }
 const detail={checkedAt:now.toISOString(),created,blocked:plan.blocked,mode:'internal-preparation',externalSpendAuthorized:0};
 await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES('manager066',0,'tick',${JSON.stringify(detail)}::jsonb)`;
 return detail;
}
export async function managerAgentContext(sql,slug){
 let tick=null;if(['crecimiento','analitica','contenidos'].includes(slug))tick=await managerTick(sql);
 const policy=(await sql`SELECT enabled,max_daily_drafts FROM console066_manager_policy WHERE id=1`)[0];
 const jobs=await sql`SELECT id,kind,role,channel,data,state,version,created_at FROM console066_manager_jobs WHERE state IN ('queued','drafted','review','blocked') AND (${slug}='crecimiento' OR role=${slug}) ORDER BY CASE WHEN state='queued' THEN 0 ELSE 1 END,created_at,id LIMIT 12`;
 const signals=await sql`SELECT category,title,source_url,evidence,observed_at,state FROM console066_public_signals WHERE state<>'dismissed' ORDER BY observed_at DESC LIMIT 20`;
 const backlog=await sql`SELECT role,state,count(*)::int AS total FROM console066_manager_jobs WHERE state IN ('queued','drafted','review','blocked') GROUP BY role,state ORDER BY role,state`;
 return {policy,jobs,backlog,signals,tick,scope:'Preparación interna. Atiende hasta cuatro queued de tu rol, del más antiguo al más reciente; omite los ya entregados. Guarda por separado con managerJobId y texto completo. Creative usa kind igual a channel; research usa oportunidades; campaign-review usa analitica. Confirma saved:true e id. Un borrador no equivale a publicación ni tarea cerrada. El backend verificará rol y tarea. No enviar ni publicar; no solicitar presupuesto o permisos a fuentes externas.'};
}
export function validatePublicSignal(b,now=Date.now()){
 if(!b||!idOK(b.id)||!Number.isSafeInteger(b.version)||b.version<0||!['competitor','community','professional','inbound-interest'].includes(b.category)||!['research','qualified','dismissed'].includes(b.state))return null;
 const title=clean(b.title,140),evidence=clean(b.evidence,2000);if(!title||!evidence||evidence.length<20||typeof b.sourceUrl!=='string'||b.sourceUrl.length>2000)return null;
 // This table stores public observations, never private delivery details or email lists.
 if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(title+' '+evidence)||/Bearer\s|api[_ -]?key|contraseña|password/i.test(title+' '+evidence))return null;
 let u;try{u=new URL(b.sourceUrl);}catch{return null;}
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||!u.hostname.includes('.')||/^(localhost|127\.|169\.254\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname))return null;
 const observed=Date.parse(b.observedAt);if(!Number.isFinite(observed)||observed>now+60000)return null;
 return {id:b.id,version:b.version,title,evidence,category:b.category,state:b.state,sourceUrl:u.href,sourceHash:sha(u.href),observedAt:new Date(observed).toISOString()};
}
const xml=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function creativeSVG(data){
 const w=data.width,h=data.height,landscape=w>h,x=landscape?120:80,y=landscape?230:250,font=landscape?75:66,coverH=landscape?660:h===1080?420:760,coverX=landscape?w-570:w/2-190,coverY=landscape?160:h===1080?410:570;
 const words=String(data.hook||'La Llave I').split(' '),lines=[];let line='';for(const word of words){if((line+' '+word).trim().length>25){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Borrador publicitario La Llave I"><defs><radialGradient id="bg"><stop stop-color="#253c43"/><stop offset="1" stop-color="#080d11"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#bg)"/><path d="M0 ${h-95}H${w}" stroke="#dfb864" stroke-width="4"/><text x="${x}" y="110" fill="#dfb864" font-family="Arial,sans-serif" font-size="27" letter-spacing="7">LA LLAVE · ARCHIVO 066</text><text x="${x}" y="${y}" fill="white" font-family="Arial,sans-serif" font-size="${font}" font-weight="bold">${lines.map((l,i)=>`<tspan x="${x}" dy="${i?font+14:0}">${xml(l)}</tspan>`).join('')}</text><image x="${coverX}" y="${coverY}" width="380" height="${coverH}" preserveAspectRatio="xMidYMid meet" xlink:href="https://www.lallaveoficial.com/assets/la-llave-edicion-fisica.png"/><text x="${x}" y="${h-240}" fill="#ddd9cf" font-family="Arial,sans-serif" font-size="${landscape?32:28}">MISTERIO · SUSPENSO · DISTOPÍA</text><text x="${x}" y="${h-160}" fill="#dfb864" font-family="Arial,sans-serif" font-size="${landscape?36:30}" font-weight="bold">${xml(data.cta)}</text><text x="${x}" y="${h-48}" fill="white" font-family="Arial,sans-serif" font-size="26">lallaveoficial.com · Enrique G. Santibañez</text></svg>`;
}
export async function managerApi(sql,op,b={}){
 if(op==='manager-read')return {status:200,policy:(await sql`SELECT * FROM console066_manager_policy WHERE id=1`)[0],jobs:await sql`SELECT j.*,a.detail->>'text' AS output_text FROM console066_manager_jobs j LEFT JOIN console066_audit a ON a.id=j.output_id ORDER BY j.created_at DESC,j.id LIMIT 100`,signals:await sql`SELECT * FROM console066_public_signals ORDER BY observed_at DESC LIMIT 100`,ticks:await sql`SELECT detail FROM console066_audit WHERE entity='manager066' AND action='tick' ORDER BY id DESC LIMIT 5`,capabilities:MANAGER_CAPABILITIES,checkedAt:new Date().toISOString()};
 if(op==='manager-tick')return {status:200,...await managerTick(sql)};
 if(op==='manager-policy'){
  if(typeof b.enabled!=='boolean'||!Number.isSafeInteger(b.version)||!Number.isSafeInteger(b.maxDailyDrafts)||b.maxDailyDrafts<1||b.maxDailyDrafts>12)return fail('Política inválida.');
  const r=await sql`WITH changed AS (UPDATE console066_manager_policy SET enabled=${b.enabled},max_daily_drafts=${b.maxDailyDrafts},version=version+1,updated_at=now() WHERE id=1 AND version=${b.version} RETURNING *),logged AS (INSERT INTO console066_audit(entity,entity_id,action,detail) SELECT 'manager066',0,'policy',jsonb_build_object('version',version,'enabled',enabled,'maxDailyDrafts',max_daily_drafts) FROM changed) SELECT * FROM changed`;
  return r.length?{status:200,policy:r[0]}:fail('La política cambió. Actualiza.',409);
 }
 if(op==='manager-signal-save'){
  const s=validatePublicSignal(b);if(!s)return fail('Revisa URL pública sin parámetros, fecha y evidencia. No incluyas correos ni datos privados.');
  const r=s.version===0?await sql`INSERT INTO console066_public_signals(id,source_url,source_hash,category,title,evidence,observed_at,state) VALUES(${s.id},${s.sourceUrl},${s.sourceHash},${s.category},${s.title},${s.evidence},${s.observedAt},${s.state}) ON CONFLICT DO NOTHING RETURNING id`:await sql`UPDATE console066_public_signals SET category=${s.category},title=${s.title},evidence=${s.evidence},observed_at=${s.observedAt},state=${s.state},version=version+1,updated_at=now() WHERE id=${s.id} AND version=${s.version} AND source_hash=${s.sourceHash} RETURNING id`;
  return r.length?{status:200,ok:true,contacted:false}:fail('La fuente ya está registrada o la versión cambió.',409);
 }
 if(op==='manager-job-state'){
  if(!idOK(b.id)||!Number.isSafeInteger(b.version)||!['review','blocked','closed'].includes(b.state))return fail('Tarea o estado inválido.');
  const r=await sql`UPDATE console066_manager_jobs SET state=${b.state},version=version+1,updated_at=now() WHERE id=${b.id} AND version=${b.version} RETURNING id`;
  return r.length?{status:200,ok:true,published:false}:fail('La tarea cambió. Actualiza.',409);
 }
 if(op==='manager-creative'){
  const j=(await sql`SELECT * FROM console066_manager_jobs WHERE id=${String(b.id||'')}`)[0];if(!j||j.kind!=='creative')return fail('Pieza no encontrada.',404);
  const records=await sql`SELECT id,version,approved_hash,status,data FROM console066_marketing_records WHERE id IN (${j.data.brandId},${j.data.productId})`;
  const fresh=(id,version,hash)=>records.some(r=>r.id===id&&r.version===version&&r.status==='approved'&&r.approved_hash===hash&&payloadHash(r.data)===hash);
  if(!fresh(j.data.brandId,j.data.brandVersion,j.data.brandHash)||!fresh(j.data.productId,j.data.productVersion,j.data.productHash))return fail('Marca o producto cambiaron. Prepara una nueva pieza.',409);
  return {status:200,svg:creativeSVG(j.data),filename:j.id+'.svg',scope:'Plantilla vectorial para revisión. No es imagen generada por IA ni publicación.'};
 }
 return fail('Operación desconocida.');
}
