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
 let active=true,working=false,remote=[],enabled=false;
 const alive=()=>active&&host.isConnected;
 const info=message=>{if(alive())notice(message);};
 const listing=()=>{
  if(!alive())return;
  host.innerHTML='<div class="wb-cloud-title"><b><span aria-hidden="true">☁</span> Biblioteca privada</b><small>'+(enabled?'Conector habilitado':'Sin conexión al almacenamiento remoto')+'</small></div>'+
   (enabled?'<p class="studio-help">Sincronización manual. Solo se suben originales utilizados en el proyecto.</p>'+
    '<button type="button" class="subtle" id="wb-cloud-sync"'+(working?' disabled':'')+'>Subir originales del proyecto</button>'+
    '<button type="button" class="subtle" id="wb-cloud-refresh"'+(working?' disabled':'')+'>Actualizar biblioteca</button>'+
    '<div class="wb-cloud-files">'+(remote.map(x=>'<div class="wb-cloud-entry"><span>'+e(x.name)+' · '+Math.round(Number(x.size_bytes)/1048576*10)/10+' MB</span>'+
     '<button type="button" class="subtle" data-cloud-restore="'+e(x.id)+'"'+(working?' disabled':'')+'>Recuperar al equipo</button></div>').join('')||'<p class="studio-help">Todavía no hay archivos en este proyecto.</p>')+'</div>'
    :'<p class="studio-help">La sincronización PC ↔ móvil se activará cuando autorices el bucket privado, sus credenciales y el gasto correspondiente. Por ahora usa el respaldo completo.</p>')+
   '<p class="studio-help">Los clips y fotogramas nunca se vuelven públicos.</p>';
  const refresh=host.querySelector('#wb-cloud-refresh');
  if(refresh)refresh.onclick=reload;
  const btn=host.querySelector('#wb-cloud-sync');
  if(btn)btn.onclick=sync;
  host.querySelectorAll('[data-cloud-restore]').forEach(b=>b.onclick=()=>restore(b.dataset.cloudRestore));
 };
 const reload=async()=>{
  if(!enabled||working)return;
  try{const r=await api('studio-cloud-assets',{query:projectId});remote=r.assets||[];listing();}
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
 const reloadAfterTransfer=async()=>{const x=await api('studio-cloud-assets',{query:projectId});remote=x.assets||[];};
 const restore=async(id)=>{
  if(!enabled||working)return;
  working=true;listing();
  try{
   const asset=remote.find(x=>x.id===id);if(!asset)throw new Error('Original no disponible.');
   if(await getObject(db,id)){info('Este original ya está disponible en el navegador.');return;}
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
  listing();
 }catch(error){if(alive()){enabled=false;listing();info('Biblioteca privada desconectada: '+error.message);}}})();
 return ()=>{active=false;};
}
