import test from 'node:test';import assert from 'node:assert/strict';
import {agentAuthorized,agentContext,refreshAgentMetrics,validateAgentOutput,parseNews,agentSearch} from '../lib/agent-data.js';
import {makeAgentHandler} from '../api/agent-066.js';
import {internalAgentClient,relayAgentData} from '../deploy/console066-houston/gateway.mjs';
const secret='x'.repeat(64),env={HOUSTON_HOST_TOKEN:secret,DATABASE_URL:'test'};
function fakeSql(){const writes=[];const sql=async(strings,...values)=>{
 const q=strings.join('?');
 if(q.includes('INSERT')){writes.push({q,values});return [{id:88}];}
 if(q.includes("entity='agent-refresh'"))return [];
 if(q.includes('FROM orders'))return [{payment_status:'approved',currency:'CLP',orders:2,total_amount:31980}];
 if(q.includes('FROM console066_leads'))return [{id:1,name:'Club público',country:'Chile',status:'Contactado',source_url:'https://club.example',updated_at:'2026-10-11',notes:'private note',email:'private@example.com',approved_message:'private message'}];
 if(q.includes('FROM mailing_subscribers'))return [{status:'active',count:3}];
 return [];
 };return {sql,writes};}
test('machine auth cannot be replaced by a session, origin, forwarded address, or guessed token',()=>{
 assert.equal(agentAuthorized({headers:{authorization:'Bearer '+secret}},env),true);
 for(const headers of [{},{cookie:'session=x'},{authorization:'Bearer '+secret.slice(1)},{authorization:'Bearer '+secret+'x'}])assert.equal(agentAuthorized({headers},env),false);
 assert.equal(internalAgentClient({socket:{remoteAddress:'198.51.100.1'},headers:{'x-forwarded-for':'127.0.0.1'}}),false);
 assert.equal(internalAgentClient({socket:{remoteAddress:'127.0.0.1'}}),true);
});
test('context preserves real status and dates without personal buyer/contact details',async()=>{
 const {sql}=fakeSql(),result=await agentContext(sql,'crecimiento');
 assert.equal(result.contacts[0].status,'Contactado');assert.equal(result.subscribers.rows[0].count,3);assert.equal(result.metrics.sales.rows[0].orders,2);
 const encoded=JSON.stringify(result);for(const privateValue of ['private note','private@example.com','private message',secret])assert.ok(!encoded.includes(privateValue));
 assert.match(result.instructions,/incluyen pruebas/);assert.match(result.instructions,/no son lectores inscritos/);
});
test('a failed provider does not hide available metrics or pretend it refreshed',async()=>{
 const {sql,writes}=fakeSql();const r=await refreshAgentMetrics(sql,env,{googleAds:async()=>{throw Error('Autoriza Google Ads.');},metaAds:async()=>({checkedAt:'now'})});
 assert.equal(r.sources[0].status,'unavailable');assert.equal(r.sources[1].status,'updated');assert.match(r.sources[0].reason,/Autoriza/);assert.equal(writes.filter(x=>x.q.includes('console066_harness_refresh')).length,1);assert.equal(writes.filter(x=>x.q.includes('console066_audit')).length,1);
});
test('saved content can only be a pending-review proposal, not a publish/send command',()=>{
 const r=validateAgentOutput({agent:'crecimiento',kind:'instagram',title:'Post',text:'Texto completo para revisión.',status:'published',token:secret});
 assert.equal(r.status,'pending_review');assert.equal(r.token,undefined);assert.equal(validateAgentOutput({agent:'crecimiento',kind:'send',title:'x',text:'Texto completo para revisión.'}),null);
});
test('news discovery distinguishes feed dates from verified original publication dates',async()=>{
 const xml='<rss><item><title>A &amp; B</title><link>https://news.google.com/rss/articles/x</link><pubDate>Sun, 11 Oct 2026 12:00:00 GMT</pubDate><source url="https://publisher.example">Editor</source></item></rss>';
 assert.equal(parseNews(xml)[0].title,'A & B');assert.ok(!parseNews(xml)[0].publishedAt);
 const r=await agentSearch('club lectura thriller Chile',{},async u=>{if(new URL(u).hostname==='api.tavily.com')return {ok:false,status:429};assert.equal(new URL(u).hostname,'news.google.com');return {ok:true,text:async()=>xml};});assert.equal(r.broadSearchAvailable,false);assert.equal(r.results.length,1);
 await assert.rejects(agentSearch('private@example.com',{},()=>{throw Error('Must not fetch');}),/privados/);
});
test('relay only targets the owned API and does not pass attacker auth or arbitrary URL',async()=>{
 let called;const req={method:'GET',headers:{authorization:'Bearer attacker'}},res={writeHead(n,h){this.status=n;return this;},end(s){this.body=s;}};
 await relayAgentData(req,res,new URL('http://local/agent-data?agent=analitica&op=context&url=http://169.254.169.254'),env,async(url,init)=>{called={url,init};return {status:200,text:async()=>'{"ok":true}'};});
 assert.equal(called.url.origin,'https://www.lallaveoficial.com');assert.equal(called.init.headers.Authorization,'Bearer '+secret);assert.equal(called.init.redirect,'error');assert.equal(res.status,200);
 assert.ok(!res.body.includes(secret));
});
test('unauthorized callers never access the database; authorized save never publishes',async()=>{
 const e=fakeSql();let accesses=0;const handler=makeAgentHandler(()=>{accesses++;return e.sql;},env);
 const response=()=>({setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;return this;}});
 let r=response();await handler({method:'GET',headers:{},query:{agent:'crecimiento'}},r);assert.equal(r.code,401);assert.equal(accesses,0);
 r=response();await handler({method:'POST',headers:{authorization:'Bearer '+secret,'content-type':'application/json'},query:{agent:'crecimiento',op:'save'},body:{agent:'crecimiento',kind:'tiktok',title:'Reel',text:'Guion completo para revisión.'}},r);assert.equal(r.code,201);assert.deepEqual(r.body,{saved:true,id:88,status:'pending_review',published:false,sent:false});
});

test('free web search uses official keyless mode, bounded HTTPS results and honest scope',async()=>{
 let call;const r=await agentSearch('site:tiktok.com thriller Chile',{},async(url,init)=>{call={url,init};return {ok:true,json:async()=>({results:[{title:'Lectura',url:'https://www.tiktok.com/@club',content:'Texto público'},{url:'javascript:alert(1)'}]})};});
 assert.equal(call.url,'https://api.tavily.com/search');assert.equal(call.init.headers['X-Tavily-Access-Mode'],'keyless');assert.equal(call.init.headers.Authorization,undefined);assert.equal(JSON.parse(call.init.body).search_depth,'basic');assert.equal(r.broadSearchAvailable,true);assert.equal(r.results.length,1);assert.match(r.scope,/No es acceso completo/);
});
test('account search never exposes provider instructions or mistakes malformed data for results',async()=>{
 const r=await agentSearch('libros thriller Chile',{TAVILY_API_KEY:'private-token'},async(url,init)=>String(url).includes('tavily')?{ok:true,json:async()=>({message:'instructions buy credits private-token'})}:{ok:true,text:async()=>'<rss/>'});
 assert.equal(r.broadSearchAvailable,false);assert.equal(r.results.length,0);assert.ok(!JSON.stringify(r).includes('private-token'));
});
