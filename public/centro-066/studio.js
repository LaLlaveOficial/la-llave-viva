// Phase 1: project / shot drafts. All controls marked "pending" are genuinely inactive.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const types={cine:'Narrativa / Cine',ads:'Piezas publicitarias'};
const ratios=['9:16','16:9','1:1','1.91:1'];
const qualities=['720p','1080p','2k','4k'];
const durations=[3,5,8,10,15,20];
const fpsValues=[24,30,60];
const providers=[['pendiente','Sin seleccionar'],['wan','Wan (por conectar)'],['ltx','LTX (por conectar)'],['kling','Kling (por conectar)'],['veo','Veo (por conectar)'],['firefly','Adobe Firefly (por conectar)']];
const tabs=[['projects','Proyectos'],['shots','Fotogramas y planos'],['voices','Voces y sonido'],['editor','Postproducción'],['ads','Creatividades Ads']];
const option=(value,current,label)=>'<option value="'+escapeHtml(value)+'"'+(String(value)===String(current)?' selected':'')+'>'+escapeHtml(label??value)+'</option>';
const opts=(values,current)=>values.map(v=>option(v,current)).join('');
const navTabs=(active)=>tabs.map(([key,label])=>'<button type="button" class="studio-tab'+(active===key?' current':'')+'" data-studio-tab="'+key+'" aria-pressed="'+(active===key?'true':'false')+'">'+label+'</button>').join('');
const empty='<div class="studio-empty">Todavía no hay registros. Crea el primer proyecto para comenzar.</div>';
let lastTab='projects';

