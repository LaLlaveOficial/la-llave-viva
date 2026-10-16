import {createHash,createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
export function inboxConfiguration(env){
 const missing=['INSTAGRAM_ACCOUNT_ID','INSTAGRAM_ACCESS_TOKEN','INSTAGRAM_APP_SECRET','INSTAGRAM_VERIFY_TOKEN'].filter(k=>typeof env[k]!=='string'||!env[k]);
 const valid=!missing.length&&/^\d{5,30}$/.test(env.INSTAGRAM_ACCOUNT_ID)&&env.INSTAGRAM_APP_SECRET.length>=16&&env.INSTAGRAM_VERIFY_TOKEN.length>=32;
 return {configured:valid,enabled:valid&&env.INSTAGRAM_INBOX_ENABLED==='1',missing,accountId:valid?env.INSTAGRAM_ACCOUNT_ID:null};
}
export function verifyInstagramSignature(raw,signature,secret){
 if(!Buffer.isBuffer(raw)||raw.length>262144||typeof secret!=='string'||secret.length<16||typeof signature!=='string'||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;
 const expected=createHmac('sha256',secret).update(raw).digest(),actual=Buffer.from(signature.slice(7),'hex');return timingSafeEqual(expected,actual);
}
const threadId=(account,sender)=>createHash('sha256').update(account+':'+sender).digest('hex');
export function incomingMessages(payload,accountId,now=Date.now()){
 if(payload?.object!=='instagram'||!Array.isArray(payload.entry))return [];
 const rows=[];
 for(const entry of payload.entry.slice(0,100)){
  if(String(entry.id)!==accountId)continue;
  for(const event of (Array.isArray(entry.messaging)?entry.messaging:[]).slice(0,100)){
   const sender=String(event.sender?.id||''),recipient=String(event.recipient?.id||''),m=event.message;
   if(!/^\d{5,30}$/.test(sender)||recipient!==accountId||sender===accountId||!m||m.is_echo||typeof m.mid!=='string'||!m.mid||m.mid.length>500||typeof m.text!=='string'||!m.text.trim()||m.text.length>4000||!Number.isSafeInteger(event.timestamp)||event.timestamp<0||event.timestamp>now+60000)continue;
   rows.push({id:createHash('sha256').update(accountId+':'+m.mid).digest('hex'),threadId:threadId(accountId,sender),sender,providerId:m.mid,text:m.text,at:new Date(event.timestamp).toISOString()});
  }
 }
 return rows;
}
export async function receiveInstagram(sql,rows,accountId){
 let saved=0;
 for(const r of rows){const result=await sql`WITH thread AS (
  INSERT INTO console066_inbox_threads(id,account_id,sender_id,last_inbound_at) VALUES (${r.threadId},${accountId},${r.sender},${r.at}::timestamptz)
  ON CONFLICT(id) DO UPDATE SET last_inbound_at=GREATEST(console066_inbox_threads.last_inbound_at,EXCLUDED.last_inbound_at) RETURNING id
 ),message AS (
  INSERT INTO console066_inbox_messages(id,thread_id,direction,text,status,provider_id,created_at) SELECT ${r.id},id,'inbound',${r.text},'received',${r.providerId},${r.at}::timestamptz FROM thread ON CONFLICT DO NOTHING RETURNING id
 ) SELECT id FROM message`;saved+=result.length;}
 return saved;
}
export async function inboxRead(sql,env){
 const config=inboxConfiguration(env);
 const threads=await sql`SELECT t.id,t.last_inbound_at,(SELECT text FROM console066_inbox_messages m WHERE m.thread_id=t.id AND m.direction='inbound' ORDER BY created_at DESC LIMIT 1) AS last_text,(SELECT COUNT(*)::int FROM console066_inbox_messages m WHERE m.thread_id=t.id AND m.status='pending_review') AS pending FROM console066_inbox_threads t WHERE t.account_id=${config.accountId||''} ORDER BY t.last_inbound_at DESC LIMIT 100`;
 return {config,threads,scope:'Solo mensajes recibidos por webhook firmado de la cuenta configurada. No importa seguidores ni mensajes históricos. Respuestas manuales revisadas dentro de 24 horas; no seguimiento automático.'};
}
export async function prepareInstagramReply(sql,body,env){
 const config=inboxConfiguration(env);
 if(!config.enabled)return {status:503,error:'La bandeja no está autorizada y habilitada para esta cuenta.'};
 if(typeof body.threadId!=='string'||!/^[a-f0-9]{64}$/.test(body.threadId)||typeof body.text!=='string'||!body.text.trim()||body.text.length>1000)return {status:400,error:'Selecciona una conversación y un texto de hasta 1.000 caracteres.'};
 const id=randomUUID();
 const rows=await sql`INSERT INTO console066_inbox_messages(id,thread_id,direction,text,status) SELECT ${id},id,'outbound',${body.text.trim()},'pending_review' FROM console066_inbox_threads WHERE id=${body.threadId} AND account_id=${config.accountId} AND last_inbound_at>now()-interval '24 hours' AND NOT EXISTS (SELECT 1 FROM console066_inbox_messages m WHERE m.thread_id=console066_inbox_threads.id AND m.direction='outbound' AND m.status IN ('pending_review','sending','uncertain')) ON CONFLICT DO NOTHING RETURNING *`;
 return rows.length?{status:201,message:rows[0],sent:false}:{status:409,error:'La conversación venció o tiene un borrador o envío por resolver. Revisa Instagram antes de continuar.'};
}
export async function sendInstagramReply(sql,body,env,fetcher=fetch){
 const config=inboxConfiguration(env);
 if(!config.enabled)return {status:503,error:'La mensajería no está autorizada y habilitada.'};
 if(body.confirm!==true||typeof body.id!=='string'||!Number.isSafeInteger(body.version))return {status:400,error:'Revisa y aprueba un mensaje exacto antes de enviarlo.'};
 const rows=await sql`WITH locked AS (
  UPDATE console066_inbox_messages m SET status='sending',version=m.version+1,approved_at=now()
  FROM console066_inbox_threads t WHERE m.id=${body.id} AND m.version=${body.version} AND m.status='pending_review' AND m.direction='outbound' AND t.id=m.thread_id AND t.account_id=${config.accountId} AND t.last_inbound_at>now()-interval '24 hours'
  RETURNING m.*,t.sender_id
 ) SELECT * FROM locked`;
 if(rows.length!==1)return {status:409,error:'El mensaje cambió, ya se procesó o terminó la ventana de respuesta. No se repite.'};
 const m=rows[0];let result;
 try{
  const r=await fetcher('https://graph.instagram.com/v25.0/'+config.accountId+'/messages',{method:'POST',headers:{Authorization:'Bearer '+env.INSTAGRAM_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({recipient:{id:m.sender_id},message:{text:m.text}}),signal:AbortSignal.timeout(20000),redirect:'error'});
  const data=await r.json();
  if(!r.ok){result={state:r.status>=500?'uncertain':'rejected',error:'Instagram rechazó el mensaje. Revisa permisos y la conversación.'};}
  else if(typeof data.message_id==='string'&&data.message_id&&String(data.recipient_id)===m.sender_id){result={state:'accepted',providerId:data.message_id};}
  else result={state:'uncertain',error:'No se confirmó un identificador y destinatario coincidentes. Revisa Instagram antes de otro envío.'};
 }catch{result={state:'uncertain',error:'Resultado desconocido. No se repetirá automáticamente; revisa Instagram.'};}
 await sql`WITH updated AS (UPDATE console066_inbox_messages SET status=${result.state},provider_id=${result.providerId||null},finished_at=now() WHERE id=${m.id} AND status='sending' RETURNING id) INSERT INTO console066_audit(entity,entity_id,action,detail) SELECT 'instagram-inbox',0,${result.state},jsonb_build_object('messageId',id,'providerId',${result.providerId||null}::text) FROM updated`;
 return {status:result.state==='accepted'?200:502,id:m.id,state:result.state,...(result.error?{error:result.error}:{}),accepted:result.state==='accepted',delivered:false};
}
export async function inboxApi(sql,op,body,env,fetcher=fetch){
 if(op==='instagram-inbox')return {status:200,...await inboxRead(sql,env)};
 if(op==='instagram-prepare')return prepareInstagramReply(sql,body,env);
 if(op==='instagram-send')return sendInstagramReply(sql,body,env,fetcher);
 if(op==='instagram-discard'){
  if(typeof body.id!=='string'||!Number.isSafeInteger(body.version))return {status:400,error:'Mensaje inválido.'};
  const rows=await sql`UPDATE console066_inbox_messages m SET status='rejected',version=m.version+1,finished_at=now() FROM console066_inbox_threads t WHERE m.id=${body.id} AND m.version=${body.version} AND m.status='pending_review' AND t.id=m.thread_id AND t.account_id=${inboxConfiguration(env).accountId||''} RETURNING m.id`;return rows.length?{status:200,discarded:true}:{status:409,error:'El mensaje ya se procesó.'};
 }
 if(op==='instagram-thread'){
  if(typeof body.id!=='string'||!/^[a-f0-9]{64}$/.test(body.id))return {status:400,error:'Conversación inválida.'};
  const config=inboxConfiguration(env);
  const messages=await sql`SELECT m.id,m.direction,m.text,m.status,m.version,m.created_at FROM console066_inbox_messages m JOIN console066_inbox_threads t ON t.id=m.thread_id WHERE t.id=${body.id} AND t.account_id=${config.accountId||''} ORDER BY m.created_at DESC LIMIT 100`;
  return {status:200,messages:messages.reverse()};
 }
 return {status:404,error:'Acción no disponible.'};
}
