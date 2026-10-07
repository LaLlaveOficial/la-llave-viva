export const HOUSTON_ORIGIN='https://houston-066-production.up.railway.app';
export const AGENT_ROLES=[
  {slug:'radar-lectores',name:'Radar de lectores',description:'Busca reseñadores, clubes y oportunidades públicas con fuentes verificadas.'},
  {slug:'contactos',name:'Contactos y seguimiento',description:'Prepara mensajes personalizados y conserva la aprobación de Kike.'},
  {slug:'prensa',name:'Prensa y reseñas',description:'Investiga medios, podcasts y menciones del libro.'},
  {slug:'contenidos',name:'Contenido Caso 066',description:'Prepara guiones, publicaciones e historias.'},
  {slug:'analitica',name:'Ads y analítica',description:'Revisa métricas de cuentas autorizadas; los cambios requieren aprobación.'},
  {slug:'crecimiento',name:'Crecimiento y poscompra',description:'Organiza oferta, captación, seguimiento y pendientes de Green Glass.'}
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