export function studioView(root,request,notice) {
  const state={projects:[],shots:[],projectId:null,shotId:null,tab:lastTab,editProject:false,connected:false,loading:true};
  const refresh=async()=>{
    const result=await request('studio');
    if(!root.isConnected)return;
    state.projects=result.projects||[];
    state.shots=result.shots||[];
    if(!state.projects.some(p=>Number(p.id)===state.projectId))state.projectId=state.projects.length?Number(state.projects[0].id):null;
    if(!state.shots.some(s=>Number(s.id)===state.shotId&&Number(s.project_id)===state.projectId))state.shotId=null;
    state.loading=false;
    render();
  };
  function currentProject(){return state.projects.find(p=>Number(p.id)===state.projectId);}
  function currentShot(){return state.shots.find(s=>Number(s.id)===state.shotId&&Number(s.project_id)===state.projectId);}
  function drawProjects(){
    const active=currentProject();
    const edit=state.editProject&&active;
    const projectForm='<form id="studio-project-form" class="studio-form studio-pane">'+
      '<div class="studio-head"><h3>'+(edit?'Editar proyecto':'Nuevo proyecto')+'</h3><span class="studio-caption">Guardado privado, sin publicación</span></div>'+
      '<label>Nombre<input name="name" maxlength="160" placeholder="Caso 066 · Capítulo 4" value="'+escapeHtml(edit?active.name:'')+'" required></label>'+
      '<label>Tipo<select name="type">'+option('cine',edit?active.type:'cine','Narrativa / Cine')+option('ads',edit?active.type:'cine','Publicidad / Ads')+'</select></label>'+
      '<label>Descripción<textarea name="description" rows="3" maxlength="3000" placeholder="Objetivo, atmósfera y continuidad">'+escapeHtml(edit?active.description:'')+'</textarea></label>'+
      '<div class="studio-actions"><button type="submit">'+(edit?'Guardar cambios':'Crear proyecto')+'</button>'+(edit?'<button type="button" class="subtle" id="studio-cancel-edit">Cancelar</button>':'')+'</div>'+
    '</form>';
    const cards=state.projects.map(p=>
      '<button type="button" class="studio-project-card'+(state.projectId===Number(p.id)?' active':'')+'" data-project-id="'+p.id+'">'+
        '<span class="studio-caption">'+escapeHtml(types[p.type]||p.type)+'</span>'+
        '<strong>'+escapeHtml(p.name)+'</strong>'+
        '<span>'+escapeHtml(p.description||'Sin descripción')+'</span>'+
        '<span class="studio-caption">'+state.shots.filter(s=>String(s.project_id)===String(p.id)).length+' planos guardados</span>'+
      '</button>'
    ).join('');
    return '<div class="studio-layout">'+
      '<div class="studio-pane"><div class="studio-head"><h3>Biblioteca de proyectos</h3><span class="studio-caption">'+state.projects.length+' proyectos</span></div><div class="studio-project-list">'+(cards||empty)+'</div>'+
      (active?'<div class="studio-actions"><button type="button" class="subtle" id="studio-edit-project">Editar seleccionado</button><button type="button" id="studio-open-shots">Abrir planos</button></div>':'')+
      '</div>'+projectForm+'</div>';
  }
  function drawShots(){
    const p=currentProject();
    if(!p)return '<div class="studio-pane">'+empty+'<p>Abre Proyectos para comenzar.</p><button data-studio-tab="projects">Ir a proyectos</button></div>';
    const shots=state.shots.filter(s=>Number(s.project_id)===state.projectId);
    const s=currentShot();
    const data=s||{title:'',script:'',reference_notes:'',aspect:'9:16',resolution:'1080p',duration_seconds:5,fps:24,variants:2,provider:'pendiente'};
    const summary=s?'<span class="studio-caption">Versión '+Number(s.version||0)+'</span>':'<span class="studio-caption">Nuevo plano</span>';
    const shotList=shots.map(item=>
      '<button type="button" class="studio-shot-card'+(s&&Number(s.id)===Number(item.id)?' active':'')+'" data-shot-id="'+item.id+'">'+
        '<strong>'+escapeHtml(item.title)+'</strong><span>'+escapeHtml(item.aspect)+' · '+escapeHtml(item.resolution)+' · '+Number(item.duration_seconds)+'s · '+Number(item.variants)+' variantes</span>'+
      '</button>').join('');
    return '<div class="studio-pane"><div class="studio-head"><div><span class="studio-caption">PROYECTO SELECCIONADO</span><h3>'+escapeHtml(p.name)+'</h3></div><button type="button" class="subtle" id="studio-new-shot">Nuevo plano</button></div>'+
      '<div class="studio-layout studio-layout-shots"><div><h4>Planos</h4><div class="studio-project-list">'+(shotList||empty)+'</div>'+
      '<p class="studio-help">Los fotogramas maestros y archivos multimedia se incorporarán mediante la biblioteca de recursos de la siguiente fase. Aquí guardamos la pauta técnica.</p></div>'+
      '<form id="studio-shot-form" class="studio-form"><div class="studio-head"><h4>'+(s?'Editar plano':'Preparar plano')+'</h4>'+summary+'</div>'+
      '<label>Título del plano<input name="title" maxlength="160" placeholder="Paula y Rosa cruzan el callejón" value="'+escapeHtml(data.title)+'" required></label>'+
      '<label>Guion y dirección de cámara<textarea name="script" rows="3" maxlength="4000" placeholder="Movimiento de cámara, plano, acción, iluminación">'+escapeHtml(data.script)+'</textarea></label>'+
      '<label>Referencias y continuidad<textarea name="referenceNotes" rows="3" maxlength="3000" placeholder="Vestuario, cabello, clima, señalética, fotograma maestro">'+escapeHtml(data.reference_notes)+'</textarea></label>'+
      '<h4>Parámetros del clip</h4><div class="studio-fields">'+
      '<label>Orientación<select name="aspect">'+opts(ratios,data.aspect)+'</select></label>'+
      '<label>Calidad de salida<select name="resolution">'+opts(qualities,data.resolution)+'</select></label>'+
      '<label>Duración<select name="duration">'+durations.map(v=>option(v,data.duration_seconds,v+' segundos')).join('')+'</select></label>'+
      '<label>Variantes<select name="variants">'+[1,2,3,4].map(v=>option(v,data.variants,v+' clip'+(v>1?'s':''))).join('')+'</select></label>'+
      '<label>Fotogramas por segundo<select name="fps">'+fpsValues.map(v=>option(v,data.fps,v+' FPS')).join('')+'</select></label>'+
      '<label>Motor previsto<select name="provider">'+providers.map(([key,label])=>option(key,data.provider,label)).join('')+'</select></label>'+
      '</div><p class="studio-help">Estas son preferencias de salida. El proveedor real puede tener límites diferentes; 2K/4K o 60 FPS pueden requerir postprocesado. Ningún motor está conectado.</p>'+
      '<div class="studio-actions"><button type="submit">Guardar plano</button><button type="button" disabled class="subtle" title="Pendiente de integración">Generar video · Próxima fase</button></div>'+
      '</form></div></div>';
  }
  function drawVoices(){
    return '<div class="studio-layout"><div class="studio-pane"><span class="studio-caption">ELEVENLABS · CONEXIÓN PENDIENTE</span><h3>Biblioteca de voces y diálogos</h3>'+
      '<p>La integración incluirá selección por personaje, búsqueda de voces, reproductor de muestras reales, texto, dirección de interpretación, doblaje y sincronización.</p>'+
      '<label>Voz<select disabled><option>Se cargará desde ElevenLabs al conectar la API</option></select></label>'+
      '<label>Texto del diálogo<textarea rows="4" disabled placeholder="Escribe aquí el diálogo cuando la conexión esté lista"></textarea></label>'+
      '<div class="studio-actions"><button type="button" disabled class="subtle">Escuchar preview</button><button type="button" disabled>Generar voz</button></div>'+
      '<p class="studio-help">No hay voces ficticias ni demos simulados. Las muestras reales requieren conectar tu cuenta autorizada y validar permisos y créditos.</p></div>'+
      '<div class="studio-pane"><h3>Cadena de sonido prevista</h3><div class="studio-tags"><span>Voces</span><span>Foley</span><span>Ambientes</span><span>Música</span><span>Ecualización</span><span>Compresión</span><span>Mezcla</span><span>Exportación</span></div>'+
      '<p class="studio-help">Clonación de voces únicamente con consentimiento y los derechos correspondientes.</p></div></div>';
  }
  function drawEditor(){
    return '<div class="studio-pane"><div class="studio-head"><div><span class="studio-caption">ETAPA 3 · EDICIÓN NO DESTRUCTIVA</span><h3>Postproducción audiovisual</h3></div><span class="pill">Aún no operativa</span></div>'+
      '<div class="studio-timeline" aria-label="Representación de las pistas planificadas"><div><b>V1</b><span>Clips y transiciones</span></div><div><b>V2</b><span>Composición, textos y efectos</span></div><div><b>A1</b><span>Diálogos ElevenLabs</span></div><div><b>A2</b><span>Foley y ambientes</span></div><div><b>A3</b><span>Música y mezcla</span></div></div>'+
      '<div class="studio-tags"><span>Curvas de color</span><span>LUT</span><span>Máscaras</span><span>Keyframes</span><span>Estabilización</span><span>Desenfoque</span><span>Glitch</span><span>Subtítulos</span><span>FFmpeg</span></div>'+
      '<p class="studio-help">Este esquema no es un editor funcionando. Las operaciones de procesamiento y efectos se implementarán por etapas con tareas remotas.</p></div>';
  }
  function drawAds(){
    return '<div class="studio-pane"><div class="studio-head"><div><span class="studio-caption">CAMPAÑAS · GOOG​LE, META Y TIKTOK</span><h3>Creatividades publicitarias</h3></div><button type="button" id="studio-open-projects">Crear proyecto Ads</button></div>'+
      '<p>Formatos que contemplará el exportador para anuncios, historias, portada de reels, carruseles y material web.</p>'+
      '<div class="studio-formats"><div><span class="studio-ratio portrait"></span><b>9:16</b><small>Vertical</small></div><div><span class="studio-ratio landscape"></span><b>16:9</b><small>Horizontal</small></div><div><span class="studio-ratio square"></span><b>1:1</b><small>Cuadrado</small></div><div><span class="studio-ratio wide"></span><b>1.91:1</b><small>Ads horizontal</small></div></div>'+
      '<p class="studio-help">Incluiremos zona segura para textos, CTA, versiones A/B y preservación de la portada original de La Llave. Exportador todavía pendiente.</p></div>';
  }
  function render(){
    if(!root.isConnected)return;
    root.innerHTML='<section class="studio-root"><div class="studio-banner"><span class="studio-caption">LA LLAVE · ESTUDIO AUDIOVISUAL</span><h2>Estudio Creativo 066</h2><p>Fotogramas, escenas, voces, publicidad y postproducción desde una biblioteca privada.</p><span class="studio-readiness">Fase 1 · Preparación de proyectos. Ninguna generación ni costo habilitados.</span></div>'+
      '<div class="studio-tabs" role="group" aria-label="Secciones del estudio">'+navTabs(state.tab)+'</div>'+
      (state.tab==='projects'?drawProjects():state.tab==='shots'?drawShots():state.tab==='voices'?drawVoices():state.tab==='editor'?drawEditor():drawAds())+
      '</section>';
    root.querySelectorAll('[data-studio-tab]').forEach(button=>button.onclick=()=>{state.tab=button.dataset.studioTab;lastTab=state.tab;state.editProject=false;render();});
    root.querySelectorAll('[data-project-id]').forEach(button=>button.onclick=()=>{state.projectId=Number(button.dataset.projectId);state.shotId=null;state.editProject=false;render();});
    root.querySelectorAll('[data-shot-id]').forEach(button=>button.onclick=()=>{state.shotId=Number(button.dataset.shotId);render();});
    const openShots=root.querySelector('#studio-open-shots');
    if(openShots)openShots.onclick=()=>{state.tab='shots';lastTab='shots';state.shotId=null;render();};
    const editProject=root.querySelector('#studio-edit-project');
    if(editProject)editProject.onclick=()=>{state.editProject=true;render();};
    const cancelEdit=root.querySelector('#studio-cancel-edit');
    if(cancelEdit)cancelEdit.onclick=()=>{state.editProject=false;render();};
    const newShot=root.querySelector('#studio-new-shot');
    if(newShot)newShot.onclick=()=>{state.shotId=null;render();};
    const adsProject=root.querySelector('#studio-open-projects');
    if(adsProject)adsProject.onclick=()=>{state.tab='projects';lastTab='projects';render();const s=root.querySelector('[name=type]');if(s)s.value='ads';};
    const projectForm=root.querySelector('#studio-project-form');
    if(projectForm)projectForm.onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(projectForm);
      const old=state.editProject?currentProject():null;
      const body={action:old?'update':'create',name:String(f.get('name')||''),type:String(f.get('type')||'cine'),description:String(f.get('description')||'')};
      if(old){body.id=Number(old.id);body.version=Number(old.version);}
      const btn=projectForm.querySelector('[type=submit]');btn.disabled=true;
      try{const saved=await request('studio-project',body);state.projectId=Number(saved.project.id);state.editProject=false;await refresh();notice('Proyecto guardado en la biblioteca del estudio.');}
      catch(error){btn.disabled=false;notice(error.message);}
    };
    const shotForm=root.querySelector('#studio-shot-form');
    if(shotForm)shotForm.onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(shotForm);
      const old=currentShot();
      const body={action:old?'update':'create',projectId:state.projectId,title:String(f.get('title')||''),script:String(f.get('script')||''),referenceNotes:String(f.get('referenceNotes')||''),aspect:String(f.get('aspect')),resolution:String(f.get('resolution')),duration:Number(f.get('duration')),fps:Number(f.get('fps')),variants:Number(f.get('variants')),provider:String(f.get('provider'))};
      if(old){body.id=Number(old.id);body.version=Number(old.version);}
      const btn=shotForm.querySelector('[type=submit]');btn.disabled=true;
      try{const saved=await request('studio-shot',body);state.shotId=Number(saved.shot.id);await refresh();notice('Plano y configuración guardados. No se generó ningún clip.');}
      catch(error){btn.disabled=false;notice(error.message);}
    };
  }
  root.innerHTML='<div class="studio-pane"><h2>Abriendo Estudio Creativo 066…</h2><p>Consultando biblioteca privada.</p></div>';
  refresh().catch(error=>{if(root.isConnected)root.innerHTML='<div class="studio-pane"><h2>Estudio no habilitado todavía</h2><p>'+escapeHtml(error.message)+'</p><p class="studio-help">La migración de fase 1 y los servicios privados deben probarse en un entorno de ensayo antes del despliegue.</p></div>';});
}
