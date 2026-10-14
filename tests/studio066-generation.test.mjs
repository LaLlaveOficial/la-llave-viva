import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGeneration,newGenerationDraft,parseGenerationHistory,makeGenerationRecord,buildFlowPrompt} from '../public/centro-066/studio-generation.js';
import {studioGenerationView} from '../public/centro-066/studio-generation.js';

const assets=[
{id:'image-1',name:'Paula',kind:'image'},
{id:'image-2',name:'Rosa',kind:'image'},
{id:'image-3',name:'Lluvia',kind:'image'},
{id:'clip-1',name:'Clip',kind:'video'}
];
const draft=(rest={})=>({...newGenerationDraft(),title:'Escape del callejón',prompt:'Nighttime tracking shot',refs:[{assetId:'image-1',role:'start'}],...rest});
test('frame workflows require ordered opening and ending reference',()=>{
 assert.ok(validateGeneration(draft(),assets).value);
 assert.ok(validateGeneration(draft({refs:[{assetId:'image-1',role:'start'},{assetId:'image-2',role:'end'}]}),assets).value);
 assert.match(validateGeneration(draft({refs:[]}),assets).error,/uno o dos/);
 assert.ok(validateGeneration(draft({refs:[{assetId:'image-1',role:'end'}]}),assets).error);
 assert.ok(validateGeneration(draft({refs:[{assetId:'image-1',role:'start'},{assetId:'image-1',role:'end'}]}),assets).error);
 assert.ok(validateGeneration(draft({refs:[{assetId:'clip-1',role:'start'}]}),assets).error);
});
test('image workflows allow up to three meaningful references',()=>{
 assert.ok(validateGeneration(draft({mode:'images',refs:[{assetId:'image-1',role:'character'},{assetId:'image-2',role:'wardrobe'},{assetId:'image-3',role:'environment'}]}),assets).value);
 assert.ok(validateGeneration(draft({mode:'images',refs:[{assetId:'image-1',role:'start'}]}),assets).error);
 assert.ok(validateGeneration(draft({mode:'images',refs:[{assetId:'image-1',role:'style'},{assetId:'image-2',role:'style'},{assetId:'image-3',role:'style'},{assetId:'image-2',role:'style'}]}),assets).error);
});
test('provider settings are validated without pretending an engine exists',()=>{
 assert.ok(validateGeneration(draft({resolution:'4k',fps:60,variants:4,seed:'472360',audio:true}),assets).value);
 assert.ok(validateGeneration(draft({model:'auto-free-magic'}),assets).error);
 assert.ok(validateGeneration(draft({variants:5}),assets).error);
 assert.ok(validateGeneration(draft({seed:'not-an-integer'}),assets).error);
 assert.ok(validateGeneration(draft({seed:'4294967296'}),assets).error);
 assert.ok(validateGeneration(draft({prompt:'   '}),assets).error);
});
test('history does not fabricate a rendered state or accept malformed entries',()=>{
 const prepared=makeGenerationRecord('record-1',validateGeneration(draft(),assets).value);
 assert.equal(prepared.status,'prepared');assert.deepEqual(prepared.results,[]);
 assert.equal(parseGenerationHistory([prepared,{id:'bad',results:[null],status:'imported'}]).length,1);
});
test('generator DOM has reference slots, preview, disabled real generation and a working preparation save',async()=>{
 const {JSDOM}=await import('jsdom');
 const {indexedDB,IDBKeyRange}=await import('fake-indexeddb');
 const dom=new JSDOM('<!doctype html><div id="app"></div>',{url:'https://studio.example',pretendToBeVisual:true});
 const previous={window:globalThis.window,document:globalThis.document,indexedDB:globalThis.indexedDB,IDBKeyRange:globalThis.IDBKeyRange,localStorage:globalThis.localStorage,FormData:globalThis.FormData};
 const originalURL=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
 let clean;
 try{
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.indexedDB=indexedDB;globalThis.IDBKeyRange=IDBKeyRange;
  globalThis.localStorage=dom.window.localStorage;globalThis.FormData=dom.window.FormData;
  Object.defineProperty(dom.window,'indexedDB',{value:indexedDB,configurable:true});
  URL.createObjectURL=()=> 'blob:studio-066-test';URL.revokeObjectURL=()=>{};
  const root=dom.window.document.querySelector('#app');clean=studioGenerationView(root,()=>{},{id:300,name:'Caso 066'},()=>{});
  await new Promise(r=>setTimeout(r,100));
  assert.match(root.textContent,/Generar medios/);
  assert.equal(root.querySelectorAll('[data-ref-asset]').length,2);
  assert.ok(root.querySelector('.gen-mobile-dock'));
  assert.ok(root.querySelector('.gen-media-bin'));
  root.querySelector('button[data-gen-mobile-tab="history"]').click();
  assert.equal(root.querySelector('.gen-workspace').dataset.genMobilePane,'history');
  root.querySelector('button[data-gen-mobile-tab="preview"]').click();
  assert.equal(root.querySelector('.gen-workspace').dataset.genMobilePane,'preview');
  root.querySelector('button[data-gen-mobile-tab="configure"]').click();
  assert.equal(root.querySelector('.gen-workspace').dataset.genMobilePane,'configure');
  assert.ok(root.querySelector('button[disabled]'),'Real generation must remain disabled');
  assert.ok(root.querySelector('#gen-upload-result').disabled,'Cannot import a result until request saved');
  const radio=root.querySelector('input[name=mode][value=images]');
  radio.checked=true;radio.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.equal(root.querySelectorAll('[data-ref-asset]').length,3);
  const title=root.querySelector('[name=title]');title.value='Paula escaping';title.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal(root.querySelector('[name=title]').value,'Paula escaping');
 }finally{
  clean?.();URL.createObjectURL=originalURL;URL.revokeObjectURL=originalRevoke;
  for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  dom.window.close();
 }
});

test('Flow uses one sample and copies explicit continuity and constraints',()=>{
 const r=newGenerationDraft();assert.equal(r.variants,1);assert.equal(r.model,'veo');assert.equal(r.duration,4);
 assert.equal(buildFlowPrompt({...r,prompt:' Slow push-in. ',continuity:' Same wet clothing. ',negative:' No logos. '}),'Slow push-in.\n\nContinuity: Same wet clothing.\n\nAvoid: No logos.');
});
test('imported duration survives local and remote metadata validation',async()=>{
 const {validateGenerationMetadata}=await import('../lib/studio-generation-server.js');
 const request=validateGeneration(draft({duration:4,variants:1,refs:[{assetId:'11111111-1111-4111-8111-111111111111',role:'start'}]}),[{id:'11111111-1111-4111-8111-111111111111',kind:'image'}]).value;
 const record={...makeGenerationRecord('22222222-2222-4222-8222-222222222222',request),results:[{assetId:'33333333-3333-4333-8333-333333333333',duration:8}]};
 assert.equal(parseGenerationHistory([record])[0].results[0].duration,8);
 const input={...record,action:'create',projectId:1};assert.equal(validateGenerationMetadata(input).results[0].duration,8);
 assert.equal(validateGenerationMetadata({...input,results:[{...record.results[0],duration:Infinity}]}),null);
});
