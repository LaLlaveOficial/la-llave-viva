import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPeaks,timelineSpan,mediaTimecode,trackIsEditable,trackIsAudible,trackIsVisible} from '../public/centro-066/studio-timeline-visuals.js';
test('waveforms reflect actual PCM peaks',()=>{const p=extractPeaks(new Float32Array([0,.5,-1,.1,0,0,.25,-.7]),4);assert.deepEqual([...p].map(x=>+x.toFixed(2)),[.5,1,0,.7]);assert.throws(()=>extractPeaks(new Float32Array(1),1024),/Invalid/);});
test('timeline span is stable and zoom has room',()=>{assert.equal(timelineSpan([{start:0,duration:5}]),24);assert.equal(timelineSpan([{start:50,duration:10}]),62);});
test('frame timecode uses fps',()=>{assert.equal(mediaTimecode(5.5,24),'00:00:05:12');assert.equal(mediaTimecode(65,30),'00:01:05:00');});
test('track flags independently gate controls',()=>{const state={V1:{locked:true,hidden:false},A1:{muted:true}};assert.equal(trackIsEditable(state,'V1'),false);assert.equal(trackIsVisible(state,'V1'),true);assert.equal(trackIsAudible(state,'A1'),false);assert.equal(trackIsEditable(state,'V2'),true);});
