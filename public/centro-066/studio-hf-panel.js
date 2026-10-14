// Isolated, opt-in experiment. No credentials are written to project storage.
export function mountWanPanel(root,{client,onResult,onTimeline,getRequest,onProviderChange,initialProvider}){
 let active=true,controller=null,url=null,generated=null,preparing=false;
 root.innerHTML='<details><summary>Video gratuito · LTX y Wan</summary><p class="studio-help">LTX permite fotograma inicial y final, 24 FPS y audio; Wan ofrece animación desde una imagen. Usa cuota gratuita compartida. La calidad de cada clip debe revisarse antes de montarlo.</p><label>Token de Hugging Face (opcional)<input id="hf-token" type="password" autocomplete="off" spellcheck="false" placeholder="Token de acceso, no contraseña"></label><p class="studio-help">Usa un token con permisos mínimos. Se conserva únicamente mientras este panel está abierto y se envía a Hugging Face y al Space de Wan. No se guarda en el proyecto.</p><div class="gen-request-actions"><button type="button" id="hf-connect">Conectar cuenta gratuita (más cuota)</button><button type="button" id="hf-anonymous">Usar sin cuenta</button><button type="button" id="hf-disconnect">Desconectar</button></div><label>Motor gratuito<select id="hf-provider"><option value="ltx">LTX-2.3 · inicio y final</option><option value="wan">Wan 2.2 · 14B</option></select></label><p id="hf-profile" class="studio-help"></p><label>Formato<select id="hf-aspect"><option value="9:16">Vertical 9:16</option><option value="16:9">Horizontal 16:9</option><option value="1:1">Cuadrado</option></select></label><label id="hf-end-label">Fotograma final (opcional, LTX)<input id="hf-end-image" type="file" accept="image/png,image/jpeg,image/webp"></label><label>Seed<input id="hf-seed" type="number" min="0" max="2147483647" step="1" value="42"></label><label id="hf-negative-label" hidden>Prompt negativo (Wan)<textarea id="hf-negative" maxlength="2000" rows="2"></textarea></label><label id="hf-steps-label" hidden>Pasos (Wan)<select id="hf-steps"><option value="4">4 · rápido</option><option value="6" selected>6 · equilibrado</option><option value="8">8 · más procesamiento</option></select></label><label>Fotograma inicial<input id="hf-image" type="file" accept="image/png,image/jpeg,image/webp"></label><label>Prompt de la prueba<textarea id="hf-prompt" maxlength="4000" rows="3" placeholder="Describe la acción y el movimiento de cámara en inglés"></textarea></label><label>Duración<select id="hf-duration"><option value="3">3 segundos</option><option value="5">5 segundos</option></select></label><p class="studio-help">Al pulsar Generar se enviarán esta imagen y este prompt al Space público del motor elegido. El archivo resultante se guardará en la biblioteca de este navegador.</p><div class="gen-request-actions"><button type="button" id="hf-generate">Generar clip gratuito</button><button type="button" id="hf-stop" disabled>Detener espera</button></div><p id="hf-status" class="studio-help" role="status" aria-live="polite"></p><video id="hf-video" controls playsinline hidden class="gen-stage-media"></video><div class="gen-request-actions"><a id="hf-download" hidden>Descargar MP4</a><button type="button" id="hf-timeline" disabled>Agregar clip al timeline</button></div></details>';
 const el=id=>root.querySelector('#'+id);
 if(getRequest){for(const id of ['hf-image','hf-end-image','hf-prompt','hf-negative','hf-duration','hf-aspect','hf-seed'])el(id).closest('label').hidden=true;const note=document.createElement('p');note.className='studio-help';note.textContent='Usa el prompt, los fotogramas y los ajustes de la escena de arriba. LTX y Wan admiten 3 o 5 segundos; no se ajusta la duración automáticamente.';el('hf-generate').before(note);}
 if(initialProvider)el('hf-provider').value=initialProvider;
 const say=text=>{if(active)el('hf-status').textContent=text;};
 const controls=busy=>{if(!active)return;for(const id of ['hf-connect','hf-anonymous','hf-disconnect','hf-generate','hf-image','hf-prompt','hf-duration','hf-token','hf-provider','hf-aspect','hf-end-image','hf-seed','hf-negative','hf-steps'])el(id).disabled=busy;el('hf-stop').disabled=!busy;el('hf-timeline').disabled=busy||!generated;};
 const setProvider=()=>{
  const id=el('hf-provider').value;client.selectProvider?.(id);
  const ltx=id==='ltx';el('hf-end-label').hidden=Boolean(getRequest)||!ltx;el('hf-negative-label').hidden=Boolean(getRequest)||ltx;el('hf-steps-label').hidden=ltx;el('hf-aspect').disabled=!ltx;
  el('hf-profile').textContent=ltx?'Perfil LTX: 576 × 1024 vertical, 1024 × 576 horizontal o 1024 × 1024 cuadrado; 24 FPS, audio generado. Resolución y duración se comprueban al descargar.':'Perfil Wan: hasta 832 px, formato según la imagen, 16 FPS, sin audio. Más pasos consumen más cuota; no garantizan mejor resultado.';
 };
 if(client.selectProvider){setProvider();el('hf-provider').onchange=()=>{setProvider();onProviderChange?.(el('hf-provider').value);};}
 if(!client.connected)client.useAnonymous?.();
 say(client.anonymous?'Modo gratuito sin cuenta: cuota reducida y cola compartida.':client.connected?'Cuenta gratuita conectada.':'Sin cuenta conectada.');
 el('hf-anonymous').onclick=()=>{client.useAnonymous?.();say('Modo gratuito sin cuenta: cuota reducida y cola compartida.');};
 el('hf-connect').onclick=async()=>{
  const value=el('hf-token').value;el('hf-token').value='';
  controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),30000);controls(true);
  try{const account=await client.connect(value,controller.signal);say('Conectado: '+account.name+' · cuenta gratuita.');}
  catch(error){say(error.name==='AbortError'?'Conexión detenida.':error.message);}
  finally{clearTimeout(timer);controller=null;controls(false);if(active&&client.selectProvider)setProvider();}
 };
 el('hf-disconnect').onclick=()=>{client.disconnect();el('hf-token').value='';say('Cuenta desconectada.');};
 el('hf-stop').onclick=()=>{controller?.abort();say('Espera detenida. Una tarea ya enviada puede seguir consumiendo cuota en el proveedor.');};
 el('hf-generate').onclick=async()=>{
  if(controller||preparing)return say('Ya hay una generación en curso.');
  preparing=true;let shared;try{shared=getRequest?await getRequest(el('hf-provider').value):null;}catch(error){return say(error.message);}finally{preparing=false;}
  if(!active)return;
  const image=shared?.image||el('hf-image').files?.[0],prompt=shared?.prompt||el('hf-prompt').value.trim(),duration=shared?.duration||Number(el('hf-duration').value);
  if(!client.connected)return say('Conecta primero tu cuenta gratuita.');
  if(!image||!prompt)return say('Selecciona una imagen y escribe el prompt.');
  controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),8*60*1000);controls(true);
  try{
   const provider=el('hf-provider').value,seed=shared?.seed??Number(el('hf-seed').value),steps=Number(el('hf-steps').value),aspect=shared?.aspect||el('hf-aspect').value;
   const blob=await client.generate({image,prompt,duration,seed,steps,aspect,endImage:provider==='ltx'?(shared?.endImage||el('hf-end-image').files?.[0]||null):null,negative:provider==='wan'?(shared?.negative??el('hf-negative').value):''},controller.signal,say);
   if(!active)return;
   if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);
   const video=el('hf-video');video.src=url;video.hidden=false;
   const dimensions=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{video.onloadedmetadata=null;video.onerror=null;reject(new Error('No se pudo verificar el MP4.'));},10000);
    video.onloadedmetadata=()=>{clearTimeout(timeout);video.onloadedmetadata=null;video.onerror=null;
     if(!Number.isFinite(video.duration)||video.duration<=0)return reject(new Error('Duración del MP4 no válida.'));
     resolve({duration:video.duration,width:video.videoWidth,height:video.videoHeight,expectedFps:client.profile?.expectedFps||16});};
    video.onerror=()=>{clearTimeout(timeout);video.onloadedmetadata=null;video.onerror=null;reject(new Error('El navegador no pudo reproducir el MP4.'));};
    video.load();
   });
   if(!active)return;
   const expected=({'9:16':[576,1024],'16:9':[1024,576],'1:1':[1024,1024]})[aspect];
   if(provider==='ltx'&&(dimensions.width!==expected[0]||dimensions.height!==expected[1]||Math.abs(dimensions.duration-(duration+1/24))>0.25))throw new Error('El MP4 no coincide con el perfil solicitado. No se importó al timeline.');
   const file=new File([blob],(client.provider==='ltx'?'LTX-clip-':'Wan-clip-')+Date.now()+'.mp4',{type:'video/mp4'});
   const asset=await onResult(file,dimensions,shared);
   if(!active)return;
   generated={asset,dimensions};el('hf-timeline').disabled=false;
   const download=el('hf-download');download.href=url;download.download=file.name;download.hidden=false;
   say('MP4 guardado · '+dimensions.width+' × '+dimensions.height+' · '+dimensions.duration.toFixed(2)+' s · revisa imagen y sonido antes de montar.');
  }catch(error){say(error.name==='AbortError'?'Espera detenida. La tarea enviada puede continuar en Hugging Face.':error.message);}
  finally{clearTimeout(timer);controller=null;controls(false);if(active&&client.selectProvider)setProvider();}
 };
 el('hf-timeline').onclick=()=>{if(generated)onTimeline(generated.asset,generated.dimensions);};
 return ()=>{active=false;controller?.abort();const input=el('hf-token');if(input)input.value='';if(url)URL.revokeObjectURL(url);};
}
