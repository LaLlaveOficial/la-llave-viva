// Per-property linear animation in clip-local seconds. Original media is untouched.
export const animationRanges={x:[-1,1,0],y:[-1,1,0],scale:[.25,4,1],opacity:[0,1,1],volume:[0,2,1]};
export const animationProperties=kind=>kind==='audio'?['volume']:['text','image'].includes(kind)?['x','y','scale','opacity']:kind==='video'?Object.keys(animationRanges):[];
export function normalizeKeyframes(value,kind,duration){
 if(value===undefined)return {};
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const result={},allowed=animationProperties(kind);
 for(const [key,nodes] of Object.entries(value)){
  if(!allowed.includes(key)||!Array.isArray(nodes)||nodes.length>32)return null;
  const [lo,hi]=animationRanges[key];const sorted=[];
  for(const node of nodes){if(!node||!Number.isFinite(node.time)||node.time<0||node.time>duration+.000001||!Number.isFinite(node.value)||node.value<lo||node.value>hi)return null;sorted.push({time:Math.min(duration,node.time),value:node.value});}
  sorted.sort((a,b)=>a.time-b.time);
  if(sorted.some((node,i)=>i&&Math.abs(node.time-sorted[i-1].time)<.000001))return null;
  if(sorted.length)result[key]=sorted;
 }
 return result;
}
export function animationValue(clip,key,localTime){
 const nodes=clip.keyframes?.[key];
 const [lo,hi,fallback]=animationRanges[key];
 if(!nodes?.length){const value=Number(clip[key]??fallback);return Number.isFinite(value)?Math.max(lo,Math.min(hi,value)):fallback;}
 if(localTime<=nodes[0].time)return nodes[0].value;
 for(let i=1;i<nodes.length;i++)if(localTime<=nodes[i].time){const a=nodes[i-1],b=nodes[i],p=(localTime-a.time)/(b.time-a.time);return a.value+(b.value-a.value)*p;}
 return nodes.at(-1).value;
}
export function sampleAnimation(clip,sequenceTime){
 return Object.fromEntries(animationProperties(clip.kind).map(key=>[key,animationValue(clip,key,sequenceTime-clip.start)]));
}
export function putKeyframe(clip,key,time,value,fps=24){
 if(!animationProperties(clip.kind).includes(key)||!Number.isFinite(time)||time<0||time>clip.duration+.000001)throw new Error('Coloca el cabezal dentro del clip para crear un keyframe.');
 const [lo,hi]=animationRanges[key];if(!Number.isFinite(value)||value<lo||value>hi)throw new Error('Valor de keyframe inválido.');
 const at=Math.min(clip.duration,Math.max(0,Math.round(time*fps)/fps)),nodes=(clip.keyframes?.[key]||[]).filter(node=>Math.abs(node.time-at)>.000001);
 if(nodes.length>=32)throw new Error('Máximo de 32 keyframes por propiedad.');
 return {...clip.keyframes,[key]:[...nodes,{time:at,value}].sort((a,b)=>a.time-b.time)};
}
export function animationTimes(clip){return [...new Set(Object.values(clip.keyframes||{}).flat().map(node=>node.time))].sort((a,b)=>a-b);}
export function removeKeyframe(clip,time,fps=24){
 if(!Number.isFinite(time)||time<0||time>clip.duration+.000001)throw new Error('Coloca el cabezal dentro del clip para quitar su keyframe.');
 const at=Math.min(clip.duration,Math.max(0,Math.round(time*fps)/fps));
 return Object.fromEntries(Object.entries(clip.keyframes||{}).map(([key,nodes])=>[key,nodes.filter(node=>Math.abs(node.time-at)>.000001)]).filter(([,nodes])=>nodes.length));
}
export function sliceAnimation(clip,offset,duration){
 const result={};
 for(const [key,nodes] of Object.entries(clip.keyframes||{})){
  if(!nodes.length)continue;
  const end=offset+duration,kept=nodes.filter(node=>node.time>=offset&&node.time<=end).map(node=>({time:node.time-offset,value:node.value}));
  if(!kept.length)kept.push({time:0,value:animationValue(clip,key,offset)});
  else if(nodes[0].time<offset&&kept[0].time>0)kept.unshift({time:0,value:animationValue(clip,key,offset)});
  if(nodes.at(-1).time>end&&kept.at(-1).time<duration)kept.push({time:duration,value:animationValue(clip,key,end)});
  result[key]=kept;
 }
 return result;
}
