// Estudio Creativo 066 · preparación real de generaciones, sin motor conectado.
// Referencias y resultados importados se conservan SOLO en IndexedDB del navegador.
import {mediaDB,listMedia,addMedia,readMedia,workspaceKey,defaultWorkspace,parseWorkspace,addTimelineClip} from './studio-media.js';

export const generationModels=[
 ['pendiente','Seleccionar motor (API pendiente)'],
 ['kling','Kling · integración pendiente'],
 ['veo','Veo · integración pendiente'],
 ['firefly','Adobe Firefly · integración pendiente'],
 ['wan','Wan · servidor GPU pendiente'],
 ['ltx','LTX · servidor GPU pendiente']
];
export const generationFormats=['9:16','16:9','1:1','1.91:1'];
export const generationDurations=[3,5,8,10,15,20];
const durations=generationDurations;
const MAX_RECORDS=80;
const MAX_REF=3;
const esc=x=>String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const choice=(value,current,label)=>'<option value="'+esc(value)+'"'+(String(value)===String(current)?' selected':'')+'>'+esc(label??value)+'</option>';
const options=(array,current)=>array.map(v=>choice(v,current)).join('');
const keyFor=(project)=>'llave-studio066-generation-v1:'+String(project?.id||'scratch');
const trackKeyFor=(project)=>workspaceKey+':'+String(project?.id||'scratch');

