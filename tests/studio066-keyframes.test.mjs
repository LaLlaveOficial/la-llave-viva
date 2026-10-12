import test from 'node:test';import assert from 'node:assert/strict';
import {animationValue,normalizeKeyframes,sampleAnimation,putKeyframe,removeKeyframe,sliceAnimation} from '../public/centro-066/studio-keyframes.js';
import {splitClipAt,previewClipDrag} from '../public/centro-066/studio-timeline-tools.js';
import {defaultWorkspace,parseWorkspace} from '../public/centro-066/studio-media.js';
import {extractVideoAudio} from '../public/centro-066/studio-playback.js';
const clip={id:'v',assetId:'original',kind:'video',track:'V1',start:3,duration:4,sourceStart:1,opacity:1,volume:1,keyframes:{x:[{time:0,value:-1},{time:4,value:1}],scale:[{time:0,value:1},{time:4,value:2}],opacity:[{time:0,value:.2},{time:4,value:1}],volume:[{time:0,value:0},{time:4,value:1}]}};
test('linear curves use clip-local time, hold endpoints and round edits to project frames',()=>{
 assert.equal(animationValue(clip,'x',2),0);assert.equal(animationValue(clip,'x',-1),-1);assert.equal(animationValue(clip,'x',8),1);
 assert.equal(sampleAnimation(clip,5).volume,.5);assert.ok(Math.abs(sampleAnimation({...clip,start:10},12).opacity-.6)<1e-12);
 const curves=putKeyframe(clip,'x',1.12,.3,24);assert.equal(curves.x[1].time,1.125);
 assert.equal(removeKeyframe({...clip,keyframes:curves},1.12,24).x.length,2);assert.equal(clip.keyframes.x.length,2);
 assert.throws(()=>putKeyframe(clip,'x',5,0),/dentro/);assert.throws(()=>putKeyframe(clip,'scale',1,9),/inválido/);
 assert.throws(()=>removeKeyframe(clip,-1),/dentro/);
});
test('split and trim preserve continuity and moving a clip retains local animation',()=>{
 const parts=splitClipAt([clip],'v',5,()=> 'second');assert.equal(parts.length,2);
 assert.equal(animationValue(parts[0],'x',2),0);assert.equal(animationValue(parts[1],'x',0),0);assert.equal(animationValue(parts[1],'x',1),.5);
 const trimmed=previewClipDrag(clip,'trim-left',1,{fps:24});assert.equal(trimmed.start,4);assert.equal(trimmed.duration,3);assert.equal(animationValue(trimmed,'x',0),-.5);
 const shortened=previewClipDrag(clip,'trim-right',-1,{fps:24});assert.equal(animationValue(shortened,'x',3),.5);
 const moved=previewClipDrag(clip,'move',7,{fps:24,snapping:false});assert.deepEqual(moved.keyframes,clip.keyframes);assert.equal(sampleAnimation(moved,12).x,0);
 assert.equal(sliceAnimation({...clip,keyframes:{opacity:[{time:2,value:.5}]}},0,1).opacity[0].value,.5);
});
test('restoration rejects malformed curves and extraction transfers animated volume without double sound',()=>{
 const workspace={...defaultWorkspace(),clips:[clip]};assert.ok(parseWorkspace(workspace));
 for(const value of [{x:[{time:-1,value:0}]},{x:[{time:5,value:0}]},{x:[{time:1,value:2}]},{x:[{time:1,value:0},{time:1,value:1}]},{volume:Array(33).fill({time:0,value:1})},{unsafe:[{time:0,value:1}]}])assert.equal(parseWorkspace({...workspace,clips:[{...clip,keyframes:value}]}),null);
 assert.equal(normalizeKeyframes({x:[{time:0,value:0}]},'audio',4),null);
 const result=extractVideoAudio(workspace,'v',{},()=> 'audio');assert.equal(result.clips[0].volume,0);assert.equal(result.clips[0].keyframes.volume,undefined);assert.equal(sampleAnimation(result.clips.at(-1),5).volume,.5);assert.equal(clip.volume,1);
});
