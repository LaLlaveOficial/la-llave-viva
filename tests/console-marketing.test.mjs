import test from 'node:test';
import assert from 'node:assert/strict';
import {marketingText} from '../lib/console-marketing.js';
import {validateMission} from '../lib/houston-missions.js';
const metrics={checkedAt:'2026-10-08T08:15:00Z',directConnections:{instagram:'Mensajería pendiente',googleAds:'Sin conexión directa'},sales:{status:'Conectado',rows:[{orders:9,currency:'CLP'}]},snapshots:Array.from({length:3},(_,i)=>({network:['googleAds','instagram','metaAds'][i],source:'Metricool',from:'2026-10-02',to:'2026-10-08',importedAt:'2026-10-08',currency:null,metrics:Array.from({length:8},()=>({label:'Impresiones',value:123,availableDays:6,totalDays:7}))}))};
const leads=[{name:'BOOKFAIL',status:'En conversación'},{name:'Danilo',status:'Contactado'}];
const apollo={checkedAt:'2026-10-08',country:'Chile',category:'librerias',candidates:Array.from({length:10},(_,i)=>({name:i?'Librería '+i:'BOOKFAIL',url:'https://libreria'+i+'.cl/',existing:!i,crmStatus:i?undefined:'En conversación'}))};
test('Apollo follow-up fits a valid Houston mission and preserves contact exclusions',()=>{
 const text=marketingText('contactos',metrics,leads,apollo);
 assert.ok(validateMission({action:'start',slug:'contactos',id:'12345678-1234-1234-1234-123456789abc',text}));
 const context=JSON.parse(text.slice(text.indexOf('{')));
 assert.equal(context.apollo.candidates.length,10);
 assert.equal(context.apollo.candidates[0].crmStatus,'En conversación');
 assert.equal(context.contacts[0].status,'En conversación');
 assert.equal(context.limits.instagram,'Mensajería pendiente');
 assert.ok(!context.sales,'Follow-up does not spend the context budget on unrelated metrics');
});
test('Large context remains whole JSON within 4000 characters for every preset',()=>{
 const largeLeads=Array.from({length:30},()=>({name:'Lector😀'.repeat(100),status:'No contactar'}));
 const largeApollo={...apollo,candidates:apollo.candidates.map(x=>({...x,name:'😀'.repeat(200),url:'https://example.cl/'+ 'a'.repeat(300)}))};
 for(const purpose of ['contactos','analitica','contenidos']){
  const text=marketingText(purpose,metrics,largeLeads,largeApollo);
  assert.ok(text.length<=4000);
  assert.deepEqual(JSON.parse(text.slice(text.indexOf('{'))).limits,metrics.directConnections);
 }
});
test('analysis retains direct Meta and Google evidence when imported context exceeds the limit',()=>{
 const rich={...metrics,googleAds:{source:'Google Ads directo',currency:'CLP',campaigns:[{id:'g1',name:'Marca',cost:4200,impressions:123,clicks:8}]},metaAds:{source:'Meta Marketing API',account:{currency:'CLP'},period:{since:'2026-10-01',until:'2026-10-08'},rows:[{id:'m0',name:'Antigua',hasInsights:false},{id:'m1',name:'CASO 066 continúa',hasInsights:true,spend:6167,impressions:1616,clicks:107,purchases:null}],note:'Atribución con posible retraso'},snapshots:metrics.snapshots.map(s=>({...s,metrics:s.metrics.map(m=>({...m,label:'L'.repeat(160)}))}))};
 const text=marketingText('analitica',rich,[]),context=JSON.parse(text.slice(text.indexOf('{')));
 assert.ok(text.length<=4000);assert.equal(context.metaAds.campaigns[0].spend,6167);assert.equal(context.metaAds.campaigns[0].clicks,107);assert.equal(context.metaAds.totalSelectedCampaigns,2);assert.equal(context.googleAds.campaigns[0].cost,4200);
});
test('GA4 purchase attribution survives compaction and trimmed reports are identified',()=>{
 const rich={...metrics,ga4:{source:'Google Analytics Data API',propertyId:'551476480',period:{since:'2026-10-03',until:'2026-10-09'},currency:'CLP',overview:{rows:[{activeUsers:134,sessions:150,ecommercePurchases:1,purchaseRevenue:15990}]},events:{rows:[{eventName:'purchase',eventCount:1}]},sources:{rows:[{sessionSourceMedium:'google / cpc',sessions:99,ecommercePurchases:0,purchaseRevenue:0},{sessionSourceMedium:'tagassistant.google.com / referral',sessions:1,ecommercePurchases:1,purchaseRevenue:15990}]}},snapshots:metrics.snapshots.map(s=>({...s,metrics:s.metrics.map(m=>({...m,label:'L'.repeat(500)}))}))};
 const text=marketingText('analitica',rich,[]),context=JSON.parse(text.slice(text.indexOf('{')));
 assert.ok(text.length<=4000);
 assert.equal(context.ga4.purchaseSources[0].source,'tagassistant.google.com / referral');
 assert.equal(context.ga4.purchaseSources[0].purchases,1);
 assert.equal(context.ga4.sourcesOmitted,true);
 assert.ok(context.snapshots.some(s=>s.omitted));
 assert.match(text,/no implican ausencia/);
});