export function newGenerationDraft(){
 return {mode:'frames',title:'Nuevo clip · Caso 066',prompt:'',negative:'',continuity:'',model:'pendiente',aspect:'9:16',resolution:'1080p',duration:5,fps:24,variants:2,audio:false,seed:'',preserveIdentity:true,preserveComposition:true,refs:[]};
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
 .map(x=>({...x,results:x.results.filter(v=>v&&typeof v.assetId==='string'&&v.assetId.length<100).map(v=>({assetId:v.assetId,addedAt:v.addedAt||''}))}));
}
export function makeGenerationRecord(id,data){
 return {id,request:data,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:'prepared',results:[]};
}
export function studioGenerationView(root,notice,project,openTimeline){
 let db=null,assets=[],history=[],draft=newGenerationDraft(),selected=null,ready=false;
 let busy=false,active=true,previewURLs=new Map(),activePreview=null;
 const key=keyFor(project);
 const selectedRecord=()=>history.find(x=>x.id===selected)||null;
 const media=()=>assets.filter(x=>x.kind==='image');
 const clipAssets=()=>assets.filter(x=>x.kind==='video');
 const keep=()=>{
  try{localStorage.setItem(key,JSON.stringify({draft,history}));}catch{notice('No se guardaron los ajustes. La cuota del navegador puede estar llena.');}
 };
 const restore=()=>{
  try{const value=JSON.parse(localStorage.getItem(key)||'null');history=parseGenerationHistory(value?.history);if(value?.draft&&typeof value.draft==='object'){const partial=value.draft;draft={...newGenerationDraft(),...partial,refs:Array.isArray(partial.refs)?partial.refs.slice(0,3):[]};}}
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
   '<p class="studio-help">Preparaciones y clips importados manualmente. Ninguna solicitud se envía a un motor de IA.</p>'+
   '<div class="gen-record-list">'+(history.map(h=>'<button type="button" class="gen-record'+(selected===h.id?' active':'')+'" data-generation="'+esc(h.id)+'"><strong>'+esc(h.request.title)+'</strong><span>'+esc(h.request.model)+' · '+esc(h.request.aspect)+' · '+h.request.duration+'s</span><small>'+h.results.length+' clips importados · '+(h.results.length?'Importado':'Preparado')+'</small></button>').join('')||'<p class="studio-help">Todavía no hay solicitudes. Prepara la primera desde el panel derecho.</p>')+'</div>'+
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
      (asset?'<label>Rol<select data-ref-role="'+i+'">'+refRoles(draft.mode,i).map(([role,label])=>choice(role,item.role,label)).join('')+'</select></label>':'')+'</div>';
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
    '<label>Variantes<select name="variants">'+[1,2,3,4].map(v=>choice(v,draft.variants,v+' clip'+(v===1?'':'s'))).join('')+'</select></label>'+
    '</div><label class="gen-check"><input type="checkbox" name="audio" '+(draft.audio?'checked':'')+'> Solicitar audio si el motor es compatible</label></details>'+
    '<details open><summary>Referencias</summary><div class="gen-mode"><label class="gen-mode-option"><input type="radio" name="mode" value="frames" '+(draft.mode==='frames'?'checked':'')+'> Frames (1–2)</label><label class="gen-mode-option"><input type="radio" name="mode" value="images" '+(draft.mode==='images'?'checked':'')+'> Images (1–3)</label></div><div id="gen-reference-area">'+refGrid()+'</div></details>'+
    '<details><summary>Ajustes avanzados</summary><label>Seed (opcional)<input type="number" inputmode="numeric" min="0" max="4294967295" step="1" name="seed" value="'+esc(draft.seed)+'"></label>'+
    '<label>Notas de continuidad<textarea name="continuity" maxlength="2000" rows="3" placeholder="Identidad, vestuario, lluvia, luces, escenario...">'+esc(draft.continuity)+'</textarea></label>'+
    '<label class="gen-check"><input type="checkbox" name="preserveIdentity" '+(draft.preserveIdentity?'checked':'')+'> Priorizar identidad del personaje</label>'+
    '<label class="gen-check"><input type="checkbox" name="preserveComposition" '+(draft.preserveComposition?'checked':'')+'> Priorizar composición del fotograma</label></details>'+
    '<div class="gen-cta"><button type="submit" id="gen-save">Guardar preparación</button><button type="button" disabled title="Conecta primero un motor de video autorizado.">Generar clip · Motor pendiente</button></div>'+
    '<p class="studio-help">Aquí no se generan clips ni se consumen créditos. Duración, calidad, seed, audio y cantidad de variantes se validarán contra el motor cuando esté autorizado.</p></form>';
 }
 function captureForm(){
  const f=root.querySelector('#gen-form');if(!f)return;
  const a=new FormData(f);
  draft={...draft,
   title:String(a.get('title')||''),prompt:String(a.get('prompt')||''),negative:String(a.get('negative')||''),continuity:String(a.get('continuity')||''),
   mode:String(a.get('mode')||'frames'),model:String(a.get('model')||'pendiente'),resolution:String(a.get('resolution')||'1080p'),aspect:String(a.get('aspect')||'9:16'),
   duration:Number(a.get('duration')),fps:Number(a.get('fps')),variants:Number(a.get('variants')),
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
  activePreview=assetId;
 }
 async function refreshThumbs(){
  const thumbs=Array.from(root.querySelectorAll('[data-ref-picture]'));
  for(const t of thumbs){
   const index=Number(t.dataset.refPicture),id=draft.refs[index]?.assetId;
   if(!id)continue;
   const asset=assets.find(a=>a.id===id);if(!asset)continue;
   const u=await urlFor(id);if(!u||!t.isConnected)continue;
   const img=document.createElement('img');img.src=u;img.alt='Imagen de referencia: '+asset.name;img.loading='lazy';t.replaceChildren(img);
   t.onclick=()=>preview(id);
  }
 }
 function render(){
  if(!active||!root.isConnected)return;
  root.innerHTML='<div class="gen-workspace">'+historyPanel()+previewPanel()+settingsPanel()+'</div>';
  wire();refreshThumbs();
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
  root.querySelectorAll('[data-generation]').forEach(btn=>btn.onclick=()=>{captureForm();selected=btn.dataset.generation;activePreview=null;keep();render();});
  root.querySelectorAll('[data-preview-result]').forEach(btn=>btn.onclick=()=>preview(btn.dataset.previewResult));
  one('gen-new').onclick=()=>{draft=newGenerationDraft();selected=null;activePreview=null;keep();render();};
  one('gen-clear-preview').onclick=()=>{activePreview=null;const st=one('gen-stage');if(st)st.innerHTML='<div class="gen-placeholder"><span class="gen-play-icon">▶</span><strong>Visor vacío</strong><small>Elige un fotograma o un clip importado.</small></div>';};
  const form=one('gen-form');
  form.oninput=ev=>{if(ev.target.name==='mode')return;captureForm();keep();};
  form.onchange=ev=>{
   const before=draft.mode;captureForm();
   if(ev.target.name==='mode'&&draft.mode!==before){draft.refs=[];keep();refreshImages();}
   else keep();
  };
  form.onsubmit=ev=>{
   ev.preventDefault();captureForm();
   const validated=validateGeneration(draft,assets);
   if(validated.error){notice(validated.error);return;}
   const saved=makeGenerationRecord(crypto.randomUUID(),validated.value);
   history.unshift(saved);history=history.slice(0,MAX_RECORDS);selected=saved.id;keep();render();
   notice('Solicitud preparada y guardada. Ningún motor fue ejecutado ni cobrado.');
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
    try{const a=await addMedia(db,file);record.results.push({assetId:a.id,addedAt:new Date().toISOString()});added++;}
    catch(error){notice(error.message);}
   }
   if(added){record.status='imported';record.updatedAt=new Date().toISOString();assets=await listMedia(db);activePreview=record.results.at(-1)?.assetId||null;keep();render();notice(added+' clip(s) importados. No fueron generados por OP 066.');}
  };
  const send=one('gen-to-timeline');
  if(send)send.onclick=()=>{
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
   const clip=addTimelineClip({...asset,duration:r.request.duration},workspace.clips);
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
   if(!active||!root.isConnected)return;ready=true;render();
  }catch(error){if(active&&root.isConnected)root.innerHTML='<div class="studio-pane"><h3>Biblioteca multimedia no disponible</h3><p>'+esc(error.message)+'</p></div>';}
 })();
 return ()=>{active=false;for(const u of previewURLs.values())URL.revokeObjectURL(u);previewURLs.clear();try{db?.close();}catch{}};
}
