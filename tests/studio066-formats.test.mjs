import test from 'node:test';
import assert from 'node:assert/strict';
import {exportCanvasRecording,isMP4Data,exportFormatCapabilities,supportedRecordingMime,recordingBitrate} from '../public/centro-066/studio-recording.js';
import {defaultWorkspace,parseWorkspace} from '../public/centro-066/studio-media.js';
test('legacy timeline keeps clips and receives safe export format defaults',()=>{
 const previous={...defaultWorkspace(),clips:[]};
 delete previous.exportFormat;delete previous.encodingQuality;
 const restored=parseWorkspace(previous);
 assert.equal(restored.exportFormat,'webm');assert.equal(restored.encodingQuality,'high');
 assert.equal(parseWorkspace({...previous,exportFormat:'avi'}),null);
 assert.equal(parseWorkspace({...previous,encodingQuality:'ultra'}),null);
 const current=parseWorkspace({...previous,exportFormat:'mp4',encodingQuality:'master'});
 assert.equal(current.exportFormat,'mp4');assert.equal(current.encodingQuality,'master');
});
test('quality profiles increase bitrate at 720p and 1080p',()=>{
 assert.equal(recordingBitrate('720p','standard'),3000000);
 assert.equal(recordingBitrate('1080p','high'),12000000);
 assert.equal(recordingBitrate('1080p','master'),20000000);
 assert.throws(()=>recordingBitrate('4k','master'),/inválido/);
});
test('MP4 is advertised only when H.264 available and audio requires AAC',()=>{
 const w={isTypeSupported:t=>t==='video/webm'||t==='video/mp4;codecs="avc1.42E01E"'};
 assert.deepEqual(exportFormatCapabilities(w),{webm:true,mp4:true});
 assert.equal(supportedRecordingMime(w,'mp4',{audio:true}),null);
 assert.equal(supportedRecordingMime(w,'mp4',{audio:false}),'video/mp4;codecs="avc1.42E01E"');
 const no={isTypeSupported:t=>t==='video/webm'};
 assert.equal(exportFormatCapabilities(no).mp4,false);
});
test('MP4 container checks ftyp signature instead of filename',async()=>{
 const valid=new Uint8Array([0,0,0,24,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d]);
 assert.equal(await isMP4Data(new Blob([valid])),true);
 assert.equal(await isMP4Data(new Blob(['not really mp4'])),false);
});
test('MP4 export uses H.264 recorder and validates bytes before download',async()=>{
 const before={raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame};
 const video={readyState:'live',requests:0,requestFrame(){this.requests++;},stop(){}};
 const canvas={captureStream(){return {getVideoTracks:()=>[video],getTracks:()=>[video]};}};
 const MediaStream=class {constructor(tracks){assert.deepEqual(tracks,[video]);}};
 const magic=new Uint8Array([0,0,0,24,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d]);
 class MP4Recorder{
  static isTypeSupported(t){return t==='video/mp4;codecs="avc1.42E01E"';}
  constructor(stream,opts){assert.match(opts.mimeType,/mp4/);assert.equal(opts.videoBitsPerSecond,12000000);this.state='inactive';}
  start(){this.state='recording';}
  requestData(){}
  stop(){if(this.state!=='recording')return;this.state='inactive';this.ondataavailable({data:new Blob([magic])});this.onstop();}
 }
 try{
  globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),4);
  globalThis.cancelAnimationFrame=clearTimeout;
  const result=await exportCanvasRecording({canvas,seconds:.08,fps:24,format:'mp4',audioTracks:[],bitrate:12000000,onFrame:async()=>{},Recorder:MP4Recorder,createStream:MediaStream});
  assert.equal(result.format,'mp4');assert.equal(await isMP4Data(result.blob),true);assert.ok(video.requests>0);
 }finally{
  if(before.raf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=before.raf;
  if(before.caf===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=before.caf;
 }
});
test('MP4 cannot silently fall back to WebM when H.264 unavailable',async()=>{
 class Unsupported{static isTypeSupported(t){return t.startsWith('video/webm');}}
 await assert.rejects(exportCanvasRecording({canvas:{captureStream(){throw Error('should never record');}},seconds:2,fps:24,format:'mp4',onFrame:async()=>{},Recorder:Unsupported,createStream:class{}}),/MP4 H.264/);
});
