// Estudio 066 · biblioteca local. Los archivos quedan en este navegador, NO en servidores.
const DB_NAME='llave-studio066-media-v1',STORE='assets';
export function mediaDB(){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(new Error('Este navegador no ofrece IndexedDB.'));return;}
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'});};
  req.onerror=()=>reject(req.error||new Error('No se pudo abrir la biblioteca local.'));
  req.onsuccess=()=>resolve(req.result);
 });
}
function transaction(db,mode,operation){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
  let result;
  const r=operation(store);
  r.onsuccess=()=>{result=r.result;};r.onerror=()=>reject(r.error||new Error('Fallo en biblioteca de medios.'));
  tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||new Error('No se pudieron guardar los medios.'));
 });
}
export const listMedia=async db=>transaction(db,'readonly',store=>store.getAll());
export const readMedia=async(db,id)=>transaction(db,'readonly',store=>store.get(id));
export const addMedia=async(db,file)=>{
 if(!file||file.size===0||file.size>150*1024*1024)throw new Error('El archivo debe pesar entre 1 B y 150 MB.');
 let kind='';
 if(/^image\/(jpeg|png|webp)$/.test(file.type))kind='image';
 if(/^video\/(mp4|webm|quicktime)$/.test(file.type))kind='video';
 if(/^audio\/(mpeg|mp4|wav|ogg|webm|x-wav)$/.test(file.type))kind='audio';
 if(!kind)throw new Error('Formato no compatible. Usa PNG/JPEG/WebP, MP4/WebM/MOV o MP3/WAV.');
 const item={id:crypto.randomUUID(),name:file.name.slice(0,180),kind,mime:file.type,size:file.size,blob:file,lastModified:file.lastModified,addedAt:new Date().toISOString()};
 await transaction(db,'readwrite',store=>store.put(item));
 return {...item,blob:undefined};
};
export const deleteMedia=async(db,id)=>transaction(db,'readwrite',store=>store.delete(id));
export const workspaceKey='llave-studio066-workspace-v1';
export const defaultWorkspace=()=>({version:1,name:'Caso 066 · Proyecto de montaje',aspect:'9:16',quality:'720p',fps:24,clips:[],playhead:0});
export function parseWorkspace(value){
 if(!value||typeof value!=='object'||!Array.isArray(value.clips)||value.clips.length>120)return null;
 if(!['9:16','16:9','1:1','1.91:1'].includes(value.aspect)||!['720p','1080p'].includes(value.quality)||![24,30].includes(value.fps))return null;
 const items=[];
 for(const c of value.clips){
  if(typeof c!=='object'||!['video','image','audio','text'].includes(c.kind)||!['V1','V2','A1','A2'].includes(c.track))return null;
  const permitted=c.kind==='audio'?['A1','A2']:c.kind==='text'?['V2']:['V1','V2'];
  if(!permitted.includes(c.track))return null;
  if(!Number.isFinite(c.start)||!Number.isFinite(c.duration)||c.start<0||c.duration<.1||c.start+c.duration>600)return null;
  if(c.prompt!==undefined&&String(c.prompt).length>3000)return null;
  const id=String(c.id||'').slice(0,100),assetId=String(c.assetId||'').slice(0,100);
  if(!id||(!assetId&&c.kind!=='text'))return null;
  items.push({...c,id,assetId,start:c.start,duration:c.duration,text:String(c.text||'').slice(0,500),sourceStart:Math.max(0,Number(c.sourceStart)||0),volume:Math.min(2,Math.max(0,Number(c.volume??1))),opacity:Math.min(1,Math.max(0,Number(c.opacity??1))),brightness:Math.min(200,Math.max(0,Number(c.brightness??100))),contrast:Math.min(200,Math.max(0,Number(c.contrast??100))),saturation:Math.min(200,Math.max(0,Number(c.saturation??100))),blur:Math.min(20,Math.max(0,Number(c.blur)||0))});
 }
 return {version:1,name:String(value.name||'Montaje').slice(0,160),aspect:value.aspect,quality:value.quality,fps:value.fps,clips:items,playhead:Math.min(600,Math.max(0,Number(value.playhead)||0))};
}
export function timelineDuration(clips){return Math.max(5,...clips.map(c=>c.start+c.duration));}
export function addTimelineClip(asset,clips){
 const track=asset.kind==='audio'?'A1':'V1';
 const end=Math.max(0,...clips.filter(c=>c.track===track).map(c=>c.start+c.duration));
 return {id:crypto.randomUUID(),assetId:asset.id,kind:asset.kind,track,start:Math.round(end*10)/10,duration:asset.kind==='image'?5:Math.min(8,Math.max(.1,Number(asset.duration)||5)),sourceStart:0,text:'',volume:1,opacity:1,brightness:100,contrast:100,saturation:100,blur:0,scale:1,x:0,y:0};
}
