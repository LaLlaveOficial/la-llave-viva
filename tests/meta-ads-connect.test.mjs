import test from 'node:test';
import assert from 'node:assert/strict';
import {metaAdsRead,metaPeriod} from '../lib/meta-ads-connect.js';
const env={META_ADS_ACCESS_TOKEN:'private-test-token',META_ADS_ACCOUNT_ID:'act_123',META_ADS_CAMPAIGN_IDS:'10,11'};
const account={id:'act_123',currency:'CLP',timezone_name:'America/Santiago',account_status:1};
const period={since:'2026-10-01',until:'2026-10-08'};
function mock({currency='CLP',error=false}={}){
 return async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer private-test-token');assert.equal(url.searchParams.has('access_token'),false);
  if(error)return {ok:false,json:async()=>({error:{code:190,message:'private-test-token'}})};
  let data;
  if(url.pathname.endsWith('/act_123'))data={...account,currency};
  else if(url.pathname.endsWith('/campaigns'))data={data:[{id:'10',name:'La Llave',status:'ACTIVE',effective_status:'PAUSED'},{id:'11',name:'Sin informe',status:'ACTIVE'},{id:'99',name:'Otro negocio'}]};
  else if(url.searchParams.has('after'))data={data:[{campaign_id:'99',spend:'900000'}]};
  else data={data:[{campaign_id:'10',spend:'1000',impressions:'100',clicks:'5',actions:[{action_type:'offsite_conversion.fb_pixel_purchase',value:'2'},{action_type:'omni_purchase',value:'2'}],action_values:[{action_type:'offsite_conversion.fb_pixel_purchase',value:'30000'}]}],paging:{next:'https://untrusted.invalid/?access_token=bad',cursors:{after:'cursor'}}};
  return {ok:true,json:async()=>data};
 };
}
test('scope excludes unrelated campaigns, preserves missing metrics, avoids duplicate purchase categories and tokens',async()=>{
 const r=await metaAdsRead(period,env,mock());assert.equal(r.rows.length,2);assert.equal(r.rows[0].purchases,2);assert.equal(r.rows[0].cpa,500);assert.equal(r.rows[0].roas,30);assert.equal(r.rows[0].effectiveStatus,'PAUSED');assert.equal(r.rows[1].spend,null);assert.equal(r.rows[1].hasInsights,false);assert.doesNotMatch(JSON.stringify(r),/private-test-token|Otro negocio|900000/);
});
test('rejects missing configuration, wrong currency and revoked credentials without exposing details',async()=>{
 await assert.rejects(metaAdsRead(period,{},mock()),/configuración privada/);
 await assert.rejects(metaAdsRead(period,env,mock({currency:'USD'})),/moneda/);
 await assert.rejects(metaAdsRead(period,env,mock({error:true})),e=>!e.message.includes('private-test-token')&&/venció/.test(e.message));
});
test('date validation uses Chile time and rejects reversed, impossible, future and excessive periods',()=>{
 const now=new Date('2026-10-09T01:00:00Z');assert.equal(metaPeriod({},now).until,'2026-10-08');
 for(const p of [{since:'2026-02-30',until:'2026-03-01'},{since:'2026-10-08',until:'2026-10-01'},{since:'2026-01-01',until:'2026-10-08'},{since:'2026-10-01',until:'2026-10-09'}])assert.throws(()=>metaPeriod(p,now));
});
