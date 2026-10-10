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
