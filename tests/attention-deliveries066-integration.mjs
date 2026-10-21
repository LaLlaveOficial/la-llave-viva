import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {address,gmailMessage,gmailCredential,gmailApi,gmailSync,MAIL_FROM,replyMime} from '../lib/gmail-crm066.js';
import {recordStudioReceipt,deliveryApi} from '../lib/deliveries066.js';
import {linkConversation} from '../lib/conversation-crm066.js';
const db=new PGlite();
for(const name of ['20261007_console066.sql','20261016_marketing_workspace.sql','20261016_instagram_inbox.sql','20261017_facebook_groups066.sql','20261021_attention_deliveries066.sql']){const m=await fs.readFile(new URL('../migrations/'+name,import.meta.url),'utf8');await db.exec(m);await db.exec(m);}
const sql=async(parts,...values)=>(await db.query(parts.map((p,i)=>p+(i<values.length?'$'+(i+1):'')).join(''),values)).rows;
const env={GMAIL_CONNECTOR_UID:'google/test-only',GA4_CONNECTOR_UID:'google/test-only',VERCEL_OIDC_TOKEN:'synthetic-test-only'};
const now=Date.now(),providerThread='thread066',msg=(id,from='Lector <lector@example.com>',to=MAIL_FROM,at=now)=>({id,threadId:providerThread,internalDate:String(at),snippet:'Consulta de prueba',payload:{mimeType:'text/plain',body:{data:Buffer.from('¿Dónde compro el libro?').toString('base64url')},headers:[{name:'From',value:from},{name:'To',value:to},{name:'Subject',value:'Consulta · La Llave'},{name:'Message-ID',value:'<'+id+'@example.com>'},{name:'References',value:'<previous@example.com>'}]}});
let sends=0,threadGets=0,timeout=false,badAlias=false,cursor=false;
const external=async(url,opts={})=>{
 if(url.includes('api.vercel.com')){assert.ok(JSON.parse(opts.body).scopes.includes('https://www.googleapis.com/auth/analytics.readonly'));return {ok:true,json:async()=>({token:'fake-provider-token'})};}
 let data;
 if(url.endsWith('/profile'))data={emailAddress:'owner@example.com'};
 else if(url.endsWith('/settings/sendAs'))data={sendAs:[{sendAsEmail:badAlias?'wrong@example.com':MAIL_FROM,verificationStatus:'accepted'}]};
 else if(url.includes('/threads?')){assert.match(url,/maxResults=5/);assert.match(decodeURIComponent(url),/contacto@lallaveoficial.com/);data={threads:[{id:providerThread}],...(cursor?{nextPageToken:'next-safe-token'}:{})};}
 else if(url.includes('/threads/'+providerThread)){threadGets++;data={id:providerThread,messages:[msg('msg1'),msg('unrelated','keloke@example.com','private@example.com')]};}
 else if(url.endsWith('/messages/send')){sends++;const b=JSON.parse(opts.body),mime=Buffer.from(b.raw,'base64url').toString();assert.equal(b.threadId,providerThread);assert.match(mime,/From: La Llave Oficial <contacto@lallaveoficial.com>/);assert.match(mime,/In-Reply-To: <msg1@example.com>/);assert.match(mime,/To: lector@example.com/);assert.match(mime,/References: <previous@example.com> <msg1@example.com>/);if(timeout)throw Error('timeout');data={id:'sent'+sends,threadId:providerThread};}
 else throw Error('Unexpected URL '+url);
 return {ok:true,json:async()=>data};
};
try{
 assert.equal(address('A <reader@example.com>'),'reader@example.com');assert.equal(address('a@example.com\r\nBcc: bad@example.com'),null);
 assert.equal(gmailMessage(msg('private','private@example.com','other@example.com'),'owner@example.com',providerThread),null);
 assert.equal(gmailMessage(msg('bad','a@example.com\r\nBcc: b@example.com'),'owner@example.com',providerThread),null);
 assert.equal(gmailMessage({...msg('wrong'),threadId:'different'},'owner@example.com',providerThread),null);
 await assert.rejects(()=>gmailCredential('authorize',env,async()=>({ok:true,json:async()=>({url:'https://evil.example/steal'})})),/Destino/);
 let r=await gmailSync(sql,env,external);assert.equal(r.status,200);assert.equal(r.imported,1);assert.equal(threadGets,1);
 assert.equal((await gmailSync(sql,env,external)).status,429);assert.equal(threadGets,1);
 let inbox=await gmailApi(sql,'gmail-inbox',{},env),threadId=inbox.threads[0].id;
 assert.equal((await sql`SELECT count(*)::int AS n FROM console066_marketing_records WHERE kind='case'`)[0].n,1);
 const original=(await sql`SELECT * FROM console066_marketing_records WHERE kind='case'`)[0];
 await sql`UPDATE console066_marketing_records SET status='waiting' WHERE id=${original.id}`;
 await linkConversation(sql,'email',threadId,{title:'Changed',question:'New'});
 assert.equal((await sql`SELECT status FROM console066_marketing_records WHERE id=${original.id}`)[0].status,'waiting');
 const lead=(await sql`SELECT id FROM console066_leads LIMIT 1`)[0].id;
 assert.equal((await gmailApi(sql,'gmail-lead-link',{threadId,leadId:lead,confirm:true},env)).linked,true);
 assert.equal((await gmailApi(sql,'gmail-thread',{id:threadId},env)).link.lead_id,lead);
 let p=await gmailApi(sql,'gmail-prepare',{threadId,text:'Respuesta exacta sintética'},env);assert.equal(p.status,201);
 assert.equal((await gmailApi(sql,'gmail-prepare',{threadId,text:'Duplicado'},env)).status,409);
 assert.equal((await gmailApi(sql,'gmail-send',{id:p.id,version:1,confirm:false},env,external)).status,400);assert.equal(sends,0);
 badAlias=true;assert.equal((await gmailApi(sql,'gmail-send',{id:p.id,version:1,confirm:true},env,external)).status,503);assert.equal(sends,0);badAlias=false;
 r=await gmailApi(sql,'gmail-send',{id:p.id,version:1,confirm:true},env,external);assert.equal(r.accepted,true);assert.equal(r.delivered,false);
 assert.equal((await gmailApi(sql,'gmail-send',{id:p.id,version:1,confirm:true},env,external)).status,409);assert.equal(sends,1);
 p=await gmailApi(sql,'gmail-prepare',{threadId,text:'Respuesta incierta'},env);timeout=true;
 r=await gmailApi(sql,'gmail-send',{id:p.id,version:1,confirm:true},env,external);assert.equal(r.state,'uncertain');
 assert.equal((await gmailApi(sql,'gmail-prepare',{threadId,text:'No repetir'},env)).status,409);assert.equal(sends,2);
 // A new inbound message invalidates an older reviewed reply before any send.
 await sql`UPDATE console066_gmail_replies SET status='rejected' WHERE status='uncertain'`;
 p=await gmailApi(sql,'gmail-prepare',{threadId,text:'Borrador anterior'},env);
 const newer=gmailMessage(msg('newer',undefined,undefined,now+1000),'owner@example.com',providerThread);
 await sql`INSERT INTO console066_gmail_messages(id,thread_id,provider_id,direction,sender,recipient,subject,text,message_id,refs,received_at) VALUES(${newer.id},${threadId},${newer.providerId},'inbound',${newer.sender},${MAIL_FROM},${newer.subject},${newer.text},${newer.messageId},${newer.refs},${newer.at})`;
 assert.equal((await gmailApi(sql,'gmail-send',{id:p.id,version:1,confirm:true},env,external)).status,409);assert.equal(sends,2);
 assert.throws(()=>replyMime({...newer,direction:'inbound',message_id:'<x>\r\nBcc: evil'},'test'),/Message-ID/);
 // Explicit pagination is bounded, even across concurrent sync requests.
 await sql`UPDATE console066_gmail_sync SET cycle_at=now()-interval '25 hours',completed=true`;
 cursor=true;const parallel=await Promise.all([gmailSync(sql,env,external),gmailSync(sql,env,external)]);assert.equal(parallel.filter(x=>x.status===200).length,1);
 for(let i=0;i<3;i++)assert.equal((await gmailSync(sql,env,external)).status,200);
 assert.equal((await gmailSync(sql,env,external)).status,429);assert.equal((await sql`SELECT fetched FROM console066_gmail_sync`)[0].fetched,20);
 const input={id:'00000000-0000-4000-8000-000000000066',sha256:'a'.repeat(64),bytes:1024,seconds:15,fps:24,resolution:'720p',quality:'high'};
 await recordStudioReceipt(sql,'init',input,{job:{id:input.id,status:'uploading'}});
 assert.equal((await deliveryApi(sql,'delivery-download',{id:input.id,bytes:512,sha256:'b'.repeat(64)})).status,409);
 await recordStudioReceipt(sql,'status',input,{job:{id:input.id,status:'ready',outputBytes:512}});
 assert.equal((await deliveryApi(sql,'delivery-download',{id:input.id,bytes:513,sha256:'b'.repeat(64)})).status,409);
 assert.equal((await deliveryApi(sql,'delivery-download',{id:input.id,bytes:512,sha256:'b'.repeat(64)})).recorded,true);
 await recordStudioReceipt(sql,'status',input,{job:{id:input.id,status:'ready',outputBytes:512}});
 assert.equal((await deliveryApi(sql,'delivery-list')).receipts[0].state,'download_verified_by_browser');
 assert.equal((await deliveryApi(sql,'delivery-download',{id:input.id,bytes:512,sha256:'c'.repeat(64)})).status,409);
 console.log('Attention and delivery integration passed: repeatable SQL, alias isolation, CRM dedupe/linking, thread headers, exact review, sender verification, no retry after uncertain send, stale-reply protection, concurrent 24h budget, MP4 receipt size/hash and source distinctions. Providers mocked; no real mail sent.');
}finally{await db.close();}
