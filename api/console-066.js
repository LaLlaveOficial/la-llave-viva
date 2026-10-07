import { neon } from '@neondatabase/serverless';
import {configuration,sameOrigin,readToken,newToken,hashToken,cookie,rateKey,verifyPassword,validateLeadUpdate,validateNewLead,TASK_STATES} from '../lib/console-security.js';

export function makeHandler(connect = neon, env = process.env) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options','nosniff');
    if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow','GET, POST'); return res.status(405).json({error:'Método no permitido.'}); }
    const config = configuration(env);
    if (!config) return res.status(503).json({error:'La consola todavía no está habilitada.'});
    if (req.method === 'POST' && !sameOrigin(req,config)) return res.status(403).json({error:'Origen no permitido.'});
    const op = req.query?.op || 'data';
    const body = req.body;
    if (req.method === 'POST' && (!String(req.headers?.['content-type'] || '').startsWith('application/json') || !body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 12000)) return res.status(400).json({error:'Solicitud inválida.'});
    const sql = connect(config.databaseUrl);
    try {
      if (op === 'login' && req.method === 'POST') {
        const key = rateKey(req,config.secret);
        // Both buckets persist across serverless instances. Reserve an attempt before doing scrypt.
        const buckets = await sql`
          INSERT INTO console066_login_limits(bucket,window_start,attempts)
          VALUES (${key},date_trunc('hour',now()),1),('global',date_trunc('hour',now()),1)
          ON CONFLICT(bucket) DO UPDATE SET
            attempts=CASE WHEN console066_login_limits.window_start < date_trunc('hour',now()) THEN 1 ELSE console066_login_limits.attempts+1 END,
            window_start=date_trunc('hour',now())
          RETURNING bucket,attempts
        `;
        if (buckets.some(b=>b.attempts > (b.bucket === 'global' ? 100 : 10))) return res.status(429).json({error:'Demasiados intentos. Vuelve a intentar en la próxima hora.'});
        if (!await verifyPassword(body.password,config.passwordHash)) return res.status(401).json({error:'Acceso incorrecto.'});
        const token = newToken();
        await sql`INSERT INTO console066_sessions(token_hash,expires_at) VALUES (${hashToken(token)},now()+interval '8 hours')`;
        res.setHeader('Set-Cookie',cookie(token)); return res.status(200).json({ok:true});
      }
      const token = readToken(req);
      if (!token) return res.status(401).json({error:'Inicia sesión para continuar.'});
      const session = await sql`SELECT token_hash FROM console066_sessions WHERE token_hash=${hashToken(token)} AND expires_at>now()`;
      if (session.length !== 1) return res.status(401).json({error:'Tu sesión terminó. Ingresa nuevamente.'});
      if (op === 'logout' && req.method === 'POST') {
        await sql`DELETE FROM console066_sessions WHERE token_hash=${hashToken(token)}`;
        res.setHeader('Set-Cookie',cookie('',0)); return res.status(200).json({ok:true});
      }
      if (op === 'data' && req.method === 'GET') {
        const [leads,tasks] = await Promise.all([
          sql`SELECT * FROM console066_leads ORDER BY country,name LIMIT 1000`,
          sql`SELECT * FROM console066_tasks ORDER BY id`
        ]);
        return res.status(200).json({leads,tasks,integrations:[
          {name:'CRM',status:'Conectado',description:'Datos guardados en la base de La Llave.'},
          {name:'Houston / agentes IA',status:'Pendiente',description:'El motor de agentes todavía no está conectado.'},
          {name:'Instagram',status:'Pendiente',description:'Mensajes preparados para revisión; envío desde Work Mode.'},
          {name:'Radar 08:00',status:'Externo',description:'Programado en ChatGPT; los resultados aún no se importan solos.'},
          {name:'Ads y analítica',status:'Pendiente',description:'La consola aún no consulta las cuentas publicitarias.'}
        ]});
      }
      if (op === 'add' && req.method === 'POST') {
        const item=validateNewLead(body);
        if (!item) return res.status(400).json({error:'Completa los campos y agrega una fuente pública válida.'});
        const created=await sql`
          WITH added AS (
            INSERT INTO console066_leads(country,name,type,genres,evidence,source_url,verification)
            VALUES (${item.country},${item.name},${item.type},${item.genres},${item.evidence},${item.source_url},${item.verification})
            ON CONFLICT(name,source_url) DO NOTHING RETURNING *
          ), logged AS (
            INSERT INTO console066_audit(entity,entity_id,action,detail)
            SELECT 'lead',id,'create',jsonb_build_object('country',country) FROM added
          ) SELECT * FROM added
        `;
        if (created.length!==1) return res.status(409).json({error:'Esta oportunidad ya existe con esa fuente.'});
        return res.status(201).json({lead:created[0]});
      }
      if (op === 'lead' && req.method === 'POST') {
        const item = validateLeadUpdate(body);
        if (!item) return res.status(400).json({error:'Revisa el mensaje y los campos.'});
        // Update and audit atomically. A stale tab cannot overwrite a newer message or approval.
        const changed = await sql`
          WITH updated AS (
            UPDATE console066_leads SET status=${item.status},notes=${item.notes},message=${item.message},
              approved_message=CASE WHEN ${item.approved} THEN ${item.message} ELSE NULL END,
              approved_at=CASE WHEN ${item.approved} THEN now() ELSE NULL END,
              version=version+1,updated_at=now()
            WHERE id=${item.id} AND version=${item.version} RETURNING *
          ), logged AS (
            INSERT INTO console066_audit(entity,entity_id,action,detail)
            SELECT 'lead',id,'update',jsonb_build_object('version',version,'status',status,'approved',approved_message IS NOT NULL) FROM updated
          ) SELECT * FROM updated
        `;
        if (changed.length !== 1) return res.status(409).json({error:'Este registro cambió. Recarga antes de guardar.'});
        return res.status(200).json({lead:changed[0]});
      }
      if (op === 'task' && req.method === 'POST') {
        if (!Number.isSafeInteger(body.id) || !Number.isSafeInteger(body.version) || !TASK_STATES.includes(body.status)) return res.status(400).json({error:'Estado inválido.'});
        const changed = await sql`
          WITH updated AS (
            UPDATE console066_tasks SET status=${body.status},version=version+1,updated_at=now()
            WHERE id=${body.id} AND version=${body.version} RETURNING *
          ), logged AS (
            INSERT INTO console066_audit(entity,entity_id,action,detail)
            SELECT 'task',id,'update',jsonb_build_object('version',version,'status',status) FROM updated
          ) SELECT * FROM updated
        `;
        if (changed.length !== 1) return res.status(409).json({error:'Esta tarea cambió. Recarga antes de guardar.'});
        return res.status(200).json({task:changed[0]});
      }
      return res.status(404).json({error:'Acción no disponible.'});
    } catch {
      // Never leak database errors, connection strings, cookies or message contents.
      return res.status(503).json({error:'No se pudo acceder a la consola. No se guardaron cambios confirmados; recarga para verificar.'});
    }
  };
}
export default makeHandler();
