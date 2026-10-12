// Studio 066: fail-closed export preflight.
// A restored timeline can reference an asset that only exists in another browser
// or in the private cloud. Never generate a successful-looking black MP4.
import {sourceRangeValid} from './studio-playback.js';
export async function preflightExportMedia({clips,assets,read,loadImage,loadMedia}){
 const found=new Map((assets||[]).map(a=>[a.id,a]));
 const problems=[],checked=new Set();
 for(const clip of clips||[]){
  if(clip.kind==='text')continue;
  const id=String(clip.assetId||'');
  const metadata=found.get(id);
  if(!metadata){problems.push({id,name:id.slice(0,8)||'Sin identificador',reason:'missing-local'});continue;}
  const name=String(metadata.name||id.slice(0,8)).slice(0,180);
  if(!checked.has(id)){
   let original;
   try{original=await read(id);}catch{problems.push({id,name,reason:'unreadable'});continue;}
   if(!original?.blob||original.blob.size===0||original.blob.size!==Number(metadata.size)){
    problems.push({id,name,reason:'missing-bytes'});continue;
   }
   checked.add(id);
  }
  try{
   if(clip.kind==='image'){
    const img=await loadImage(clip);
    if(!(img?.naturalWidth>0&&img?.naturalHeight>0))
     problems.push({id,name,reason:'image-decode'});
   }else{
    const media=await loadMedia(clip);
    const element=media?.element;
    if(!element||element.readyState<1||(clip.kind==='video'&&!(element.videoWidth>0&&element.videoHeight>0)))
     problems.push({id,name,reason:clip.kind==='video'?'video-decode':'audio-decode'});
    else if(!sourceRangeValid(clip,element.duration))problems.push({id,name,reason:'source-range'});
   }
  }catch{problems.push({id,name,reason:'decoder-error'});}
 }
 return {ok:problems.length===0,problems};
}
export function formatExportPreflightError(result){
 if(result?.ok)return '';
 const x=result?.problems||[];
 if(!x.length)return 'No se pudieron verificar los originales del montaje.';
 const first=x[0],additional=x.length>1?' (y '+(x.length-1)+' más)':'';
 if(first.reason==='source-range')return 'No se exportó: el recorte de «'+first.name+'»'+additional+' excede su duración original o no tiene una duración válida. Ajusta Entrada original y Duración en el inspector.';
 if(['missing-local','missing-bytes','unreadable'].includes(first.reason))
  return 'No se exportó: falta el original «'+first.name+'»'+additional+' en este navegador. En Biblioteca privada pulsa «Recuperar al equipo»; después vuelve a exportar.';
 return 'No se exportó: el navegador no puede leer correctamente «'+first.name+'»'+additional+'. Recupera el original desde Biblioteca privada o vuelve a importarlo.';
}
