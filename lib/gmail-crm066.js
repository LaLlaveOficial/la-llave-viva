import {createHash,randomUUID} from 'node:crypto';
import {linkConversation} from './conversation-crm066.js';
export const MAIL_FROM='contacto@lallaveoficial.com';
export const GMAIL_SCOPES=['https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.send'];
const digest=v=>createHash('sha256').update(v).digest('hex');
const validId=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function address(value){
 if(typeof value!=='string'||/[\r\n]/.test(value))return null;
 const m=value.trim().match(/^(?:[^<>]*<)?([A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?$/i);
 return m?m[1].toLowerCase():null;
}
const header=(m,name)=>(m.payload?.headers||[]).find(h=>h.name?.toLowerCase()===name)?.value||'';
const safeMessageId=v=>/^<[^<>\s\r\n]{1,990}>$/.test(v)?v:'';
export function gmailMessage(m,mailbox,providerThreadId){
 const sender=address(header(m,'from')),aliasHeaders=['from','to','cc','delivered-to'].map(n=>header(m,n)).join(' ');
 // Bound the imported material to correspondence explicitly addressed to/from the book alias.
 if(!sender||!aliasHeaders.toLowerCase().match(/(?:^|[\s<,;])contacto@lallaveoficial\.com(?=$|[\s>,;])/))return null;
 if(typeof m.id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(m.id)||m.threadId!==providerThreadId)return null;
 const timestamp=Number(m.internalDate);if(!Number.isFinite(timestamp)||timestamp<0||timestamp>Date.now()+60000)return null;
 const plain=p=>{if(p.mimeType==='text/plain'&&p.body?.data)return Buffer.from(p.body.data,'base64url').toString('utf8');for(const child of (p.parts||[]).slice(0,30)){const t=plain(child);if(t)return t;}return '';};
 return {id:digest(mailbox+':'+m.id),providerId:m.id,threadId:digest(mailbox+':'+providerThreadId),sender,recipient:sender===MAIL_FROM?(address(header(m,'to'))||''):MAIL_FROM,direction:sender===MAIL_FROM?'outbound':'inbound',subject:header(m,'subject').replace(/[\r\n]/g,' ').slice(0,500),text:(plain(m.payload||{})||m.snippet||'Mensaje sin texto legible; abrir en Gmail.').slice(0,20000),messageId:safeMessageId(header(m,'message-id')),refs:header(m,'references').split(/\s+/).filter(safeMessageId).slice(-15).join(' '),at:new Date(timestamp).toISOString()};
}
export async function gmailCredential(action,env,fetcher=fetch){
 const uid=env.GMAIL_CONNECTOR_UID;
 if(!/^google\/[a-zA-Z0-9_-]+$/.test(uid||'')||!env.VERCEL_OIDC_TOKEN)throw Error('Falta configurar la conexión privada de Google para correo.');
 const r=await fetcher('https://api.vercel.com/v1/connect/'+action+'/'+encodeURIComponent(uid),{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+env.VERCEL_OIDC_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({subject:{type:'user',id:'console066-owner'},scopes:[...GMAIL_SCOPES,...(uid===env.GA4_CONNECTOR_UID?['https://www.googleapis.com/auth/analytics.readonly']:[])],...(action==='authorize'?{returnUrl:'https://www.lallaveoficial.com/operaciones-066'}:{})}),signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('Autoriza Gmail desde OP066 con la cuenta que recibe el correo de La Llave.');
 const data=await r.json();
 if(action==='authorize'){const u=new URL(data.url||data.authorizationUrl);if(u.protocol!=='https:'||!['connect.vercel.com','vercel.com'].includes(u.hostname))throw Error('Destino de autorización inválido.');return {url:u.href};}
 if(typeof data.token!=='string'||!data.token)throw Error('Google no devolvió un permiso válido.');return data.token;
}
export function gmailFailure(status,data={},path=''){
 const reasons=[...(data.error?.details||[]).map(x=>x.reason),...(data.error?.errors||[]).map(x=>x.reason)];
 if(reasons.some(x=>['SERVICE_DISABLED','API_DISABLED','accessNotConfigured'].includes(x)))return 'Gmail API está deshabilitada en el proyecto de Google. Habilita gmail.googleapis.com en La Llave Operaciones 066 y vuelve a leer el correo.';
 if(status===401)return 'Google rechazó el permiso de Gmail. Vuelve a autorizar Gmail desde OP066.';
 if(status===403)return 'Google rechazó '+(path==='settings/sendAs'?'la comprobación del alias remitente':'la lectura de Gmail')+' (403). Revisa que el consentimiento incluya gmail.readonly y gmail.send y que Gmail API esté habilitada.';
 if(status===429)return 'Gmail limitó las consultas. Conservamos la bandeja; intenta más tarde.';
 return 'Gmail no confirmó la operación ('+Number(status)+'). Se conserva la última lectura.';
}
async function gmailClient(env,fetcher){
 const token=await gmailCredential('token',env,fetcher);
 const call=async(path,body)=>{const r=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{method:body?'POST':'GET',redirect:'error',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});if(!r.ok){const data=await r.json().catch(()=>({}));throw Error(gmailFailure(r.status,data,path));}return r.json();};
 const [profile,aliases]=await Promise.all([call('profile'),call('settings/sendAs')]);
 const mailbox=address(profile.emailAddress);
 if(!mailbox||!aliases.sendAs?.some(a=>a.sendAsEmail?.toLowerCase()===MAIL_FROM&&a.verificationStatus==='accepted'))throw Error('La cuenta autorizada debe tener verificado el remitente '+MAIL_FROM+'.');
 return {call,mailbox};
}
export async function gmailSync(sql,env,fetcher=fetch,{retry=false}={}){
 // Reserve before requesting credentials. One rolling 24-hour cycle, four explicit batches of five threads.
 const reserved=await sql`INSERT INTO console066_gmail_sync(id,fetched,lease_until) VALUES('gmail',5,now()+interval '2 minutes')
 ON CONFLICT(id) DO UPDATE SET cycle_at=CASE WHEN console066_gmail_sync.cycle_at<now()-interval '24 hours' THEN now() ELSE console066_gmail_sync.cycle_at END,
 fetched=CASE WHEN console066_gmail_sync.cycle_at<now()-interval '24 hours' THEN 5 ELSE console066_gmail_sync.fetched+5 END,
 page_token=CASE WHEN console066_gmail_sync.cycle_at<now()-interval '24 hours' THEN NULL ELSE console066_gmail_sync.page_token END,
 completed=false,lease_until=now()+interval '2 minutes',last_error=NULL
 WHERE (console066_gmail_sync.lease_until IS NULL OR console066_gmail_sync.lease_until<now())
 AND (console066_gmail_sync.cycle_at<now()-interval '24 hours' OR ((NOT console066_gmail_sync.completed OR (${retry} AND console066_gmail_sync.last_error IS NOT NULL)) AND console066_gmail_sync.fetched<20)) RETURNING *`;
 if(!reserved.length)return {status:429,error:'Lectura en curso o cupo de 24 horas completado. Se conserva la última bandeja.'};
 const reservation=reserved[0];
 try{
  const {call,mailbox}=await gmailClient(env,fetcher),q=new URLSearchParams({maxResults:'5',q:'newer_than:90d {to:'+MAIL_FROM+' from:'+MAIL_FROM+' cc:'+MAIL_FROM+' deliveredto:'+MAIL_FROM+'}'});
  if(reservation.page_token)q.set('pageToken',reservation.page_token);
  const page=await call('threads?'+q),threads=Array.isArray(page.threads)?page.threads.slice(0,5):[];
  let imported=0;
  const fetched=await Promise.all(threads.map(t=>{if(!/^[a-zA-Z0-9_-]{1,128}$/.test(t.id||''))throw Error('Hilo inválido de Gmail.');return call('threads/'+encodeURIComponent(t.id)+'?format=full');}));
  for(const t of fetched){
   const messages=(t.messages||[]).slice(-100).map(m=>gmailMessage(m,mailbox,t.id)).filter(Boolean).sort((a,b)=>a.at.localeCompare(b.at));if(!messages.length)continue;
   const id=digest(mailbox+':'+t.id),subject=messages.at(-1).subject;
   await sql`INSERT INTO console066_gmail_threads(id,mailbox,provider_id,subject) VALUES(${id},${mailbox},${t.id},${subject}) ON CONFLICT(id) DO UPDATE SET subject=EXCLUDED.subject,updated_at=now()`;
   const batch=JSON.stringify(messages.map(m=>({id:m.id,thread_id:id,provider_id:m.providerId,direction:m.direction,sender:m.sender,recipient:m.recipient,subject:m.subject,text:m.text,message_id:m.messageId,refs:m.refs,received_at:m.at})));
   const saved=await sql`INSERT INTO console066_gmail_messages(id,thread_id,provider_id,direction,sender,recipient,subject,text,message_id,refs,received_at) SELECT id,thread_id,provider_id,direction,sender,recipient,subject,text,message_id,refs,received_at FROM jsonb_to_recordset(${batch}::jsonb) AS x(id text,thread_id text,provider_id text,direction text,sender text,recipient text,subject text,text text,message_id text,refs text,received_at timestamptz) ON CONFLICT DO NOTHING RETURNING id`;imported+=saved.length;
   const inbound=messages.find(m=>m.direction==='inbound');if(inbound)await linkConversation(sql,'email',id,{title:subject||'Consulta por correo',question:inbound.text});
  }
  const next=typeof page.nextPageToken==='string'?page.nextPageToken:null,more=!!next&&reservation.fetched<20;
  await sql`UPDATE console066_gmail_sync SET page_token=${next},completed=${!more},lease_until=NULL,last_success=now(),last_error=NULL WHERE id='gmail'`;
  return {status:200,imported,more,scope:'Hasta 20 hilos por 24 horas, en lotes de cinco; correspondencia de La Llave de los últimos 90 días. No importa adjuntos.'};
 }catch(e){await sql`UPDATE console066_gmail_sync SET completed=true,lease_until=NULL,last_error=${e.message} WHERE id='gmail'`;return {status:502,error:e.message};}
}
export function replyMime(anchor,text){
 if(anchor.direction!=='inbound'||!address(anchor.sender)||anchor.sender===MAIL_FROM||!safeMessageId(anchor.message_id)||typeof text!=='string'||!text.trim()||text.length>6000||/[\x00]/.test(text))throw Error('Falta un mensaje recibido con destinatario y Message-ID válidos para responder en su hilo.');
 const subject=String(anchor.subject).replace(/[\r\n]/g,' ').slice(0,500),refs=(String(anchor.refs||'').split(/\s+/).filter(safeMessageId).slice(-15).concat(anchor.message_id)).join(' ');
 return Buffer.from(['From: La Llave Oficial <'+MAIL_FROM+'>','To: '+address(anchor.sender),'Subject: '+(/^[\x20-\x7e]*$/.test(subject)?subject:'=?UTF-8?B?'+Buffer.from(subject).toString('base64')+'?='),'In-Reply-To: '+anchor.message_id,'References: '+refs,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',Buffer.from(text.trim()).toString('base64').match(/.{1,76}/g).join('\r\n')].join('\r\n')).toString('base64url');
}
export async function gmailSend(sql,body,env,fetcher=fetch){
 if(body.confirm!==true||typeof body.id!=='string'||!Number.isSafeInteger(body.version))return {status:400,error:'Revisa el texto exacto antes de enviar.'};
 // Verify authorization and sender before consuming the one-shot send reservation.
 let client;try{client=await gmailClient(env,fetcher);}catch(e){return {status:503,error:e.message};}
 const rows=await sql`UPDATE console066_gmail_replies r SET status='sending',version=r.version+1 FROM console066_gmail_messages m,console066_gmail_threads t
 WHERE r.id=${body.id} AND r.version=${body.version} AND r.status='pending_review' AND m.id=r.anchor_id AND t.id=r.thread_id AND t.mailbox=${client.mailbox}
 AND NOT EXISTS(SELECT 1 FROM console066_gmail_messages newer WHERE newer.thread_id=t.id AND newer.direction='inbound' AND newer.received_at>m.received_at)
 RETURNING r.*,m.sender,m.subject,m.message_id,m.refs,m.direction,t.provider_id AS provider_thread`;
 if(rows.length!==1)return {status:409,error:'El borrador cambió, llegó otra respuesta o este envío ya se procesó.'};
 const r=rows[0];let state='uncertain',providerId=null;
 try{const sent=await client.call('messages/send',{threadId:r.provider_thread,raw:replyMime(r,r.text)});if(typeof sent.id==='string'&&sent.id&&sent.threadId===r.provider_thread){state='accepted';providerId=sent.id;}}catch{/* Never retry a send whose outcome is unknown. */}
 await sql`WITH changed AS (UPDATE console066_gmail_replies SET status=${state},provider_id=${providerId},finished_at=now() WHERE id=${r.id} AND status='sending' RETURNING id)
 INSERT INTO console066_audit(entity,entity_id,action,detail) SELECT 'gmail-crm',0,${state},jsonb_build_object('replyId',id,'threadId',${r.thread_id}::text,'from',${MAIL_FROM}::text,'providerId',${providerId}::text) FROM changed`;
 return {status:state==='accepted'?200:502,state,accepted:state==='accepted',delivered:false,...(state==='uncertain'?{error:'Envío sin confirmación. Revisa Gmail antes de intentar otra respuesta.'}:{})};
}
export async function gmailApi(sql,op,body={},env,fetcher=fetch){
 if(op==='gmail-authorize')return {status:200,...await gmailCredential('authorize',env,fetcher)};
 if(op==='gmail-sync')return gmailSync(sql,env,fetcher,{retry:true});
 if(op==='gmail-inbox')return {status:200,from:MAIL_FROM,configured:!!env.GMAIL_CONNECTOR_UID,sync:(await sql`SELECT cycle_at,fetched,completed,last_success,last_error FROM console066_gmail_sync WHERE id='gmail'`)[0]||null,threads:await sql`SELECT t.id,t.subject,t.updated_at,c.case_id,(SELECT text FROM console066_gmail_messages m WHERE m.thread_id=t.id ORDER BY received_at DESC LIMIT 1) AS preview FROM console066_gmail_threads t LEFT JOIN console066_conversation_cases c ON c.channel='email' AND c.thread_id=t.id ORDER BY t.updated_at DESC LIMIT 100`};
 if(op==='gmail-send')return gmailSend(sql,body,env,fetcher);
 if(op==='gmail-lead-link'){
  if(!validId(body.threadId)||!Number.isSafeInteger(body.leadId)||body.leadId<1||body.confirm!==true)return {status:400,error:'Selecciona un contacto del CRM para este hilo.'};
  const rows=await sql`WITH changed AS (UPDATE console066_conversation_cases c SET lead_id=${body.leadId} WHERE channel='email' AND thread_id=${body.threadId} AND EXISTS(SELECT 1 FROM console066_leads WHERE id=${body.leadId}) RETURNING case_id,lead_id)
  INSERT INTO console066_audit(entity,entity_id,action,detail) SELECT 'gmail-crm',lead_id,'link-contact',jsonb_build_object('caseId',case_id,'threadId',${body.threadId}::text) FROM changed RETURNING id`;
  return rows.length?{status:200,linked:true}:{status:409,error:'No se encontró el hilo o contacto.'};
 }
 if(op==='gmail-thread'){
  if(!validId(body.id))return {status:400,error:'Hilo inválido.'};
  return {status:200,link:(await sql`SELECT case_id,lead_id FROM console066_conversation_cases WHERE channel='email' AND thread_id=${body.id}`)[0]||null,leads:await sql`SELECT id,name,country FROM console066_leads ORDER BY name LIMIT 200`,messages:await sql`SELECT id,direction,sender,recipient,subject,text,received_at FROM console066_gmail_messages WHERE thread_id=${body.id} ORDER BY received_at ASC LIMIT 100`,replies:await sql`SELECT id,text,status,version,provider_id,created_at FROM console066_gmail_replies WHERE thread_id=${body.id} ORDER BY created_at DESC LIMIT 20`};
 }
 if(op==='gmail-prepare'){
  if(!validId(body.threadId)||typeof body.text!=='string'||!body.text.trim()||body.text.length>6000||/\x00/.test(body.text))return {status:400,error:'Escribe una respuesta de hasta 6.000 caracteres.'};
  const anchor=(await sql`SELECT * FROM console066_gmail_messages WHERE thread_id=${body.threadId} AND direction='inbound' ORDER BY received_at DESC,id DESC LIMIT 1`)[0];
  if(!anchor)return {status:400,error:'El hilo no contiene mensajes recibidos.'};replyMime(anchor,body.text);
  const id=randomUUID(),rows=await sql`INSERT INTO console066_gmail_replies(id,thread_id,anchor_id,text,status) VALUES(${id},${body.threadId},${anchor.id},${body.text.trim()},'pending_review') ON CONFLICT DO NOTHING RETURNING id`;
  return rows.length?{status:201,id,sent:false}:{status:409,error:'Ya existe un borrador o envío por resolver en este hilo.'};
 }
 if(op==='gmail-discard'){
  if(typeof body.id!=='string'||!Number.isSafeInteger(body.version))return {status:400,error:'Borrador inválido.'};
  const rows=await sql`UPDATE console066_gmail_replies SET status='rejected',version=version+1,finished_at=now() WHERE id=${body.id} AND version=${body.version} AND status='pending_review' RETURNING id`;return rows.length?{status:200,discarded:true}:{status:409,error:'El borrador ya se procesó.'};
 }
 return {status:404,error:'Acción de correo no disponible.'};
}
