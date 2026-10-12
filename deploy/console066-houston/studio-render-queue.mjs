import {mkdir,readFile,writeFile,rename,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

export const LONG_RENDER_SECONDS=3*60*60;
const SEGMENT_SECONDS=30;
const validId=id=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id||'');
const clone=value=>structuredClone(value);

// One queue instance owns one persistent directory. Keep it on Houston's volume,
// never /tmp. Renderer callbacks must atomically publish segment artifacts before
// resolving; a crash can repeat the current segment, but not completed segments.
export async function createStudioRenderQueue({root,renderSegment,assemble,resources={busy:false},maxJobs=8,clock=Date.now}){
 if(!root||typeof renderSegment!=='function'||typeof assemble!=='function')throw Error('Render queue configuration required.');
 await mkdir(root,{recursive:true,mode:0o700});
 const jobs=new Map(),controllers=new Map();let draining=false,closed=false;
 // Serialize metadata mutations, including cancellation during active rendering.
 let writes=Promise.resolve();
 const transaction=fn=>{const result=writes.then(fn);writes=result.catch(()=>{});return result;};
 const persist=async job=>{
  job.updatedAt=clock();const dir=join(root,job.id);await mkdir(dir,{recursive:true,mode:0o700});
  const temporary=join(dir,`state-${randomUUID()}.tmp`);
  await writeFile(temporary,JSON.stringify(job),{mode:0o600});await rename(temporary,join(dir,'state.json'));
 };
 for(const id of await readdir(root)){
  if(!validId(id))continue;
  const job=JSON.parse(await readFile(join(root,id,'state.json'),'utf8'));
  if(job.version!==1||job.id!==id||!Number.isFinite(job.seconds)||job.seconds<=0||job.seconds>LONG_RENDER_SECONDS||!Array.isArray(job.completed)||job.completed.some((n,i)=>n!==i)||job.completed.length>Math.ceil(job.seconds/SEGMENT_SECONDS)||!['queued','rendering','assembling','ready','failed','cancelled'].includes(job.status))throw Error(`Invalid persisted render: ${id}`);
  if(['rendering','assembling'].includes(job.status)){job.status='queued';await persist(job);}
  jobs.set(id,job);
 }
 const snapshot=job=>job?clone(job):null;
 const update=async(id,fn)=>transaction(async()=>{const job=jobs.get(id);fn(job);await persist(job);return snapshot(job);});
 const cancelled=job=>closed||job.status==='cancelled';
 const drain=async()=>{
  if(draining||closed||resources.busy)return;
  draining=true;resources.busy=true;
  try{
   while(!closed){
    const job=[...jobs.values()].filter(j=>j.status==='queued').sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id))[0];if(!job)break;
    const controller=new AbortController();controllers.set(job.id,controller);
    try{
     await update(job.id,j=>{if(j.status!=='cancelled')j.status='rendering';});
     for(let index=job.completed.length;index<Math.ceil(job.seconds/SEGMENT_SECONDS)&&!cancelled(job);index++){
      const start=index*SEGMENT_SECONDS,seconds=Math.min(SEGMENT_SECONDS,job.seconds-start);
      await renderSegment({job:snapshot(job),directory:join(root,job.id),index,start,seconds,signal:controller.signal});
      if(cancelled(job))break;
      await update(job.id,j=>{if(j.status!=='cancelled')j.completed.push(index);});
     }
     if(cancelled(job))continue;
     await update(job.id,j=>{if(j.status!=='cancelled')j.status='assembling';});
     if(cancelled(job))continue;
     const output=await assemble({job:snapshot(job),directory:join(root,job.id),signal:controller.signal});
     if(!cancelled(job))await update(job.id,j=>{if(j.status!=='cancelled'){j.status='ready';j.output=output;}});
    }catch(error){
     if(!cancelled(job))await update(job.id,j=>{if(j.status!=='cancelled'){j.status='failed';j.error=String(error.message||error).slice(0,500);}});
    }finally{controllers.delete(job.id);}
   }
  }finally{draining=false;resources.busy=false;}
 };
 return {
  async enqueue({id=randomUUID(),seconds,manifest}){
   if(closed)throw Error('Queue closed.');
   if(!validId(id)||!Number.isFinite(seconds)||seconds<=0||seconds>LONG_RENDER_SECONDS||!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw Error('Invalid long render.');
   const serialized=JSON.stringify(manifest);if(Buffer.byteLength(serialized)>2*1024*1024)throw Error('Manifest too large.');
   return transaction(async()=>{
    if(jobs.has(id)){const existing=jobs.get(id);if(existing.seconds!==seconds||JSON.stringify(existing.manifest)!==serialized)throw Error('Render identifier already used.');return snapshot(existing);}
    if([...jobs.values()].filter(j=>!['ready','cancelled','failed'].includes(j.status)).length>=maxJobs)throw Error('Render queue full.');
    const job={version:1,id,seconds,manifest:JSON.parse(serialized),status:'queued',completed:[],createdAt:clock(),updatedAt:clock(),error:null};
    await persist(job);jobs.set(id,job);return snapshot(job);
   });
  },
  get:id=>snapshot(jobs.get(id)),
  list:()=>[...jobs.values()].map(snapshot),
  drain,
  async cancel(id){
   if(!jobs.has(id))throw Error('Render not found.');
   const result=await update(id,j=>{if(!['ready','failed'].includes(j.status))j.status='cancelled';});controllers.get(id)?.abort();return result;
  },
  async retry(id){
   if(closed)throw Error('Queue closed.');
   if(!jobs.has(id))throw Error('Render not found.');
   return update(id,j=>{if(j.status!=='failed')throw Error('Only failed renders can retry.');j.status='queued';j.error=null;});
  },
  async remove(id){
   if(!jobs.has(id))return;
   return transaction(async()=>{const job=jobs.get(id);if(!['ready','failed','cancelled'].includes(job.status)||controllers.has(id))throw Error('Render still active.');await rm(join(root,id),{recursive:true,force:true});jobs.delete(id);});
  },
  async close(){closed=true;for(const controller of controllers.values())controller.abort();await writes;},
 };
}
