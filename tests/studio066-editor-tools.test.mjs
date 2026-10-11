import test from 'node:test';
import assert from 'node:assert/strict';
import {insertClipAt,splitClipAt,snapToEdges,trackPosition,pointerCutTime,previewClipDrag,clipDragChanged} from '../public/centro-066/studio-timeline-tools.js';
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

test('blade pointer maps position into timeline and rounds to a frame',()=>{
 assert.equal(pointerCutTime(180,100,960,12,24),1);
 assert.equal(pointerCutTime(580,100,960,12,24),6);
 assert.equal(pointerCutTime(-100,100,960,12,24),0);
 assert.equal(pointerCutTime(2000,100,960,12,24),12);
 assert.equal(pointerCutTime(50,0,0,12,24),0);
 const slices=splitClipAt([image],image.id,pointerCutTime(200,100,600,12,24),()=> 'right');
 assert.equal(slices.length,2);
 assert.equal(slices[0].duration,2);
 assert.equal(slices[1].sourceStart,3.5);
});

test('image clip can be extended with right trim without changing the original',()=>{
 const initial={...image,kind:'image',sourceStart:0,start:0,duration:5};
 const extended=previewClipDrag(initial,'trim-right',2,{fps:24});
 assert.equal(extended.duration,7);
 assert.equal(extended.start,0);
 assert.equal(initial.duration,5);
 assert.equal(clipDragChanged(initial,extended),true);
});
test('trim-left extends image left; video cannot reveal negative source frames',()=>{
 const picture={...image,kind:'image',start:3,duration:4,sourceStart:0};
 const result=previewClipDrag(picture,'trim-left',-2,{fps:24});
 assert.deepEqual([result.start,result.duration,result.sourceStart],[1,6,0]);
 const originalVideo={...image,kind:'video',start:3,duration:4,sourceStart:0};
 const video=previewClipDrag(originalVideo,'trim-left',-2,{fps:24});
 assert.deepEqual([video.start,video.duration,video.sourceStart],[3,4,0]);
});
test('body drag is bounded, frame-snapped and does not mutate source',()=>{
 const before={...image,start:0,duration:5};
 const moved=previewClipDrag(before,'move',1.25,{fps:24,snapping:false,clips:[]});
 assert.equal(moved.start,1.25);
 assert.equal(before.start,0);
 const clamped=previewClipDrag(before,'move',10000,{fps:24,clips:[]});
 assert.equal(clamped.start,595);
 assert.equal(clipDragChanged(before,moved),true);
 assert.equal(clipDragChanged(before,before),false);
});
