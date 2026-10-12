import {mkdir,open,readFile,writeFile,rename,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {join} from 'node:path';

export const ORIGINAL_CHUNK=512*1024,ORIGINAL_MAX_BYTES=8*1024*1024*1024;
const hash=value=>/^[a-f0-9]{64}$/.test(value||'');
// Content-addressed original uploads. State records committed bytes; recovery
// truncates an uncommitted append before retrying. Only verified hashes become
// available to the renderer. No caller-provided paths or URLs are opened.
export async function createStudioOriginalStore({root,maxBytes=ORIGINAL_MAX_BYTES}){
 await mkdir(root,{recursive:true,mode:0o700});const locks=new Map();
 const locked=(id,fn)=>{const task=(locks.get(id)||Promise.resolve()).catch(()=>{}).then(fn);locks.set(id,task);return task.finally(()=>{if(locks.get(id)===task)locks.delete(id);});};
 const directory=id=>{if(!hash(id))throw Error('Invalid original hash.');return join(root,id);};
 const save=async state=>{const dir=directory(state.sha256),path=join(dir,`state-${randomUUID()}.tmp`);await writeFile(path,JSON.stringify(state),{mode:0o600});await rename(path,join(dir,'state.json'));};
 const load=async id=>{
  const state=JSON.parse(await readFile(join(directory(id),'state.json'),'utf8'));
  if(state.sha256!==id||!Number.isSafeInteger(state.bytes)||state.bytes<=0||state.bytes>maxBytes||!Number.isSafeInteger(state.received)||state.received<0||state.received>state.bytes||!['uploading','verified'].includes(state.status))throw Error('Invalid original state.');
  return state;
 };
 return {
  async init({sha256,bytes}){
   directory(sha256);if(!Number.isSafeInteger(bytes)||bytes<=0||bytes>maxBytes)throw Error('Original too large.');
   return locked(sha256,async()=>{
    try{const state=await load(sha256);if(state.bytes!==bytes)throw Error('Original size conflicts.');return state;}catch(error){if(error.code!=='ENOENT')throw error;}
    await mkdir(directory(sha256),{recursive:true,mode:0o700});
    const state={sha256,bytes,received:0,status:'uploading'};await save(state);return state;
   });
  },
  async chunk({sha256,offset,data}){
   directory(sha256);if(!Number.isSafeInteger(offset)||offset<0||!Buffer.isBuffer(data)||data.length===0||data.length>ORIGINAL_CHUNK)throw Error('Invalid original chunk.');
   return locked(sha256,async()=>{
    const state=await load(sha256);
    // A successful response can be lost. Accept an exact retry of committed
    // bytes, but never silently accept different bytes at the same offset.
    if(offset<state.received&&offset+data.length<=state.received){
     const file=await open(join(directory(sha256),state.status==='verified'?'original':'upload'),'r');
     try{const previous=Buffer.alloc(data.length);const result=await file.read(previous,0,data.length,offset);if(result.bytesRead!==data.length||!previous.equals(data))throw Error('Original retry conflicts.');return state;}finally{await file.close();}
    }
    if(state.status!=='uploading'||offset!==state.received||data.length!==Math.min(ORIGINAL_CHUNK,state.bytes-offset))throw Error('Original chunk out of order.');
    let file;try{file=await open(join(directory(sha256),'upload'),'r+');}catch(error){if(error.code!=='ENOENT')throw error;file=await open(join(directory(sha256),'upload'),'w+',0o600);}
    try{
     const size=(await file.stat()).size;if(size<state.received)throw Error('Original upload was truncated.');
     await file.truncate(state.received);
     let written=0;while(written<data.length){const result=await file.write(data,written,data.length-written,offset+written);if(!result.bytesWritten)throw Error('Original write failed.');written+=result.bytesWritten;}
     await file.sync();state.received+=data.length;await save(state);return state;
    }finally{await file.close();}
   });
  },
  async verify(sha256){
   return locked(sha256,async()=>{
    const state=await load(sha256);if(state.status==='verified')return state;
    if(state.received!==state.bytes)throw Error('Original upload incomplete.');
    const path=join(directory(sha256),'upload');let digest=createHash('sha256');
    // Stream multi-gigabyte originals; never read them into a single buffer.
    let input=path;try{await stat(path);}catch(error){if(error.code!=='ENOENT')throw error;input=join(directory(sha256),'original');}
    if((await stat(input)).size!==state.bytes)throw Error('Original size mismatch.');
    for await(const chunk of createReadStream(input))digest.update(chunk);
    if(digest.digest('hex')!==sha256)throw Error('Original hash mismatch.');
    if(input===path)await rename(path,join(directory(sha256),'original'));
    state.status='verified';await save(state);return state;
   });
  },
  async resolve(sha256){const state=await load(sha256);if(state.status!=='verified')throw Error('Original not verified.');const path=join(directory(sha256),'original');if((await stat(path)).size!==state.bytes)throw Error('Original size mismatch.');return path;},
  status:load,
 };
}
