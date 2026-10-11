// Persistent ordered tracks. Stable identifiers survive insertions, backups and undo.
export const defaultTracks=()=>['V2','V1','A1','A2'];
export const validTrack=t=>typeof t==='string'&&/^[VA]([1-9]|1[0-2])$/.test(t);
export const compatibleTrack=(kind,track)=>validTrack(track)&&(kind==='audio'?track[0]==='A':['image','video','text'].includes(kind)&&track[0]==='V');
export function normalizeTracks(value,clips=[]){
 const tracks=value===undefined?defaultTracks():value;
 if(!Array.isArray(tracks)||tracks.length<2||tracks.length>12||new Set(tracks).size!==tracks.length||tracks.some(t=>!validTrack(t)))return null;
 if(!tracks.includes('V1')||!tracks.includes('V2')||!tracks.includes('A1')||!tracks.includes('A2'))return null;
 if(tracks.some((t,i)=>t[0]==='V'&&tracks.slice(0,i).some(x=>x[0]==='A')))return null;
 if(clips.some(c=>!c||!tracks.includes(c.track)))return null;
 return [...tracks];
}
export function insertTrack(tracks,kind,before=null){
 if(tracks.length>=12)throw new Error('Máximo de 12 pistas por proyecto.');
 const prefix=kind==='audio'?'A':'V';
 if(before!==null&&(!tracks.includes(before)||before[0]!==prefix))throw new Error('Pista incompatible.');
 const id=Array.from({length:12},(_,i)=>prefix+(i+1)).find(t=>!tracks.includes(t));
 const index=before===null?(prefix==='V'?tracks.findIndex(t=>t[0]==='A'):tracks.length):tracks.indexOf(before);
 const next=[...tracks];next.splice(index<0?next.length:index,0,id);
 return {tracks:next,id};
}
export function fadeEnvelope(clip,time,channel='video'){
 const inside=time-clip.start;if(inside<0||inside>=clip.duration)return 0;
 const limit=clip.duration/2;
 const entry=Math.min(limit,Math.max(0,Number(clip[channel+'FadeIn'])||0));
 const exit=Math.min(limit,Math.max(0,Number(clip[channel+'FadeOut'])||0));
 return Math.max(0,Math.min(1,entry?inside/entry:1,exit?(clip.duration-inside)/exit:1));
}
