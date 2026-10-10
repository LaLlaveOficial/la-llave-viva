import test from 'node:test';
import assert from 'node:assert/strict';
import {insertClipAt,splitClipAt,snapToEdges,trackPosition} from '../public/centro-066/studio-timeline-tools.js';
import {mediaDB,addMedia,listMedia,readMedia,listTrashedMedia,trashMedia,restoreMedia} from '../public/centro-066/studio-media.js';

const image={id:'a',kind:'image',assetId:'id1',track:'V1',start:0,duration:6,sourceStart:1.5,prompt:'Cinematic',opacity:1};
test('blade preserves precise duration and original in/out on both resulting clips',()=>{
 const pieces=splitClipAt([image],image.id,2.5,()=> 'second');
 assert.equal(pieces.length,2);
 assert.equal(pieces[0].duration,2.5);
 assert.equal(pieces[1].start,2.5);
 assert.equal(pieces[1].duration,3.5);
 assert.equal(pieces[1].sourceStart,4);
 assert.equal(pieces[1].prompt,'Cinematic');
 assert.deepEqual(image,{id:'a',kind:'image',assetId:'id1',track:'V1',start:0,duration:6,sourceStart:1.5,prompt:'Cinematic',opacity:1});
 assert.equal(splitClipAt([image],image.id,0),null);
 assert.equal(splitClipAt([image],image.id,6),null);
});
test('drag and drop respects track type and remains reversible by preserving old data',()=>{
 const asset={kind:'audio',id:'id2'};
 const clip={id:'sound',assetId:asset.id,kind:asset.kind,duration:4};
 assert.equal(insertClipAt(asset,clip,2.5,'A2').track,'A2');
 assert.equal(insertClipAt(asset,clip,2.5,'A2').start,2.5);
 assert.throws(()=>insertClipAt(asset,clip,2,'V1'),/incompatible/);
 assert.throws(()=>insertClipAt(asset,clip,599,'A1'),/supera/);
 assert.equal(clip.start,undefined);
});
test('magnetic snapping and timeline positions are bounded',()=>{
 const clips=[image,{...image,id:'b',start:6,duration:4}];
 assert.equal(snapToEdges(5.87,clips,null,{enabled:true}),6);
 assert.equal(snapToEdges(5.87,clips,null,{enabled:false}),5.87);
 assert.equal(trackPosition(150,100,100,10),5);
 assert.equal(trackPosition(0,100,100,10),0);
});
test('soft delete preserves local original bytes and restoration is idempotent',async()=>{
 const {indexedDB}=await import('fake-indexeddb');
 const original=globalThis.window,globalIDB=globalThis.indexedDB;
 globalThis.window={indexedDB};globalThis.indexedDB=indexedDB;
 let db;
 try{
  db=await mediaDB();
  const blob=new Blob(['important original'],{type:'image/png'});
  const file=Object.assign(blob,{name:'original.png',lastModified:123});
  const item=await addMedia(db,file);
  assert.ok((await listMedia(db)).some(x=>x.id===item.id));
  assert.equal(await trashMedia(db,item.id),true);
  assert.equal(await trashMedia(db,item.id),false);
  assert.equal((await listMedia(db)).some(x=>x.id===item.id),false);
  assert.ok((await listTrashedMedia(db)).some(x=>x.id===item.id));
  assert.equal((await readMedia(db,item.id)).blob.size,blob.size);
  assert.equal(await restoreMedia(db,item.id),true);
  assert.equal(await restoreMedia(db,item.id),false);
  assert.ok((await listMedia(db)).some(x=>x.id===item.id));
 }finally{
  db?.close();globalThis.window=original;if(globalIDB===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=globalIDB;
 }
});
