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
