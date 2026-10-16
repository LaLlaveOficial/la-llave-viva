import {createHash} from 'node:crypto';
const clean=(v,n=500)=>typeof v==='string'&&v.length<=n&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)?v.trim():null;
const email=v=>String(v||'').trim().toLowerCase();
export const escapeMail=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const chileDay=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
export const FULFILLMENT=['unprocessed','preparing','ready','shipped','delivered','incident'];
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=(error,status=400)=>({status,error});
export function validateMailDraft(b){
 const d=b?.data;if(!d||typeof d!=='object'||!/^[-\w]{1,100}$/.test(b.id||'')||!Number.isSafeInteger(b.version)||b.version<0)return null;
 const out={};for(const [k,n] of Object.entries({title:140,subject:140,preheader:180,body:6000,cta:80,code:24,validFrom:10,validUntil:10,segment:30,contestRules:2000})){
  out[k]=clean(d[k]??'',n);if(out[k]===null)return null;
 }
 if(!out.title||!out.subject||!out.body||!out.cta||/[\r\n]/.test(out.subject)||!['subscribers','nonbuyers','buyers'].includes(out.segment))return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(out.validFrom)||!/^\d{4}-\d{2}-\d{2}$/.test(out.validUntil)||!Number.isFinite(Date.parse(out.validFrom))||!Number.isFinite(Date.parse(out.validUntil))||new Date(out.validFrom).toISOString().slice(0,10)!==out.validFrom||new Date(out.validUntil).toISOString().slice(0,10)!==out.validUntil||out.validUntil<out.validFrom)return null;
 out.code=out.code.toUpperCase();if(out.code&&(!/^[A-Z0-9_-]{3,24}$/.test(out.code)||out.code==='AJRAZ10'))return null;
 // This first release supports the requested 10% on the physical book, never shipping.
 out.discountPercent=out.code?10:0;return {id:b.id,version:b.version,data:out};
}
export function renderCampaign(d,subscriber={name:'Kike',unsubscribe_token:'PREVIEW'},campaignId='preview'){
 const name=String(subscriber.name||'').trim().split(/\s+/)[0]||'lector';
 const body=d.body.replaceAll('{{nombre}}',name).replaceAll('{{codigo}}',d.code||'').replaceAll('{{vence}}',d.validUntil);
 const link=new URL('https://www.lallaveoficial.com/comprar');link.searchParams.set('utm_source','archivo066');link.searchParams.set('utm_medium','email');link.searchParams.set('utm_campaign',campaignId);if(d.code)link.searchParams.set('promo',d.code);
 const unsubscribe='https://www.lallaveoficial.com/api/unsubscribe?token='+encodeURIComponent(subscriber.unsubscribe_token);
 const offer=d.code?`10% de descuento sobre el libro físico: $14.391 CLP (precio normal $15.990). Envío se cobra por separado. Válido del ${d.validFrom} al ${d.validUntil}, hora de Chile, para suscriptores activos usando el mismo correo y código ${d.code}. No acumulable.`:'';
 const text=[d.preheader,body,offer,d.contestRules,d.cta+': '+link.href,'Recibes este correo por tu suscripción al Archivo 066.','Darte de baja: '+unsubscribe].filter(Boolean).join('\n\n');
 const html=`<!doctype html><html lang="es"><meta charset="utf-8"><body style="margin:0;background:#080c0e;font-family:Arial,sans-serif;color:#f5f1e8"><main style="max-width:620px;margin:auto;padding:32px"><p style="color:#d9b56a;letter-spacing:3px">LA LLAVE · ARCHIVO 066</p><span style="display:none">${escapeMail(d.preheader)}</span><h1>${escapeMail(d.subject)}</h1><div style="line-height:1.8;white-space:pre-wrap">${escapeMail(body)}</div>${offer?'<p style="padding:18px;border:1px solid #8b713a">'+escapeMail(offer)+'</p>':''}${d.contestRules?'<h2>Bases</h2><p style="white-space:pre-wrap">'+escapeMail(d.contestRules)+'</p>':''}<p><a href="${escapeMail(link.href)}" style="display:inline-block;padding:16px 24px;background:#dfb861;color:#101719;text-decoration:none">${escapeMail(d.cta)}</a></p><hr><p style="font-size:12px">Recibes este correo por tu suscripción al Archivo 066. <a href="${escapeMail(unsubscribe)}" style="color:#dfb861">Darte de baja</a></p></main></body></html>`;
 return {subject:d.subject,text,html,unsubscribe,link:link.href};
}
export function abandonment(order,now=Date.now()){
 if(order.payment_status==='approved')return {kind:'paid',reason:''};
 if(order.payment_status==='rejected')return {kind:'rejected',reason:order.payment_status_detail||'Rechazo sin detalle del proveedor'};
 if(['cancelled','canceled','refunded','charged_back'].includes(order.payment_status))return {kind:order.payment_status,reason:order.payment_status_detail||'Sin detalle adicional'};
 if(order.payment_status==='in_process'||/pending_waiting/.test(order.payment_status_detail||''))return {kind:'processing',reason:'Pago en proceso; no acredita abandono'};
 if(order.payment_status==='pending'&&now-Date.parse(order.created_at)>2*3600*1000)return {kind:'possible_abandonment',reason:'Checkout sin aprobación después de 2 horas. Motivo desconocido.'};
 return {kind:'pending',reason:'Pago no aprobado todavía'};
}
async function audience(sql,d){
 const rows=await sql`SELECT DISTINCT ON (lower(trim(s.email))) s.id,s.email,s.name FROM mailing_subscribers s
 WHERE s.status='active' AND s.unsubscribed_at IS NULL AND s.consent_at IS NOT NULL AND s.unsubscribe_token IS NOT NULL AND s.unsubscribe_token<>''
 AND (${d.segment}='subscribers' OR (${d.segment}='buyers' AND EXISTS(SELECT 1 FROM orders o WHERE lower(trim(o.buyer_email))=lower(trim(s.email)) AND o.payment_status='approved' AND o.live_mode=true)) OR (${d.segment}='nonbuyers' AND NOT EXISTS(SELECT 1 FROM orders o WHERE lower(trim(o.buyer_email))=lower(trim(s.email)) AND o.payment_status='approved' AND o.live_mode=true))) ORDER BY lower(trim(s.email)),s.id LIMIT 10001`;
 return rows.sort((a,b)=>Number(a.id)-Number(b.id));
}
async function approvedSnapshot(sql,id){
 const c=(await sql`SELECT * FROM console066_mail_campaigns WHERE id=${id}`)[0];if(!c)return null;
 let recipients=await sql`SELECT subscriber_id,email FROM console066_mail_recipients WHERE campaign_id=${id} ORDER BY subscriber_id,email`;
 recipients=recipients.map(r=>({...r,subscriber_id:String(r.subscriber_id)}));
 return {c,recipients,digest:hash({version:c.version,data:c.data,recipients})};
}
export async function customerMailApi(sql,op,b={},env={},fetcher=fetch){
 if(op==='customers-list'){
  const q=clean(b?.search||'',100);if(q===null)return fail('Búsqueda inválida.');const pattern='%'+q+'%';
  const subscribers=await sql`SELECT id,email,name,status,source,language,country,consent_method,consent_version,consent_at,unsubscribed_at,last_email_sent_at,created_at,utm_source,utm_medium,utm_campaign FROM mailing_subscribers WHERE email ILIKE ${pattern} OR name ILIKE ${pattern} ORDER BY created_at DESC LIMIT 501`;
  const orders=await sql`SELECT o.id,o.external_reference,o.payment_status,o.payment_status_detail,o.live_mode,o.buyer_name,o.buyer_email,o.buyer_phone,o.region_name,o.commune,o.street,o.street_number,o.address_extra,o.book_price,o.shipping_amount,o.total_amount,o.currency,o.mercado_pago_approved_at,o.created_at,o.utm_source,o.utm_medium,o.utm_campaign,o.referrer_host,COALESCE(p.version,0) AS ops_version,COALESCE(p.fulfillment,'unprocessed') AS fulfillment,COALESCE(p.carrier,'') AS carrier,COALESCE(p.tracking,'') AS tracking,COALESCE(p.notes,'') AS notes,COALESCE(p.abandonment_reason,'') AS abandonment_reason,COALESCE(p.reason_source,'') AS reason_source,l.status AS classification FROM orders o LEFT JOIN console066_order_ops p USING(external_reference) LEFT JOIN console066_marketing_records l ON l.kind='order-label' AND l.data->>'orderRef'=o.external_reference WHERE o.buyer_email ILIKE ${pattern} OR o.buyer_name ILIKE ${pattern} OR o.external_reference ILIKE ${pattern} ORDER BY o.created_at DESC LIMIT 501`;
  const summary=(await sql`SELECT (SELECT count(*)::int FROM mailing_subscribers) AS subscribers,(SELECT count(*)::int FROM mailing_subscribers WHERE status='active' AND consent_at IS NOT NULL AND unsubscribed_at IS NULL) AS active_subscribers,count(*) FILTER(WHERE payment_status='approved' AND live_mode=true)::int AS live_paid_orders,count(DISTINCT lower(trim(buyer_email))) FILTER(WHERE payment_status='approved' AND live_mode=true)::int AS paying_contacts FROM orders`)[0];
  const events=await sql`SELECT e.external_reference,e.email_type,e.status,e.scheduled_for,e.sent_at,e.canceled_at FROM order_email_events e JOIN orders o USING(external_reference) WHERE o.buyer_email ILIKE ${pattern} OR o.buyer_name ILIKE ${pattern} OR o.external_reference ILIKE ${pattern} ORDER BY e.created_at DESC LIMIT 1000`;
  return {status:200,subscribers:subscribers.slice(0,500),orders:orders.slice(0,500).map(o=>({...o,abandonment:abandonment(o)})),events,summary,truncated:subscribers.length>500||orders.length>500,checkedAt:new Date().toISOString(),n8n:false,orchestration:'Houston y servicios propios',sendingConfigured:!!env.RESEND_API_KEY};
 }
 if(op==='customer-order-save'){
  if(!b||!/^LLAVE-[\w-]+$/.test(b.orderRef||'')||!FULFILLMENT.includes(b.fulfillment)||!Number.isSafeInteger(b.version)||b.version<0)return fail('Pedido o estado inválido.');
  const v={};for(const [k,n] of Object.entries({carrier:100,tracking:150,notes:1500,abandonment_reason:500,reason_source:200})){v[k]=clean(b[k]||'',n);if(v[k]===null)return fail('Datos demasiado largos o inválidos.');}
  if(v.abandonment_reason&&!v.reason_source)return fail('Indica quién informó el motivo o la evidencia.');
  const order=(await sql`SELECT payment_status FROM orders WHERE external_reference=${b.orderRef}`)[0];if(!order)return fail('Pedido no encontrado.',404);
  if(['preparing','ready','shipped','delivered'].includes(b.fulfillment)&&order.payment_status!=='approved')return fail('El pago debe estar aprobado antes de preparar o despachar.',409);
  if(['shipped','delivered'].includes(b.fulfillment)&&(!v.carrier||!v.tracking))return fail('Completa transportista y seguimiento.');
  const rows=await sql`WITH changed AS (INSERT INTO console066_order_ops(external_reference,fulfillment,carrier,tracking,notes,abandonment_reason,reason_source) SELECT ${b.orderRef},${b.fulfillment},${v.carrier},${v.tracking},${v.notes},${v.abandonment_reason},${v.reason_source} WHERE ${b.version}=0 ON CONFLICT(external_reference) DO NOTHING RETURNING *) INSERT INTO console066_audit(entity,entity_id,action,detail) SELECT 'customer-order',0,'update',jsonb_build_object('orderRef',external_reference,'version',version,'fulfillment',fulfillment) FROM changed RETURNING id`;
  if(!rows.length){const changed=await sql`WITH changed AS (UPDATE console066_order_ops SET fulfillment=${b.fulfillment},carrier=${v.carrier},tracking=${v.tracking},notes=${v.notes},abandonment_reason=${v.abandonment_reason},reason_source=${v.reason_source},version=version+1,updated_at=now() WHERE external_reference=${b.orderRef} AND version=${b.version} RETURNING *) INSERT INTO console066_audit(entity,entity_id,action,detail) SELECT 'customer-order',0,'update',jsonb_build_object('orderRef',external_reference,'version',version,'fulfillment',fulfillment) FROM changed RETURNING id`;if(!changed.length)return fail('El pedido cambió. Actualiza antes de guardar.',409);}
  return {status:200,ok:true};
 }
 if(op==='mail-list')return {status:200,campaigns:await sql`SELECT c.*,COALESCE((SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*)::int n FROM console066_mail_recipients r WHERE r.campaign_id=c.id GROUP BY status) x),'{}'::jsonb) AS delivery FROM console066_mail_campaigns c ORDER BY created_at DESC LIMIT 100`,sendingConfigured:!!env.RESEND_API_KEY};
 if(op==='mail-save'){
  const item=validateMailDraft(b);if(!item)return fail('Completa asunto, mensaje, fechas y destinatarios.');
  const existing=(await sql`SELECT status FROM console066_mail_campaigns WHERE id=${item.id}`)[0];if(existing&&existing.status!=='draft')return fail('Una campaña preparada es inmutable. Duplica para editar.',409);
  let r;if(item.version===0)r=await sql`INSERT INTO console066_mail_campaigns(id,data) VALUES(${item.id},${JSON.stringify(item.data)}::jsonb) ON CONFLICT DO NOTHING RETURNING *`;
  else r=await sql`UPDATE console066_mail_campaigns SET data=${JSON.stringify(item.data)}::jsonb,version=version+1,updated_at=now() WHERE id=${item.id} AND version=${item.version} AND status='draft' RETURNING *`;
  return r.length?{status:200,campaign:r[0],sent:false}:fail('La campaña cambió. Actualiza antes de guardar.',409);
 }
 if(op==='mail-preview'){
  const c=(await sql`SELECT * FROM console066_mail_campaigns WHERE id=${String(b.id||'')}`)[0];if(!c)return fail('Campaña no encontrada.',404);
  const a=await audience(sql,c.data);return {status:200,preview:renderCampaign(c.data,undefined,c.id),eligible:a.length,limited:a.length>10000,version:c.version,data:c.data};
 }
 if(op==='mail-prepare'){
  const c=(await sql`SELECT * FROM console066_mail_campaigns WHERE id=${String(b.id||'')}`)[0];if(!c||c.status!=='draft'||c.version!==b.version)return fail('La campaña cambió o ya está preparada.',409);
  const a=await audience(sql,c.data);if(!a.length||a.length>10000)return fail('No hay destinatarios elegibles o se supera el máximo de 10.000.');
  // Atomically freeze content and recipient IDs. No email addresses in the audit.
  const snapshot=a.map(s=>({subscriber_id:String(s.id),email:email(s.email)}));
  const digest=hash({version:c.version,data:c.data,recipients:snapshot});
  const rows=await sql`WITH frozen AS (UPDATE console066_mail_campaigns SET status='review',approval_hash=${digest},updated_at=now() WHERE id=${c.id} AND version=${c.version} AND status='draft' RETURNING id), inserted AS (INSERT INTO console066_mail_recipients(campaign_id,email,subscriber_id) SELECT f.id,x.email,x.subscriber_id FROM frozen f CROSS JOIN jsonb_to_recordset(${JSON.stringify(snapshot)}::jsonb) AS x(email text,subscriber_id bigint) RETURNING campaign_id) SELECT count(*)::int AS n FROM inserted`;
  return rows[0]?.n?{status:200,count:rows[0].n,hash:digest,sent:false}:fail('Otra operación preparó la campaña.',409);
 }
 if(op==='mail-approve'){
  if(b.confirm!==true)return fail('Revisa el mensaje y confirma la aprobación.');const s=await approvedSnapshot(sql,String(b.id||''));
  if(!s||s.c.status!=='review'||s.c.version!==b.version||s.digest!==s.c.approval_hash||b.hash!==s.digest)return fail('La versión o audiencia cambió.',409);
  if(s.c.data.validUntil<chileDay())return fail('La campaña ya venció.');
  if(s.c.data.code){const other=(await sql`SELECT campaign_id FROM console066_mail_offers WHERE code=${s.c.data.code}`)[0];if(other&&other.campaign_id!==s.c.id)return fail('Ese código ya pertenece a otra campaña.',409);}
  const r=await sql`WITH approved AS (UPDATE console066_mail_campaigns SET status='approved',approved_at=now(),updated_at=now() WHERE id=${s.c.id} AND status='review' AND approval_hash=${s.digest} RETURNING *), offer AS (INSERT INTO console066_mail_offers(code,campaign_id,discount_percent,valid_from,valid_until) SELECT data->>'code',id,10,(data->>'validFrom')::date,(data->>'validUntil')::date FROM approved WHERE data->>'code'<>'' ON CONFLICT(campaign_id) DO NOTHING RETURNING code), logged AS (INSERT INTO console066_audit(entity,entity_id,action,detail) SELECT 'mail-campaign',0,'approve',jsonb_build_object('id',id,'version',version,'hash',approval_hash) FROM approved RETURNING id) SELECT id FROM approved`;
  return r.length?{status:200,ok:true,sent:false}:fail('La campaña ya fue procesada.',409);
 }
 if(op==='mail-send'){
  if(b.confirm!==true)return fail('Confirma el envío de este lote.');if(!env.RESEND_API_KEY)return fail('El servicio de correo no está configurado.',503);
  const s=await approvedSnapshot(sql,String(b.id||''));if(!s||!['approved','sending'].includes(s.c.status)||s.c.version!==b.version||s.digest!==s.c.approval_hash||b.hash!==s.digest)return fail('Campaña sin aprobación exacta.',409);
  const today=chileDay();if(today<s.c.data.validFrom||today>s.c.data.validUntil)return fail('La campaña está fuera de vigencia.',409);
  // Claim once; concurrent executions cannot send the same recipient. Unknown outcomes never auto-retry.
  const claimed=await sql`WITH picked AS (SELECT campaign_id,email FROM console066_mail_recipients WHERE campaign_id=${s.c.id} AND status='prepared' ORDER BY subscriber_id,email LIMIT 5 FOR UPDATE SKIP LOCKED) UPDATE console066_mail_recipients r SET status='sending',claimed_at=now() FROM picked p WHERE r.campaign_id=p.campaign_id AND r.email=p.email RETURNING r.*`;
  for(const recipient of claimed){
   const sub=(await sql`SELECT name,email,unsubscribe_token,status,unsubscribed_at,consent_at FROM mailing_subscribers WHERE id=${recipient.subscriber_id}`)[0];
   if(!sub||sub.status!=='active'||sub.unsubscribed_at||!sub.consent_at||!sub.unsubscribe_token||email(sub.email)!==recipient.email){await sql`UPDATE console066_mail_recipients SET status='excluded',error='Suscripción no vigente' WHERE campaign_id=${s.c.id} AND email=${recipient.email}`;continue;}
   const message=renderCampaign(s.c.data,sub,s.c.id);
   await new Promise(resolve=>setTimeout(resolve,550));
   try{
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(8000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'crm066-'+hash({campaign:s.c.id,email:recipient.email})},body:JSON.stringify({from:'Archivo 066 · La Llave <contacto@lallaveoficial.com>',reply_to:'contacto@lallaveoficial.com',to:[recipient.email],subject:message.subject,html:message.html,text:message.text,headers:{'List-Unsubscribe':`<${message.unsubscribe}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'},tags:[{name:'campaign',value:s.c.id}]})});
    const data=await response.json();
    if(response.ok&&typeof data.id==='string'){
     await sql`UPDATE console066_mail_recipients SET status='sent',provider_id=${data.id},sent_at=now() WHERE campaign_id=${s.c.id} AND email=${recipient.email}`;
     await sql`UPDATE mailing_subscribers SET last_email_sent_at=now() WHERE id=${recipient.subscriber_id}`;
    }else await sql`UPDATE console066_mail_recipients SET status=${response.status>=400&&response.status<500?'failed':'unknown'},error=${'Proveedor HTTP '+response.status} WHERE campaign_id=${s.c.id} AND email=${recipient.email}`;
   }catch{await sql`UPDATE console066_mail_recipients SET status='unknown',error='Resultado incierto: comprobar proveedor antes de cualquier reenvío' WHERE campaign_id=${s.c.id} AND email=${recipient.email}`;}
  }
  await sql`UPDATE console066_mail_campaigns SET status=CASE WHEN EXISTS(SELECT 1 FROM console066_mail_recipients WHERE campaign_id=${s.c.id} AND status IN ('prepared','sending')) THEN 'sending' ELSE 'completed' END,updated_at=now() WHERE id=${s.c.id}`;
  await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES('mail-campaign',0,'send-batch',${JSON.stringify({id:s.c.id,attempted:claimed.length,version:s.c.version})}::jsonb)`;
  return {status:200,attempted:claimed.length,note:'Aceptado por el proveedor no acredita entrega, apertura ni lectura.'};
 }
 return fail('Operación no reconocida.');
}
export async function validateSubscriberOffer(sql,emailValue,codeValue,now=new Date()){
 const code=String(codeValue||'').trim().toUpperCase(),address=email(emailValue);if(!/^[A-Z0-9_-]{3,24}$/.test(code)||!/^\S+@\S+\.\S+$/.test(address))return {ok:false,reason:'invalid_code',error:'Código o correo inválido.'};
 const day=chileDay(now);
 const rows=await sql`SELECT f.code,f.valid_until FROM console066_mail_offers f JOIN console066_mail_campaigns c ON c.id=f.campaign_id JOIN console066_mail_recipients r ON r.campaign_id=c.id AND r.email=${address} AND r.status<>'excluded' JOIN mailing_subscribers s ON s.id=r.subscriber_id AND lower(trim(s.email))=${address} WHERE f.code=${code} AND f.status='active' AND f.discount_percent=10 AND c.status IN ('approved','sending','completed') AND f.valid_from<=${day}::date AND f.valid_until>=${day}::date AND s.status='active' AND s.consent_at IS NOT NULL AND s.unsubscribed_at IS NULL LIMIT 1`;
 return rows.length?{ok:true,code,discountPercent:10,originalBookPrice:15990,discountAmount:1599,discountedBookPrice:14391,validUntil:rows[0].valid_until}:{ok:false,reason:'not_authorized',error:'Este código no está vigente para tu suscripción. Usa el mismo correo con que te registraste.'};
}
