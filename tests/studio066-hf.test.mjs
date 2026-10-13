import test from 'node:test';
import assert from 'node:assert/strict';
import {WanFreeClient,WAN_SPACE} from '../public/centro-066/studio-hf-client.js';
import {mountWanPanel} from '../public/centro-066/studio-hf-panel.js';
const token='hf_'+ 'a'.repeat(30);
const account={type:'user',isPro:false,orgs:[],name:'test-user'};
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const image=new File(['reference'],'reference.jpg',{type:'image/jpeg'});
const request={image,prompt:'Slow camera push forward',duration:3};
const sse=events=>new Response(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''));
function setup(lastEvent,outputURL=WAN_SPACE+'/gradio_api/file=/tmp/gradio/test.mp4'){
 const calls=[];
 const client=new WanFreeClient(async(url,opts)=>{
  calls.push({url,opts});
  if(url.endsWith('/whoami-v2'))return json(account);
  if(url.endsWith('/upload'))return json(['/tmp/gradio/reference.jpg']);
  if(url.endsWith('/config'))return json({dependencies:[{id:7,api_name:'generate_video'}]});
  if(url.endsWith('/queue/join'))return json({event_id:'test-event'});
  if(url.includes('/queue/data?'))return sse([{msg:'process_starts'},lastEvent||{msg:'process_completed',success:true,output:{data:[{url:outputURL},42]}}]);
  if(url===outputURL)return new Response(new Uint8Array([0,0,0,20,102,116,121,112]));
  throw new Error('Unexpected destination');
 });
 return {client,calls};
}
test('successful run sends credentials only to the pinned Hub and Space and downloads MP4',async()=>{
 const {client,calls}=setup();await client.connect(token);
 const result=await client.generate(request);
 assert.equal(result.type,'video/mp4');assert.equal(result.size,8);
 assert.equal(calls.length,6);
 for(const c of calls){assert.equal(c.opts.headers.Authorization,'Bearer '+token);assert.equal(c.opts.credentials,'omit');assert.equal(c.opts.redirect,'error');assert.ok(['https://huggingface.co',WAN_SPACE].includes(new URL(c.url).origin));}
 const queued=JSON.parse(calls.find(c=>c.url.endsWith('/queue/join')).opts.body);
 assert.equal(queued.fn_index,7);assert.equal(queued.data[2],4);
 assert.ok(!calls.some(c=>String(c.opts.body).includes(token)));
 client.disconnect();assert.equal(client.connected,false);
});
test('accounts with paid or unknown eligibility cannot become connected',async()=>{
 for(const a of [{...account,isPro:true},{...account,orgs:[{name:'team'}]},{type:'user',orgs:[]}]){
  const client=new WanFreeClient(async()=>json(a));
  await assert.rejects(client.connect(token),/personal gratuita/);assert.equal(client.connected,false);
 }
});
test('quota failure is surfaced and is never automatically retried',async()=>{
 const {client,calls}=setup({msg:'process_completed',success:false,output:{error:'ZeroGPU quota exceeded'}});
 await client.connect(token);await assert.rejects(client.generate(request),/cuota gratuita/);
 assert.equal(calls.filter(c=>c.url.endsWith('/queue/join')).length,1);
 assert.equal(calls.length,5);
});
test('provider cannot redirect downloads and expose the credential to another origin',async()=>{
 const {client,calls}=setup(null,'https://attacker.example/clip.mp4');
 await client.connect(token);await assert.rejects(client.generate(request),/Destino del video/);
 assert.equal(calls.length,5);
});
test('invalid references and durations fail before uploading',async()=>{
 const {client,calls}=setup();await client.connect(token);
 await assert.rejects(client.generate({...request,duration:20}),/parámetros/);
 await assert.rejects(client.generate({...request,image:new File(['x'],'x.svg',{type:'image/svg+xml'})}),/imagen/);
 assert.equal(calls.length,1);
});
test('panel clears the token field and never writes credentials to browser storage',async()=>{
 const {JSDOM}=await import('jsdom');const dom=new JSDOM('<div id="panel"></div>',{url:'https://studio.example'});
 const prev=globalThis.document;globalThis.document=dom.window.document;
 let received;const client={connected:false,async connect(value){received=value;this.connected=true;return {name:'test-user'};},disconnect(){this.connected=false;}};
 const root=document.querySelector('#panel');const dispose=mountWanPanel(root,{client,onResult:async()=>{},onTimeline:()=>{}});
 try{
  root.querySelector('#hf-token').value=token;root.querySelector('#hf-connect').click();
  await new Promise(r=>setTimeout(r,0));
  assert.equal(received,token);assert.equal(root.querySelector('#hf-token').value,'');
  assert.equal(dom.window.localStorage.length,0);assert.equal(dom.window.sessionStorage.length,0);
  assert.ok(!root.textContent.includes(token));
  root.querySelector('#hf-disconnect').click();assert.equal(client.connected,false);
 }finally{dispose();globalThis.document=prev;dom.window.close();}
});
