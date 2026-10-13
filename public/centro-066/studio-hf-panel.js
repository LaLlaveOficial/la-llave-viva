// Isolated, opt-in experiment. No credentials are written to project storage.
export function mountWanPanel(root,{client,onResult,onTimeline}){
 let active=true,controller=null,url=null,generated=null;
 root.innerHTML='<details><summary>Prueba gratuita · Wan en Hugging Face</summary><p class="studio-help">Una imagen inicial, clips de 3 o 5 segundos, hasta 832 px y 16 FPS. Generación remota sin audio. Usa cuota gratuita; no garantiza disponibilidad ni identidad del personaje.</p><label>Token de Hugging Face<input id="hf-token" type="password" autocomplete="off" spellcheck="false" placeholder="Token de acceso, no contraseña"></label><p class="studio-help">Usa un token con permisos mínimos. Se conserva únicamente mientras este panel está abierto y se envía a Hugging Face y al Space de Wan. No se guarda en el proyecto.</p><div class="gen-request-actions"><button type="button" id="hf-connect">Conectar cuenta gratuita</button><button type="button" id="hf-disconnect">Desconectar</button></div><label>Fotograma inicial<input id="hf-image" type="file" accept="image/png,image/jpeg,image/webp"></label><label>Prompt de la prueba<textarea id="hf-prompt" maxlength="4000" rows="3" placeholder="Describe la acción y el movimiento de cámara en inglés"></textarea></label><label>Duración<select id="hf-duration"><option value="3">3 segundos</option><option value="5">5 segundos</option></select></label><p class="studio-help">Al pulsar Generar se enviarán esta imagen y este prompt al Space público de Wan. El archivo resultante se guardará en la biblioteca de este navegador.</p><div class="gen-request-actions"><button type="button" id="hf-generate">Generar prueba</button><button type="button" id="hf-stop" disabled>Detener espera</button></div><p id="hf-status" class="studio-help" role="status" aria-live="polite"></p><video id="hf-video" controls playsinline hidden class="gen-stage-media"></video><div class="gen-request-actions"><a id="hf-download" hidden>Descargar MP4</a><button type="button" id="hf-timeline" disabled>Agregar clip al timeline</button></div></details>';
 const el=id=>root.querySelector('#'+id);
 const say=text=>{if(active)el('hf-status').textContent=text;};
 const controls=busy=>{if(!active)return;for(const id of ['hf-connect','hf-disconnect','hf-generate','hf-image','hf-prompt','hf-duration','hf-token'])el(id).disabled=busy;el('hf-stop').disabled=!busy;el('hf-timeline').disabled=busy||!generated;};
 say(client.connected?'Cuenta gratuita conectada.':'Sin cuenta conectada.');
 el('hf-connect').onclick=async()=>{
  const value=el('hf-token').value;el('hf-token').value='';
  controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),30000);controls(true);
  try{const account=await client.connect(value,controller.signal);say('Conectado: '+account.name+' · cuenta gratuita.');}
  catch(error){say(error.name==='AbortError'?'Conexión detenida.':error.message);}
  finally{clearTimeout(timer);controller=null;controls(false);}
 };
 el('hf-disconnect').onclick=()=>{client.disconnect();el('hf-token').value='';say('Cuenta desconectada.');};
 el('hf-stop').onclick=()=>{controller?.abort();say('Espera detenida. Una tarea ya enviada puede seguir consumiendo cuota en el proveedor.');};
 el('hf-generate').onclick=async()=>{
  const image=el('hf-image').files?.[0],prompt=el('hf-prompt').value.trim(),duration=Number(el('hf-duration').value);
  if(!client.connected)return say('Conecta primero tu cuenta gratuita.');
  if(!image||!prompt)return say('Selecciona una imagen y escribe el prompt.');
  controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),8*60*1000);controls(true);
  try{
   const blob=await client.generate({image,prompt,duration},controller.signal,say);
   if(!active)return;
   if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);
   const video=el('hf-video');video.src=url;video.hidden=false;
   const dimensions=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{video.onloadedmetadata=null;video.onerror=null;reject(new Error('No se pudo verificar el MP4.'));},10000);
    video.onloadedmetadata=()=>{clearTimeout(timeout);video.onloadedmetadata=null;video.onerror=null;
     if(!Number.isFinite(video.duration)||video.duration<=0)return reject(new Error('Duración del MP4 no válida.'));
     resolve({duration:video.duration,width:video.videoWidth,height:video.videoHeight,fps:16});};
    video.onerror=()=>{clearTimeout(timeout);video.onloadedmetadata=null;video.onerror=null;reject(new Error('El navegador no pudo reproducir el MP4.'));};
    video.load();
   });
   if(!active)return;
   const file=new File([blob],'Wan-prueba-'+Date.now()+'.mp4',{type:'video/mp4'});
   const asset=await onResult(file,dimensions);
   if(!active)return;
   generated={asset,dimensions};el('hf-timeline').disabled=false;
   const download=el('hf-download');download.href=url;download.download=file.name;download.hidden=false;
   say('MP4 guardado · '+dimensions.width+' × '+dimensions.height+' · '+dimensions.duration.toFixed(2)+' s · sin audio.');
  }catch(error){say(error.name==='AbortError'?'Espera detenida. La tarea enviada puede continuar en Hugging Face.':error.message);}
  finally{clearTimeout(timer);controller=null;controls(false);}
 };
 el('hf-timeline').onclick=()=>{if(generated)onTimeline(generated.asset,generated.dimensions);};
 return ()=>{active=false;controller?.abort();const input=el('hf-token');if(input)input.value='';if(url)URL.revokeObjectURL(url);};
}
