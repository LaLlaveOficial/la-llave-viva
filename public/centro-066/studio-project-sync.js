import {readMedia,deleteMedia,workspaceKey} from './studio-media.js';
import {normalizeProjectState,projectAssetIds} from './studio-project-state.js';
const digest=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');
const put=async(db,item)=>new Promise((resolve,reject)=>{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').add(item);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
export function createStudioProjectSync({projectId,db,storage=localStorage,getWorkspace,onRestored=()=>{},onStatus=()=>{},fetcher=fetch,delay=3000,auto=true,media={read:readMedia,put,discard:deleteMedia},hash=digest}){
 const trackKey=workspaceKey+':'+projectId,genKey='llave-studio066-generation-v1:'+projectId,versionKey=trackKey+':cloud-version';
 let active=true,enabled=false,ready=false,version=0,timer=null,working=false,again=false;
 const status=s=>{if(active)onStatus(s);};
 const api=async(op,body)=>{
  const response=await fetcher('/api/console-066?op='+op+(body?'':'&projectId='+projectId),{method:body?'POST':'GET',credentials:'same-origin',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok){const e=Error(data.error||'No se pudo sincronizar.');e.reason=data.reason;throw e;}return data;
 };
 const current=()=>normalizeProjectState({workspace:getWorkspace(),generation:JSON.parse(storage.getItem(genKey)||'null')});
 async function recover(remote){
  if(!enabled||working)return false;working=true;ready=false;const added=[];
  const before={track:storage.getItem(trackKey),generation:storage.getItem(genKey),version:storage.getItem(versionKey)};
  try{
   remote ||= await api('studio-cloud-project');const state=normalizeProjectState(remote.data);if(!state||!remote.version)throw Error('No hay un proyecto remoto válido.');
   const {assets}=await api('studio-cloud-assets');
   for(const id of projectAssetIds(state)){
    const meta=assets.find(a=>a.id===id);if(!meta)throw Error('Falta un original remoto.');
    const local=await media.read(db,id);if(local){if(local.trashedAt||local.blob.size!==Number(meta.size_bytes)||await hash(local.blob)!==meta.sha256_hex)throw Error('El original local no coincide; se conservó sin sobrescribir.');continue;}
    const signed=await api('studio-cloud-download',{projectId,id}),response=await fetcher(signed.url);if(!response.ok)throw Error('No se pudo descargar un original.');
    const blob=await response.blob();if(blob.size!==Number(meta.size_bytes)||await hash(blob)!==meta.sha256_hex)throw Error('La integridad del original no coincide.');
    await media.put(db,{id,name:meta.name,kind:meta.kind,mime:meta.mime,size:blob.size,blob:new Blob([blob],{type:meta.mime}),lastModified:Date.now(),addedAt:new Date().toISOString()});added.push(id);
   }
   if(!active)throw Error('Recuperación cancelada.');
   storage.setItem(trackKey+':before-cloud-restore',JSON.stringify(before));
   storage.setItem(genKey,JSON.stringify(state.generation));storage.setItem(trackKey,JSON.stringify(state.workspace));storage.setItem(versionKey,String(remote.version));version=remote.version;ready=true;
   await onRestored();status('Proyecto recuperado y verificado en este dispositivo.');return true;
  }catch(e){
   for(const [key,value] of [[trackKey,before.track],[genKey,before.generation],[versionKey,before.version]]){try{value===null?storage.removeItem(key):storage.setItem(key,value);}catch{}}
   for(const id of added)await media.discard(db,id);status('Recuperación detenida: '+e.message);return false;
  }finally{working=false;}
 }
 async function flush(){
  clearTimeout(timer);if(!enabled||!ready||!active)return false;if(working){again=true;return false;}working=true;again=false;
  try{
   const state=current();if(!state)throw Error('El proyecto local no es válido para sincronizar.');
   status('Sincronizando proyecto privado…');const {assets}=await api('studio-cloud-assets');
   for(const id of projectAssetIds(state)){
    if(!active)throw Error('Sincronización cancelada.');
    const local=await media.read(db,id);if(!local?.blob||local.trashedAt)throw Error('Falta un original local.');
    const sha256=await hash(local.blob),existing=assets.find(a=>a.id===id);
    if(existing){if(existing.sha256_hex!==sha256||Number(existing.size_bytes)!==local.blob.size)throw Error('El identificador remoto pertenece a otros bytes.');continue;}
    const upload=await api('studio-cloud-upload',{projectId,id,kind:local.kind,mime:local.mime,name:local.name,size:local.blob.size,sha256});
    const response=await fetcher(upload.uploadUrl,{method:'PUT',headers:upload.headers,body:local.blob});if(!response.ok)throw Error('Falló la subida privada.');
    await api('studio-cloud-confirm',{projectId,id});
   }
   if(!active)throw Error('Sincronización cancelada.');
   const saved=await api('studio-cloud-project-save',{projectId,version,data:state});if(saved.saved!==true)throw Error('No se confirmó el guardado remoto.');
   version=saved.version;storage.setItem(versionKey,String(version));status('Proyecto guardado en nube · versión '+version);return true;
  }catch(e){if(e.reason==='version_conflict')ready=false;status('Sincronización detenida: '+e.message);return false;}
  finally{working=false;if(again&&auto)schedule();}
 }
 function schedule(){if(!enabled||!ready||!active)return;clearTimeout(timer);timer=setTimeout(flush,delay);}
 async function start(){
  try{
   const config=await api('studio-cloud');if(!active)return;
   enabled=config.enabled===true;if(!enabled){status('Nube pendiente de activación');return;}
   const remote=await api('studio-cloud-project');version=remote.version;
   if(remote.data&&storage.getItem(trackKey)===null&&storage.getItem(genKey)===null){await recover(remote);return;}
   const stored=Number(storage.getItem(versionKey)||0);
   if(remote.data&&stored!==version){status('Hay un proyecto remoto distinto. Recupera la nube o conserva tu respaldo local.');return;}
   ready=true;status('Sincronización privada disponible');if(auto)schedule();
  }catch(e){status('Nube no disponible: '+e.message);}
 }
 return {start,schedule,flush,recover:()=>recover(),dispose(){active=false;ready=false;clearTimeout(timer);}};
}
