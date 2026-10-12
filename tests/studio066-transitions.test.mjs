import test from 'node:test';import assert from 'node:assert/strict';
import {createTransition,transitionWindow,transitionProgress,sanitizeTransitions,audioTransitionGain} from '../public/centro-066/studio-transitions.js';
import {parseWorkspace,defaultWorkspace} from '../public/centro-066/studio-media.js';
const first={id:'one',assetId:'source1',kind:'image',track:'V1',start:0,duration:5};
const second={id:'two',assetId:'source2',kind:'image',track:'V1',start:3,duration:5};
test('video dissolve refers to two real overlapping clips without changing their timeline',()=>{
 const clips=[first,second],effect=createTransition(clips,'two','video',2);assert.deepEqual(effect,{fromId:'one',duration:2});
 const window=transitionWindow(clips,second,'video',effect);assert.equal(transitionProgress(window,3),0);assert.equal(transitionProgress(window,4),.5);assert.equal(transitionProgress(window,5),1);
 assert.equal(second.start,3);assert.equal(first.duration,5);
 assert.throws(()=>createTransition([first,{...second,start:5}],'two','video'),/Solapa/);
 assert.throws(()=>createTransition([first,{...second,track:'V2'}],'two','video'),/Solapa/);
 assert.throws(()=>createTransition([...clips,{...first,id:'third',start:4}],'two','video'),/Solapa/);
});
test('crossfade audio gains preserve energy and cannot affect unrelated tracks',()=>{
 const a={...first,kind:'audio',track:'A1'},b={...second,kind:'audio',track:'A1'};b.audioTransition=createTransition([a,b],'two','audio',2);
 const clips=[a,b];assert.equal(audioTransitionGain(clips,a,3),1);assert.equal(audioTransitionGain(clips,b,3),0);
 for(const time of [3,3.5,4,4.5]){const out=audioTransitionGain(clips,a,time),into=audioTransitionGain(clips,b,time);assert.ok(Math.abs(out*out+into*into-1)<1e-10);}
 assert.equal(audioTransitionGain(clips,{...a,id:'other',track:'A2'},4),1);
});
test('backups keep valid transitions; edits and missing references prune effects without losing clips',()=>{
 const b={...second,videoTransition:{fromId:'one',duration:20}};
 const restored=parseWorkspace({...defaultWorkspace(),clips:[first,b]});assert.equal(restored.clips[1].videoTransition.duration,2);
 assert.equal(sanitizeTransitions([{...first,track:'V2'},b])[1].videoTransition,undefined);
 assert.equal(sanitizeTransitions([b])[0].videoTransition,undefined);
 assert.equal(sanitizeTransitions([first,{...b,videoTransition:{fromId:'one',duration:NaN}}])[1].videoTransition,undefined);
 assert.equal(restored.clips.length,2);
});
