// Native Wan profile. No provider credential is accepted or stored in the browser.
export async function validateNativeVideo(file,expected){
 const url=URL.createObjectURL(file),video=document.createElement('video');
 let timer;
 try{
  const measured=await new Promise((resolve,reject)=>{
   timer=setTimeout(()=>reject(Error('El navegador no pudo leer el MP4.')),15000);
   video.onloadedmetadata=()=>resolve({width:video.videoWidth,height:video.videoHeight,duration:video.duration,fps:expected.fps,audio:false});
   video.onerror=()=>reject(Error('El MP4 recibido no se puede reproducir en este navegador.'));
   video.preload='metadata';video.src=url;
  });
  if(measured.width!==expected.width||measured.height!==expected.height||!Number.isFinite(measured.duration)||Math.abs(measured.duration-expected.duration)>.1)
   throw Error('El MP4 recibido no coincide con sus metadatos.');
  return measured;
 }finally{clearTimeout(timer);video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
export function mountNativeWanPanel(root,{projectId,onResult,onTimeline,onFindAsset=()=>null}){
 let active=true,busy=false,capabilities=null,asset=null,videoInfo=null,timer=null,terminal=false;
 const key='studio066-wan-job:'+projectId;
 root.innerHTML='<details><summary>Wan · mayor resolución · GPU remota</summary><p>704 × 1280 vertical o 1280 × 704 horizontal · 24 fps · sin audio. La referencia se recorta al centro para ajustar el formato. Continuidad de personajes pendiente de probar.</p><p data-status role="status" aria-live="polite">Comprobando disponibilidad…</p><label>Fotograma inicial<input data-image type="file" accept="image/png,image/jpeg,image/webp"></label><label>Acción y cámara<textarea data-prompt maxlength="4000" rows="3" placeholder="Describe la acción en inglés"></textarea></label><label>Formato<select data-orientation><option value="portrait">Vertical</option><option value="landscape">Horizontal</option></select></label><label>Duración<select data-duration><option value="3">3 segundos</option><option value="5" selected>5 segundos</option></select></label><p data-cost></p><label><input data-approve type="checkbox">Apruebo el costo estimado de esta prueba</label><div class="gen-request-actions"><button data-generate type="button" disabled>Generar prueba con GPU</button><button data-check type="button" disabled>Consultar último trabajo</button><button data-timeline type="button" disabled>Agregar al timeline</button></div></details>';
 const el=s=>root.querySelector('[data-'+s+']'),say=s=>{if(active)el('status').textContent=s;};
 const remembered=()=>{try{return localStorage.getItem(key);}catch{return null;}};
 const newButton=document.createElement('button');newButton.type='button';newButton.textContent='Nueva prueba';newButton.disabled=true;el('generate').parentElement.append(newButton);
 const controls=()=>{if(!active)return;el('generate').disabled=busy||!capabilities?.canSubmit||!projectId||Boolean(remembered());el('check').disabled=busy||!capabilities?.canCheck||!remembered();el('timeline').disabled=busy||!asset;newButton.disabled=busy||!terminal||!capabilities?.canSubmit;};
 async function api(op,body,query=''){
  const response=await fetch('/api/console-066?op='+op+query,{credentials:'same-origin',
   ...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok){const error=Error(data.error||'No se completó la operación.');error.status=response.status;throw error;}return data;
 }
 async function check(){
  const id=remembered();if(!active||!id)return;
  busy=true;controls();
  try{
   const data=await api('studio-wan-status',null,'&id='+encodeURIComponent(id)+'&projectId='+encodeURIComponent(projectId));
   if(!active)return;
   const status=data.job.status;
   terminal=['COMPLETED','FAILED','CANCELLED','TIMED_OUT'].includes(status);
   if(['SUBMITTING','IN_QUEUE','IN_PROGRESS'].includes(status)){say(status==='IN_PROGRESS'?'Generando en la GPU remota…':'Trabajo enviado. Esperando GPU…');timer=setTimeout(check,8000);}
   else if(status==='UNKNOWN')say('Envío sin confirmar. Puede estar consumiendo GPU: revisa el proveedor antes de repetir.');
   else if(data.output&&!asset){
    let previous;try{previous=JSON.parse(localStorage.getItem(key+':asset')||'null');}catch{}
    asset=previous?.jobId===id?onFindAsset(previous.assetId):null;
    if(!asset){
     const bytes=Uint8Array.from(atob(data.output.video_base64),c=>c.charCodeAt(0));
     const file=new File([bytes],'Wan-calidad-'+id+'.mp4',{type:'video/mp4'});
     videoInfo=await validateNativeVideo(file,data.output.metadata);
     asset=await onResult(file);
     try{localStorage.setItem(key+':asset',JSON.stringify({jobId:id,assetId:asset.id}));}catch{}
    }
    videoInfo=videoInfo||data.output.metadata;
    say('Clip recibido y guardado. Revisa rostros, manos y movimiento antes de usarlo en Caso 066.');
   }else say(data.error||('Trabajo terminado: '+status+'. La prueba diaria no se repite automáticamente.'));
  }catch(error){if(error.status===404)terminal=true;say(error.message+' Puedes consultar el mismo trabajo; no se enviará otro.');}
  finally{
   if(terminal&&active){
    capabilities={...capabilities,canSubmit:false};
    try{capabilities=await api('studio-wan-capabilities');}catch{}
   }
   busy=false;controls();
  }
 }
 el('generate').onclick=async()=>{
  if(busy||remembered()||!capabilities?.canSubmit||!projectId)return;
  const image=el('image').files[0],prompt=el('prompt').value.trim();
  if(!image||image.size>1500000||!['image/png','image/jpeg','image/webp'].includes(image.type))return say('Usa una imagen PNG, JPEG o WebP de hasta 1,5 MB.');
  if(!prompt||!el('approve').checked)return say('Escribe la acción y aprueba el costo estimado mostrado.');
  busy=true;controls();const id=crypto.randomUUID();
  try{
   const encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('No se pudo leer la referencia.'));reader.readAsDataURL(image);});
   const body={id,projectId,prompt,image_base64:encoded,duration:Number(el('duration').value),orientation:el('orientation').value,seed:42,approveCost:true,approvedEstimateUsd:capabilities.estimatedCostUsd};
   // Persist before sending so a navigation or uncertain response never repeats a paid request.
   localStorage.setItem(key,id);el('approve').checked=false;
   await api('studio-wan-submit',body);if(active){say('Prueba enviada. Consultando el trabajo…');timer=setTimeout(check,1000);}
  }catch(error){say(error.message);}
  finally{busy=false;controls();}
 };
 el('check').onclick=()=>{clearTimeout(timer);check();};
 newButton.onclick=()=>{if(busy||!terminal||!capabilities?.canSubmit)return;localStorage.removeItem(key);localStorage.removeItem(key+':asset');asset=null;videoInfo=null;terminal=false;el('approve').checked=false;say('Nueva prueba preparada. Revisa la referencia y el costo antes de generar.');controls();};
 el('timeline').onclick=()=>{if(asset)onTimeline(asset,videoInfo);};
 (async()=>{try{capabilities=await api('studio-wan-capabilities');if(!active)return;say(capabilities.message);el('cost').textContent=capabilities.ready?'Costo estimado: US$ '+capabilities.estimatedCostUsd+'. El cobro real depende del tiempo de GPU; esto no es un límite de facturación.':'Sin endpoint habilitado: generación no disponible.';controls();if(remembered()&&capabilities.canCheck)check();}catch(error){say(error.message);}})();
 return ()=>{active=false;clearTimeout(timer);};
}
