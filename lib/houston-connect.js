import {HOUSTON_ORIGIN} from './houston-status.js';

// Only the official device flow is exposed. Host keys and provider credentials
// stay on the server; the owner's short-lived device code stays in their session.
export async function houstonConnect(action,env=process.env,fetcher=fetch){
  if(!['start','status','finish','cancel'].includes(action))throw new Error('Acción de conexión inválida.');
  if(typeof env.HOUSTON_HOST_TOKEN!=='string'||env.HOUSTON_HOST_TOKEN.length<32||
    (env.HOUSTON_ORIGIN&&env.HOUSTON_ORIGIN!==HOUSTON_ORIGIN))throw new Error('La conexión privada no está configurada.');
  const call=async(path,method='GET',body)=>{
    const r=await fetcher(HOUSTON_ORIGIN+'/engine/setup-runtime/'+path,{
      method,headers:{Authorization:'Bearer '+env.HOUSTON_HOST_TOKEN,...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(22000)
    });
    if(!r.ok)throw new Error('Houston no pudo completar la conexión. Vuelve a intentarlo.');
    return r.json();
  };
  if(action==='cancel'){await call('auth/openai-codex/login/cancel','POST');return {status:'cancelled'};}
  if(action==='start'){
    const info=await call('auth/openai-codex/login?deviceAuth=true','POST');
    let url;try{url=new URL(info.verificationUri);}catch{}
    if(info.kind!=='device_code'||!url||url.origin!=='https://auth.openai.com'||
      !['/codex/device','/device'].includes(url.pathname)||url.search||url.hash||url.username||url.password||
      typeof info.userCode!=='string'||! /^[A-Z0-9-]{6,24}$/i.test(info.userCode))
      throw new Error('No se recibió una autorización válida de OpenAI.');
    return {status:'awaiting_user',verificationUri:url.href,userCode:info.userCode};
  }
  const auth=await call('auth/status');
  const row=Array.isArray(auth.providers)?auth.providers.find(p=>p.provider==='openai-codex'):null;
  if(!row)throw new Error('No se pudo comprobar la conexión con OpenAI.');
  if(row.configured!==true)return {status:row.login?.status==='error'?'error':'awaiting_user'};
  if(action==='finish'){
    const saved=await call('credential/capture','POST',{provider:'openai-codex'});
    if(saved.ok!==true)throw new Error('No se pudo guardar la conexión para los agentes.');
  }
  return {status:'connected'};
}
