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
  // Critical DOM contract: the toolbar, library, monitor, inspector and timeline
  // must all be descendants of the same root for responsive CSS/tool cursors.
  const sceneRoot=root.querySelector('.wb-root');
  for(const sel of ['.wb-settings','.wb-workarea','.wb-library','.wb-stage','.wb-inspector','.wb-timeline-panel','.wb-mobile-dock']){
   assert.ok(sceneRoot.contains(root.querySelector(sel)),'Workspace root must own '+sel);
  }
  assert.ok(root.querySelector('#studiowb-upload'));
  assert.ok(root.querySelector('#studiowb-canvas'));
  assert.ok(root.querySelector('#studiowb-export'));
  assert.ok(root.querySelector('#studiowb-top-export'));
  assert.ok(root.querySelector('.wb-file-menu summary'));
  assert.ok(root.querySelector('#studiowb-portable-export'));
  assert.ok(root.querySelector('#studiowb-blade-tool'));
  assert.ok(root.querySelector('#studiowb-split'));
  assert.ok(root.querySelector('#studiowb-zoom'));
  assert.ok(root.querySelector('#studiowb-local-trash'));
  assert.ok(root.querySelector('#studiowb-snap'));
  assert.ok(root.querySelector('#studiowb-toolbar-duplicate'));
  assert.ok(root.querySelector('#studiowb-toolbar-remove'));
  assert.equal(root.querySelectorAll('[data-track-flag]').length,8);
  assert.ok(root.querySelector('#studiowb-ruler-cursor'));
  const beforeWidth=Number(root.querySelector('.wb-timeline').dataset.rulerWidth);
  root.querySelector('#studiowb-zoom').value='2';
  root.querySelector('#studiowb-zoom').dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.ok(Number(root.querySelector('.wb-timeline').dataset.rulerWidth)>beforeWidth);
  root.querySelector('[data-track-flag="A1:muted"]').click();
  assert.equal(root.querySelector('[data-track-flag="A1:muted"]').getAttribute('aria-pressed'),'true');
  root.querySelector('[data-track-flag="V2:locked"]').click();
  assert.equal(root.querySelector('[data-track-flag="V2:locked"]').getAttribute('aria-pressed'),'true');
  root.querySelector('[data-track-flag="V2:locked"]').click();
  assert.ok(root.querySelector('[data-bin-switch="cloud"]'));
  assert.ok(root.querySelector('[data-bin-switch="text"]'));
  assert.ok(root.querySelector('#studiowb-source-frame'));
  assert.equal(root.querySelector('#studiowb-source-pane').hidden,true,'Empty source preview never overlaps the media list');
  assert.ok(root.querySelector('#studiowb-source-add'));
  assert.ok(root.querySelector('#studiowb-media-search'));
  assert.ok(root.querySelector('.wb-timeline-panel'));
  assert.ok(root.querySelector('[data-mobile-pane="timeline"]'));
  assert.ok(root.querySelector('.wb-monitor-bar'));
  root.querySelector('[data-bin-switch="text"]').click();
  assert.equal(root.querySelector('.wb-root').dataset.bin,'text');
  root.querySelector('[data-mobile-pane="inspector"]').click();
  assert.equal(root.querySelector('.wb-root').dataset.mobilePane,'inspector');
  root.querySelector('[data-bin-switch="media"]').click();
  assert.equal(root.querySelectorAll('.wb-track').length,4);
  root.querySelector('#studiowb-title').click();
  assert.equal(root.querySelectorAll('[data-select-clip]').length,1);
  assert.ok(root.querySelector('[data-property="prompt"]'));
  assert.ok(root.querySelector('[data-property="start"]'));
  root.querySelector('[data-inspector-tab="color"]').click();
  assert.equal(root.querySelector('.wb-inspector').dataset.inspectorTab,'color');
  assert.ok(root.querySelector('[data-property="brightness"]'));
  root.querySelector('[data-inspector-tab="prompt"]').click();
  // Real pointer blade: 1s cut in a 4s title, with the prior playhead elsewhere.
  assert.equal(root.querySelector('.wb-edit-toolbar').parentElement.className,'wb-timeline-panel');
  assert.equal(root.querySelectorAll('[data-select-clip]').length,1);
  root.querySelector('#studiowb-blade-tool').click();
  assert.equal(root.querySelector('.wb-root').dataset.editorTool,'blade');
  assert.equal(root.querySelector('#studiowb-blade-tool').getAttribute('aria-pressed'),'true');
  const block=root.querySelector('[data-select-clip]'),lane=block.closest('[data-timeline-seek]');
  lane.getBoundingClientRect=()=>({left:0,width:960,right:960,top:0,bottom:70,height:70});
  block.getBoundingClientRect=()=>({left:0,width:320,right:320,top:0,bottom:70,height:70});
  block.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,clientX:80,detail:1}));
  assert.equal(root.querySelectorAll('[data-select-clip]').length,2,'blade cuts under pointer, not at stale playhead');
  assert.match(root.querySelector('#studiowb-time').textContent,/00:00:01:00/);
  root.querySelector('#studiowb-undo').click();
  assert.equal(root.querySelectorAll('[data-select-clip]').length,1,'cuts are undoable');
  root.querySelector('.wb-timeline').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'v',bubbles:true}));
  assert.equal(root.querySelector('.wb-root').dataset.editorTool,'select','V returns selection cursor');
  root.querySelector('.wb-timeline').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'c',bubbles:true}));
  assert.equal(root.querySelector('.wb-root').dataset.editorTool,'blade','C activates blade cursor');

  // Full pointer gesture, not just a synthetic button click: end trim must expand.
  root.querySelector('#studiowb-select-tool').click();
  const resizeBlock=()=>root.querySelector('[data-select-clip]');
  const bindRect=()=>resizeBlock().closest('[data-timeline-seek]').getBoundingClientRect=()=>({left:0,width:1920,right:1920,top:0,bottom:70,height:70});
  const fire=(el,type,x)=>el.dispatchEvent(new dom.window.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x}));
  bindRect();
  resizeBlock().click();
  const beforeTrim=Number(root.querySelector('[data-property="duration"]').value);
  fire(resizeBlock().querySelector('.wb-trim-right'),'pointerdown',640);
  fire(dom.window,'pointermove',960);
  assert.equal(Number(resizeBlock().dataset.previewDuration),beforeTrim+2,'resize publishes a visible preview while dragging');
  fire(dom.window,'pointerup',960);
  assert.equal(Number(root.querySelector('[data-property="duration"]').value),beforeTrim+2,'right handle expands duration by 2s');
  root.querySelector('#studiowb-undo').click();
  assert.match(resizeBlock().title,/CASO/);
  assert.equal(Number(root.querySelector('[data-property="duration"]').value),beforeTrim,'undo restores clip duration');
  bindRect();
  fire(resizeBlock().querySelector('.wb-trim-right'),'pointerdown',640);
  fire(dom.window,'pointermove',720);
  fire(dom.window,'pointercancel',720);
  assert.equal(resizeBlock().dataset.previewDuration,undefined,'pointercancel must clear partial preview without saving');

  // Moving a clip is a different action from trimming it.
  bindRect();
  fire(resizeBlock().querySelector('.wb-clip-inner'),'pointerdown',160);
  fire(dom.window,'pointermove',480);
  fire(dom.window,'pointerup',320);
  assert.equal(Number(root.querySelector('[data-property="start"]').value),2,'dragging clip body moves it in timeline');
  const lockedBefore=Number(root.querySelector('[data-property="start"]').value);
  root.querySelector('[data-track-flag="V2:locked"]').click();
  bindRect();
  fire(resizeBlock().querySelector('.wb-clip-inner'),'pointerdown',160);
  fire(dom.window,'pointermove',400);
  fire(dom.window,'pointerup',400);
  assert.equal(Number(root.querySelector('[data-property="start"]').value),lockedBefore,'locked track rejects drag');
  clean();
 }finally{
  for(const [k,v] of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
  dom.window.close();
 }
});
