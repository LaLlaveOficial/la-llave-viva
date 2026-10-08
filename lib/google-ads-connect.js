import {parseRPC} from './metricool-connect.js';

// The owner and account are server-owned. No arbitrary GAQL or mutation tool
// can be submitted by the browser or an agent through this endpoint.
export const ADS_CUSTOMER='3149885754';
export function adsConfiguration(env){
 const missing=['GOOGLE_ADS_MCP_URL','GOOGLE_ADS_CONNECTOR_UID'].filter(k=>!env[k]);
 if(missing.length)return {ready:false,missing};
 try{
  const url=new URL(env.GOOGLE_ADS_MCP_URL);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/mcp')throw Error();
  if(!/^[a-z0-9.-]+\/[a-zA-Z0-9_-]+$/.test(env.GOOGLE_ADS_CONNECTOR_UID))throw Error();
  return {ready:true,url:url.href,uid:env.GOOGLE_ADS_CONNECTOR_UID};
 }catch{return {ready:false,missing:['Configuración del servidor oficial de Google Ads']};}
}
export async function adsCredential(action,env,fetcher=fetch){
 const config=adsConfiguration(env);
 if(!config.ready)throw Error('Falta configurar el servidor oficial de Google Ads y su autorización de Google Cloud.');
 if(!env.VERCEL_OIDC_TOKEN)throw Error('Falta la identidad del proyecto para autorizar Google Ads.');
 const response=await fetcher(`https://api.vercel.com/v1/connect/${action}/${encodeURIComponent(config.uid)}`,{
  method:'POST',redirect:'error',headers:{Authorization:`Bearer ${env.VERCEL_OIDC_TOKEN}`,'Content-Type':'application/json'},
  body:JSON.stringify({subject:{type:'user',id:'console066-owner'},...(action==='authorize'?{returnUrl:'https://www.lallaveoficial.com/operaciones-066'}:{})}),signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)throw Error(response.status===401||response.status===403?'Autoriza Google Ads con la cuenta de Santibáñez.':'No se pudo obtener la autorización de Google Ads.');
 const data=await response.json();
 if(action==='authorize'){
  const url=new URL(data.url||data.authorizationUrl);
  if(url.protocol!=='https:'||!['connect.vercel.com','vercel.com'].includes(url.hostname))throw Error('Destino de autorización no reconocido.');
  return {url:url.href};
 }
 if(typeof data.token!=='string'||!data.token)throw Error('La autorización de Google Ads no devolvió un permiso válido.');
 return data.token;
}
function toolValue(result){
 if(result?.isError){
  const text=(result.content||[]).filter(x=>x.type==='text').map(x=>x.text).join(' ');
  if(/only approved for use with test accounts/i.test(text))throw Error('Google autorizó la conexión, pero el proyecto Google Cloud solo permite cuentas de prueba. En Google Ads API → Descripción general → Actualizar nivel de acceso, solicita Explorer para consultar la cuenta real de La Llave.');
  throw Error('Google Ads rechazó la consulta. Revisa el permiso de la cuenta y el acceso API del proyecto Google Cloud.');
 }
 if(result?.structuredContent){const value=result.structuredContent;return Array.isArray(value.result)?value.result:value;}
 const blocks=result?.content?.filter(x=>x.type==='text')||[];
 if(!blocks.length)throw Error('Google Ads no devolvió un resultado legible.');
 const values=blocks.map(x=>JSON.parse(x.text));
 return values.length===1?values[0]:values;
}
export async function googleAdsSync(sql,env,fetcher=fetch){
 const config=adsConfiguration(env);if(!config.ready)throw Error('Google Ads directo todavía requiere configurar Google Cloud y el servidor oficial.');
 const token=await adsCredential('token',env,fetcher);let session,id=0;
 async function rpc(method,params){
  const response=await fetcher(config.url,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-03-26',...(session?{'Mcp-Session-Id':session}:{})},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error(`El servidor oficial de Google Ads no respondió (${response.status}).`);
  session=response.headers.get('mcp-session-id')||session;
  const value=parseRPC(await response.text());if(value.error)throw Error('El servidor oficial rechazó la consulta de Google Ads.');return value.result;
 }
 await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'La Llave 066',version:'1.0.0'}});
 const initialized=await fetcher(config.url,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-03-26',...(session?{'Mcp-Session-Id':session}:{})},body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'}),signal:AbortSignal.timeout(10000)});
 if(!initialized.ok)throw Error('No se pudo inicializar la sesión de Google Ads.');
 const tools=(await rpc('tools/list',{})).tools||[];
 function find(suffix){const matches=tools.filter(t=>t.name===suffix||t.name.endsWith('_'+suffix));if(matches.length!==1)throw Error('Las herramientas oficiales de Google Ads no coinciden con la configuración.');return matches[0].name;}
 const search=find('search'),metadata=find('get_resource_metadata');
 async function call(name,args){return toolValue(await rpc('tools/call',{name,arguments:args}));}
 // Verify the API field metadata before constructing any query.
 async function query(resource,fields,conditions=[],limit=100){
  const meta=await call(metadata,{resource_name:resource});
  if(fields.some(f=>!meta.selectable?.includes(f)))throw Error('Google Ads no permite todos los campos requeridos para esta consulta.');
  const rows=await call(search,{customer_id:ADS_CUSTOMER,resource,fields,conditions,limit});
  if(!Array.isArray(rows))throw Error('Formato de datos de Google Ads no reconocido.');return rows;
 }
 const account=(await query('customer',['customer.id','customer.descriptive_name','customer.currency_code','customer.time_zone'],[],1))[0];
 if(!account||String(account['customer.id'])!==ADS_CUSTOMER)throw Error('La cuenta devuelta no corresponde a Google Ads de La Llave.');
 const to=new Intl.DateTimeFormat('en-CA',{timeZone:account['customer.time_zone'],year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const from=new Date(Date.parse(to+'T12:00:00Z')-6*86400000).toISOString().slice(0,10);
 const campaignFields=['campaign.id','campaign.name','campaign.status','metrics.impressions','metrics.clicks','metrics.cost_micros','metrics.conversions','metrics.conversions_value'];
 const campaigns=await query('campaign',campaignFields,[`segments.date BETWEEN '${from}' AND '${to}'`],500);
 let recommendations=[],recommendationsError=null;
 try{recommendations=await query('recommendation',['recommendation.resource_name','recommendation.type'],['recommendation.dismissed = FALSE'],100);}catch{recommendationsError='No se pudieron consultar las recomendaciones; las métricas sí se verificaron.';}
 const result={status:'Conectado',source:'Google Ads · MCP oficial',customerId:ADS_CUSTOMER,name:account['customer.descriptive_name'],currency:account['customer.currency_code'],timeZone:account['customer.time_zone'],from,to,checkedAt:new Date().toISOString(),campaigns:campaigns.map(r=>({id:String(r['campaign.id']),name:r['campaign.name'],status:r['campaign.status'],impressions:r['metrics.impressions'],clicks:r['metrics.clicks'],cost:Number(r['metrics.cost_micros'])/1e6,conversions:r['metrics.conversions'],conversionValue:r['metrics.conversions_value']})),recommendations,recommendationsError};
 if(result.campaigns.some(r=>!Number.isFinite(r.cost)))throw Error('Google Ads devolvió un gasto inválido; no se guardó la consulta.');
 // Only observations persist. OAuth credentials and MCP sessions never do.
 await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('google-ads',0,'read',${JSON.stringify(result)}::jsonb)`;
 return result;
}
export async function googleAdsStatus(sql,env){
 const config=adsConfiguration(env);
 const rows=await sql`SELECT detail FROM console066_audit WHERE entity='google-ads' AND action='read' ORDER BY id DESC LIMIT 1`;
 return {status:config.ready?(rows[0]?.detail?'Última consulta verificada':'Autorización o consulta pendiente'):'Configuración pendiente',ready:config.ready,missing:config.missing||[],customerId:ADS_CUSTOMER,lastObservation:rows[0]?.detail||null};
}
