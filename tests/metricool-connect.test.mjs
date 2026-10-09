import test from 'node:test';import assert from 'node:assert/strict';
import {connectRequest,parseRPC,metricoolSync} from '../lib/metricool-connect.js';
test('authorization binds a server-owned identity and never exposes OIDC',async()=>{
 let sent;const result=await connectRequest('authorize',{VERCEL_OIDC_TOKEN:'secret'},async(url,options)=>{sent={url,options};return Response.json({url:'https://connect.vercel.com/authorize/example'});});
 assert.deepEqual(result,{url:'https://connect.vercel.com/authorize/example'});assert.equal(JSON.parse(sent.options.body).subject.id,'console066-owner');assert.equal(sent.options.headers.Authorization,'Bearer secret');
 await assert.rejects(connectRequest('authorize',{VERCEL_OIDC_TOKEN:'secret'},async()=>Response.json({url:'https://attacker.example/steal'})),/destino/);
});
test('reads JSON and SSE RPC results without treating errors as data',()=>{
 assert.deepEqual(parseRPC('event: message\ndata: {"result":{"rows":[]}}\n\n'),{result:{rows:[]}});assert.throws(()=>parseRPC('not-json'));
});
test('a recent persisted sync skips credential and provider calls',async()=>{
 const r=await metricoolSync(async()=>[{detail:{networks:['instagram'],syncedAt:'2026-10-07'}}],{},()=>{throw Error('must not fetch');});assert.equal(r.cached,true);
});
test('only analytics for the fixed brand can be invoked; tokens never persist',async()=>{
 const saved=[],calls=[];let first=true;
 const sql=async(strings,...params)=>{if(first){first=false;return [];}saved.push(params);return [];};
 const fetcher=async(url,opt)=>{
  const b=JSON.parse(opt.body);calls.push({url,b});
  if(url.includes('/connect/token/'))return Response.json({token:'provider-secret'});
  if(b.method==='initialize')return Response.json({result:{protocolVersion:'2025-03-26'}});
  if(b.method==='tools/list')return Response.json({result:{tools:[{name:'get_analytics_data_by_metrics'},{name:'publish_post'}]}});
  const date=b.params.arguments.to.slice(0,10).replaceAll('-','');
  return Response.json({result:{content:[{type:'text',text:JSON.stringify({rows:[[...b.params.arguments.metrics.map(()=>null),date]]})}]}});
 };
 const result=await metricoolSync(sql,{VERCEL_OIDC_TOKEN:'oidc'},fetcher);assert.equal(result.networks.length,4);assert.ok(result.networks.includes('tiktok'));
 for(const c of calls.filter(c=>c.b.method==='tools/call')){assert.equal(c.b.params.arguments.brandId,'6252950');assert.equal(c.b.params.name,'get_analytics_data_by_metrics');}
 assert.equal(JSON.stringify(saved).includes('secret'),false);
});
