// Studio 066: fail-closed export preflight.
// A restored timeline can reference an asset that only exists in another browser
// or in the private cloud. Never generate a successful-looking black MP4.
export async function preflightExportMedia({clips,assets,read,loadImage,loadMedia}){
 const found=new Map((assets||[]).map(a=>[a.id,a]));
 const problems=[],checked=new Set();
 for(const clip of clips||[]){
  if(clip.kind==='text')continue;
  const id=String(clip.assetId||'');
  if(checked.has(id))continue;
  checked.add(id);
  const metadata=found.get(id);
  if(!metadata){problems.push({id,name:id.slice(0,8)||'Sin identificador',reason:'missing-local'});continue;}
  const name=String(metadata.name||id.slice(0,8)).slice(0,180);
  let original;
  try{original=await read(id);}catch{problems.push({id,name,reason:'unreadable'});continue;}
  if(!original?.blob||original.blob.size===0||original.blob.size!==Number(metadata.size)){
   problems.push({id,name,reason:'missing-bytes'});continue;
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
 if(['missing-local','missing-bytes','unreadable'].includes(first.reason))
  return 'No se exportó: falta el original «'+first.name+'»'+additional+' en este navegador. En Biblioteca privada pulsa «Recuperar al equipo»; después vuelve a exportar.';
 return 'No se exportó: el navegador no puede leer correctamente «'+first.name+'»'+additional+'. Recupera el original desde Biblioteca privada o vuelve a importarlo.';
}
