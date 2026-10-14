import test from 'node:test';
import assert from 'node:assert/strict';
import {isWebMData,supportedWebMMime,exportCanvasWebM,exportCanvasRecording} from '../public/centro-066/studio-recording.js';

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
test('playback and the export clock wait for the encoder start event, including a slow startup',async()=>{
 const old={raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame},events=[];
 const video={requestFrame(){events.push('frame');},stop(){}};
 class Recorder{
  static isTypeSupported(t){return t==='video/webm';}
  start(){this.state='recording';events.push('start-request');setTimeout(()=>{events.push('encoder-ready');this.onstart?.();},80);}
  stop(){if(this.state==='inactive')return;this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array([0x1a,0x45,0xdf,0xa3])])});this.onstop?.();}
 }
 try{
  globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),5);globalThis.cancelAnimationFrame=clearTimeout;
  let initial=true;const result=await exportCanvasRecording({canvas:{captureStream:()=>({getVideoTracks:()=>[video],getTracks:()=>[video]})},seconds:.1,fps:24,Recorder,createStream:class{},onFrame:async t=>{if(initial){initial=false;await new Promise(r=>setTimeout(r,50));}if(t>0)assert.ok(events.includes('playback'));},onStart:()=>events.push('playback')});
  assert.ok(result.leadSeconds>=.12&&result.leadSeconds<.4,'The server trim must include initial frame preparation and encoder startup');
  assert.ok(events.indexOf('encoder-ready')<events.indexOf('playback'));assert.ok(events.indexOf('playback')<events.lastIndexOf('frame'));
 }finally{if(old.raf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=old.raf;if(old.caf===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=old.caf;}
});
