import {createHash} from 'node:crypto';
import {payloadHash,trackedLink} from './marketing-workspace.js';
import {chileDay} from './customer-mail066.js';
export const FACEBOOK_PAGE={id:'1133169073208602',name:'La Llave I: Ciudad Central',url:'https://www.facebook.com/profile.php?id=61589826838317'};
export const BOOKTRAILER_URL='https://www.youtube.com/watch?v=6lo8wcJGizQ';
export const FB_GENRES=['thriller','suspenso','misterio','ciencia ficción','distopía','club de lectura'];
const clean=(v,n)=>typeof v==='string'&&v.length<=n&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)?v.trim():null;
const fail=(error,status=400)=>({status,error});
const idOK=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
export function groupURL(value){try{const u=new URL(value);if(u.protocol!=='https:'||!['facebook.com','www.facebook.com','m.facebook.com'].includes(u.hostname)||u.username||u.password||u.port||u.search||u.hash)return null;const m=u.pathname.match(/^\/groups\/([a-zA-Z0-9._-]{1,100})\/?$/);return m&&!['feed','discover','search','joins','create','yourgroups'].includes(m[1].toLowerCase())?'https://www.facebook.com/groups/'+m[1]+'/':null;}catch{return null;}}
const fresh=v=>v&&Number.isFinite(Date.parse(v))&&Date.parse(v)<=Date.now()+60000&&Date.parse(v)>Date.now()-30*86400000;
export function groupReadiness(group,{post=false}={}){
 const d=group?.data||{},reasons=[];
 if(d.pagesAllowed!=='yes')reasons.push('Falta confirmar que admite páginas.');
 if(!['yes','conditional'].includes(d.promotionAllowed))reasons.push('No hay permiso de promoción confirmado.');
 if(d.promotionAllowed==='conditional'&&(!d.conditions||d.conditionsConfirmed!==true||!d.conditionsConfirmedAt||chileDay(new Date(d.conditionsConfirmedAt))!==chileDay()))reasons.push('Falta verificar la condición de promoción para este envío.');
 if(d.linksAllowed!=='yes')reasons.push('Falta confirmar enlaces de booktrailer y compra.');
 if(!fresh(d.rulesCheckedAt)||!d.rules||d.rules.length<20)reasons.push('Revisa las reglas y su fecha (máximo 30 días).');
 if(!d.genres?.length)reasons.push('Falta afinidad documentada con la obra.');
 if(post&&(d.identityPageId!==FACEBOOK_PAGE.id||!fresh(d.membershipCheckedAt)))reasons.push('Confirma la membresía con la identidad de La Llave y fecha vigente.');
 if(post&&group?.membership!=='member')reasons.push('La página no figura como miembro aceptado.');
 if(['declined','left'].includes(group?.membership))reasons.push('El ingreso fue rechazado o la página salió del grupo.');
 return {ready:reasons.length===0,reasons};
}
export function candidateInput(b){
 const url=groupURL(b?.url),name=clean(b?.name,160),evidence=clean(b?.evidence,1800),country=clean(b?.country??'Por confirmar',80);
 if(!url||!name||!country||!evidence||evidence.length<20||!Array.isArray(b.genres)||b.genres.length>6||b.genres.some(g=>!FB_GENRES.includes(g)))return null;
 return {id:'fbg-'+createHash('sha256').update(url).digest('hex').slice(0,24),url,data:{name,country,genres:[...new Set(b.genres)],evidence,discoveredAt:new Date().toISOString(),pagesAllowed:'unknown',promotionAllowed:'unknown',linksAllowed:'unknown',rules:'',conditions:'',conditionsConfirmed:false,rulesCheckedAt:null,membershipEvidence:''}};
}
export async function facebookCandidate(sql,b,{agent=false}={}){
 const c=candidateInput(b);if(!c)return fail('Revisa la URL del grupo, afinidad y evidencia pública.');
 const existing=await sql`SELECT id FROM console066_fb_groups WHERE url=${c.url}`;if(existing.length)return {status:200,id:existing[0].id,existing:true,saved:true};
 const data=JSON.stringify({...c.data,discoverySource:agent?'agent_web_candidate':'owner_observation'});
 const rows=agent?await sql`WITH budget AS (INSERT INTO console066_fb_discovery_days(day,candidates) VALUES(${chileDay()},1) ON CONFLICT(day) DO UPDATE SET candidates=console066_fb_discovery_days.candidates+1 WHERE console066_fb_discovery_days.candidates<6 RETURNING day) INSERT INTO console066_fb_groups(id,url,data) SELECT ${c.id},${c.url},${data}::jsonb FROM budget ON CONFLICT(url) DO NOTHING RETURNING id`:await sql`INSERT INTO console066_fb_groups(id,url,data) VALUES(${c.id},${c.url},${data}::jsonb) ON CONFLICT(url) DO NOTHING RETURNING id`;
 return rows.length?{status:201,saved:true,id:rows[0].id,verifiedRules:false}:fail('No se agregó: límite diario de seis candidatos o grupo registrado en otra solicitud.',409);
}
export async function facebookContext(sql,{limit=20}={}){
 try{
  const bounded=Math.max(1,Math.min(100,limit)),groups=await sql`SELECT * FROM console066_fb_groups ORDER BY updated_at DESC LIMIT ${bounded+1}`;
  return {page:FACEBOOK_PAGE,booktrailer:BOOKTRAILER_URL,catalog:(await records(sql)).filter(approved).map(r=>({id:r.id,kind:r.kind,version:r.version,approved:true,data:r.data})),groups:groups.slice(0,bounded).map(g=>({...g,readiness:groupReadiness(g,{post:true}),joinReadiness:groupReadiness(g)})),groupsTruncated:groups.length>bounded,posts:await sql`SELECT id,group_id,status,version,data,receipt FROM console066_fb_posts ORDER BY updated_at DESC LIMIT 20`,scope:'Búsqueda web indexada y preparación interna. Un candidato no verifica reglas ni membresía. Ninguna API de este módulo entra en Facebook, solicita ingreso o publica. Las acciones en Facebook requieren sesión como la página, reglas comprobadas y texto exacto aprobado. No extraigas miembros ni conviertas perfiles en suscriptores.'};
 }catch{return {status:'unavailable',scope:'El registro de grupos no está disponible. No inventes grupos guardados ni permisos.'};}
}

