import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createHash} from 'node:crypto';
import {createStudioProjectSync} from '../public/centro-066/studio-project-sync.js';
import {normalizeProjectState} from '../public/centro-066/studio-project-state.js';
import {defaultWorkspace,workspaceKey} from '../public/centro-066/studio-media.js';
import {studioProjectState066} from '../lib/studio-project-state066.js';
const id='507d3aca-8f20-43cb-9469-5a15252bc075',key=workspaceKey+':1';
const workspace=()=>({...defaultWorkspace(),clips:[{id:'clip',assetId:id,kind:'image',track:'V1',start:0,duration:5}]});
const state=()=>normalizeProjectState({workspace:workspace(),generation:null});
const hash=async b=>createHash('sha256').update(Buffer.from(await b.arrayBuffer())).digest('hex');
const env={STUDIO_CLOUD_ENABLED:'1',STUDIO_STORAGE_BRANCH_ID:'br-test-test-test',STUDIO_STORAGE_ENDPOINT:'https://br-test-test-test.storage.c-11.us-east-1.aws.neon.tech',STUDIO_STORAGE_REGION:'us-east-1',STUDIO_STORAGE_BUCKET:'studio066-test',STUDIO_STORAGE_ACCESS_KEY_ID:'synthetic-key',STUDIO_STORAGE_SECRET_ACCESS_KEY:'synthetic-secret-test-only'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function storage(){const items=new Map();return {getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,String(v)),removeItem:k=>items.delete(k)};}
async function fixture(){
 const db=new PGlite();for(const name of ['20261010_studio066.sql','20261010_studio066_media.sql','20261010_studio066_media_trash.sql','20261018_studio066_project_state.sql'])await db.exec(await fs.readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const sql=async(parts,...values)=>(await db.query(parts.map((p,i)=>p+(i<values.length?'$'+(i+1):'')).join(''),values)).rows;
 await sql`INSERT INTO console066_studio_projects(name,type) VALUES ('QA','cine'),('Other','cine')`;
 return {db,sql};
}
test('snapshot rejects malformed generation requests and invalid original IDs',()=>{
 assert.ok(state());assert.equal(normalizeProjectState({workspace:{...workspace(),clips:[{...workspace().clips[0],assetId:'../wrong'}]}}),null);
 assert.equal(normalizeProjectState({...state(),generation:{draft:{refs:[]},history:[{id:'record',request:{title:'QA',prompt:'QA',refs:{}},results:[],status:'prepared'}]}}),null);
});
test('Postgres CAS prevents simultaneous overwrites, cross-project/trashed/pending refs and disabled access',async()=>{
 const {db,sql}=await fixture();try{
  const call=(version,data=state())=>studioProjectState066(sql,'studio-cloud-project-save',{method:'POST',body:{projectId:1,version,data}},env);
  assert.equal((await studioProjectState066(()=>{throw Error('off must not read');},'studio-cloud-project',{method:'GET',query:{projectId:1}},{})).status,503);
  assert.equal((await call(0)).data.reason,'missing_media');
  await sql`INSERT INTO console066_studio_media(id,project_id,name,kind,mime,size_bytes,sha256_hex,object_key,status) VALUES (${id},2,'QA','image','image/png',2,${'a'.repeat(64)},'qa','ready')`;
  assert.equal((await call(0)).status,409);
  await sql`UPDATE console066_studio_media SET project_id=1,status='pending' WHERE id=${id}`;assert.equal((await call(0)).status,409);
  await sql`UPDATE console066_studio_media SET status='ready',deleted_at=now() WHERE id=${id}`;assert.equal((await call(0)).status,409);
  await sql`UPDATE console066_studio_media SET deleted_at=NULL WHERE id=${id}`;
  assert.equal((await call(0)).data.version,1);assert.equal((await call(1)).data.version,1);
  const a=state(),b=state();a.workspace.name='A';b.workspace.name='B';
  const results=await Promise.all([call(1,a),call(1,b)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const read=await studioProjectState066(sql,'studio-cloud-project',{method:'GET',query:{projectId:1}},env);assert.equal(read.data.version,2);assert.ok(['A','B'].includes(read.data.data.workspace.name));
 }finally{await db.close();}
});
async function clientFixture({remote=null,enabled=true,badHash=false,failStorage=false}={}){
 const local=new Map(),remoteMedia=[],calls=[],store=storage(),notices=[];let remoteState=remote,version=remote?1:0,failWrites=false,restored=0;
 const blob=new Blob(['original'],{type:'image/png'}),sha=await hash(blob),item={id,blob,name:'QA.png',kind:'image',mime:'image/png'};
 const meta={id,name:item.name,kind:item.kind,mime:item.mime,size_bytes:blob.size,sha256_hex:badHash?'b'.repeat(64):sha};
 if(remote)remoteMedia.push(meta);else{local.set(id,item);store.setItem(key,JSON.stringify(workspace()));}
 const fetcher=async(url,options={})=>{
  if(url==='https://private.test/upload'){calls.push('PUT');return new Response('',{status:200});}
  if(url==='https://private.test/download')return new Response(blob);
  const op=new URL(url,'https://app.test').searchParams.get('op'),body=options.body?JSON.parse(options.body):{};calls.push(op);
  if(op==='studio-cloud')return response({enabled});if(op==='studio-cloud-assets')return response({assets:remoteMedia});
  if(op==='studio-cloud-project')return response({data:remoteState,version});
  if(op==='studio-cloud-upload')return response({uploadUrl:'https://private.test/upload',headers:{}});
  if(op==='studio-cloud-confirm'){remoteMedia.push(meta);return response({ready:true});}
  if(op==='studio-cloud-download')return response({url:'https://private.test/download'});
  if(op==='studio-cloud-project-save'){if(body.version!==version)return response({error:'conflict',reason:'version_conflict'},409);remoteState=body.data;return response({saved:true,version:++version});}
  throw Error('Unexpected '+op);
 };
 const originalSet=store.setItem;store.setItem=(k,v)=>{if(failStorage&&failWrites&&k===key){failWrites=false;throw Error('storage quota');}originalSet(k,v);};
 const sync=createStudioProjectSync({projectId:1,db:null,storage:store,getWorkspace:()=>workspace(),onStatus:s=>notices.push(s),onRestored:()=>{restored++;},auto:false,fetcher,hash,media:{read:async(_,i)=>local.get(i),put:async(_,x)=>{local.set(x.id,x);failWrites=true;},discard:async(_,i)=>local.delete(i)}});
 return {sync,local,remoteMedia,calls,store,notices,get restored(){return restored;},advance(){version++;}};
}
test('originals upload/verify before snapshot; next save reuses bytes; stale device cannot overwrite',async()=>{
 const f=await clientFixture();await f.sync.start();assert.equal(await f.sync.flush(),true);
 assert.ok(f.calls.indexOf('studio-cloud-confirm')<f.calls.indexOf('studio-cloud-project-save'));
 assert.equal(await f.sync.flush(),true);assert.equal(f.calls.filter(x=>x==='PUT').length,1);
 f.advance();assert.equal(await f.sync.flush(),false);const writes=f.calls.length;assert.equal(await f.sync.flush(),false);assert.equal(f.calls.length,writes);f.sync.dispose();
});
test('empty device automatically restores verified files and exact snapshot',async()=>{
 const f=await clientFixture({remote:state()});await f.sync.start();assert.equal(f.restored,1);assert.equal(f.local.size,1);assert.deepEqual(JSON.parse(f.store.getItem(key)),state().workspace);assert.equal(f.store.getItem(key+':cloud-version'),'1');f.sync.dispose();
});
test('hash failure and quota failure roll back new media and preserve prior local state',async()=>{
 for(const mode of [{badHash:true},{failStorage:true}]){const f=await clientFixture({remote:state(),...mode});await f.sync.start();assert.equal(f.restored,0);assert.equal(f.local.size,0);assert.equal(f.store.getItem(key),null);f.sync.dispose();}
});
test('existing different device requires recovery; disabled cloud does not transfer files',async()=>{
 const f=await clientFixture({remote:state()});f.store.setItem(key,JSON.stringify(workspace()));await f.sync.start();assert.equal(await f.sync.flush(),false);assert.equal(f.local.size,0);assert.equal(await f.sync.recover(),true);f.sync.dispose();
 const off=await clientFixture({enabled:false});await off.sync.start();assert.equal(await off.sync.flush(),false);assert.deepEqual(off.calls,['studio-cloud']);off.sync.dispose();
});

test('local generation work blocks automatic remote restore when montage is absent',async()=>{
 const f=await clientFixture({remote:state()});f.store.setItem('llave-studio066-generation-v1:1',JSON.stringify({unsent:'keep me'}));await f.sync.start();assert.equal(f.restored,0);assert.equal(f.local.size,0);assert.equal(JSON.parse(f.store.getItem('llave-studio066-generation-v1:1')).unsent,'keep me');f.sync.dispose();
});
test('editor redraw leaves cloud synchronization active and saves the edited timeline',async()=>{
 const {JSDOM}=await import('jsdom'),{indexedDB}=await import('fake-indexeddb'),{studioWorkbenchView}=await import('../public/centro-066/studio-workbench.js');
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://example.com',pretendToBeVisual:true});
 const previous=Object.fromEntries(['window','document','indexedDB','localStorage','fetch'].map(k=>[k,globalThis[k]]));let saved=null,clean;
 try{
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,indexedDB,localStorage:dom.window.localStorage});Object.defineProperty(dom.window,'indexedDB',{value:indexedDB});
  dom.window.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},save(){},restore(){},drawImage(){},strokeText(){},fillText(){}});
  globalThis.fetch=async(url,opts={})=>{const op=new URL(url,'https://example.com').searchParams.get('op');
   if(op==='studio-cloud')return response({enabled:true,maxFileBytes:52428800,maxProjectBytes:268435456,maxFiles:80});
   if(op==='studio-cloud-project')return response({version:0,data:null});
   if(op==='studio-cloud-project-save'){saved=JSON.parse(opts.body).data;return response({saved:true,version:1});}
   return response({assets:[]});};
  const root=dom.window.document.querySelector('#root');clean=studioWorkbenchView(root,()=>{},{id:1,name:'QA'});
  for(let i=0;i<100&&!root.querySelector('#studiowb-cloud-state')?.textContent.includes('disponible');i++)await new Promise(r=>setTimeout(r,10));
  assert.match(root.querySelector('#studiowb-cloud-state').textContent,/disponible/);
  root.querySelector('#studiowb-title').click(); // A real edit triggers render().
  await root.querySelector('#studiowb-cloud-now').onclick();assert.equal(saved.workspace.clips.length,1);assert.equal(saved.workspace.clips[0].kind,'text');
 }finally{clean?.();for(const [k,v] of Object.entries(previous))v===undefined?delete globalThis[k]:globalThis[k]=v;dom.window.close();}
});
