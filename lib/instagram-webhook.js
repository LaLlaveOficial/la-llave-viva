import {neon} from '@neondatabase/serverless';
import {inboxConfiguration,verifyInstagramSignature,incomingMessages,receiveInstagram} from './instagram-inbox.js';
// Vercel's Node helpers restore the original body through data/end listeners.
// Read those events rather than an already-consumed async iterator.
export function readWebhookBody(req){return new Promise((resolve,reject)=>{
 const chunks=[];let size=0,settled=false;
 const fail=error=>{if(!settled){settled=true;reject(error);}};
 req.on('data',chunk=>{if(settled)return;const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=b.length;if(size>262144){const e=new Error('Body limit');e.httpStatus=413;fail(e);return;}chunks.push(b);});
 req.on('end',()=>{if(!settled){settled=true;resolve(Buffer.concat(chunks));}});
 req.on('error',fail);req.on('aborted',()=>fail(new Error('Request aborted')));
});}
export function makeInstagramWebhook(connect=neon,env=process.env){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 const settings=inboxConfiguration(env);
 if(!settings.enabled||!env.DATABASE_URL)return res.status(503).send('Webhook no habilitado.');
 if(req.method==='GET'){
  const mode=req.query?.['hub.mode'],token=req.query?.['hub.verify_token'],challenge=req.query?.['hub.challenge'];
  return mode==='subscribe'&&token===env.INSTAGRAM_VERIFY_TOKEN&&typeof challenge==='string'&&challenge.length<=2000?res.status(200).send(challenge):res.status(403).send('Verificación inválida.');
 }
 if(req.method!=='POST')return res.status(405).send('Método no permitido.');
 try{
  const raw=await readWebhookBody(req);
  if(!verifyInstagramSignature(raw,req.headers?.['x-hub-signature-256'],env.INSTAGRAM_APP_SECRET))return res.status(403).send('Firma inválida.');
  const rows=incomingMessages(JSON.parse(raw.toString('utf8')),settings.accountId);
  await receiveInstagram(connect(env.DATABASE_URL),rows,settings.accountId);
  return res.status(200).json({received:true});
 }catch(error){return res.status(error.httpStatus===413?413:503).send(error.httpStatus===413?'Solicitud demasiado grande.':'No se pudo guardar el evento.');}
};}
export default makeInstagramWebhook();
