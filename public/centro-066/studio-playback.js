// Source bounds apply to motion/sound; still images and titles remain extensible.
import {insertTrack} from './studio-tracks.js';
export function extractVideoAudio(workspace,id,trackState={},newId=()=>crypto.randomUUID()){
 if(workspace.clips.length>=120)throw new Error('Máximo de 120 clips por montaje.');
 const video=workspace.clips.find(c=>c.id===id);
 if(video?.kind!=='video')throw new Error('Selecciona un clip de video para extraer su audio.');
 if(trackState[video.track]?.locked)throw new Error('Desbloquea la pista de video antes de extraer audio.');
 if(workspace.clips.some(c=>c.kind==='audio'&&c.extractedFrom===id))throw new Error('El audio de este clip ya está en una pista independiente.');
 let tracks=[...workspace.tracks],track=tracks.find(t=>t.startsWith('A')&&!trackState[t]?.locked&&!workspace.clips.some(c=>c.track===t&&c.start<video.start+video.duration&&c.start+c.duration>video.start));
 if(!track){const added=insertTrack(tracks,'audio');tracks=added.tracks;track=added.id;}
 const audio={id:newId(),assetId:video.assetId,kind:'audio',track,start:video.start,duration:video.duration,sourceStart:video.sourceStart||0,volume:video.volume??1,audioFadeIn:video.audioFadeIn||0,audioFadeOut:video.audioFadeOut||0,extractedFrom:id};
 return {...workspace,tracks,clips:[...workspace.clips.map(c=>c.id===id?{...c,volume:0}:c),audio]};
}
export function constrainSourceRange(clip,sourceDuration){
 if(!['audio','video'].includes(clip.kind)||!Number.isFinite(sourceDuration)||sourceDuration<.1)return {...clip};
 const sourceStart=Math.min(Math.max(0,Number(clip.sourceStart)||0),sourceDuration-.1);
 return {...clip,sourceStart,duration:Math.min(clip.duration,sourceDuration-sourceStart)};
}
export function sourceRangeValid(clip,sourceDuration){
 return Number.isFinite(sourceDuration)&&sourceDuration>0&&Number.isFinite(clip.duration)&&
  Number.isFinite(clip.sourceStart??0)&&(clip.sourceStart??0)>=0&&clip.duration>=.1&&
  (clip.sourceStart??0)+clip.duration<=sourceDuration+.025;
}
// A paused video must finish decoding its requested frame before capture begins.
export function prepareMediaFrame(element,time,{signal,timeout=8000}={}){
 return new Promise((resolve,reject)=>{
  let timer;
  const cleanup=()=>{clearTimeout(timer);for(const event of ['seeked','loadeddata','error'])element.removeEventListener(event,check);signal?.removeEventListener('abort',abort);};
  const fail=message=>{cleanup();reject(new Error(message));};
  const abort=()=>fail('Exportación cancelada.');
  const check=()=>{if(element.error){fail('No se pudo decodificar el medio original.');return;}if(!element.seeking&&element.readyState>=2){cleanup();resolve();}};
  if(signal?.aborted){abort();return;}
  for(const event of ['seeked','loadeddata','error'])element.addEventListener(event,check);
  signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>fail('El medio no terminó de preparar su fotograma. Vuelve a intentarlo.'),timeout);
  try{element.pause();if(Math.abs(element.currentTime-time)>.001)element.currentTime=time;check();}catch(error){cleanup();reject(error);}
 });
}
