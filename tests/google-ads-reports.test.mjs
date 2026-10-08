import test from 'node:test';
import assert from 'node:assert/strict';
import {reportPeriod,indicators,analyzeCampaigns,REPORTS,googleAdsReport,adsAnalysisMission} from '../lib/google-ads-reports.js';
import {validateChange,approveAdsChange} from '../lib/google-ads-changes.js';
test('date ranges reject rollover, future dates, injection and excessive windows',()=>{
 for(const value of [{from:'2026-02-30',to:'2026-03-01'},{from:"2026-10-01' OR TRUE",to:'2026-10-08'},{from:'2026-10-10',to:'2026-10-09'},{from:'2020-01-01',to:'2026-01-01'},{from:'2026-10-08',to:'2026-10-09'}])assert.throws(()=>reportPeriod(value,new Date('2026-10-08T20:00:00Z')));
 assert.deepEqual(reportPeriod({from:'2026-10-02',to:'2026-10-08'},new Date('2026-10-08T20:00:00Z')),{from:'2026-10-02',to:'2026-10-08',previousFrom:'2026-09-25',previousTo:'2026-10-01'});
});
test('zero and missing denominators do not invent CPA/ROAS; attribution stays distinct',()=>{
 const s=indicators({'metrics.cost_micros':'168000000','metrics.clicks':1,'metrics.impressions':59,'metrics.conversions':0,'metrics.all_conversions':1,'metrics.conversions_value':0});assert.equal(s.cpc,168);assert.equal(s.cpa,null);assert.equal(s.allConversions,1);assert.equal(indicators({}).cost,null);
 const report={section:'campaigns',from:'2026-10-02',to:'2026-10-08',rows:[{'campaign.id':'1','campaign.end_date':'2026-10-07','metrics.cost_micros':168000000,'metrics.conversions':0}],previousRows:[]};assert.ok(analyzeCampaigns(report)[0].findings.some(f=>f.includes('fecha final')));
});
test('changes cannot target another account, remove a campaign or accept arbitrary operations',()=>{
 for(const body of [{action:'delete',value:'REMOVED'},{action:'campaign_status',value:'REMOVED'},{action:'campaign_budget',value:-1},{action:'campaign_budget',value:500001},{action:'ad_status',value:'PAUSED',resource:'customers/123/adGroupAds/1~2'},{action:'negative_keyword',value:'a',matchType:'SQL'}])assert.throws(()=>validateChange({campaignId:'7',reason:'Revisión de resultados',...body}));
 assert.equal(validateChange({campaignId:'7',reason:'Consulta sin afinidad',action:'negative_keyword',value:'libro gratis',matchType:'EXACT'}).change.value,'libro gratis');
});
test('missing approval and stale approval never call the external API',async()=>{
 let calls=0;const fetcher=()=>{calls++;throw Error();};
 await assert.rejects(approveAdsChange(async()=>[],{}, {id:1,confirm:false},fetcher));
 await assert.rejects(approveAdsChange(async()=>[],{}, {id:1,confirm:true},fetcher),/venció/);assert.equal(calls,0);
});
test('report query validates metadata, fixed account, dates and exposes row caps',async()=>{
 const saved=[],calls=[];const sql=async(strings,...args)=>{saved.push(args);return [];};
 const fetcher=async(url,options)=>{const b=JSON.parse(options.body);calls.push(b);if(url.includes('/connect/token/'))return Response.json({token:'private-token'});if(b.method==='notifications/initialized')return new Response(null,{status:202});if(b.method==='initialize')return Response.json({result:{}});if(b.method==='tools/list')return Response.json({result:{tools:[{name:'search_search'},{name:'metadata_get_resource_metadata'}]}});const a=b.params.arguments;let v;if(b.params.name.endsWith('metadata')){v={selectable:[...REPORTS.campaigns.fields,'customer.id','customer.descriptive_name','customer.currency_code','customer.time_zone','metrics.impressions','metrics.clicks','metrics.cost_micros','metrics.conversions','metrics.all_conversions','metrics.conversions_value','metrics.all_conversions_value']};}else if(a.resource==='customer'){v=[{'customer.id':'3149885754','customer.currency_code':'CLP','customer.time_zone':'America/Santiago'}];}else{assert.equal(a.customer_id,'3149885754');assert.ok(a.conditions[0].includes('BETWEEN'));v=[{'campaign.id':'7','campaign.name':'La Llave','metrics.impressions':10,'metrics.clicks':1,'metrics.cost_micros':50000000}];}return Response.json({result:{content:[{type:'text',text:JSON.stringify(v)}]}});};
 const r=await googleAdsReport(sql,{GOOGLE_ADS_MCP_URL:'https://ads.example.com/mcp',GOOGLE_ADS_CONNECTOR_UID:'oauth/llave',VERCEL_OIDC_TOKEN:'private-oidc'},{section:'campaigns',from:'2026-10-02',to:'2026-10-08'},fetcher);assert.equal(r.analysis[0].cost,50);assert.equal(r.previousRows.length,1);assert.equal(saved.length,1);assert.equal(JSON.stringify(saved).includes('private-'),false);assert.ok(adsAnalysisMission([r]).length<=3900);
});
