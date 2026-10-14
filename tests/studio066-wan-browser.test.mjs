import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
const temporary=mkdtempSync(join(tmpdir(),'studio066-wan-browser-'));
const fixture=join(temporary,'native.mp4');
execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=black:s=704x1280:r=24','-frames:v','73','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',fixture]);
const video=readFileSync(fixture).toString('base64');
const metadata={width:704,height:1280,fps:24,duration:73/24,audio:false};
const id='12345678-1234-4234-9234-123456789abc';
const server=createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><div id="root"></div>');}
 const path=new URL(req.url,'http://localhost').pathname;
 if(!path.startsWith('/public/centro-066/')){res.writeHead(404);return res.end();}
 const file=resolve('.'+path),directory=resolve('public/centro-066');
 if(!file.startsWith(directory+'/')){res.writeHead(404);return res.end();}
 try{res.setHeader('Content-Type','text/javascript');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 async function setup({ready=true,canSubmit=true,stored=false,unknown=false}={}){
  const page=await browser.newPage();let submissions=0;
  await page.route(origin+'/api/console-066?**',async route=>{
   const op=new URL(route.request().url()).searchParams.get('op');
   let body;
   if(op==='studio-wan-capabilities')body={ready,canSubmit,canCheck:ready,estimatedCostUsd:1,message:ready?'GPU habilitada':'Endpoint pendiente'};
   if(op==='studio-wan-submit'){submissions++;body={job:{id:JSON.parse(route.request().postData()).id,status:'IN_QUEUE'}};}
   if(op==='studio-wan-status')body=unknown?{job:{id,status:'UNKNOWN'}}:{job:{id,status:'COMPLETED'},output:{video_base64:video,metadata}};
   assert.ok(body,'Unexpected API request');await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(origin);
  await page.evaluate(async({stored,id})=>{
   if(stored)localStorage.setItem('studio066-wan-job:1',id);
   else localStorage.clear();
   const {mountNativeWanPanel}=await import('/public/centro-066/studio-wan-panel.js');
   const {mediaDB,addMedia,addTimelineClip,listMedia}=await import('/public/centro-066/studio-media.js');
   const db=await mediaDB();window.imported=[];window.clips=[];window.assets=await listMedia(db);
   window.options={projectId:1,onFindAsset:id=>window.assets.find(x=>x.id===id),
    onResult:async file=>{const asset=await addMedia(db,file);window.imported.push(asset);window.assets.push(asset);return asset;},
    onTimeline:(asset,info)=>{window.clipInfo=info;window.clips.push(addTimelineClip({...asset,duration:info.duration},window.clips));}};
   window.dispose=mountNativeWanPanel(document.getElementById('root'),window.options);
  },{stored,id});
  await page.locator('summary').click();
  return {page,count:()=>submissions};
 }
 const disabled=await setup({ready:false,canSubmit:false});
 await disabled.page.waitForFunction(()=>document.querySelector('[data-status]').textContent==='Endpoint pendiente');
 assert.equal(await disabled.page.locator('[data-generate]').isDisabled(),true);
 assert.equal(disabled.count(),0);await disabled.page.close();

 const running=await setup();
 await running.page.locator('[data-generate]').waitFor({state:'visible'});
 await running.page.waitForFunction(()=>!document.querySelector('[data-generate]').disabled);
 await running.page.locator('[data-image]').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1sAAAAASUVORK5CYII=','base64')});
 await running.page.locator('[data-prompt]').fill('Two women run along a wet street.');
 await running.page.locator('[data-approve]').check();
 await running.page.locator('[data-generate]').click();
 await running.page.waitForFunction(()=>window.imported.length===1);
 assert.equal(running.count(),1);
 const imported=await running.page.evaluate(()=>window.imported[0]);
 assert.equal(imported.kind,'video');assert.equal(imported.mime,'video/mp4');
 await running.page.locator('[data-timeline]').click();
 assert.equal(await running.page.evaluate(()=>window.clips.length),1);
 const clipInfo=await running.page.evaluate(()=>window.clipInfo);
 assert.equal(clipInfo.width,704);assert.equal(clipInfo.height,1280);assert.ok(Math.abs(clipInfo.duration-73/24)<.1);
 await running.page.evaluate(()=>{window.dispose();window.dispose=undefined;});
 await running.page.evaluate(async()=>{const {mountNativeWanPanel}=await import('/public/centro-066/studio-wan-panel.js');window.dispose=mountNativeWanPanel(document.getElementById('root'),window.options);});
 await running.page.waitForFunction(()=>!document.querySelector('[data-timeline]').disabled);
 assert.equal(await running.page.evaluate(()=>window.imported.length),1,'Recovering a result must not duplicate library media');
 assert.equal(running.count(),1);await running.page.close();

 const blocked=await setup({stored:true,unknown:true});
 await blocked.page.waitForFunction(()=>document.querySelector('[data-status]').textContent.includes('Envío sin confirmar'));
 assert.equal(await blocked.page.locator('[data-generate]').isDisabled(),true);
 assert.equal(await blocked.page.getByRole('button',{name:'Nueva prueba',exact:true}).isDisabled(),true);
 assert.equal(blocked.count(),0);await blocked.page.close();

 const renewed=await setup({stored:true});
 await renewed.page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(x=>x.textContent==='Nueva prueba').disabled);
 await renewed.page.getByRole('button',{name:'Nueva prueba',exact:true}).click();
 assert.equal(await renewed.page.locator('[data-generate]').isDisabled(),false);
 assert.equal(await renewed.page.locator('[data-approve]').isChecked(),false);
 assert.equal(renewed.count(),0);await renewed.page.close();
 console.log('WAN_BROWSER_PASS: disabled endpoint, single submission, actual MP4 import, timeline insertion, recovery without duplicates, UNKNOWN lock, next-test reset. Provider responses are mocked; no GPU job ran.');
}finally{await browser?.close();await new Promise(r=>server.close(r));rmSync(temporary,{recursive:true,force:true});}
