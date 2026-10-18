# Clientes y mailing 066

Ruta privada: `/operaciones-066` → **Clientes y mailing**. Fuente: Neon, consultada al abrir/actualizar; búsqueda hasta 500 registros por tipo. No se publican los datos personales ni se incorporan al contexto de los agentes.

## Clientes y pedidos

- Compradores agrupados por correo; suscripción separada de la compra. No se crea consentimiento desde una venta.
- Contacto, dirección y detalle de importes; el pago se conserva separado del seguimiento manual de preparación, transportista, despacho y entrega. No hay integración con transportistas ni confirmación automática de recepción.
- Los registros clasificados como prueba, modo test y nombre `abc` se ocultan por defecto y pueden verse. Un pago live no demuestra por sí solo que sea una venta real: aún requiere revisar las pruebas históricas sin clasificación.
- Pendiente por más de dos horas = **posible** abandono. Un pago en proceso no se presenta como abandonado. El motivo debe venir del proveedor o ser informado por el cliente, registrando su fuente. La vista muestra las confirmaciones y recuperaciones de checkout ya existentes, sin crear otro recuperador duplicado.

## Campañas

1. Crear o usar **Preparar Halloween · 10%**. Editar asunto, preheader, mensaje, botón, fechas y segmento. Variables del cuerpo: `{{nombre}}`, `{{codigo}}`, `{{vence}}`. Bases opcionales para comunicar concursos; no ejecuta sorteos.
2. Guardar borrador y revisar vista previa. Congelar contenido y destinatarios; la audiencia incluye consentimiento vigente, excluye bajas y se deduplica por correo. Las campañas congeladas se duplican para cambios.
3. Aprobar la versión exacta activa su cupón, si existe. No envía mensajes. El cupón es válido para la audiencia congelada que conserve una suscripción activa, usando el mismo correo; 10% del libro físico, envío aparte, fechas inclusive según Chile. AJRAZ10 anterior sigue con su vencimiento original.
4. Confirmar **Enviar siguiente lote** (hasta 5 correos). Cada destinat…5978 tokens truncated…n_id=${s.c.id} AND email=${recipient.email}`;continue;}
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
