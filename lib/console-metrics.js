// Private Metricool imports are observations, never a claim of a live API connection.
export const METRIC_FIELDS={
 googleAds:[['GAEV01','Impresiones','SUM'],['GAEV02','Gasto informado','SUM'],['GAEV03','Clics','SUM'],['GAEV04','Conversiones atribuidas','SUM'],['GAEV05','Valor atribuido','SUM']],
 instagram:[['IGEV01','Seguidores','LAST'],['IGEV05','Visualizaciones','SUM'],['IGEV09','Interacciones','SUM'],['IGEV23','Visualizaciones de reels','SUM'],['IGEV43','Seguidores ganados','SUM'],['IGEV44','Seguidores perdidos','SUM']],
 metaAds:[['FAEV01','Impresiones','SUM'],['FAEV04','Gasto informado','SUM'],['FAEV05','Clics','SUM'],['FAEV10','Valor de compras atribuido','SUM']]
};
export function validateMetricImport(body){
 const fields=METRIC_FIELDS[body?.network];
 if(!fields||body.brandId!=='6252950'||typeof body.from!=='string'||typeof body.to!=='string'||!Number.isFinite(Date.parse(body.from))||!Number.isFinite(Date.parse(body.to))||Date.parse(body.from)>Date.parse(body.to)||Date.parse(body.to)>Date.now()+60000||!Array.isArray(body.rows)||body.rows.length>370)return null;
 const rows=[];const dates=new Set();
 for(const row of body.rows){
  if(!Array.isArray(row)||row.length!==fields.length+1)return null;
  const date=row.at(-1);if(!/^\d{8}$/.test(date)||dates.has(date))return null;
  const day=date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8);const parsed=new Date(day+'T12:00:00Z');if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==day||day<body.from.slice(0,10)||day>body.to.slice(0,10))return null;
  if(row.slice(0,-1).some(v=>v!==null&&!(typeof v==='number'||(typeof v==='string'&&/^\d+(\.\d+)?$/.test(v)))))return null;
  const values=row.slice(0,-1).map(v=>v===null?null:Number(v));if(values.some(v=>v!==null&&(!Number.isFinite(v)||v<0)))return null;
  dates.add(date);rows.push([...values,date]);
 }
 rows.sort((a,b)=>a.at(-1).localeCompare(b.at(-1)));
 return {network:body.network,brandId:body.brandId,from:body.from,to:body.to,rows,source:'Metricool',importedAt:new Date().toISOString(),currency:null};
}
export function summarizeMetrics(snapshot){
 const fields=METRIC_FIELDS[snapshot.network];
 return {...snapshot,metrics:fields.map(([id,label,aggregation],i)=>{
  const values=snapshot.rows.map(r=>r[i]).filter(v=>v!==null);
  return {id,label,aggregation,value:values.length?(aggregation==='LAST'?values.at(-1):values.reduce((a,b)=>a+b,0)):null,availableDays:values.length,totalDays:snapshot.rows.length};
 })};
}
export async function privateMetrics(sql){
 const snapshots=await sql`SELECT DISTINCT ON (detail->>'network') detail FROM console066_audit WHERE entity='metrics' AND action='import' ORDER BY detail->>'network',id DESC`;
 let sales={status:'No disponible',description:'No se pudo consultar el registro de pagos.'};
 try{
  const rows=await sql`SELECT payment_status,currency,COUNT(*)::int AS orders,COALESCE(SUM(total_amount),0)::numeric AS total_amount,COALESCE(SUM(book_price),0)::numeric AS book_amount FROM orders GROUP BY payment_status,currency ORDER BY payment_status,currency`;
  sales={status:'Conectado',scope:'Histórico del registro de pagos del sitio; incluye compras de prueba si están registradas. Sin atribución publicitaria.',rows};
 }catch{/* Analytics unavailable must not make the CRM fail. */}
 let googleAds=null;
 try{const direct=await sql`SELECT detail FROM console066_audit WHERE entity='google-ads' AND action='read' ORDER BY id DESC LIMIT 1`;googleAds=direct[0]?.detail||null;}catch{/* Optional direct observation must not hide Metricool or payments. */}
 let metaAds=null;
 try{const rows=await sql`SELECT detail FROM console066_audit WHERE entity='meta-ads' AND action='read' ORDER BY id DESC LIMIT 1`;metaAds=rows[0]?.detail||null;}catch{/* Optional direct report. */}
 const connected=snapshots.filter(r=>r.detail.collection==='oauth').map(r=>r.detail.network);
 return {metricool:{status:connected.length?'Consultas verificadas':'Autorización pendiente',networks:connected},checkedAt:new Date().toISOString(),googleAds,metaAds,sales,snapshots:snapshots.map(r=>summarizeMetrics(r.detail)),directConnections:{ga4:'Pendiente de autorización de lectura',googleAds:googleAds?'Última consulta directa verificada: '+googleAds.checkedAt+'; no equivale a estado actual':'Sin consulta directa verificada desde esta consola',metaAds:metaAds?'Última consulta directa verificada: '+metaAds.checkedAt+'; solo lectura':'Sin consulta directa verificada desde esta consola',instagram:connected.includes('instagram')?'Métricas mediante Metricool; mensajería pendiente':'Métricas importadas; mensajería no conectada'}};
}
