// Read-only Marketing API. Tokens stay on the server; account and campaign scope
// are configured explicitly because the advertiser also owns unrelated campaigns.
const BASE='https://graph.facebook.com/v25.0/';
const day=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
export function metaPeriod(body={},now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const until=body.until||today,since=body.since||until.slice(0,8)+'01';
 if(!day(since)||!day(until)||since>until||until>today||(Date.parse(until)-Date.parse(since))/86400000>92)throw new Error('Selecciona un periodo válido de hasta 93 días.');
 return {since,until};
}
function config(env){
 const token=env.META_ADS_ACCESS_TOKEN,account=env.META_ADS_ACCOUNT_ID;
 const ids=(env.META_ADS_CAMPAIGN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!token||!/^act_\d+$/.test(account||'')||!ids.length||ids.some(x=>!/^\d+$/.test(x)))throw new Error('La conexión directa de Meta aún requiere configuración privada.');
 return {token,account,ids:new Set(ids)};
}
async function graph(path,params,c,fetcher){
 const url=new URL(path,BASE);for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));
 const response=await fetcher(url,{headers:{Authorization:`Bearer ${c.token}`},signal:AbortSignal.timeout(20000)});
 let json;try{json=await response.json();}catch{throw new Error('Meta devolvió una respuesta no válida.');}
 if(!response.ok||json.error){const code=json.error?.code;throw new Error(code===190?'La autorización de Meta venció o fue revocada.':'No se pudo consultar Meta. Revisa los permisos y vuelve a intentar.');}
 return json;
}
async function collection(path,params,c,fetcher){
 const rows=[];let after;
 for(let page=0;page<20;page++){
  const json=await graph(path,{...params,limit:100,...(after?{after}:{})},c,fetcher);
  if(!Array.isArray(json.data))throw new Error('Meta no entregó la colección solicitada.');
  rows.push(...json.data);
  if(!json.paging?.next)return rows;
  const next=json.paging?.cursors?.after;
  if(!next||next===after)throw new Error('Meta no pudo completar la paginación.');
  after=next;
 }
 throw new Error('El informe excede el límite; reduce el periodo.');
}
const number=v=>v===undefined||v===null?null:Number.isFinite(Number(v))?Number(v):null;
const purchase=list=>number(list?.find(x=>x.action_type==='offsite_conversion.fb_pixel_purchase')?.value);
export async function metaAdsRead(body={},env=process.env,fetcher=fetch){
 const period=metaPeriod(body),c=config(env);
 const account=await graph(c.account,{fields:'id,name,currency,timezone_name,account_status'},c,fetcher);
 if(account.id!==c.account||account.currency!=='CLP')throw new Error('La cuenta o moneda no coincide con la configuración de La Llave.');
 const [campaigns,insights]=await Promise.all([
  collection(c.account+'/campaigns',{fields:'id,name,status,effective_status,objective'},c,fetcher),
  collection(c.account+'/insights',{level:'campaign',fields:'campaign_id,campaign_name,spend,impressions,clicks,reach,cpc,cpm,ctr,actions,action_values',time_range:JSON.stringify(period)},c,fetcher)
 ]);
 const observed=new Map(insights.filter(x=>c.ids.has(x.campaign_id)).map(x=>[x.campaign_id,x]));
 const rows=campaigns.filter(x=>c.ids.has(x.id)).map(x=>{
  const i=observed.get(x.id);const spend=number(i?.spend),purchases=purchase(i?.actions),revenue=purchase(i?.action_values);
  return {id:x.id,name:x.name,status:x.status,effectiveStatus:x.effective_status,objective:x.objective,hasInsights:!!i,spend,impressions:number(i?.impressions),clicks:number(i?.clicks),reach:number(i?.reach),cpc:number(i?.cpc),cpm:number(i?.cpm),ctr:number(i?.ctr),purchases,revenue,cpa:purchases>0&&spend!==null?spend/purchases:null,roas:spend>0&&revenue!==null?revenue/spend:null};
 });
 return {source:'Meta Marketing API',checkedAt:new Date().toISOString(),period,account:{id:account.id,currency:account.currency,timezone:account.timezone_name,status:account.account_status},scope:'Campañas de La Llave seleccionadas; otras campañas de la cuenta quedan fuera.',readOnly:true,rows,note:'Datos atribuidos por Meta; pueden tener retraso y ajustes. Sin informe no equivale a cero. El estado de campaña no garantiza entrega; consulta también su estado efectivo. Compras web del píxel: no sumamos categorías superpuestas.'};
}
export async function metaAdsSync(sql,body,env){
 const detail=await metaAdsRead(body,env);
 await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('meta-ads',0,'read',${JSON.stringify(detail)}::jsonb)`;
 return detail;
}
