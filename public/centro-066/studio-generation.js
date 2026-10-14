// Estudio Creativo 066 · preparación real de generaciones, sin motor conectado.
// Referencias y resultados importados se conservan SOLO en IndexedDB del navegador.
import {mediaDB,listMedia,addMedia,readMedia,workspaceKey,defaultWorkspace,parseWorkspace,addTimelineClip} from './studio-media.js';
import {WanFreeClient} from './studio-hf-client.js';
import {mountWanPanel} from './studio-hf-panel.js';
import {exportProjectBundle,importProjectBundle,discardRestoredAssets} from './studio-project-backup.js';

export const generationModels=[
 ['pendiente','Seleccionar motor (API pendiente)'],
 ['kling','Kling · integración pendiente'],
 ['veo','Google Flow · Veo (Santibáñez)'],
 ['firefly','Adobe Firefly · integración pendiente'],
 ['wan','Wan · servidor GPU pendiente'],
 ['ltx','LTX · disponible en el panel gratuito']
];
export const generationFormats=['9:16','16:9','1:1','1.91:1'];
export const generationDurations=[3,4,5,6,8,10,15,20];
const durations=generationDurations;
const MAX_RECORDS=80;
const MAX_REF=3;
const esc=x=>String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const choice=(value,current,label)=>'<option value="'+esc(value)+'"'+(String(value)===String(current)?' selected':'')+'>'+esc(label??value)+'</option>';
const options=(array,current)=>array.map(v=>choice(v,current)).join('');
const keyFor=(project)=>'llave-studio066-generation-v1:'+String(project?.id||'scratch');
const trackKeyFor=(project)=>workspaceKey+':'+String(project?.id||'scratch');

export function newGenerationDraft(){
 return {mode:'frames',title:'Nuevo clip · Caso 066',prompt:'',negative:'',continuity:'',model:'veo',aspect:'9:16',resolution:'720p',duration:4,fps:24,variants:1,audio:true,seed:'',preserveIdentity:true,preserveComposition:true,refs:[]};
}
export function validateGeneration(input,assets=[]){
 if(!input||typeof input!=='object')return {error:'Solicitud inválida.'};
 const mode=input.mode;
 if(!['frames','images'].includes(mode))return {error:'Tipo de referencias no válido.'};
 const title=String(input.title||'').trim().slice(0,160),prompt=String(input.prompt||'').trim();
 const negative=String(input.negative||''),continuity=String(input.continuity||'');
 if(!title||!prompt||prompt.length>4000||negative.length>2000||continuity.length>2000)return {error:'Escribe título y prompt. Revisa los límites de texto.'};
 if(!generationModels.some(x=>x[0]===input.model)||!generationFormats.includes(input.aspect))return {error:'Motor o formato inválido.'};
 if(!['720p','1080p','2k','4k'].includes(input.resolution)||!durations.includes(Number(input.duration))||![24,30,60].includes(Number(input.fps)))return {error:'Resolución, FPS o duración inválidos.'};
 if(!Number.isInteger(Number(input.variants))||Number(input.variants)<1||Number(input.variants)>4)return {error:'Máximo cuatro variantes por solicitud.'};
 if(!Array.isArray(input.refs)||input.refs.length<1||input.refs.length>(mode==='frames'?2:MAX_REF))return {error:mode==='frames'?'Selecciona uno o dos fotogramas.':'Selecciona entre una y tres imágenes.'};
 if(new Set(input.refs.map(x=>x.assetId)).size!==input.refs.length)return {error:'Una misma imagen no debe ocupar varias referencias.'};
 for(const r of input.refs){
  if(!r||!['start','end','character','environment','composition','style','wardrobe'].includes(r.role))return {error:'Rol de referencia inválido.'};
  const match=assets.find(x=>x.id===r.assetId);
  if(!match||match.kind!=='image')return {error:'Falta una imagen original de referencia en la biblioteca local.'};
 }
 if(mode==='frames'&&(input.refs[0].role!=='start'||(input.refs.length===2&&input.refs[1].role!=='end')))return {error:'El primer fotograma debe ser inicial y el segundo final.'};
 if(mode==='images'&&input.refs.some(r=>['start','end'].includes(r.role)))return {error:'Selecciona el propósito de cada imagen de referencia.'};
 if(input.seed!==''&&(!/^\d{1,10}$/.test(String(input.seed))||Number(input.seed)>4294967295))return {error:'Seed debe ser un entero entre 0 y 4294967295.'};
 return {value:{
  mode,title,prompt,negative,continuity,model:input.model,aspect:input.aspect,resolution:input.resolution,duration:Number(input.duration),fps:Number(input.fps),variants:Number(input.variants),
  audio:input.audio===true,seed:String(input.seed||''),preserveIdentity:input.preserveIdentity!==false,preserveComposition:input.preserveComposition!==false,
  refs:input.refs.map(({assetId,role})=>({assetId,role}))
 }};
}
export function parseGenerationHistory(input){
 if(!Array.isArray(input))return [];
 return input.slice(0,MAX_RECORDS).filter(x=>x&&typeof x==='object'&&typeof x.id==='string'&&x.id.length<90&&x.request&&typeof x.request==='object'&&typeof x.request.title==='string'&&typeof x.request.prompt==='string'&&Array.isArray(x.results)&&x.results.length<=4&&['prepared','imported'].includes(x.status))
 .map(x=>({...x,results:x.results.filter(v=>v&&typeof v.assetId==='string'&&v.assetId.length<100).map(v=>({assetId:v.assetId,addedAt:v.addedAt||'',...(Number.isFinite(v.duration)&&v.duration>0&&v.duration<=600?{duration:v.duration}:{})}))}));
}
export function makeGenerationRecord(id,data){
 return {id,request:data,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:'prepared',results:[]};
}

