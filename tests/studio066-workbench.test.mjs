import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWorkspace,parseWorkspace,timelineDuration,addTimelineClip} from '../public/centro-066/studio-media.js';
import {studioWorkbenchView} from '../public/centro-066/studio-workbench.js';

const base={id:'test-id',assetId:'asset-1',kind:'video',track:'V1',start:0,duration:5,sourceStart:0,prompt:'tracking shot'};
test('timeline accepts valid edited project and restores safe defaults',()=>{
 const w={...defaultWorkspace(),quality:'1080p',aspect:'16:9',clips:[base]};
 const p=parseWorkspace(w);assert.ok(p);assert.equal(p.quality,'1080p');assert.equal(timelineDuration(p.clips),5);
 assert.equal(parseWorkspace({...w,aspect:'100:1'}),null);
 assert.equal(parseWorkspace({...w,fps:300}),null);
});
test('timeline rejects malformed clips, wrong tracks and oversized prompts',()=>{
 const w={...defaultWorkspace(),clips:[base]};
 for(const item of [{...base,start:-1},{...base,duration:0},{...base,start:599,duration:4},{...base,kind:'audio',track:'V1'},{...base,kind:'text',track:'A1'},{...base,assetId:''},{...base,prompt:'x'.repeat(3001)}]){
  assert.equal(parseWorkspace({...w,clips:[item]}),null);
 }
 assert.equal(parseWorkspace({...w,clips:Array(121).fill(base)}),null);
});
test('timeline adds media to the correct tracks sequentially',()=>{
 const video={id:'video-1',name:'Fotograma',kind:'image'};
 const audio={id:'audio-1',name:'Voz',kind:'audio'};
 const first=addTimelineClip(video,[]),second=addTimelineClip(video,[first]);
 assert.equal(first.track,'V1');assert.equal(first.duration,5);assert.equal(second.start,5);
 const sound=addTimelineClip(audio,[first,second]);assert.equal(sound.track,'A1');assert.equal(sound.start,0);
});
test('editor mounts local library, timeline, inspector and export in jsdom',async()=>{
 const {JSDOM}=await import('jsdom');
 const {indexedDB,IDBKeyRange}=await import('fake-indexeddb');
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://example.com',pretendToBeVisual:true});
 const old={window:globalThis.window,document:globalThis.document,indexedDB:globalThis.indexedDB,localStorage:globalThis.localStorage,IDBKeyRange:globalThis.IDBKeyRange};
 try{
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.indexedDB=indexedDB;globalThis.IDBKeyRange=IDBKeyRange;globalThis.localStorage=dom.window.localStorage;
  Object.defineProperty(dom.window,'indexedDB',{value:indexedDB,configurable:true});
  dom.window.HTMLCanvasElement.prototype.getContext=function(){return {fillStyle:'',fillRect(){},save(){},restore(){},drawImage(){},strokeText(){},fillText(){}};};
  const root=dom.window.document.querySelector('#root');
  const clean=studioWorkbenchView(root,()=>{});
  await new Promise(resolve=>setTimeout(resolve,150));
  assert.match(root.textContent,/Estudio de montaje 066/);
  assert.ok(root.querySelector('#studiowb-upload'));
  assert.ok(root.querySelector('#studiowb-canvas'));
  assert.ok(root.querySelector('#studiowb-export'));
  assert.equal(root.querySelectorAll('.wb-track').length,4);
  root.querySelector('#studiowb-title').click();
  assert.equal(root.querySelectorAll('[data-select-clip]').length,1);
  assert.ok(root.querySelector('[data-property="prompt"]'));
  assert.ok(root.querySelector('[data-property="start"]'));
  clean();
 }finally{
  for(const [k,v] of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
  dom.window.close();
 }
});
