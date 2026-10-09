import test from 'node:test';
import assert from 'node:assert/strict';
import {GA4_PROPERTY,GA4_SCOPE,ga4Period,ga4Rows,ga4Sync,ga4Credential} from '../lib/ga4-connect.js';
test('GA4 dates reject rollover, future dates and excessive windows',()=>{
 const now=new Date('2026-10-09T00:40:00Z');
 assert.deepEqual(ga4Period({},now),{since:'2026-10-02',until:'2026-10-08'});
 for(const b of [{since:'2026-02-30',until:'2026-10-08'},{since:'2026-01-01',until:'2026-10-08'},{until:'2026-10-09'}])assert.throws(()=>ga4Period(b,now));
});
test('GA4 accepts dimensionless summaries but rejects absent metric values',()=>{
 const r={metricHeaders:[{name:'sessions'}],rows:[{metricValues:[{value:'0'}]}]};
 assert.deepEqual(ga4Rows(r),[{sessions:0}]);
 r.rows[0].metricValues[0].value='';assert.throws(()=>ga4Rows(r));
});
test('GA4 queries fixed property, narrow scope and saves observations without tokens',async()=>{
 const calls=[],saved=[];const env={GA4_CONNECTOR_UID:'google/la-llave-ga4-066',VERCEL_OIDC_TOKEN:'private-project-token'};
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  if(url.includes('api.vercel.com'))return new Response(JSON.stringify({token:'private-google-token'}));
  const b=JSON.parse(options.body);
  if(url.endsWith(':runRealtimeReport'))return new Response('',{status:503});
  return new Response(JSON.stringify({dimensionHeaders:b.dimensions,metricHeaders:b.metrics,rows:[{dimensionValues:b.dimensions.map(()=>({value:'purchase'})),metricValues:b.metrics.map(()=>({value:'2'}))}],rowCount:1}));
 };
 const sql=async(strings,...values)=>{saved.push(values);return [];};
 const r=await ga4Sync(sql,{since:'2026-10-01',until:'2026-10-07',propertyId:'wrong'},env,fetcher);
 assert.equal(r.propertyId,GA4_PROPERTY);assert.equal(r.realtime,null);assert.match(r.realtimeError,/tiempo real/);
 assert.deepEqual(JSON.parse(calls[0].options.body).scopes,[GA4_SCOPE]);
 assert.equal(calls.length,5);assert.ok(calls.slice(1).every(c=>c.url.startsWith('https://analyticsdata.googleapis.com/v1beta/properties/551476480:run')));
 assert.ok(calls.every(c=>c.options.redirect==='error'));
 assert.equal(saved.length,1);assert.ok(!JSON.stringify(saved).includes('private-'));
});
test('GA4 rejects third-party authorization redirect',async()=>{
 await assert.rejects(ga4Credential('authorize',{GA4_CONNECTOR_UID:'google/la-llave-ga4-066',VERCEL_OIDC_TOKEN:'t'},async()=>new Response(JSON.stringify({url:'https://evil.example/auth'}))),/Destino/);
});
