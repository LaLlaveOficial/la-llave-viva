import test from 'node:test';import assert from 'node:assert/strict';
import {apolloCredential,apolloQuery,validateApolloSearch,matchApolloCandidates} from '../lib/apollo-connect.js';
test('Apollo authorization is server bound and rejects untrusted redirects',async()=>{
 let body;const env={VERCEL_OIDC_TOKEN:'oidc-secret'};
 const r=await apolloCredential('authorize',env,async(u,o)=>{body=JSON.parse(o.body);return Response.json({url:'https://connect.vercel.com/authorize/test'});});
 assert.equal(body.subject.id,'console066-owner');assert.ok(r.url.startsWith('https://connect.vercel.com/'));
 await assert.rejects(apolloCredential('authorize',env,async()=>Response.json({url:'https://evil.example/'})),/Destino/);
});
test('search accepts only fixed categories and excludes known BookFail aliases',()=>{
 assert.equal(validateApolloSearch({country:'Chile',category:'reveal_phone'}),null);
 assert.equal(validateApolloSearch({country:'Chile',category:'constructor'}),null);
 const [r]=matchApolloCandidates([{name:'BOOKFAIL',domain:'bookfail.cl'}],[{name:'BookFail Chile',source_url:'https://instagram.com/bookfail.chile',status:'En conversación'}]);
 assert.equal(r.existing,true);assert.equal(r.crmStatus,'En conversación');
});
test('search verifies owner and invokes only free organization lookup, strips excess provider fields',async()=>{
 const calls=[];
 const fetcher=async(u,o)=>{const b=JSON.parse(o.body);if(u.includes('/connect/token/'))return Response.json({token:'provider-secret'});
  if(b.method==='initialize')return Response.json({result:{}});
  if(b.method==='tools/list')return Response.json({result:{tools:[{name:'apollo_read'},{name:'apollo_write'}]}});
  calls.push(b.params.arguments);return Response.json({result:{content:[{type:'text',text:JSON.stringify({data:b.params.arguments.action==='apollo_users_api_profile'?{email:'contacto@lallaveoficial.com'}:{organizations:[{name:'Test Books',website_url:'https://books.example',id:'123',private_email:'hidden'}]}})}]}});
 };
 const r=await apolloQuery('search',{country:'Chile',category:'librerias'},{VERCEL_OIDC_TOKEN:'oidc-secret'},fetcher);
 assert.deepEqual(calls.map(c=>c.action),['apollo_users_api_profile','apollo_organizations_lookup']);assert.equal(calls[1].per_page,10);assert.equal(r.candidates.length,1);assert.ok(!JSON.stringify(r).includes('hidden'));assert.ok(!JSON.stringify(r).includes('secret'));
});
test('profile accepts Apollo data envelope and still rejects another owner or missing identity',async()=>{
 for(const structured of [true,false])for(const email of ['contacto@lallaveoficial.com','other@example.com',undefined]){
  const fetcher=async(u,o)=>{const b=JSON.parse(o.body);
   if(u.includes('/connect/token/'))return Response.json({token:'provider-secret'});
   if(b.method==='initialize')return Response.json({result:{}});
   if(b.method==='tools/list')return Response.json({result:{tools:[{name:'apollo_users_api_profile'}]}});
   const profile={data:{email}};
   return Response.json({result:structured?{structuredContent:profile}:{content:[{type:'text',text:JSON.stringify(profile)}]}});
  };
  const promise=apolloQuery('check',{}, {VERCEL_OIDC_TOKEN:'oidc-secret'},fetcher);
  if(email==='contacto@lallaveoficial.com')assert.equal((await promise).status,'Conectado');
  else await assert.rejects(promise,email?/no corresponde/:/verificable/);
 }
});
