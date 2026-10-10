import {mediaDB,listMedia,readMedia,addMedia,trashMedia,restoreMedia,listTrashedMedia,workspaceKey,defaultWorkspace,parseWorkspace,timelineDuration,addTimelineClip} from './studio-media.js';
import {exportPortableBackup,importPortableBackup} from './studio-portable.js';
import {mountStudioCloud} from './studio-cloud066.js';
import {exportCanvasRecording,exportFormatCapabilities,recordingBitrate} from './studio-recording.js';
import {preflightExportMedia,formatExportPreflightError} from './studio-export-preflight.js';
import {insertClipAt,splitClipAt,snapToEdges,trackPosition} from './studio-timeline-tools.js';
// Editor en navegador, sin llamadas a proveedores ni consumo de créditos.
const e=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const number=(n,lo,hi)=>Math.min(hi,Math.max(lo,Number(n)||0));
const fmt=s=>Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0');
const tracks=['V2','V1','A1','A2'];
const tracksNames={V2:'Títulos / capas',V1:'Video / fotogramas',A1:'Voz / diálogos',A2:'Foley / música'};
const allowedTracks={image:['V1','V2'],video:['V1','V2'],audio:['A1','A2'],text:['V2']};
const option=(value,actual,label)=>'<option value="'+e(value)+'"'+(String(actual)===String(value)?' selected':'')+'>'+e(label??value)+'</option>';
const ctrl=(name,label,value,min,max,step)=>'<label>'+label+'<input data-property="'+name+'" type="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+e(value)+'"></label>';
export function studioWorkbenchView(root,notice,project=null){
 let db,assets=[],workspace=defaultWorkspace(),selected=null,isPlaying=false,rendering=false,startTick=0,startTime=0;
 let audioCtx=null,mix=null,recorder=null,movieStop=null,media=new Map(),urls=new Map(),cache=new Map(),raf=0;
 let cloudDispose=null,exportAbort=null,timelineZoom=1,snapping=true,trash=[],showLocalTrash=false,editingTool='select';
 const history=[],future=[];
 const checkpoint=()=>{history.push(JSON.stringify(workspace));if(history.length>30)history.shift();future.length=0;};
 const restoreFrom=(source,dest)=>{if(!source.length)return;dest.push(JSON.stringify(workspace));workspace=parseWorkspace(JSON.parse(source.pop()))||defaultWorkspace();selected=null;save();render();};
 const localKey=workspaceKey+':'+(project&&Number.isSafeInteger(Number(project.id))?Number(project.id):'scratch');
 const firstWorkspace=()=>({...defaultWorkspace(),name:project?.name||defaultWorkspace().name});
 const safeLoad=()=>{try{return parseWorkspace(JSON.parse(localStorage.getItem(localKey)||'null'))||firstWorkspace();}catch{return firstWorkspace();}};
 workspace=safeLoad();
 function save(){try{localStorage.setItem(localKey,JSON.stringify(workspace));}catch{notice('No se pudo guardar el montaje localmente. Exporta el proyecto JSON.');}}
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
  await new Promise(resolve=>{if(el.readyState>=1){resolve();return;}let timer;const done=()=>{clearTimeout(timer);el.removeEventListener('loadedmetadata',done);el.removeEventListener('error',done);resolve();};el.addEventListener('loadedmetadata',done,{once:true});el.addEventListener('error',done,{once:true});timer=setTimeout(done,8000);});
  el.addEventListener('seeked',paint);el.addEventListener('loadeddata',paint);
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
  const t=Math.min(workspace.playhead,Math.max(0,timelineDuration(workspace.clips)-1/Math.max(24,workspace.fps)));
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
  raf=root.ownerDocument.defaultView.requestAnimationFrame(tick);
 }
 function pause(){
  isPlaying=false;root.ownerDocument.defaultView?.cancelAnimationFrame?.(raf);for(const m of media.values())m.element.pause();
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
  if(workspace.clips.length===0){notice('Agrega al menos un clip al timeline.');return;}
  const duration=timelineDuration(workspace.clips);
  if(duration>120){notice('Por seguridad, exporta secuencias de hasta 120 segundos.');return;}
  const before=workspace.playhead;
  const outputFormat=workspace.exportFormat||'webm';
  if(outputFormat==='mp4'&&!exportFormatCapabilities(window.MediaRecorder).mp4){notice('Este navegador no ofrece MP4 H.264. Selecciona WebM o espera el render remoto.');return;}
  rendering=true;
  exportAbort=new AbortController();
  const button=root.querySelector('#studiowb-export'),seekBar=root.querySelector('#studiowb-seek'),playBtn=root.querySelector('#studiowb-play');
  if(button){button.disabled=true;button.textContent='Renderizando '+outputFormat.toUpperCase()+'…';}
  if(seekBar)seekBar.disabled=true;
  if(playBtn)playBtn.disabled=true;
  try{
   pause();workspace.playhead=0;
   await prime();
   if(exportAbort.signal.aborted)throw new Error('Exportación cancelada.');
   const preflight=await preflightExportMedia({clips:workspace.clips,assets,read:id=>readMedia(db,id),loadImage:c=>getPicture(c),loadMedia:c=>getMedia(c)});
   if(!preflight.ok){notice(formatExportPreflightError(preflight));return;}
   const useAudio=workspace.clips.some(c=>c.kind==='audio'||c.kind==='video');
   if(useAudio){audioGraph();await audioCtx?.resume();connectSources();}
   isPlaying=true;syncPlayback(true);paint();
   const {blob,format}=await exportCanvasRecording({
    canvas:canvas(),seconds:duration,fps:workspace.fps,format:outputFormat,
    audioTracks:useAudio&&mix?mix.stream.getAudioTracks():[],
    bitrate:recordingBitrate(workspace.quality,workspace.encodingQuality||'high'),
    signal:exportAbort.signal,
    onFrame:async elapsed=>{
     workspace.playhead=Math.min(elapsed,Math.max(0,duration-1/(workspace.fps*4)));
     syncPlayback();paint();drawTime();
    }
   });
   if(exportAbort.signal.aborted)return;
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='estudio066-'+workspace.aspect.replace(':','x')+'-'+workspace.quality+'-'+(workspace.encodingQuality||'high')+'.'+format;
   a.click();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
   notice(format.toUpperCase()+' exportado ('+(blob.size/1048576).toFixed(2)+' MB). Revisa duración, audio y calidad antes de publicar.');
  }catch(error){
   if(!exportAbort?.signal.aborted)notice('No se pudo exportar: '+error.message);
  }finally{
   pause();workspace.playhead=before;syncPlayback(true);paint();drawTime();
   rendering=false;exportAbort=null;
   if(button){button.disabled=false;button.textContent='Exportar '+outputFormat.toUpperCase();}
   if(seekBar)seekBar.disabled=false;
   if(playBtn)playBtn.disabled=false;
  }
 }
 function mediaCard(a,discarded=false){
  return '<div class="wb-media-item" '+(discarded?'':'draggable="true" data-drag-asset="'+e(a.id)+'"')+'><div class="wb-media-tile"><div class="wb-thumb">'+(a.kind==='image'?'<img loading="lazy" data-media-thumb="'+e(a.id)+'" alt="'+e(a.name)+'">':a.kind==='video'?'▶':'♫')+'</div><div><b>'+e(a.name)+'</b><small>'+e(a.kind.toUpperCase())+' · '+(a.size/1048576).toFixed(1)+' MB</small></div></div><div class="wb-row">'+(discarded?'<button type="button" class="subtle" data-revive-asset="'+e(a.id)+'">↶ Restaurar</button>':'<button type="button" class="subtle" data-add-asset="'+e(a.id)+'">+ Al final</button><button type="button" class="subtle" data-insert-asset="'+e(a.id)+'">+ En cabezal</button><button type="button" class="subtle" data-remove-asset="'+e(a.id)+'">Papelera</button>')+'</div></div>';
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
  return '<div class="wb-timeline" style="--wb-lane-min:'+Math.round(500*timelineZoom)+'px"><div class="wb-ruler"><div class="wb-track-label">Timeline</div><div class="wb-ruler-times">'+timeRuler()+'</div></div>'+
   tracks.map(track=>'<div class="wb-track"><div class="wb-track-label"><strong>'+track+'</strong><small>'+tracksNames[track]+'</small></div><div class="wb-track-content" data-timeline-seek="'+track+'">'+workspace.clips.filter(c=>c.track===track).map(c=>{
    const asset=findAsset(c.assetId),left=c.start/duration*100,width=c.duration/duration*100;
    return '<button type="button" data-select-clip="'+e(c.id)+'" class="wb-block '+(selected===c.id?'selected ':'')+'wb-'+e(c.kind)+'" style="left:'+left.toFixed(3)+'%;width:'+Math.max(.75,width).toFixed(3)+'%" title="'+e(c.kind==='text'?c.text:(asset?.name||'Archivo no encontrado'))+'">'+e(c.kind==='text'?(c.text||'TÍTULO'):(asset?.name||'Archivo perdido'))+'<span class="wb-trim-left" title="Arrastrar para ajustar la entrada"></span><span class="wb-trim-right" title="Arrastrar para recortar la salida"></span></button>';
   }).join('')+'<div class="wb-cursor" style="left:'+(workspace.playhead/duration*100).toFixed(3)+'%"></div></div></div>').join('')+'</div>';
 }
 function page(){
  return '<div class="wb-root"><div class="wb-top"><div><span class="studio-caption">MONTAJE · EDITOR LOCAL NO DESTRUCTIVO</span><h3>Estudio de montaje 066</h3><p class="studio-help">'+e(project?.name||'Montaje libre')+' · Guardado en este navegador</p></div><div class="wb-row"><button type="button" class="subtle" id="studiowb-undo">↶ Deshacer</button><button type="button" class="subtle" id="studiowb-redo">↷ Rehacer</button><button type="button" class="subtle" id="studiowb-backup">Exportar proyecto JSON</button><label class="wb-file-label">Importar proyecto JSON<input id="studiowb-restore" type="file" accept=".json,application/json"></label><button type="button" class="subtle" id="studiowb-portable-export"'+(!project?.id?' disabled':'')+'>Respaldo completo con medios</button><label class="wb-file-label">Restaurar respaldo completo<input id="studiowb-portable-import" type="file" accept=".json,application/json" '+(!project?.id?'disabled':'')+'></label></div></div>'+
   '<div class="wb-settings"><label>Proyecto<input id="studiowb-name" maxlength="160" value="'+e(workspace.name)+'"></label><label>Orientación<select id="studiowb-aspect">'+['9:16','16:9','1:1','1.91:1'].map(v=>option(v,workspace.aspect)).join('')+'</select></label><label>Resolución<select id="studiowb-quality">'+['720p','1080p'].map(v=>option(v,workspace.quality)).join('')+'</select></label><label>FPS<select id="studiowb-fps">'+[24,30].map(v=>option(v,workspace.fps,v+' fps')).join('')+'</select></label><label>Archivo<select id="studiowb-format">'+option('webm',workspace.exportFormat||'webm','WebM · VP9/VP8')+option('mp4',workspace.exportFormat||'webm','MP4 · H.264'+(exportFormatCapabilities(window.MediaRecorder).mp4?'':' · no disponible')).replace('<option','<option'+(exportFormatCapabilities(window.MediaRecorder).mp4?'':' disabled'))+'</select></label><label>Calidad<select id="studiowb-encode-quality">'+[['standard','Estándar'],['high','Alta'],['master','Máster']].map(([v,l])=>option(v,workspace.encodingQuality||'high',l)).join('')+'</select></label></div>'+
   '<div class="wb-edit-toolbar" role="toolbar" aria-label="Herramientas del timeline"><button id="studiowb-select-tool" aria-pressed="'+(editingTool==='select')+'">↖ Seleccionar</button><button id="studiowb-blade-tool" aria-pressed="'+(editingTool==='blade')+'">✂ Cortar</button><button id="studiowb-split">Dividir en cabezal</button><button id="studiowb-snap" aria-pressed="'+snapping+'">🧲 Imán '+(snapping?'activado':'apagado')+'</button><label>Zoom <input id="studiowb-zoom" aria-label="Zoom del timeline" type="range" min="1" max="5" step=".5" value="'+timelineZoom+'"></label><small>Arrastra archivos desde la biblioteca a las pistas. En móvil usa «En cabezal».</small></div>'+
   '<div class="wb-workarea"><aside class="wb-library"><h3>Biblioteca de medios</h3><p class="studio-help">Archivos locales guardados en tu navegador (IndexedDB), no en Neon ni en la nube. Haz copias de los originales.</p><label class="wb-file-label">+ Importar video, imagen o audio<input type="file" id="studiowb-upload" multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,audio/*"></label>'+
   '<div class="wb-library-head"><button id="studiowb-local-library" class="subtle" type="button" aria-pressed="'+(!showLocalTrash)+'">Archivos ('+assets.length+')</button><button id="studiowb-local-trash" class="subtle" type="button" aria-pressed="'+showLocalTrash+'">Papelera ('+trash.length+')</button></div><div class="wb-media-list">'+(showLocalTrash?(trash.length?trash.map(a=>mediaCard(a,true)).join(''):'<p class="studio-help">Papelera vacía.</p>'):(assets.length?assets.map(a=>mediaCard(a,false)).join(''):'<p class="studio-help">Importa archivos o recupéralos de la nube.</p>'))+'</div><button type="button" class="subtle" id="studiowb-title">+ Añadir título</button><div id="studiowb-cloud" class="wb-cloud-wrap"></div></aside>'+
   '<div class="wb-stage">'+(workspace.clips.some(c=>c.kind!=='text'&&!findAsset(c.assetId))?'<p class="studio-help wb-media-warning" role="status">Este montaje incluye medios que faltan en este navegador. Recupera los originales desde Biblioteca privada antes de exportar.</p>':'')+'<div class="wb-preview-box"><canvas id="studiowb-canvas" aria-label="Vista previa de composición"></canvas></div><div class="wb-controls"><button type="button" class="subtle" id="studiowb-play">▶ Reproducir</button><button type="button" class="subtle" id="studiowb-stop">■ Inicio</button><strong id="studiowb-time"></strong><button type="button" id="studiowb-export">Exportar '+e((workspace.exportFormat||'webm').toUpperCase())+'</button></div><input id="studiowb-seek" type="range" min="0" max="5" step=".05" value="'+workspace.playhead+'" aria-label="Posición en montaje"><p class="studio-help">1080p y calidad Máster son opciones reales de codificación del navegador, pero no garantizan detalle extra del original. MP4 solo si Chrome permite H.264; el audio MP4 requiere AAC. 2K/4K y MP4 profesional universal requerirán render remoto.</p></div>'+
   propertyPanel()+'</div>'+timeline()+'<p class="studio-help">Selecciona un clip para modificarlo desde el Inspector. Puedes moverlo de pista, cambiar duración, entrada del archivo, filtros, guion y duplicarlo. Los audios van en A1/A2.</p></div>';
 }
 function render(){
  pause();if(cloudDispose){cloudDispose();cloudDispose=null;}
  root.innerHTML=page();wire();paint();drawTime();
  root.querySelectorAll('[data-media-thumb]').forEach(async image=>{const id=image.dataset.mediaThumb;try{const url=await getUrl(id);if(root.isConnected&&image.isConnected&&url)image.src=url;}catch{}});
  if(project?.id&&db)cloudDispose=mountStudioCloud(root.querySelector('#studiowb-cloud'),{projectId:Number(project.id),db,workspace,notice,onMediaAdded:async()=>{assets=await listMedia(db);trash=await listTrashedMedia(db);await prime();render();}});
 }
 function wire(){
  const el=(id)=>root.querySelector('#'+id);
  const splitSelected=()=>{
   let target=workspace.clips.find(c=>c.id===selected&&workspace.playhead>c.start+.1&&workspace.playhead<c.start+c.duration-.1);
   if(!target)target=workspace.clips.find(c=>c.track==='V1'&&workspace.playhead>c.start+.1&&workspace.playhead<c.start+c.duration-.1);
   if(!target){notice('Coloca el cabezal dentro de un clip antes de cortarlo.');return;}
   const pieces=splitClipAt(workspace.clips,target.id,workspace.playhead);
   if(!pieces){notice('El corte está demasiado cerca del borde del clip.');return;}
   checkpoint();workspace.clips=pieces;selected=pieces.at(-1).id;save();render();
  };
  el('studiowb-select-tool').onclick=()=>{editingTool='select';render();};
  el('studiowb-blade-tool').onclick=()=>{editingTool='blade';render();};
  el('studiowb-snap').onclick=()=>{snapping=!snapping;render();};
  el('studiowb-zoom').oninput=ev=>{timelineZoom=Number(ev.target.value);root.querySelector('.wb-timeline')?.style.setProperty('--wb-lane-min',Math.round(500*timelineZoom)+'px');};
  el('studiowb-split').onclick=splitSelected;
  el('studiowb-local-library').onclick=()=>{showLocalTrash=false;render();};
  el('studiowb-local-trash').onclick=()=>{showLocalTrash=true;render();};
  root.querySelectorAll('[data-revive-asset]').forEach(b=>b.onclick=async()=>{
   if(await restoreMedia(db,b.dataset.reviveAsset)){assets=await listMedia(db);trash=await listTrashedMedia(db);showLocalTrash=false;await prime();render();notice('Original restaurado en la biblioteca local.');}
  });
  const addFromLibrary=async(id,{start=null,track=null}={})=>{
   const asset=findAsset(id);if(!asset)return;
   const clip=addTimelineClip(asset,workspace.clips);
   try{
    const next=start===null?clip:insertClipAt(asset,clip,snapToEdges(start,workspace.clips,null,{enabled:snapping}),track||clip.track);
    checkpoint();workspace.clips.push(next);selected=next.id;save();await prime();render();
   }catch(error){notice(error.message);}
  };
  root.querySelectorAll('[data-insert-asset]').forEach(b=>b.onclick=()=>addFromLibrary(b.dataset.insertAsset,{start:workspace.playhead}));
  root.querySelectorAll('[data-drag-asset]').forEach(card=>card.ondragstart=ev=>{
    ev.dataTransfer?.setData('text/plain',card.dataset.dragAsset);
    if(ev.dataTransfer)ev.dataTransfer.effectAllowed='copy';
  });
  root.querySelectorAll('[data-timeline-seek]').forEach(lane=>{
    lane.ondragover=ev=>{if(ev.dataTransfer?.types?.includes('text/plain')){ev.preventDefault();lane.classList.add('wb-drop-ready');}};
    lane.ondragleave=()=>lane.classList.remove('wb-drop-ready');
    lane.ondrop=ev=>{ev.preventDefault();lane.classList.remove('wb-drop-ready');
      const assetId=ev.dataTransfer?.getData('text/plain'),asset=findAsset(assetId);
      if(!asset)return;const rect=lane.getBoundingClientRect();
      addFromLibrary(assetId,{start:trackPosition(ev.clientX,rect.left,rect.width,timelineDuration(workspace.clips)),track:lane.dataset.timelineSeek});
    };
  });
  el('studiowb-undo').onclick=()=>restoreFrom(history,future);
  el('studiowb-redo').onclick=()=>restoreFrom(future,history);
  el('studiowb-name').onchange=ev=>{checkpoint();workspace.name=ev.target.value.slice(0,160);save();};
  el('studiowb-aspect').onchange=ev=>{checkpoint();workspace.aspect=ev.target.value;save();paint();};
  el('studiowb-quality').onchange=ev=>{checkpoint();workspace.quality=ev.target.value;save();paint();};
  el('studiowb-fps').onchange=ev=>{checkpoint();workspace.fps=Number(ev.target.value);save();};
  el('studiowb-format').onchange=ev=>{checkpoint();workspace.exportFormat=ev.target.value;save();render();};
  el('studiowb-encode-quality').onchange=ev=>{checkpoint();workspace.encodingQuality=ev.target.value;save();};
  el('studiowb-play').onclick=()=>play();
  el('studiowb-stop').onclick=()=>{pause();seek(0);};
  el('studiowb-seek').oninput=ev=>{pause();seek(Number(ev.target.value));};
  el('studiowb-export').onclick=saveExport;
  el('studiowb-upload').onchange=async ev=>{
   const files=Array.from(ev.target.files||[]);let ok=0;
   for(const f of files){try{await addMedia(db,f);ok++;}catch(error){notice(error.message);}}
   assets=await listMedia(db);render();notice(ok+' archivo(s) importados en este navegador.');
  };
  root.querySelectorAll('[data-add-asset]').forEach(b=>b.onclick=()=>addFromLibrary(b.dataset.addAsset));
  root.querySelectorAll('[data-remove-asset]').forEach(b=>b.onclick=async()=>{
   const id=b.dataset.removeAsset,asset=findAsset(id);
   if(!asset||!confirm('¿Enviar «'+asset.name+'» a la papelera local? Puedes restaurarlo, y sus clips del timeline no se borrarán.'))return;
   if(await trashMedia(db,id)){
     assets=await listMedia(db);trash=await listTrashedMedia(db);showLocalTrash=true;
     const url=urls.get(id);if(url){URL.revokeObjectURL(url);urls.delete(id);}
     cache.delete(id);save();render();notice('Original en la papelera. «Restaurar» permite deshacerlo.');
   }
  });
  el('studiowb-title').onclick=()=>{checkpoint();const c={id:crypto.randomUUID(),assetId:'',kind:'text',track:'V2',start:workspace.playhead,duration:4,sourceStart:0,text:'CASO 066',volume:0,opacity:1};workspace.clips.push(c);selected=c.id;save();render();};
  root.querySelectorAll('[data-select-clip]').forEach(b=>{
   b.onclick=()=>{selected=b.dataset.selectClip;if(editingTool==='blade'){splitSelected();return;}render();};
   b.onpointerdown=ev=>{
    if(ev.button!==0||rendering)return;
    const clip=workspace.clips.find(c=>c.id===b.dataset.selectClip);
    if(!clip)return;
    const lane=b.parentElement,rect=lane.getBoundingClientRect();
    if(!rect.width)return;
    const initial=ev.clientX,start=clip.start,length=clip.duration,sourceStart=clip.sourceStart||0,mode=ev.target.closest('.wb-trim-left')?'trim-left':ev.target.closest('.wb-trim-right')?'trim-right':'move';
    let moved=false;
    b.setPointerCapture?.(ev.pointerId);
    b.onpointermove=pe=>{
     const pixels=pe.clientX-initial;if(Math.abs(pixels)>3)moved=true;
     if(!moved)return;
     const change=Math.round(pixels/rect.width*timelineDuration(workspace.clips)*10)/10;
     if(mode==='trim-right')clip.duration=number(length+change,.1,Math.min(120,600-start));
     else if(mode==='trim-left'){
       const delta=number(change,-start,length-.1);
       clip.start=Math.round((start+delta)*100)/100;
       clip.duration=Math.round((length-delta)*100)/100;
       clip.sourceStart=Math.max(0,Math.round((sourceStart+delta)*100)/100);
     }else clip.start=snapToEdges(number(start+change,0,600-length),workspace.clips,clip.id,{enabled:snapping});
     const lengthTimeline=timelineDuration(workspace.clips);
     b.style.left=(clip.start/lengthTimeline*100)+'%';
     b.style.width=(clip.duration/lengthTimeline*100)+'%';
    };
    b.onpointerup=()=>{
     b.onpointermove=null;b.onpointerup=null;
     if(moved){history.push(JSON.stringify({...workspace,clips:workspace.clips.map(c=>c.id===clip.id?{...c,start,duration:length,sourceStart}:c)}));if(history.length>30)history.shift();future.length=0;selected=clip.id;save();render();}
    };
    b.onpointercancel=()=>{clip.start=start;clip.duration=length;clip.sourceStart=sourceStart;b.onpointermove=null;b.onpointerup=null;render();};
   };
  });
  root.querySelectorAll('[data-timeline-seek]').forEach(b=>b.onclick=ev=>{
   if(ev.target!==b)return;const r=b.getBoundingClientRect();pause();seek((ev.clientX-r.left)/r.width*timelineDuration(workspace.clips));
  });
  // Standard desktop editing shortcuts, disabled when typing into forms or another panel.
  const shortcut=ev=>{
   if(!root.isConnected||!root.contains(root.ownerDocument.activeElement)&&root.ownerDocument.activeElement?.closest?.('input,textarea,select,[contenteditable=true]'))return;
   if(ev.target?.closest?.('input,textarea,select,[contenteditable=true]'))return;
   const key=(ev.key||'').toLowerCase();
   if((ev.ctrlKey||ev.metaKey)&&key==='z'){ev.preventDefault();restoreFrom(ev.shiftKey?future:history,ev.shiftKey?history:future);}
   else if((ev.ctrlKey||ev.metaKey)&&key==='y'){ev.preventDefault();restoreFrom(future,history);}
   else if(key==='s'&&!ev.ctrlKey&&!ev.metaKey){ev.preventDefault();splitSelected();}
   else if(key===' '&&!ev.ctrlKey&&!ev.metaKey){ev.preventDefault();play();}
   else if((key==='delete'||key==='backspace')&&selected){ev.preventDefault();const clip=workspace.clips.find(x=>x.id===selected);if(clip){checkpoint();workspace.clips=workspace.clips.filter(x=>x.id!==selected);selected=null;save();render();}}
  };
  root.onkeydown=shortcut;
  root.querySelectorAll('[data-property]').forEach(el=>el.onchange=ev=>{
   const c=workspace.clips.find(x=>x.id===selected);if(!c)return;
   checkpoint();const key=ev.target.dataset.property,value=ev.target.value;
   if(key==='track'){if(allowedTracks[c.kind].includes(value))c.track=value;}
   else if(['text','prompt'].includes(key))c[key]=value.slice(0,key==='text'?180:3000);
   else {const ranges={start:[0,600],duration:[.1,120],sourceStart:[0,600],volume:[0,2],brightness:[0,200],contrast:[0,200],saturation:[0,200],blur:[0,20],opacity:[0,1],scale:[.25,4],x:[-1,1],y:[-1,1]};if(ranges[key])c[key]=number(value,...ranges[key]);}
   if(c.start+c.duration>600)c.duration=Math.max(.1,600-c.start);
   save();render();
  });
  const selectedClip=workspace.clips.find(c=>c.id===selected);
  if(selectedClip){
   el('studiowb-delete').onclick=()=>{checkpoint();workspace.clips=workspace.clips.filter(c=>c.id!==selected);media.get(selected)?.element.pause();media.delete(selected);selected=null;save();render();};
   el('studiowb-duplicate').onclick=()=>{checkpoint();const copy={...selectedClip,id:crypto.randomUUID(),start:selectedClip.start+selectedClip.duration};workspace.clips.push(copy);selected=copy.id;save();render();};
   el('studiowb-copy').onclick=()=>{const text=selectedClip.prompt||'';if(!text){notice('Escribe primero el prompt.');return;}if(!navigator.clipboard?.writeText){notice('Selecciona y copia el prompt manualmente.');return;}navigator.clipboard.writeText(text).then(()=>notice('Prompt copiado.'),()=>notice('No se pudo copiar. Selecciona el texto del campo.'));};
  }
  el('studiowb-portable-export').onclick=async()=>{
   const button=el('studiowb-portable-export');if(button)button.disabled=true;
   try{
    save();
    const archive=await exportPortableBackup(db,localStorage,Number(project?.id),project?.name);
    const blob=new Blob([JSON.stringify(archive)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='studio066-proyecto-'+project.id+'-completo.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    notice('Respaldo completo descargado ('+archive.assets.length+' archivos). Guárdalo de forma privada.');
   }catch(error){notice('No se pudo crear el respaldo: '+error.message);}
   finally{if(button)button.disabled=false;}
  };
  el('studiowb-portable-import').onchange=async ev=>{
   const file=ev.target.files?.[0];if(!file)return;
   if(file.size>70*1024*1024){notice('El respaldo es demasiado grande. Máximo 70 MB de archivo JSON.');return;}
   if(!confirm('¿Restaurar este respaldo? Reemplazará el timeline y el historial LOCAL de este proyecto; conservará los archivos ya importados.'))return;
   try{
    const backup=JSON.parse(await file.text());
    const result=await importPortableBackup(db,localStorage,backup,Number(project.id));
    assets=await listMedia(db);workspace=safeLoad();selected=null;render();
    notice('Restaurados '+result.clips+' clips, '+result.requests+' solicitudes y '+result.added+' originales nuevos.');
   }catch(error){notice('No se pudo restaurar: '+error.message);}
  };
  el('studiowb-backup').onclick=()=>{const blob=new Blob([JSON.stringify(workspace,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='estudio066-timeline.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);notice('Proyecto JSON exportado. Los archivos multimedia originales NO se incluyen.');};
  el('studiowb-restore').onchange=async ev=>{
   const file=ev.target.files?.[0];if(!file||file.size>150000)return;
   try{const candidate=parseWorkspace(JSON.parse(await file.text()));if(!candidate)throw new Error('Estructura no válida');
    if(!confirm('¿Reemplazar este montaje local con el archivo JSON?'))return;
    checkpoint();workspace=candidate;selected=null;save();render();notice('Montaje restaurado. Debes mantener los archivos en esta biblioteca local.');
   }catch(error){notice('No se importó: '+error.message);}
  };
 }
 async function init(){
  try{db=await mediaDB();assets=await listMedia(db);trash=await listTrashedMedia(db);
   if(!root.isConnected)return;render();await prime();paint();root.querySelector('.wb-root')?.setAttribute('data-ready','true');
  }catch(error){root.innerHTML='<div class="studio-pane"><h3>Biblioteca local no disponible</h3><p>'+e(error.message)+'</p><p>Revisa que el navegador permita almacenamiento del sitio.</p></div>';}
 }
 root.innerHTML='<div class="studio-pane"><p>Preparando biblioteca multimedia local…</p></div>';
 init();
 return ()=>{
  if(exportAbort)exportAbort.abort();
  if(cloudDispose){cloudDispose();cloudDispose=null;}
  pause();for(const m of media.values()){m.element.pause();m.element.removeAttribute('src');m.element.load();}
  media.clear();for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();cache.clear();
  try{db?.close();}catch{}
  try{audioCtx?.close();}catch{}
 };
}
