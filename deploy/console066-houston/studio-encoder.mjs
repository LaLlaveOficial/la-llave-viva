import {mkdtemp,readFile,appendFile,stat,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {videoAuth} from './video-renderer.mjs';

export const STUDIO_CHUNK=512*1024, STUDIO_MAX_BYTES=128*1024*1024;
const uuid=id=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id||'');
const base64=s=>typeof s==='string'&&s.length>0&&s.length<=Math.ceil(STUDIO_CHUNK/3)*4&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s);
export function validateStudioUpload(b){
 const leadSeconds=b?.leadSeconds??0;if(!Number.isFinite(leadSeconds)||leadSeconds<0||leadSeconds>8)return null;
 if(!b||!uuid(b.id)||!Number.isSafeInteger(b.bytes)||b.bytes<16||b.bytes>STUDIO_MAX_BYTES||!Number.isFinite(b.seconds)||b.seconds<=0||b.seconds>120||![24,30].includes(b.fps)||!['standard','high','master'].includes(b.quality)||!['720p','1080p'].includes(b.resolution)||!/^[a-f0-9]{64}$/.test(b.sha256||''))return null;
 return {id:b.id,bytes:b.bytes,seconds:b.seconds,fps:b.fps,quality:b.quality,resolution:b.resolution,leadSeconds,sha256:b.sha256};
}
const snapshot=j=>({id:j.id,status:j.status,progress:j.progress,received:j.received,bytes:j.bytes,outputBytes:j.outputBytes||0,error:j.error||null});
export function createStudioEncoder({resources={busy:false},runProcess=spawn,ffmpeg='/usr/bin/ffmpeg',ffprobe='/usr/bin/ffprobe',ttlMs=3600000}={}){
 const jobs=new Map();let creating=0;
 const run=(exe,args,job,progress)=>new Promise((resolve,reject)=>{
  const child=runProcess(exe,args,{cwd:job.dir,env:{PATH:process.env.PATH,LANG:'C.UTF-8'},stdio:['ignore','pipe','pipe']});job.child=child;let stdout='',stderr='',timedOut=false;
  const timeout=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');job.killTimer=setTimeout(()=>child.kill('SIGKILL'),3000);},exe===ffprobe?30000:600000);
  child.stdout.on('data',b=>{stdout=(stdout+b).slice(-16384);if(progress)for(const line of String(b).split('\n')){const m=/^out_time_us=(\d+)/.exec(line);if(m)job.progress=Math.min(99,Math.round(Number(m[1])/1e6/job.seconds*100));}});
  child.stderr.on('data',b=>{stderr=(stderr+b).slice(-1000);});
  const clear=()=>{clearTimeout(timeout);clearTimeout(job.killTimer);job.child=null;};
  child.on('error',e=>{clear();reject(e);});child.on('close',code=>{clear();code===0&&!timedOut?resolve(stdout):reject(Error(timedOut?'La codificación alcanzó su límite de tiempo.':'No se pudo codificar el montaje.'));});
 });
 const destroy=async j=>{clearTimeout(j.expiry);jobs.delete(j.id);await rm(j.dir,{recursive:true,force:true});};
 const produce=async j=>{
  try{
   const info=JSON.parse(await run(ffprobe,['-v','error','-protocol_whitelist','file,pipe','-show_entries','stream=codec_type,codec_name,width,height:format=duration','-of','json',join(j.dir,'input.webm')],j));
   const video=info.streams?.find(s=>s.codec_type==='video'),audio=info.streams?.filter(s=>s.codec_type==='audio')||[];
   if(!video||info.streams.length>2||audio.length>1||!['vp8','vp9','av1'].includes(video.codec_name)||video.width<2||video.height<2||video.width>2064||video.height>1920||video.width*video.height>2230000||Number(info.format.duration)>122)throw Error('El archivo no corresponde a un montaje admitido.');
   const output=join(j.dir,'output.mp4');
   await run(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-y','-threads','1','-protocol_whitelist','file,pipe','-ss',j.leadSeconds.toFixed(6),'-i',join(j.dir,'input.webm'),'-map','0:v:0','-map','0:a:0?','-t',String(j.seconds),'-r',String(j.fps),'-c:v','libx264','-threads','1','-filter_threads','1','-preset','veryfast','-crf',({standard:'23',high:'20',master:'17'})[j.quality],'-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-progress','pipe:1',output],j,true);
   const verified=JSON.parse(await run(ffprobe,['-v','error','-protocol_whitelist','file,pipe','-show_entries','stream=codec_type,codec_name,width,height:format=duration','-of','json',output],j));
   if(verified.streams.find(s=>s.codec_type==='video')?.codec_name!=='h264'||(audio.length&&!verified.streams.some(s=>s.codec_type==='audio'&&s.codec_name==='aac'))||Math.abs(Number(verified.format.duration)-j.seconds)>.5)throw Error('La salida no pasó la verificación de video y audio.');
   j.outputBytes=(await stat(output)).size;if(j.outputBytes>STUDIO_MAX_BYTES)throw Error('El MP4 supera los 128 MB permitidos.');
   j.status='ready';j.progress=100;await rm(join(j.dir,'input.webm'),{force:true});
  }catch(e){if(j.status!=='cancelled'){j.status='failed';j.error=e.message;}}
  finally{resources.busy=false;if(j.status==='cancelled')await destroy(j);}
 };
 return async(req,res,url)=>{
  const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'private, no-store'});res.end(JSON.stringify(data));};
  if(!videoAuth(req,process.env.HOUSTON_HOST_TOKEN))return json(401,{error:'Acceso privado requerido.'});
  let j;
  try{
   const op=url.searchParams.get('op');let b={};
   if(req.method==='POST'){let bytes='';for await(const c of req){bytes+=c;if(bytes.length>750000)return json(413,{error:'Parte demasiado grande.'});}b=JSON.parse(bytes);}
   const id=req.method==='POST'?b.id:url.searchParams.get('id');if(!uuid(id))return json(400,{error:'Identificador inválido.'});j=jobs.get(id);
   if(op==='init'&&req.method==='POST'){
    const input=validateStudioUpload(b);if(!input)return json(400,{error:'Montaje inválido o demasiado grande.'});
    if(j){if(j.sha256!==input.sha256||j.bytes!==input.bytes)return json(409,{error:'Este identificador corresponde a otro montaje.'});return json(200,{job:snapshot(j)});}
    if(jobs.size+creating>=4)return json(409,{error:'Hay cuatro exportaciones temporales. Descarga o cancela una antes de continuar.'});
    creating++;let dir;try{dir=await mkdtemp(join(tmpdir(),'studio066-'));}finally{creating--;}
    if(jobs.has(id)){await rm(dir,{recursive:true,force:true});return json(409,{error:'Esta exportación ya se está creando.'});}
    j={...input,dir,status:'uploading',received:0,next:0,progress:0,writing:false};jobs.set(id,j);
    j.expiry=setTimeout(()=>{if(j.status==='encoding'){j.status='cancelled';j.child?.kill('SIGTERM');}else void destroy(j);},ttlMs);j.expiry.unref();return json(201,{job:snapshot(j)});
   }
   if(!j)return json(404,{error:'La exportación temporal venció o el servidor reinició. Vuelve a exportar el montaje.'});
   if(op==='chunk'&&req.method==='POST'){
    if(j.status!=='uploading'||j.writing)return json(409,{error:'La exportación no admite otra parte ahora.'});
    if(!Number.isSafeInteger(b.index)||b.index!==j.next||!base64(b.data))return json(400,{error:'Parte inválida o fuera de orden.'});
    const chunk=Buffer.from(b.data,'base64');if(chunk.length!==Math.min(STUDIO_CHUNK,j.bytes-j.received))return json(400,{error:'Tamaño de parte incorrecto.'});
    j.writing=true;try{await appendFile(join(j.dir,'input.webm'),chunk);j.received+=chunk.length;j.next++;}finally{j.writing=false;}return json(200,{job:snapshot(j)});
   }
   if(op==='start'&&req.method==='POST'){
    if(['encoding','ready'].includes(j.status))return json(200,{job:snapshot(j)});
    if(j.status!=='uploading'||j.writing||j.received!==j.bytes)return json(409,{error:'El montaje todavía no terminó de subir.'});
    if(resources.busy)return json(409,{error:'Houston está renderizando otra pieza. Intenta de nuevo cuando termine.'});
    resources.busy=true;j.status='checking';
    let bytes;try{bytes=await readFile(join(j.dir,'input.webm'));}catch(e){resources.busy=false;if(j.status==='cancelled')await destroy(j);else j.status='uploading';throw e;}
    if(j.status==='cancelled'){resources.busy=false;await destroy(j);return json(409,{error:'Exportación cancelada.'});}
    if(createHash('sha256').update(bytes).digest('hex')!==j.sha256||bytes.subarray(0,4).toString('hex')!=='1a45dfa3'){resources.busy=false;j.status='uploading';return json(400,{error:'El montaje llegó incompleto o no es WebM.'});}
    resources.busy=true;j.status='encoding';void produce(j);return json(202,{job:snapshot(j)});
   }
   if(op==='status'&&req.method==='GET')return json(200,{job:snapshot(j)});
   if(op==='file'&&req.method==='GET'){
    if(j.status!=='ready')return json(409,{error:'El MP4 aún no está listo.'});
    const index=Number(url.searchParams.get('index'));if(!Number.isSafeInteger(index)||index<0||index*STUDIO_CHUNK>=j.outputBytes)return json(400,{error:'Parte de descarga inválida.'});
    const {open}=await import('node:fs/promises');const f=await open(join(j.dir,'output.mp4'),'r');try{const data=Buffer.alloc(Math.min(STUDIO_CHUNK,j.outputBytes-index*STUDIO_CHUNK));await f.read(data,0,data.length,index*STUDIO_CHUNK);return json(200,{data:data.toString('base64'),bytes:data.length,total:j.outputBytes});}finally{await f.close();}
   }
   if(op==='cancel'&&req.method==='POST'){
    if(j.writing)return json(409,{error:'Termina de subir la parte actual antes de cancelar.'});
    if(j.status==='checking')j.status='cancelled';
    else if(j.status==='encoding'){j.status='cancelled';j.child?.kill('SIGTERM');j.killTimer=setTimeout(()=>j.child?.kill('SIGKILL'),3000);}else await destroy(j);
    return json(200,{cancelled:true});
   }
   return json(405,{error:'Operación no permitida.'});
  }catch{return json(400,{error:'No se pudo procesar la exportación privada.'});}
 };
}
