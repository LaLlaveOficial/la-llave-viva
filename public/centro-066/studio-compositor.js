import {fadeEnvelope} from './studio-tracks.js';
import {transitionWindow,transitionProgress} from './studio-transitions.js';
import {trackIsVisible} from './studio-timeline-visuals.js';
import {drawSubtitle} from './studio-subtitles.js';
const bounded=(value,lo,hi)=>Math.max(lo,Math.min(hi,Number(value)||0));
const active=(c,t)=>t>=c.start&&t<c.start+c.duration;
function drawClip(ctx,c,time,w,h,sourceFor,weight=1){
 ctx.save();ctx.globalAlpha=bounded(c.opacity??1,0,1)*fadeEnvelope(c,time)*weight;
 if(c.kind==='text'){
  if(c.textRole==='subtitle'){drawSubtitle(ctx,c,w,h);ctx.restore();return;}
  const size=Math.round(h/18);ctx.font='700 '+size+'px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#000';ctx.shadowBlur=14;ctx.lineWidth=Math.max(3,size/9);ctx.strokeStyle='#000';ctx.fillStyle='#fff';
  (c.text||'TÍTULO').slice(0,180).split('\n').forEach((line,i)=>{const y=h*.78+i*size*1.2;ctx.strokeText(line,w/2,y,w*.9);ctx.fillText(line,w/2,y,w*.9);});
 }else{
  const source=sourceFor(c),sw=source?.videoWidth||source?.naturalWidth,sh=source?.videoHeight||source?.naturalHeight;
  if(sw&&sh){const zoom=bounded(c.scale??1,.25,4)||1,k=Math.max(w/sw,h/sh)*zoom,dw=sw*k,dh=sh*k;
   const x=(w-dw)/2+bounded(c.x??0,-1,1)*w/2,y=(h-dh)/2+bounded(c.y??0,-1,1)*h/2;
   ctx.filter='brightness('+bounded(c.brightness??100,0,200)+'%) contrast('+bounded(c.contrast??100,0,200)+'%) saturate('+bounded(c.saturation??100,0,200)+'%) blur('+bounded(c.blur??0,0,20)+'px)';
   try{ctx.drawImage(source,x,y,dw,dh);}catch{}
  }
 }
 ctx.restore();
}
export function renderVisualFrame({canvas,clips,tracks,trackState,time,sources,surface}){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const w=canvas.width,h=canvas.height;ctx.fillStyle='#101417';ctx.fillRect(0,0,w,h);
 for(const track of [...tracks].reverse()){
  if(!trackIsVisible(trackState,track))continue;
  const lane=clips.filter(c=>c.track===track&&['image','video','text'].includes(c.kind)&&active(c,time)).sort((a,b)=>a.start-b.start);
  const pairs=lane.map(c=>transitionWindow(clips,c,'video')).filter(p=>p&&time>=p.start&&time<p.start+p.overlap);
  for(const c of lane){
   if(pairs.some(p=>p.outgoing.id===c.id))continue;
   const pair=pairs.find(p=>p.incoming.id===c.id);
   if(!pair){drawClip(ctx,c,time,w,h,sources);continue;}
   // Add premultiplied weighted frames on transparent canvas: no dip to black.
   const layer=surface.canvas??=canvas.ownerDocument.createElement('canvas');
   if(layer.width!==w)layer.width=w;if(layer.height!==h)layer.height=h;
   const mix=layer.getContext('2d');mix.clearRect(0,0,w,h);mix.save();mix.globalCompositeOperation='lighter';
   const p=transitionProgress(pair,time);
   drawClip(mix,pair.outgoing,time,w,h,sources,1-p);drawClip(mix,c,time,w,h,sources,p);mix.restore();
   ctx.drawImage(layer,0,0);
  }
 }
}
