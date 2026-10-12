// Estudio 066: metadata validation only. No generation, charges, uploads or public publishing.
export const PROJECT_TYPES=['cine','ads'];
export const ASPECT_RATIOS=['9:16','16:9','1:1','1.91:1'];
export const RESOLUTIONS=['720p','1080p','2k','4k'];
export const DURATIONS=[3,5,8,10,15,20];
export const FRAMERATES=[24,30,60];
export const PROVIDERS=['pendiente','wan','ltx','kling','veo','firefly'];
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const limited=(value,max)=>typeof value==='string'&&value.length<=max;
const trim=(s)=>s.trim();
export function validateStudioProject(body) {
  if(!body||!['create','update'].includes(body.action))return null;
  if(!limited(body.name,160)||!trim(body.name)||!limited(body.description,3000)||!PROJECT_TYPES.includes(body.type))return null;
  if(body.action==='update'&&(!integer(body.id,1,Number.MAX_SAFE_INTEGER)||!integer(body.version,0,Number.MAX_SAFE_INTEGER)))return null;
  return {action:body.action,id:body.id,version:body.version,name:trim(body.name),description:trim(body.description),type:body.type};
}
export function validateStudioShot(body) {
  if(!body||!['create','update'].includes(body.action))return null;
  if(!integer(body.projectId,1,Number.MAX_SAFE_INTEGER)||!limited(body.title,160)||!trim(body.title)||!limited(body.script,4000)||!limited(body.referenceNotes,3000))return null;
  if(!ASPECT_RATIOS.includes(body.aspect)||!RESOLUTIONS.includes(body.resolution)||!DURATIONS.includes(body.duration)||!FRAMERATES.includes(body.fps)||!integer(body.variants,1,4)||!PROVIDERS.includes(body.provider))return null;
  if(body.action==='update'&&(!integer(body.id,1,Number.MAX_SAFE_INTEGER)||!integer(body.version,0,Number.MAX_SAFE_INTEGER)))return null;
  return {action:body.action,projectId:body.projectId,id:body.id,version:body.version,title:trim(body.title),script:trim(body.script),referenceNotes:trim(body.referenceNotes),aspect:body.aspect,resolution:body.resolution,duration:body.duration,fps:body.fps,variants:body.variants,provider:body.provider};
}
