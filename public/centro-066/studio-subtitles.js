// Local subtitle interchange. No speech service or provider is called.
const timing=/^((?:\d{2,}:)?\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*((?:\d{2,}:)?\d{2}:\d{2}[,.]\d{1,3})(?:\s+.*)?$/;
function seconds(value){
 const parts=value.replace(',','.').split(':');const sec=Number(parts.pop()),min=Number(parts.pop()),hours=Number(parts.pop()||0);
 if(sec>=60||min>=60)return NaN;return hours*3600+min*60+sec;
}
const cleanText=value=>value.replace(/<\/?(?:b|i|u|c(?:\.[\w-]+)*|v|lang|ruby|rt|font)(?:\s[^>]*)?>/gi,'').replace(/<\d{2}:\d{2}(?::\d{2})?\.\d{3}>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
export function parseSubtitles(input){
 if(typeof input!=='string'||input.length>250000)throw new Error('El archivo de subtítulos es demasiado grande. Máximo 250 KB.');
 const normalized=input.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
 const blocks=normalized.split(/\n[ \t]*\n/),cues=[];
 for(const block of blocks){
  const lines=block.split('\n');
  if(/^WEBVTT(?:\s|$)/.test(lines[0])||/^(NOTE|STYLE|REGION)(?:\s|$)/.test(lines[0]))continue;
  const index=lines.findIndex(line=>line.includes('-->'));
  if(index<0||index>1)throw new Error('Bloque de subtítulos sin un tiempo válido. Usa SRT o WebVTT.');
  const match=lines[index].trim().match(timing);if(!match)throw new Error('Tiempo de subtítulo inválido.');
  const start=seconds(match[1]),end=seconds(match[2]),text=cleanText(lines.slice(index+1).join('\n'));
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>600||end-start<.1||end-start>120)throw new Error('Los subtítulos deben durar entre 0,1 y 120 s y quedar dentro de los 10 minutos del montaje.');
  if(!text||text.length>500)throw new Error('Cada subtítulo debe contener entre 1 y 500 caracteres.');
  cues.push({start:Math.round(start*1000)/1000,duration:Math.round((end-start)*1000)/1000,text});
  if(cues.length>120)throw new Error('Máximo de 120 subtítulos por archivo.');
 }
 if(!cues.length)throw new Error('El archivo no contiene subtítulos.');
 return cues.sort((a,b)=>a.start-b.start);
}
export function addSubtitleCues(workspace,cues,track='V2',idGenerator=()=>crypto.randomUUID()){
 if(!workspace.tracks.includes(track)||!track.startsWith('V'))throw new Error('Elige una pista de video para los subtítulos.');
 if(workspace.clips.length+cues.length>120)throw new Error('Los subtítulos superarían el límite de 120 clips del montaje. Divide el archivo antes de importarlo.');
 if(!cues.length||cues.some(c=>!Number.isFinite(c.start)||!Number.isFinite(c.duration)||c.start<0||c.duration<.1||c.duration>120||c.start+c.duration>600||typeof c.text!=='string'||!c.text.trim()||c.text.length>500))throw new Error('Hay un subtítulo con texto o tiempos inválidos.');
 const clips=cues.map(c=>({...c,id:idGenerator(),assetId:'',kind:'text',textRole:'subtitle',track,sourceStart:0,volume:0,opacity:1,subtitleSize:4.8,subtitleY:88,subtitleBackground:.65}));
 return {...workspace,clips:[...workspace.clips,...clips]};
}
function timestamp(seconds){
 const total=Math.round(seconds*1000),ms=total%1000,s=Math.floor(total/1000)%60,m=Math.floor(total/60000)%60,h=Math.floor(total/3600000);
 return [h,m,s].map(x=>String(x).padStart(2,'0')).join(':')+','+String(ms).padStart(3,'0');
}
export function exportSubtitles(clips){
 const cues=clips.filter(c=>c.kind==='text'&&c.textRole==='subtitle').sort((a,b)=>a.start-b.start);
 if(!cues.length)throw new Error('No hay subtítulos para exportar. Importa un SRT/VTT o agrega un subtítulo.');
 if(cues.some(c=>!String(c.text||'').trim()))throw new Error('Completa el texto de los subtítulos vacíos antes de exportar SRT.');
 return cues.map((c,i)=>`${i+1}\n${timestamp(c.start)} --> ${timestamp(c.start+c.duration)}\n${String(c.text||'').replace(/\r/g,'').trim().replace(/\n\s*\n/g,'\n')}\n`).join('\n');
}
export function wrapSubtitle(ctx,text,width){
 const lines=[];
 for(const paragraph of text.split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/).filter(Boolean)){
   if(ctx.measureText(word).width>width){if(line){lines.push(line);line='';}for(const ch of word){if(line&&ctx.measureText(line+ch).width>width){lines.push(line);line='';}line+=ch;}continue;}
   const next=line?line+' '+word:word;
   if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;
  }
  lines.push(line);
 }
 return lines;
}
export function drawSubtitle(ctx,clip,w,h){
 let size=Math.max(12,Math.round(Math.min(w,h)*(Number(clip.subtitleSize)||4.8)/100)),lines;
 const maxWidth=w*.86,maxHeight=h*.3;
 do{ctx.font='600 '+size+'px Arial, sans-serif';lines=wrapSubtitle(ctx,String(clip.text||'').slice(0,500),maxWidth);if(lines.length*size*1.25<=maxHeight||size<=12)break;size--;}while(size>11);
 const lineHeight=size*1.25,height=lines.length*lineHeight,pad=size*.4;
 const bottom=Math.min(h*.95,Math.max(height+pad,h*(Number(clip.subtitleY)||88)/100)),top=bottom-height;
 const boxWidth=Math.min(w*.94,Math.max(...lines.map(line=>ctx.measureText(line).width),size)+pad*2);
 ctx.shadowBlur=0;ctx.fillStyle='rgba(0,0,0,'+Math.max(0,Math.min(1,Number(clip.subtitleBackground??.65)))+')';ctx.fillRect((w-boxWidth)/2,top-pad,boxWidth,height+pad*2);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=Math.max(2,size/12);ctx.lineJoin='round';
 lines.forEach((line,i)=>{const y=top+lineHeight*(i+.5);ctx.strokeText(line,w/2,y,maxWidth);ctx.fillText(line,w/2,y,maxWidth);});
}
