export function videoPanel(panel,request,escape){
 panel.innerHTML='<p>Convierte un guion breve en una pieza animada con la portada real de La Llave. El servidor renderiza el MP4; tu computador no procesa el video. Esta herramienta monta material existente, sin generar escenas con IA ni consumir créditos de HeyGen.</p><form class="video-form"><label>Nombre del proyecto<input name="title" maxlength="100" value="La Llave · invitación a Ciudad Central" required></label><div class="video-options"><label>Formato<select name="format"><option value="vertical">Vertical · 1080 × 1920</option><option value="square">Cuadrado · 1080 × 1080</option><option value="landscape">Horizontal · 1920 × 1080</option></select></label><label>Duración<select name="duration"><option value="6">6 segundos</option><option value="10" selected>10 segundos</option><option value="15">15 segundos</option></select></label></div><label>Gancho · escena 1<textarea name="hook" maxlength="120" rows="2" required>Tu próxima lectura tiene una puerta de entrada.</textarea></label><label>Mensaje · escena 2<textarea name="message" maxlength="180" rows="3" required>Suspenso, misterio y distopía en un universo propio.</textarea></label><label>Llamada a la acción · escena 3<input name="cta" maxlength="90" value="Conoce La Llave I: Ciudad Central." required></label><p class="note">Revisa el texto exacto antes de renderizar. La salida queda privada para revisión. No publica ni programa contenido. Un render a la vez, usando el servidor existente y su capacidad disponible.</p><button type="submit">Crear MP4 para revisión</button><p role="status" class="video-status"></p></form><div class="video-projects"><button type="button" class="subtle" data-video-refresh>Actualizar videos</button><div data-video-list>Consultando el motor…</div></div>';
 let refreshTimer=null,refreshing=false,activeId=null,pending=null,submitting=false,serverBusy=false,generation=0;
 const button=panel.querySelector('[type=submit]'),status=panel.querySelector('.video-status');
 const elapsed=job=>Math.max(0,Math.floor((Date.now()-Date.parse(job.createdAt))/1000));
 const elapsedLabel=job=>Math.floor(elapsed(job)/60)+' min '+elapsed(job)%60+' s';
 const describe=job=>job.status==='ready'?'MP4 listo. Ya puedes reproducirlo y descargarlo.':job.status==='failed'?(job.error||'El render no terminó. Revisa el proyecto antes de intentar de nuevo.'):'Renderizando en el servidor · '+elapsedLabel(job)+(Number.isFinite(job.progress)?' · '+job.progress+'%':'')+'. Puede tardar varios minutos; puedes mantener esta página abierta.';
 const syncButton=()=>{button.disabled=submitting||serverBusy;button.textContent=submitting?'Enviando proyecto…':serverBusy?'Renderizando MP4…':'Crear MP4 para revisión';};
 const boundedRequest=(op,body)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('El servidor tardó demasiado en responder. Pulsa Actualizar videos antes de reintentar.')),30000);Promise.resolve().then(()=>request(op,body)).then(resolve,reject).finally(()=>clearTimeout(timer));});
 const refresh=async()=>{
  if(refreshing||!panel.isConnected)return;refreshing=true;const expected=generation;clearTimeout(refreshTimer);refreshTimer=null;
  try{
   const r=await boundedRequest('video-list');if(!panel.isConnected||expected!==generation)return;
   if(!Array.isArray(r.jobs))throw new Error('El servidor devolvió un listado de videos inválido.');
   serverBusy=!!r.busy;const labels={rendering:'Renderizando en el servidor',ready:'MP4 listo · sin publicar',failed:'Render no terminado'};
   panel.querySelector('[data-video-list]').innerHTML='<p class="note">'+escape(r.engine||'HyperFrames')+' '+escape(r.version||'')+' · '+(serverBusy?'Un render en proceso':'Motor disponible')+'</p>'+(r.jobs.length?r.jobs.map(j=>'<section class="video-project"><span class="pill">'+escape(labels[j.status]||j.status)+'</span><h3>'+escape(j.title)+'</h3><p>'+escape(j.format)+' · '+j.duration+' s · '+escape(new Date(j.createdAt).toLocaleString('es-CL',{timeZone:'America/Santiago'}))+'</p>'+(j.status==='rendering'?'<p role="status">'+escape(describe(j))+'</p>':'')+(j.error?'<p role="alert">'+escape(j.error)+'</p>':'')+(j.status==='ready'?'<video controls preload="metadata" aria-label="Vista previa de '+escape(j.title)+'" src="/api/console-066?op=video-file&amp;id='+encodeURIComponent(j.id)+'"></video><a class="video-download" href="/api/console-066?op=video-file&amp;download=1&amp;id='+encodeURIComponent(j.id)+'">Descargar MP4</a>':'')+'</section>').join(''):'<p>Todavía no hay videos. Crea el primer proyecto arriba.</p>');
   const active=r.jobs.find(j=>j.id===activeId)||(serverBusy?r.jobs.find(j=>j.status==='rendering'):null);if(active){activeId=active.id;status.textContent=describe(active);if(active.status!=='rendering')pending=null;}
   if(serverBusy)refreshTimer=setTimeout(refresh,5000);
  }catch(error){if(panel.isConnected&&expected===generation){panel.querySelector('[data-video-list]').textContent=error.message;status.textContent=error.message;}}
  finally{refreshing=false;if(panel.isConnected){syncButton();if(serverBusy&&!refreshTimer)refreshTimer=setTimeout(refresh,5000);}}
 };
 panel.querySelector('[data-video-refresh]').onclick=refresh;
 panel.querySelector('form').addEventListener('invalid',()=>{status.textContent='Completa los campos marcados antes de crear el MP4.';},true);
 panel.querySelector('form').onsubmit=async event=>{
  event.preventDefault();if(submitting||serverBusy)return;submitting=true;generation++;status.textContent='Enviando el proyecto al servidor…';syncButton();
  try{
   const fields=Object.fromEntries(new FormData(event.target));fields.duration=Number(fields.duration);
   if(!pending||JSON.stringify(pending.fields)!==JSON.stringify(fields))pending={fields,id:crypto.randomUUID()};
   activeId=pending.id;
   const result=await boundedRequest('video-render',{...fields,id:pending.id});if(!result.job?.id)throw new Error('El servidor no confirmó un proyecto. Actualiza el listado antes de reintentar.');
   activeId=result.job.id;serverBusy=result.job.status==='rendering';status.textContent=describe(result.job);await refresh();
  }catch(error){status.textContent=error.message;await refresh();}
  finally{submitting=false;if(panel.isConnected)syncButton();}
 };
 void refresh();
 return ()=>{clearTimeout(refreshTimer);refreshTimer=null;};
}
