import test from 'node:test';import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
import {mediaDB} from '../public/centro-066/studio-media.js';import {studioWorkbenchView} from '../public/centro-066/studio-workbench.js';
test('changing output settings while video metadata loads preserves the pending insertion',async()=>{
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://studio-test.invalid',pretendToBeVisual:true});
 const keys=['window','document','indexedDB','IDBKeyRange','localStorage'],old=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));let clean,db;
 try{
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,indexedDB,IDBKeyRange,localStorage:dom.window.localStorage});Object.defineProperty(dom.window,'indexedDB',{value:indexedDB});
  dom.window.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},save(){},restore(){},drawImage(){},strokeText(){},fillText(){}});
  dom.window.HTMLMediaElement.prototype.pause=function(){};dom.window.HTMLMediaElement.prototype.play=async function(){};dom.window.HTMLMediaElement.prototype.load=function(){};
  const media=[],create=dom.window.document.createElement.bind(dom.window.document);dom.window.document.createElement=(tag,...args)=>{const el=create(tag,...args);if(tag==='video'){Object.defineProperty(el,'readyState',{get:()=>el.dataset.loaded?'1':0});Object.defineProperty(el,'duration',{get:()=>el.dataset.loaded&&el.getAttribute('src')?6:NaN});media.push(el);}return el;};
  db=await mediaDB();await new Promise((resolve,reject)=>{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({id:'pending-video-test',name:'pending.webm',kind:'video',mime:'video/webm',size:16,blob:new Blob([new Uint8Array(16)])});tx.oncomplete=resolve;tx.onerror=reject;});
  const root=dom.window.document.querySelector('#root'),messages=[];clean=studioWorkbenchView(root,m=>messages.push(m));
  for(let i=0;i<100&&!root.querySelector('[data-add-asset]');i++)await new Promise(r=>setTimeout(r,10));root.querySelector('[data-add-asset]').click();
  for(let i=0;i<100&&!media.length;i++)await new Promise(r=>setTimeout(r,10));const pending=media[0];assert.ok(pending.getAttribute('src'));
  const quality=root.querySelector('#studiowb-quality');quality.value='1080p';quality.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  const format=root.querySelector('#studiowb-format');format.value='mp4';format.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,20));
  assert.ok(pending.getAttribute('src'),'A UI refresh must not release a video whose metadata is still loading');pending.dataset.loaded='1';pending.dispatchEvent(new dom.window.Event('loadedmetadata'));
  for(let i=0;i<100&&!root.querySelector('[data-select-clip]');i++)await new Promise(r=>setTimeout(r,10));assert.equal(root.querySelectorAll('.wb-timeline [data-select-clip]').length,1);assert.equal(root.querySelector('#studiowb-quality').value,'1080p');assert.ok(!messages.some(m=>m.includes('no puede leer')));
  let redundantSeeks=0;Object.defineProperty(pending,'currentTime',{get:()=>0,set:()=>{redundantSeeks++;}});root.querySelector('#studiowb-play').click();await new Promise(r=>setTimeout(r,30));assert.equal(redundantSeeks,0,'Starting playback at the prepared frame must not restart its decoder');
 }finally{clean?.();db?.close();dom.window.close();for(const key of keys)if(old[key]===undefined)delete globalThis[key];else globalThis[key]=old[key];}
});
