import {chromium} from 'playwright';
import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
let page;const errors=[];fs.mkdirSync('/tmp/studio066-browser',{recursive:true});
try{
 page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4173/tests/studio066-browser-harness.html',{waitUntil:'networkidle'});
 await page.locator('.wb-root[data-ready=true]').waitFor();
 const pngs=await page.evaluate(()=>['#ff0000','#0000ff'].map(color=>{const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,32,32);return c.toDataURL('image/png').split(',')[1];}));
 const wav=hz=>{const b=Buffer.alloc(44+44100*2*5);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(88200,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);for(let i=0;i<44100*5;i++)b.writeInt16LE(Math.round(8000*Math.sin(i*2*Math.PI*hz/44100)),44+i*2);return b;};
 await page.locator('#studiowb-upload').setInputFiles([
  {name:'red.png',mimeType:'image/png',buffer:Buffer.from(pngs[0],'base64')},
  {name:'blue.png',mimeType:'image/png',buffer:Buffer.from(pngs[1],'base64')},
  {name:'tone440.wav',mimeType:'audio/wav',buffer:wav(440)},
  {name:'tone880.wav',mimeType:'audio/wav',buffer:wav(880)}
 ]);
 await page.waitForFunction(()=>document.querySelectorAll('[data-drag-asset]').length===4);
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('llave-studio066-workspace-v1:scratch')));
 const add=async(name,count)=>{await page.locator('[data-drag-asset]').filter({hasText:name}).locator('[data-add-asset]').click();await page.waitForFunction(n=>document.querySelectorAll('.wb-timeline [data-select-clip]').length===n,count);};
 const property=async(key,value)=>{await page.locator('[data-property="'+key+'"]').fill(String(value));await page.locator('[data-property="'+key+'"]').press('Tab');await page.waitForFunction(({key,value})=>Number(document.querySelector('[data-property="'+key+'"]')?.value)===value,{key,value});await page.evaluate(()=>new Promise(requestAnimationFrame));};
 const seek=async value=>{await page.locator('#studiowb-seek').evaluate((el,t)=>{el.value=String(t);el.dispatchEvent(new Event('input',{bubbles:true}));},value);};
 const pixel=()=>page.locator('#studiowb-canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data));
 await add('red.png',1);await add('blue.png',2);
 await page.locator('.wb-timeline').focus();await page.keyboard.press('t');
 assert.equal((await state()).clips.some(c=>c.videoTransition),false,'Touching clips do not silently change sequence timing');
 await property('start',3);
 await page.locator('.wb-timeline').focus();await page.keyboard.press('t');
 await page.locator('[data-property=videoTransition]').waitFor();await property('videoTransition',2);
 assert.equal(await page.locator('.wb-transition-video').count(),1);
 const marker=await page.locator('.wb-transition-video').boundingBox();assert.ok(marker.width>140,'Transition region shows its real duration on timeline');
 await seek(3);assert.deepEqual((await pixel()).slice(0,3),[255,0,0]);
 await seek(4);const mixed=await pixel();assert.ok(Math.abs(mixed[0]-128)<=2&&Math.abs(mixed[2]-128)<=2&&mixed[1]===0,'Dissolve blends both images with no dip to black: '+mixed);
 await seek(5);assert.deepEqual((await pixel()).slice(0,3),[0,0,255]);
 await page.locator('#studiowb-undo').click();assert.equal((await state()).clips.find(c=>c.videoTransition).videoTransition.duration,1);
 await page.locator('#studiowb-redo').click();assert.equal((await state()).clips.find(c=>c.videoTransition).videoTransition.duration,2);
 await page.locator('.wb-transition-video').click();await page.locator('[data-track-flag="V1:locked"]').click();
 await property('videoTransition',.5);assert.equal((await state()).clips.find(c=>c.videoTransition).videoTransition.duration,2,'Locked transition cannot be edited');
 await page.locator('[data-track-flag="V1:locked"]').click();
 const outgoing=(await state()).clips.find(c=>c.videoTransition).videoTransition.fromId;
 await page.locator('[data-select-clip="'+outgoing+'"] .wb-clip-inner').click();await page.locator('#studiowb-delete').click();
 assert.equal(await page.locator('.wb-transition-video').count(),0,'Removing source prunes its transition');
 await page.locator('#studiowb-undo').click();assert.equal(await page.locator('.wb-transition-video').count(),1,'Undo recovers both source and transition');
 await page.reload({waitUntil:'networkidle'});await page.locator('.wb-root[data-ready=true]').waitFor();
 await page.locator('.wb-transition-video').click();assert.equal(Number(await page.locator('[data-property=videoTransition]').inputValue()),2,'Transition persists on reload');
 await add('tone440.wav',3);await add('tone880.wav',4);await property('start',3);
 await page.locator('.wb-timeline').focus();await page.keyboard.press('Shift+T');
 await page.locator('[data-property=audioTransition]').waitFor();await property('audioTransition',2);
 assert.equal(await page.locator('.wb-transition-audio').count(),1);
 await seek(4);await page.locator('.wb-transition-video').click();
 await page.screenshot({path:'/tmp/studio066-browser/transitions.png',fullPage:true});
 await page.locator('#studiowb-top-export').click();await page.locator('#studiowb-cancel-export').waitFor();
 assert.ok(await page.locator('[data-add-transition=video]').isDisabled(),'Editing is frozen during export');
 await page.locator('#studiowb-cancel-export').click();await page.locator('#studiowb-cancel-export').waitFor({state:'detached'});
 assert.ok(await page.locator('[data-add-transition=video]').isEnabled(),'Cancel restores editing');
 assert.equal((await state()).playhead,4,'Cancel restores and saves previous playhead');
 const downloadPromise=page.waitForEvent('download',{timeout:30000});await page.locator('#studiowb-top-export').click();
 const download=await downloadPromise,path='/tmp/studio066-browser/transitions.webm';await download.saveAs(path);
 const streams=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type,width,height','-of','json',path],{encoding:'utf8'})).streams;
 assert.ok(streams.some(s=>s.codec_type==='audio'),'Export includes the real mixed audio track');
 assert.ok(streams.some(s=>s.codec_type==='video'&&s.width===720&&s.height===1280));
 const frame=execFileSync('ffmpeg',['-v','error','-ss','4','-i',path,'-frames:v','1','-vf','scale=1:1','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);
 assert.ok(frame[0]>90&&frame[0]<165&&frame[2]>90&&frame[2]<165&&frame[1]<15,'Encoded midpoint keeps the purple dissolve, actual='+[...frame]);
 const spectrum=at=>{const pcm=execFileSync('ffmpeg',['-v','error','-i',path,'-ss',String(at),'-t','0.1','-f','f32le','-ac','1','-ar','48000','pipe:1']);const n=pcm.length/4;return [440,880].map(hz=>{let re=0,im=0;for(let i=0;i<n;i++){const sample=pcm.readFloatLE(i*4),phase=2*Math.PI*hz*i/48000;re+=sample*Math.cos(phase);im+=sample*Math.sin(phase);}return 2*Math.hypot(re,im)/n;});};
 const before=spectrum(.5),middle=spectrum(4),after=spectrum(6);
 assert.ok(before[0]>.1&&before[1]<.02,'Outgoing tone starts alone: '+before);
 assert.ok(middle[0]>.07&&middle[1]>.07,'Both source tones are actually encoded during crossfade: '+middle);
 assert.ok(after[1]>.1&&after[0]<.02,'Incoming tone remains alone: '+after);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'TRANSITIONS_BROWSER_EXPORT_PASS',previewPixel:mixed,encodedPixel:[...frame],audio:{before,middle,after},bytes:fs.statSync(path).size}));
}catch(e){console.error(e.stack||e);if(page){await page.screenshot({path:'/tmp/studio066-browser/transitions-failed.png',fullPage:true}).catch(()=>{});console.error(JSON.stringify({errors,messages:await page.evaluate(()=>window.__studioHarness?.messages).catch(()=>[])}));}process.exitCode=1;}
finally{await browser.close();}
