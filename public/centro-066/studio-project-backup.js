import {addMedia,readMedia,deleteMedia,parseWorkspace} from './studio-media.js';
const MAGIC='ST066B01',MAX_META=2*1024*1024,MAX_TOTAL=500*1024*1024;
const MIME=/^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|wav|ogg|webm|x-wav))$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const references=s=>[...(s.draft?.refs||[]).map(r=>r.assetId),...s.history.flatMap(r=>[...(r.request.refs||[]).map(x=>x.assetId),...r.results.map(x=>x.assetId)]),...(s.workspace?.clips||[]).filter(c=>c.kind!=='text').map(c=>c.assetId)];
export async function exportProjectBundle(db,snapshot){
 const assets=[],blobs=[];let size=0;
 for(const id of new Set(references(snapshot))){
  const a=await readMedia(db,id);if(!a?.blob||a.trashedAt)throw new Error('Falta un archivo del proyecto. Recupera sus medios antes de respaldar.');
  size+=a.blob.size;if(size>MAX_TOTAL)throw new Error('El respaldo supera 500 MB.');
  assets.push({id:a.id,name:a.name,mime:a.mime,size:a.blob.size,lastModified:a.lastModified});blobs.push(a.blob);
 }
 const meta=new TextEncoder().encode(JSON.stringify({format:MAGIC,snapshot,assets}));
 if(meta.length>MAX_META)throw new Error('El historial supera el límite del respaldo.');
 const header=new Uint8Array(12);header.set(new TextEncoder().encode(MAGIC));new DataView(header.buffer).setUint32(8,meta.length,true);
 return new Blob([header,meta,...blobs],{type:'application/octet-stream'});
}
export async function readProjectBundle(file,validateHistory){
 if(!file||file.size<12||file.size>MAX_TOTAL+MAX_META+12)throw new Error('Respaldo vacío o demasiado grande.');
 const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
 if(new TextDecoder().decode(header.slice(0,8))!==MAGIC)throw new Error('Este archivo no es un respaldo de Estudio 066.');
 const length=new DataView(header.buffer).getUint32(8,true);if(length>MAX_META||12+length>file.size)throw new Error('Cabecera del respaldo inválida.');
 let data;try{data=JSON.parse(await file.slice(12,12+length).text());}catch{throw new Error('Metadatos del respaldo inválidos.');}
 const s=data.snapshot;
 if(data.format!==MAGIC||!s||!s.draft||typeof s.draft!=='object'||Array.isArray(s.draft)||!Array.isArray(s.draft.refs)||s.draft.refs.length>3||!Array.isArray(s.history)||s.history.length>80||!Array.isArray(data.assets)||data.assets.length>1000)throw new Error('Estructura del respaldo inválida.');
 const workspace=s.workspace===null?null:parseWorkspace(s.workspace);if(s.workspace!==null&&!workspace)throw new Error('Timeline del respaldo inválido.');
 const ids=new Set();let cursor=12+length;const files=[];
 for(const a of data.assets){
  if(!a||!uuid.test(a.id)||ids.has(a.id)||typeof a.name!=='string'||a.name.length>180||!MIME.test(a.mime)||!Number.isSafeInteger(a.size)||a.size<1||a.size>150*1024*1024||cursor+a.size>file.size)throw new Error('Archivo del respaldo inválido.');
  ids.add(a.id);files.push({id:a.id,file:new File([file.slice(cursor,cursor+a.size)],a.name,{type:a.mime,lastModified:Number(a.lastModified)||Date.now()})});cursor+=a.size;
 }
 if(cursor!==file.size||references({...s,workspace}).some(id=>!ids.has(id)))throw new Error('El respaldo está incompleto.');
 if(!validateHistory(s.history,data.assets))throw new Error('Historial del respaldo inválido.');
 if(['prompt','negative','continuity','seed','title','model','aspect','resolution','mode'].some(k=>typeof s.draft[k]!=='string')||s.draft.refs.some(r=>!r||typeof r.assetId!=='string'||!['start','end','character','environment','composition','style','wardrobe'].includes(r.role))||typeof s.draft.prompt!=='string'||s.draft.prompt.length>4000||typeof s.draft.title!=='string'||s.draft.title.length>160)throw new Error('Preparación del respaldo inválida.');
 return {snapshot:{...s,workspace},files};
}
export async function importProjectBundle(db,file,validateHistory){
 const {snapshot:s,files}=await readProjectBundle(file,validateHistory),mapping=new Map(),created=[];
 try{
  for(const item of files){const a=await addMedia(db,item.file);mapping.set(item.id,a.id);created.push(a.id);}
  const records=new Map(s.history.map(r=>[r.id,crypto.randomUUID()]));
  const remapRefs=r=>r.map(x=>({...x,assetId:mapping.get(x.assetId)}));
  const history=s.history.map(r=>{const {version,...rest}=r;return {...rest,id:records.get(r.id),request:{...r.request,refs:remapRefs(r.request.refs)},results:r.results.map(x=>({...x,assetId:mapping.get(x.assetId)}))};});
  const workspace=s.workspace?{...s.workspace,clips:s.workspace.clips.map(c=>({...c,...(c.kind==='text'?{}:{assetId:mapping.get(c.assetId)}),...(c.generationId?{generationId:records.get(c.generationId)||c.generationId}:{})}))}:null;
  return {created,snapshot:{draft:{...s.draft,variants:1,refs:remapRefs(s.draft.refs)},history,workspace,selected:records.get(s.selected)||null,activePreview:mapping.get(s.activePreview)||null,mobileView:['history','preview','configure'].includes(s.mobileView)?s.mobileView:'configure'}};
 }catch(error){await discardRestoredAssets(db,created);throw error;}
}
export async function discardRestoredAssets(db,ids){for(const id of ids)await deleteMedia(db,id);}