export function buildFlowPrompt(request){
 return [request.prompt.trim(),request.continuity.trim()?"Continuity: "+request.continuity.trim():"",request.negative.trim()?"Avoid: "+request.negative.trim():""].filter(Boolean).join("\n\n");
}
export function probeImportedVideo(file){
 return new Promise((resolve,reject)=>{
  if(!file||file.size===0||file.size>150*1024*1024)return reject(new Error('El video debe pesar entre 1 B y 150 MB.'));
  const video=document.createElement('video'),url=URL.createObjectURL(file);
  const done=(error,info)=>{clearTimeout(timer);video.onloadedmetadata=null;video.onerror=null;video.removeAttribute('src');video.load();URL.revokeObjectURL(url);error?reject(error):resolve(info);};
  const timer=setTimeout(()=>done(new Error('No se pudieron leer los datos del video.')),15000);
  video.onloadedmetadata=()=>{const duration=video.duration;if(!Number.isFinite(duration)||duration<=0||duration>600||!video.videoWidth||!video.videoHeight)return done(new Error('Video incompatible o duración fuera de rango.'));done(null,{duration,width:video.videoWidth,height:video.videoHeight});};
  video.onerror=()=>done(new Error('El navegador no puede reproducir este video.'));
  video.preload='metadata';video.src=url;
 });
}

