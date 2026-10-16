import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceEvidence} from '../lib/source-evidence.js';
const now = Date.parse('2026-10-16T06:00:00Z');
test('opening the view does not refresh the age of saved provider readings', () => {
 const [ads, meta, ga4] = sourceEvidence({checkedAt:new Date(now).toISOString(),googleAds:{checkedAt:'2026-10-14T06:00:00Z'},metaAds:{checkedAt:'2026-10-16T05:00:00Z'}},now);
 assert.equal(ads.state,'historical');assert.equal(ads.ageHours,48);
 assert.equal(meta.state,'recent');assert.equal(ga4.state,'unverified');
});
test('manual imports cannot prove an OAuth read or publication permission', () => {
 const rows=sourceEvidence({snapshots:[{network:'instagram',importedAt:'2026-10-16T05:00:00Z'},{network:'tiktok',collection:'oauth',importedAt:'2026-10-16T05:00:00Z'}]},now);
 assert.equal(rows[3].state,'unverified');assert.equal(rows[4].state,'recent');
 assert.match(rows[4].scope,/no acredita permisos/);
});
test('invalid or future timestamps remain unverified; 24-hour boundary is explicit', () => {
 assert.equal(sourceEvidence({googleAds:{checkedAt:'bad'}},now)[0].state,'unverified');
 assert.equal(sourceEvidence({googleAds:{checkedAt:'2027-01-01T00:00:00Z'}},now)[0].observedAt,null);
 const metrics={googleAds:{checkedAt:'2026-10-15T06:00:00Z'}};
 assert.equal(sourceEvidence(metrics,now)[0].state,'recent');
 assert.equal(sourceEvidence(metrics,now+1)[0].state,'historical');
});
