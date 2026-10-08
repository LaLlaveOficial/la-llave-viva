import {openAdsSession} from './google-ads-connect.js';
export function validateChange(body){
 if(!body||typeof body.reason!=='string'||body.reason.trim().length<5||body.reason.length>1000||!/^\d{1,20}$/.test(String(body.campaignId||'')))throw Error('Selecciona una campaña y explica el motivo del cambio.');
 const change={action:body.action,campaignId:String(body.campaignId)};
 if(['campaign_status','ad_status'].includes(body.action)){
  if(!['PAUSED','ENABLED'].includes(body.value))throw Error('Estado inválido.');change.value=body.value;
  if(body.action==='ad_status'){if(!/^customers\/3149885754\/adGroupAds\/\d+~\d+$/.test(body.resource||''))throw Error('Selecciona un anuncio válido de La Llave.');change.resource=body.resource;}
 }else if(body.action==='campaign_budget'){
  if(!Number.isSafeInteger(body.value)||body.value<1||body.value>500000)throw Error('Presupuesto diario: entre 1 y 500.000 CLP.');change.value=body.value;
 }else if(body.action==='negative_keyword'){
  if(typeof body.value!=='string'||body.value.trim().length<1||body.value.trim().length>80||/[\x00-\x1f]/.test(body.value)||!['EXACT','PHRASE','BROAD'].includes(body.matchType))throw Error('Revisa la palabra negativa y su concordancia.');change.value=body.value.trim();change.matchType=body.matchType;
 }else throw Error('Tipo de cambio no permitido.');
 return {change,reason:body.reason.trim()};
}
async function executor(env,fetcher){
 const s=await openAdsSession(env,fetcher);
 const tool=s.tools.find(t=>t.name==='llave_approved_change');
 if(!tool)throw Error('El ejecutor de cambios aprobados todavía no está disponible.');
 if(env.VERCEL_ENV&&env.VERCEL_ENV!=='production')throw Error('Los cambios solo se validan y ejecutan en producción.');
 return args=>s.call(tool.name,{project_token:env.VERCEL_OIDC_TOKEN,...args});
}
export async function proposeAdsChange(sql,env,body,fetcher=fetch){
 const {change,reason}=validateChange(body);const call=await executor(env,fetcher);
 const checked=await call({change,mode:'validate'});
 if(checked.status!=='validated'||!checked.before||JSON.stringify(checked.change)!==JSON.stringify(change))throw Error('El servidor no confirmó la validación exacta de la propuesta.');
 const detail={status:'validated',change,before:checked.before,reason,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+30*60000).toISOString()};
 const rows=await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('google-ads-change',0,'proposal',${JSON.stringify(detail)}::jsonb) RETURNING id,detail`;
 return rows[0];
}
export async function approveAdsChange(sql,env,body,fetcher=fetch){
 if(!Number.isSafeInteger(body.id)||body.id<1||body.confirm!==true)throw Error('Aprueba una propuesta concreta antes de ejecutar.');
 const rows=await sql`UPDATE console066_audit SET detail=detail||jsonb_build_object('status','executing','approvedAt',now()) WHERE id=${body.id} AND entity='google-ads-change' AND detail->>'status'='validated' AND (detail->>'expiresAt')::timestamptz>now() RETURNING detail`;
 if(rows.length!==1)throw Error('La propuesta venció o ya fue procesada; no se repite el cambio.');
 const proposal=rows[0].detail;
 try{
  const call=await executor(env,fetcher);
  const result=await call({change:proposal.change,expected:proposal.before,proposal_id:String(body.id),mode:'execute'});
  if(!['verified','uncertain'].includes(result.status))throw Error('No se confirmó el resultado.');
  const detail={...proposal,status:result.status,result,finishedAt:new Date().toISOString()};
  await sql`UPDATE console066_audit SET detail=${JSON.stringify(detail)}::jsonb WHERE id=${body.id} AND entity='google-ads-change'`;
  return {id:body.id,detail};
 }catch{
  await sql`UPDATE console066_audit SET detail=detail||jsonb_build_object('status','uncertain','error','No se confirmó el resultado. Revisa el estado actual antes de preparar otra propuesta.') WHERE id=${body.id} AND entity='google-ads-change'`;
  throw Error('No se confirmó el cambio. Se registró para revisión y no se repetirá automáticamente.');
 }
}
export async function adsChangeHistory(sql){return sql`SELECT id,detail FROM console066_audit WHERE entity='google-ads-change' ORDER BY id DESC LIMIT 50`;}
