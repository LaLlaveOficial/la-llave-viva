import test from 'node:test';
import assert from 'node:assert/strict';
import {fakeIndexedDB} from './studio066-portable-test-support.mjs';
import {mediaDB,addMedia,readMedia,defaultWorkspace,addTimelineClip,workspaceKey} from '../public/centro-066/studio-media.js';
import {PORTABLE_SCHEMA,verifyPortableBackup,exportPortableBackup,importPortableBackup,PORTABLE_MAX_FILE} from '../public/centro-066/studio-portable.js';
const projectId=7;
const store=new Map();
const storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
const mkey=workspaceKey+':'+projectId,gkey='llave-studio066-generation-v1:'+projectId;
test('portable studio backup saves original media and restores timeline and references offline',async()=>{
 const ctx=await fakeIndexedDB();
 let db;
 try{
  db=await mediaDB();
  const file=Object.assign(new Blob([new Uint8Array([1,2,3,4,5,6])],{type:'image/png'}),{name:'paula-original.png',lastModified:1234});
  const added=await addMedia(db,file);
  const shot=addTimelineClip(added,[]);
  store.set(mkey,JSON.stringify({...defaultWorkspace(),clips:[shot]}));
  store.set(gkey,JSON.stringify({draft:{refs:[{assetId:added.id,role:'start'}]},history:[{
   id:'e221d24f-f254-46d9-a22f-ddc70caba500',status:'prepared',request:{title:'Caso 066',prompt:'Tracking shot',refs:[{assetId:added.id,role:'start'}]},results:[],createdAt:'2026-10-10T00:00:00Z'
  }]}));
  const backup=await exportPortableBackup(db,storage,projectId,'Caso 066');
  assert.equal(backup.schema,PORTABLE_SCHEMA);
  assert.equal(backup.assets.length,1);
  assert.equal(backup.assets[0].name,'paula-original.png');
  assert.equal(backup.generations.history.length,1);
  assert.equal(verifyPortableBackup(backup,projectId).assets.length,1);
  assert.throws(()=>verifyPortableBackup(backup,999),/otro proyecto/);
  assert.throws(()=>verifyPortableBackup({...backup,assets:[backup.assets[0],backup.assets[0]]},projectId),/duplicados/);
  assert.throws(()=>verifyPortableBackup({...backup,assets:[]},projectId),/Falta un archivo/);
  db.close();db=null;
  await ctx.reset();
  db=await mediaDB();
  store.clear();
  const result=await importPortableBackup(db,storage,backup,projectId);
  assert.equal(result.added,1);
  assert.equal(result.clips,1);
  assert.equal(result.requests,1);
  const restored=await readMedia(db,added.id);
  assert.deepEqual([...new Uint8Array(await restored.blob.arrayBuffer())],[1,2,3,4,5,6]);
  assert.equal(JSON.parse(storage.getItem(mkey)).clips[0].assetId,added.id);
  assert.equal(JSON.parse(storage.getItem(gkey)).history[0].request.title,'Caso 066');
  const again=await importPortableBackup(db,storage,backup,projectId);
  assert.equal(again.added,0,'Restoring twice must not overwrite original bytes');
 }finally{db?.close();await ctx.finish();}
});
test('portable backup validates raw file sizes before reading base64',()=>{
 const id='cf2dbdf1-82a1-4b95-bcf0-463e480de1a1';
 const payload={schema:PORTABLE_SCHEMA,projectId,workspace:defaultWorkspace(),generations:{history:[],draft:null},assets:[{id,kind:'image',mime:'image/png',name:'huge.png',size:PORTABLE_MAX_FILE+1,data:'AA=='}]};
 assert.throws(()=>verifyPortableBackup(payload,projectId),/tamaño/);
});
