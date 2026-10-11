import {mediaDB,listMedia,readMedia,addMedia,trashMedia,restoreMedia,listTrashedMedia,workspaceKey,defaultWorkspace,parseWorkspace,timelineDuration,addTimelineClip} from './studio-media.js';
import {exportPortableBackup,importPortableBackup} from './studio-portable.js';
import {mountStudioCloud} from './studio-cloud066.js';
import {exportCanvasRecording,exportFormatCapabilities,recordingBitrate} from './studio-recording.js';
import {preflightExportMedia,formatExportPreflightError} from './studio-export-preflight.js';
import {insertClipAt,splitClipAt,snapToEdges,trackPosition,pointerCutTime,pointerCutWithinClip,revealClipScroll,previewClipDrag,clipDragChanged} from './studio-timeline-tools.js';
import {extractPeaks,timelineSpan,mediaTimecode,trackIsEditable,trackIsAudible,trackIsVisible} from './studio-timeline-visuals.js';
// Editor en navegador, sin llamadas a proveedores ni consumo de créditos.
const e=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const number=(n,lo,hi)=>Math.min(hi,Math.max(lo,Number(n)||0));
const fmt=s=>Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0');
const tracks=['V2','V1','A1','A2'];
let studio066RuntimeSequence=0;
const tracksNames={V2:'Títulos / capas',V1:'Video / fotogramas',A1:'Voz / diálogos',A2:'Foley / música'};
const allowedTracks={image:['V1','V2'],video:['V1','V2'],audio:['A1','A2'],text:['V2']};
const option=(value,actual,label)=>'<option value="'+e(value)+'"'+(String(actual)===String(value)?' selected':'')+'>'+e(label??value)+'</option>';
const ctrl=(name,label,value,min,max,step)=>'<label>'+label+'<input data-property="'+name+'" type="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+e(value)+'"></label>';
export function studioWorkbenchView(root,notice,project=null){
 let db,assets=[],workspace=defaultWorkspace(),selected=null,isPlaying=false,rendering=false,startTick=0,startTime=0;
 const runtimeId='s'+(++studio066RuntimeSequence),runtimeRules=new Map();let runtimeSheet=null;
 let audioCtx=null,mix=null,recorder=null,movieStop=null,media=new Map(),urls=new Map(),cache=new Map(),raf=0;
 let cloudDispose=null,exportAbort=null,timelineZoom=1,snapping=true,trash=[],showLocalTrash=false,editingTool='select',activeBin='media',mobilePane='timeline',mediaQuery='',sourceAssetId=null,inspectorTab='clip';
 const history=[],future=[],waveforms=new Map();
 const trackState=Object.fromEntries(tracks.map(t=>[t,{locked:false,muted:false,hidden:false}]));
 const rulerSpan=()=>timelineSpan(workspace.clips,12);
 const rulerWidth=()=>Math.max(900,Math.ceil(rulerSpan()*80*timelineZoom));
 const rulerStep=seconds=>timelineZoom>=3?1:timelineZoom>=1.6?2:seconds>180?20:seconds>60?10:5;
 const lanePosition=(clientX,lane)=>{const bounds=lane.getBoundingClientRect();return trackPosition(clientX,bounds.left+lane.clientLeft,lane.clientWidth,rulerSpan());};
 const checkpoint=()=>{history.push(JSON.stringify(workspace));if(history.length>30)history.shift();future.length=0;};
 const restoreFrom=(source,dest)=>{if(!source.length)return;dest.push(JSON.stringify(workspace));workspace=parseWorkspace(JSON.parse(source.pop()))||defaultWorkspace();selected=null;save();render();};
 const localKey=workspaceKey+':'+(project&&Number.isSafeInteger(Number(project.id))?Number(project.id):'scratch');
 const firstWorkspace=()=>({...defaultWorkspace(),name:project?.name||defaultWorkspace().name});
 const safeLoad=()=>{try{return parseWorkspace(JSON.parse(localStorage.getItem(localKey)||'null'))||firstWorkspace();}catch{return firstWorkspace();}};
 workspace=safeLoad();
 const trackStateKey=localKey+':track-prefs';
 try{const stored=JSON.parse(localStorage.getItem(trackStateKey)||'{}');
  for(const t of tracks)for(const k of ['locked','muted','hidden'])if(typeof stored?.[t]?.[k]==='boolean')trackState[t][k]=stored[t][k];
 }catch{}
 const saveTrackPrefs=()=>{try{localStorage.setItem(trackStateKey,JSON.stringify(trackState));}catch{}};
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
   m.element.muted=!trackIsAudible(trackState,c.track);
    if(m.gain)m.gain.gain.value=on&&trackIsAudible(trackState,c.track)?number(c.volume??1,0,2):0;
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
  for(const c of workspace.clips.filter(c=>(c.kind==='video'||c.kind==='image')&&trackIsVisible(trackState,c.track)).sort((a,b)=>tracks.indexOf(b.track)-tracks.indexOf(a.track))){
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
 function drawTime(){
  const l=root.querySelector('#studiowb-time');if(l)l.textContent=mediaTimecode(workspace.playhead,workspace.fps)+' / '+mediaTimecode(timelineDuration(workspace.clips),workspace.fps);
  const input=root.querySelector('#studiowb-seek');if(input){input.max=String(timelineDuration(workspace.clips));input.value=String(workspace.playhead);}
  const pos=(workspace.playhead/rulerSpan()*100).toFixed(4)+'%';
  runtimeRules.get('playhead')?.style.setProperty('left',pos);
  runtimeRules.get('ruler-playhead')?.style.setProperty('left',pos);
 }
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
  return '<div class="wb-media-item" '+(discarded?'':'draggable="true" data-drag-asset="'+e(a.id)+'"')+'><div class="wb-media-tile"><button type="button" class="wb-source-select" data-source-asset="'+e(a.id)+'" title="Ver original" aria-label="Previsualizar '+e(a.name)+'"><div class="wb-thumb">'+(a.kind==='image'?'<img loading="lazy" data-media-thumb="'+e(a.id)+'" alt="'+e(a.name)+'">':a.kind==='video'?'<video muted playsinline preload="metadata" data-media-thumb="'+e(a.id)+'" aria-label="'+e(a.name)+'"></video>':'♫')+'</div></button><div><b>'+e(a.name)+'</b><small>'+e(a.kind.toUpperCase())+' · '+(a.size/1048576).toFixed(1)+' MB</small></div></div><div class="wb-row">'+(discarded?'<button type="button" class="subtle" data-revive-asset="'+e(a.id)+'">↶ Restaurar</button>':'<button type="button" class="subtle" data-add-asset="'+e(a.id)+'">+ Al final</button><button type="button" class="subtle" data-insert-asset="'+e(a.id)+'">+ En cabezal</button><button type="button" class="subtle" data-remove-asset="'+e(a.id)+'">Papelera</button>')+'</div></div>';
 }
 function propertyPanel(){
  const c=workspace.clips.find(x=>x.id===selected);
  const tabs=[['clip','Clip'],['color','Color'],['sound','Audio'],['prompt','Guion / IA']];
  const header='<div class="wb-inspector-head"><span class="studio-caption">INSPECTOR CONTEXTUAL</span><h3>'+(c?'◈ '+e(c.kind)+' · '+e(c.id.slice(0,8)):'Inspector de medios')+'</h3></div>'+
    '<nav class="wb-inspector-tabs" aria-label="Propiedades del clip">'+tabs.map(([tab,name])=>'<button type="button" data-inspector-tab="'+tab+'" aria-pressed="'+(inspectorTab===tab)+'">'+name+'</button>').join('')+'</nav>';
  if(!c)return '<div class="wb-inspector" data-inspector-tab="'+inspectorTab+'">'+header+'<div class="wb-inspector-empty"><span>◎</span><strong>Selecciona un clip</strong><small>Elige un bloque del timeline para editar imagen, audio, color y guion.</small></div></div>';
  const available=allowedTracks[c.kind];
  return '<div class="wb-inspector" data-inspector-tab="'+inspectorTab+'">'+header+
    (!trackIsEditable(trackState,c.track)?'<p class="wb-inspector-locked">🔒 Esta pista está bloqueada. Desbloquéala para modificar el clip.</p>':'')+
    '<div class="wb-inspector-section" data-inspector-panel="clip"><label>Pista<select data-property="track">'+available.map(t=>option(t,c.track,t+' · '+tracksNames[t])).join('')+'</select></label>'+
    '<div class="studio-fields">'+ctrl('start','Inicio (s)',c.start,0,600,.1)+ctrl('duration','Duración (s)',c.duration,.1,120,.1)+ctrl('sourceStart','Entrada original (s)',c.sourceStart??0,0,600,.1)+'</div>'+
    (c.kind==='text'?'<label>Título<textarea data-property="text" maxlength="180" rows="3">'+e(c.text||'')+'</textarea></label>':'')+
    '<div class="wb-row wb-clip-actions"><button type="button" class="subtle" id="studiowb-duplicate">Duplicar</button><button type="button" class="subtle" id="studiowb-delete">Eliminar clip</button></div></div>'+
    '<div class="wb-inspector-section" data-inspector-panel="color">'+(c.kind==='audio'?'<p class="studio-help">Los clips de audio no tienen ajustes visuales.</p>':
    '<h4>Corrección básica</h4><div class="studio-fields">'+ctrl('brightness','Brillo %',c.brightness??100,0,200,5)+ctrl('contrast','Contraste %',c.contrast??100,0,200,5)+ctrl('saturation','Saturación %',c.saturation??100,0,200,5)+ctrl('blur','Desenfoque',c.blur??0,0,20,1)+ctrl('opacity','Opacidad',c.opacity??1,0,1,.1)+ctrl('scale','Escala',c.scale??1,.25,4,.1)+ctrl('x','Posición X',c.x??0,-1,1,.1)+ctrl('y','Posición Y',c.y??0,-1,1,.1)+'</div>')+'</div>'+
    '<div class="wb-inspector-section" data-inspector-panel="sound"><h4>Mezcla de audio</h4><div class="studio-fields">'+ctrl('volume','Volumen (0–2)',c.volume??1,0,2,.1)+'</div><p class="studio-help">Silencia o activa una pista desde sus controles. Los efectos profesionales de sonido siguen pendientes.</p></div>'+
    '<div class="wb-inspector-section" data-inspector-panel="prompt"><label>Prompt técnico<textarea data-property="prompt" rows="8" maxlength="3000" placeholder="Camera, lens, motion, lighting, continuity...">'+e(c.prompt||'')+'</textarea></label><button type="button" class="subtle" id="studiowb-copy">Copiar prompt</button><p class="studio-help">Guarda instrucciones de producción. No consume créditos ni envía datos a motores IA.</p></div></div>';
 }
 function timeRuler(){
  const seconds=rulerSpan(),step=rulerStep(seconds);
  let ticks='';for(let t=0;t<=seconds;t+=step)ticks+='<span class="wb-time-tick" data-time-tick="'+t+'">'+fmt(t)+'</span>';
  return ticks;
 }
 function trackHeader(track){
  const state=trackState[track],v=track.startsWith('V');
  const short=track==='V2'?'Capas':track==='V1'?'Fotogramas':track==='A1'?'Diálogos':'Música / SFX';
  return '<div class="wb-track-label wb-pro-track-label"><div class="wb-track-label-top"><b class="wb-track-tag '+(v?'wb-track-video':'wb-track-audio')+'">'+track+'</b><span>'+short+'</span></div><div class="wb-track-actions">'+
   '<button type="button" data-track-flag="'+track+':locked" aria-pressed="'+state.locked+'" title="'+(state.locked?'Desbloquear':'Bloquear')+' '+track+'">'+(state.locked?'🔒':'♧')+'</button>'+
   (v?'<button type="button" data-track-flag="'+track+':hidden" aria-pressed="'+state.hidden+'" title="'+(state.hidden?'Mostrar':'Ocultar')+' '+track+'">'+(state.hidden?'◌':'◉')+'</button>':
   '<button type="button" data-track-flag="'+track+':muted" aria-pressed="'+state.muted+'" title="'+(state.muted?'Activar audio':'Silenciar')+' '+track+'">'+(state.muted?'🔇':'♫')+'</button>')+'</div></div>';
 }
 function timeline(){
  const seconds=rulerSpan(),width=rulerWidth(),step=rulerStep(seconds),gridStep=(width*step/seconds).toFixed(2);
  return '<div class="wb-timeline" data-tool="'+editingTool+'" data-ruler-span="'+seconds+'" data-ruler-step="'+step+'" tabindex="0" aria-label="Secuencia de montaje"><div class="wb-ruler"><div class="wb-track-label wb-ruler-title"><span>TIEMPO</span><small>'+mediaTimecode(workspace.playhead,workspace.fps)+'</small></div><div class="wb-ruler-times" data-ruler-seek="true" >'+timeRuler()+'<div id="studiowb-ruler-cursor" class="wb-ruler-cursor" ></div></div></div>'+
   tracks.map(track=>'<div class="wb-track'+(trackState[track].locked?' wb-track-locked':'')+(trackState[track].muted||trackState[track].hidden?' wb-track-disabled':'')+'">'+trackHeader(track)+'<div class="wb-track-content" data-timeline-seek="'+track+'" >'+workspace.clips.filter(c=>c.track===track).map(clip=>{
    const asset=findAsset(clip.assetId),left=clip.start/seconds*100,wide=clip.duration/seconds*100,name=clip.kind==='text'?clip.text||'TÍTULO':asset?.name||'Original ausente';
    const frame=1/workspace.fps,isMediaSplit=clip.kind!=='text'&&Boolean(clip.assetId);
    const splitAfter=isMediaSplit&&workspace.clips.some(other=>other.id!==clip.id&&other.track===clip.track&&other.assetId===clip.assetId&&Math.abs(clip.start+clip.duration-other.start)<=frame&&Math.abs((clip.sourceStart||0)+clip.duration-(other.sourceStart||0))<=frame);
    const thumb=asset&&clip.kind==='image'?'<img class="wb-block-thumbnail" data-clip-image="'+e(asset.id)+'" alt="" aria-hidden="true">':
      asset&&clip.kind==='video'?'<video class="wb-block-thumbnail" data-clip-video="'+e(asset.id)+'" muted playsinline preload="metadata" aria-hidden="true"></video>':'';
    const wave=asset&&clip.kind==='audio'?'<canvas class="wb-waveform" data-waveform-id="'+e(asset.id)+'" aria-hidden="true"></canvas>':'';
    return '<button type="button" data-select-clip="'+e(clip.id)+'" class="wb-block wb-pro-clip '+(selected===clip.id?'selected ':'')+'wb-'+e(clip.kind)+'" title="'+e(name)+'">'+thumb+wave+(splitAfter?'<i class="wb-cut-seam" aria-hidden="true"></i>':'')+'<span class="wb-clip-inner"><b>'+e(name)+'</b><small>'+mediaTimecode(clip.duration,workspace.fps)+'</small></span>'+
    (!asset&&clip.kind!=='text'?'<span class="wb-clip-missing">Falta original</span>':'')+'<span class="wb-trim-left" title="Arrastra para cambiar entrada del clip"></span><span class="wb-trim-right" title="Arrastra para estirar o recortar el clip"></span></button>';
   }).join('')+'<div class="wb-cursor" ></div></div></div>').join('')+'</div>';
 }
 async function fillTimelineMedia(){
  for(const item of root.querySelectorAll('[data-clip-image],[data-clip-video]')){
   try{const id=item.dataset.clipImage||item.dataset.clipVideo,url=await getUrl(id);if(url&&item.isConnected)item.src=url;}catch{}
  }
  const AudioDecoder=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  for(const item of root.querySelectorAll('[data-waveform-id]')){
   const id=item.dataset.waveformId;
   if(!waveforms.has(id)&&AudioDecoder){
    try{
     const record=await readMedia(db,id);if(!record?.blob||record.blob.size>32*1048576){waveforms.set(id,null);continue;}
     const context=new AudioDecoder(1,1,44100);
     const sound=await context.decodeAudioData(await record.blob.arrayBuffer());
     waveforms.set(id,extractPeaks(sound.getChannelData(0),128));
     await context.close?.();
    }catch{waveforms.set(id,null);}
   }
   if(!item.isConnected||!waveforms.get(id))continue;
   const peaks=waveforms.get(id),width=Math.max(90,Math.min(2000,Math.ceil(item.getBoundingClientRect().width||120))),height=24;
   item.width=width;item.height=height;
   const ctx=item.getContext('2d');if(!ctx)continue;
   ctx.clearRect(0,0,width,height);ctx.fillStyle='#65eac4';
   peaks.forEach((peak,i)=>{const bh=Math.max(1,peak*(height-3)),step=width/peaks.length;ctx.fillRect(i*step,(height-bh)/2,Math.max(1,step*.66),bh);});
  }
 }

 function page(){
  return '<div class="wb-root" data-bin="'+activeBin+'" data-editor-tool="'+editingTool+'" data-mobile-pane="'+mobilePane+'"><div class="wb-top"><div class="wb-workspace-brand"><span class="wb-brand-mark" aria-hidden="true">◈</span><div><span class="studio-caption">LA LLAVE 066 · ESTACIÓN CREATIVA</span><h3>Estudio de montaje 066</h3><p class="studio-help">'+e(project?.name||'Montaje libre')+' · Guardado en este navegador</p></div></div></div><div class="wb-row"><button type="button" class="subtle" id="studiowb-undo">↶ Deshacer</button><button type="button" class="subtle" id="studiowb-redo">↷ Rehacer</button><button type="button" class="wb-top-export" id="studiowb-top-export">⇧ Exportar '+e((workspace.exportFormat||'webm').toUpperCase())+'</button><details class="wb-file-menu"><summary>Archivo y respaldos ▾</summary><div class="wb-file-menu-content"><button type="button" class="subtle" id="studiowb-backup">Exportar proyecto JSON</button><label class="wb-file-label">Importar proyecto JSON<input id="studiowb-restore" type="file" accept=".json,application/json"></label><button type="button" class="subtle" id="studiowb-portable-export"'+(!project?.id?' disabled':'')+'>Respaldo completo con medios</button><label class="wb-file-label">Restaurar respaldo completo<input id="studiowb-portable-import" type="file" accept=".json,application/json" '+(!project?.id?'disabled':'')+'></label></div></details></div>'+
   '<div class="wb-settings"><label>Proyecto<input id="studiowb-name" maxlength="160" value="'+e(workspace.name)+'"></label><label>Orientación<select id="studiowb-aspect">'+['9:16','16:9','1:1','1.91:1'].map(v=>option(v,workspace.aspect)).join('')+'</select></label><label>Resolución<select id="studiowb-quality">'+['720p','1080p'].map(v=>option(v,workspace.quality)).join('')+'</select></label><label>FPS<select id="studiowb-fps">'+[24,30].map(v=>option(v,workspace.fps,v+' fps')).join('')+'</select></label><label>Archivo<select id="studiowb-format">'+option('webm',workspace.exportFormat||'webm','WebM · VP9/VP8')+option('mp4',workspace.exportFormat||'webm','MP4 · H.264'+(exportFormatCapabilities(window.MediaRecorder).mp4?'':' · no disponible')).replace('<option','<option'+(exportFormatCapabilities(window.MediaRecorder).mp4?'':' disabled'))+'</select></label><label>Calidad<select id="studiowb-encode-quality">'+[['standard','Estándar'],['high','Alta'],['master','Máster']].map(([v,l])=>option(v,workspace.encodingQuality||'high',l)).join('')+'</select></label></div>'+
   '<div class="wb-workarea"><aside class="wb-library" aria-label="Explorador multimedia"><div class="wb-pane-heading"><span class="wb-pane-kicker">RECURSOS DEL PROYECTO</span><h3>Biblioteca <span class="wb-count">'+(assets.length+trash.length)+'</span></h3></div><div class="wb-bin-tabs" role="group" aria-label="Explorar recursos">'+[['media','Medios'],['cloud','Nube'],['text','Texto'],['audio','Audio']].map(([id,label])=>'<button type="button" data-bin-switch="'+id+'" aria-pressed="'+(activeBin===id)+'">'+label+'</button>').join('')+'</div><div class="wb-bin-local"><label class="wb-file-label">＋ Importar video, imagen o audio<input type="file" id="studiowb-upload" multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,audio/*"></label><label class="wb-search-wrap"><span>⌕</span><input id="studiowb-media-search" type="search" placeholder="Buscar medios…" value="'+e(mediaQuery)+'" aria-label="Buscar archivos en biblioteca"></label>'+
   '<div class="wb-library-head"><button id="studiowb-local-library" class="subtle" type="button" aria-pressed="'+(!showLocalTrash)+'">Archivos ('+assets.length+')</button><button id="studiowb-local-trash" class="subtle" type="button" aria-pressed="'+showLocalTrash+'">Papelera ('+trash.length+')</button></div><div class="wb-media-list">'+(showLocalTrash?(trash.length?trash.map(a=>mediaCard(a,true)).join(''):'<p class="studio-help">Papelera vacía.</p>'):(assets.filter(a=>(activeBin!=='audio'||a.kind==='audio')&&a.name.toLowerCase().includes(mediaQuery.toLowerCase())).length?assets.filter(a=>(activeBin!=='audio'||a.kind==='audio')&&a.name.toLowerCase().includes(mediaQuery.toLowerCase())).map(a=>mediaCard(a,false)).join(''):'<p class="studio-help">No hay medios con ese filtro. Puedes importar o recuperar originales desde Nube.</p>'))+'</div></div><div class="wb-bin-text"><p class="wb-pane-kicker">TÍTULOS Y CAPAS</p><p class="studio-help">Agrega títulos en el cabezal; cambia el contenido en el inspector.</p><button type="button" class="wb-title-quick" id="studiowb-title">＋ Añadir título al montaje</button><div class="wb-title-sample">CASO 066 <small>Texto editable · V2</small></div></div><div id="studiowb-cloud" class="wb-cloud-wrap"></div><div class="wb-source-pane" id="studiowb-source-pane"'+(!findAsset(sourceAssetId)?' hidden':'')+'><span class="wb-pane-kicker">ORIGEN · VISTA PREVIA</span><div class="wb-source-frame" id="studiowb-source-frame">Selecciona una miniatura para inspeccionarla</div><button id="studiowb-source-add" class="subtle" type="button"'+(!sourceAssetId?' disabled':'')+'>＋ Insertar en cabezal</button></div></aside>'+
   '<div class="wb-stage"><div class="wb-monitor-bar"><span class="wb-pane-kicker"><span class="wb-dot"></span> PROGRAMA · '+e(workspace.name)+'</span><span class="wb-monitor-status">Vista previa local · Sin créditos</span></div>'+(workspace.clips.some(c=>c.kind!=='text'&&!findAsset(c.assetId))?'<p class="studio-help wb-media-warning" role="status">Este montaje incluye medios que faltan en este navegador. Recupera los originales desde Biblioteca privada antes de exportar.</p>':'')+'<div class="wb-preview-box"><canvas id="studiowb-canvas" aria-label="Vista previa de composición"></canvas></div><div class="wb-controls"><button type="button" class="subtle" id="studiowb-stop" title="Volver al inicio" aria-label="Volver al inicio">⏮</button><button type="button" class="wb-play-primary" id="studiowb-play">▶ Reproducir</button><strong id="studiowb-time"></strong><button type="button" id="studiowb-export">⇧ Exportar '+e((workspace.exportFormat||'webm').toUpperCase())+'</button></div><input id="studiowb-seek" type="range" min="0" max="5" step=".05" value="'+workspace.playhead+'" aria-label="Posición en montaje"><p class="studio-help">1080p y calidad Máster son opciones reales de codificación del navegador, pero no garantizan detalle extra del original. MP4 solo si Chrome permite H.264; el audio MP4 requiere AAC. 2K/4K y MP4 profesional universal requerirán render remoto.</p></div>'+
   propertyPanel()+'</div><div class="wb-timeline-panel"><div class="wb-timeline-heading"><strong>◫ Timeline multitrack</strong><span>'+workspace.clips.length+' clips · '+workspace.fps+' FPS · '+e(workspace.aspect)+'</span></div>'+
   '<div class="wb-edit-toolbar" role="toolbar" aria-label="Herramientas de edición de línea de tiempo"><span class="wb-tool-section">HERRAMIENTAS</span>'+
    '<button type="button" id="studiowb-select-tool" title="Selección (V). Arrastra clips para moverlos." aria-label="Herramienta Selección, tecla V" aria-pressed="'+(editingTool==='select')+'">↖ <span>Selección</span> <kbd>V</kbd></button>'+
    '<button type="button" id="studiowb-blade-tool" title="Cuchilla (C). Haz clic en un clip para dividir justo donde apunta el cursor." aria-label="Herramienta Cuchilla, tecla C" aria-pressed="'+(editingTool==='blade')+'">✂ <span>Cuchilla</span> <kbd>C</kbd></button>'+
    '<span class="wb-tool-separator" aria-hidden="true"></span>'+
    '<button type="button" id="studiowb-split" title="Divide el clip seleccionado en el cabezal (S)">⌁ <span>Dividir en cabezal</span> <kbd>S</kbd></button>'+
    '<button type="button" id="studiowb-toolbar-duplicate" title="Duplicar clip seleccionado">⧉ <span>Duplicar</span></button>'+
    '<button type="button" id="studiowb-toolbar-remove" title="Quitar clip seleccionado de la secuencia">⌫ <span>Quitar</span></button>'+
    '<span class="wb-tool-separator" aria-hidden="true"></span>'+
    '<button type="button" id="studiowb-snap" title="Activar o desactivar ajuste magnético" aria-pressed="'+snapping+'">⌕ <span>Imán '+(snapping?'activo':'inactivo')+'</span></button>'+
    '<label class="wb-tool-zoom">Zoom <input id="studiowb-zoom" aria-label="Zoom de la línea de tiempo" type="range" min=".5" max="5" step=".25" value="'+timelineZoom+'"></label>'+
    '<button type="button" id="studiowb-timeline-fit" title="Ajustar la escala al contenido">▣ <span>Ajustar</span></button>'+
    '<div id="studiowb-tool-hint" class="wb-tool-hint" role="status">'+(editingTool==='blade'?'CUCHILLA · Haz clic en un clip para cortarlo exactamente aquí':'SELECCIÓN · Arrastra, recorta o elige un clip')+'</div></div>'+
timeline()+'</div><nav class="wb-mobile-dock" aria-label="Paneles del estudio">'+[['media','Medios'],['timeline','Montaje'],['inspector','Inspector']].map(([k,label])=>'<button type="button" data-mobile-pane="'+k+'" aria-pressed="'+(mobilePane===k)+'">'+label+'</button>').join('')+'</nav><p class="wb-footnote">Proyecto privado · Edición no destructiva · Generación y render remoto todavía no conectados</p></div>';
 }
 async function updateSourceViewer(){
  const frame=root.querySelector('#studiowb-source-frame'),button=root.querySelector('#studiowb-source-add');
  if(!frame)return;
  const asset=findAsset(sourceAssetId);
  if(button)button.disabled=!asset;
  if(!asset){frame.textContent='Selecciona una miniatura para inspeccionarla';return;}
  frame.textContent='Cargando original…';
  try{
   const url=await getUrl(asset.id);
   if(!frame.isConnected||sourceAssetId!==asset.id)return;
   frame.replaceChildren();
   const elem=document.createElement(asset.kind==='image'?'img':asset.kind==='video'?'video':'audio');
   elem.src=url||'';elem.setAttribute('aria-label',asset.name);
   if(asset.kind!=='image'){elem.controls=true;elem.preload='metadata';}
   if(asset.kind==='video')elem.playsInline=true;
   frame.append(elem);
  }catch{if(frame.isConnected)frame.textContent='No se pudo abrir el original';}
 }
 function revealSelectedClip(id){
  const timelineEl=root.querySelector('.wb-timeline');
  const clip=workspace.clips.find(c=>c.id===id);
  if(!clip||!timelineEl)return;
  const pixelStart=clip.start/rulerSpan()*rulerWidth();
  timelineEl.scrollLeft=revealClipScroll(pixelStart,timelineEl.clientWidth,timelineEl.scrollWidth,timelineEl.scrollLeft);
 }
 function getRuntimeStylesheet(){
  if(runtimeSheet)return runtimeSheet;
  const doc=root.ownerDocument;
  for(const sheet of Array.from(doc.styleSheets||[])){
   if(!sheet.href||!sheet.href.includes('studio-workspace.css'))continue;
   try{void sheet.cssRules.length;runtimeSheet=sheet;return sheet;}catch{}
  }
  return null;
 }
 function clearRuntimeGeometry(){
  const sheet=getRuntimeStylesheet();runtimeRules.clear();if(!sheet)return;
  const scope='[data-studio-runtime="'+runtimeId+'"]';
  for(let i=sheet.cssRules.length-1;i>=0;i--)if(sheet.cssRules[i].selectorText?.includes(scope))sheet.deleteRule(i);
 }
 function addRuntimeRule(key,selector,declarations){
  const sheet=getRuntimeStylesheet();if(!sheet)return null;
  const full='.wb-root[data-studio-runtime="'+runtimeId+'"] '+selector;
  const index=sheet.cssRules.length;sheet.insertRule(full+'{}',index);
  const rule=sheet.cssRules[index];for(const [property,value] of Object.entries(declarations))rule.style.setProperty(property,String(value));
  runtimeRules.set(key,rule);return rule;
 }
 function applyTimelineGeometry(){
  const timelineEl=root.querySelector('.wb-timeline'),wbRoot=root.querySelector('.wb-root');
  if(!timelineEl||!wbRoot)return;
  wbRoot.dataset.studioRuntime=runtimeId;
  clearRuntimeGeometry();
  const seconds=rulerSpan(),width=rulerWidth(),step=rulerStep(seconds);
  timelineEl.dataset.rulerWidth=String(width);
  const position=time=>(Math.max(0,Number(time)||0)/seconds*100).toFixed(4)+'%';
  addRuntimeRule('timeline','.wb-timeline',{'--wb-lane-min':width+'px','--wb-grid-step':(width*step/seconds).toFixed(2)+'px'});
  const ruler=timelineEl.querySelector('.wb-ruler-times');
  const doc=timelineEl.ownerDocument,view=doc.defaultView;
  const labelWidth=row=>parseFloat(view?.getComputedStyle?.(row)?.gridTemplateColumns)||115;
  if(ruler)addRuntimeRule('ruler','.wb-ruler-times',{width:width+'px', 'min-width':width+'px'});
  timelineEl.querySelectorAll('[data-timeline-seek]').forEach((lane,index)=>addRuntimeRule('lane:'+index,'[data-timeline-seek="'+lane.dataset.timelineSeek+'"]',{width:width+'px','min-width':width+'px'}));
  timelineEl.querySelectorAll('.wb-ruler,.wb-track').forEach((row,index)=>{
   const label=labelWidth(row),total=label+width;
   row.dataset.wbGeometryRow=String(index);
   addRuntimeRule('row:'+index,(row.classList.contains('wb-ruler')?'.wb-ruler':'.wb-track[data-wb-geometry-row="'+index+'"]'),{'grid-template-columns':label+'px '+width+'px',width:total+'px','min-width':total+'px'});
  });
  timelineEl.querySelectorAll('[data-time-tick]').forEach((tick,index)=>{
   tick.dataset.wbGeometryTick=String(index);
   addRuntimeRule('tick:'+index,'.wb-time-tick[data-wb-geometry-tick="'+index+'"]',{left:position(tick.dataset.timeTick)});
  });
  timelineEl.querySelectorAll('[data-select-clip]').forEach((block,index)=>{
   const clip=workspace.clips.find(item=>item.id===block.dataset.selectClip);if(!clip)return;
   block.dataset.wbGeometryClip=String(index);
   addRuntimeRule('clip:'+index,'[data-wb-geometry-clip="'+index+'"]',{left:position(clip.start),width:Math.max(.65,clip.duration/seconds*100).toFixed(4)+'%'});
  });
  addRuntimeRule('playhead','.wb-timeline .wb-cursor',{left:position(workspace.playhead)});
  const cursor=timelineEl.querySelector('#studiowb-ruler-cursor');
  if(cursor)addRuntimeRule('ruler-playhead','.wb-ruler-times #studiowb-ruler-cursor',{left:position(workspace.playhead)});
  timelineEl.dataset.runtimeGeometryRules=String(runtimeRules.size);
  timelineEl.dataset.runtimeStylesheet=runtimeSheet?'ready':'missing';
 }
 function render(){
  const oldTimelineScroll=root.querySelector('.wb-timeline')?.scrollLeft||0;
  const oldMediaScroll=root.querySelector('.wb-media-list')?.scrollTop||0;
  pause();if(cloudDispose){cloudDispose();cloudDispose=null;}
  root.innerHTML=page();applyTimelineGeometry();wire();
  const timelineEl=root.querySelector('.wb-timeline');
  if(timelineEl)timelineEl.scrollLeft=oldTimelineScroll;
  const mediaList=root.querySelector('.wb-media-list');
  if(mediaList)mediaList.scrollTop=oldMediaScroll;
  paint();drawTime();updateSourceViewer();fillTimelineMedia().catch(()=>{});
  root.querySelectorAll('[data-media-thumb]').forEach(async image=>{const id=image.dataset.mediaThumb;try{const url=await getUrl(id);if(root.isConnected&&image.isConnected&&url)image.src=url;}catch{}});
  if(project?.id&&db)cloudDispose=mountStudioCloud(root.querySelector('#studiowb-cloud'),{projectId:Number(project.id),db,workspace,notice,onMediaAdded:async()=>{assets=await listMedia(db);trash=await listTrashedMedia(db);await prime();render();}});
 }
 function wire(){
  const el=(id)=>root.querySelector('#'+id);
  root.querySelectorAll('button[data-inspector-tab]').forEach(b=>b.onclick=()=>{inspectorTab=b.dataset.inspectorTab;render();});
  root.querySelectorAll('[data-bin-switch]').forEach(b=>b.onclick=()=>{activeBin=b.dataset.binSwitch;render();});
  root.querySelectorAll('button[data-mobile-pane]').forEach(b=>b.onclick=()=>{mobilePane=b.dataset.mobilePane;render();});
  el('studiowb-media-search').oninput=ev=>{mediaQuery=ev.target.value;root.querySelectorAll('[data-drag-asset]').forEach(card=>{const asset=findAsset(card.dataset.dragAsset);card.hidden=!asset?.name.toLowerCase().includes(mediaQuery.toLowerCase());});};
  root.querySelectorAll('[data-source-asset]').forEach(b=>b.onclick=()=>{sourceAssetId=b.dataset.sourceAsset;render();});
  el('studiowb-source-add').onclick=()=>addFromLibrary(sourceAssetId,{start:workspace.playhead});
  const splitSelected=()=>{
   let target=workspace.clips.find(c=>c.id===selected&&workspace.playhead>c.start+.1&&workspace.playhead<c.start+c.duration-.1);
   if(!target)target=workspace.clips.find(c=>c.track==='V1'&&workspace.playhead>c.start+.1&&workspace.playhead<c.start+c.duration-.1);
   if(!target){notice('Coloca el cabezal dentro de un clip antes de cortarlo.');return;}
   if(!trackIsEditable(trackState,target.track)){notice('Pista bloqueada.');return;}
   const pieces=splitClipAt(workspace.clips,target.id,workspace.playhead);
   if(!pieces){notice('El corte está demasiado cerca del borde del clip.');return;}
   checkpoint();workspace.clips=pieces;selected=pieces.at(-1).id;save();render();
  };
  el('studiowb-select-tool').onclick=()=>{editingTool='select';render();};
  el('studiowb-blade-tool').onclick=()=>{editingTool='blade';render();};
  el('studiowb-snap').onclick=()=>{snapping=!snapping;render();};
  root.querySelectorAll('[data-track-flag]').forEach(button=>button.onclick=()=>{
   const [track,flag]=button.dataset.trackFlag.split(':');
   if(!trackState[track]||!['locked','muted','hidden'].includes(flag))return;
   trackState[track][flag]=!trackState[track][flag];saveTrackPrefs();syncPlayback(true);paint();render();
  });
  root.querySelector('[data-ruler-seek]')?.addEventListener('click',event=>{
   pause();seek(lanePosition(event.clientX,event.currentTarget));
  });
  el('studiowb-zoom').onchange=ev=>{const current=root.querySelector('.wb-timeline'),ratio=current?.scrollLeft/Math.max(1,current?.scrollWidth||1)||0;timelineZoom=Number(ev.target.value);render();const next=root.querySelector('.wb-timeline');if(next)next.scrollLeft=ratio*next.scrollWidth;};
  el('studiowb-timeline-fit').onclick=()=>{
   const view=root.querySelector('.wb-timeline'),available=Math.max(350,(view?.clientWidth||1050)-125);
   timelineZoom=number(Math.round((available/(rulerSpan()*80))*4)/4,.5,5);
   render();const next=root.querySelector('.wb-timeline');if(next)next.scrollLeft=0;
  };
  el('studiowb-split').onclick=splitSelected;
  el('studiowb-toolbar-duplicate').onclick=()=>{const b=el('studiowb-duplicate');if(b)b.click();else notice('Selecciona un clip para duplicar.');};
  el('studiowb-toolbar-remove').onclick=()=>{const b=el('studiowb-delete');if(b)b.click();else notice('Selecciona un clip para quitar.');};
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
    if(!trackIsEditable(trackState,next.track)){notice('Pista bloqueada: desbloquéala para insertar medios.');return;}
    checkpoint();workspace.clips.push(next);selected=next.id;mobilePane='timeline';save();await prime();render();
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
      if(!asset)return;
      addFromLibrary(assetId,{start:lanePosition(ev.clientX,lane),track:lane.dataset.timelineSeek});
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
  el('studiowb-top-export').onclick=saveExport;
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
  el('studiowb-title').onclick=()=>{checkpoint();const c={id:crypto.randomUUID(),assetId:'',kind:'text',track:'V2',start:workspace.playhead,duration:4,sourceStart:0,text:'CASO 066',volume:0,opacity:1};workspace.clips.push(c);selected=c.id;mobilePane='timeline';save();render();};
  root.querySelectorAll('[data-select-clip]').forEach(b=>{
   b.onclick=ev=>{
     if(editingTool==='blade'){
      const clip=workspace.clips.find(c=>c.id===b.dataset.selectClip);
      if(!clip)return;
      if(!trackIsEditable(trackState,clip.track)){notice('Desbloquea la pista para cortar este clip.');return;}
      const rect=b.getBoundingClientRect();
      // The cut is relative to what the editor shows as this clip, even after scrolling.
      const at=ev.detail===0||rect.width<=0?workspace.playhead:pointerCutWithinClip(ev.clientX,rect.left,rect.width,clip,workspace.fps);
      const pieces=splitClipAt(workspace.clips,clip.id,at);
      if(!pieces){notice('Coloca la cuchilla dentro del clip, lejos de sus extremos.');return;}
      pause();checkpoint();workspace.clips=pieces;selected=pieces.at(-1).id;workspace.playhead=at;save();render();revealSelectedClip(selected);syncPlayback(true);paint();
      return;
     }
     selected=b.dataset.selectClip;inspectorTab='clip';render();
    };
    b.onpointermove=ev=>{
     if(editingTool!=='blade')return;
     const rect=b.getBoundingClientRect();
     if(rect.width>0)runtimeRules.get('clip:'+b.dataset.wbGeometryClip)?.style.setProperty('--blade-x',Math.max(0,Math.min(rect.width,ev.clientX-rect.left))+'px');
    };
    b.onpointerleave=()=>runtimeRules.get('clip:'+b.dataset.wbGeometryClip)?.style.removeProperty('--blade-x');
   b.onpointerdown=ev=>{
     if(ev.button!==0||rendering||editingTool==='blade')return;
     const clip=workspace.clips.find(c=>c.id===b.dataset.selectClip);
     if(!clip||!trackIsEditable(trackState,clip.track))return;
     const lane=b.parentElement,rect=lane.getBoundingClientRect();
     if(!rect.width||!Number.isFinite(ev.clientX))return;
     const hit=ev.target?.closest?.('.wb-trim-left,.wb-trim-right');
     const mode=hit?.classList.contains('wb-trim-left')?'trim-left':hit?.classList.contains('wb-trim-right')?'trim-right':'move';
     const initial=ev.clientX,original={...clip},pid=ev.pointerId;
     const env=root.ownerDocument.defaultView;
     if(!env)return;
     let moved=false,preview=original,ended=false;
     const matching=pe=>pid===undefined||pe.pointerId===undefined||pe.pointerId===pid;
     const cleanup=()=>{
      if(ended)return;ended=true;
      env.removeEventListener('pointermove',move,true);
      env.removeEventListener('pointerup',up,true);
      env.removeEventListener('pointercancel',cancel,true);
      b.classList.remove('wb-gesture-active','wb-gesture-trim');

      try{if(pid!==undefined&&b.hasPointerCapture?.(pid))b.releasePointerCapture(pid);}catch{}
     };
     const move=pe=>{
      if(!matching(pe))return;
      const pixels=pe.clientX-initial;
      if(!moved&&Math.abs(pixels)<4)return;
      moved=true;
      const seconds=pixels/Math.max(1,rulerWidth()/rulerSpan());
      preview=previewClipDrag(original,mode,seconds,{fps:workspace.fps,clips:workspace.clips,snapping});
      if(!preview)return;
      const visibleSpan=rulerSpan(),clipRule=runtimeRules.get('clip:'+b.dataset.wbGeometryClip);
      clipRule?.style.setProperty('left',(preview.start/visibleSpan*100).toFixed(5)+'%');
      clipRule?.style.setProperty('width',(preview.duration/visibleSpan*100).toFixed(5)+'%');
      b.dataset.previewStart=String(preview.start);b.dataset.previewDuration=String(preview.duration);
      b.classList.add('wb-gesture-active');
      const time=b.querySelector('.wb-clip-inner small');
      if(time)time.textContent=mediaTimecode(preview.duration,workspace.fps);
     };
     const up=pe=>{
      if(!matching(pe))return;
      cleanup();
      if(!moved||!clipDragChanged(original,preview))return;
      // Commit once on pointerup. No DOM replacement or timeline data mutation during drag.
      checkpoint();
      Object.assign(clip,{start:preview.start,duration:preview.duration,sourceStart:preview.sourceStart});
      selected=clip.id;inspectorTab='clip';save();render();revealSelectedClip(selected);paint();
     };
     const cancel=pe=>{if(!matching(pe))return;cleanup();if(moved)render();};
     env.addEventListener('pointermove',move,true);
     env.addEventListener('pointerup',up,true);
     env.addEventListener('pointercancel',cancel,true);
     b.classList.add('wb-gesture-trim');

     try{if(pid!==undefined)b.setPointerCapture?.(pid);}catch{}
     // Browser must not start text selection or native dragging instead of trimming.
     ev.preventDefault();
    };
  });
  root.querySelectorAll('[data-timeline-seek]').forEach(b=>b.onclick=ev=>{
   if(ev.target!==b)return;const r=b.getBoundingClientRect();pause();seek((ev.clientX-r.left)/r.width*rulerSpan());
  });
  // Standard desktop editing shortcuts, disabled when typing into forms or another panel.
  const shortcut=ev=>{
   if(!root.isConnected||!root.contains(root.ownerDocument.activeElement)&&root.ownerDocument.activeElement?.closest?.('input,textarea,select,[contenteditable=true]'))return;
   if(ev.target?.closest?.('input,textarea,select,[contenteditable=true]'))return;
   const key=(ev.key||'').toLowerCase();
   if((ev.ctrlKey||ev.metaKey)&&key==='z'){ev.preventDefault();restoreFrom(ev.shiftKey?future:history,ev.shiftKey?history:future);}
   else if((ev.ctrlKey||ev.metaKey)&&key==='y'){ev.preventDefault();restoreFrom(future,history);}
   else if(key==='v'&&!ev.ctrlKey&&!ev.metaKey){ev.preventDefault();editingTool='select';render();}
    else if(key==='c'&&!ev.ctrlKey&&!ev.metaKey){ev.preventDefault();editingTool='blade';render();}
    else if(key==='s'&&!ev.ctrlKey&&!ev.metaKey){ev.preventDefault();splitSelected();}
   else if(key===' '&&!ev.ctrlKey&&!ev.metaKey){ev.preventDefault();play();}
   else if((key==='delete'||key==='backspace')&&selected){ev.preventDefault();const clip=workspace.clips.find(x=>x.id===selected);if(clip&&trackIsEditable(trackState,clip.track)){checkpoint();workspace.clips=workspace.clips.filter(x=>x.id!==selected);selected=null;save();render();}}
  };
  root.onkeydown=shortcut;
  root.querySelectorAll('[data-property]').forEach(el=>el.onchange=ev=>{
   const c=workspace.clips.find(x=>x.id===selected);if(!c)return;
   if(!trackIsEditable(trackState,c.track)){notice('Desbloquea esta pista para modificar el clip.');return;}
   checkpoint();const key=ev.target.dataset.property,value=ev.target.value;
   if(key==='track'){if(allowedTracks[c.kind].includes(value))c.track=value;}
   else if(['text','prompt'].includes(key))c[key]=value.slice(0,key==='text'?180:3000);
   else {const ranges={start:[0,600],duration:[.1,120],sourceStart:[0,600],volume:[0,2],brightness:[0,200],contrast:[0,200],saturation:[0,200],blur:[0,20],opacity:[0,1],scale:[.25,4],x:[-1,1],y:[-1,1]};if(ranges[key])c[key]=number(value,...ranges[key]);}
   if(c.start+c.duration>600)c.duration=Math.max(.1,600-c.start);
   save();
   // Never replace the focused inspector field while Chrome is dispatching its change/blur event.
   const clipId=selected,reveal=key==='start'||key==='duration';
   const afterChange=()=>{if(!root.isConnected)return;render();if(reveal)revealSelectedClip(clipId);};
   const view=root.ownerDocument.defaultView;
   if(view?.requestAnimationFrame)view.requestAnimationFrame(afterChange);
   else setTimeout(afterChange,0);
  });
  const selectedClip=workspace.clips.find(c=>c.id===selected);
  if(selectedClip){
   el('studiowb-delete').onclick=()=>{if(!trackIsEditable(trackState,selectedClip.track)){notice('Pista bloqueada.');return;}checkpoint();workspace.clips=workspace.clips.filter(c=>c.id!==selected);media.get(selected)?.element.pause();media.delete(selected);selected=null;save();render();};
   el('studiowb-duplicate').onclick=()=>{if(!trackIsEditable(trackState,selectedClip.track)){notice('Pista bloqueada.');return;}checkpoint();const copy={...selectedClip,id:crypto.randomUUID(),start:selectedClip.start+selectedClip.duration};workspace.clips.push(copy);selected=copy.id;save();render();};
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
