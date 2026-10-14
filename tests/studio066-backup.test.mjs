import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {mediaDB,addMedia,listMedia,readMedia,defaultWorkspace} from '../public/centro-066/studio-media.js';
import {exportProjectBundle,importProjectBundle} from '../public/centro-066/studio-project-backup.js';
import {newGenerationDraft,validateGeneration,parseGenerationHistory} from '../public/centro-066/studio-generation.js';
const validate=(history,assets)=>parseGenerationHistory(history).length===history.length&&history.every(r=>validateGeneration(r.request,assets.map(a=>({...a,kind:a.mime.split('/')[0]}))).value);
test('complete project round trip preserves bytes and parameters with fresh asset IDs',async()=>{
 globalThis.window={indexedDB};globalThis.indexedDB=indexedDB;const db=await mediaDB();
 try{
  const image=await addMedia(db,new File(['original-image'],'Paula.jpg',{type:'image/jpeg'}));
  const video=await addMedia(db,new File(['original-video'],'clip.mp4',{type:'video/mp4'}));
  const draft={...newGenerationDraft(),prompt:'Rainy night',refs:[{assetId:image.id,role:'start'}]};
  const id=crypto.randomUUID(),history=[{id,version:2,status:'imported',request:draft,results:[{assetId:video.id,duration:5}]}];
  const workspace={...defaultWorkspace(),clips:[{id:crypto.randomUUID(),assetId:video.id,kind:'video',track:'V1',start:0,duration:5}]};
  const backup=await exportProjectBundle(db,{draft,history,workspace,selected:id,activePreview:video.id,mobileView:'preview'});
  const restored=await importProjectBundle(db,backup,validate),s=restored.snapshot;
  assert.equal(s.draft.prompt,draft.prompt);assert.equal(s.draft.variants,1);
  assert.notEqual(s.draft.refs[0].assetId,image.id);assert.notEqual(s.selected,id);
  assert.equal(s.activePreview,s.history[0].results[0].assetId);assert.equal(s.workspace.clips[0].assetId,s.activePreview);
  assert.equal(s.history[0].results[0].duration,5);assert.equal(s.history[0].version,undefined);
  assert.equal(await (await readMedia(db,s.activePreview)).blob.text(),'original-video');
  assert.equal(await (await readMedia(db,s.draft.refs[0].assetId)).blob.text(),'original-image');
  assert.equal(await (await readMedia(db,video.id)).blob.text(),'original-video');
  const before=(await listMedia(db)).length;
  await assert.rejects(importProjectBundle(db,backup.slice(0,backup.size-1),validate),/inválido|incompleto/);
  assert.equal((await listMedia(db)).length,before);
  await assert.rejects(importProjectBundle(db,new Blob(['not a backup']),validate),/respaldo|Respaldo/);
  assert.equal((await listMedia(db)).length,before);
 }finally{db.close();delete globalThis.window;delete globalThis.indexedDB;}
});
test('missing original assets prevents an incomplete backup',async()=>{
 globalThis.window={indexedDB};globalThis.indexedDB=indexedDB;const db=await mediaDB();
 try{await assert.rejects(exportProjectBundle(db,{draft:{refs:[{assetId:crypto.randomUUID()}]},history:[],workspace:null}),/Falta un archivo/);}finally{db.close();delete globalThis.window;delete globalThis.indexedDB;}
});
