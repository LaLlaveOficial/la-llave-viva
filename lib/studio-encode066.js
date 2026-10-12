import {HOUSTON_ORIGIN} from './houston-status.js';
export async function studioEncodeRequest(op,body={},env=process.env,fetcher=fetch){
 if(!['init','chunk','start','status','file','cancel'].includes(op)||typeof env.HOUSTON_HOST_TOKEN!=='string'||env.HOUSTON_HOST_TOKEN.length<32)throw Error('La codificación MP4 privada no está configurada.');
 const url=new URL('/studio-encode-066',HOUSTON_ORIGIN);url.searchParams.set('op',op);
 const get=['status','file'].includes(op);
 if(get){url.searchParams.set('id',body.id);if(op==='file')url.searchParams.set('index',String(body.index));}
 const r=await fetcher(url,{method:get?'GET':'POST',headers:{Authorization:'Bearer '+env.HOUSTON_HOST_TOKEN,...(get?{}:{'Content-Type':'application/json'})},body:get?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(22000)});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Houston no confirmó la exportación.');return data;
}
