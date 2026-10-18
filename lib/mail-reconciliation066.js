// Provider reads only. Never sends, cancels or retries an email.
export const MAIL_EVENTS066 = new Set(['bounced','canceled','clicked','complained','delivered','delivery_delayed','failed','opened','queued','scheduled','sent','suppressed']);
export async function reconcileMail066(sql,env={},fetcher=fetch){
 if(!env.RESEND_API_KEY)return {status:503,error:'El servicio de correo no está configurado.'};
 const rows=await sql`WITH candidates AS (
 SELECT resend_email_id AS provider_id FROM order_email_events WHERE resend_email_id IS NOT NULL
 UNION SELECT resend_email_id FROM mailing_sequence_emails WHERE resend_email_id IS NOT NULL
 UNION SELECT provider_id FROM console066_mail_recipients WHERE provider_id IS NOT NULL
 ) SELECT c.provider_id FROM candidates c LEFT JOIN console066_mail_receipts r USING(provider_id)
 WHERE c.provider_id ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' AND (r.checked_at IS NULL OR r.checked_at<now()-interval '24 hours')
 ORDER BY r.checked_at ASC NULLS FIRST,c.provider_id LIMIT 5`;
 let checked=0,unavailable=0;
 for(const row of rows){
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.provider_id)){unavailable++;continue;}
  let event=null,error=null;
  try{
   const response=await fetcher('https://api.resend.com/emails/'+row.provider_id,{method:'GET',headers:{Authorization:'Bearer '+env.RESEND_API_KEY},signal:AbortSignal.timeout(6000)});
   if(response.status===429)return {status:200,checked,unavailable,limited:true,sent:false};
   const data=response.ok?await response.json():null;
   if(response.ok&&data?.id===row.provider_id&&MAIL_EVENTS066.has(data.last_event))event=data.last_event;
   else error=response.ok?'unrecognized_response':'provider_http_'+response.status;
  }catch{error='provider_unavailable';}
  // Observation time is never an invented delivery/open timestamp.
  await sql`INSERT INTO console066_mail_receipts(provider_id,last_event,error,checked_at,observed_at)
   VALUES(${row.provider_id},${event},${error},now(),CASE WHEN ${event}::text IS NOT NULL THEN now() ELSE NULL END)
   ON CONFLICT(provider_id) DO UPDATE SET last_event=coalesce(EXCLUDED.last_event,console066_mail_receipts.last_event),error=EXCLUDED.error,checked_at=now(),observed_at=CASE WHEN EXCLUDED.last_event IS NOT NULL THEN now() ELSE console066_mail_receipts.observed_at END`;
  checked++;if(error)unavailable++;
  if(error==='provider_http_401'||error==='provider_http_403')break;
  await new Promise(resolve=>setTimeout(resolve,550));
 }
 await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES('mail-reconciliation',0,'provider-read',${JSON.stringify({checked,unavailable,sent:false})}::jsonb)`;
 return {status:200,checked,unavailable,sent:false};
}
export async function mailReceiptSummary066(sql){
 const rows=await sql`SELECT coalesce(last_event,'unavailable') AS event,count(*)::int AS total,max(observed_at) AS observed_at,count(*) FILTER(WHERE error IS NOT NULL)::int AS errors FROM console066_mail_receipts GROUP BY last_event ORDER BY last_event`;
 return {rows,note:'Último evento observado en Resend; apertura o clic no acreditan lectura humana. La fecha es de consulta, no del evento. No se reenvían mensajes.'};
}
