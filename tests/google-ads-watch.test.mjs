import test from 'node:test';import assert from 'node:assert/strict';
import {adsWatchContext} from '../lib/google-ads-watch.js';
const now=new Date('2026-10-16T11:00:00Z');
const report=(extra={})=>({section:'campaigns',customerId:'3149885754',currency:'CLP',checkedAt:'2026-10-16T10:00:00Z',from:'2026-10-10',to:'2026-10-16',rows:[{'campaign.id':'1','metrics.clicks':0,'private_token':'secret'}],...extra});
test('freshness is per report; missing, future, wrong-account and old reports never imply zero',()=>{
 const r=adsWatchContext([report(),report({section:'searchTerms',checkedAt:'2026-10-15T10:00:00Z'}),report({section:'recommendations',checkedAt:'2026-10-17T10:00:00Z'}),report({section:'ads',customerId:'123'})],now);
 assert.equal(r.status,'partial');assert.deepEqual(r.coverage.map(x=>x.status),['current','stale','stale','missing','missing']);assert.equal(r.coverage[0].rows[0]['metrics.clicks'],0);assert.ok(!JSON.stringify(r).includes('secret'));assert.equal(r.coverage[3].rows,undefined);
});
test('terms are sorted by spend and bounded while preserving period and omitted evidence',()=>{
 const rows=Array.from({length:40},(_,i)=>({'search_term_view.search_term':'term '+i,'metrics.cost_micros':i}));
 const r=adsWatchContext([report({section:'searchTerms',rows,truncated:true})],now).coverage[1];assert.equal(r.rows.length,30);assert.equal(r.rows[0]['search_term_view.search_term'],'term 39');assert.equal(r.totalRows,40);assert.equal(r.sampled,true);assert.equal(r.truncated,true);assert.equal(r.from,'2026-10-10');
});
