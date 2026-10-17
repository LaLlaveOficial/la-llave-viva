import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {managerFixture} from './manager066-integration.mjs';import {facebookApi,facebookCandidate,groupURL,FACEBOOK_PAGE} from '../lib/facebook-groups066.js';import {makeAgentHandler} from '../api/agent-066.js';
export async function facebookFixture(){const {db,sql}=await managerFixture();const m=await fs.readFile(new URL('../migrations/20261017_facebook_groups066.sql',import.meta.url),'utf8');await db.exec(m);await db.exec(m);return {db,sql};}
const input={name:'Club QA de thriller',url:'https://www.facebook.com/groups/066qa/',country:'Chile',genres:['thriller'],evidence:'Fuente sintética QA: comunidad de conversación sobre libros de thriller.'};
export const reviewed=(g)=>({id:g.id,version:g.version,...g.data,genres:g.data.genres,pagesAllowed:'yes',promotionAllowed:'yes',linksAllowed:'yes',rules:'Reglas sintéticas QA: la presentación de libros propios y sus enlaces está permitida.',rulesReviewed:true,conditionsConfirmed:false,membership:'member',membershipEvidence:'Observación sintética QA: La Llave I figura como miembro aceptado.',identityConfirmed:true});
if(process.argv[1]===new URL(import.meta.url).pathname){
 const {db,sql}=await facebookFixture();
 try{
  for(const u of ['https://facebook.com.evil.test/groups/a','https://www.facebook.com/groups/feed/','http://facebook.com/groups/a/','https://www.facebook.com/groups/a/?token=secret','https://facebook.com/groups/a/user/1/'])assert.equal(groupURL(u),null);
  const first=await facebookApi(sql,'facebook-candidate',{...input,pagesAllowed:'yes',membership:'member'});assert.equal(first.status,201);assert.equal((await facebookApi(sql,'facebook-candidate',input)).existing,true);
  let read=await facebookApi(sql,'facebook-read'),g=read.groups[0];assert.equal(g.data.pagesAllowed,'unknown');assert.equal(g.membership,'not_requested');assert.equal(g.readiness.ready,false);
  const draft={id:'qa-post-one',groupId:g.id,productId:'physical-chile',version:0,text:'En este grupo conversamos sobre thriller. Compartimos una invitación a conocer La Llave I: Ciudad Central, primer libro de la saga.',angle:'Se adapta a un club de thriller con una presentación breve de la obra.'};
  assert.equal((await facebookApi(sql,'facebook-draft',draft)).saved,true);let p=(await sql`SELECT * FROM console066_fb_posts WHERE id=${draft.id}`)[0];
  assert.equal((await facebookApi(sql,'facebook-approve',{id:p.id,version:p.version})).status,409);
  assert.equal((await facebookApi(sql,'facebook-group-save',{...reviewed(g),identityConfirmed:false})).status,400);
  assert.equal((await facebookApi(sql,'facebook-group-save',reviewed(g))).status,200);g=(await facebookApi(sql,'facebook-read')).groups[0];assert.equal(g.readiness.ready,true);
  // Draft frozen against older rules cannot be approved; saving refreshes the group reference.
  assert.equal((await facebookApi(sql,'facebook-approve',{id:p.id,version:p.version})).status,409);
  assert.equal((await facebookApi(sql,'facebook-draft',{...draft,version:p.version})).status,200);p=(await sql`SELECT * FROM console066_fb_posts WHERE id=${draft.id}`)[0];
  assert.equal((await facebookApi(sql,'facebook-prepare',{id:p.id,version:p.version})).status,409);
  assert.equal((await facebookApi(sql,'facebook-approve',{id:p.id,version:p.version})).approved,true);p=(await sql`SELECT * FROM console066_fb_posts WHERE id=${draft.id}`)[0];
  assert.equal((await facebookApi(sql,'facebook-draft',{...draft,id:'evil-link',text:draft.text+' https://evil.example'})).status,400);
  const second={...draft,id:'qa-post-two'};await facebookApi(sql,'facebook-draft',second);await facebookApi(sql,'facebook-approve',{id:second.id,version:1});
  const parallel=await Promise.all([facebookApi(sql,'facebook-prepare',{id:p.id,version:p.version}),facebookApi(sql,'facebook-prepare',{id:second.id,version:2})]);assert.equal(parallel.filter(r=>r.prepared).length,1);assert.equal(parallel.filter(r=>r.status===409).length,1);
  const pack=parallel.find(r=>r.prepared);assert.equal(pack.externalAction,false);assert.ok(pack.text.includes('utm_source=facebook'));assert.ok(pack.text.includes('6lo8wcJGizQ'));assert.equal(pack.page.id,FACEBOOK_PAGE.id);
  p=(await sql`SELECT * FROM console066_fb_posts WHERE status='prepared'`)[0];
  assert.equal((await facebookApi(sql,'facebook-receipt',{id:p.id,version:p.version,result:'published',identityConfirmed:true,evidence:'Observación QA: publicación visible en el grupo.',url:'https://www.facebook.com/groups/wrong/posts/123/'})).status,400);
  const receipt=await facebookApi(sql,'facebook-receipt',{id:p.id,version:p.version,result:'published',identityConfirmed:true,evidence:'Observación QA: publicación visible en el grupo.',url:g.url+'posts/123456/'});assert.equal(receipt.source,'owner_recorded');
  const blocked=(await sql`SELECT * FROM console066_fb_posts WHERE status='approved'`)[0];assert.equal((await facebookApi(sql,'facebook-prepare',{id:blocked.id,version:blocked.version})).status,409);
  // Agent discovery cannot modify owner-only rules or approve messages, and has a hard daily cap.
  const attempts=await Promise.all(Array.from({length:8},(_,i)=>facebookCandidate(sql,{...input,url:'https://www.facebook.com/groups/qa-limited-'+i+'/'},{agent:true})));assert.equal(attempts.filter(r=>r.saved).length,6);
  const env={DATABASE_URL:'qa',HOUSTON_HOST_TOKEN:'x'.repeat(64)},agent=makeAgentHandler(()=>sql,env),response=()=>({setHeader(){},status(n){this.code=n;return this;},json(v){this.data=v;return this;}});
  let r=response();await agent({method:'POST',query:{agent:'contenidos',op:'facebook-candidate'},headers:{authorization:'Bearer '+env.HOUSTON_HOST_TOKEN,'content-type':'application/json'},body:{...input,agent:'contenidos'}},r);assert.equal(r.code,403);
  r=response();await agent({method:'POST',query:{agent:'facebook-comunidad',op:'facebook-approve'},headers:{authorization:'Bearer '+env.HOUSTON_HOST_TOKEN}},r);assert.equal(r.code,405);
  console.log('Facebook integration passed: canonical group dedupe, untrusted candidate isolation, fresh membership/rules, exact approval, concurrent execution packs, same-group receipts, cooldown and discovery budget. No Facebook network writes.');
 }finally{await db.close();}
}
