// Studio 066 timeline editing primitives; no side effects or remote calls.
const tracks={image:['V1','V2'],video:['V1','V2'],audio:['A1','A2'],text:['V2']};
const round=t=>Math.round(t*100)/100;
export function insertClipAt(asset,clip,start,track){
 if(!asset||!clip||!tracks[asset.kind]?.includes(track)||!Number.isFinite(start)||start<0)throw new Error('Pista o posición incompatible.');
 const duration=Number(clip.duration);
 if(!Number.isFinite(duration)||duration<.1||start+duration>600)throw new Error('El clip supera la línea de tiempo.');
 return {...clip,start:round(start),track};
}
export function splitClipAt(clips,id,at,idGenerator=()=>crypto.randomUUID()){
 const clip=clips?.find(x=>x.id===id);
 if(!clip||!Number.isFinite(at))return null;
 const offset=round(at-clip.start);
 if(offset<.1||clip.duration-offset<.1)return null;
 const first={...clip,duration:round(offset)};
 const second={...clip,id:idGenerator(),start:round(clip.start+offset),duration:round(clip.duration-offset),sourceStart:round((clip.sourceStart||0)+offset)};
 return [...clips.filter(x=>x.id!==id),first,second];
}
export function snapToEdges(time,clips,ignoreId,{enabled=true,tolerance=.18}={}){
 if(!enabled||!Number.isFinite(time))return time;
 const edges=[0];
 for(const clip of clips||[]){
  if(clip.id===ignoreId)continue;
  edges.push(clip.start,clip.start+clip.duration);
 }
 const nearest=edges.reduce((acc,x)=>Math.abs(x-time)<Math.abs(acc-time)?x:acc,edges[0]);
 return Math.abs(nearest-time)<=tolerance?round(nearest):round(time);
}
export function trackPosition(clientX,left,width,duration){
 if(!Number.isFinite(width)||width<=0)return 0;
 return round(Math.max(0,Math.min(600,((clientX-left)/width)*duration)));
}

// Blade interaction: translate the real pointer into a frame-aligned cut.
// The ruler and track content share the same coordinate system.
export function pointerCutTime(clientX,left,width,seconds,fps=24){
 if(![clientX,left,width,seconds,fps].every(Number.isFinite)||width<=0||seconds<=0||fps<1||fps>120)return 0;
 const time=Math.min(seconds,Math.max(0,(clientX-left)/width*seconds));
 return Math.round(time*fps)/fps;
}

/**
 * Pure timeline drag math. The gesture is only committed after a successful
 * pointerup, so cancelling never damages the saved timeline or undo history.
 * Use the same time-scale for every track and zoom level.
 */
export function previewClipDrag(clip,mode,delta,{fps=24,clips=[],snapping=true}={}){
 if(!clip||!['move','trim-left','trim-right'].includes(mode)||!Number.isFinite(delta))return null;
 if(!Number.isInteger(fps)||fps<1||fps>120)return null;
 const deltaFrame=Math.round(delta*fps)/fps;
 const maxLength=Math.min(120,600-clip.start);
 const duration=clip.duration;
 if(mode==='trim-right'){
  const result={...clip,duration:round(Math.max(.1,Math.min(maxLength,duration+deltaFrame)))};
  return result;
 }
 if(mode==='trim-left'){
  const minDelta=Math.max(-clip.start,-Math.max(0,Number(clip.sourceStart)||0));
  // Still images have no finite source length: they may extend left to timeline zero.
  const earliest=clip.kind==='image'||clip.kind==='text'?-clip.start:minDelta;
  const applied=Math.max(earliest,Math.min(duration-.1,deltaFrame));
  return {...clip,start:round(clip.start+applied),duration:round(duration-applied),
    sourceStart:round(Math.max(0,(clip.sourceStart||0)+applied))};
 }
 const position=Math.min(600-duration,Math.max(0,clip.start+deltaFrame));
 return {...clip,start:snapToEdges(position,clips,clip.id,{enabled:snapping})};
}
export function clipDragChanged(before,after){
 return Boolean(before&&after&&(before.start!==after.start||before.duration!==after.duration||before.sourceStart!==after.sourceStart));
}

/**
 * A razor click is defined by its location WITHIN the visible clip.
 * Using the whole-track bounding box caused user-visible cuts to be rejected
 * after timeline zoom, clipping and horizontal scrolling.
 */
export function pointerCutWithinClip(clientX,blockLeft,blockWidth,clip,fps=24){
 if(!clip||![clientX,blockLeft,blockWidth,clip.start,clip.duration,fps].every(Number.isFinite)||
    blockWidth<=0||clip.duration<=0||fps<1||fps>120)return NaN;
 const ratio=Math.max(0,Math.min(1,(clientX-blockLeft)/blockWidth));
 return Math.round((clip.start+ratio*clip.duration)*fps)/fps;
}
/** Scroll distance for selected clip at a comfortable point of the viewport. */
export function revealClipScroll(startPx,viewportWidth,scrollWidth,oldScroll,{sidebarWidth=115,anchor=.32}={}){
 if(![startPx,viewportWidth,scrollWidth,oldScroll].every(Number.isFinite)||viewportWidth<=0)return 0;
 const left=Math.max(0,oldScroll),right=left+Math.max(0,viewportWidth-sidebarWidth);
 const wants=startPx<left+sidebarWidth+25||startPx>right-120;
 const desired=wants?startPx-viewportWidth*anchor:left;
 return Math.min(Math.max(0,scrollWidth-viewportWidth),Math.max(0,desired));
}
