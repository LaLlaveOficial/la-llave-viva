// Experimental Wan adapter. Credentials exist only in this instance's memory.
export const WAN_SPACE='https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space';
const HUB='https://huggingface.co';
const MAX_VIDEO=150*1024*1024;
export class WanFreeClient {
 #token=''; #fetch;
 constructor(fetcher=globalThis.fetch){this.#fetch=fetcher.bind(globalThis);}
 get connected(){return Boolean(this.#token);}
 disconnect(){this.#token='';}
 async #request(url,options={},token=this.#token){
  const origin=new URL(url).origin;
  if(![HUB,WAN_SPACE].includes(origin))throw new Error('Destino no autorizado.');
  const response=await this.#fetch(url,{...options,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',headers:{...options.headers,...(token?{Authorization:'Bearer '+token}:{})}});
  if(!response.ok)throw new Error(response.status===401?'Token no válido.':response.status===403?'Hugging Face rechazó el acceso.':'El proveedor no respondió correctamente (HTTP '+response.status+').');
  return response;
 }
 async connect(value,signal){
  this.disconnect();
  const token=String(value||'').trim();
  if(!/^hf_[A-Za-z0-9]{20,200}$/.test(token))throw new Error('Introduce un token de acceso de Hugging Face, no la contraseña.');
  const account=await (await this.#request(HUB+'/api/whoami-v2',{signal},token)).json();
  // This experiment deliberately excludes accounts that could consume paid quota.
  if(account.type!=='user'||account.isPro!==false||!Array.isArray(account.orgs)||account.orgs.length)
   throw new Error('Este modo admite una cuenta personal gratuita sin organizaciones. No habilita saldo ni cuotas pagadas.');
  if(signal?.aborted)throw new DOMException('Conexión detenida.','AbortError');
  this.#token=token;
  return {name:String(account.name||'Cuenta gratuita').slice(0,100)};
 }
 async generate({image,prompt,negative='',duration=3,seed=42},signal,onStatus=()=>{}){
  if(!this.connected)throw new Error('Conecta primero tu cuenta gratuita.');
  if(!image||!/^image\/(png|jpeg|webp)$/.test(image.type)||image.size<1||image.size>8*1024*1024)throw new Error('Usa una imagen PNG, JPEG o WebP de hasta 8 MB.');
  if(!String(prompt).trim()||String(prompt).length>4000||String(negative).length>2000||![3,5].includes(duration)||!Number.isSafeInteger(seed)||seed<0||seed>2147483647)throw new Error('Revisa el prompt y los parámetros de la prueba.');
  const token=this.#token; // A request cannot silently adopt a different account.
  onStatus('Enviando referencia a Hugging Face…');
  const form=new FormData();form.append('files',image,image.name||'reference.jpg');
  const uploaded=await (await this.#request(WAN_SPACE+'/gradio_api/upload',{method:'POST',body:form,signal},token)).json();
  if(!Array.isArray(uploaded)||uploaded.length!==1||typeof uploaded[0]!=='string'||!uploaded[0].startsWith('/tmp/'))throw new Error('No se recibió la referencia subida.');
  const config=await (await this.#request(WAN_SPACE+'/config',{signal},token)).json();
  const fn=config.dependencies?.find(d=>d.api_name==='generate_video');
  if(!Number.isSafeInteger(fn?.id))throw new Error('La API de Wan cambió. La prueba necesita revisión.');
  const session=crypto.randomUUID();
  const data=[{path:uploaded[0],meta:{_type:'gradio.FileData'}},prompt,4,negative,duration,1,1,seed,false];
  await this.#request(WAN_SPACE+'/gradio_api/queue/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fn_index:fn.id,session_hash:session,data}),signal},token);
  const events=await this.#request(WAN_SPACE+'/gradio_api/queue/data?session_hash='+encodeURIComponent(session),{signal},token);
  if(!events.body)throw new Error('El proveedor no abrió la cola de generación.');
  const reader=events.body.getReader(),decoder=new TextDecoder();let pending='',result;
  try {
   while(!result){
    const chunk=await reader.read();if(chunk.done)break;
    pending+=decoder.decode(chunk.value,{stream:true});
    if(pending.length>1024*1024)throw new Error('Respuesta de cola demasiado grande.');
    let end;
    while((end=pending.indexOf('\n'))>=0){
     const line=pending.slice(0,end).trim();pending=pending.slice(end+1);
     if(!line.startsWith('data:'))continue;
     const event=JSON.parse(line.slice(5));
     if(event.msg==='estimation')onStatus('Esperando GPU gratuita · '+(Number.isSafeInteger(event.rank)?'posición '+(event.rank+1):'en cola'));
     if(event.msg==='process_starts')onStatus('Generando el clip en la GPU remota…');
     if(event.msg==='process_completed'){
      if(!event.success){
       const error=String(event.output?.error||'');
       throw new Error(/quota/i.test(error)?'Se agotó o no alcanza la cuota gratuita. Espera su renovación; no se activa ningún servicio pagado.':'Wan no completó la generación. La referencia ya se envió; revisa el proveedor antes de volver a intentarlo.');
      }
      result=event.output?.data;break;
     }
     if(event.msg==='close_stream')throw new Error('La cola terminó sin un clip.');
    }
   }
  }finally{await reader.cancel().catch(()=>{});}
  const file=result?.[0];
  if(!file?.url)throw new Error('Wan no devolvió un archivo de video.');
  const url=new URL(file.url);
  if(url.origin!==WAN_SPACE||!url.pathname.startsWith('/gradio_api/file='))throw new Error('Destino del video no autorizado.');
  onStatus('Descargando el MP4…');
  const video=await this.#request(url.href,{signal},token);
  if(Number(video.headers.get('content-length'))>MAX_VIDEO)throw new Error('El clip supera el límite de 150 MB.');
  const chunks=[];let size=0;const body=video.body?.getReader();
  if(!body)throw new Error('El video no tiene contenido descargable.');
  try{while(true){const {done,value}=await body.read();if(done)break;size+=value.length;if(size>MAX_VIDEO)throw new Error('El clip supera el límite de 150 MB.');chunks.push(value);}}
  finally{await body.cancel().catch(()=>{});}
  if(size<1)throw new Error('El archivo de video está vacío.');
  return new Blob(chunks,{type:'video/mp4'});
 }
}
