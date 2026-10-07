import test from 'node:test';import assert from 'node:assert/strict';
import {houstonRoutines,ROUTINES} from '../lib/houston-routines.js';
const env={HOUSTON_HOST_TOKEN:'x'.repeat(64)};
function engine(){
 const saved={c:[],p:[]},writes=[];let timezone='UTC';
 const fetcher=async(url,init)=>{
  const path=new URL(url).pathname.replace('/engine',''),body=init.body?JSON.parse(init.body):null;let data;
  if(init.method!=='GET')writes.push({path,body});
  if(path==='/agents')data=[{id:'c',name:'Contenido Caso 066'},{id:'p',name:'Prensa y reseñas'}];
  else if(path==='/v1/preferences/timezone'){if(body)timezone=body.value;data={value:timezone};}
  else if(path.endsWith('/providers'))data=[{id:'openai-codex',configured:true}];
  else if(path.endsWith('/routine_runs'))data={items:[]};
  else if(path.endsWith('/routines')){const key=path.split('/')[2];if(body){data={id:key+'-routine',...body};saved[key].push(data);}else data={items:saved[key]};}
  else if(path.match(/\/routines\/[^/]+$/)){const key=path.split('/')[2];Object.assign(saved[key][0],body);data=saved[key][0];}
  else throw new Error('Unexpected endpoint '+path);
  return {ok:true,status:200,json:async()=>data};
 };return {fetcher,writes,saved};
}
test('setup is retry safe, uses Chile time, and preserves explicit no-send guards',async()=>{
 const e=engine();const first=await houstonRoutines({action:'setup'},env,e.fetcher);assert.equal(first.timezone,'America/Santiago');assert.equal(first.routines.length,2);
 await houstonRoutines({action:'setup'},env,e.fetcher);assert.equal(e.writes.filter(w=>w.path.endsWith('/routines')).length,2);
 for(const [slug,p] of Object.entries(ROUTINES)){const row=first.routines.find(r=>r.slug===slug);assert.equal(row.schedule,p.schedule);assert.equal(row.enabled,true);}
 assert.match(e.saved.c[0].prompt,/No envíes mensajes/);assert.equal(e.saved.c[0].provider,'openai-codex');assert.ok(!JSON.stringify(first).includes(env.HOUSTON_HOST_TOKEN));
 await houstonRoutines({action:'pause',slug:'contenidos'},env,e.fetcher);assert.equal(e.saved.c[0].enabled,false);assert.equal(e.saved.p[0].enabled,true);
});
test('untrusted action, slug and target fail before any upstream request',async()=>{
 const e=engine();await assert.rejects(houstonRoutines({action:'run',slug:'../other'},env,e.fetcher),/inválida/);
 await assert.rejects(houstonRoutines({action:'setup'},{...env,HOUSTON_ORIGIN:'https://other.example'},e.fetcher),/privada/);assert.equal(e.writes.length,0);
});