async function records(sql){return sql`SELECT * FROM console066_marketing_records WHERE kind IN ('brand','product') AND status='approved'`;}
const approved=r=>r&&r.approved_hash===payloadHash(r.data);
async function currentDraft(sql,group,productId,text,angle){
 const all=await records(sql),brand=all.find(r=>r.kind==='brand'&&approved(r)),p=all.find(r=>r.id===productId&&r.kind==='product'&&approved(r)&&r.data.stock!==0);
 if(!brand||!p)return null;const link=trackedLink(p,{channel:'facebook',campaign:'fb_groups_066',content:group.id});if(!link)return null;
 return {text,angle,groupVersion:group.version,brandId:brand.id,brandVersion:brand.version,brandHash:brand.approved_hash,productId:p.id,productVersion:p.version,productHash:p.approved_hash,pageId:FACEBOOK_PAGE.id,booktrailer:BOOKTRAILER_URL,purchaseURL:link};
}
export const postText=d=>`${d.text}\n\nBooktrailer: ${d.booktrailer}\nConoce el libro y sus opciones de compra: ${d.purchaseURL}`;
export async function facebookDraft(sql,b){
 if(!idOK(b?.id)||!idOK(b?.groupId)||!Number.isSafeInteger(b.version)||b.version<0||!idOK(b.productId))return fail('Borrador inválido.');
 const text=clean(b.text,3000),angle=clean(b.angle,700);if(!text||/https?:\/\/|www\./i.test(text)||text.length<40||!angle||angle.length<20)return fail('Escribe el texto y explica cómo se adapta al grupo.');
 const group=(await sql`SELECT * FROM console066_fb_groups WHERE id=${b.groupId}`)[0];if(!group)return fail('Grupo no registrado.',404);
 const data=await currentDraft(sql,group,b.productId,text,angle);if(!data)return fail('Falta marca o producto aprobado y disponible.');
 const encoded=JSON.stringify(data);
 const rows=b.version===0?await sql`INSERT INTO console066_fb_posts(id,group_id,data) VALUES(${b.id},${group.id},${encoded}::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id,version`:await sql`UPDATE console066_fb_posts SET data=${encoded}::jsonb,status='draft',approval_hash=NULL,approved_at=NULL,version=version+1,updated_at=now() WHERE id=${b.id} AND group_id=${group.id} AND version=${b.version} AND status IN ('draft','approved') RETURNING id,version`;
 return rows.length?{status:200,saved:true,...rows[0],published:false}:fail('La versión cambió o el post ya pasó a ejecución. Actualiza.',409);
}
async function validPost(sql,p,g){
 const readiness=groupReadiness(g,{post:true});if(!readiness.ready)return readiness.reasons.join(' ');
 if(p.data.groupVersion!==g.version)return 'Las reglas o el estado del grupo cambiaron. Guarda y aprueba de nuevo el borrador.';
 const all=await records(sql);for(const [kind,id,version,hash] of [['brand',p.data.brandId,p.data.brandVersion,p.data.brandHash],['product',p.data.productId,p.data.productVersion,p.data.productHash]]){const r=all.find(x=>x.id===id&&x.kind===kind);if(!approved(r)||r.version!==version||r.approved_hash!==hash||(kind==='product'&&r.data.stock===0))return 'Cambió la marca o el producto aprobado. Actualiza el borrador.';}
 const recent=await sql`SELECT id FROM console066_fb_posts WHERE group_id=${g.id} AND id<>${p.id} AND (status IN ('prepared','submitted','uncertain') OR (status IN ('published','rejected') AND updated_at>now()-interval '7 days')) LIMIT 1`;
 return recent.length?'Ya hay un envío pendiente o una publicación registrada en este grupo durante los últimos siete días.':null;
}
export async function facebookApi(sql,op,b={}){
 if(op==='facebook-read'){const context=await facebookContext(sql,{limit:100});if(context.status==='unavailable')return fail('No se pudo leer el registro de grupos.',503);const products=(await records(sql)).filter(r=>r.kind==='product'&&approved(r)).map(r=>({id:r.id,title:r.data.title,country:r.data.country,format:r.data.format}));return {status:200,...context,products,checkedAt:new Date().toISOString()};}
 if(op==='facebook-candidate')return facebookCandidate(sql,b);
 if(op==='facebook-draft')return facebookDraft(sql,b);
 if(op==='facebook-group-save'){
  if(!idOK(b.id)||!Number.isSafeInteger(b.version)||b.version<1)return fail('Grupo inválido.');
  const old=(await sql`SELECT * FROM console066_fb_groups WHERE id=${b.id}`)[0];if(!old)return fail('Grupo no registrado.',404);
  const fields={name:160,country:80,evidence:1800,rules:3000,conditions:1000,membershipEvidence:1500},d={...old.data};
  for(const [key,max] of Object.entries(fields)){const v=clean(b[key]??old.data[key]??'',max);if(v===null)return fail('Campo inválido: '+key);d[key]=v;}
  for(const [key,choices]of Object.entries({pagesAllowed:['unknown','yes','no'],promotionAllowed:['unknown','yes','conditional','no'],linksAllowed:['unknown','yes','no']})){if(!choices.includes(b[key]))return fail('Revisa los permisos del grupo.');d[key]=b[key];}
  if(!d.name||d.evidence.length<20||!Array.isArray(b.genres)||b.genres.some(g=>!FB_GENRES.includes(g))||b.genres.length>6||typeof b.rulesReviewed!=='boolean'||typeof b.conditionsConfirmed!=='boolean')return fail('Revisa la afinidad y las comprobaciones.');
  d.genres=[...new Set(b.genres)];d.conditionsConfirmed=b.conditionsConfirmed;d.conditionsConfirmedAt=b.conditionsConfirmed?new Date().toISOString():null;d.rulesCheckedAt=b.rulesReviewed?new Date().toISOString():null;
  if(!['not_requested','requested','member','declined','left'].includes(b.membership))return fail('Estado de ingreso inválido.');
  if(b.membership!=='not_requested'&&(b.identityConfirmed!==true||d.membershipEvidence.length<20))return fail('Confirma la identidad de la página y registra evidencia del estado observado en Facebook.');
  d.identityPageId=b.identityConfirmed?FACEBOOK_PAGE.id:null;d.membershipCheckedAt=b.identityConfirmed?new Date().toISOString():null;
  const rows=await sql`UPDATE console066_fb_groups SET data=${JSON.stringify(d)}::jsonb,membership=${b.membership},version=version+1,updated_at=now() WHERE id=${b.id} AND version=${b.version} RETURNING id,version`;
  return rows.length?{status:200,saved:true,...rows[0],externalAction:false}:fail('El grupo cambió. Actualiza antes de guardar.',409);
 }
 if(['facebook-approve','facebook-prepare','facebook-receipt'].includes(op)){
  if(!idOK(b.id)||!Number.isSafeInteger(b.version)||b.version<1)return fail('Publicación inválida.');
  const p=(await sql`SELECT * FROM console066_fb_posts WHERE id=${b.id}`)[0];if(!p||p.version!==b.version)return fail('La publicación cambió. Actualiza.',409);
  const g=(await sql`SELECT * FROM console066_fb_groups WHERE id=${p.group_id}`)[0];
  if(op==='facebook-receipt'){
   if(!['prepared','submitted','uncertain'].includes(p.status)||!['submitted','published','rejected','uncertain'].includes(b.result))return fail('Transición de resultado inválida.');
   const evidence=clean(b.evidence,1800);let url='';if(b.url){try{const u=new URL(b.url);const suffix=u.href.slice(g.url.length);if(!u.href.startsWith(g.url)||!/^((posts|permalink)\/[0-9]+\/?)(\?[^#]*)?$/.test(suffix))throw Error();url=u.href.split('?')[0];}catch{return fail('Usa el enlace permanente de una publicación de este mismo grupo.');}}
   if(!evidence||evidence.length<20||b.identityConfirmed!==true||(b.result==='published'&&!url))return fail('Registra evidencia, identidad de página y enlace del post si figura publicado.');
   const receipt={source:'owner_recorded',evidence,url,pageId:FACEBOOK_PAGE.id,recordedAt:new Date().toISOString()};
   const rows=await sql`UPDATE console066_fb_posts SET status=${b.result},receipt=${JSON.stringify(receipt)}::jsonb,version=version+1,updated_at=now() WHERE id=${p.id} AND version=${p.version} RETURNING id`;
   return rows.length?{status:200,saved:true,source:'owner_recorded'}:fail('El resultado cambió.',409);
  }
  const reason=await validPost(sql,p,g);if(reason)return fail(reason,409);
  if(op==='facebook-approve'){
   if(p.status!=='draft')return fail('Solo se aprueba un borrador nuevo.',409);
   const rows=await sql`UPDATE console066_fb_posts SET status='approved',approval_hash=${payloadHash(p.data)},approved_at=now(),version=version+1,updated_at=now() WHERE id=${p.id} AND version=${p.version} AND status='draft' RETURNING id`;
   return rows.length?{status:200,approved:true,published:false}:fail('La versión cambió.',409);
  }
  if(p.status!=='approved'||p.approval_hash!==payloadHash(p.data))return fail('Aprueba el texto exacto vigente antes de preparar la ejecución.',409);
  try{
   const rows=await sql`UPDATE console066_fb_posts SET status='prepared',version=version+1,updated_at=now() WHERE id=${p.id} AND version=${p.version} AND status='approved' RETURNING version`;
   return rows.length?{status:200,prepared:true,version:rows[0].version,page:FACEBOOK_PAGE,groupURL:g.url,text:postText(p.data),externalAction:false}:fail('La versión cambió.',409);
  }catch{return fail('Ya hay una publicación pendiente en este grupo.',409);}
 }
 return fail('Operación desconocida.',404);
}
