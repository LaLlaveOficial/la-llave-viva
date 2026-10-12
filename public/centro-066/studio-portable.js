// Estudio 066: portable OFFLINE project backup. No provider calls or automatic uploads.
// The backup contains PRIVATE original files; do not publish or share it publicly.
import {readMedia} from './studio-media.js';
import {parseWorkspace,workspaceKey} from './studio-media.js';
import {parseGenerationHistory} from './studio-generation.js';

export const PORTABLE_SCHEMA='studio066-portable-v1';
export const PORTABLE_MAX_FILES=40;
export const PORTABLE_MAX_TOTAL=48*1024*1024;
export const PORTABLE_MAX_FILE=30*1024*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowed={
 image:/^image\/(png|jpeg|webp)$/,
 video:/^video\/(mp4|webm|quicktime)$/,
 audio:/^audio\/(mpeg|mp4|wav|ogg|webm|x-wav)$/
};
const projectKey=id=>workspaceKey+':'+id;
const genKey=id=>'llave-studio066-generation-v1:'+id;
const get=(storage,key)=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}};
function validId(id){return typeof id==='string'&&uuid.test(id);}
function verifyHeader(asset){
 if(!asset||typeof asset!=='object'||!validId(asset.id)||typeof asset.kind!=='string'||!allowed[asset.kind]?.test(asset.mime))throw new Error('Archivo con identificador o formato inválido.');
 if(typeof asset.name!=='string'||!asset.name||asset.name.length>180||!Number.isSafeInteger(asset.size)||asset.size<1||asset.size>PORTABLE_MAX_FILE)throw new Error('Nombre o tamaño de archivo inválido.');
}
function base64From(bytes){
 let output='';
 for(let offset=0;offset<bytes.length;offset+=0x8000){
  output+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
 }
 return btoa(output);
}
function bytesFrom(base64,size){
 if(typeof base64!=='string'||base64.length!==4*Math.ceil(size/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw new Error('Los datos del archivo no son un Base64 válido.');
 const decoded=atob(base64);
 if(decoded.length!==size)throw new Error('El tamaño del archivo no coincide con el respaldo.');
 const bytes=new Uint8Array(decoded.length);
 for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
 return bytes;
}
export function verifyPortableBackup(value,projectId){
 if(!value||typeof value!=='object'||value.schema!==PORTABLE_SCHEMA||value.projectId!==projectId||!Array.isArray(value.assets)||value.assets.length>PORTABLE_MAX_FILES)throw new Error('Respaldo incompatible o corresponde a otro proyecto.');
 const workspace=parseWorkspace(value.workspace);
 if(!workspace)throw new Error('El timeline del respaldo es inválido.');
 const history=parseGenerationHistory(value.generations?.history);
 if(!Array.isArray(value.generations?.history)||history.length!==value.generations.history.length)throw new Error('Las fichas de generación no son válidas.');
 const draft=value.generations?.draft&&typeof value.generations.draft==='object'&&!Array.isArray(value.generations.draft)?value.generations.draft:null;
 const seen=new Set();let total=0;
 const assets=value.assets.map(x=>{
  verifyHeader(x);
  if(seen.has(x.id))throw new Error('Hay archivos duplicados en el respaldo.');
  seen.add(x.id);
  total+=x.size;
  if(total>PORTABLE_MAX_TOTAL)throw new Error('El respaldo supera el límite de 48 MB de originales.');
  return {...x,blob:new Blob([bytesFrom(x.data,x.size)],{type:x.mime})};
 });
 const referenced=new Set(workspace.clips.filter(x=>x.kind!=='text').map(x=>x.assetId));
 for(const record of history){
  for(const r of record.request?.refs||[])referenced.add(r.assetId);
  for(const r of record.results||[])referenced.add(r.assetId);
 }
 for(const r of draft?.refs||[])if(r?.assetId)referenced.add(r.assetId);
 for(const id of referenced)if(!seen.has(id))throw new Error('Falta un archivo referenciado en el respaldo: '+String(id).slice(0,8));
 return {workspace,history,draft,assets};
}
export async function exportPortableBackup(db,storage,projectId,projectName){
 if(!Number.isSafeInteger(projectId)||projectId<1)throw new Error('Selecciona un proyecto para generar su respaldo.');
 const workspace=parseWorkspace(get(storage,projectKey(projectId)));
 if(!workspace)throw new Error('No se pudo leer el montaje; abre primero la pestaña Montaje y efectos.');
 const stored=get(storage,genKey(projectId))||{};
 const history=parseGenerationHistory(stored.history);
 const draft=stored.draft&&typeof stored.draft==='object'&&!Array.isArray(stored.draft)?stored.draft:null;
 const refs=new Set(workspace.clips.filter(c=>c.kind!=='text').map(c=>c.assetId));
 for(const record of history){
  for(const ref of record.request?.refs||[])refs.add(ref.assetId);
  for(const result of record.results||[])refs.add(result.assetId);
 }
 for(const ref of draft?.refs||[])if(ref?.assetId)refs.add(ref.assetId);
 if(refs.size>PORTABLE_MAX_FILES)throw new Error('Máximo 40 archivos por respaldo. Divide el proyecto.');
 let total=0;
 const assets=[];
 for(const id of refs){
  const x=await readMedia(db,id);
  if(!x||!x.blob)throw new Error('No se encuentra un archivo original en este navegador: '+String(id).slice(0,8));
  verifyHeader(x);
  total+=x.size;
  if(total>PORTABLE_MAX_TOTAL)throw new Error('El montaje supera 48 MB de archivos. Espera la biblioteca remota para respaldos grandes.');
  const bytes=new Uint8Array(await x.blob.arrayBuffer());
  if(bytes.length!==x.size)throw new Error('Los bytes del archivo no corresponden al catálogo.');
  assets.push({id:x.id,name:x.name,kind:x.kind,mime:x.mime,size:x.size,lastModified:Number(x.lastModified)||0,addedAt:x.addedAt||'',data:base64From(bytes)});
 }
 return {schema:PORTABLE_SCHEMA,projectId,projectName:String(projectName||'').slice(0,160),exportedAt:new Date().toISOString(),workspace,generations:{history,draft},assets};
}
export async function importPortableBackup(db,storage,value,projectId,readMediaFn=readMedia){
 const parsed=verifyPortableBackup(value,projectId);
 let added=0;
 for(const asset of parsed.assets){
  const existing=await readMediaFn(db,asset.id);
  if(existing)continue; // never overwrite previously imported original bytes
  const item={id:asset.id,name:asset.name,kind:asset.kind,mime:asset.mime,size:asset.size,blob:asset.blob,lastModified:Number(asset.lastModified)||0,addedAt:asset.addedAt||new Date().toISOString()};
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('assets','readwrite');
   tx.objectStore('assets').put(item);
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('No se pudo restaurar un original.'));
  });
  added++;
 }
 storage.setItem(projectKey(projectId),JSON.stringify(parsed.workspace));
 storage.setItem(genKey(projectId),JSON.stringify({draft:parsed.draft,history:parsed.history}));
 return {added,total:parsed.assets.length,clips:parsed.workspace.clips.length,requests:parsed.history.length};
}
