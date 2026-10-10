// Studio 066 remote metadata schema. No provider execution, billing or binary data.
// Results are imported LOCAL browser references, never a claim of AI generation.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const modes=['frames','images'];
const models=['pendiente','kling','veo','firefly','wan','ltx'];
const aspects=['9:16','16:9','1:1','1.91:1'];
const resolutions=['720p','1080p','2k','4k'];
const durations=[3,5,8,10,15,20];
const roles=['start','end','character','environment','composition','style','wardrobe'];
const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const small=(value,max)=>typeof value==='string'&&value.length<=max;
export function validateGenerationMetadata(input){
 if(!input||!['create','update'].includes(input.action)||!integer(input.projectId,1,Number.MAX_SAFE_INTEGER)||typeof input.id!=='string'||!uuid.test(input.id))return null;
 if(input.action==='update'&&!integer(input.version,0,1e8))return null;
 const r=input.request;
 if(!r||typeof r!=='object'||Array.isArray(r)||!modes.includes(r.mode)||!models.includes(r.model)||!aspects.includes(r.aspect)||!resolutions.includes(r.resolution))return null;
 if(!small(r.title,160)||!r.title.trim()||!small(r.prompt,4000)||!r.prompt.trim()||!small(r.negative,2000)||!small(r.continuity,2000))return null;
 if(!durations.includes(r.duration)||![24,30,60].includes(r.fps)||!integer(r.variants,1,4)||typeof r.audio!=='boolean'||typeof r.preserveIdentity!=='boolean'||typeof r.preserveComposition!=='boolean')return null;
 if(!small(r.seed,10)||(r.seed!==''&&(!/^\d+$/.test(r.seed)||Number(r.seed)>4294967295)))return null;
 if(!Array.isArray(r.refs)||r.refs.length<1||r.refs.length>(r.mode==='frames'?2:3))return null;
 const seen=new Set();
 for(let index=0;index<r.refs.length;index++){
  const ref=r.refs[index];
  if(!ref||typeof ref!=='object'||!small(ref.assetId,100)||!uuid.test(ref.assetId)||!roles.includes(ref.role)||seen.has(ref.assetId))return null;
  seen.add(ref.assetId);
  if(r.mode==='frames'&&ref.role!==(index===0?'start':'end'))return null;
  if(r.mode==='images'&&['start','end'].includes(ref.role))return null;
 }
 if(!Array.isArray(input.results)||input.results.length>r.variants)return null;
 const results=[],seenResults=new Set();
 for(const item of input.results){
  if(!item||typeof item!=='object'||!small(item.assetId,100)||!uuid.test(item.assetId)||seenResults.has(item.assetId))return null;
  seenResults.add(item.assetId);
  results.push({assetId:item.assetId,addedAt:small(item.addedAt,40)?item.addedAt:''});
 }
 return {
  action:input.action,id:input.id,projectId:input.projectId,version:input.version,
  request:{
   mode:r.mode,title:r.title.trim(),prompt:r.prompt.trim(),negative:r.negative,continuity:r.continuity,
   model:r.model,aspect:r.aspect,resolution:r.resolution,duration:r.duration,fps:r.fps,variants:r.variants,
   audio:r.audio,seed:r.seed,preserveIdentity:r.preserveIdentity,preserveComposition:r.preserveComposition,
   refs:r.refs.map(x=>({assetId:x.assetId,role:x.role}))
  },results,status:results.length?'imported':'prepared'
 };
}
export const VIDEO_PROVIDER_CAPABILITIES=[
 {id:'kling',name:'Kling',connected:false,validated:false,estimatedCost:null},
 {id:'veo',name:'Veo',connected:false,validated:false,estimatedCost:null},
 {id:'firefly',name:'Adobe Firefly',connected:false,validated:false,estimatedCost:null},
 {id:'wan',name:'Wan',connected:false,validated:false,estimatedCost:null},
 {id:'ltx',name:'LTX',connected:false,validated:false,estimatedCost:null}
];
