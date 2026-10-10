// Studio 066: explicit-frame, real-time WebM capture in the browser. No remote services.
export const supportedWebMMime=Recorder=>
 ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
 .find(type=>Recorder?.isTypeSupported?.(type))||null;

export async function isWebMData(blob){
 if(!blob||blob.size<4)return false;
 const bytes=new Uint8Array(await blob.slice(0,4).arrayBuffer());
 return bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;
}

export async function exportCanvasWebM({canvas,seconds,fps=24,audioTracks=[],onFrame,bitrate=4000000,onProgress,signal,Recorder=window.MediaRecorder,createStream=window.MediaStream}){
 if(!canvas?.captureStream||!Recorder||!Number.isFinite(seconds)||seconds<=0||seconds>120||![24,30].includes(fps)||typeof onFrame!=='function')throw new Error('Parámetros de exportación no admitidos.');
 if(signal?.aborted)throw new Error('Exportación cancelada.');
 const mime=supportedWebMMime(Recorder);
 if(!mime)throw new Error('Este navegador no admite WebM.');
 const capture=canvas.captureStream(0);
 const video=capture.getVideoTracks()[0];
 if(!video){capture.getTracks().forEach(t=>t.stop());throw new Error('Chrome no creó la pista de video.');}
 if(typeof video.requestFrame!=='function'){capture.getTracks().forEach(t=>t.stop());throw new Error('Este navegador no permite capturar fotogramas de forma fiable.');}
 const tracks=[video,...audioTracks.filter(t=>t&&t.readyState==='live')];
 const stream=new createStream(tracks);
 let recorder,clock=null,started=0,frame=-1,ended=false;
 const parts=[];
 try{
  recorder=new Recorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});
  const finished=new Promise((resolve,reject)=>{
   recorder.ondataavailable=ev=>{if(ev.data?.size)parts.push(ev.data);};
   recorder.onerror=ev=>reject(new Error('El codificador WebM falló: '+(ev.error?.message||'error de Chrome')));
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
  if(!await isWebMData(blob))throw new Error('Chrome devolvió una grabación vacía o con encabezado inválido.');
  return blob;
 }finally{
  ended=true;
  if(clock!==null)cancelAnimationFrame(clock);
  if(recorder?.state==='recording')recorder.stop();
  // Only stop the capture track. The editor retains ownership of the audio graph.
  capture.getTracks().forEach(t=>t.stop());
 }
}
