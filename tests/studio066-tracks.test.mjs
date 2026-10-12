import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWorkspace,parseWorkspace} from '../public/centro-066/studio-media.js';
import {defaultTracks,insertTrack,fadeEnvelope} from '../public/centro-066/studio-tracks.js';
import {clipDragChanged,insertClipAt,splitClipAt} from '../public/centro-066/studio-timeline-tools.js';
const clip={id:'clip',assetId:'original',kind:'image',track:'V1',start:2,duration:8,sourceStart:0};
test('stable video and audio insertions persist through workspace JSON without relabeling clips',()=>{
 const v=insertTrack(defaultTracks(),'image','V1');assert.deepEqual(v.tracks,['V2','V3','V1','A1','A2']);
 const a=insertTrack(v.tracks,'audio','A2');assert.deepEqual(a.tracks,['V2','V3','V1','A1','A3','A2']);
 const moved=insertClipAt({kind:'image'},clip,2,'V3');assert.equal(moved.track,'V3');assert.ok(clipDragChanged(clip,moved));
 const restored=parseWorkspace(JSON.parse(JSON.stringify({...defaultWorkspace(),tracks:a.tracks,clips:[moved]})));
 assert.deepEqual(restored.tracks,a.tracks);assert.equal(restored.clips[0].track,'V3');
 assert.throws(()=>insertClipAt({kind:'audio'},clip,2,'V3'));
});
test('twelve total tracks maximum; malformed backups cannot create incompatible tracks',()=>{
 let tracks=defaultTracks();for(let i=0;i<8;i++)tracks=insertTrack(tracks,i%2?'audio':'video').tracks;
 assert.equal(tracks.length,12);assert.throws(()=>insertTrack(tracks,'audio'),/12/);
 for(const invalid of [[...tracks,'A12'],['V1','V2','V2','A1','A2'],['V1','A1','V2','A2']])assert.equal(parseWorkspace({...defaultWorkspace(),tracks:invalid}),null);
 assert.equal(parseWorkspace({...defaultWorkspace(),clips:[{...clip,track:'V3'}]}),null);
 const legacy={...defaultWorkspace(),clips:[clip]};delete legacy.tracks;assert.deepEqual(parseWorkspace(legacy).tracks,defaultTracks());
});
test('separate video/audio envelopes reach silence/black at edges and restore full output',()=>{
 const c={...clip,videoFadeIn:2,videoFadeOut:2,audioFadeIn:1,audioFadeOut:1};
 assert.equal(fadeEnvelope(c,2),0);assert.equal(fadeEnvelope(c,3),.5);assert.equal(fadeEnvelope(c,6),1);assert.equal(fadeEnvelope(c,9),.5);
 assert.equal(fadeEnvelope(c,2.5,'audio'),.5);assert.equal(fadeEnvelope(c,3,'audio'),1);assert.equal(fadeEnvelope(c,10,'audio'),0);
 const parts=splitClipAt([c],'clip',6,()=> 'second');assert.equal(parts[0].videoFadeOut,0);assert.equal(parts[1].videoFadeIn,0);
});
