// Only aggregate advertising fields enter the agent context. No raw audit payloads.
const fields={
 campaigns:['campaign.id','campaign.name','campaign.status','campaign.primary_status','campaign.primary_status_reasons','campaign.end_date_time','campaign_budget.period','campaign_budget.total_amount_micros','metrics.impressions','metrics.clicks','metrics.cost_micros','metrics.conversions','metrics.all_conversions'],
 searchTerms:['campaign.id','search_term_view.search_term','metrics.clicks','metrics.cost_micros','metrics.conversions'],
 recommendations:['recommendation.type','recommendation.campaign','recommendation.improve_demand_gen_ad_strength_recommendation'],
 conversionSetup:['conversion_action.name','conversion_action.type','conversion_action.status','conversion_action.primary_for_goal'],
 ads:['campaign.id','ad_group_ad.ad.id','ad_group_ad.ad.type','ad_group_ad.status','ad_group_ad.ad_strength','ad_group_ad.policy_summary.approval_status']
};
export function adsWatchContext(reports,now=new Date()){
 const coverage=Object.keys(fields).map(section=>{
  const report=reports.find(r=>r.section===section),stamp=Date.parse(report?.checkedAt);
  const age=Number.isFinite(stamp)?now.getTime()-stamp:null;
  const valid=report?.customerId==='3149885754'&&report?.currency==='CLP'&&Array.isArray(report?.rows);
  if(!valid)return {section,status:'missing'};
  const cap=section==='searchTerms'?30:20;
  const rows=[...report.rows];
  if(section==='searchTerms')rows.sort((a,b)=>Number(b['metrics.cost_micros']||0)-Number(a['metrics.cost_micros']||0));
  return {section,status:age!==null&&age>=-60000&&age<=2*3600000?'current':'stale',checkedAt:report.checkedAt,from:report.from,to:report.to,source:report.source,totalRows:rows.length,truncated:report.truncated===true,sampled:rows.length>cap,rows:rows.slice(0,cap).map(row=>Object.fromEntries(fields[section].filter(k=>row[k]!==undefined).map(k=>[k,row[k]])))};
 });
 return {status:coverage.every(r=>r.status==='current')?'current':'partial',coverage,instructions:'Lectura directa de Google Ads guardada por OP066. current indica antigüedad de consulta, no entrega activa. Un informe antiguo no equivale a cero. No sumar periodos diferentes. Las conversiones atribuidas no son pagos reales verificados. La compra GA4 de septiembre y la prueba directa de octubre fueron distintas. No modificar presupuesto, anuncios, públicos ni conversiones. Guardar hallazgos para revisión.'};
}
