import {isWebMData,isMP4Data} from './studio-recording.js';
const CHUNK=512*1024,MAX=128*1024*1024;
const encode=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const pause=(ms,signal)=>new Promise((resolve,reject)=>{
 if(signal?.aborted)return reject(new Error('Exportación cancelada.'));
 const abort=()=>{clearTimeout(timer);reject(new Error('Exportación cancelada.'));};
 const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);signal?.addEventListener('abort',abort,{once:true});
});
export async function encodeStudioMP4(blob,{seconds,fps=24,quality='high',resolution='720p',signal,onProgress,fetcher=fetch,pollMs=1000}={}){
 if(blob.size>MAX||!await isWebMData(blob))throw Error('La captura debe ser WebM y no superar 128 MB.');
 const id=crypto.randomUUID();let created=false;
 const call=async(action,body,get=false,useSignal=true)=>{
  const timeout=AbortSignal.timeout(30000),abort=useSignal&&signal?AbortSignal.any([signal,timeout]):timeout;
  let url='/api/console-066?op=studio-encode-'+action;
  if(get)url+='&id='+encodeURIComponent(id)+(action==='file'?'&index='+body.index:'');
  const r=await fetcher(url,{method:get?'GET':'POST',credentials:'same-origin',headers:get?{}:{'Content-Type':'application/json'},body:get?undefined:JSON.stringify({id,...body}),signal:abort});
  const data=await r.json();if(!r.ok)throw Error(data.error||'El servidor no confirmó la exportación MP4.');return data;
 };
 try{
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
  created=true;await call('init',{bytes:blob.size,seconds,fps,quality,resolution,sha256:hash});
  for(let offset=0,index=0;offset<blob.size;offset+=CHUNK,index++){
   await call('chunk',{index,data:encode(new Uint8Array(await blob.slice(offset,offset+CHUNK).arrayBuffer()))});
   onProgress?.('Subiendo montaje',Math.round(Math.min(offset+CHUNK,blob.size)/blob.size*100));
  }
  let result=await call('start',{}),deadline=Date.now()+660000;
  while(result.job?.status!=='ready'){
   if(['failed','cancelled'].includes(result.job?.status))throw Error(result.job.error||'La codificación no terminó.');
   if(Date.now()>deadline)throw Error('El servidor alcanzó el límite de espera de la exportación.');
   onProgress?.('Codificando MP4 en Houston',result.job?.progress||0);
   await pause(pollMs,signal);result=await call('status',{},true);
  }
  const size=result.job.outputBytes;if(!Number.isSafeInteger(size)||size<12||size>MAX)throw Error('Tamaño de MP4 inválido.');
  const parts=[];let downloaded=0;
  for(let index=0;downloaded<size;index++){
   const part=await call('file',{index},true),bytes=decode(part.data);
   if(part.total!==size||part.bytes!==bytes.length||bytes.length!==Math.min(CHUNK,size-downloaded))throw Error('La descarga del MP4 llegó incompleta.');
   parts.push(bytes);downloaded+=bytes.length;onProgress?.('Descargando MP4',Math.round(downloaded/size*100));
  }
  const output=new Blob(parts,{type:'video/mp4'});if(!await isMP4Data(output))throw Error('El servidor no entregó un MP4 válido.');return output;
 }finally{
  if(created){for(let attempt=0;attempt<3;attempt++){try{await call('cancel',{},false,false);break;}catch{if(attempt<2)await pause(200);}}}
 }
}
