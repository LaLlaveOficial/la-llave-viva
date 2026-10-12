export const HOUSTON_ORIGIN='https://houston-066-production.up.railway.app';
export const AGENT_ROLES=[
  {slug:'radar-lectores',name:'Radar de lectores',description:'Busca reseñadores, clubes y oportunidades públicas con fuentes verificadas.'},
  {slug:'contactos',name:'Contactos y seguimiento',description:'Prepara mensajes personalizados y conserva la aprobación de Kike.'},
  {slug:'prensa',name:'Prensa y reseñas',description:'Investiga medios, podcasts y menciones del libro.'},
  {slug:'contenidos',name:'Contenido Caso 066',description:'Prepara guiones, publicaciones e historias.'},
  {slug:'analitica',name:'Ads y analítica',description:'Revisa métricas de cuentas autorizadas; los cambios requieren aprobación.'},
  {slug:'crecimiento',name:'Crecimiento y poscompra',displayName:'Gerente de marketing y crecimiento',description:'Prioriza ventas, supervisa entregables del equipo, coordina contenido para Instagram/TikTok y propone experimentos medibles.'}
];
const blankAgents=status=>AGENT_ROLES.map(a=>({...a,status,task:null,result:null,updatedAt:null}));
export function agentState(probe,missions){
  if(!probe)return 'Por comprobar';
  if(probe.turnBusy===true || probe.runningRoutineRuns>0)return 'Trabajando';
  if(probe.loginPending===true)return 'Esperando conexión de IA';
  if(missions.some(m=>m.pending_interaction))return 'Esperando aprobación';
  return 'Inactivo';
}
export async function houstonStatus(env=process.env,fetcher=fetch){
  const checkedAt=new Date().toISOString();
  const token=env.HOUSTON_HOST_TOKEN;
  // Fixed allowlist: never send the server credential to a user-supplied URL.
  if(env.HOUSTON_ORIGIN && env.HOUSTON_ORIGIN!==HOUSTON_ORIGIN)return {status:'Error de configuración',checkedAt,description:'La dirección del motor no coincide con el servidor autorizado.',agents:blankAgents('Por comprobar')};
  const request=async(path,authorized=true)=>{
    const r=await fetcher(HOUSTON_ORIGIN+path,{headers:authorized?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(7000),redirect:'error'});
    if(!r.ok)throw new Error('upstream');
    return r.json();
  };
  if(typeof token!=='string'||token.length<32){
    let online=false;try{online=(await request('/health',false)).status==='ok';}catch{}
    return {status:online?'Servidor en línea':'Sin conexión',checkedAt,description:online?'Houston está disponible. Falta configurar la conexión privada de esta consola.':'No se pudo comprobar el servidor de Houston.',agents:blankAgents('Por comprobar')};
  }
  let registered;
  try {registered=await request('/engine/agents');if(!Array.isArray(registered))throw new Error('shape');}
  catch {return {status:'Sin conexión',checkedAt,description:'No se pudo verificar el acceso privado al motor. Los estados de los agentes no están confirmados.',agents:blankAgents('Por comprobar')};}
  let modelStatus='Por comprobar';
  try {const auth=await request('/engine/setup-runtime/auth/status');if(Array.isArray(auth.providers))modelStatus=auth.providers.some(p=>p.configured===true)?'Conectado':'Pendiente';}catch{}
  // Activity probes read the host's live state; they do not wake agent runtimes.
  const agents=await Promise.all(AGENT_ROLES.map(async role=>{
    const agent=registered.find(a=>a.name===role.name);
    if(!agent)return {...role,status:'Pendiente de importar',task:null,result:null,updatedAt:null};
    const root='/engine/agents/'+encodeURIComponent(agent.id);
    const [p,m]=await Promise.allSettled([request(root+'/activity'),request(root+'/activities')]);
    const probe=p.status==='fulfilled'?p.value:null;
    const missions=m.status==='fulfilled'&&Array.isArray(m.value?.items)?m.value.items:[];
    const newest=[...missions].sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
    const current=newest.find(x=>x.pending_interaction||['running','in_progress','in-progress','active'].includes(x.status));
    const done=newest.find(x=>['completed','done'].includes(x.status));
    const activityUnavailable=m.status!=='fulfilled'||!Array.isArray(m.value?.items);
    const active=probe?.turnBusy===true||probe?.runningRoutineRuns>0||current?.pending_interaction;
    return {...role,id:agent.id,status:activityUnavailable?'Por comprobar':agentState(probe,missions),task:active?current?.title||null:null,result:done?.title||null,lastTask:newest[0]?.title||null,missionId:(active?current:newest[0])?.id||null,updatedAt:newest[0]?.updated_at||null,activityUnavailable};
  }));
  return {status:'Conectado',modelStatus,checkedAt,description:'Acceso privado al motor verificado. Los estados siguientes se consultan en Houston; registrar un agente no inicia una misión.',agents};
}

export async function houstonUsage(env=process.env,fetcher=fetch){
 const key=env.HOUSTON_HOST_TOKEN;if(typeof key!=='string'||key.length<32)throw Error('Conexión privada no disponible.');
 const read=async path=>{const r=await fetcher(HOUSTON_ORIGIN+'/engine'+path,{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(22000),redirect:'error'});if(!r.ok)throw Error('Houston no pudo consultar el cupo ('+r.status+').');return r.json();};
 const agents=await read('/agents');const agent=agents.find(a=>a.name==='Crecimiento y poscompra')||agents[0];if(!agent?.id)throw Error('No hay un agente registrado.');
 const raw=await read('/agents/'+encodeURIComponent(agent.id)+'/providers/usage');const rows=Array.isArray(raw)?raw:(raw.items||raw.providers||[]);
 return {checkedAt:new Date().toISOString(),source:'Proveedor conectado a Houston',providers:rows.filter(r=>r.provider==='openai-codex').map(r=>({provider:r.provider,status:r.status,plan:r.plan||null,fetchedAt:r.fetchedAt||null,windows:(r.windows||[]).filter(w=>['session','week'].includes(w.id)).map(w=>({id:w.id,usedPercent:typeof w.usedPercent==='number'?w.usedPercent:null,resetsAt:w.resetsAt||null,windowMinutes:w.windowMinutes||null}))})),note:'Consulta de cupo, sin comprar créditos ni cambiar el proveedor. Si no hay ventanas, no se pudo confirmar porcentaje ni reinicio.'};
}
