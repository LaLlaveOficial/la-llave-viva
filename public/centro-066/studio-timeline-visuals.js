// Actual signal rendering for Studio 066. No synthetic/fake waveforms.
export function extractPeaks(samples,buckets=64){
 if(!(samples instanceof Float32Array)||!Number.isSafeInteger(buckets)||buckets<2||buckets>512)throw new TypeError('Invalid waveform input');
 const out=new Float32Array(buckets);
 if(!samples.length)return out;
 for(let i=0;i<buckets;i++){
  const first=Math.floor(i*samples.length/buckets),end=Math.max(first+1,Math.floor((i+1)*samples.length/buckets));
  let max=0;
  for(let j=first;j<Math.min(end,samples.length);j++)max=Math.max(max,Math.abs(samples[j]||0));
  out[i]=Math.min(1,max);
 }
 return out;
}
export function timelineSpan(clips,minimum=24){
 let end=0;
 for(const clip of clips||[])end=Math.max(end,Number(clip.start||0)+Number(clip.duration||0));
 return Math.max(minimum,Math.ceil(end+2));
}
export function mediaTimecode(seconds,fps=24){
 const safe=Math.max(0,Number.isFinite(seconds)?seconds:0);
 const frame=Math.floor(safe*fps+1e-8);
 const f=frame%fps,s=Math.floor(frame/fps)%60,m=Math.floor(frame/(fps*60))%60,h=Math.floor(frame/(fps*3600));
 return [h,m,s,f].map(x=>String(x).padStart(2,'0')).join(':');
}
export function trackIsEditable(state,track){return !Boolean(state?.[track]?.locked);}
export function trackIsAudible(state,track){return !Boolean(state?.[track]?.muted);}
export function trackIsVisible(state,track){return !Boolean(state?.[track]?.hidden);}
