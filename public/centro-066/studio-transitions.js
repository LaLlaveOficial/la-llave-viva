// Non-destructive transitions across actual overlapping source material.
const kinds={video:['image','video'],audio:['audio','video']};
export const transitionKey=channel=>channel+'Transition';
export function transitionWindow(clips,incoming,channel,transition=incoming?.[transitionKey(channel)]){
 if(!incoming||!kinds[channel]?.includes(incoming.kind)||!transition||!Number.isFinite(transition.duration)||transition.duration<=0)return null;
 const outgoing=clips.find(c=>c.id===transition.fromId);
 if(!outgoing||outgoing.id===incoming.id||outgoing.track!==incoming.track||!kinds[channel].includes(outgoing.kind)||outgoing.start>=incoming.start)return null;
 const overlap=Math.min(outgoing.start+outgoing.duration,incoming.start+incoming.duration)-incoming.start;
 if(overlap<.1)return null;
 // Ambiguous three-way overlaps must never turn into an arbitrary dissolve.
 if(clips.some(c=>c.id!==outgoing.id&&c.id!==incoming.id&&c.track===incoming.track&&kinds[channel].includes(c.kind)&&c.start<incoming.start+overlap&&c.start+c.duration>incoming.start))return null;
 return {incoming,outgoing,start:incoming.start,overlap,duration:Math.min(transition.duration,overlap,10)};
}
export function createTransition(clips,id,channel,duration=1){
 const incoming=clips.find(c=>c.id===id);
 if(!incoming||!kinds[channel]?.includes(incoming.kind))throw new Error('Selecciona un clip de '+(channel==='video'?'video o imagen':'audio o video')+'.');
 const candidates=clips.filter(c=>c.id!==id&&c.track===incoming.track&&c.start<incoming.start&&c.start+c.duration>incoming.start&&kinds[channel].includes(c.kind)).sort((a,b)=>b.start-a.start);
 const outgoing=candidates[0];
 const transition={fromId:outgoing?.id,duration};
 const window=transitionWindow(clips,incoming,channel,transition);
 if(!window)throw new Error('Solapa dos clips de la misma pista y selecciona el segundo. La transición necesita al menos 0,1 s de material compartido.');
 return {fromId:outgoing.id,duration:window.duration};
}
export function sanitizeTransitions(clips){
 return clips.map(c=>{const next={...c};for(const channel of ['video','audio']){
  const key=transitionKey(channel),window=transitionWindow(clips,c,channel);
  if(window)next[key]={fromId:window.outgoing.id,duration:window.duration};else delete next[key];
 }return next;});
}
export function transitionProgress(window,time){return Math.max(0,Math.min(1,(time-window.start)/window.duration));}
export function audioTransitionGain(clips,clip,time,windows=null){
 let gain=1;
 for(const window of windows||clips.map(c=>transitionWindow(clips,c,'audio'))){
  const incoming=window?.incoming;
  if(!window||time<window.start||time>=window.start+window.overlap)continue;
  const p=transitionProgress(window,time);
  if(clip.id===incoming.id)gain*=Math.sin(p*Math.PI/2);
  else if(clip.id===window.outgoing.id)gain*=Math.cos(p*Math.PI/2);
 }
 return gain;
}
