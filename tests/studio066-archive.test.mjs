import test from 'node:test';import assert from 'node:assert/strict';
import {fakeIndexedDB} from './studio066-portable-test-support.mjs';
import {mediaDB,addMedia,readMedia,listMedia,workspaceKey,defaultWorkspace} from '../public/centro-066/studio-media.js';
import {exportStudioArchive,restoreStudioArchive} from '../public/centro-066/studio-archive.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
test('native montage archive restores >40 originals and >70MB without overwriting existing assets',async()=>{
 const fake=await fakeIndexedDB(),db=await mediaDB(),s=storage(),target=storage();
 try{
  const clips=[];
  for(let i=0;i<42;i++){
   const media=await addMedia(db,new File([i===0?new Uint8Array(71*1024*1024):'frame-'+i],'frame-'+i+'.png',{type:'image/png'}));
   clips.push({id:crypto.randomUUID(),kind:'image',assetId:media.id,track:'V1',start:i,duration:1});
  }
  const key=workspaceKey+':1';s.setItem(key,JSON.stringify({...defaultWorkspace(),clips}));
  const file=await exportStudioArchive(db,s,1);assert.ok(file.size>70*1024*1024);
  const result=await restoreStudioArchive(db,target,file,2);assert.equal(result.added,42);assert.equal(result.clips,42);
  const restored=JSON.parse(target.getItem(workspaceKey+':2'));assert.notEqual(restored.clips[0].assetId,clips[0].assetId);
  assert.equal((await readMedia(db,restored.clips[0].assetId)).blob.size,71*1024*1024);
  assert.equal((await readMedia(db,clips[0].assetId)).blob.size,71*1024*1024);
  assert.equal((await listMedia(db)).length,84);
  const before=target.getItem(workspaceKey+':2');await assert.rejects(restoreStudioArchive(db,target,file.slice(0,file.size-1),2));assert.equal(target.getItem(workspaceKey+':2'),before);assert.equal((await listMedia(db)).length,84);
 }finally{db.close();await fake.finish();}
});
test('failed local persistence rolls back imported media and preserves both prior records',async()=>{
 const fake=await fakeIndexedDB(),db=await mediaDB(),s=storage(),target=storage();
 try{
  const media=await addMedia(db,new File(['original'],'still.png',{type:'image/png'}));
  const wk=workspaceKey+':1',gk='llave-studio066-generation-v1:1';
  s.setItem(wk,JSON.stringify({...defaultWorkspace(),clips:[{id:crypto.randomUUID(),kind:'image',assetId:media.id,track:'V1',start:0,duration:1}]}));
  const file=await exportStudioArchive(db,s,1);target.setItem(wk,'prior-timeline');target.setItem(gk,'prior-generation');
  const set=target.setItem;let failed=false;target.setItem=(k,v)=>{if(k===wk&&!failed){failed=true;throw Error('quota');}return set(k,v);};
  await assert.rejects(restoreStudioArchive(db,target,file,1),/quota/);assert.equal(target.getItem(wk),'prior-timeline');assert.equal(target.getItem(gk),'prior-generation');assert.equal((await listMedia(db)).length,1);
 }finally{db.close();await fake.finish();}
});
