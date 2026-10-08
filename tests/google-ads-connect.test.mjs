import test from 'node:test';
import assert from 'node:assert/strict';
import {ADS_CUSTOMER,adsConfiguration,adsCredential,googleAdsSync,googleAdsStatus} from '../lib/google-ads-connect.js';
const env={GOOGLE_ADS_MCP_URL:'https://ads.example.com/mcp',GOOGLE_ADS_CONNECTOR_UID:'oauth/llave-ads',VERCEL_OIDC_TOKEN:'private-oidc'};
function fixture({wrongAccount=false,failMetadata=false,failRecommendations=false}={}){
 const calls=[],saved=[];
 const sql=async(strings,...params)=>{saved.push(params);return [];};
 const fetcher=async(url,options)=>{
  const body=JSON.parse(options.body);calls.push({url,body});
  if(url.includes('/connect/token/'))return Response.json({token:'private-token'});
  if(body.method==='notifications/initialized')return new Response(null,{status:202});
  if(body.method==='initialize')return Response.json({result:{}},{headers:{'mcp-session-id':'private-session'}});
  if(body.method==='tools/list')return Response.json({result:{tools:[{name:'search_search'},{name:'metadata_get_resource_metadata'},{name:'mutate_campaign'}]}});
  const {name,arguments:args}=body.params;
  let value;
  if(name==='metadata_get_resource_metadata'){
   const fields={customer:['customer.id','customer.descriptive_name','customer.currency_code','customer.time_zone'],campaign:['campaign.id','campaign.name','campaign.status','metrics.impressions','metrics.clicks','metrics.cost_micros','metrics.conversions','metrics.conversions_value'],recommendation:['recommendation.resource_name','recommendation.type']};
   value={selectable:failMetadata?[]:fields[args.resource_name]};
  }else if(args.resource==='customer')value=[{'customer.id':wrongAccount?'1234567890':ADS_CUSTOMER,'customer.descriptive_name':'La Llave','customer.currency_code':'CLP','customer.time_zone':'America/Santiago'}];
  else if(args.resource==='campaign')value=[{'campaign.id':'8','campaign.name':'Search La Llave','campaign.status':'ENABLED','metrics.impressions':'15','metrics.clicks':'2','metrics.cost_micros':'125000000','metrics.conversions':0,'metrics.conversions_value':0}];
  else if(failRecommendations)return Response.json({result:{isError:true,content:[{type:'text',text:'secret stacktrace'}]}});
  else value=[{'recommendation.resource_name':'customers/3149885754/recommendations/1','recommendation.type':'KEYWORD'}];
  return Response.json({result:{content:[{type:'text',text:JSON.stringify(value)}]}});
 };
 return {sql,fetcher,calls,saved};
}
test('missing configuration cannot claim connected or initiate authorization',async()=>{
 assert.equal(adsConfiguration({}).ready,false);
 const status=await googleAdsStatus(async()=>[],{});assert.equal(status.status,'Configuración pendiente');assert.equal(status.lastObservation,null);
 await assert.rejects(adsCredential('authorize',{},()=>{throw Error('must not fetch');}),/Falta configurar/);
 assert.equal(adsConfiguration({...env,GOOGLE_ADS_MCP_URL:'http://localhost/mcp'}).ready,false);
});
test('authorization uses the fixed owner and rejects an arbitrary destination',async()=>{
 let body;
 const value=await adsCredential('authorize',env,async(url,opt)=>{body=JSON.parse(opt.body);return Response.json({url:'https://connect.vercel.com/authorize/llave'});});
 assert.equal(body.subject.id,'console066-owner');assert.match(value.url,/connect.vercel.com/);
 await assert.rejects(adsCredential('authorize',env,async()=>Response.json({url:'https://evil.example/'})),/Destino/);
});
test('official tools read only the fixed account, verify metadata and persist no credentials',async()=>{
 const f=fixture(),result=await googleAdsSync(f.sql,env,f.fetcher);
 assert.equal(result.customerId,ADS_CUSTOMER);assert.equal(result.currency,'CLP');assert.equal(result.campaigns[0].cost,125);assert.equal(result.campaigns[0].conversions,0);
 const calls=f.calls.filter(c=>c.body.method==='tools/call');
 assert.ok(calls.every(c=>['search_search','metadata_get_resource_metadata'].includes(c.body.params.name)));
 assert.ok(calls.filter(c=>c.body.params.name==='search_search').every(c=>c.body.params.arguments.customer_id===ADS_CUSTOMER));
 assert.equal(JSON.stringify(f.saved).includes('private-'),false);assert.equal(f.saved.length,1);
});
test('wrong account or unavailable fields prevent saving and further queries',async()=>{
 for(const config of [{wrongAccount:true},{failMetadata:true}]){
  const f=fixture(config);await assert.rejects(googleAdsSync(f.sql,env,f.fetcher));assert.equal(f.saved.length,0);
  assert.equal(f.calls.some(c=>c.body.params?.arguments?.resource==='campaign'),false);
 }
});
test('failed recommendations retain verified metrics and expose no provider error text',async()=>{
 const f=fixture({failRecommendations:true}),result=await googleAdsSync(f.sql,env,f.fetcher);
 assert.equal(result.campaigns.length,1);assert.equal(result.recommendations.length,0);assert.ok(result.recommendationsError);assert.equal(JSON.stringify(result).includes('secret stacktrace'),false);
});
