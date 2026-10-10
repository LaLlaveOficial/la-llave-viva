import {mediaDB,listMedia,readMedia,addMedia,deleteMedia,workspaceKey,defaultWorkspace,parseWorkspace,timelineDuration,addTimelineClip} from './studio-media.js';
// Editor en navegador, sin llamadas a proveedores ni consumo de créditos.
const e=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const number=(n,lo,hi)=>Math.min(hi,Math.max(lo,Number(n)||0));
const fmt=s=>Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0');
const tracks=['V2','V1','A1','A2'];
const tracksNames={V2:'Títulos / capas',V1:'Video / fotogramas',A1:'Voz / diálogos',A2:'Foley / música'};
const allowedTracks={image:['V1','V2'],video:['V1','V2'],audio:['A1','A2'],text:['V2']};
const option=(value,actual,label)=>'<option value="'+e(value)+'"'+(String(actual)===String(value)?' selected':'')+'>'+e(label??value)+'</option>';
const ctrl=(name,label,value,min,max,step)=>'<label>'+label+'<input data-property="'+name+'" type="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+e(value)+'"></label>';
export function studioWorkbenchView(root,notice){
 let db,assets=[],workspace=defaultWorkspace(),selected=null,isPlaying=false,rendering=false,startTick=0,startTime=0;
 let audioCtx=null,mix=null,recorder=null,movieStop=null,media=new Map(),urls=new Map(),cache=new Map(),raf=0;
 const safeLoad=()=>{try{return parseWorkspace(JSON.parse(localStorage.getItem(workspaceKey)||'null'))||defaultWorkspace();}catch{return defaultWorkspace();}};
 workspace=safeLoad();
 function save(){try{localStorage.setItem(workspaceKey,JSON.stringify(workspace));}catch{notice('No se pudo guardar el montaje localmente. Exporta el proyecto JSON.');}}
 function activeClip(c,t){return t>=c.start&&t<c.start+c.duration;}
 function clipSource(c,t){return c.sourceStart+(t-c.start);}
 function seek(t){workspace.playhead=number(t,0,timelineDuration(workspace.clips));save();syncPlayback(true);paint();drawTime();}
 function dimensions(){const r=workspace.aspect==='9:16'?[9,16]:workspace.aspect==='16:9'?[16,9]:workspace.aspect==='1.91:1'?[191,100]:[1,1];const short=workspace.quality==='1080p'?1080:720;const landscape=r[0]>=r[1];const w=landscape?Math.round(short*r[0]/r[1]/2)*2:short;const h=landscape?short:Math.round(short*r[1]/r[0]/2)*2;return {w,h};}
 function findAsset(id){return assets.find(a=>a.id===id);}
 async function getUrl(id){if(urls.has(id))return urls.get(id);const data=await readMedia(db,id);if(!data)return null;const url=URL.createObjectURL(data.blob);urls.set(id,url);return url;}
 async function getMedia(c){
  if(media.has(c.id))return media.get(c.id);
  const asset=findAsset(c.assetId);if(!asset||c.kind==='image'||c.kind==='text')return null;
  const url=await getUrl(c.assetId);if(!url)return null;
  const el=document.createElement(c.kind==='audio'?'audio':'video');el.src=url;el.preload='auto';el.playsInline=true;el.crossOrigin='anonymous';
  el.muted=false;el.volume=1;media.set(c.id,{element:el,gain:null,source:null});
  await new Promise(resolve=>{if(el.readyState>=1){resolve();return;}el.addEventListener('loadedmetadata',resolve,{once:true});el.addEventListener('error',resolve,{once:true});});
  return media.get(c.id);
 }
 async function getPicture(c){if(cache.has(c.assetId))return cache.get(c.assetId);const u=await getUrl(c.assetId);if(!u)return null;const img=new Image();img.src=u;await img.decode().catch(()=>{});cache.set(c.assetId,img);return img;}
 async function prime(){
  await Promise.all(workspace.clips.map(async c=>{try{if(c.kind==='image')await getPicture(c);else if(c.kind!=='text')await getMedia(c);}catch{}}));
 }
 function audioGraph(){
  if(audioCtx)return;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  audioCtx=new AC();mix=audioCtx.createMediaStreamDestination();
 }
 function connectSources(){
  if(!audioCtx)return;
  for(const [id,item] of media){
   if(item.gain)continue;
   try{const src=audioCtx.createMediaElementSource(item.element),gain=audioCtx.createGain();src.connect(gain);gain.connect(audioCtx.destination);gain.connect(mix);item.gain=gain;item.source=src;}
   catch{ /* A broken or unsupported source stays silent rather than failing the session. */ }
  }
 }
 function syncPlayback(force=false){
  const t=workspace.playhead;
  for(const c of workspace.clips){
   const m=media.get(c.id);if(!m)continue;
   const on=activeClip(c,t);
   const target=Math.max(0,clipSource(c,t));
   if(on&&(force||Math.abs(m.element.currentTime-target)>.35))try{m.element.currentTime=target;}catch{}
   if(m.gain)m.gain.gain.value=on?number(c.volume??1,0,2):0;
   if(isPlaying&&on&&m.element.paused)m.element.play().catch(()=>{});
   else if((!isPlaying||!on)&&!m.element.paused)m.element.pause();
  }
 }
 const canvas=()=>root.querySelector('#studiowb-canvas');
 function paint(){
  const cvs=canvas();if(!cvs||!cvs.isConnected)return;
  const {w,h}=dimensions();if(cvs.width!==w)cvs.width=w;if(cvs.height!==h)cvs.height=h;
  const ctx=cvs.getContext('2d');if(!ctx)return;
  ctx.fillStyle='#101417';ctx.fillRect(0,0,w,h);
  const t=workspace.playhead;
  for(const c of workspace.clips.filter(c=>c.kind==='video'||c.kind==='image').sort((a,b)=>tracks.indexOf(b.track)-tracks.indexOf(a.track))){
   if(!activeClip(c,t))continue;
   const source=c.kind==='image'?cache.get(c.assetId):media.get(c.id)?.element;
   if(!source||!(source.videoWidth||source.naturalWidth))continue;
   const sw=source.videoWidth||source.naturalWidth,sh=source.videoHeight||source.naturalHeight;
   const zoom=number(c.scale??1,.25,4)||1;const k=Math.max(w/sw,h/sh)*zoom;
   const dw=sw*k,dh=sh*k,cx=(w-dw)/2+number(c.x??0,-1,1)*w/2,cy=(h-dh)/2+number(c.y??0,-1,1)*h/2;
   ctx.save();ctx.globalAlpha=number(c.opacity??1,0,1);ctx.filter='brightness('+number(c.brightness??100,0,200)+'%) contrast('+number(c.contrast??100,0,200)+'%) saturate('+number(c.saturation??100,0,200)+'%) blur('+number(c.blur??0,0,20)+'px)';
   try{ctx.drawImage(source,cx,cy,dw,dh);}catch{}
   ctx.restore();
  }
  for(const c of workspace.clips.filter(c=>c.kind==='text'&&activeClip(c,t))){
   const size=Math.round(h/18);
   ctx.save();ctx.globalAlpha=number(c.opacity??1,0,1);ctx.font='700 '+size+'px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#000';ctx.shadowBlur=14;ctx.lineWidth=Math.max(3,size/9);ctx.strokeStyle='#000';
   const text=(c.text||'TÍTULO').slice(0,180).split('\n');
   text.forEach((line,i)=>{const y=h*.78+i*size*1.2;ctx.strokeText(line,w/2,y,w*.9);ctx.fillStyle='#fff';ctx.fillText(line,w/2,y,w*.9);});
   ctx.restore();
  }
 }
 function drawTime(){const label=root.querySelector('#studiowb-time');if(label)label.textContent=fmt(workspace.playhead)+' / '+fmt(timelineDuration(workspace.clips));const seekEl=root.querySelector('#studiowb-seek');if(seekEl){seekEl.max=String(timelineDuration(workspace.clips));seekEl.value=String(workspace.playhead);}}
 function tick(){
  if(!isPlaying)return;
  if(!root.isConnected){pause();return;}
  workspace.playhead=Math.min(timelineDuration(workspace.clips),startTime+(performance.now()-startTick)/1000);
  syncPlayback();paint();drawTime();
  if(workspace.playhead>=timelineDuration(workspace.clips)){pause();if(rendering&&movieStop)movieStop();return;}
  raf=window.requestAnimationFrame(tick);
 }
 function pause(){
  isPlaying=false;window.cancelAnimationFrame?.(raf);for(const m of media.values())m.element.pause();
  const b=root.querySelector('#studiowb-play');if(b)b.textContent='▶ Reproducir';save();
 }
 async function play(){
  if(isPlaying){pause();return;}
  try{audioGraph();await audioCtx?.resume();await prime();connectSources();}catch{}
  isPlaying=true;startTime=workspace.playhead;startTick=performance.now();syncPlayback(true);
  const b=root.querySelector('#studiowb-play');if(b)b.textContent='⏸ Pausar';
  tick();
 }
 async function saveExport(){
  if(rendering)return;
  if(!window.MediaRecorder||!canvas()?.captureStream){notice('Tu navegador no admite exportación mediante MediaRecorder.');return;}
  if(workspace.clips.length===0){notice('Agrega al menos un clip al timeline.');return;}
  if(timelineDuration(workspace.clips)>120){notice('Por seguridad, exporta secuencias de hasta 120 segundos.');return;}
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
  if(!mime){notice('Este navegador no permite exportar WebM.');return;}
  rendering=true;
  const button=root.querySelector('#studiowb-export');if(button){button.disabled=true;button.textContent='Renderizando en tiempo real…';}
  try{
   pause();workspace.playhead=0;await prime();audioGraph();await audioCtx?.resume();connectSources();syncPlayback(true);paint();
   const stream=canvas().captureStream(workspace.fps);
   const tracksToRecord=[...stream.getVideoTracks(),...(mix?mix.stream.getAudioTracks():[])];
   const recordingStream=new MediaStream(tracksToRecord),parts=[];
   recorder=new MediaRecorder(recordingStream,{mimeType:mime,videoBitsPerSecond:workspace.quality==='1080p'?8000000:4000000});
   const finished=new Promise((resolve,reject)=>{recorder.ondataavailable=ev=>{if(ev.data.size)parts.push(ev.data);};recorder.onerror=()=>reject(new Error('Falló MediaRecorder.'));recorder.onstop=()=>resolve();});
   recorder.start(250);
   movieStop=()=>{if(recorder?.state==='recording')recorder.stop();};
   await play();
   await finished;
   const blob=new Blob(parts,{type:mime});
   if(blob.size<1000)throw new Error('El navegador no produjo un video válido.');
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='estudio066-'+workspace.aspect.replace(':','x')+'-'+workspace.quality+'.webm';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
   notice('Video WebM exportado. Verifica audio, fotogramas y calidad antes de publicarlo.');
  }catch(error){notice('No se pudo exportar: '+error.message);}
  finally{pause();rendering=false;movieStop=null;if(button){button.disabled=false;button.textContent='Exportar WebM';}if(recorder?.state==='recording')recorder.stop();}
 }
 function mediaCard(a){
  return '<div class="wb-media-item"><div><b>'+e(a.name)+'</b><small>'+e(a.kind.toUpperCase())+' · '+(a.size/1048576).toFixed(1)+' MB · Solo este navegador</small></div><div class="wb-row"><button type="button" class="subtle" data-add-asset="'+e(a.id)+'">+ Timeline</button><button type="button" class="subtle" data-remove-asset="'+e(a.id)+'" aria-label="Quitar archivo">✕</button></div></div>';
 }
 function propertyPanel(){
  const c=workspace.clips.find(x=>x.id===selected);
  if(!c)return '<div class="wb-inspector"><h3>Inspector</h3><p class="studio-help">Selecciona un clip del timeline para ajustar inicio, duración, pista, volumen, color y prompt.</p></div>';
  const available=allowedTracks[c.kind];
  return '<div class="wb-inspector"><h3>Inspector · '+e(c.kind)+'</h3>'+
   '<label>Pista<select data-property="track">'+available.map(t=>option(t,c.track,t+' · '+tracksNames[t])).join('')+'</select></label>'+
   '<div class="studio-fields">'+ctrl('start','Inicio (s)',c.start,0,600,.1)+ctrl('duration','Duración (s)',c.duration,.1,120,.1)+ctrl('sourceStart','Entrada del original (s)',c.sourceStart??0,0,600,.1)+ctrl('volume','Volumen',c.volume??1,0,2,.1)+'</div>'+
   (c.kind==='text'?'<label>Texto de pantalla<textarea data-property="text" rows="3" maxlength="180">'+e(c.text)+'</textarea></label>':'')+
   (c.kind!=='audio'?'<h4>Imagen y efectos</h4><div class="studio-fields">'+ctrl('brightness','Brillo %',c.brightness??100,0,200,5)+ctrl('contrast','Contraste %',c.contrast??100,0,200,5)+ctrl('saturation','Saturación %',c.saturation??100,0,200,5)+ctrl('blur','Desenfoque',c.blur??0,0,20,1)+ctrl('opacity','Opacidad',c.opacity??1,0,1,.1)+ctrl('scale','Zoom',c.scale??1,.25,4,.1)+ctrl('x','Posición X',c.x??0,-1,1,.1)+ctrl('y','Posición Y',c.y??0,-1,1,.1)+'</div>':'')+
   '<h4>Guion y prompt de generación</h4><label>Prompt técnico (no consume créditos)<textarea data-property="prompt" rows="5" maxlength="3000" placeholder="Camera movement, shot composition, character continuity, lighting and negatives...">'+e(c.prompt||'')+'</textarea></label>'+
   '<div class="wb-row"><button type="button" class="subtle" id="studiowb-copy">Copiar prompt</button><button type="button" class="subtle" id="studiowb-duplicate">Duplicar</button><button type="button" class="subtle" id="studiowb-delete">Eliminar clip</button></div>'+
   '<p class="studio-help">Los cambios se guardan en este navegador. El render incluye títulos, imagen, sonido compatible y filtros básicos; no son efectos de Premiere ni un render GPU remoto.</p></div>';
 }
 function timeRuler(){
  const duration=timelineDuration(workspace.clips),interval=duration>90?15:duration>30?5:2;
  let ticks='';for(let t=0;t<=duration;t+=interval){ticks+='<span style="left:'+(t/duration*100).toFixed(3)+'%">'+fmt(t)+'</span>';}
  return ticks;
 }
 function timeline(){
  const duration=timelineDuration(workspace.clips);
  return '<div class="wb-timeline"><div class="wb-ruler"><div class="wb-track-label">Timeline</div><div class="wb-ruler-times">'+timeRuler()+'</div></div>'+
   tracks.map(track=>'<div class="wb-track"><div class="wb-track-label"><strong>'+track+'</strong><small>'+tracksNames[track]+'</small></div><div class="wb-track-content" data-timeline-seek="'+track+'">'+workspace.clips.filter(c=>c.track===track).map(c=>{
    const asset=findAsset(c.assetId),left=c.start/duration*100,width=c.duration/duration*100;
    return '<button type="button" data-select-clip="'+e(c.id)+'" class="wb-block '+(selected===c.id?'selected ':'')+'wb-'+e(c.kind)+'" style="left:'+left.toFixed(3)+'%;width:'+Math.max(.75,width).toFixed(3)+'%" title="'+e(c.kind==='text'?c.text:(asset?.name||'Archivo no encontrado'))+'">'+e(c.kind==='text'?(c.text||'TÍTULO'):(asset?.name||'Archivo perdido'))+'</button>';
   }).join('')+'<div class="wb-cursor" style="left:'+(workspace.playhead/duration*100).toFixed(3)+'%"></div></div></div>').join('')+'</div>';
 }
 function page(){
  return '<div class="wb-root"><div class="wb-top"><div><span class="studio-caption">MONTAJE · EDITOR LOCAL NO DESTRUCTIVO</span><h3>Estudio de montaje 066</h3></div><div class="wb-row"><button type="button" class="subtle" id="studiowb-backup">Exportar proyecto JSON</button><label class="wb-file-label">Importar proyecto JSON<input id="studiowb-restore" type="file" accept=".json,application/json"></label></div></div>'+
   '<div class="wb-settings"><label>Proyecto<input id="studiowb-name" maxlength="160" value="'+e(workspace.name)+'"></label><label>Formato<select id="studiowb-aspect">'+['9:16','16:9','1:1','1.91:1'].map(v=>option(v,workspace.aspect)).join('')+'</select></label><label>Exportación<select id="studiowb-quality">'+['720p','1080p'].map(v=>option(v,workspace.quality)).join('')+'</select></label><label>FPS<select id="studiowb-fps">'+[24,30].map(v=>option(v,workspace.fps,v+' fps')).join('')+'</select></label></div>'+
   '<div class="wb-workarea"><aside class="wb-library"><h3>Biblioteca de medios</h3><p class="studio-help">Archivos locales guardados en tu navegador (IndexedDB), no en Neon ni en la nube. Haz copias de los originales.</p><label class="wb-file-label">+ Importar video, imagen o audio<input type="file" id="studiowb-upload" multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,audio/*"></label>'+
   '<div class="wb-media-list">'+(assets.length?assets.map(mediaCard).join(''):'<p class="studio-help">Importa un archivo para comenzar.</p>')+'</div><button type="button" class="subtle" id="studiowb-title">+ Añadir título</button></aside>'+
   '<div class="wb-stage"><div class="wb-preview-box"><canvas id="studiowb-canvas" aria-label="Vista previa de composición"></canvas></div><div class="wb-controls"><button type="button" class="subtle" id="studiowb-play">▶ Reproducir</button><button type="button" class="subtle" id="studiowb-stop">■ Inicio</button><strong id="studiowb-time"></strong><button type="button" id="studiowb-export">Exportar WebM</button></div><input id="studiowb-seek" type="range" min="0" max="5" step=".05" value="'+workspace.playhead+'" aria-label="Posición en montaje"><p class="studio-help">La exportación usa el navegador en tiempo real, máximo 120 s. WebM, no MP4. 2K/4K y edición avanzada se implementarán con render remoto.</p></div>'+
   propertyPanel()+'</div>'+timeline()+'<p class="studio-help">Selecciona un clip para modificarlo desde el Inspector. Puedes moverlo de pista, cambiar duración, entrada del archivo, filtros, guion y duplicarlo. Los audios van en A1/A2.</p></div>';
 }
 function render(){
  pause();root.innerHTML=page();wire();paint();drawTime();
 }
 function wire(){
  const el=(id)=>root.querySelector('#'+id);
  el('studiowb-name').onchange=ev=>{workspace.name=ev.target.value.slice(0,160);save();};
  el('studiowb-aspect').onchange=ev=>{workspace.aspect=ev.target.value;save();paint();};
  el('studiowb-quality').onchange=ev=>{workspace.quality=ev.target.value;save();paint();};
  el('studiowb-fps').onchange=ev=>{workspace.fps=Number(ev.target.value);save();};
  el('studiowb-play').onclick=()=>play();
  el('studiowb-stop').onclick=()=>{pause();seek(0);};
  el('studiowb-seek').oninput=ev=>{pause();seek(Number(ev.target.value));};
  el('studiowb-export').onclick=saveExport;
  el('studiowb-upload').onchange=async ev=>{
   const files=Array.from(ev.target.files||[]);let ok=0;
   for(const f of files){try{await addMedia(db,f);ok++;}catch(error){notice(error.message);}}
   assets=await listMedia(db);render();notice(ok+' archivo(s) importados en este navegador.');
  };
  root.querySelectorAll('[data-add-asset]').forEach(b=>b.onclick=async()=>{
   const asset=findAsset(b.dataset.addAsset);if(!asset)return;
   const c=addTimelineClip(asset,workspace.clips);workspace.clips.push(c);selected=c.id;await prime();save();render();
  });
  root.querySelectorAll('[data-remove-asset]').forEach(b=>b.onclick=async()=>{
   if(!confirm('¿Eliminar el archivo local y sus clips en este montaje? No afecta el archivo original de tu PC.'))return;
   const id=b.dataset.removeAsset;await deleteMedia(db,id);workspace.clips=workspace.clips.filter(c=>c.assetId!==id);assets=await listMedia(db);selected=null;
   const url=urls.get(id);if(url){URL.revokeObjectURL(url);urls.delete(id);}
   save();render();
  });
  el('studiowb-title').onclick=()=>{const c={id:crypto.randomUUID(),assetId:'',kind:'text',track:'V2',start:workspace.playhead,duration:4,sourceStart:0,text:'CASO 066',volume:0,opacity:1};workspace.clips.push(c);selected=c.id;save();render();};
  root.querySelectorAll('[data-select-clip]').forEach(b=>b.onclick=()=>{selected=b.dataset.selectClip;render();});
  root.querySelectorAll('[data-timeline-seek]').forEach(b=>b.onclick=ev=>{
   if(ev.target!==b)return;const r=b.getBoundingClientRect();pause();seek((ev.clientX-r.left)/r.width*timelineDuration(workspace.clips));
  });
  root.querySelectorAll('[data-property]').forEach(el=>el.onchange=ev=>{
   const c=workspace.clips.find(x=>x.id===selected);if(!c)return;
   const key=ev.target.dataset.property,value=ev.target.value;
   if(key==='track'){if(allowedTracks[c.kind].includes(value))c.track=value;}
   else if(['text','prompt'].includes(key))c[key]=value.slice(0,key==='text'?180:3000);
   else {const ranges={start:[0,600],duration:[.1,120],sourceStart:[0,600],volume:[0,2],brightness:[0,200],contrast:[0,200],saturation:[0,200],blur:[0,20],opacity:[0,1],scale:[.25,4],x:[-1,1],y:[-1,1]};if(ranges[key])c[key]=number(value,...ranges[key]);}
   if(c.start+c.duration>600)c.duration=Math.max(.1,600-c.start);
   save();render();
  });
  const selectedClip=workspace.clips.find(c=>c.id===selected);
  if(selectedClip){
   el('studiowb-delete').onclick=()=>{workspace.clips=workspace.clips.filter(c=>c.id!==selected);media.get(selected)?.element.pause();media.delete(selected);selected=null;save();render();};
   el('studiowb-duplicate').onclick=()=>{const copy={...selectedClip,id:crypto.randomUUID(),start:selectedClip.start+selectedClip.duration};workspace.clips.push(copy);selected=copy.id;save();render();};
   el('studiowb-copy').onclick=()=>{const text=selectedClip.prompt||'';if(!text){notice('Escribe primero el prompt.');return;}if(!navigator.clipboard?.writeText){notice('Selecciona y copia el prompt manualmente.');return;}navigator.clipboard.writeText(text).then(()=>notice('Prompt copiado.'),()=>notice('No se pudo copiar. Selecciona el texto del campo.'));};
  }
  el('studiowb-backup').onclick=()=>{const blob=new Blob([JSON.stringify(workspace,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='estudio066-timeline.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);notice('Proyecto JSON exportado. Los archivos multimedia originales NO se incluyen.');};
  el('studiowb-restore').onchange=async ev=>{
   const file=ev.target.files?.[0];if(!file||file.size>150000)return;
   try{const candidate=parseWorkspace(JSON.parse(await file.text()));if(!candidate)throw new Error('Estructura no válida');
    if(!confirm('¿Reemplazar este montaje local con el archivo JSON?'))return;
    workspace=candidate;selected=null;save();render();notice('Montaje restaurado. Debes mantener los archivos en esta biblioteca local.');
   }catch(error){notice('No se importó: '+error.message);}
  };
 }
 async function init(){
  try{db=await mediaDB();assets=await listMedia(db);
   if(!root.isConnected)return;render();await prime();paint();root.querySelector('.wb-root')?.setAttribute('data-ready','true');
  }catch(error){root.innerHTML='<div class="studio-pane"><h3>Biblioteca local no disponible</h3><p>'+e(error.message)+'</p><p>Revisa que el navegador permita almacenamiento del sitio.</p></div>';}
 }
 root.innerHTML='<div class="studio-pane"><p>Preparando biblioteca multimedia local…</p></div>';
 init();
 return ()=>{
  pause();for(const m of media.values()){m.element.pause();m.element.removeAttribute('src');m.element.load();}
  media.clear();for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();cache.clear();
  try{db?.close();}catch{}
  try{audioCtx?.close();}catch{}
 };
}
