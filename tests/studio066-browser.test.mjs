import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Yl1QLIAAAAASUVORK5CYII=';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const errors=[];
let page;
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page=await context.newPage();
 page.on('pageerror',error=>errors.push('JS: '+(error.stack||error.message)));
 page.on('console',msg=>{if(msg.type()==='error')errors.push('Console: '+msg.text());});
 page.on('requestfailed',req=>errors.push('Failed request: '+req.url()+' '+req.failure()?.errorText));
 page.on('response',resp=>{if(resp.status()>=400)errors.push('HTTP '+resp.status()+' '+resp.url());});
 await page.goto('http://127.0.0.1:4173/tests/studio066-browser-harness.html',{waitUntil:'networkidle'});
 await page.locator('#studiowb-upload').waitFor({timeout:15000}).catch(async error=>{
 const diagnostics=await page.evaluate(()=>({url:location.href,head:document.documentElement.outerHTML.slice(0,1100),scripts:[...document.scripts].map(x=>x.src||x.textContent?.slice(0,130))}));
 console.error('Browser loader diagnostics:',JSON.stringify({diagnostics,errors}));
 throw error;
 });
 await page.locator('#studiowb-upload').setInputFiles({name:'real-image.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.locator('[data-add-asset]').first().waitFor({timeout:10000});
 await page.locator('[data-add-asset]').first().click();
 await page.locator('.wb-timeline [data-select-clip]').first().waitFor({timeout:10000});
 const clips=page.locator('.wb-timeline [data-select-clip]');
 assert.equal(await clips.count(),1,'Image appears in timeline');
 const originalDuration=Number(await page.locator('[data-property=duration]').inputValue());
 assert.equal(originalDuration,5);
 const handle=page.locator('.wb-timeline [data-select-clip] .wb-trim-right').first();
 await handle.scrollIntoViewIfNeeded();
 const edge=await handle.boundingBox();
 const trimCss=await handle.evaluate(el=>({
  width:getComputedStyle(el).width,height:getComputedStyle(el).height,
  display:getComputedStyle(el).display,cursor:getComputedStyle(el).cursor,
  parent:el.closest('[data-select-clip]')?.className,
  sheets:[...document.styleSheets].map(sheet=>({href:sheet.href,rules:(()=>{try{return sheet.cssRules.length}catch{return 'blocked'}})()})),
  rect:{width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}
 }));
 console.log('TRIM_CSS_DIAGNOSTICS',JSON.stringify({edge,trimCss}));
 assert.ok(edge?.width>=14&&edge?.height>=35,'Trim handle has usable hit target');
 await page.mouse.move(edge.x+edge.width/2,edge.y+edge.height/2);
 await page.mouse.down();
 await page.mouse.move(edge.x+edge.width/2+120,edge.y+edge.height/2,{steps:12});
 const during=await page.locator('[data-select-clip]').first().getAttribute('style');
 await page.mouse.up();
 const resized=Number(await page.locator('[data-property=duration]').inputValue());
 assert.ok(resized>originalDuration+0.5,'Pointer trim must expand actual image clip, got '+resized);
 await page.locator('#studiowb-undo').click();
 await page.locator('[data-select-clip]').first().waitFor();
 const restored=await page.locator('[data-select-clip]').first().getAttribute('style');
 assert.ok(restored!==during,'Undo restores original visual clip length');
 await page.locator('#studiowb-select-tool').click();
 const body=page.locator('.wb-timeline [data-select-clip] .wb-clip-inner').first();
 await body.scrollIntoViewIfNeeded();
 const bb=await body.boundingBox();
 const sx=bb.x+Math.min(50,bb.width/2);
 await page.mouse.move(sx,bb.y+bb.height/2);
 await page.mouse.down();await page.mouse.move(sx+130,bb.y+bb.height/2,{steps:12});await page.mouse.up();
 const moved=Number(await page.locator('[data-property=start]').inputValue());
 assert.ok(moved>0.5,'Drag of image body must move clip, got '+moved);
 const movedPosition=await page.locator('.wb-timeline [data-select-clip].selected').evaluate(el=>{
  const r=el.getBoundingClientRect(),lane=el.parentElement.getBoundingClientRect();
  return {relativePx:r.left-lane.left,laneWidth:lane.width,left:el.style.left};
 });
 assert.ok(movedPosition.relativePx>25,'Dragged clip must actually move visually, not just in the inspector: '+JSON.stringify(movedPosition));
 await page.locator('#studiowb-blade-tool').click();
 const bladeCursor=await page.locator('.wb-timeline [data-select-clip]').first().evaluate(el=>getComputedStyle(el).cursor);
 assert.ok(bladeCursor.includes('data:image/svg+xml'),'Blade mode must show the scissor cursor, got '+bladeCursor);
 const rulerGrid=await page.locator('.wb-timeline').evaluate(el=>({span:Number(el.dataset.rulerSpan),step:Number(el.dataset.rulerStep),grid:parseFloat(getComputedStyle(el).getPropertyValue('--wb-grid-step')),lane:parseFloat(getComputedStyle(el).getPropertyValue('--wb-lane-min'))}));
 assert.ok(Math.abs(rulerGrid.grid-rulerGrid.lane*rulerGrid.step/rulerGrid.span)<1,'Ruler labels and track grid must share one time scale: '+JSON.stringify(rulerGrid));
 let block=page.locator('.wb-timeline [data-select-clip]').first();
 await block.scrollIntoViewIfNeeded();
 const cb=await block.boundingBox();
 await page.mouse.click(cb.x+60,cb.y+cb.height/2);
 const count=await page.locator('.wb-timeline [data-select-clip]').count();
 assert.equal(count,2,'Blade should split image under real pointer: got '+count);
 assert.equal(await page.locator('.wb-cut-seam').count(),1,'A real cut must remain visibly marked at the joining clip edge');
 const cutJoin=await page.locator('.wb-timeline [data-select-clip]').evaluateAll(nodes=>Math.abs(nodes[0].getBoundingClientRect().right-nodes[1].getBoundingClientRect().left));
 assert.ok(cutJoin<3,'Split parts must touch at the exact visible cut, gap='+cutJoin);
 // Regression from user's screenshots: inspector says 17.63s but thumbnail
 // stays at the old timeline origin, then razor rejects a visibly valid cut.
 await page.locator('#studiowb-select-tool').click();
 await page.locator('.wb-timeline [data-select-clip]').first().click();
 await page.locator('[data-property=start]').fill('17.63');
 await page.locator('[data-property=start]').dispatchEvent('change');
 await page.locator('[data-property=duration]').fill('20.67');
 await page.locator('[data-property=duration]').dispatchEvent('change');
 // The inspector commits on the next animation frame; wait for the rendered
 // block geometry to catch up before measuring the relocated clip.
 await page.waitForFunction(()=>{
  const clip=document.querySelector('.wb-timeline [data-select-clip].selected');
  const start=Number(document.querySelector('[data-property=start]')?.value);
  const duration=Number(document.querySelector('[data-property=duration]')?.value);
  const lane=clip?.parentElement;
  if(!clip||!lane||lane.getBoundingClientRect().width<100||!Number.isFinite(start)||!Number.isFinite(duration))return false;
  const expectedSpan=start+duration+2;
  const left=parseFloat(clip.style.left)/100,width=parseFloat(clip.style.width)/100;
  return Math.abs(left-start/expectedSpan)<.025&&Math.abs(width-duration/expectedSpan)<.025;
 },null,{timeout:5000});
 const pos=await page.locator('.wb-timeline [data-select-clip].selected').evaluate(el=>{
  const lane=el.parentElement,cr=el.getBoundingClientRect(),lr=lane.getBoundingClientRect();
  return {start:Number(document.querySelector('[data-property=start]').value),duration:Number(document.querySelector('[data-property=duration]').value),
    visualStart:(cr.left-lr.left)/lr.width,styleLeft:el.style.left,visualDuration:cr.width/lr.width,
    laneWidth:lr.width,elWidth:cr.width,rootScroll:document.querySelector('.wb-timeline').scrollLeft};
 });
 console.log('USER_MOVE_SCENARIO',JSON.stringify(pos));
 const viewBeforeCut=await page.locator('.wb-timeline').evaluate(el=>({left:el.scrollLeft,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth}));
 console.log('USER_MOVE_VIEW',JSON.stringify(viewBeforeCut));
 assert.ok(viewBeforeCut.left>0,'Timeline auto-scroll follows selected clip after a distant move');
 assert.ok(Math.abs(pos.visualStart-pos.start/(pos.start+pos.duration+2))<.025,'DOM clip position must agree with inspector: '+JSON.stringify(pos));
 assert.ok(Math.abs(pos.visualDuration-pos.duration/(pos.start+pos.duration+2))<.025,'DOM clip width must agree with inspector: '+JSON.stringify(pos));
 const movingBlock=page.locator('.wb-timeline [data-select-clip].selected');
 await movingBlock.scrollIntoViewIfNeeded();
 const scrollBeforeBlade=await page.locator('.wb-timeline').evaluate(el=>el.scrollLeft);
 await page.locator('#studiowb-blade-tool').click();
 const scrollAfterBlade=await page.locator('.wb-timeline').evaluate(el=>el.scrollLeft);
 assert.ok(Math.abs(scrollAfterBlade-scrollBeforeBlade)<2,'Selecting razor must not reset horizontally scrolled timeline');
 const afterRect=await page.locator('.wb-timeline [data-select-clip].selected').boundingBox();
 await page.mouse.click(afterRect.x+Math.min(afterRect.width/2,90),afterRect.y+afterRect.height/2);
 assert.equal(await page.locator('.wb-timeline [data-select-clip]').count(),3,'Blade must split relocated long clip at visible click');
 assert.equal(await page.locator('.wb-cut-seam').count(),1,'The relocated split must show its cut seam; the separated original piece is no longer joined');
 const movedCutJoin=await page.locator('.wb-timeline [data-select-clip]').evaluateAll(nodes=>Math.abs(nodes[nodes.length-2].getBoundingClientRect().right-nodes[nodes.length-1].getBoundingClientRect().left));
 assert.ok(movedCutJoin<3,'Relocated split parts must meet at the exact visible cut, gap='+movedCutJoin);
 // Mobile viewport must keep the library/editor/inspector connected, not stack
 // unusable panes or lose an imported original after switching views.
 const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const mobile=await mobileContext.newPage();
 mobile.on('pageerror',err=>errors.push('Mobile: '+err.message));
 await mobile.goto('http://127.0.0.1:4173/tests/studio066-browser-harness.html',{waitUntil:'networkidle'});
 await mobile.locator('#studiowb-upload').waitFor({state:'attached'});
 await mobile.locator('#studiowb-upload').setInputFiles({name:'mobile-image.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await mobile.locator('[data-mobile-pane="media"]').click();
 const mobileGeometry=await mobile.locator('[data-add-asset]').first().evaluate(el=>{
   const parent=el.closest('.wb-media-list'),rect=el.getBoundingClientRect();
   return {pane:document.querySelector('.wb-root')?.dataset.mobilePane,display:getComputedStyle(el).display,
     library:getComputedStyle(el.closest('.wb-library')).display,
     cardHeight:rect.height,cardY:rect.y,mediaHeight:parent?.getBoundingClientRect().height,
     workareaHeight:document.querySelector('.wb-workarea')?.getBoundingClientRect().height};
 });
 console.log('MOBILE_LAYOUT_DIAGNOSTICS',JSON.stringify(mobileGeometry));
 assert.ok(mobileGeometry.mediaHeight>=100,'Mobile library needs actual scroll space, not a clipped 8px strip');
 await mobile.locator('[data-add-asset]').first().click();
 assert.equal(await mobile.locator('.wb-timeline [data-select-clip]').count(),1,'Mobile user can add a real asset to timeline');
 await mobile.locator('[data-mobile-pane="inspector"]').click();
 assert.equal(await mobile.locator('[data-property=duration]').count(),1,'Mobile inspector edits same selected clip');
 await mobile.locator('[data-mobile-pane="timeline"]').click();
 assert.equal(await mobile.locator('.wb-timeline [data-select-clip]').count(),1,'Mobile pane switching preserves clips');
 await mobileContext.close();
 if(errors.length)throw new Error('Uncaught JS errors: '+errors.join(' | '));
 console.log(JSON.stringify({result:'BROWSER_EDITOR_PASS',imageImported:true,originalDuration,resized,moved,bladeClips:count,handleWidth:edge.width,mobileSmoke:true}));
}catch(error){
 fs.mkdirSync('/tmp/studio066-browser',{recursive:true});
 if(page)await page.screenshot({path:'/tmp/studio066-browser/failed.png',fullPage:true}).catch(()=>{});
 console.error('BROWSER_EDITOR_FAIL',error?.stack||error);
 if(page){const e=await page.evaluate(()=>({messages:window.__studioHarness?.messages,lastHTML:document.querySelector('#studio-mount')?.textContent?.slice(0,600)})).catch(()=>null);console.error(JSON.stringify(e));}
 process.exitCode=1;
}finally{await browser.close();}
