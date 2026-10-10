import test from 'node:test';
import assert from 'node:assert/strict';
import {preflightExportMedia,formatExportPreflightError} from '../public/centro-066/studio-export-preflight.js';
const id='76da4ed7-2445-492a-a8d9-e4a89586ab01';
const other='76da4ed7-2445-492a-a8d9-e4a89586ab02';
const img={id,name:'rosa4.png',kind:'image',mime:'image/png',size:10};
const imageClip={id:'image-1',kind:'image',assetId:id,track:'V1'};
const title={id:'text-1',kind:'text',assetId:'',track:'V2'};
const handlers={read:async()=>({blob:new Blob(['0123456789'])}),loadImage:async()=>({naturalWidth:100,naturalHeight:120}),loadMedia:async()=>({element:{readyState:2,videoWidth:1080,videoHeight:1920}})};
test('missing image in local browser blocks export despite a valid V2 title',async()=>{
 let accessed=false;
 const result=await preflightExportMedia({clips:[imageClip,title],assets:[],read:async()=>{accessed=true;throw Error('must not read');},loadImage:handlers.loadImage,loadMedia:handlers.loadMedia});
 assert.equal(result.ok,false);
 assert.deepEqual(result.problems[0].reason,'missing-local');
 assert.equal(accessed,false);
 assert.match(formatExportPreflightError(result),/Biblioteca privada/);
 assert.match(formatExportPreflightError(result),/rosa4|76da4ed7/);
});
test('restored and decodable PNG lets image and title render together',async()=>{
 const res=await preflightExportMedia({clips:[imageClip,title],assets:[img],...handlers});
 assert.deepEqual(res,{ok:true,problems:[]});
 assert.equal(formatExportPreflightError(res),'');
});
test('IndexedDB record without bytes is not a valid source for export',async()=>{
 const result=await preflightExportMedia({clips:[imageClip],assets:[img],...handlers,read:async()=>({blob:null})});
 assert.equal(result.ok,false);
 assert.equal(result.problems[0].reason,'missing-bytes');
});
test('unreadable image decoder blocks visually incomplete video',async()=>{
 const broken=await preflightExportMedia({clips:[imageClip],assets:[img],...handlers,loadImage:async()=>({naturalWidth:0,naturalHeight:0})});
 assert.equal(broken.ok,false);
 assert.match(formatExportPreflightError(broken),/no puede leer/);
});
test('missing local media in V1 is not masked by a functioning image in V2',async()=>{
 const c2={...imageClip,id:'image-2',assetId:other,track:'V2'};
 const result=await preflightExportMedia({clips:[imageClip,c2,title],assets:[img],...handlers});
 assert.equal(result.ok,false);
 assert.equal(result.problems.length,1);
 assert.equal(result.problems[0].reason,'missing-local');
});
test('audio and video must have metadata, and video dimensions, before recording',async()=>{
 const audio={...img,kind:'audio',mime:'audio/mpeg'};
 const ac={kind:'audio',assetId:id,id:'audio1',track:'A1'};
 const badAudio=await preflightExportMedia({clips:[ac],assets:[audio],...handlers,loadMedia:async()=>({element:{readyState:0}})});
 assert.equal(badAudio.problems[0].reason,'audio-decode');
 const vclip={kind:'video',assetId:id,id:'video1',track:'V1'};
 const video={...img,kind:'video',mime:'video/mp4'};
 const badVideo=await preflightExportMedia({clips:[vclip],assets:[video],...handlers,loadMedia:async()=>({element:{readyState:2,videoWidth:0,videoHeight:0}})});
 assert.equal(badVideo.problems[0].reason,'video-decode');
});
test('repeated reference to the same original checks its blob only once',async()=>{
 let reads=0;
 const result=await preflightExportMedia({clips:[imageClip,{...imageClip,id:'duplicate',track:'V2'}],assets:[img],...handlers,read:async()=>{reads++;return {blob:new Blob(['0123456789'])};}});
 assert.equal(result.ok,true);assert.equal(reads,1);
});
