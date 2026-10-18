import {parseWorkspace} from './studio-media.js';
import {newGenerationDraft,parseGenerationHistory,validateGeneration} from './studio-generation.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function projectAssetIds(value){
 return [...new Set([...(value.workspace?.clips||[]).filter(c=>c.kind!=='text').map(c=>c.assetId),...(value.generation?.draft?.refs||[]).map(x=>x.assetId),...(value.generation?.history||[]).flatMap(r=>[...(r.request?.refs||[]).map(x=>x.assetId),...(r.results||[]).map(x=>x.assetId)])])];
}
export function normalizeProjectState(value){
 if(!value||typeof value!=='object'||JSON.stringify(value).length>220000)return null;
 const workspace=parseWorkspace(value.workspace);if(!workspace)return null;
 let generation=null;
 if(value.generation!==null&&value.generation!==undefined){
  const g=value.generation;if(!g||typeof g!=='object'||!Array.isArray(g.history)||g.history.length>80)return null;
  const history=parseGenerationHistory(g.history);if(history.length!==g.history.length)return null;
  for(const record of history){
   if(!Array.isArray(record.request.refs)||record.results.length!==g.history.find(r=>r.id===record.id)?.results.length)return null;
   const check=validateGeneration(record.request,record.request.refs.map(r=>({id:r?.assetId,kind:'image'})));
   if(!check.value)return null;record.request=check.value;
  }
  const draft={...newGenerationDraft()};
  if(!g.draft||typeof g.draft!=='object'||!Array.isArray(g.draft.refs)||g.draft.refs.length>3)return null;
  for(const key of Object.keys(draft)){
   if(key==='refs')continue;
   if(g.draft[key]!==undefined){if(typeof g.draft[key]!==typeof draft[key]||typeof g.draft[key]==='string'&&g.draft[key].length>4000)return null;draft[key]=g.draft[key];}
  }
  if(g.draft.refs.some(r=>!r||!uuid.test(r.assetId)||!['start','end','character','environment','composition','style','wardrobe'].includes(r.role)))return null;
  draft.refs=g.draft.refs.map(r=>({assetId:r.assetId,role:r.role}));draft.variants=1;
  generation={draft,history,selected:uuid.test(g.selected)?g.selected:null,activePreview:uuid.test(g.activePreview)?g.activePreview:null,mobileView:['history','preview','configure'].includes(g.mobileView)?g.mobileView:'configure'};
 }
 const normalized={workspace,generation},ids=projectAssetIds(normalized);
 if(ids.length>80||ids.some(id=>!uuid.test(id)))return null;
 return normalized;
}
