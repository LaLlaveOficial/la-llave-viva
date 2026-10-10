// Private media sync for Studio 066 — feature off until server-side storage is configured.
// User explicitly initiates transfers; no autonomous uploads, no provider generation.
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=async(op,body)=>{
 const response=await fetch('/api/console-066?op='+encodeURIComponent(op)+(body?.query?'&projectId='+encodeURIComponent(body.query):''),{
  method:body&&!body.query?'POST':'GET',credentials:'same-origin',
  headers:body&&!body.query?{'Content-Type':'application/json'}:{},
  body:body&&!body.query?JSON.stringify(body):undefined
 });
 const data=await response.json().catch(()=>({error:'Respuesta no válida'}));
 if(!response.ok)throw new Error(data.error||'No se pudo completar la operación.');
 return data;
};
const digest=async(blob)=>{
 if(!globalThis.crypto?.subtle)throw new Error('La verificación de archivos requiere HTTPS y WebCrypto.');
 const bytes=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
 return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
};
const requestRefs=(projectId,workspace,storage)=>{
 const refs=new Set(workspace.clips.filter(c=>c.kind!=='text').map(c=>c.assetId));
 let data;
 try{data=JSON.parse(storage.getItem('llave-studio066-generation-v1:'+projectId)||'null');}catch{}
 for(const r of data?.draft?.refs||[])if(r.assetId)refs.add(r.assetId);
 for(const record of data?.history||[]){
  for(const r of record.request?.refs||[])if(r.assetId)refs.add(r.assetId);
  for(const r of record.results||[])if(r.assetId)refs.add(r.assetId);
 }
 return refs;
};
const getObject=async(db,id)=>new Promise((resolve,reject)=>{
 const tx=db.transaction('assets','readonly'),r=tx.objectStore('assets').get(id);
 r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
});
const putObject=async(db,obj)=>new Promise((resolve,reject)=>{
 const tx=db.transaction('assets','readwrite');
 const r=tx.objectStore('assets').add(obj);
 r.onerror=()=>reject(r.error);
 tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
});
export function mountStudioCloud(host,{projectId,db,workspace,notice,onMediaAdded,storage=localStorage}){
 if(!host||!projectId||!db)return ()=>{};
 let active=true,working=false,remote=[],trashed=[],enabled=false,showTrash=false,previews=new Map();
 const alive=()=>active&&host.isConnected;
 const info=message=>{if(alive())notice(message);};
 const libraryCard=(x,inTrash=false)=>{
  const url=previews.get(x.id);
  const thumb=url?(x.kind==='image'?'<img loading="lazy" src="'+e(url)+'" alt="'+e(x.name)+'">':
    x.kind==='video'?'<video preload="metadata" muted playsinline src="'+e(url)+'"></video>':
    '<div class="wb-cloud-icon">♪</div>'):'<div class="wb-cloud-icon">'+(x.kind==='image'?'▧':x.kind==='video'?'▶':'♫')+'</div>';
  return '<div class="wb-cloud-entry"><div class="wb-cloud-cover">'+thumb+'</div><div class="wb-cloud-meta"><b title="'+e(x.name)+'">'+e(x.name)+'</b><small>'+e(x.kind)+' · '+Math.round(Number(x.size_bytes)/104857.6)/10+' MB</small><div class="wb-cloud-actions">'+
   (inTrash?'<button class="subtle" data-cloud-untrash="'+e(x.id)+'"'+(working?' disabled':'')+'>↶ Restaurar</button>':
     '<button class="subtle" data-cloud-preview="'+e(x.id)+'"'+(working?' disabled':'')+'>Vista previa</button><button class="subtle" data-cloud-restore="'+e(x.id)+'"'+(working?' disabled':'')+'>Recuperar</button><button class="subtle" data-cloud-trash="'+e(x.id)+'"'+(working?' disabled':'')+'>Papelera</button>')+
   '</div></div></div>';
 };
 const fillLocalPreview=async()=>{
  if(!enabled||!active)return;
  for(const item of remote){
   if(previews.has(item.id))continue;
   try{
    const local=await getObject(db,item.id);
    if(!local?.blob||local.trashedAt)continue;
    previews.set(item.id,URL.createObjectURL(local.blob));
   }catch{}
  }
  if(alive())listing();
 };
 const listing=()=>{
  if(!alive())return;
  host.innerHTML='<div class="wb-cloud-title"><b><span aria-hidden="true">☁</span> Biblioteca privada</b><small>'+(enabled?'Conector habilitado':'Sin conexión')+'</small></div>'+
   (enabled?'<p class="studio-help">Galería del proyecto. Los originales siguen privados. Selecciona «Vista previa» para ver archivos que todavía no están en este dispositivo.</p>'+
    '<div class="wb-cloud-commands"><button class="subtle" id="wb-cloud-sync"'+(working?' disabled':'')+'>↑ Subir originales usados</button><button class="subtle" id="wb-cloud-refresh"'+(working?' disabled':'')+'>↻ Actualizar</button>'+
    '<button class="subtle" id="wb-cloud-toggle-trash"'+(working?' disabled':'')+'>'+(showTrash?'Ver biblioteca':'Papelera ('+trashed.length+')')+'</button></div>'+
    '<div class="wb-cloud-files">'+((showTrash?trashed:remote).map(x=>libraryCard(x,showTrash)).join('')||'<p class="studio-help">No hay archivos '+(showTrash?'en la papelera.':'subidos en este proyecto.')+'</p>')+'</div>'
    :'<p class="studio-help">La biblioteca remota está desconectada. Tus archivos locales siguen disponibles.</p>')+
    '<p class="studio-help">Papelera recuperable: no elimina físicamente los archivos de Neon.</p>';
  host.querySelector('#wb-cloud-refresh')?.addEventListener('click',reload);
  host.querySelector('#wb-cloud-sync')?.addEventListener('click',sync);
  host.querySelector('#wb-cloud-toggle-trash')?.addEventListener('click',()=>{showTrash=!showTrash;listing();});
  host.querySelectorAll('[data-cloud-restore]').forEach(b=>b.onclick=()=>restore(b.dataset.cloudRestore));
  host.querySelectorAll('[data-cloud-preview]').forEach(b=>b.onclick=()=>previewRemote(b.dataset.cloudPreview));
  host.querySelectorAll('[data-cloud-trash]').forEach(b=>b.onclick=()=>changeTrash(b.dataset.cloudTrash,true));
  host.querySelectorAll('[data-cloud-untrash]').forEach(b=>b.onclick=()=>changeTrash(b.dataset.cloudUntrash,false));
 };
 const previewRemote=async id=>{
  if(!enabled||working)return;
  const a=remote.find(x=>x.id===id);if(!a)return;
  if(previews.has(id)){listing();info('Vista previa cargada.');return;}
  working=true;listing();
  try{
   const signed=await api('studio-cloud-download',{projectId,id});
   const response=await fetch(signed.url);
   if(!response.ok)throw new Error('No se pudo leer el archivo remoto.');
   const blob=await response.blob();
   if(blob.size!==Number(a.size_bytes)||await digest(blob)!==a.sha256_hex)throw new Error('La integridad no coincide.');
   previews.set(id,URL.createObjectURL(blob));info('Vista previa verificada de '+a.name+'.');
  }catch(error){info('Vista previa: '+error.message);}
  finally{working=false;listing();}
 };
 const changeTrash=async(id,discard)=>{
  if(!enabled||working)return;
  const item=(discard?remote:trashed).find(x=>x.id===id);
  if(!item)return;
  if(discard&&!confirm('¿Mover «'+item.name+'» a la papelera privada? Podrás restaurarlo. No borra tu copia local.'))return;
  working=true;listing();
  try{
   await api(discard?'studio-cloud-trash':'studio-cloud-restore',{projectId,id});
   await reloadAfterTransfer();showTrash=discard;
   info(discard?'Archivo enviado a la papelera. Puedes deshacerlo en Papelera.':'Archivo restaurado en la biblioteca privada.');
  }catch(error){info('No se pudo cambiar el archivo: '+error.message);}
  finally{working=false;listing();fillLocalPreview();}
 };
 const reload=async()=>{
  if(!enabled||working)return;
  try{await reloadAfterTransfer();listing();fillLocalPreview();}
  catch(error){info('No se pudo cargar la nube: '+error.message);}
 };
 const sync=async()=>{
  if(!enabled||working)return;
  working=true;listing();
  let done=0;
  try{
   const refs=requestRefs(projectId,workspace,storage);
   if(!refs.size){info('Primero añade un original al timeline o a una solicitud de generación.');return;}
   for(const id of refs){
    if(!alive())break;
    if(remote.some(a=>a.id===id))continue;
    const file=await getObject(db,id);
    if(!file?.blob){info('Falta el archivo original local '+id.slice(0,8));continue;}
    const sha256=await digest(file.blob);
    const upload=await api('studio-cloud-upload',{projectId,id:file.id,kind:file.kind,mime:file.mime,name:file.name,size:file.size,sha256});
    const response=await fetch(upload.uploadUrl,{method:'PUT',headers:upload.headers,body:file.blob});
    if(!response.ok)throw new Error('El almacenamiento rechazó la subida de '+file.name+'. Verifica permisos y CORS.');
    await api('studio-cloud-confirm',{projectId,id:file.id});
    done++;
   }
   await reloadAfterTransfer();
   info(done+' archivo(s) nuevos sincronizados con la biblioteca privada.');
  }catch(error){info('Sincronización incompleta: '+error.message+'. Los originales locales están intactos.');}
  finally{working=false;listing();}
 };
 const reloadAfterTransfer=async()=>{const [a,b]=await Promise.all([api('studio-cloud-assets',{query:projectId}),api('studio-cloud-trash-assets',{query:projectId})]);remote=a.assets||[];trashed=b.assets||[];};
 const restore=async(id)=>{
  if(!enabled||working)return;
  working=true;listing();
  try{
   const asset=remote.find(x=>x.id===id);if(!asset)throw new Error('Original no disponible.');
   const existing=await getObject(db,id);if(existing){if(existing.trashedAt){await new Promise((resolve,reject)=>{const tx=db.transaction('assets','readwrite');const item={...existing};delete item.trashedAt;tx.objectStore('assets').put(item);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});onMediaAdded?.();info('Original restaurado de la papelera local.');}else info('Este original ya está disponible en el navegador.');return;}
   const signed=await api('studio-cloud-download',{projectId,id});
   const res=await fetch(signed.url);
   if(!res.ok)throw new Error('Falló la descarga del original.');
   const blob=await res.blob();
   if(blob.size!==Number(asset.size_bytes)||await digest(blob)!==asset.sha256_hex)throw new Error('La integridad de los bytes descargados no coincide.');
   await putObject(db,{id,name:asset.name,kind:asset.kind,mime:asset.mime,size:blob.size,blob:new Blob([blob],{type:asset.mime}),lastModified:Date.now(),addedAt:new Date().toISOString()});
   info('Original verificado y recuperado en este equipo.');
   onMediaAdded?.();
  }catch(error){info('No se pudo recuperar el original: '+error.message);}
  finally{working=false;listing();}
 };
 host.innerHTML='<p class="studio-help">Comprobando biblioteca privada…</p>';
 (async()=>{try{
  const status=await api('studio-cloud');
  if(!alive())return;
  enabled=status.enabled===true;
  if(enabled)await reloadAfterTransfer();
  listing();if(enabled)fillLocalPreview();
 }catch(error){if(alive()){enabled=false;listing();info('Biblioteca privada desconectada: '+error.message);}}})();
 return ()=>{active=false;for(const url of previews.values())URL.revokeObjectURL(url);previews.clear();};
}
