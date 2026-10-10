// Studio 066: explicit-frame real-time capture. MP4 is available ONLY when browser
// really advertises support for H.264(+AAC), not by renaming WebM.
const webmVideo=[
 'video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus',
 'video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'
];
const webmSilent=[
 'video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm',
 'video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus'
];
const mp4Audio=[
 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
 'video/mp4;codecs="avc1.4D401F,mp4a.40.2"'
];
const mp4Silent=[
 'video/mp4;codecs="avc1.42E01E"','video/mp4;codecs="avc1.4D401F"',
 'video/mp4;codecs=h264','video/mp4'
];
export const supportedWebMMime=Recorder=>(webmVideo.find(type=>Recorder?.isTypeSupported?.(type))||null);
export function supportedRecordingMime(Recorder,format='webm',{audio=false}={}){
 if(!['webm','mp4'].includes(format))return null;
 const list=format==='mp4'?(audio?mp4Audio:mp4Silent):(audio?webmVideo:webmSilent);
 return list.find(type=>Recorder?.isTypeSupported?.(type))||null;
}
export function exportFormatCapabilities(Recorder){
 return {webm:!!supportedRecordingMime(Recorder,'webm',{audio:false}),mp4:!!supportedRecordingMime(Recorder,'mp4',{audio:false})};
}
export async function isWebMData(blob){
 if(!blob||blob.size<4)return false;
 const bytes=new Uint8Array(await blob.slice(0,4).arrayBuffer());
 return bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;
}
export async function isMP4Data(blob){
 if(!blob||blob.size<12)return false;
 const bytes=new Uint8Array(await blob.slice(0,12).arrayBuffer());
 const size=(bytes[0]*16777216+bytes[1]*65536+bytes[2]*256+bytes[3]);
 return size>=8&&bytes[4]===0x66&&bytes[5]===0x74&&bytes[6]===0x79&&bytes[7]===0x70;
}
export function recordingBitrate(resolution='720p',preset='high'){
 const matrix={
  '720p':{standard:3000000,high:6000000,master:10000000},
  '1080p':{standard:6000000,high:12000000,master:20000000}
 };
 if(!matrix[resolution]||!matrix[resolution][preset])throw new Error('Perfil de calidad inválido.');
 return matrix[resolution][preset];
}
export async function exportCanvasRecording({
 canvas,seconds,fps=24,format='webm',audioTracks=[],onFrame,
 bitrate=6000000,onProgress,signal,
 Recorder=window.MediaRecorder,createStream=window.MediaStream
}){
 if(!canvas?.captureStream||!Recorder||!Number.isFinite(seconds)||seconds<=0||seconds>120||![24,30].includes(fps)||typeof onFrame!=='function')throw new Error('Parámetros de exportación no admitidos.');
 if(!['webm','mp4'].includes(format))throw new Error('Formato no permitido.');
 if(signal?.aborted)throw new Error('Exportación cancelada.');
 const liveAudio=audioTracks.filter(t=>t&&t.readyState==='live');
 const mime=supportedRecordingMime(Recorder,format,{audio:liveAudio.length>0});
 if(!mime)throw new Error(format==='mp4'
  ?'Tu navegador no admite codificar MP4 H.264'+(liveAudio.length?' con AAC':'')+'. Utiliza WebM o espera el render remoto.'
  :'Tu navegador no admite codificar WebM con esta configuración.');
 const capture=canvas.captureStream(0);
 const video=capture.getVideoTracks()[0];
 if(!video){capture.getTracks().forEach(t=>t.stop());throw new Error('El navegador no creó la pista de video.');}
 if(typeof video.requestFrame!=='function'){capture.getTracks().forEach(t=>t.stop());throw new Error('El navegador no permite capturar fotogramas de forma fiable.');}
 const tracks=[video,...liveAudio],stream=new createStream(tracks);
 let recorder,clock=null,started=0,frame=-1,ended=false;
 const parts=[];
 try{
  recorder=new Recorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});
  const finished=new Promise((resolve,reject)=>{
   recorder.ondataavailable=ev=>{if(ev.data?.size)parts.push(ev.data);};
   recorder.onerror=ev=>reject(new Error('El codificador falló: '+(ev.error?.message||'error del navegador')));
   recorder.onstop=resolve;
  });
  await onFrame(0);
  recorder.start(250);
  started=performance.now();
  await new Promise((resolve,reject)=>{
   let busy=false;
   const loop=async now=>{
    if(ended)return;
    if(signal?.aborted){ended=true;reject(new Error('Exportación cancelada.'));return;}
    const elapsed=Math.min(seconds,Math.max(0,(now-started)/1000));
    const next=Math.min(Math.floor(elapsed*fps),Math.ceil(seconds*fps)-1);
    if(!busy&&next>frame){
     busy=true;
     try{
      await onFrame(Math.min(elapsed,seconds-1/(fps*4)));
      video.requestFrame();
      frame=next;
      onProgress?.(elapsed/seconds);
     }catch(error){ended=true;reject(error);return;}
     finally{busy=false;}
    }
    if(elapsed>=seconds){ended=true;resolve();return;}
    clock=requestAnimationFrame(loop);
   };
   clock=requestAnimationFrame(loop);
  });
  if(signal?.aborted)throw new Error('Exportación cancelada.');
  await new Promise(resolve=>setTimeout(resolve,120));
  if(signal?.aborted)throw new Error('Exportación cancelada.');
  if(recorder.state==='recording'){
   recorder.requestData?.();
   recorder.stop();
  }
  await finished;
  const blob=new Blob(parts,{type:mime});
  if(!(format==='mp4'?await isMP4Data(blob):await isWebMData(blob)))
   throw new Error('El navegador devolvió una grabación vacía o con contenedor inválido; no se descargó un archivo falso.');
  return {blob,format,mime};
 }finally{
  ended=true;
  if(clock!==null)cancelAnimationFrame(clock);
  if(recorder?.state==='recording')recorder.stop();
  capture.getTracks().forEach(t=>t.stop());
 }
}
// Existing callers retain the original WebM blob-only contract.
export async function exportCanvasWebM(options){
 const result=await exportCanvasRecording({...options,format:'webm'});
 return result.blob;
}
