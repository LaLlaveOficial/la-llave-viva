import {createTransition,transitionWindow,sanitizeTransitions,audioTransitionGain} from './studio-transitions.js';
import {renderVisualFrame} from './studio-compositor.js';
import {constrainSourceRange,prepareMediaFrame,extractVideoAudio} from './studio-playback.js';
import {parseSubtitles,addSubtitleCues,exportSubtitles} from './studio-subtitles.js';
import {animationProperties,animationTimes,animationValue,sampleAnimation,putKeyframe,removeKeyframe,sliceAnimation} from './studio-keyframes.js';
import {shortcutCatalog,resolveShortcut} from './studio-shortcuts.js';
import {compatibleTrack,insertTrack,fadeEnvelope} from './studio-tracks.js';
import {mediaDB,listMedia,readMedia,addMedia,trashMedia,restoreMedia,listTrashedMedia,workspaceKey,defaultWorkspace,parseWorkspace,timelineDuration,addTimelineClip} from './studio-media.js';
import {exportPortableBackup,importPortableBackup} from './studio-portable.js';
import {mountStudioCloud} from './studio-cloud066.js';
import {exportCanvasRecording,recordingBitrate} from './studio-recording.js';
import {encodeStudioMP4} from './studio-server-export.js';
import {preflightExportMedia,formatExportPreflightError} from './studio-export-preflight.js';
import {insertClipAt,splitClipAt,snapToEdges,trackPosition,pointerCutTime,pointerCutWithinClip,revealClipScroll,previewClipDrag,clipDragChanged} from './studio-timeline-tools.js';
import {extractPeaks,timelineSpan,mediaTimecode,trackIsEditable,trackIsAudible,trackIsVisible} from './studio-timeline-visuals.js';
// Editor en navegador, sin llamadas a proveedores ni consumo de créditos.
const e=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const number=(n,lo,hi)=>Math.min(hi,Math.max(lo,Number(n)||0));
const fmt=s=>Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0');

let studio066RuntimeSequence=0;
const tracksNames={V2:'Títulos / capas',V1:'Video / fotogramas',A1:'Voz / diálogos',A2:'Foley / música'};

