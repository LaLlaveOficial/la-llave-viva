// Aggregate, read-only GA4 reports. The property is server-owned, never supplied by a client.
export const GA4_PROPERTY='551476480';
export const GA4_SCOPE='https://www.googleapis.com/auth/analytics.readonly';
export function ga4Period(body={},now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const until=body.until||today,since=body.since||new Date(Date.parse(today+'T12:00:00Z')-6*86400000).toISOString().slice(0,10);
 for(const d of [since,until])if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)throw Error('Fecha inválida.');
 if(since>until||until>today||(Date.parse(until)-Date.parse(since))/86400000>92)throw Error('Selecciona hasta 93 días, sin fechas futuras.');
 return {since,until};
}
export async function ga4Credential(action,env,fetcher=fetch){
 const uid=env.GA4_CONNECTOR_UID;
 if(!uid||!/^google\/[a-zA-Z0-9_-]+$/.test(uid))throw Error('Falta conectar Google Analytics de solo lectura.');
 if(!env.VERCEL_OIDC_TOKEN)throw Error('Falta la identidad del proyecto para consultar GA4.');
 const r=await fetcher(`https://api.vercel.com/v1/connect/${action}/${encodeURIComponent(uid)}`,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${env.VERCEL_OIDC_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({subject:{type:'user',id:'console066-owner'},scopes:[GA4_SCOPE],...(action==='authorize'?{returnUrl:'https://www.lallaveoficial.com/operaciones-066'}:{})}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Autoriza la lectura de Google Analytics con una cuenta que tenga acceso a La Llave Oficial.');
 const value=await r.json();
 if(action==='authorize'){
  const u=new URL(value.url||value.authorizationUrl);
  if(u.protocol!=='https:'||!['connect.vercel.com','vercel.com'].includes(u.hostname))throw Error('Destino de autorización inválido.');
  return {url:u.href};
 }
 if(typeof value.token!=='string'||!value.token)throw Error('Google no devolvió un permiso válido de lectura.');
 return value.token;
}
export function ga4Rows(report){
 const dimensions=(report.dimensionHeaders||[]).map(x=>x.name),metrics=(report.metricHeaders||[]).map(x=>x.name);
 return (report.rows||[]).map(r=>{
  if((r.dimensionValues||[]).length!==dimensions.length||(r.metricValues||[]).length!==metrics.length)throw Error('Google devolvió un informe incompleto.');
  const out=Object.fromEntries(dimensions.map((d,i)=>[d,r.dimensionValues[i].value]));
  metrics.forEach((m,i)=>{const raw=r.metricValues[i].value;const v=typeof raw==='string'&&raw.trim()?Number(raw):NaN;if(!Number.isFinite(v))throw Error('Google devolvió una métrica inválida.');out[m]=v;});return out;
 });
}
export async function ga4Sync(sql,body,env,fetcher=fetch){
 const period=ga4Period(body),token=await ga4Credential('token',env,fetcher);
 async function report(method,dimensions,metrics,extra={}){
  const r=await fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:${method}`,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({dimensions:dimensions.map(name=>({name})),metrics:metrics.map(name=>({name})),limit:'100',returnPropertyQuota:true,...(method==='runReport'?{dateRanges:[{startDate:period.since,endDate:period.until}],currencyCode:'CLP'}:{}),...extra}),signal:AbortSignal.timeout(20000)});
  if(!r.ok){
   const error=await r.json().catch(()=>({}));
   const reasons=(Array.isArray(error.error?.details)?error.error.details:[]).map(d=>d.reason);
   if(reasons.includes('SERVICE_DISABLED'))throw Error('Google Analytics Data API está deshabilitada en el proyecto OAuth. Habilita analyticsdata.googleapis.com en La Llave Operaciones 066.');
   if(reasons.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT'))throw Error('El permiso de Google no incluye analytics.readonly. Vuelve a autorizar la lectura de GA4.');
   if(r.status===403&&/does not have sufficient permissions for this property/i.test(error.error?.message||''))throw Error('La cuenta autorizada no tiene acceso de lectura a la propiedad La Llave Oficial (551476480).');
   throw Error(r.status===401||r.status===403?'GA4 rechazó la lectura. Revisa el permiso analytics.readonly y que Google Analytics Data API esté habilitada.':'Google Analytics no respondió; conserva la última lectura guardada.');
  }
  const data=await r.json();return {rows:ga4Rows(data),rowCount:data.rowCount??data.rows?.length??0,metadata:data.metadata||{},quota:data.propertyQuota||null};
 }
 const overview=await report('runReport',[],['activeUsers','sessions','screenPageViews','eventCount','ecommercePurchases','purchaseRevenue']);
 const sources=await report('runReport',['sessionSourceMedium'],['sessions','engagedSessions','ecommercePurchases','purchaseRevenue'],{orderBys:[{metric:{metricName:'sessions'},desc:true}]});
 const events=await report('runReport',['eventName'],['eventCount'],{dimensionFilter:{filter:{fieldName:'eventName',inListFilter:{values:['view_item','begin_checkout','add_shipping_info','purchase']}}}});
 let realtime=null,realtimeError=null;
 try{realtime=await report('runRealtimeReport',[],['activeUsers']);}catch{realtimeError='No se pudo consultar tiempo real; el informe por fechas sí se guardó.';}
 const result={source:'Google Analytics Data API · lectura directa',propertyId:GA4_PROPERTY,propertyName:'La Llave Oficial',period,currency:'CLP',checkedAt:new Date().toISOString(),overview,sources,events,realtime,realtimeError,note:'Datos agregados de GA4. Tiempo real e informe por fechas tienen ventanas distintas. Compras de GA4, conversiones de Ads y pagos no se suman como ventas distintas. La ausencia de un evento en la respuesta no confirma un fallo de seguimiento.'};
 await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('ga4',0,'read',${JSON.stringify(result)}::jsonb)`;
 return result;
}
