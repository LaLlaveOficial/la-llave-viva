import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function ensureAgents({base='http://127.0.0.1:4318',token=process.env.HOUSTON_HOST_TOKEN,seedRoot='/houston/llave-agents',fetcher=fetch}={}) {
  if(!token || token.length<32)throw new Error('Falta autorización interna de Houston.');
  const request=async(path,body)=>{
    const r=await fetcher(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000),redirect:'error'});
    if(!r.ok)throw new Error('Houston respondió '+r.status+' durante la importación.');
    return r.json();
  };
  let existing=await request('/agents');
  if(!Array.isArray(existing))throw new Error('Lista de agentes inválida.');
  for(const slug of ['radar-lectores','contactos','prensa','contenidos','analitica','crecimiento']){
    const spec=JSON.parse(await readFile(join(seedRoot,slug,'houston.json'),'utf8'));
    if(existing.some(a=>a.name===spec.name))continue;
    const claudeMd=await readFile(join(seedRoot,slug,'CLAUDE.md'),'utf8');
    const created=await request('/agents',{name:spec.name,claudeMd,seeds:{'llave-role.json':JSON.stringify(spec)}});
    existing.push(created);
  }
  return existing.length;
}

export async function bootstrapAgents(options={}){
  for(let attempt=0;attempt<40;attempt++){
    try {const count=await ensureAgents(options);console.info('[llave-066] agentes registrados: '+count+'; no se iniciaron misiones ni rutinas.');return;}
    catch {if(attempt===39){console.error('[llave-066] importación pendiente; revisar el servidor.');return;}await new Promise(r=>setTimeout(r,2000));}
  }
}
