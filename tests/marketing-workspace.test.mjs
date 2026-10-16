import test from 'node:test';import assert from 'node:assert/strict';
import {validateRecord,payloadHash,trackedLink,purchaseReply,workspaceSummary} from '../lib/marketing-workspace.js';
import {calendarICS} from '../public/centro-066/marketing-workspace.js';
const record=(kind,data={},status='draft')=>({id:kind==='brand'?'brand':'record-1',kind,version:0,status,data:{title:'La Llave',...data}});
test('only known record types, bounded data, exact versions and HTTPS links',()=>{
 assert.ok(validateRecord(record('brand',{author:'Enrique G. Santibañez'})));
 for(const body of [record('other'),{...record('brand'),version:-1},record('product',{url:'javascript:alert(1)'}),record('product',{url:'https://user:secret@example.com'}),record('content',{copy:'x'.repeat(2201)}),record('content',{},'approved'),record('case',{},'purchased'),record('product',{price:-1})])assert.equal(validateRecord(body),null);
});
test('JSONB key ordering cannot invalidate exact approval',()=>{assert.equal(payloadHash({title:'Book',url:'https://example.com'}),payloadHash({url:'https://example.com',title:'Book'}));});
test('only unchanged approved products produce tracked links and replies',()=>{
 const data={title:'Libro',url:'https://www.lallaveoficial.com/comprar?ref=reader',price:15990,currency:'CLP',stock:null,format:'físico',country:'Chile',shipping:''};
 const product={kind:'product',status:'approved',data,approved_hash:payloadHash(data)};
 const link=new URL(trackedLink(product,{channel:'tiktok',campaign:'trailer',content:'clip 1'}));assert.equal(link.searchParams.get('ref'),'reader');assert.equal(link.searchParams.get('utm_source'),'tiktok');assert.equal(link.searchParams.get('utm_content'),'clip 1');
 assert.match(purchaseReply(product),/15.990 CLP/);assert.match(purchaseReply(product),/Disponibilidad por confirmar/);
 assert.equal(trackedLink({...product,status:'draft'}),null);assert.equal(trackedLink({...product,data:{...data,price:100}}),null);
 assert.equal(trackedLink(product,{channel:'unknown'}),null);
 const unavailable={...product,data:{...data,stock:0}};unavailable.approved_hash=payloadHash(unavailable.data);assert.doesNotMatch(purchaseReply(unavailable),/https:/);
});
test('visibility observations require actual dated response, and tests need evidence',()=>{
 assert.equal(validateRecord(record('visibility',{engine:'Gemini',prompt:'libros'},'recorded')),null);
 assert.ok(validateRecord(record('visibility',{engine:'Gemini',prompt:'libros',answer:'Respuesta observada',observedAt:'2026-10-01T12:00:00Z'},'recorded')));
 assert.equal(validateRecord(record('order-label',{orderRef:'order-1',reason:'x'},'test')),null);
});
test('summary excludes closed follow-ups and does not imply total site sales',()=>{
 const data={followupAt:'2026-10-01T00:00:00Z'};const rows=[{kind:'case',status:'new',data},{kind:'case',status:'closed',data},{kind:'case',status:'purchased',data}];
 const s=workspaceSummary(rows,Date.parse('2026-10-16'));assert.equal(s.overdue,1);assert.equal(s.purchases,1);assert.match(s.scope,/no es un total/);
});
test('calendar export escapes injected lines, excludes archive and preserves UTC date',()=>{
 const r={id:'piece',kind:'content',status:'approved',updated_at:'2026-10-16T03:00:00Z',data:{title:'Reel\nBEGIN:BAD',copy:'uno,dos;tres',dueAt:'2026-10-17T10:00:00Z'}};
 const ics=calendarICS([r,{...r,id:'archived',status:'archived'}]);assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,1);assert.match(ics,/DTSTART:20261017T100000Z/);assert.ok(!ics.includes('\r\nBEGIN:BAD'));assert.match(ics,/recordatorio|Recordatorio/);
});

import {initialMarketingRecords} from '../lib/marketing-bootstrap.js';
test('initial context matches repository links and price without inventing availability',()=>{
 const rows=initialMarketingRecords();assert.equal(rows.length,4);assert.equal(rows.find(r=>r.id==='physical-chile').data.price,15990);
 for(const r of rows){assert.equal(r.approved_hash,payloadHash(r.data));if(r.kind==='product')assert.equal(r.data.stock,null);}
 assert.equal(rows.find(r=>r.id==='amazon-kindle').data.price,null);
});