const option=(value,actual,label)=>'<option value="'+e(value)+'"'+(String(actual)===String(value)?' selected':'')+'>'+e(label??value)+'</option>';
const ctrl=(name,label,value,min,max,step)=>'<label>'+label+'<input data-property="'+name+'" type="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+e(value)+'"></label>';
const toolIcon=name=>{
 if(name==='keyboard')return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h2m2 0h2m2 0h2m2 0h2M5 12h2m2 0h2m2 0h2m2 0h2M7 16h10"/></svg>';
 if(name==='keyframe')return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 8 9-8 9-8-9zM12 8v8M8 12h8"/></svg>';
 if(name==='subtitle')return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18v14H3zM10 9H7v6h3M17 9h-3v6h3M5 21h14"/></svg>';
 if(name==='extractAudio')return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h18v10H3zM8 19h8M12 14v5M15 8h3M17 7v5M7 7l4 2-4 2zM3 17v4M6 18v2M18 18v2M21 17v4"/></svg>';
 const paths={videoTransition:'M3 5h12v14H3zM9 5h12v14H9zM3 12h18M9 8l6 8',audioTransition:'M3 5l18 14M3 19 21 5M3 10v4M21 10v4',select:'M5 3v16l4-4 4 7 3-2-4-7h7Z',blade:'M9 9 20 3M9 15l11 6M9 9l11 12M9 15l11-12',split:'M12 3v18M4 6h5v12H4zM15 6h5v12h-5z',duplicate:'M9 8h11v13H9zM5 16H3V3h12v2',remove:'M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 10v7M14 10v7',snap:'M5 4v9a7 7 0 0 0 14 0V4h-4v9a3 3 0 0 1-6 0V4zM5 8h4M15 8h4',fit:'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 12h8M12 8v8',videoFadeIn:'M3 17h18M3 17 16 5M16 5v6M16 5h-6M19 4h2v7h-2z',videoFadeOut:'M3 17h18M3 5l13 12M16 17v-6M16 17h-6M19 4h2v7h-2z',audioFadeIn:'M3 18 13 6M13 6v5M13 6H8M17 6v12M20 10v5',audioFadeOut:'M3 6l10 12M13 18v-5M13 18H8M17 6v12M20 10v5',volume:'M3 9h4l5-5v16l-5-5H3zM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14'};
 return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+paths[name]+'"/>'+(name==='blade'?'<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/>':'')+'</svg>';
};
export function studioWorkbenchView(root,notice,project=null){
 let db,assets=[],workspace=defaultWorkspace(),selected=null,isPlaying=false,rendering=false,startTick=0,startTime=0;
 const runtimeId='s'+(++studio066RuntimeSequence),runtimeRules=new Map();let runtimeSheet=null;
 let audioCtx=null,mix=null,recorder=null,movieStop=null,media=new Map(),urls=new Map(),cache=new Map(),raf=0;
 let cloudDispose=null,exportAbort=null,timelineZoom=1,snapping=true,trash=[],showLocalTrash=false,editingTool='select',activeBin='media',mobilePane='timeline',mediaQuery='',sourceAssetId=null,inspectorTab='clip';
 let inspectorRenderFrame=0,pendingInspectorRefresh=null;
 let editorActive=false,keyboardHandler=null,scrubCleanup=null;
 const pendingInsertions=new Set();
 const editorDocument=root.ownerDocument;
 const keyboardListener=event=>{if(root.isConnected&&(editorActive||root.contains(event.target)))keyboardHandler?.(event);};
 const editorActivation=event=>{editorActive=root.contains(event.target);};
 editorDocument.addEventListener('keydown',keyboardListener);
 editorDocument.addEventListener('pointerdown',editorActivation,true);
 editorDocument.addEventListener('focusin',editorActivation);
 const history=[],future=[],waveforms=new Map(),transitionSurface={};
 let tracks=workspace.tracks;
 const trackState=Object.fromEntries(tracks.map(t=>[t,{locked:false,muted:false,hidden:false}]));
 const rulerSpan=()=>timelineSpan(workspace.clips,12);
 const rulerWidth=()=>Math.max(900,Math.ceil(rulerSpan()*80*timelineZoom));
 const rulerStep=seconds=>timelineZoom>=3?1:timelineZoom>=1.6?2:seconds>180?20:seconds>60?10:5;
 const lanePosition=(clientX,lane)=>{const bounds=lane.getBoundingClientRect();return trackPosition(clientX,bounds.left+lane.clientLeft,lane.clientWidth,rulerSpan());};
 const checkpoint=()=>{history.push(JSON.stringify(workspace));if(history.length>30)history.shift();future.length=0;};
 const canAddClip=()=>{if(workspace.clips.length<120)return true;notice('Máximo de 120 clips por montaje. Divide la pieza en proyectos para conservar el trabajo.');return false;};
 const restoreFrom=(source,dest)=>{if(!source.length)return;dest.push(JSON.stringify(workspace));workspace=parseWorkspace(JSON.parse(source.pop()))||defaultWorkspace();selected=null;syncTracks();save();render();};
 const localKey=workspaceKey+':'+(project&&Number.isSafeInteger(Number(project.id))?Number(project.id):'scratch');
 const firstWorkspace=()=>({...defaultWorkspace(),name:project?.name||defaultWorkspace().name});
 const safeLoad=()=>{try{return parseWorkspace(JSON.parse(localStorage.getItem(localKey)||'null'))||firstWorkspace();}catch{return firstWorkspace();}};
 workspace=safeLoad();tracks=workspace.tracks;
 const syncTracks=()=>{tracks=workspace.tracks;for(const t of tracks)trackState[t]??={locked:false,muted:false,hidden:false};};
 syncTracks();
 const trackStateKey=localKey+':track-prefs';
 try{const stored=JSON.parse(localStorage.getItem(trackStateKey)||'{}');
  for(const t of tracks)for(const k of ['locked','muted','hidden'])if(typeof stored?.[t]?.[k]==='boolean')trackState[t][k]=stored[t][k];
 }catch{}
 const saveTrackPrefs=()=>{try{localStorage.setItem(trackStateKey,JSON.stringify(trackState));}catch{}};
 function save(){const normalized=sanitizeTransitions(workspace.clips);workspace.clips.forEach((c,i)=>{for(const key of ['videoTransition','audioTransition']){if(normalized[i][key])c[key]=normalized[i][key];else delete c[key];}});syncTracks();try{localStorage.setItem(localKey,JSON.stringify(workspace));}catch{notice('No se pudo guardar el montaje localmente. Exporta el proyecto JSON.');}}
 function activeClip(c,t){return t>=c.start&&t<c.start+c.duration;}
 function clipSource(c,t){return c.sourceStart+(t-c.start);}
 function seek(t,{persist=true}={}){workspace.playhead=number(t,0,timelineDuration(workspace.clips));if(persist)save();syncPlayback(true);paint();drawTime();}
 function dimensions(){const r=workspace.aspect==='9:16'?[9,16]:workspace.aspect==='16:9'?[16,9]:workspace.aspect==='1.91:1'?[191,100]:[1,1];const short=workspace.quality==='1080p'?1080:720;const landscape=r[0]>=r[1];const w=landscape?Math.round(short*r[0]/r[1]/2)*2:short;const h=landscape?short:Math.round(short*r[1]/r[0]/2)*2;return {w,h};}
 function findAsset(id){return assets.find(a=>a.id===id);}
 async function getUrl(id){if(urls.has(id))return urls.get(id);const data=await readMedia(db,id);if(!data)return null;const url=URL.createObjectURL(data.blob);urls.set(id,url);return url;}
 async function getMedia(c){
  if(media.has(c.id)&&media.get(c.id).assetId===c.assetId)return media.get(c.id);
  releaseMedia(c.id);
  const asset=findAsset(c.assetId);if(!asset||c.kind==='image'||c.kind==='text')return null;
  const url=await getUrl(c.assetId);if(!url)return null;
  const el=document.createElement(c.kind==='audio'?'audio':'video');el.src=url;el.preload='auto';el.playsInline=true;el.crossOrigin='anonymous';
  el.muted=false;el.volume=1;media.set(c.id,{element:el,assetId:c.assetId,gain:null,source:null});
  await new Promise(resolve=>{if(el.readyState>=1){resolve();return;}let timer;const done=()=>{clearTimeout(timer);el.removeEventListener('loadedmetadata',done);el.removeEventListener('error',done);resolve();};el.addEventListener('loadedmetadata',done,{once:true});el.addEventListener('error',done,{once:true});timer=setTimeout(done,8000);});
  el.addEventListener('seeked',paint);el.addEventListener('loadeddata',paint);
  return media.get(c.id);
 }
 async function getPicture(c){if(cache.has(c.assetId))return cache.get(c.assetId);const u=await getUrl(c.assetId);if(!u)return null;const img=new Image();img.src=u;await img.decode().catch(()=>{});cache.set(c.assetId,img);return img;}
 async function prime(){
  reconcileMedia();
  await Promise.all(workspace.clips.map(async c=>{try{if(c.kind==='image')await getPicture(c);else if(c.kind!=='text')await getMedia(c);}catch{}}));
 }
 function releaseMedia(id){const item=media.get(id);if(!item)return;item.element.pause();item.element.removeEventListener('seeked',paint);item.element.removeEventListener('loadeddata',paint);item.source?.disconnect();item.gain?.disconnect();item.element.removeAttribute('src');item.element.load();media.delete(id);}
 function reconcileMedia(){for(const [id,item] of media){if(pendingInsertions.has(id))continue;const clip=workspace.clips.find(c=>c.id===id);if(!clip||clip.assetId!==item.assetId)releaseMedia(id);}}
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
  reconcileMedia();
  const t=workspace.playhead,audioWindows=workspace.clips.map(c=>transitionWindow(workspace.clips,c,'audio')).filter(Boolean);
  for(const c of workspace.clips){
   const m=media.get(c.id);if(!m)continue;
   const on=activeClip(c,t);
   const target=Math.max(0,clipSource(c,t));
   if(on&&(force||Math.abs(m.element.currentTime-target)>.35))try{m.element.currentTime=target;}catch{}
   m.element.muted=!trackIsAudible(trackState,c.track);
   const volume=animationValue(c,'volume',t-c.start);
    if(m.gain)m.gain.gain.value=on&&trackIsAudible(trackState,c.track)?number(volume,0,2)*fadeEnvelope(c,t,'audio')*audioTransitionGain(workspace.clips,c,t,audioWindows):0;
   if(m.gain)m.element.volume=1;else m.element.volume=on&&trackIsAudible(trackState,c.track)?Math.min(1,number(volume,0,2)*fadeEnvelope(c,t,'audio')*audioTransitionGain(workspace.clips,c,t,audioWindows)):0;
   if(isPlaying&&on&&m.element.paused)m.element.play().catch(()=>{});
   else if((!isPlaying||!on)&&!m.element.paused)m.element.pause();
  }
 }
 const canvas=()=>root.querySelector('#studiowb-canvas');
 function paint(){
  const cvs=canvas();if(!cvs||!cvs.isConnected)return;
  const {w,h}=dimensions();if(cvs.width!==w)cvs.width=w;if(cvs.height!==h)cvs.height=h;
  const t=Math.min(workspace.playhead,Math.max(0,timelineDuration(workspace.clips)-1/Math.max(24,workspace.fps)));
  renderVisualFrame({canvas:cvs,clips:workspace.clips,tracks,trackState,time:t,surface:transitionSurface,sources:c=>c.kind==='image'?cache.get(c.assetId):media.get(c.id)?.element});
 }
 function drawTime(){
  const l=root.querySelector('#studiowb-time');if(l)l.textContent=mediaTimecode(workspace.playhead,workspace.fps)+' / '+mediaTimecode(timelineDuration(workspace.clips),workspace.fps);
  const rulerTime=root.querySelector('.wb-ruler-title small');if(rulerTime)rulerTime.textContent=mediaTimecode(workspace.playhead,workspace.fps);
  const selectedClip=workspace.clips.find(c=>c.id===selected);if(selectedClip){const values=sampleAnimation(selectedClip,workspace.playhead);for(const key of animationProperties(selectedClip.kind)){const field=root.querySelector('[data-property="'+key+'"]');if(field&&field!==root.ownerDocument.activeElement)field.value=String(Math.round(values[key]*10000)/10000);}const label=root.querySelector('#studiowb-keyframe-time');if(label)label.textContent='Tiempo del clip: '+mediaTimecode(Math.max(0,workspace.playhead-selectedClip.start),workspace.fps);}
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
  if(rendering)return;
  if(isPlaying){pause();return;}
  try{audioGraph();await audioCtx?.resume();await prime();connectSources();}catch{}
  if(rendering||!root.isConnected)return;
  if(workspace.playhead>=timelineDuration(workspace.clips))workspace.playhead=0;
  isPlaying=true;startTime=workspace.playhead;startTick=performance.now();syncPlayback(true);
  const b=root.querySelector('#studiowb-play');if(b)b.textContent='⏸ Pausar';
  tick();
 }
 async function saveExport(){
  if(rendering)return;
  scrubCleanup?.();
  if(workspace.clips.length===0){notice('Agrega al menos un clip al timeline.');return;}
  const duration=timelineDuration(workspace.clips);
  if(duration>120){notice('Por seguridad, exporta secuencias de hasta 120 segundos.');return;}
  const before=workspace.playhead;
  const outputFormat=workspace.exportFormat||'webm';
  rendering=true;
  exportAbort=new AbortController();
  const exportControls=Array.from(root.querySelectorAll('button,input,select,textarea')).map(node=>[node,node.disabled]);
  exportControls.forEach(([node])=>node.disabled=true);
  const cancelButton=root.ownerDocument.createElement('button');cancelButton.type='button';cancelButton.id='studiowb-cancel-export';cancelButton.className='subtle';cancelButton.textContent='Cancelar exportación';cancelButton.onclick=()=>exportAbort?.abort();root.querySelector('.wb-row')?.append(cancelButton);
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
   for(const c of workspace.clips)for(const channel of ['video','audio']){const pair=transitionWindow(workspace.clips,c,channel);if(pair&&transitionSourceLimit(pair)+.001<pair.duration)throw new Error('La transición excede el material original disponible. Acorta su duración o ajusta el solape.');}
   const useAudio=workspace.clips.some(c=>c.kind==='audio'||c.kind==='video');
   if(useAudio){audioGraph();await audioCtx?.resume();connectSources();}
   await Promise.all(workspace.clips.filter(c=>['audio','video'].includes(c.kind)).map(c=>prepareMediaFrame(media.get(c.id).element,c.sourceStart||0,{signal:exportAbort.signal})));
   isPlaying=true;syncPlayback();paint();
   let {blob,format}=await exportCanvasRecording({
    canvas:canvas(),seconds:duration,fps:workspace.fps,format:'webm',
    audioTracks:useAudio&&mix?mix.stream.getAudioTracks():[],
    bitrate:recordingBitrate(workspace.quality,workspace.encodingQuality||'high'),
    signal:exportAbort.signal,
    onProgress:value=>{if(button)button.textContent='Capturando montaje · '+Math.round(value*100)+'%';},
    onFrame:async elapsed=>{
     workspace.playhead=Math.min(elapsed,Math.max(0,duration-1/(workspace.fps*4)));
     syncPlayback();paint();drawTime();
    }
   });
   if(outputFormat==='mp4'){
    pause();blob=await encodeStudioMP4(blob,{seconds:duration,fps:workspace.fps,quality:workspace.encodingQuality||'high',resolution:workspace.quality,signal:exportAbort.signal,onProgress:(stage,percent)=>{if(button)button.textContent=stage+' · '+percent+'%';}});format='mp4';
   }
   if(exportAbort.signal.aborted)return;
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='estudio066-'+workspace.aspect.replace(':','x')+'-'+workspace.quality+'-'+(workspace.encodingQuality||'high')+'.'+format;
   a.click();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
   notice(format.toUpperCase()+' exportado ('+(blob.size/1048576).toFixed(2)+' MB). Revisa duración, audio y calidad antes de publicar.');
  }catch(error){
   if(!exportAbort?.signal.aborted)notice('No se pudo exportar: '+error.message);
  }finally{
   pause();workspace.playhead=before;save();syncPlayback(true);paint();drawTime();
   rendering=false;exportAbort=null;cancelButton.remove();exportControls.forEach(([node,disabled])=>{if(node.isConnected)node.disabled=disabled;});
   if(button){button.disabled=false;button.textContent='Exportar '+outputFormat.toUpperCase();}
   if(seekBar)seekBar.disabled=false;
   if(playBtn)playBtn.disabled=false;
  }
 }
 function mediaCard(a,discarded=false){
  return '<div class="wb-media-item" '+(discarded?'':'draggable="true" data-drag-asset="'+e(a.id)+'"')+'><div class="wb-media-tile"><button type="button" class="wb-source-select" data-source-asset="'+e(a.id)+'" title="Ver original" aria-label="Previsualizar '+e(a.name)+'"><div class="wb-thumb">'+(a.kind==='image'?'<img loading="lazy" data-media-thumb="'+e(a.id)+'" alt="'+e(a.name)+'">':a.kind==='video'?'<video muted playsinline preload="metadata" data-media-thumb="'+e(a.id)+'" aria-label="'+e(a.name)+'"></video>':'♫')+'</div></button><div><b>'+e(a.name)+'</b><small>'+e(a.kind.toUpperCase())+' · '+(a.size/1048576).toFixed(1)+' MB</small></div></div><div class="wb-row">'+(discarded?'<button type="button" class="subtle" data-revive-asset="'+e(a.id)+'">↶ Restaurar</button>':'<button type="button" class="subtle" data-add-asset="'+e(a.id)+'">+ Al final</button><button type="button" class="subtle" data-insert-asset="'+e(a.id)+'">+ En cabezal</button><button type="button" class="subtle" data-remove-asset="'+e(a.id)+'">Papelera</button>')+'</div></div>';
 }
 function propertyPanel(){
  const original=workspace.clips.find(x=>x.id===selected),c=original?{...original,...sampleAnimation(original,workspace.playhead)}:null;
  const tabs=[['clip','Clip'],['color','Color'],['sound','Audio'],['prompt','Guion / IA']];
  const header='<div class="wb-inspector-head"><span class="studio-caption">INSPECTOR CONTEXTUAL</span><h3>'+(c?'◈ '+e(c.kind)+' · '+e(c.id.slice(0,8)):'Inspector de medios')+'</h3></div>'+
    '<nav class="wb-inspector-tabs" aria-label="Propiedades del clip">'+tabs.map(([tab,name])=>'<button type="button" data-inspector-tab="'+tab+'" aria-pressed="'+(inspectorTab===tab)+'">'+name+'</button>').join('')+'</nav>';
  if(!c)return '<div class="wb-inspector" data-inspector-tab="'+inspectorTab+'">'+header+'<div class="wb-inspector-empty"><span>◎</span><strong>Selecciona un clip</strong><small>Elige un bloque del timeline para editar imagen, audio, color y guion.</small></div></div>';
  const available=tracks.filter(t=>compatibleTrack(c.kind,t));
  return '<div class="wb-inspector" data-inspector-tab="'+inspectorTab+'">'+header+
    (!trackIsEditable(trackState,c.track)?'<p class="wb-inspector-locked">🔒 Esta pista está bloqueada. Desbloquéala para modificar el clip.</p>':'')+
    keyframePanel(c)+
    '<div class="wb-inspector-section" data-inspector-panel="clip"><label>Pista<select data-property="track">'+available.map(t=>option(t,c.track,t+' · '+(tracksNames[t]||'Pista de '+(t[0]==='V'?'video':'audio')))).join('')+'</select></label>'+
    '<div class="studio-fields">'+ctrl('start','Inicio (s)',c.start,0,600,.1)+ctrl('duration','Duración (s)',c.duration,.1,120,.1)+ctrl('sourceStart','Entrada original (s)',c.sourceStart??0,0,600,.1)+'</div>'+
    (c.kind==='text'?'<label>Tipo de texto<select data-property="textRole">'+option('title',c.textRole||'title','Título')+option('subtitle',c.textRole||'title','Subtítulo')+'</select></label><label>'+(c.textRole==='subtitle'?'Subtítulo':'Título')+'<textarea data-property="text" maxlength="'+(c.textRole==='subtitle'?500:180)+'" rows="3">'+e(c.text||'')+'</textarea></label>'+(c.textRole==='subtitle'?'<div class="studio-fields">'+ctrl('subtitleSize','Tamaño (% lado corto)',c.subtitleSize??4.8,2,10,.2)+ctrl('subtitleY','Posición vertical (%)',c.subtitleY??88,10,95,1)+ctrl('subtitleBackground','Fondo (0–1)',c.subtitleBackground??.65,0,1,.05)+'</div>':''):'')+
    '<div class="wb-row wb-clip-actions"><button type="button" class="subtle" id="studiowb-duplicate">Duplicar</button><button type="button" class="subtle" id="studiowb-delete">Eliminar clip</button></div></div>'+
    '<div class="wb-inspector-section" data-inspector-panel="color">'+(c.kind==='audio'?'<p class="studio-help">Los clips de audio no tienen ajustes visuales.</p>':
    '<h4>Corrección básica</h4><div class="studio-fields">'+ctrl('brightness','Brillo %',c.brightness??100,0,200,5)+ctrl('contrast','Contraste %',c.contrast??100,0,200,5)+ctrl('saturation','Saturación %',c.saturation??100,0,200,5)+ctrl('blur','Desenfoque',c.blur??0,0,20,1)+ctrl('opacity','Opacidad',c.opacity??1,0,1,.1)+ctrl('scale','Escala',c.scale??1,.25,4,.1)+ctrl('x','Posición X',c.x??0,-1,1,.1)+ctrl('y','Posición Y',c.y??0,-1,1,.1)+ctrl('videoFadeIn','Fundido de video · entrada (s)',c.videoFadeIn||0,0,c.duration/2,.1)+ctrl('videoFadeOut','Fundido de video · salida (s)',c.videoFadeOut||0,0,c.duration/2,.1)+'</div>'+transitionControls(c,'video'))+'</div>'+
    '<div class="wb-inspector-section" data-inspector-panel="sound"><h4>Mezcla de audio</h4><div class="studio-fields">'+ctrl('volume','Volumen (0–2)',c.volume??1,0,2,.1)+ctrl('audioFadeIn','Fundido de audio · entrada (s)',c.audioFadeIn||0,0,c.duration/2,.1)+ctrl('audioFadeOut','Fundido de audio · salida (s)',c.audioFadeOut||0,0,c.duration/2,.1)+'</div><p class="studio-help">Silencia o activa una pista desde sus controles. Los fundidos ajustan el volumen al inicio y al final del clip.</p>'+transitionControls(c,'audio')+'</div>'+
    '<div class="wb-inspector-section" data-inspector-panel="prompt"><label>Prompt técnico<textarea data-property="prompt" rows="8" maxlength="3000" placeholder="Camera, lens, motion, lighting, continuity...">'+e(c.prompt||'')+'</textarea></label><button type="button" class="subtle" id="studiowb-copy">Copiar prompt</button><p class="studio-help">Guarda instrucciones de producción. No consume créditos ni envía datos a motores IA.</p></div></div>';
 }
 function keyframePanel(c){
  const times=animationTimes(c),properties=animationProperties(c.kind),names={x:'X',y:'Y',scale:'Escala',opacity:'Opacidad',volume:'Volumen'};
  return '<details class="wb-keyframes" '+(times.length?'open':'')+'><summary>◆ Keyframes · '+times.length+' puntos</summary><small id="studiowb-keyframe-time">Tiempo del clip: '+mediaTimecode(Math.max(0,workspace.playhead-c.start),workspace.fps)+'</small><p class="studio-help">'+properties.map(key=>names[key]).join(', ')+'. Añade un punto; después cambia los valores en otro tiempo del clip. Interpolación lineal.</p><div class="wb-row"><button type="button" class="subtle" id="studiowb-keyframe-add">◆ Guardar punto</button><button type="button" class="subtle" id="studiowb-keyframe-remove">Quitar punto actual</button><button type="button" class="subtle" id="studiowb-keyframe-clear">Quitar animación</button></div><div class="wb-keyframe-points">'+times.map(time=>'<button type="button" class="subtle" data-keyframe-seek="'+time+'" title="Ir a keyframe">◆ '+mediaTimecode(time,workspace.fps)+'</button>').join('')+'</div></details>';
 }
 function transitionSourceLimit(pair){
  let limit=Math.min(10,pair.overlap);
  for(const c of [pair.outgoing,pair.incoming])if(['video','audio'].includes(c.kind)){
   const duration=media.get(c.id)?.element.duration;
   if(!Number.isFinite(duration))return 0;
   limit=Math.min(limit,duration-clipSource(c,pair.start));
  }
  return Math.max(0,limit);
 }
 function transitionControls(c,channel){
  const pair=transitionWindow(workspace.clips,c,channel),key=channel+'Transition';
  if(!pair)return '';
  return '<div class="wb-transition-properties"><h4>'+(channel==='video'?'Disolución de video':'Fundido cruzado de audio')+'</h4><p class="studio-help">Desde '+e(findAsset(pair.outgoing.assetId)?.name||'clip anterior')+' · Solape '+pair.overlap.toFixed(2)+' s</p>'+ctrl(key,'Duración de transición (s)',pair.duration,.1,transitionSourceLimit(pair),.1)+'<button type="button" class="subtle" data-remove-transition="'+channel+'">Quitar transición</button></div>';
 }
 function transitionMarkers(track){
  return workspace.clips.filter(c=>c.track===track).flatMap(c=>['video','audio'].map(channel=>{
   const pair=transitionWindow(workspace.clips,c,channel);if(!pair)return '';
   return '<button type="button" class="wb-transition-marker wb-transition-'+channel+'" data-select-transition="'+e(c.id)+'" data-transition-channel="'+channel+'" data-transition-start="'+pair.start+'" data-transition-duration="'+pair.duration+'" title="'+(channel==='video'?'Disolución de video':'Fundido cruzado de audio')+' · '+pair.duration.toFixed(2)+' s" aria-label="Editar transición de '+channel+'">'+toolIcon(channel+'Transition')+'</button>';
  })).join('');
 }
 function timeRuler(){
  const seconds=rulerSpan(),step=rulerStep(seconds);
  let ticks='';for(let t=0;t<=seconds;t+=step)ticks+='<span class="wb-time-tick" data-time-tick="'+t+'">'+fmt(t)+'</span>';
  return ticks;
 }
 function trackHeader(track){
  const state=trackState[track],v=track.startsWith('V');
  const short=tracksNames[track]|| (v?'Video / capas':'Audio / mezcla');
  return '<div class="wb-track-label wb-pro-track-label"><div class="wb-track-label-top"><b class="wb-track-tag '+(v?'wb-track-video':'wb-track-audio')+'">'+track+'</b><span>'+short+'</span></div><div class="wb-track-actions">'+
   '<button type="button" data-track-flag="'+track+':locked" aria-pressed="'+state.locked+'" title="'+(state.locked?'Desbloquear':'Bloquear')+' '+track+'">'+(state.locked?'🔒':'♧')+'</button>'+
   (v?'<button type="button" data-track-flag="'+track+':hidden" aria-pressed="'+state.hidden+'" title="'+(state.hidden?'Mostrar':'Ocultar')+' '+track+'">'+(state.hidden?'◌':'◉')+'</button>':
   '<button type="button" data-track-flag="'+track+':muted" aria-pressed="'+state.muted+'" title="'+(state.muted?'Activar audio':'Silenciar')+' '+track+'">'+(state.muted?'🔇':'♫')+'</button>')+'</div></div>';
 }
 function trackGap(kind,before){return '<div class="wb-track-gap" data-track-gap="'+kind+'" data-before-track="'+(before||'')+'" title="Arrastra aquí para crear una pista de '+(kind==='audio'?'audio':'video')+'"><span>＋ Nueva pista de '+(kind==='audio'?'audio':'video')+'</span></div>';}
 function timeline(){
  const seconds=rulerSpan(),width=rulerWidth(),step=rulerStep(seconds),gridStep=(width*step/seconds).toFixed(2);
  return '<div class="wb-timeline" data-tool="'+editingTool+'" data-ruler-span="'+seconds+'" data-ruler-step="'+step+'" tabindex="0" aria-label="Secuencia de montaje"><div class="wb-ruler"><div class="wb-track-label wb-ruler-title"><span>TIEMPO</span><small>'+mediaTimecode(workspace.playhead,workspace.fps)+'</small></div><div class="wb-ruler-times" data-ruler-seek="true" >'+timeRuler()+'<div id="studiowb-ruler-cursor" class="wb-ruler-cursor" ></div></div></div>'+
   tracks.map(track=>trackGap(track[0]==='A'?'audio':'video',track)+'<div class="wb-track'+(trackState[track].locked?' wb-track-locked':'')+(trackState[track].muted||trackState[track].hidden?' wb-track-disabled':'')+'">'+trackHeader(track)+'<div class="wb-track-content" data-timeline-seek="'+track+'" >'+workspace.clips.filter(c=>c.track===track).map(clip=>{
    const asset=findAsset(clip.assetId),left=clip.start/seconds*100,wide=clip.duration/seconds*100,name=clip.kind==='text'?clip.text||'TÍTULO':asset?.name||'Original ausente';
    const frame=1/workspace.fps,isMediaSplit=clip.kind!=='text'&&Boolean(clip.assetId);
    const splitAfter=isMediaSplit&&workspace.clips.some(other=>other.id!==clip.id&&other.track===clip.track&&other.assetId===clip.assetId&&Math.abs(clip.start+clip.duration-other.start)<=frame&&Math.abs((clip.sourceStart||0)+clip.duration-(other.sourceStart||0))<=frame);
    const thumb=asset&&clip.kind==='image'?'<img class="wb-block-thumbnail" data-clip-image="'+e(asset.id)+'" alt="" aria-hidden="true">':
      asset&&clip.kind==='video'?'<video class="wb-block-thumbnail" data-clip-video="'+e(asset.id)+'" muted playsinline preload="metadata" aria-hidden="true"></video>':'';
    const wave=asset&&clip.kind==='audio'?'<canvas class="wb-waveform" data-waveform-id="'+e(asset.id)+'" aria-hidden="true"></canvas>':'';
    return '<button type="button" data-select-clip="'+e(clip.id)+'" class="wb-block wb-pro-clip '+(selected===clip.id?'selected ':'')+'wb-'+e(clip.kind)+'" title="'+e(name)+'">'+thumb+wave+((clip.videoFadeIn||clip.audioFadeIn)?'<span class="wb-fade-marker wb-fade-entry" title="Fundido de entrada">◿</span>':'')+((clip.videoFadeOut||clip.audioFadeOut)?'<span class="wb-fade-marker wb-fade-exit" title="Fundido de salida">◺</span>':'')+(splitAfter?'<i class="wb-cut-seam" aria-hidden="true"></i>':'')+'<span class="wb-clip-inner"><b>'+e(name)+'</b><small>'+mediaTimecode(clip.duration,workspace.fps)+'</small></span>'+
    (!asset&&clip.kind!=='text'?'<span class="wb-clip-missing">Falta original</span>':'')+animationTimes(clip).map(time=>'<span class="wb-keyframe-marker" data-keyframe-time="'+time+'" title="Keyframe '+mediaTimecode(time,workspace.fps)+'" aria-hidden="true">◆</span>').join('')+'<span class="wb-trim-left" title="Arrastra para cambiar entrada del clip"></span><span class="wb-trim-right" title="Arrastra para estirar o recortar el clip"></span></button>';
   }).join('')+transitionMarkers(track)+'<div class="wb-cursor" ></div></div></div>'+((track===tracks.filter(t=>t[0]==='V').at(-1))?trackGap('video',null):'')).join('')+trackGap('audio',null)+'</div>';
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
   '<div class="wb-settings"><label>Proyecto<input id="studiowb-name" maxlength="160" value="'+e(workspace.name)+'"></label><label>Orientación<select id="studiowb-aspect">'+['9:16','16:9','1:1','1.91:1'].map(v=>option(v,workspace.aspect)).join('')+'</select></label><label>Resolución<select id="studiowb-quality">'+['720p','1080p'].map(v=>option(v,workspace.quality)).join('')+'</select></label><label>FPS<select id="studiowb-fps">'+[24,30].map(v=>option(v,workspace.fps,v+' fps')).join('')+'</select></label><label>Archivo<select id="studiowb-format">'+option('webm',workspace.exportFormat||'webm','WebM · VP9/VP8')+option('mp4',workspace.exportFormat||'webm','MP4 · H.264 / AAC · Houston')+'</select></label><label>Calidad<select id="studiowb-encode-quality">'+[['standard','Estándar'],['high','Alta'],['master','Máster']].map(([v,l])=>option(v,workspace.encodingQuality||'high',l)).join('')+'</select></label></div>'+
   '<div class="wb-workarea"><aside class="wb-library" aria-label="Explorador multimedia"><div class="wb-pane-heading"><span class="wb-pane-kicker">RECURSOS DEL PROYECTO</span><h3>Biblioteca <span class="wb-count">'+(assets.length+trash.length)+'</span></h3></div><div class="wb-bin-tabs" role="group" aria-label="Explorar recursos">'+[['media','Medios'],['cloud','Nube'],['text','Texto'],['audio','Audio']].map(([id,label])=>'<button type="button" data-bin-switch="'+id+'" aria-pressed="'+(activeBin===id)+'">'+label+'</button>').join('')+'</div><div class="wb-bin-local"><label class="wb-file-label">＋ Importar video, imagen o audio<input type="file" id="studiowb-upload" multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,audio/*"></label><label class="wb-search-wrap"><span>⌕</span><input id="studiowb-media-search" type="search" placeholder="Buscar medios…" value="'+e(mediaQuery)+'" aria-label="Buscar archivos en biblioteca"></label>'+
   '<div class="wb-library-head"><button id="studiowb-local-library" class="subtle" type="button" aria-pressed="'+(!showLocalTrash)+'">Archivos ('+assets.length+')</button><button id="studiowb-local-trash" class="subtle" type="button" aria-pressed="'+showLocalTrash+'">Papelera ('+trash.length+')</button></div><div class="wb-media-list">'+(showLocalTrash?(trash.length?trash.map(a=>mediaCard(a,true)).join(''):'<p class="studio-help">Papelera vacía.</p>'):(assets.filter(a=>(activeBin!=='audio'||a.kind==='audio')&&a.name.toLowerCase().includes(mediaQuery.toLowerCase())).length?assets.filter(a=>(activeBin!=='audio'||a.kind==='audio')&&a.name.toLowerCase().includes(mediaQuery.toLowerCase())).map(a=>mediaCard(a,false)).join(''):'<p class="studio-help">No hay medios con ese filtro. Puedes importar o recuperar originales desde Nube.</p>'))+'</div></div><div class="wb-bin-text"><p class="wb-pane-kicker">TÍTULOS Y CAPAS</p><p class="studio-help">Agrega títulos en el cabezal; cambia el contenido en el inspector.</p><button type="button" class="wb-title-quick" id="studiowb-title">＋ Añadir título al montaje</button><div class="wb-title-sample">CASO 066 <small>Texto editable · V2</small></div><div class="wb-subtitle-files"><p class="wb-pane-kicker">SUBTÍTULOS</p><label class="wb-file-label">Importar SRT / VTT<input id="studiowb-subtitles-import" type="file" accept=".srt,.vtt,text/vtt,application/x-subrip,text/plain"></label><button type="button" class="subtle" id="studiowb-subtitles-export">Exportar subtítulos SRT</button><p class="studio-help">Tiempos del montaje. Se dibujan en el video; no generan voz ni transcripción automática.</p></div></div><div id="studiowb-cloud" class="wb-cloud-wrap"></div><div class="wb-source-pane" id="studiowb-source-pane"'+(!findAsset(sourceAssetId)?' hidden':'')+'><span class="wb-pane-kicker">ORIGEN · VISTA PREVIA</span><div class="wb-source-frame" id="studiowb-source-frame">Selecciona una miniatura para inspeccionarla</div><button id="studiowb-source-add" class="subtle" type="button"'+(!sourceAssetId?' disabled':'')+'>＋ Insertar en cabezal</button></div></aside>'+
   '<div class="wb-stage"><div class="wb-monitor-bar"><span class="wb-pane-kicker"><span class="wb-dot"></span> PROGRAMA · '+e(workspace.name)+'</span><span class="wb-monitor-status">Vista previa local · Sin créditos</span></div>'+(workspace.clips.some(c=>c.kind!=='text'&&!findAsset(c.assetId))?'<p class="studio-help wb-media-warning" role="status">Este montaje incluye medios que faltan en este navegador. Recupera los originales desde Biblioteca privada antes de exportar.</p>':'')+'<div class="wb-preview-box"><canvas id="studiowb-canvas" aria-label="Vista previa de composición"></canvas></div><div class="wb-controls"><button type="button" class="subtle" id="studiowb-stop" title="Volver al inicio" aria-label="Volver al inicio">⏮</button><button type="button" class="wb-play-primary" id="studiowb-play">▶ Reproducir</button><strong id="studiowb-time"></strong><button type="button" id="studiowb-export">⇧ Exportar '+e((workspace.exportFormat||'webm').toUpperCase())+'</button></div><input id="studiowb-seek" type="range" min="0" max="5" step=".05" value="'+workspace.playhead+'" aria-label="Posición en montaje"><p class="studio-help">1080p y calidad Máster son opciones reales de codificación del navegador, pero no garantizan detalle extra del original. El navegador captura el montaje y Houston codifica el MP4 H.264/AAC. Hasta 120 segundos y 128 MB de captura. Mantén esta pestaña abierta hasta descargar. 2K/4K todavía no disponibles.</p></div>'+
   propertyPanel()+'</div><div class="wb-timeline-panel"><div class="wb-timeline-heading"><strong>◫ Timeline multitrack</strong><span>'+workspace.clips.length+' clips · '+workspace.fps+' FPS · '+e(workspace.aspect)+'</span></div>'+
   '<div class="wb-edit-toolbar" role="toolbar" aria-label="Herramientas de edición de línea de tiempo"><span class="wb-tool-section">HERRAMIENTAS</span>'+
    '<button type="button" id="studiowb-select-tool" title="Selección (V). Arrastra clips para moverlos." aria-label="Herramienta Selección, tecla V" aria-pressed="'+(editingTool==='select')+'">'+toolIcon('select')+'</button>'+
    '<button type="button" id="studiowb-blade-tool" title="Cuchilla (C). Haz clic en un clip para dividir justo donde apunta el cursor." aria-label="Herramienta Cuchilla, tecla C" aria-pressed="'+(editingTool==='blade')+'">'+toolIcon('blade')+'</button>'+
    '<span class="wb-tool-separator" aria-hidden="true"></span>'+
    '<button type="button" id="studiowb-split" title="Divide el clip seleccionado en el cabezal (S)">'+toolIcon('split')+'</button>'+
    '<button type="button" id="studiowb-toolbar-duplicate" title="Duplicar (D)" aria-label="Duplicar (D)">'+toolIcon('duplicate')+'</button>'+
    '<button type="button" id="studiowb-extract-audio" title="Extraer audio del video (Shift+E)" aria-label="Extraer audio del video (Shift+E)">'+toolIcon('extractAudio')+'</button>'+
    '<button type="button" id="studiowb-subtitle" title="Añadir subtítulo (Shift+L)" aria-label="Añadir subtítulo (Shift+L)">'+toolIcon('subtitle')+'</button>'+
    '<button type="button" id="studiowb-keyframe" title="Guardar keyframe (Shift+K)" aria-label="Guardar keyframe (Shift+K)">'+toolIcon('keyframe')+'</button>'+
    '<button type="button" id="studiowb-keyboard" title="Herramientas y atajos (Shift+/)" aria-label="Herramientas y atajos (Shift+/)">'+toolIcon('keyboard')+'</button>'+
    '<button type="button" id="studiowb-toolbar-remove" title="Quitar (Supr)" aria-label="Quitar (Supr)">'+toolIcon('remove')+'</button>'+
    '<span class="wb-tool-separator" aria-hidden="true"></span>'+
    '<button type="button" id="studiowb-snap" title="Imán (M)" aria-label="Imán (M)" aria-pressed="'+snapping+'">'+toolIcon('snap')+'</button>'+
    '<span class="wb-tool-separator" aria-hidden="true"></span>'+['videoFadeIn','videoFadeOut','audioFadeIn','audioFadeOut','volume'].map((key,i)=>'<button type="button" data-edit-effect="'+key+'" title="'+['Video: fade in (I)','Video: fade out (O)','Audio: fade in (Shift+I)','Audio: fade out (Shift+O)','Volumen (G)'][i]+'" aria-label="'+['Video: fade in (I)','Video: fade out (O)','Audio: fade in (Shift+I)','Audio: fade out (Shift+O)','Volumen (G)'][i]+'">'+toolIcon(key)+'</button>').join('')+
    ['video','audio'].map(channel=>'<button type="button" data-add-transition="'+channel+'" title="'+(channel==='video'?'Disolución entre clips (T)':'Fundido cruzado de audio (Shift+T)')+'" aria-label="'+(channel==='video'?'Disolución entre clips (T)':'Fundido cruzado de audio (Shift+T)')+'">'+toolIcon(channel+'Transition')+'</button>').join('')+
    '<label class="wb-tool-zoom">Zoom <input id="studiowb-zoom" aria-label="Zoom de la línea de tiempo" type="range" min=".5" max="5" step=".25" value="'+timelineZoom+'"></label>'+
    '<button type="button" id="studiowb-timeline-fit" title="Ajustar (F)" aria-label="Ajustar (F)">'+toolIcon('fit')+'</button>'+
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
 function scheduleInspectorRefresh(clipId,reveal){
  pendingInspectorRefresh={clipId,reveal};
  if(inspectorRenderFrame)return;
  const view=root.ownerDocument.defaultView;
  const refresh=()=>{
   inspectorRenderFrame=0;
   const pending=pendingInspectorRefresh;pendingInspectorRefresh=null;
   if(!root.isConnected)return;
   render();
   if(pending?.reveal)revealSelectedClip(pending.clipId);
  };
  if(view?.requestAnimationFrame)inspectorRenderFrame=view.requestAnimationFrame(refresh);
  else inspectorRenderFrame=setTimeout(refresh,0);
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
  const rule=sheet.cssRules[index];for(const [property,value] of Object.entries(declarations))rule.style.setProperty(property,String(value),'important');
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
  timelineEl.querySelectorAll('[data-track-gap]').forEach((gap,index)=>{gap.dataset.wbGeometryGap=String(index);addRuntimeRule('gap:'+index,'[data-wb-geometry-gap="'+index+'"]',{width:width+'px','min-width':width+'px'});});
  timelineEl.querySelectorAll('[data-time-tick]').forEach((tick,index)=>{
   tick.dataset.wbGeometryTick=String(index);
   addRuntimeRule('tick:'+index,'.wb-time-tick[data-wb-geometry-tick="'+index+'"]',{left:position(tick.dataset.timeTick)});
  });
  timelineEl.querySelectorAll('[data-select-clip]').forEach((block,index)=>{
   const clip=workspace.clips.find(item=>item.id===block.dataset.selectClip);if(!clip)return;
   block.dataset.wbGeometryClip=String(index);
   addRuntimeRule('clip:'+index,'[data-wb-geometry-clip="'+index+'"]',{left:position(clip.start),width:Math.max(.65,clip.duration/seconds*100).toFixed(4)+'%'});
  });
  timelineEl.querySelectorAll('[data-select-transition]').forEach((marker,index)=>{marker.dataset.wbGeometryTransition=String(index);addRuntimeRule('transition:'+index,'[data-wb-geometry-transition="'+index+'"]',{left:position(marker.dataset.transitionStart),width:(Number(marker.dataset.transitionDuration)/seconds*100).toFixed(4)+'%'});});
  timelineEl.querySelectorAll('[data-keyframe-time]').forEach((marker,index)=>{const clip=workspace.clips.find(c=>c.id===marker.closest('[data-select-clip]')?.dataset.selectClip);if(!clip)return;marker.dataset.wbGeometryKeyframe=String(index);addRuntimeRule('keyframe:'+index,'[data-wb-geometry-keyframe="'+index+'"]',{left:(Number(marker.dataset.keyframeTime)/clip.duration*100).toFixed(4)+'%'});});
  addRuntimeRule('playhead','.wb-timeline .wb-cursor',{left:position(workspace.playhead)});
  const cursor=timelineEl.querySelector('#studiowb-ruler-cursor');
  if(cursor)addRuntimeRule('ruler-playhead','.wb-ruler-times #studiowb-ruler-cursor',{left:position(workspace.playhead)});
  timelineEl.dataset.runtimeGeometryRules=String(runtimeRules.size);
  timelineEl.dataset.runtimeStylesheet=runtimeSheet?'ready':'missing';
 }
 function render(){
  scrubCleanup?.();root.querySelector('.wb-shortcut-dialog')?.close();
  syncTracks();
  const oldTimelineScroll=root.querySelector('.wb-timeline')?.scrollLeft||0;
  const oldTimelineScrollTop=root.querySelector('.wb-timeline')?.scrollTop||0;
  const oldMediaScroll=root.querySelector('.wb-media-list')?.scrollTop||0;
  pause();if(cloudDispose){cloudDispose();cloudDispose=null;}
  root.innerHTML=page();applyTimelineGeometry();wire();
  const timelineEl=root.querySelector('.wb-timeline');
  if(timelineEl){timelineEl.scrollLeft=oldTimelineScroll;timelineEl.scrollTop=oldTimelineScrollTop;}
  const mediaList=root.querySelector('.wb-media-list');
  if(mediaList)mediaList.scrollTop=oldMediaScroll;
  reconcileMedia();paint();drawTime();updateSourceViewer();fillTimelineMedia().catch(()=>{});
  prime().then(()=>{if(root.isConnected){syncPlayback(true);paint();}}).catch(()=>{});
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
   if(!canAddClip())return;
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
  const beginScrub=event=>{
   if(event.button!==0||rendering||event.target?.closest('[data-select-clip],[data-select-transition],button,input'))return;
   const lane=event.currentTarget,pid=event.pointerId,view=editorDocument.defaultView;if(!view||event.pointerType==='touch'&&lane.dataset.timelineSeek)return;
   event.preventDefault();event.stopPropagation();scrubCleanup?.();pause();editorActive=true;
   const update=pe=>{if(pe.pointerId!==pid)return;seek(lanePosition(pe.clientX,lane),{persist:false});};
   const finish=pe=>{if(pe.pointerId!==pid)return;update(pe);save();cleanup();};
   const cleanup=()=>{view.removeEventListener('pointermove',update,true);view.removeEventListener('pointerup',finish,true);view.removeEventListener('pointercancel',finish,true);try{if(lane.hasPointerCapture?.(pid))lane.releasePointerCapture(pid);}catch{}scrubCleanup=null;};
   scrubCleanup=cleanup;view.addEventListener('pointermove',update,true);view.addEventListener('pointerup',finish,true);view.addEventListener('pointercancel',finish,true);try{lane.setPointerCapture?.(pid);}catch{}update(event);
  };
  root.querySelector('[data-ruler-seek]')?.addEventListener('pointerdown',beginScrub);
  root.querySelectorAll('[data-timeline-seek]').forEach(lane=>lane.addEventListener('pointerdown',beginScrub));
  el('studiowb-zoom').onchange=ev=>{const current=root.querySelector('.wb-timeline'),ratio=current?.scrollLeft/Math.max(1,current?.scrollWidth||1)||0;timelineZoom=Number(ev.target.value);render();const next=root.querySelector('.wb-timeline');if(next)next.scrollLeft=ratio*next.scrollWidth;};
  el('studiowb-timeline-fit').onclick=()=>{
   const view=root.querySelector('.wb-timeline'),available=Math.max(350,(view?.clientWidth||1050)-125);
   timelineZoom=number(Math.round((available/(rulerSpan()*80))*4)/4,.5,5);
   render();const next=root.querySelector('.wb-timeline');if(next)next.scrollLeft=0;
  };
  el('studiowb-split').onclick=splitSelected;
  el('studiowb-toolbar-duplicate').onclick=()=>{const b=el('studiowb-duplicate');if(b)b.click();else notice('Selecciona un clip para duplicar.');};
  const recordKeyframe=()=>{const c=workspace.clips.find(x=>x.id===selected);if(rendering)return;if(!c){notice('Selecciona un clip para animarlo.');return;}if(!trackIsEditable(trackState,c.track)){notice('Pista bloqueada.');return;}try{const values=sampleAnimation(c,workspace.playhead);let next=c.keyframes||{};for(const key of animationProperties(c.kind))next=putKeyframe({...c,keyframes:next},key,workspace.playhead-c.start,values[key],workspace.fps);checkpoint();c.keyframes=next;save();render();notice('Keyframe guardado. Cambia los valores en otro tiempo del clip para animarlo.');}catch(error){notice(error.message);}};
  el('studiowb-keyframe').onclick=recordKeyframe;
  if(el('studiowb-keyframe-add'))el('studiowb-keyframe-add').onclick=recordKeyframe;
  root.querySelectorAll('[data-keyframe-seek]').forEach(button=>button.onclick=()=>{const c=workspace.clips.find(x=>x.id===selected);if(c){pause();seek(c.start+Number(button.dataset.keyframeSeek));render();}});
  if(el('studiowb-keyframe-remove'))el('studiowb-keyframe-remove').onclick=()=>{const c=workspace.clips.find(x=>x.id===selected);if(!c||!trackIsEditable(trackState,c.track))return;try{const next=removeKeyframe(c,workspace.playhead-c.start,workspace.fps);if(JSON.stringify(next)===JSON.stringify(c.keyframes||{})){notice('No hay un keyframe en el cabezal actual.');return;}checkpoint();const values=sampleAnimation(c,workspace.playhead);c.keyframes=next;for(const key of animationProperties(c.kind))if(!c.keyframes[key])c[key]=values[key];save();render();}catch(error){notice(error.message);}};
  if(el('studiowb-keyframe-clear'))el('studiowb-keyframe-clear').onclick=()=>{const c=workspace.clips.find(x=>x.id===selected);if(!c||!trackIsEditable(trackState,c.track))return;checkpoint();Object.assign(c,sampleAnimation(c,workspace.playhead));delete c.keyframes;save();render();};
  el('studiowb-extract-audio').onclick=async()=>{if(rendering)return;try{const next=extractVideoAudio(workspace,selected,trackState);checkpoint();workspace=next;selected=next.clips.at(-1).id;inspectorTab='sound';save();render();await prime();syncPlayback(true);paint();notice('Audio extraído en '+next.clips.at(-1).track+'. El video queda silenciado para evitar sonido duplicado. Puedes mover y mezclar el audio por separado.');}catch(error){notice(error.message);}};
  el('studiowb-toolbar-remove').onclick=()=>{const b=el('studiowb-delete');if(b)b.click();else notice('Selecciona un clip para quitar.');};
  const showKeyboard=()=>{if(root.querySelector('.wb-shortcut-dialog'))return;const dialog=editorDocument.createElement('dialog');dialog.className='wb-shortcut-dialog';dialog.setAttribute('aria-label','Herramientas y atajos del estudio');dialog.innerHTML='<h3>Herramientas y atajos</h3><p>Activos al trabajar en el estudio. Al escribir en un campo, las teclas editan el texto.</p><button type="button" class="subtle" data-close-keyboard aria-label="Cerrar atajos">Cerrar (Esc)</button><table><thead><tr><th>Herramienta</th><th>Atajo</th></tr></thead><tbody>'+shortcutCatalog.map(item=>'<tr><td>'+e(item.name)+'</td><td><kbd>'+e(item.shortcut)+'</kbd></td></tr>').join('')+'</tbody></table>';dialog.querySelector('[data-close-keyboard]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});root.append(dialog);dialog.showModal();};
  el('studiowb-keyboard').onclick=showKeyboard;
  el('studiowb-local-library').onclick=()=>{showLocalTrash=false;render();};
  el('studiowb-local-trash').onclick=()=>{showLocalTrash=true;render();};
  root.querySelectorAll('[data-revive-asset]').forEach(b=>b.onclick=async()=>{
   if(await restoreMedia(db,b.dataset.reviveAsset)){assets=await listMedia(db);trash=await listTrashedMedia(db);showLocalTrash=false;await prime();render();notice('Original restaurado en la biblioteca local.');}
  });
  const addFromLibrary=async(id,{start=null,track=null,gap=null}={})=>{
   if(rendering||!canAddClip())return;
   const asset=findAsset(id);if(!asset)return;
   const clip=addTimelineClip(asset,workspace.clips);
   try{
    const added=gap?insertTrack(tracks,asset.kind,gap.dataset.beforeTrack||null):null;
    if(added)track=added.id;
    const next=start===null?clip:insertClipAt(asset,clip,snapToEdges(start,workspace.clips,null,{enabled:snapping}),track||clip.track);
    if(!trackIsEditable(trackState,next.track)){notice('Pista bloqueada: desbloquéala para insertar medios.');return;}
    pendingInsertions.add(next.id);
    if(['audio','video'].includes(next.kind)){const decoded=await getMedia(next);if(!Number.isFinite(decoded?.element.duration)||decoded.element.duration<.1){releaseMedia(next.id);throw new Error('Este navegador no puede leer la duración del archivo. Importa un MP4/WebM o WAV compatible.');}Object.assign(next,constrainSourceRange(next,decoded.element.duration));}
    if(rendering||!root.isConnected||!canAddClip()){releaseMedia(next.id);return;}
    checkpoint();if(added)workspace.tracks=added.tracks;workspace.clips.push(next);selected=next.id;inspectorTab='clip';mobilePane='timeline';save();await prime();render();
   }catch(error){notice(error.message);}
   finally{pendingInsertions.delete(clip.id);if(!workspace.clips.some(c=>c.id===clip.id))releaseMedia(clip.id);}
  };
  root.querySelectorAll('[data-insert-asset]').forEach(b=>b.onclick=()=>addFromLibrary(b.dataset.insertAsset,{start:workspace.playhead}));
  root.querySelectorAll('[data-drag-asset]').forEach(card=>card.ondragstart=ev=>{
    if(rendering){ev.preventDefault();return;}
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
  root.querySelectorAll('[data-track-gap]').forEach(gap=>{
   gap.ondragover=ev=>{if(ev.dataTransfer?.types?.includes('text/plain')){ev.preventDefault();gap.classList.add('wb-drop-ready');}};
   gap.ondragleave=()=>gap.classList.remove('wb-drop-ready');
   gap.ondrop=ev=>{ev.preventDefault();gap.classList.remove('wb-drop-ready');const id=ev.dataTransfer?.getData('text/plain'),asset=findAsset(id);
    if(!asset)return;if((asset.kind==='audio')!==(gap.dataset.trackGap==='audio')){notice('Usa una zona de inserción del mismo tipo que el clip.');return;}
    const lane=root.querySelector('[data-timeline-seek]');addFromLibrary(id,{start:lanePosition(ev.clientX,lane),gap});};
  });
  root.querySelectorAll('[data-add-transition]').forEach(button=>button.onclick=async()=>{
   if(rendering)return;
   const c=workspace.clips.find(x=>x.id===selected),channel=button.dataset.addTransition;
   if(!c){notice('Selecciona el segundo clip del solape.');return;}
   if(!trackIsEditable(trackState,c.track)){notice('Pista bloqueada.');return;}
   try{await prime();if(!root.isConnected||selected!==c.id||rendering||!trackIsEditable(trackState,c.track))return;const effect=createTransition(workspace.clips,c.id,channel),pair=transitionWindow(workspace.clips,c,channel,effect),limit=transitionSourceLimit(pair);if(limit<.1)throw new Error('No hay suficiente material original para esta transición. Ajusta el solape y la entrada del medio.');effect.duration=Math.min(effect.duration,limit);checkpoint();c[channel+'Transition']=effect;inspectorTab=channel==='video'?'color':'sound';save();render();paint();notice('Transición de '+channel+' aplicada. Ajusta su duración en el inspector.');}catch(error){notice(error.message);}
  });
  root.querySelectorAll('[data-select-transition]').forEach(button=>button.onclick=()=>{selected=button.dataset.selectTransition;inspectorTab=button.dataset.transitionChannel==='video'?'color':'sound';render();});
  root.querySelectorAll('[data-remove-transition]').forEach(button=>button.onclick=()=>{const c=workspace.clips.find(x=>x.id===selected);if(!c||!trackIsEditable(trackState,c.track))return;checkpoint();delete c[button.dataset.removeTransition+'Transition'];save();render();syncPlayback(true);paint();});
  root.querySelectorAll('[data-edit-effect]').forEach(button=>button.onclick=()=>{
   const c=workspace.clips.find(x=>x.id===selected),key=button.dataset.editEffect;
   if(!c){notice('Selecciona un clip.');return;}if(!trackIsEditable(trackState,c.track)){notice('Pista bloqueada.');return;}
   if(key.startsWith('video')&&c.kind==='audio'||(key.startsWith('audio')||key==='volume')&&['image','text'].includes(c.kind)){notice('Esta herramienta requiere un clip de '+(key.startsWith('video')?'video o imagen':'audio o video')+'.');return;}
   if(key!=='volume'){checkpoint();c[key]=c[key]?0:Math.min(1,c.duration/2);save();}
   inspectorTab=key.startsWith('video')?'color':'sound';render();syncPlayback(true);paint();
   root.querySelector('[data-property="'+key+'"]')?.focus();
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
  el('studiowb-title').onclick=()=>{if(!canAddClip())return;if(!trackIsEditable(trackState,'V2')){notice('Desbloquea V2 antes de agregar un título.');return;}checkpoint();const c={id:crypto.randomUUID(),assetId:'',kind:'text',track:'V2',start:Math.min(596,workspace.playhead),duration:4,sourceStart:0,text:'CASO 066',volume:0,opacity:1};workspace.clips.push(c);selected=c.id;inspectorTab='clip';mobilePane='timeline';save();render();};
  el('studiowb-subtitle').onclick=()=>{if(rendering||!canAddClip())return;if(!trackIsEditable(trackState,'V2')){notice('Desbloquea V2 antes de agregar subtítulos.');return;}checkpoint();workspace=addSubtitleCues(workspace,[{text:'Escribe tu subtítulo',start:Math.min(598,workspace.playhead),duration:2}]);selected=workspace.clips.at(-1).id;inspectorTab='clip';mobilePane='inspector';save();render();};
  el('studiowb-subtitles-import').onchange=async ev=>{const file=ev.target.files?.[0];if(!file)return;try{if(file.size>250000)throw new Error('Máximo 250 KB por archivo SRT/VTT.');const cues=parseSubtitles(await file.text());if(rendering||!root.isConnected)return;if(!trackIsEditable(trackState,'V2'))throw new Error('Desbloquea V2 antes de importar subtítulos.');const next=addSubtitleCues(workspace,cues);checkpoint();workspace=next;selected=next.clips.at(-cues.length).id;inspectorTab='clip';mobilePane='timeline';save();render();notice(cues.length+' subtítulos importados en V2. Edita texto, tiempo y estilo en el inspector.');}catch(error){notice('No se importaron subtítulos: '+error.message);}finally{ev.target.value='';}};
  el('studiowb-subtitles-export').onclick=()=>{try{const srt=exportSubtitles(workspace.clips),url=URL.createObjectURL(new Blob([srt],{type:'application/x-subrip;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='estudio066-subtitulos.srt';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);notice('Subtítulos SRT exportados con los tiempos actuales del montaje.');}catch(error){notice(error.message);}};
  root.querySelectorAll('[data-select-clip]').forEach(b=>{
   b.onclick=ev=>{
     if(editingTool==='blade'){
      if(!canAddClip())return;
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
     const initial=ev.clientX,initialY=ev.clientY,original={...clip},pid=ev.pointerId;
     const env=root.ownerDocument.defaultView;
     if(!env)return;
     let moved=false,preview=original,ended=false,dropTarget=null;
     const targetAt=pe=>{if(mode!=='move'||!Number.isFinite(pe.clientY))return null;return Array.from(root.querySelectorAll('[data-track-gap],[data-timeline-seek]')).find(node=>{const r=node.getBoundingClientRect();return pe.clientX>=r.left&&pe.clientX<=r.right&&pe.clientY>=r.top&&pe.clientY<=r.bottom;})||null;};
     const matching=pe=>pid===undefined||pe.pointerId===undefined||pe.pointerId===pid;
     const cleanup=()=>{
      if(ended)return;ended=true;
      env.removeEventListener('pointermove',move,true);
      env.removeEventListener('pointerup',up,true);
      env.removeEventListener('pointercancel',cancel,true);
      b.classList.remove('wb-gesture-active','wb-gesture-trim');
      root.querySelectorAll('.wb-drop-ready').forEach(node=>node.classList.remove('wb-drop-ready'));

      try{if(pid!==undefined&&b.hasPointerCapture?.(pid))b.releasePointerCapture(pid);}catch{}
     };
     const move=pe=>{
      if(!matching(pe))return;
      const pixels=pe.clientX-initial;
      if(mode==='move'&&Math.abs((pe.clientY??initialY)-initialY)>4){const timeline=root.querySelector('.wb-timeline'),bounds=timeline?.getBoundingClientRect();if(bounds){if(pe.clientY>bounds.bottom-24)timeline.scrollTop+=12;else if(pe.clientY<bounds.top+24)timeline.scrollTop-=12;}}
      if(!moved&&Math.abs(pixels)<4&&Math.abs((pe.clientY??initialY)-initialY)<4)return;
      moved=true;
      const seconds=pixels/Math.max(1,rulerWidth()/rulerSpan());
      preview=previewClipDrag(original,mode,seconds,{fps:workspace.fps,clips:workspace.clips,snapping});
      if(!preview)return;
      if(mode!=='move')preview=constrainSourceRange(preview,media.get(original.id)?.element.duration);
      root.querySelectorAll('.wb-drop-ready').forEach(node=>node.classList.remove('wb-drop-ready'));
      dropTarget=targetAt(pe);
      if(dropTarget){const track=dropTarget.dataset.timelineSeek;const kind=dropTarget.dataset.trackGap;
       if(track?compatibleTrack(original.kind,track)&&trackIsEditable(trackState,track):(original.kind==='audio')===(kind==='audio')&&tracks.length<12){
        dropTarget.classList.add('wb-drop-ready');if(track)preview.track=track;
       }else dropTarget=null;
      }
      const visibleSpan=rulerSpan(),clipRule=runtimeRules.get('clip:'+b.dataset.wbGeometryClip);
      clipRule?.style.setProperty('left',(preview.start/visibleSpan*100).toFixed(5)+'%','important');
      clipRule?.style.setProperty('width',(preview.duration/visibleSpan*100).toFixed(5)+'%','important');
      if(mode==='move')clipRule?.style.setProperty('transform','translateY('+((pe.clientY??initialY)-initialY)+'px)','important');
      b.dataset.previewStart=String(preview.start);b.dataset.previewDuration=String(preview.duration);
      b.classList.add('wb-gesture-active');
      const time=b.querySelector('.wb-clip-inner small');
      if(time)time.textContent=mediaTimecode(preview.duration,workspace.fps);
     };
     const up=pe=>{
      if(!matching(pe))return;
      const gap=dropTarget?.dataset.trackGap?dropTarget:null;
      const invalidVertical=mode==='move'&&Math.abs((pe.clientY??initialY)-initialY)>15&&!dropTarget;
      cleanup();
      if(invalidVertical){const hit=targetAt(pe);if(hit?.dataset.trackGap&&tracks.length>=12)notice('Máximo de 12 pistas por proyecto.');render();return;}
      if(gap){try{const added=insertTrack(tracks,original.kind,gap.dataset.beforeTrack||null);preview.track=added.id;preview.newTracks=added.tracks;}catch(error){notice(error.message);render();return;}}
      if(!moved||!clipDragChanged(original,preview)){if(moved)render();return;}
      // Commit once on pointerup. No DOM replacement or timeline data mutation during drag.
      checkpoint();
      if(preview.newTracks)workspace.tracks=preview.newTracks;
      Object.assign(clip,{track:preview.track,start:preview.start,duration:preview.duration,sourceStart:preview.sourceStart,...(preview.keyframes?{keyframes:preview.keyframes}:{})});
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
   if(rendering||ev.target!==b)return;const r=b.getBoundingClientRect();pause();seek((ev.clientX-r.left)/r.width*rulerSpan());
  });
  const shortcut=ev=>{
   const command=resolveShortcut(ev);if(!command)return;
   const dialog=root.querySelector('.wb-shortcut-dialog');
   if(dialog){if(command==='close'){ev.preventDefault();dialog.close();}return;}
   if(rendering){if(command==='close'){ev.preventDefault();exportAbort?.abort();}return;}
   ev.preventDefault();
   if(command==='undo')restoreFrom(history,future);
   else if(command==='redo')restoreFrom(future,history);
   else if(command==='select')el('studiowb-select-tool').click();
   else if(command==='blade')el('studiowb-blade-tool').click();
   else if(command==='split')splitSelected();
   else if(command==='play')play();
   else if(command==='keyboard')showKeyboard();
   else {
    const ids={duplicate:'studiowb-toolbar-duplicate',remove:'studiowb-toolbar-remove',snap:'studiowb-snap',fit:'studiowb-timeline-fit',extractAudio:'studiowb-extract-audio',subtitle:'studiowb-subtitle',keyframe:'studiowb-keyframe'};
    if(ids[command])el(ids[command])?.click();
    else if(['videoTransition','audioTransition'].includes(command))root.querySelector('[data-add-transition="'+command.replace('Transition','')+'"]')?.click();
    else root.querySelector('[data-edit-effect="'+command+'"]')?.click();
   }
   if(['videoFadeIn','videoFadeOut','audioFadeIn','audioFadeOut'].includes(command))root.querySelector('.wb-timeline')?.focus({preventScroll:true});
  };
  keyboardHandler=shortcut;
  root.querySelectorAll('[data-property]').forEach(el=>el.onchange=ev=>{
   const c=workspace.clips.find(x=>x.id===selected);if(!c)return;
   if(!trackIsEditable(trackState,c.track)){notice('Desbloquea esta pista para modificar el clip.');return;}
   const key=ev.target.dataset.property,value=ev.target.value,previous={...c};
   if(c.keyframes?.[key]?.length){try{const next=putKeyframe(c,key,workspace.playhead-c.start,number(value,...{x:[-1,1],y:[-1,1],scale:[.25,4],opacity:[0,1],volume:[0,2]}[key]),workspace.fps);checkpoint();c.keyframes=next;}catch(error){notice(error.message);ev.target.value=String(sampleAnimation(c,workspace.playhead)[key]);return;}}else checkpoint();
   if(['videoTransition','audioTransition'].includes(key)){const channel=key.slice(0,-10),pair=transitionWindow(workspace.clips,c,channel);if(pair)c[key].duration=number(value,.1,transitionSourceLimit(pair));}
   else if(key==='track'){if(compatibleTrack(c.kind,value)&&tracks.includes(value)&&trackIsEditable(trackState,value))c.track=value;}
   else if(key==='textRole'&&c.kind==='text'&&['title','subtitle'].includes(value))c.textRole=value;
   else if(['subtitleSize','subtitleY','subtitleBackground'].includes(key)){const ranges={subtitleSize:[2,10],subtitleY:[10,95],subtitleBackground:[0,1]};c[key]=number(value,...ranges[key]);}
   else if(['text','prompt'].includes(key))c[key]=value.slice(0,key==='text'?(c.textRole==='subtitle'?500:180):3000);
   else {const ranges={videoFadeIn:[0,c.duration/2],videoFadeOut:[0,c.duration/2],audioFadeIn:[0,c.duration/2],audioFadeOut:[0,c.duration/2],start:[0,600],duration:[.1,120],sourceStart:[0,600],volume:[0,2],brightness:[0,200],contrast:[0,200],saturation:[0,200],blur:[0,20],opacity:[0,1],scale:[.25,4],x:[-1,1],y:[-1,1]};if(ranges[key])c[key]=number(value,...ranges[key]);}
   if(c.start+c.duration>600)c.duration=Math.max(.1,600-c.start);
   if(key==='duration'||key==='sourceStart')Object.assign(c,constrainSourceRange(c,media.get(c.id)?.element.duration));
   if(c.keyframes&&c.duration!==previous.duration)c.keyframes=sliceAnimation(previous,0,c.duration);
   save();
   // Never replace the focused inspector field while Chrome is dispatching its change/blur event.
   const clipId=selected,reveal=key==='start'||key==='duration';
   scheduleInspectorRefresh(clipId,reveal);
  });
  const selectedClip=workspace.clips.find(c=>c.id===selected);
  if(selectedClip){
   el('studiowb-delete').onclick=()=>{if(!trackIsEditable(trackState,selectedClip.track)){notice('Pista bloqueada.');return;}checkpoint();workspace.clips=workspace.clips.filter(c=>c.id!==selected);releaseMedia(selected);selected=null;save();render();};
   el('studiowb-duplicate').onclick=()=>{if(!canAddClip())return;if(!trackIsEditable(trackState,selectedClip.track)){notice('Pista bloqueada.');return;}if(selectedClip.start+selectedClip.duration*2>600){notice('La copia supera el límite de la línea de tiempo.');return;}checkpoint();const copy={...selectedClip,id:crypto.randomUUID(),start:selectedClip.start+selectedClip.duration};workspace.clips.push(copy);selected=copy.id;save();render();};
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
    pause();assets=await listMedia(db);workspace=safeLoad();selected=null;render();
    notice('Restaurados '+result.clips+' clips, '+result.requests+' solicitudes y '+result.added+' originales nuevos.');
   }catch(error){notice('No se pudo restaurar: '+error.message);}
  };
  el('studiowb-backup').onclick=()=>{const blob=new Blob([JSON.stringify(workspace,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='estudio066-timeline.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);notice('Proyecto JSON exportado. Los archivos multimedia originales NO se incluyen.');};
  el('studiowb-restore').onchange=async ev=>{
   const file=ev.target.files?.[0];if(!file)return;if(file.size>2*1024*1024){notice('El proyecto JSON supera el máximo de 2 MB. Usa un respaldo completo o divide el montaje.');return;}
   try{const candidate=parseWorkspace(JSON.parse(await file.text()));if(!candidate)throw new Error('Estructura no válida');
    if(!confirm('¿Reemplazar este montaje local con el archivo JSON?'))return;
    pause();checkpoint();workspace=candidate;selected=null;save();render();notice('Montaje restaurado. Debes mantener los archivos en esta biblioteca local.');
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
  scrubCleanup?.();root.querySelector('.wb-shortcut-dialog')?.close();
  editorDocument.removeEventListener('keydown',keyboardListener);
  editorDocument.removeEventListener('pointerdown',editorActivation,true);
  editorDocument.removeEventListener('focusin',editorActivation);
  keyboardHandler=null;editorActive=false;
  if(exportAbort)exportAbort.abort();
  if(cloudDispose){cloudDispose();cloudDispose=null;}
  pause();for(const m of media.values()){m.element.pause();m.element.removeAttribute('src');m.element.load();}
  media.clear();for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();cache.clear();
  try{db?.close();}catch{}
  try{audioCtx?.close();}catch{}
 };
}
