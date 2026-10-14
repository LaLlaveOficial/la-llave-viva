import {animationValue,putKeyframe} from './studio-keyframes.js';
export function volumeEnvelopeView(clip){
 if(!['audio','video'].includes(clip.kind))return '';
 const nodes=clip.keyframes?.volume||[],points=[{time:0,value:animationValue(clip,'volume',0)},...nodes,{time:clip.duration,value:animationValue(clip,'volume',clip.duration)}];
 const x=time=>10+time/clip.duration*980,y=value=>110-value*50;
 return '<div class="wb-volume-envelope"><b>Curva de volumen</b><p class="studio-help">Haz clic para añadir un punto. Arrástralo para cambiar tiempo y volumen. Flechas para ajustar; Supr para quitar el punto.</p><svg data-volume-envelope viewBox="0 0 1000 120" preserveAspectRatio="none" aria-label="Curva de volumen del clip"><path class="wb-volume-unity" d="M10 60H990"/><polyline class="wb-volume-line" points="'+points.map(n=>x(n.time)+','+y(n.value)).join(' ')+'"/>'+nodes.map((n,i)=>'<ellipse data-volume-node="'+i+'" cx="'+x(n.time)+'" cy="'+y(n.value)+'" rx="20" ry="6" tabindex="0" role="slider" aria-label="Punto de volumen '+(i+1)+' a '+n.time.toFixed(2)+' segundos" aria-valuemin="0" aria-valuemax="200" aria-valuenow="'+Math.round(n.value*100)+'" aria-valuetext="'+Math.round(n.value*100)+' por ciento"><title>'+n.time.toFixed(2)+' s · '+Math.round(n.value*100)+'%</title></ellipse>').join('')+'</svg><small>Arriba: 200% · Centro: 100% · Abajo: silencio</small></div>';
}
export function volumePointerPoint(clip,rect,clientX,clientY,fps){
 if(rect.width<=0||rect.height<=0)throw Error('Curva de volumen no disponible.');
 const time=Math.min(clip.duration,Math.max(0,((clientX-rect.left)/rect.width*1000-10)/980*clip.duration));
 return {time:Math.min(clip.duration,Math.round(time*fps)/fps),value:Math.round(Math.min(2,Math.max(0,(110-(clientY-rect.top)/rect.height*120)/50))*100)/100};
}
export function moveVolumePoint(clip,index,point,fps){
 const nodes=clip.keyframes?.volume||[];if(!nodes[index])throw Error('Punto de volumen ausente.');
 const others=nodes.filter((_,i)=>i!==index);
 if(others.some(n=>Math.abs(n.time-point.time)<.000001))throw Error('Ya existe un punto en ese fotograma.');
 return putKeyframe({...clip,keyframes:{...clip.keyframes,volume:others}},'volume',point.time,point.value,fps);
}
