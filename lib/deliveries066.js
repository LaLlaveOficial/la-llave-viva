export async function recordStudioReceipt(sql,action,input,result){
 const job=result?.job;
 if(action==='init'&&job?.id===input.id){
  const evidence={source:'houston_authenticated_response',jobId:job.id,inputSha256:input.sha256,inputBytes:input.bytes,seconds:input.seconds,fps:input.fps,resolution:input.resolution,quality:input.quality,scope:'Montaje recibido para codificación. No acredita archivo terminado.'};
  await sql`INSERT INTO console066_delivery_receipts(id,source,source_id,state,evidence) VALUES(${'studio:'+job.id},'studio',${job.id},'uploading',${JSON.stringify(evidence)}::jsonb) ON CONFLICT(source,source_id) DO NOTHING`;
 }
 if(['start','status'].includes(action)&&job?.id===input.id&&job.status==='ready'&&Number.isSafeInteger(job.outputBytes)&&job.outputBytes>12){
  const evidence=JSON.stringify({outputBytes:job.outputBytes,generatedAt:new Date().toISOString(),scope:'Houston confirmó MP4 codificado con verificación de códec y duración. No acredita publicación ni entrega al comprador.'});
  await sql`UPDATE console066_delivery_receipts SET state=CASE WHEN state='download_verified_by_browser' THEN state ELSE 'generated' END,evidence=evidence||${evidence}::jsonb WHERE source='studio' AND source_id=${job.id}`;
 }
 if(['start','status'].includes(action)&&job?.id===input.id&&job.status==='failed')await sql`UPDATE console066_delivery_receipts SET state='failed',evidence=evidence||jsonb_build_object('error',${String(job.error||'Error de codificación').slice(0,500)}::text) WHERE source='studio' AND source_id=${job.id}`;
}
export async function deliveryApi(sql,op,body={}){
 if(op==='delivery-download'){
  if(typeof body.id!=='string'||!/^[a-f0-9-]{36}$/.test(body.id)||!/^[a-f0-9]{64}$/.test(body.sha256||'')||!Number.isSafeInteger(body.bytes)||body.bytes<12)return {status:400,error:'Comprobante de archivo inválido.'};
  const proof=JSON.stringify({downloadSha256:body.sha256,downloadBytes:body.bytes,checkedBy:'authenticated_browser',downloadCheckedAt:new Date().toISOString(),scope:'El navegador autenticado comprobó descarga completa y cabecera MP4. Hash calculado en el navegador; no acredita publicación ni respaldo permanente del archivo.'});
  const rows=await sql`UPDATE console066_delivery_receipts SET state='download_verified_by_browser',evidence=evidence||${proof}::jsonb WHERE source='studio' AND source_id=${body.id} AND state IN ('generated','download_verified_by_browser') AND (evidence->>'outputBytes')::bigint=${body.bytes} AND (evidence->>'downloadSha256' IS NULL OR evidence->>'downloadSha256'=${body.sha256}) RETURNING id`;
  return rows.length?{status:200,recorded:true}:{status:409,error:'Houston no confirmó este archivo o el comprobante no coincide.'};
 }
 if(op==='delivery-list'){
  const receipts=await sql`SELECT id,source,source_id,state,evidence,recorded_at FROM console066_delivery_receipts ORDER BY recorded_at DESC LIMIT 100`;
  const facebook=await sql`SELECT id,group_id,status,receipt,updated_at FROM console066_fb_posts WHERE status IN ('submitted','published','uncertain','rejected') ORDER BY updated_at DESC LIMIT 100`;
  const instagram=await sql`SELECT id,thread_id,status,provider_id,finished_at FROM console066_inbox_messages WHERE direction='outbound' AND status IN ('accepted','uncertain','rejected') ORDER BY finished_at DESC LIMIT 50`;
  const email=await sql`SELECT id,thread_id,status,provider_id,finished_at FROM console066_gmail_replies WHERE status IN ('accepted','uncertain','rejected') ORDER BY finished_at DESC LIMIT 50`;
  return {status:200,receipts,facebook,instagram,email,checkedAt:new Date().toISOString(),scope:'Comprobantes por origen. Moderación pendiente no equivale a publicación. Aceptación de un mensaje no acredita entrega o lectura. Los registros de Facebook son observaciones documentadas, no validación de la API.'};
 }
 return {status:404,error:'Comprobante no disponible.'};
}
