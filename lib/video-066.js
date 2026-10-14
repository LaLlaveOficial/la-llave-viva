import {HOUSTON_ORIGIN} from './houston-status.js';
import {validateVideo} from '../deploy/console066-houston/video-composition.mjs';
export async function videoRequest(op,body,env=process.env,fetcher=fetch){
 if(!['list','render','file'].includes(op)||typeof env.HOUSTON_HOST_TOKEN!=='string'||env.HOUSTON_HOST_TOKEN.length<32)throw Error('El render privado no está configurado.');
 const url=new URL(HOUSTON_ORIGIN+'/video-066');url.searchParams.set('op',op);
 if(op==='file'){if(!/^[a-f0-9-]{36}$/.test(body.id||''))throw Error('Video inválido.');url.searchParams.set('id',body.id);}
 const payload=op==='render'?validateVideo(body):null;
 const r=await fetcher(url,{method:payload?'POST':'GET',headers:{Authorization:'Bearer '+env.HOUSTON_HOST_TOKEN,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,redirect:'error',signal:AbortSignal.timeout(22000)});
 if(!r.ok){let d;try{d=await r.json();}catch{}throw Error(d?.error||'El servidor de video no confirmó la operación.');}
 if(op==='file'){const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>4000000)throw Error('Archivo demasiado grande.');return bytes;}
 return r.json();
}