export function studioGenerationView(root,notice,project,openTimeline,request){
 let db=null,assets=[],history=[],draft=newGenerationDraft(),selected=null,ready=false;
 let busy=false,active=true,previewURLs=new Map(),activePreview=null,mobileView='configure';
 const hfClient=new WanFreeClient();let clearHfPanel=null;
 const projectId=Number(project?.id)||null;
 const remoteOK=Boolean(projectId&&typeof request==='function');
 const upsertRemote=async(record,action)=>{
  record.syncPending=true;
  if(!remoteOK)return null;
  const res=await request('studio-generation',{action,projectId,id:record.id,version:record.version??0,request:record.request,results:record.results});
  record.version=res.record.version;delete record.syncPending;
  return res.record;
 };
 const key=keyFor(project);
 const selectedRecord=()=>history.find(x=>x.id===selected)||null;
 const media=()=>assets.filter(x=>x.kind==='image');
 const clipAssets=()=>assets.filter(x=>x.kind==='video');
 const keep=()=>{
  try{localStorage.setItem(key,JSON.stringify({draft,history,selected,activePreview,mobileView}));}catch{notice('No se guardaron los ajustes. La cuota del navegador puede estar llena.');}
 };
 const restore=()=>{
  try{const value=JSON.parse(localStorage.getItem(key)||'null');history=parseGenerationHistory(value?.history);selected=history.some(r=>r.id===value?.selected)?value.selected:null;activePreview=typeof value?.activePreview==='string'?value.activePreview:null;mobileView=['history','preview','configure'].includes(value?.mobileView)?value.mobileView:'configure';if(value?.draft&&typeof value.draft==='object'){const partial=value.draft;draft={...newGenerationDraft(),...partial,variants:1,refs:Array.isArray(partial.refs)?partial.refs.slice(0,3):[]};}}
  catch{history=[];draft=newGenerationDraft();}
 };
 const metadata=r=>r?.request||draft;
 const allResults=()=>history.flatMap(r=>r.results.map((x,i)=>({...x,record:r,index:i})));
 async function urlFor(id){
  if(previewURLs.has(id))return previewURLs.get(id);
  const item=await readMedia(db,id);
  if(!item)return null;
  const u=URL.createObjectURL(item.blob);previewURLs.set(id,u);return u;
 }
 const refRoles=(mode,index)=>{
  if(mode==='frames')return index===0?[['start','Fotograma inicial']]:[['end','Fotograma final']];
  return [['character','Personaje'],['environment','Escenario'],['composition','Composición'],['style','Estilo visual'],['wardrobe','Vestuario']];
 };
 const roleLabel=x=>({'start':'Fotograma inicial','end':'Fotograma final','character':'Personaje','environment':'Escenario','composition':'Composición','style':'Estilo','wardrobe':'Vestuario'}[x]||x);
 function historyPanel(){
  return '<section class="gen-history"><div class="gen-heading"><div><span class="studio-caption">BIBLIOTECA · SOLICITUDES</span><h3>Historial</h3></div><button class="subtle" type="button" id="gen-new">+ Nueva</button></div>'+
   '<div class="gen-request-actions"><button type="button" id="gen-backup">Descargar respaldo completo</button><label class="gen-add-files">Restaurar respaldo<input type="file" id="gen-restore" accept=".studio066"></label></div><p class="studio-help">El respaldo incluye archivos, referencias, historial y timeline de este proyecto.</p>'+
   '<p class="studio-help">Preparaciones y clips importados manualmente. Ninguna solicitud se envía a un motor de IA.</p>'+
   '<div class="gen-record-list">'+(history.map(h=>'<button type="button" class="gen-record'+(selected===h.id?' active':'')+'" data-generation="'+esc(h.id)+'"><strong>'+esc(h.request.title)+'</strong><span>'+esc(h.request.model)+' · '+esc(h.request.aspect)+' · '+h.request.duration+'s</span><small>'+h.results.length+' clips importados · '+(h.results.length?'Importado':'Preparado')+'</small></button>').join('')||'<p class="studio-help">Todavía no hay solicitudes. Prepara la primera desde el panel derecho.</p>')+'</div>'+
   '<h4>Referencias disponibles <small>'+media().length+' archivos</small></h4><p class="studio-help">Toca una imagen para añadirla al siguiente espacio de referencia. No se enviará a ningún motor.</p>'+
    '<div class="gen-media-bin">'+(media().slice(0,36).map(x=>'<button type="button" class="gen-media-tile'+(draft.refs.some(r=>r.assetId===x.id)?' chosen':'')+'" data-gen-quick-ref="'+esc(x.id)+'"><span class="gen-media-thumb" data-gen-image-thumb="'+esc(x.id)+'"></span><small>'+esc(x.name)+'</small></button>').join('')||'<p class="studio-help">Importa imágenes desde Referencias para comenzar.</p>')+'</div>'+
    '<h4>Clips de la biblioteca</h4><div class="gen-results">'+(allResults().map(x=>{const asset=assets.find(a=>a.id===x.assetId);return asset?'<button type="button" class="gen-result" data-preview-result="'+esc(asset.id)+'"><span>▶</span><b>'+esc(asset.name)+'</b><small>'+esc(x.record.request.title)+'</small></button>':'';}).join('')||'<p class="studio-help">Al importar clips aparecerán aquí para previsualizar y llevar al timeline.</p>')+'</div></section>';
 }
 function refGrid(){
  const all=media();
  const limit=draft.mode==='frames'?2:3;
  const selectedIDs=new Set(draft.refs.map(r=>r.assetId));
  return '<div class="gen-refs-head"><div><b>'+ (draft.mode==='frames'?'Fotogramas clave':'Imágenes de referencia')+'</b><p class="studio-help">'+(draft.mode==='frames'?'Fotograma inicial obligatorio; final opcional.':'De una a tres imágenes con propósito definido.')+'</p></div><label class="gen-add-files">+ Subir<input id="gen-upload-images" type="file" accept="image/png,image/jpeg,image/webp" multiple></label></div>'+
   '<div class="gen-ref-slots">'+Array.from({length:limit},(_,i)=>{
    const item=draft.refs[i],asset=assets.find(a=>a.id===item?.assetId);
    return '<div class="gen-ref-slot"><div class="gen-ref-thumb" data-ref-picture="'+i+'"><span>'+ (asset?'Imagen elegida':(draft.mode==='frames'?(i===0?'Inicio':'Final'):'Referencia '+(i+1)))+'</span></div>'+
      '<label>'+ (draft.mode==='frames'?(i===0?'Inicio':'Final'):'Imagen '+(i+1))+
      '<select data-ref-asset="'+i+'">'+choice('',asset?.id||'','Seleccionar imagen')+all.map(a=>choice(a.id,asset?.id||'',a.name)).join('')+'</select></label>'+
      (asset?'<a data-ref-download="'+i+'">Descargar referencia</a><label>Rol<select data-ref-role="'+i+'">'+refRoles(draft.mode,i).map(([role,label])=>choice(role,item.role,label)).join('')+'</select></label>':'')+'</div>';
   }).join('')+'</div>'+
   '<p class="studio-help">'+selectedIDs.size+' de '+limit+' referencias seleccionadas. Los archivos no se envían a un proveedor.</p>';
 }
 function previewPanel(){
  const r=selectedRecord(),results=r?.results||[];
  return '<section class="gen-preview-panel"><div class="gen-heading"><div><span class="studio-caption">VISOR · REFERENCIAS Y RESULTADOS</span><h3>'+esc(r?r.request.title:'Vista previa')+'</h3></div><span class="gen-state">'+(r?(results.length?'Clips importados':'Solicitud preparada'):'Sin motor conectado')+'</span></div>'+
   '<div class="gen-stage" id="gen-stage"><div class="gen-placeholder"><span class="gen-play-icon">▶</span><strong>Visor de clip</strong><small>Selecciona una referencia o un resultado importado.</small></div></div>'+
   '<div class="gen-stage-controls"><button type="button" class="subtle" id="gen-clear-preview">Limpiar visor</button><span id="gen-preview-caption" class="studio-caption">Vista previa local</span></div>'+
   '<div class="gen-request-actions"><label class="gen-add-files">+ Importar clip resultante<input type="file" id="gen-upload-result" accept="video/mp4,video/webm,video/quicktime" multiple '+(!r?'disabled':'')+'></label><button type="button" class="subtle" id="gen-to-timeline" '+(!r||!results.length?'disabled':'')+'>Enviar al timeline</button></div>'+
   '<p class="studio-help">El clip importado se guarda en este navegador y se asocia a la solicitud. No equivale a una generación ejecutada en OP 066.</p>'+
   '<div class="gen-result-tiles">'+results.map((x,i)=>{const a=assets.find(a=>a.id===x.assetId);return '<button type="button" class="gen-result-tile" data-preview-result="'+esc(x.assetId)+'">▶ Variante '+(i+1)+'<small>'+esc(a?.name||'Archivo no disponible')+'</small></button>';}).join('')+'</div>'+
   (r?'<div class="gen-request-actions"><button type="button" class="subtle" id="gen-reuse">Duplicar parámetros</button><button type="button" class="subtle" id="gen-export-json">Exportar ficha JSON</button><button type="button" class="subtle" id="gen-delete">Eliminar ficha</button></div>':'')+'</section>';
 }
 function settingsPanel(){
  return '<form id="gen-form" class="gen-form"><div class="gen-heading"><div><span class="studio-caption">CONFIGURAR · VIDEO IA</span><h3>Generar medios</h3></div></div>'+
    '<label>Nombre del clip<input type="text" name="title" maxlength="160" required value="'+esc(draft.title)+'"></label>'+
    '<label>Prompt cinematográfico<textarea name="prompt" maxlength="4000" rows="5" placeholder="Camera movement, shot, mood, lighting, character continuity..." required>'+esc(draft.prompt)+'</textarea></label>'+
    '<label>Prompt negativo<textarea name="negative" maxlength="2000" rows="2" placeholder="Evitar rostros distintos, artefactos, textos alterados...">'+esc(draft.negative)+'</textarea></label>'+
    '<details open><summary>Ajustes generales</summary><div class="gen-fields">'+
    '<label>Motor<select name="model">'+generationModels.map(([v,l])=>choice(v,draft.model,l)).join('')+'</select></label>'+
    '<label>Calidad solicitada<select name="resolution">'+['720p','1080p','2k','4k'].map(x=>choice(x,draft.resolution,x==='2k'?'2K':x==='4k'?'4K':x)).join('')+'</select></label>'+
    '<label>Relación de aspecto<select name="aspect">'+generationFormats.map(v=>choice(v,draft.aspect,v)).join('')+'</select></label>'+
    '<label>FPS<select name="fps">'+[24,30,60].map(v=>choice(v,draft.fps,v+' FPS')).join('')+'</select></label>'+
    '<label>Duración<select name="duration">'+durations.map(v=>choice(v,draft.duration,v+' segundos')).join('')+'</select></label>'+
    '<input type="hidden" name="variants" value="1"><p class="studio-help">Una sola muestra por generación.</p>'+
    '</div><label class="gen-check"><input type="checkbox" name="audio" '+(draft.audio?'checked':'')+'> Solicitar audio si el motor es compatible</label></details>'+
    '<details open><summary>Referencias</summary><div class="gen-mode"><label class="gen-mode-option"><input type="radio" name="mode" value="frames" '+(draft.mode==='frames'?'checked':'')+'> Frames (1–2)</label><label class="gen-mode-option"><input type="radio" name="mode" value="images" '+(draft.mode==='images'?'checked':'')+'> Images (1–3)</label></div><div id="gen-reference-area">'+refGrid()+'</div></details>'+
    '<details><summary>Ajustes avanzados</summary><label>Seed (opcional)<input type="number" inputmode="numeric" min="0" max="4294967295" step="1" name="seed" value="'+esc(draft.seed)+'"></label>'+
    '<label>Notas de continuidad<textarea name="continuity" maxlength="2000" rows="3" placeholder="Identidad, vestuario, lluvia, luces, escenario...">'+esc(draft.continuity)+'</textarea></label>'+
    '<label class="gen-check"><input type="checkbox" name="preserveIdentity" '+(draft.preserveIdentity?'checked':'')+'> Priorizar identidad del personaje</label>'+
    '<label class="gen-check"><input type="checkbox" name="preserveComposition" '+(draft.preserveComposition?'checked':'')+'> Priorizar composición del fotograma</label></details>'+
    '<div class="gen-cta"><button type="submit" id="gen-save">Guardar preparación</button><button type="button" disabled title="Conecta primero un motor de video autorizado.">Generar clip · Motor pendiente</button></div>'+
    '<p class="studio-help">Genera en Flow con Santibáñez y x1. Con Veo, fotogramas: 4, 6 u 8 s; imágenes de referencia: 8 s. Después importa el resultado aquí.</p><div class="gen-cta"><button type="button" id="gen-copy-flow">Copiar prompt para Flow</button><a href="https://flow.google.com/" target="_blank" rel="noopener noreferrer">Abrir Google Flow</a></div><p class="studio-help">Las referencias se descargan desde cada fotograma. Estos controles no envían archivos ni consumen créditos.</p></form>';
 }
 function captureForm(){
  const f=root.querySelector('#gen-form');if(!f)return;
  const a=new FormData(f);
  draft={...draft,
   title:String(a.get('title')||''),prompt:String(a.get('prompt')||''),negative:String(a.get('negative')||''),continuity:String(a.get('continuity')||''),
   mode:String(a.get('mode')||'frames'),model:String(a.get('model')||'pendiente'),resolution:String(a.get('resolution')||'1080p'),aspect:String(a.get('aspect')||'9:16'),
   duration:Number(a.get('duration')),fps:Number(a.get('fps')),variants:1,
   seed:String(a.get('seed')||''),audio:a.has('audio'),preserveIdentity:a.has('preserveIdentity'),preserveComposition:a.has('preserveComposition')
  };
 }
 async function preview(assetId){
  if(!active)return;
  const target=root.querySelector('#gen-stage');if(!target)return;
  const asset=assets.find(a=>a.id===assetId);
  if(!asset)return notice('El archivo de referencia ya no está disponible.');
  const u=await urlFor(assetId);
  if(!active||!root.querySelector('#gen-stage'))return;
  const node=document.createElement(asset.kind==='video'?'video':'img');
  node.src=u;node.setAttribute('aria-label',asset.name);
  if(asset.kind==='video'){node.controls=true;node.preload='metadata';node.playsInline=true;}
  node.className='gen-stage-media';const st=root.querySelector('#gen-stage');st.replaceChildren(node);
  const caption=root.querySelector('#gen-preview-caption');if(caption)caption.textContent=asset.name;
  activePreview=assetId;keep();
 }
 async function refreshThumbs(){
  for(const tile of root.querySelectorAll('[data-gen-image-thumb]')){
   const id=tile.dataset.genImageThumb,u=await urlFor(id);if(!u||!tile.isConnected)continue;
   const img=document.createElement('img');img.src=u;img.alt='';img.loading='lazy';tile.replaceChildren(img);
  }
  const thumbs=Array.from(root.querySelectorAll('[data-ref-picture]'));
  for(const t of thumbs){
   const index=Number(t.dataset.refPicture),id=draft.refs[index]?.assetId;
   if(!id)continue;
   const asset=assets.find(a=>a.id===id);if(!asset)continue;
   const u=await urlFor(id);if(!u||!t.isConnected)continue;
   const img=document.createElement('img');img.src=u;img.alt='Imagen de referencia: '+asset.name;img.loading='lazy';t.replaceChildren(img);
   const download=root.querySelector('[data-ref-download="'+index+'"]');if(download){download.href=u;download.download=asset.name;}
   t.onclick=()=>preview(id);
  }
 }
 function render(){
  if(!active||!root.isConnected)return;
  clearHfPanel?.();
  root.innerHTML='<div class="gen-workspace" data-gen-mobile-pane="'+mobileView+'">'+historyPanel()+previewPanel()+settingsPanel()+'<nav class="gen-mobile-dock" aria-label="Paneles de generación">'+[['history','Biblioteca'],['preview','Visor'],['configure','Prompts']].map(([id,label])=>'<button type="button" data-gen-mobile-tab="'+id+'" aria-pressed="'+(mobileView===id)+'">'+label+'</button>').join('')+'</nav></div>';
  wire();refreshThumbs();
  const hfRoot=document.createElement('section');hfRoot.className='hf-panel';root.querySelector('.gen-form').after(hfRoot);
  clearHfPanel=mountWanPanel(hfRoot,{client:hfClient,initialProvider:['ltx','wan'].includes(draft.model)?draft.model:'ltx',
  onProviderChange:provider=>{captureForm();draft.model=provider;const selector=root.querySelector('[name="model"]');if(selector)selector.value=provider;keep();},
  getRequest:async provider=>{
   captureForm();const checked=validateGeneration(draft,assets);if(checked.error)throw new Error(checked.error);
   if(draft.model!==provider)throw new Error('Selecciona '+provider.toUpperCase()+' en el motor de la escena o en este panel.');
   if(draft.mode!=='frames'||![3,5].includes(draft.duration))throw new Error('LTX y Wan requieren fotogramas y duración de 3 o 5 segundos. Ajusta la escena antes de generar.');
   if(provider==='wan'&&draft.refs.length>1)throw new Error('Wan solo usa el fotograma inicial. Quita el final o elige LTX.');
   const req=checked.value;const originals=await Promise.all(req.refs.map(r=>readMedia(db,r.assetId)));if(originals.some(a=>!a?.blob))throw new Error('Falta un fotograma de la escena.');
   return {request:req,image:originals[0].blob,endImage:originals[1]?.blob||null,prompt:provider==='ltx'?buildFlowPrompt(req):buildFlowPrompt({...req,negative:''}),negative:req.negative,duration:req.duration,aspect:req.aspect,seed:req.seed===''?42:Number(req.seed)};
  },onResult:async(file,info,shared)=>{
   const asset=await addMedia(db,file);const record=makeGenerationRecord(crypto.randomUUID(),{...shared.request,refs:shared.request.refs.map(r=>({...r})),variants:1});record.results=[{assetId:asset.id,addedAt:new Date().toISOString(),duration:info.duration}];record.status='imported';history.unshift(record);history=history.slice(0,MAX_RECORDS);selected=record.id;keep();assets=await listMedia(db);activePreview=asset.id;const hist=root.querySelector('.gen-history'),visor=root.querySelector('.gen-preview-panel');if(hist)hist.outerHTML=historyPanel();if(visor)visor.outerHTML=previewPanel();wire();await preview(asset.id);notice('Clip gratuito guardado en la biblioteca local.');return asset;
  },onTimeline:(asset,info)=>{
   const k=trackKeyFor(project);let workspace;
   try{workspace=parseWorkspace(JSON.parse(localStorage.getItem(k)||'null'))||defaultWorkspace();}catch{workspace=defaultWorkspace();}
   if(workspace.clips.length>=120)return notice('Límite de 120 clips del timeline.');
   const clip=addTimelineClip({...asset,duration:info.duration},workspace.clips);
   if(clip.start+clip.duration>600)return notice('El clip supera la duración disponible del timeline.');
   workspace.clips.push(clip);
   try{localStorage.setItem(k,JSON.stringify(workspace));notice('Clip generado añadido a V1.');openTimeline?.();}catch{notice('No se pudo guardar el timeline.');}
  }});

  if(activePreview)preview(activePreview);
 }
 const refreshImages=()=>{
  const holder=root.querySelector('#gen-reference-area');if(holder){holder.innerHTML=refGrid();wireRefs();refreshThumbs();}
 };
 const selectRef=(index,id)=>{
  const role=draft.mode==='frames'?(index===0?'start':'end'):'character';
  const values=draft.refs.slice();
  if(!id){values.splice(index,1);}
  else {const prev=values.findIndex((x,i)=>i!==index&&x.assetId===id);if(prev>=0){notice('Esa imagen ya está seleccionada.');return;}
   values[index]={assetId:id,role};
  }
  draft.refs=values.filter(x=>x?.assetId);
  if(draft.mode==='frames')draft.refs=draft.refs.map((r,i)=>({...r,role:i===0?'start':'end'}));
  keep();refreshImages();
 };
 function wireRefs(){
  root.querySelectorAll('[data-ref-asset]').forEach(select=>{
   select.onchange=ev=>{captureForm();selectRef(Number(ev.target.dataset.refAsset),ev.target.value);};
  });
  root.querySelectorAll('[data-ref-role]').forEach(select=>{
   select.onchange=ev=>{captureForm();const i=Number(ev.target.dataset.refRole);if(draft.refs[i]){draft.refs[i].role=ev.target.value;keep();}};
  });
  const input=root.querySelector('#gen-upload-images');
  if(input)input.onchange=async ev=>{
   const files=Array.from(ev.target.files||[]);let good=0;
   for(const file of files){if(file.type.startsWith('image/'))try{const asset=await addMedia(db,file);good++;if(draft.refs.length<(draft.mode==='frames'?2:3)){draft.refs.push({assetId:asset.id,role:draft.mode==='frames'?(draft.refs.length===0?'start':'end'):'character'});}}catch(error){notice(error.message);}
   }
   assets=await listMedia(db);keep();refreshImages();notice(good+' imagen(es) agregadas a la biblioteca local.');
  };
 }
 function wire(){
  const one=id=>root.querySelector('#'+id);
  one('gen-backup').onclick=async()=>{
   captureForm();keep();const button=one('gen-backup');button.disabled=true;
   try{const workspace=parseWorkspace(JSON.parse(localStorage.getItem(trackKeyFor(project))||'null'));const blob=await exportProjectBundle(db,{draft,history,selected,activePreview,mobileView,workspace});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='estudio066-proyecto-'+String(project?.id||'local')+'.studio066';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);notice('Respaldo completo descargado. Consérvalo para recuperar los archivos en otro navegador.');}catch(error){notice('No se creó el respaldo: '+error.message);}finally{if(button.isConnected)button.disabled=false;}
  };
  one('gen-restore').onchange=async ev=>{
   const file=ev.target.files?.[0];if(!file)return;
   const original=localStorage.getItem(key),originalTrack=localStorage.getItem(trackKeyFor(project));let imported=null;
   try{
    imported=await importProjectBundle(db,file,(records,entries)=>{const media=entries.map(a=>({...a,kind:a.mime.split('/')[0]}));return parseGenerationHistory(records).length===records.length&&records.every(r=>validateGeneration(r.request,media).value);});
    const snap=imported.snapshot;localStorage.setItem(key,JSON.stringify(snap));if(snap.workspace)localStorage.setItem(trackKeyFor(project),JSON.stringify(snap.workspace));else localStorage.removeItem(trackKeyFor(project));
    draft=snap.draft;history=snap.history;selected=snap.selected;activePreview=snap.activePreview;mobileView=snap.mobileView;assets=await listMedia(db);render();notice('Proyecto recuperado: archivos, referencias, parámetros y timeline. Los originales anteriores siguen en la biblioteca.');
   }catch(error){if(imported){await discardRestoredAssets(db,imported.created);try{original===null?localStorage.removeItem(key):localStorage.setItem(key,original);originalTrack===null?localStorage.removeItem(trackKeyFor(project)):localStorage.setItem(trackKeyFor(project),originalTrack);}catch{}}notice('No se restauró el proyecto: '+error.message);}
  };
  root.querySelectorAll('button[data-gen-mobile-tab]').forEach(btn=>btn.onclick=()=>{captureForm();mobileView=btn.dataset.genMobileTab;keep();render();});
  root.querySelectorAll('[data-gen-quick-ref]').forEach(btn=>btn.onclick=()=>{
   captureForm();const id=btn.dataset.genQuickRef;
   const idx=draft.refs.findIndex(r=>r.assetId===id),limit=draft.mode==='frames'?2:3;
   if(idx>=0)draft.refs.splice(idx,1);
   else if(draft.refs.length<limit)draft.refs.push({assetId:id,role:draft.mode==='frames'?(draft.refs.length?'end':'start'):'character'});
   else {notice('Límite de referencias alcanzado. Quita una para añadir otra.');return;}
   if(draft.mode==='frames')draft.refs=draft.refs.map((r,i)=>({...r,role:i===0?'start':'end'}));
   keep();render();if(idx<0)preview(id);
  });
  root.querySelectorAll('[data-generation]').forEach(btn=>btn.onclick=()=>{captureForm();selected=btn.dataset.generation;activePreview=null;keep();render();});
  root.querySelectorAll('[data-preview-result]').forEach(btn=>btn.onclick=()=>preview(btn.dataset.previewResult));
  one('gen-new').onclick=()=>{draft=newGenerationDraft();selected=null;activePreview=null;keep();render();};
  one('gen-clear-preview').onclick=()=>{activePreview=null;keep();const st=one('gen-stage');if(st)st.innerHTML='<div class="gen-placeholder"><span class="gen-play-icon">▶</span><strong>Visor vacío</strong><small>Elige un fotograma o un clip importado.</small></div>';};
  one('gen-copy-flow').onclick=async()=>{
   captureForm();const checked=validateGeneration(draft,assets);
   if(checked.error)return notice(checked.error);
   if(draft.model==='veo'&&(!['9:16','16:9'].includes(draft.aspect)||![4,6,8].includes(draft.duration)||(draft.mode==='images'&&draft.duration!==8)))return notice('Veo en Flow: formato 9:16 o 16:9; fotogramas 4, 6 u 8 segundos, referencias de imágenes 8 segundos.');
   const text=buildFlowPrompt(checked.value);
   try{await navigator.clipboard.writeText(text);notice('Prompt copiado. En Flow elige Santibáñez, el modelo, formato y duración de esta ficha, y x1.');}
   catch{const u=URL.createObjectURL(new Blob([text],{type:'text/plain'}));const a=document.createElement('a');a.href=u;a.download='prompt-flow.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);notice('Prompt descargado para pegarlo en Flow.');}
  };
  const form=one('gen-form');
  form.oninput=ev=>{if(ev.target.name==='mode')return;captureForm();keep();};
  form.onchange=ev=>{
   const before=draft.mode;captureForm();
   if(ev.target.name==='mode'&&draft.mode!==before){draft.refs=[];keep();refreshImages();}
   else keep();
  };
  form.onsubmit=async ev=>{
   ev.preventDefault();captureForm();
   const validated=validateGeneration(draft,assets);
   if(validated.error){notice(validated.error);return;}
   const saved=makeGenerationRecord(crypto.randomUUID(),validated.value);
   busy=true;const btn=one('gen-save');if(btn)btn.disabled=true;
   let remoteStored=false;
   try{await upsertRemote(saved,'create');remoteStored=remoteOK;}
   catch(error){notice('Ficha solo local: '+error.message);}
   finally{busy=false;}
   history.unshift(saved);history=history.slice(0,MAX_RECORDS);selected=saved.id;keep();render();
   notice('Solicitud preparada '+(remoteStored?'y sincronizada en Neon Preview.':'solo en este navegador.')+' Ningún motor fue ejecutado.');
  };
  wireRefs();
  const upload=one('gen-upload-result');
  if(upload)upload.onchange=async ev=>{
   const record=selectedRecord();
   if(!record)return notice('Guarda primero la preparación de generación.');
   const files=Array.from(ev.target.files||[]);
   const available=record.request.variants-record.results.length;
   if(files.length>available){notice('La solicitud admite máximo '+record.request.variants+' variantes. Selecciona '+available+' clips como máximo.');return;}
   let added=0;
   for(const file of files){if(!file.type.startsWith('video/')){notice('Selecciona archivos de video compatibles.');continue;}
    try{const info=await probeImportedVideo(file);const a=await addMedia(db,file);record.results.push({assetId:a.id,addedAt:new Date().toISOString(),duration:info.duration});added++;}
    catch(error){notice(error.message);}
   }
   if(added){record.status='imported';record.updatedAt=new Date().toISOString();assets=await listMedia(db);activePreview=record.results.at(-1)?.assetId||null;
    try{await upsertRemote(record,Number.isSafeInteger(record.version)?'update':'create');}catch(error){notice('Clips importados localmente; ficha remota sin confirmar: '+error.message);}
    keep();render();notice(added+' clip(s) importados. No fueron generados por OP 066.');}
  };
  const send=one('gen-to-timeline');
  if(send)send.onclick=async()=>{
   const r=selectedRecord();
   const v=r?.results?.find(x=>x.assetId===activePreview)||r?.results?.[0];if(!v)return;
   const asset=assets.find(a=>a.id===v.assetId);
   if(!asset)return notice('El clip ya no está disponible localmente.');
   const k=trackKeyFor(project);
   let workspace;
   try{workspace=parseWorkspace(JSON.parse(localStorage.getItem(k)||'null'))||defaultWorkspace();}
   catch{workspace=defaultWorkspace();}
   if(workspace.clips.length>=120)return notice('Límite de 120 clips del timeline.');
   if(workspace.clips.length===0){workspace.aspect=r.request.aspect;workspace.quality=['720p','1080p'].includes(r.request.resolution)?r.request.resolution:'1080p';workspace.fps=[24,30].includes(r.request.fps)?r.request.fps:24;}
   let actualDuration=v.duration;
   if(!Number.isFinite(actualDuration)){try{const original=await readMedia(db,asset.id);actualDuration=(await probeImportedVideo(original.blob)).duration;}catch(error){return notice(error.message);}}
   const clip=addTimelineClip({...asset,duration:actualDuration},workspace.clips);
   if(clip.start+clip.duration>600)return notice('El clip supera la duración disponible del timeline.');
   clip.prompt=[r.request.prompt,r.request.negative?'Avoid: '+r.request.negative:'',r.request.continuity?'Continuity: '+r.request.continuity:''].filter(Boolean).join('\n').slice(0,3000);clip.generationId=r.id;
   workspace.clips.push(clip);
   try{localStorage.setItem(k,JSON.stringify(workspace));notice('Clip añadido a V1. Abriendo timeline.');openTimeline?.();}
   catch{notice('No se pudo guardar el timeline. Revisa espacio del navegador.');}
  };
  const reuse=one('gen-reuse');
  if(reuse)reuse.onclick=()=>{const r=selectedRecord();if(r){draft={...newGenerationDraft(),...r.request,refs:r.request.refs.map(x=>({...x}))};selected=null;keep();render();notice('Parámetros recuperados para una nueva solicitud.');}};
  const exp=one('gen-export-json');
  if(exp)exp.onclick=()=>{const r=selectedRecord();if(!r)return;const b=new Blob([JSON.stringify({schemaVersion:1,...r},null,2)],{type:'application/json'});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download='estudio066-generacion-'+r.id.slice(0,8)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const del=one('gen-delete');
  if(del)del.onclick=()=>{if(!confirm('¿Eliminar la ficha del historial? Los archivos importados seguirán en la biblioteca local.'))return;history=history.filter(x=>x.id!==selected);selected=null;keep();render();};
 }
 root.innerHTML='<div class="studio-pane"><p>Preparando generador y referencias locales…</p></div>';
 (async()=>{
  try{db=await mediaDB();assets=await listMedia(db);restore();
   if(!active||!root.isConnected)return;
   if(remoteOK){try{
    const res=await fetch('/api/console-066?op=studio-generations&projectId='+encodeURIComponent(projectId),{credentials:'same-origin'});
    const response=await res.json();if(!res.ok)throw new Error(response.error||'No se pudo recuperar el historial.');
    const remote=parseGenerationHistory(response.records.map(row=>({...row,id:row.id,createdAt:row.created_at,updatedAt:row.updated_at})));
    const known=new Set(remote.map(x=>x.id));history=[...remote.map(r=>history.find(local=>local.id===r.id&&local.syncPending)||r),...history.filter(x=>!known.has(x.id))].slice(0,MAX_RECORDS);
    keep();
   }catch(error){notice('Sin sincronización remota: '+error.message+'. Se conservarán los datos locales.');}}
   ready=true;render();
  }catch(error){if(active&&root.isConnected)root.innerHTML='<div class="studio-pane"><h3>Biblioteca multimedia no disponible</h3><p>'+esc(error.message)+'</p></div>';}
 })();
 return ()=>{active=false;clearHfPanel?.();hfClient.disconnect();for(const u of previewURLs.values())URL.revokeObjectURL(u);previewURLs.clear();try{db?.close();}catch{}};
}
