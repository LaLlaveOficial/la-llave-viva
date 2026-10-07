import {HOUSTON_ORIGIN,AGENT_ROLES} from './houston-status.js';
export function validateMission(body){
  return body&&AGENT_ROLES.some(a=>a.slug===body.slug)&&['start','read'].includes(body.action)&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(body.id||'')&&(body.action==='read'||(typeof body.text==='string'&&body.text.trim().length>=5&&body.text.length<=4000));
}
export async function houstonMission(body,env=process.env,fetcher=fetch){
  if(!validateMission(body))throw new Error('Revisa la tarea y el agente.');
  if((env.HOUSTON_ORIGIN&&env.HOUSTON_ORIGIN!==HOUSTON_ORIGIN)||typeof env.HOUSTON_HOST_TOKEN!=='string'||env.HOUSTON_HOST_TOKEN.length<32)throw new Error('La conexión privada no está configurada.');
  const call=async(path,method='GET',payload)=>{
    const r=await fetcher(HOUSTON_ORIGIN+path,{method,headers:{Authorization:'Bearer '+env.HOUSTON_HOST_TOKEN,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,redirect:'error',signal:AbortSignal.timeout(22000)});
    if(!r.ok){if(r.status===404)return null;throw new Error(r.status===409?'Este agente ya está trabajando. Actualiza antes de iniciar otra tarea.':'Houston no confirmó la operación. Revisa el estado antes de volver a intentar.');}return r.json();
  };
  const role=AGENT_ROLES.find(a=>a.slug===body.slug);
  const agents=await call('/engine/agents');
  const agent=Array.isArray(agents)?agents.find(a=>a.name===role.name):null;
  if(!agent)throw new Error('El agente no está registrado.');
  const root='/engine/agents/'+encodeURIComponent(agent.id),cid='activity-'+body.id;
  const transcript=await call(root+'/conversations/'+cid+'/messages');
  if(body.action==='read'){
    const messages=Array.isArray(transcript?.messages)?transcript.messages:[];
    const reply=[...messages].reverse().find(m=>m.role==='assistant'&&typeof m.content==='string'&&m.content.trim());
    return {id:body.id,reply:reply?reply.content.slice(0,30000):null,found:!!transcript};
  }
  // A fixed conversation + nonce makes a lost-response retry the same turn.
  // Never resend a mission whose transcript already exists.
  if(transcript)return {id:body.id,status:'existing'};
  const providers=await call(root+'/providers');
  if(!Array.isArray(providers)||!providers.some(p=>p.id==='openai-codex'&&p.configured===true))throw new Error('OpenAI todavía no está disponible para este agente.');
  const title=body.text.trim().slice(0,90);
  await call(root+'/activities','POST',{id:body.id,title,description:body.text.trim(),provider:'openai-codex',agent:'execute'});
  const text='Tarea interna de Kike para '+role.name+'. Prepara un resultado para revisión. No envíes comunicaciones, sigas cuentas, publiques, compres, cambies campañas ni solicites secretos. Usa solo fuentes públicas o archivos autorizados. Declara límites de acceso y no inventes datos.\n\n'+body.text.trim();
  const accepted=await call(root+'/conversations/'+cid+'/messages','POST',{text,nonce:body.id,provider:'openai-codex',mode:'execute'});
  if(!accepted?.ok)throw new Error('Houston no confirmó el inicio.');
  return {id:body.id,status:'accepted'};
}
