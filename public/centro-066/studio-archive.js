// Native project bundles share one format between Generación IA and Montaje.
// Local files only; no provider calls, cloud uploads or original overwrites.
import {workspaceKey,parseWorkspace} from './studio-media.js';
import {newGenerationDraft,parseGenerationHistory,validateGeneration} from './studio-generation.js';
import {exportProjectBundle,importProjectBundle,discardRestoredAssets} from './studio-project-backup.js';
import {importPortableBackup} from './studio-portable.js';
const keys=id=>{
 if(!Number.isSafeInteger(id)||id<1)throw Error('Selecciona un proyecto.');
 return {track:workspaceKey+':'+id,generation:'llave-studio066-generation-v1:'+id};
};
const read=(storage,key)=>{const value=storage.getItem(key);return value===null?null:JSON.parse(value);};
const validate=(history,entries)=>parseGenerationHistory(history).length===history.length&&history.every(r=>validateGeneration(r.request,entries.map(a=>({...a,kind:a.mime.split('/')[0]}))).value);
export async function exportStudioArchive(db,storage,id){
 const key=keys(id),workspace=parseWorkspace(read(storage,key.track));
 if(!workspace)throw Error('Guarda el montaje antes de respaldarlo.');
 const generation=read(storage,key.generation)||{};
 return exportProjectBundle(db,{...generation,draft:generation.draft||newGenerationDraft(),history:generation.history||[],workspace,selected:generation.selected||null,activePreview:generation.activePreview||null,mobileView:generation.mobileView||'configure'});
}
export async function restoreStudioArchive(db,storage,file,id){
 const key=keys(id);
 const magic=new TextDecoder().decode(await file.slice(0,8).arrayBuffer());
 if(magic!=='ST066B01'){
  if(file.size>70*1024*1024)throw Error('El respaldo JSON supera 70 MB. Para proyectos grandes usa .studio066.');
  return importPortableBackup(db,storage,JSON.parse(await file.text()),id);
 }
 const previous={track:storage.getItem(key.track),generation:storage.getItem(key.generation)};
 let imported=null;
 try{
  imported=await importProjectBundle(db,file,validate);
  if(!imported.snapshot.workspace)throw Error('El respaldo no contiene un timeline.');
  storage.setItem(key.generation,JSON.stringify(imported.snapshot));
  storage.setItem(key.track,JSON.stringify(imported.snapshot.workspace));
  return {added:imported.created.length,total:imported.created.length,clips:imported.snapshot.workspace.clips.length,requests:imported.snapshot.history.length};
 }catch(error){
  if(imported){
   for(const field of ['generation','track']){
    try{previous[field]===null?storage.removeItem(key[field]):storage.setItem(key[field],previous[field]);}catch{}
   }
   await discardRestoredAssets(db,imported.created);
  }
  throw error;
 }
}
