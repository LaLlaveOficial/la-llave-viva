import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {FREE_VIDEO_PROVIDERS} from '../public/centro-066/studio-hf-client.js';
import {createServer} from 'node:http';
const base='http://127.0.0.1:4175',space=FREE_VIDEO_PROVIDERS.ltx.origin;
const server=createServer((req,res)=>{try{const path=new URL(req.url,base).pathname;if(!path.startsWith('/public/centro-066/')||path.includes('..')){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/javascript');res.end(readFileSync('.'+path));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(4175,'127.0.0.1',resolve));
const token='hf_'+'a'.repeat(30),headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
mkdirSync('/tmp/studio066-browser',{recursive:true});
execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=576x1024:rate=24','-t','3','-c:v','libx264','-pix_fmt','yuv420p','-y','/tmp/studio066-browser/hf-fixture.mp4']);
const browser=await chromium.launch({...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1360,height:900}});const calls=[];
 await page.route(base+'/tests/hf-panel-harness',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; img-src \'self\' blob: data:; media-src \'self\' blob:; connect-src \'self\' https://huggingface.co '+space+'"><div id="root"></div>'}));
 await page.route('https://huggingface.co/**',route=>route.fulfill({headers,contentType:'application/json',body:JSON.stringify({type:'user',isPro:false,orgs:[],name:'test-user'})}));
 await page.route(space+'/**',async route=>{
  const req=route.request();const path=new URL(req.url()).pathname;
  if(req.method()==='OPTIONS')return route.fulfill({headers,body:''});
  calls.push(path);
  if(path.endsWith('/upload'))return route.fulfill({headers,contentType:'application/json',body:JSON.stringify(['/tmp/gradio/ref.png'])});
  if(path==='/config')return route.fulfill({headers,contentType:'application/json',body:JSON.stringify({components:FREE_VIDEO_PROVIDERS.ltx.inputs.map((type,id)=>({type,id})),dependencies:[{id:0,api_name:'generate_video',inputs:FREE_VIDEO_PROVIDERS.ltx.inputs.map((_,id)=>id)}]})});
  if(path.endsWith('/queue/join'))return route.fulfill({headers,contentType:'application/json',body:'{"event_id":"fixture"}'});
  if(path.endsWith('/queue/data'))return route.fulfill({headers,contentType:'text/event-stream',body:'data: '+JSON.stringify({msg:'process_completed',success:true,output:{data:[{url:space+'/gradio_api/file=/tmp/gradio/fixture.mp4'},42]}})+'\n\n'});
  if(path.startsWith('/gradio_api/file='))return route.fulfill({headers,contentType:'video/mp4',body:readFileSync('/tmp/studio066-browser/hf-fixture.mp4')});
  throw new Error('Unexpected endpoint: '+path);
 });
 await page.goto(base+'/tests/hf-panel-harness');
 await page.evaluate(async()=>{const {studioGenerationView}=await import('/public/centro-066/studio-generation.js');window.timelineOpened=false;window.dispose=studioGenerationView(document.querySelector('#root'),()=>{},{id:7788},()=>{window.timelineOpened=true;});});
 await page.locator('#hf-token').waitFor({state:'attached'});await page.locator('.hf-panel summary').first().click();
 await page.locator('#hf-token').fill(token);await page.locator('#hf-connect').click();
 try{await page.getByText('Conectado: test-user · cuenta gratuita.').waitFor({timeout:5000});}catch(e){console.log('CONNECT STATUS',await page.locator('#hf-status').textContent());throw e;}
 assert.equal(await page.locator('#hf-token').inputValue(),'');
 await page.locator('#hf-image').setInputFiles({name:'ref.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')});
 await page.locator('#hf-prompt').fill('Slow camera movement.');await page.locator('#hf-generate').click();
 await page.getByText(/MP4 guardado/).waitFor({timeout:20000});
 assert.match(await page.locator('#hf-status').textContent(),/576 × 1024 · 3.00 s/);
 assert.ok(await page.locator('#hf-download').isVisible());
 await page.locator('#hf-timeline').click();assert.equal(await page.evaluate(()=>window.timelineOpened),true);
 const workspace=await page.evaluate(()=>JSON.parse(localStorage.getItem('llave-studio066-workspace-v1:7788')));
 assert.equal(workspace.clips.length,1);assert.equal(workspace.clips[0].duration,3);
 assert.equal(await page.evaluate(t=>JSON.stringify({...localStorage}).includes(t),token),false);
 assert.equal(await page.locator('#hf-provider').inputValue(),'ltx');
 assert.equal(calls.filter(p=>p.endsWith('/queue/join')).length,1);
 await page.evaluate(()=>window.dispose());
 console.log('PASS: Chrome connects, clears token, decodes MP4, saves media and adds clip to timeline. Provider is simulated.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
