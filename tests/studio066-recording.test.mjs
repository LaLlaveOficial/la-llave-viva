import test from 'node:test';
import assert from 'node:assert/strict';
import {isWebMData,supportedWebMMime,exportCanvasWebM} from '../public/centro-066/studio-recording.js';

test('WebM detection requires EBML magic, not arbitrary compressed file size',async()=>{
 assert.equal(await isWebMData(new Blob([new Uint8Array([0x1a,0x45,0xdf,0xa3])])),true);
 assert.equal(await isWebMData(new Blob([new Uint8Array([0x1a,0x45,0xdf])])),false);
 assert.equal(await isWebMData(new Blob(['not webm'])),false);
 assert.equal(supportedWebMMime({isTypeSupported:()=>false}),null);
 assert.ok(supportedWebMMime({isTypeSupported:type=>type==='video/webm'}));
});
test('exporter explicitly requests frames, works with no audio and releases video track',async()=>{
 const old={raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame};
 let requests=0,stops=0,capturedTracks=0;
 const video={readyState:'live',requestFrame:()=>{requests++;},stop:()=>{stops++;}};
 const canvas={captureStream:fps=>{assert.equal(fps,0);return {getVideoTracks:()=>[video],getTracks:()=>[video]};}};
 const ms=class {
  constructor(tracks){capturedTracks=tracks.length;assert.deepEqual(tracks,[video]);}
 };
 const magic=new Uint8Array([0x1a,0x45,0xdf,0xa3,0x11,0x22,0x33]);
 class MockRecorder {
  static isTypeSupported(t){return t==='video/webm';}
  constructor(){this.state='inactive';}
  start(){this.state='recording';}
  requestData(){}
  stop(){
   if(this.state==='inactive')return;
   this.state='inactive';this.ondataavailable?.({data:new Blob([magic])});this.onstop?.();
  }
 }
 try{
  globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),5);
  globalThis.cancelAnimationFrame=clearTimeout;
  const shown=[];
  const output=await exportCanvasWebM({canvas,seconds:.1,fps:24,onFrame:async time=>shown.push(time),audioTracks:[],Recorder:MockRecorder,createStream:ms});
  assert.equal(await isWebMData(output),true);
  assert.equal(capturedTracks,1,'A still photograph must NOT create a silent audio stream');
  assert.ok(requests>=2,'At least two explicit frame requests expected');
  assert.ok(shown.length>=2);
  assert.equal(stops,1,'Canvas track must be released');
 }finally{
  if(old.raf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=old.raf;
  if(old.caf===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=old.caf;
 }
});
test('the recording rejects unsupported browsers and aborted requests',async()=>{
 class NoRecorder{static isTypeSupported(){return false;}}
 await assert.rejects(
  exportCanvasWebM({canvas:{captureStream(){throw new Error('unexpected')}},seconds:3,fps:24,onFrame:()=>{},Recorder:NoRecorder,createStream:class {}}),
  /no admite WebM/
 );
 const controller=new AbortController();controller.abort();
 await assert.rejects(
  exportCanvasWebM({canvas:{captureStream(){}},seconds:2,fps:24,onFrame:()=>{},signal:controller.signal,Recorder:NoRecorder,createStream:class {}}),
  /cancelada/
 );
});
