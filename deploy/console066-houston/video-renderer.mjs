import {mkdir,readFile,writeFile,rename,readdir,copyFile,stat,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {timingSafeEqual} from 'node:crypto';
import {validateVideo,videoComposition,VIDEO_VERSION} from './video-composition.mjs';
const validId=id=>/^[a-f0-9-]{36}$/.test(id||'');
const publicJob=j=>({id:j.id,title:j.title,format:j.format,duration:j.duration,status:j.status,stage:j.stage||null,progress:j.progress??null,createdAt:j.createdAt,updatedAt:j.updatedAt||j.createdAt,completedAt:j.completedAt||null,error:j.error||null});
export const renderTimeoutMs=duration=>Math.min(1200000,240000+duration*60000);
export function videoAuth(req,key){if(typeof key!=='string'||key.length<32)return false;const a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+key);return a.length===b.length&&timingSafeEqual(a,b);}
export function createVideoRenderer({root='/data/video-066',assets='/houston/video-assets',cli='/opt/llave-render/node_modules/hyperframes/bin/hyperframes.mjs',runProcess=spawn,resources={busy:false}}={}){
 let busy=false;
 const save=async j=>{const dir=join(root,j.id);await mkdir(dir,{recursive:true});await writeFile(join(dir,'job.tmp'),JSON.stringify(j));await rename(join(dir,'job.tmp'),join(dir,'job.json'));};
 const read=async id=>{if(!validId(id))throw Error('Video inválido.');return JSON.parse(await readFile(join(root,id,'job.json'),'utf8'));};
 const run=(args,cwd,{timeoutMs=60000,onProgress,executable=process.execPath,prefix=[cli]}={})=>new Promise((resolve,reject)=>{
  // The renderer receives no host/provider credentials. Only fixed compositions execute.
  const env={PATH:process.env.PATH,HOME:root,TMPDIR:'/tmp',LANG:'C.UTF-8',DO_NOT_TRACK:'1',HYPERFRAMES_NO_TELEMETRY:'1',HYPERFRAMES_BROWSER_PATH:'/usr/bin/chromium',PRODUCER_LOW_MEMORY_MODE:'true',PRODUCER_HEADLESS_SHELL_PATH:'/usr/bin/chromium',PUPPETEER_EXECUTABLE_PATH:'/usr/bin/chromium'};
  const child=runProcess(executable,[...prefix,...args],{cwd,env,stdio:['ignore','pipe','pipe']});let log='';
  let timedOut=false,killTimer;
  for(const stream of [child.stdout,child.stderr])stream?.on('data',b=>{log=(log+b).slice(-6000);for(const line of log.split('\n')){try{const data=JSON.parse(line.slice(line.indexOf('{')).replace(/\x1b\[[0-9;]*m/g,''));if(Number.isFinite(data.framesCompleted)&&data.totalFrames>0)onProgress?.(Math.min(95,Math.round(10+85*data.framesCompleted/data.totalFrames)));}catch{}}});
  const timeout=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');killTimer=setTimeout(()=>child.kill('SIGKILL'),5000);},timeoutMs);
  const clear=()=>{clearTimeout(timeout);clearTimeout(killTimer);};
  child.on('error',e=>{clear();reject(e)});child.on('close',code=>{clear();code===0&&!timedOut?resolve():reject(Error(timedOut?'El render alcanzó el límite de tiempo del servidor.':'Render fallido. '+log.replace(/\x1b\[[0-9;]*m/g,'').slice(-700)));});
 });
 const produce=async j=>{
  let work=null;
  let writes=Promise.resolve(),lastSaved=0;
  const update=(stage,progress)=>{j.stage=stage;j.progress=progress;j.updatedAt=new Date().toISOString();const snapshot={...j};writes=writes.then(()=>save(snapshot));return writes;};
  try{
   const saved=join(root,j.id);work=await mkdtemp('/tmp/llave-render-');
   for(const dir of [saved,work]){await mkdir(join(dir,'assets'),{recursive:true});for(const file of ['gsap.min.js','cover.webp'])await copyFile(join(assets,file),join(dir,'assets',file));await writeFile(join(dir,'index.html'),videoComposition(j));}
   await update('checking',5);await run(['lint',work],work);
   const output=join(work,'video.mp4');
   await update('rendering',10);
   // Preserve the server's bounded-memory flow: finish browser capture before encoding.
   const frames=join(work,'frames');
   await run(['render',work,'--output',frames,'--format','png-sequence','--workers','1','--low-memory-mode','--no-browser-gpu','--fps','24'],work,{timeoutMs:renderTimeoutMs(j.duration),onProgress:progress=>{if(progress>(j.progress||0)&&Date.now()-lastSaved>2000){lastSaved=Date.now();void update('rendering',progress).catch(()=>{});}}});
   const names=(await readdir(frames)).filter(name=>/^frame_\d{6}\.png$/.test(name)).sort();
   if(names.length!==j.duration*24)throw Error('La captura no contiene todos los fotogramas esperados.');
   for(let i=0;i<names.length;i++)if(names[i]!==('frame_'+String(i+1).padStart(6,'0')+'.png'))throw Error('Secuencia de fotogramas incompleta.');
   await update('encoding',97);
   await run(['-hide_banner','-loglevel','error','-y','-threads','1','-framerate','24','-start_number','1','-i',join(frames,'frame_%06d.png'),'-an','-c:v','libx264','-threads','1','-filter_threads','1','-preset','veryfast','-b:v','1600k','-maxrate','1600k','-bufsize','1600k','-pix_fmt','yuv420p','-movflags','+faststart',output],work,{executable:'/usr/bin/ffmpeg',prefix:[],timeoutMs:120000});
   if((await stat(output)).size>4000000)throw Error('El archivo supera el límite de descarga de esta consola.');
   await writes;await copyFile(output,join(saved,'video.mp4'));j.status='ready';j.completedAt=new Date().toISOString();await update('ready',100);
  }catch(e){console.error('[video-066] '+String(e.message||'Fallo sin diagnóstico').slice(0,1500));await writes.catch(()=>{});j.status='failed';j.stage='failed';j.updatedAt=new Date().toISOString();j.error=e.message?.includes('límite de tiempo')?'El render alcanzó su límite de tiempo. El proyecto editable se conserva; no se publicó nada.':'El servidor no terminó el render. El proyecto editable se conserva; no se publicó nada.';await save(j);}
  finally{if(work)await rm(work,{recursive:true,force:true}).catch(()=>{});busy=false;resources.busy=false;}
 };

 return async(req,res,url)=>{
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'private, no-store'});res.end(JSON.stringify(data));};
  if(!videoAuth(req,process.env.HOUSTON_HOST_TOKEN))return json(401,{error:'Acceso privado requerido.'});
  try{await mkdir(root,{recursive:true});const op=url.searchParams.get('op')||'list';
   if(req.method==='GET'&&op==='list'){const jobs=[];for(const id of (await readdir(root)).filter(validId)){try{const j=await read(id);if(j.status==='rendering'&&!busy){j.status='failed';j.error='El servidor reinició durante el render; crea una nueva versión para reintentarlo.';await save(j);}jobs.push(publicJob(j));}catch{}}return json(200,{engine:'HyperFrames',version:VIDEO_VERSION,workerLimit:1,busy,jobs:jobs.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,20)});}
   if(req.method==='GET'&&op==='file'){const id=url.searchParams.get('id'),j=await read(id);if(j.status!=='ready')return json(409,{error:'El video todavía no está listo.'});const bytes=await readFile(join(root,id,'video.mp4'));res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':bytes.length,'Cache-Control':'private, no-store','Content-Disposition':'inline; filename="llave-066-'+id+'.mp4"'});res.end(bytes);return;}
   if(req.method==='POST'&&op==='render'){let bytes='';for await(const chunk of req){bytes+=chunk;if(bytes.length>6000)return json(413,{error:'Texto demasiado largo.'});}const j=validateVideo(JSON.parse(bytes));try{return json(200,{job:publicJob(await read(j.id)),existing:true});}catch{}if(busy||resources.busy)return json(409,{error:'Hay un video en proceso. Espera su resultado.'});if((await readdir(root)).filter(validId).length>=60)return json(409,{error:'Se alcanzó el límite de proyectos del servidor. Revisa almacenamiento antes de crear más.'});busy=true;resources.busy=true;j.status='rendering';j.createdAt=new Date().toISOString();try{await save(j);}catch(e){busy=false;resources.busy=false;throw e;}void produce(j);return json(202,{job:publicJob(j),published:false});}
   return json(405,{error:'Operación no permitida.'});
  }catch{return json(400,{error:'No se pudo procesar el proyecto de video.'});}
 };
}
