import test from 'node:test';
import assert from 'node:assert/strict';
import {constrainSourceRange,sourceRangeValid,prepareMediaFrame,extractVideoAudio} from '../public/centro-066/studio-playback.js';
const clip={kind:'video',sourceStart:2,duration:5};
test('extracting video sound preserves sync, original and fades without double audio or occupied tracks',()=>{
 const video={...clip,id:'v',assetId:'original',track:'V1',start:3,volume:.7,audioFadeIn:1};
 const workspace={tracks:['V2','V1','A1','A2'],clips:[video,{id:'a',kind:'audio',track:'A1',start:0,duration:10}]};
 const next=extractVideoAudio(workspace,'v',{},()=> 'extracted');const audio=next.clips.at(-1);
 assert.equal(audio.track,'A2');assert.equal(audio.assetId,'original');assert.equal(audio.sourceStart,2);assert.equal(audio.start,3);assert.equal(audio.duration,5);assert.equal(audio.volume,.7);assert.equal(audio.audioFadeIn,1);
 assert.equal(next.clips[0].volume,0);assert.equal(video.volume,.7);assert.throws(()=>extractVideoAudio(next,'v'),/ya está/);
 assert.throws(()=>extractVideoAudio(workspace,'v',{V1:{locked:true}}),/Desbloquea/);
 const extra=extractVideoAudio(workspace,'v',{A1:{locked:true},A2:{locked:true}},()=> 'another');assert.equal(extra.clips.at(-1).track,'A3');assert.equal(extra.tracks.length,5);
});
test('motion and sound never reveal frames beyond the original, images remain extensible',()=>{
 assert.deepEqual(constrainSourceRange(clip,6),{...clip,duration:4});
 assert.deepEqual(constrainSourceRange({...clip,kind:'image'},6),{...clip,kind:'image'});
 assert.equal(constrainSourceRange({...clip,sourceStart:100},6).sourceStart,5.9);
 assert.equal(sourceRangeValid(clip,6),false);
 assert.equal(sourceRangeValid({...clip,duration:4},6),true);
 assert.equal(sourceRangeValid(clip,Infinity),false);
 assert.deepEqual(clip,{kind:'video',sourceStart:2,duration:5});
});
test('capture waits for a sought frame and cleans up on cancellation and decoder failure',async()=>{
 const el=new EventTarget();Object.assign(el,{readyState:1,seeking:true,currentTime:0,pause(){this.paused=true;}});
 let ready=false;const promise=prepareMediaFrame(el,2).then(()=>ready=true);
 await Promise.resolve();assert.equal(ready,false);assert.equal(el.currentTime,2);
 el.seeking=false;el.readyState=2;el.dispatchEvent(new Event('seeked'));await promise;assert.equal(ready,true);
 const controller=new AbortController();el.seeking=true;
 const aborted=prepareMediaFrame(el,3,{signal:controller.signal});controller.abort();await assert.rejects(aborted,/cancelada/);
 el.error={code:3};await assert.rejects(prepareMediaFrame(el,4),/decodificar/);
});
