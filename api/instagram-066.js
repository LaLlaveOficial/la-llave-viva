import {neon} from '@neondatabase/serverless';
import {inboxConfiguration,verifyInstagramSignature,incomingMessages,receiveInstagram} from '../lib/instagram-inbox.js';
export const config={api:{bodyParser:false}};
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
  const chunks=[];let size=0;
  for await(const chunk of req){const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=b.length;if(size>262144)return res.status(413).send('Solicitud demasiado grande.');chunks.push(b);}
  const raw=Buffer.concat(chunks);
  if(!verifyInstagramSignature(raw,req.headers?.['x-hub-signature-256'],env.INSTAGRAM_APP_SECRET))return res.status(403).send('Firma inválida.');
  const rows=incomingMessages(JSON.parse(raw.toString('utf8')),settings.accountId);
  await receiveInstagram(connect(env.DATABASE_URL),rows,settings.accountId);
  return res.status(200).json({received:true});
 }catch{return res.status(503).send('No se pudo guardar el evento.');}
};}
export default makeInstagramWebhook();
