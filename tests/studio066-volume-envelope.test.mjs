import test from 'node:test';import assert from 'node:assert/strict';
import {moveVolumePoint,volumePointerPoint,volumeEnvelopeView} from '../public/centro-066/studio-volume-envelope.js';
import {animationValue} from '../public/centro-066/studio-keyframes.js';
test('volume points move on frame boundaries, preserve other animation and reject collisions',()=>{
 const clip={kind:'video',duration:4,keyframes:{volume:[{time:0,value:1},{time:2,value:.5}],x:[{time:1,value:.3}]}};
 const rect={left:100,top:100,width:1000,height:120};
 const point=volumePointerPoint(clip,rect,110+980*.75,160,24);assert.deepEqual(point,{time:3,value:1});
 const next=moveVolumePoint(clip,1,point,24);assert.deepEqual(next.x,clip.keyframes.x);assert.deepEqual(next.volume,[{time:0,value:1},{time:3,value:1}]);assert.equal(animationValue({...clip,keyframes:next},'volume',1),1);
 assert.throws(()=>moveVolumePoint(clip,1,{time:0,value:1},24),/existe/);assert.equal(clip.keyframes.volume[1].time,2);
 assert.deepEqual(volumePointerPoint(clip,rect,-100,-100,24),{time:0,value:2});assert.deepEqual(volumePointerPoint(clip,rect,2000,2000,24),{time:4,value:0});
});
test('only audio capable clips expose accessible volume controls',()=>{
 assert.equal(volumeEnvelopeView({kind:'image',duration:4}),'');
 const html=volumeEnvelopeView({kind:'audio',duration:4,keyframes:{volume:[{time:2,value:.5}]}});
 assert.match(html,/role="slider"/);assert.match(html,/aria-valuenow="50"/);assert.match(html,/data-volume-node="0"/);
});
