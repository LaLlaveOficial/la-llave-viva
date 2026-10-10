import {ga4Credential,ga4Sync} from '../lib/ga4-connect.js';
import {metaAdsSync} from '../lib/meta-ads-connect.js';
import {apolloCredential,apolloQuery,matchApolloCandidates,validateApolloSearch} from '../lib/apollo-connect.js';
import {adsCredential,googleAdsStatus,googleAdsSync} from '../lib/google-ads-connect.js';
import {googleAdsReport,googleAdsReports,googleAdsResources,adsAnalysisMission} from '../lib/google-ads-reports.js';
import {proposeAdsChange,approveAdsChange,adsChangeHistory} from '../lib/google-ads-changes.js';
import {connectRequest,metricoolSync} from '../lib/metricool-connect.js';
import {MARKETING_MISSIONS,marketingText} from '../lib/console-marketing.js';
import {houstonRoutines} from '../lib/houston-routines.js';
import {privateMetrics,validateMetricImport} from '../lib/console-metrics.js';
import {validateStudioProject,validateStudioShot} from '../lib/studio066.js';
import { neon } from '@neondatabase/serverless';
import {houstonStatus} from '../lib/houston-status.js';
import {houstonConnect} from '../lib/houston-connect.js';
import {houstonMission,validateMission} from '../lib/houston-missions.js';
import {configuration,sameOrigin,readToken,newToken,hashToken,cookie,rateKey,verifyConfiguredPassword,validateLeadUpdate,validateNewLead,TASK_STATES} from '../lib/console-security.js';

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
    try {
      const sql = connect(config.databaseUrl);
      if (op === 'login' && req.method === 'POST') {
        const key = rateKey(req,config.secret,env.VERCEL === '1');
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
        if (!await verifyConfiguredPassword(body.password,config)) return res.status(401).json({error:'Acceso incorrecto.'});
        const token = newToken();
        await sql`INSERT INTO console066_sessions(token_hash,expires_at) VALUES (${hashToken(token)},now()+interval '8 hours')`;
        res.setHeader('Set-Cookie',cookie(token)); return res.status(200).json({ok:true});
      }
      const token = readToken(req);
      if (!token) return res.status(401).json({error:'Inicia sesión para continuar.'});
      const session = await sql`SELECT token_hash FROM console066_sessions WHERE token_hash=${hashToken(token)} AND expires_at>now()`;
      if (session.length !== 1) return res.status(401).json({error:'Tu sesión terminó. Ingresa nuevamente.'});
      if(op==='google-ads'&&req.method==='GET')return res.status(200).json(await googleAdsStatus(sql,env));
      if(op==='google-ads-reports'&&req.method==='GET')return res.status(200).json({...await googleAdsReports(sql),changes:await adsChangeHistory(sql),missions:await sql`SELECT detail FROM console066_audit WHERE entity='google-ads-analysis' ORDER BY id DESC LIMIT 5`,capabilities:(await sql`SELECT detail FROM console066_audit WHERE entity='google-ads-capabilities' ORDER BY id DESC LIMIT 1`)[0]?.detail||{approvedChanges:false}});
      if(op==='google-ads-discard'&&req.method==='POST'){
        if(!Number.isSafeInteger(body.id)||body.id<1)return res.status(400).json({error:'Propuesta inválida.'});
        const rows=await sql`UPDATE console066_audit SET detail=detail||jsonb_build_object('status','discarded','discardedAt',now()) WHERE id=${body.id} AND entity='google-ads-change' AND detail->>'status'='validated' RETURNING id`;
        return res.status(rows.length===1?200:409).json(rows.length===1?{ok:true}:{error:'La propuesta ya fue procesada.'});
      }
      if(['google-ads-report','google-ads-resources','google-ads-propose','google-ads-approve','google-ads-analysis'].includes(op)&&req.method==='POST'){
        const adsEnv={...env,VERCEL_OIDC_TOKEN:req.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN};
        try{
          if(op==='google-ads-report')return res.status(200).json(await googleAdsReport(sql,adsEnv,body));
          if(op==='google-ads-resources'){
            const resources=await googleAdsResources(adsEnv,body);
            if(!body.resource){resources.capabilities={approvedChanges:resources.tools.some(t=>t.name==='llave_approved_change'),checkedAt:new Date().toISOString()};await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('google-ads-capabilities',0,'check',${JSON.stringify(resources.capabilities)}::jsonb)`;}
            return res.status(200).json(resources);
          }
          if(op==='google-ads-propose')return res.status(200).json(await proposeAdsChange(sql,adsEnv,body));
          if(op==='google-ads-approve')return res.status(200).json(await approveAdsChange(sql,adsEnv,body));
          const mission={action:body.action,slug:'analitica',id:body.id,text:'Análisis Google Ads'};
          if(!validateMission(mission))return res.status(400).json({error:'Tarea de análisis inválida.'});
          if(body.action==='start'){mission.text=adsAnalysisMission((await googleAdsReports(sql)).reports);}
          const result=await houstonMission(mission,env);
          if(body.action==='start')await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('google-ads-analysis',0,'start',${JSON.stringify({id:body.id,startedAt:new Date().toISOString()})}::jsonb)`;
          return res.status(200).json(result);
        }catch(e){return res.status(502).json({error:e.message});}
      }
      if(['google-ads-authorize','google-ads-sync'].includes(op)&&req.method==='POST'){
        try{const adsEnv={...env,VERCEL_OIDC_TOKEN:req.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN};return res.status(200).json(op==='google-ads-authorize'?await adsCredential('authorize',adsEnv):await googleAdsSync(sql,adsEnv));}
        catch(e){return res.status(502).json({error:e.message});}
      }
      if(op==='apollo-authorize'&&req.method==='POST')return res.status(200).json(await apolloCredential('authorize',{...env,VERCEL_OIDC_TOKEN:req.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN}));
      if(op==='apollo'&&req.method==='GET'){
        const rows=await sql`SELECT detail FROM console066_audit WHERE entity='apollo' ORDER BY id DESC LIMIT 1`;
        return res.status(200).json(rows[0]?.detail||{status:'Por comprobar',candidates:[]});
      }
      if(['apollo-check','apollo-search'].includes(op)&&req.method==='POST'){
        if(op==='apollo-search'&&!validateApolloSearch(body))return res.status(400).json({error:'Selecciona país y categoría.'});
        try{
          const result=await apolloQuery(op==='apollo-check'?'check':'search',body,{...env,VERCEL_OIDC_TOKEN:req.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN});
          if(result.candidates){const leads=await sql`SELECT name,status,source_url FROM console066_leads`;result.candidates=matchApolloCandidates(result.candidates,leads);}
          await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('apollo',0,${op},${JSON.stringify(result)}::jsonb)`;
          return res.status(200).json(result);
        }catch(e){return res.status(502).json({error:e.message});}
      }
      if(op==='metricool-authorize'&&req.method==='POST'){
        try{return res.status(200).json(await connectRequest('authorize',{...env,VERCEL_OIDC_TOKEN:req.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN}));}catch(e){return res.status(502).json({error:e.message});}
      }
      if(op==='metricool-sync'&&req.method==='POST'){
        try{return res.status(200).json(await metricoolSync(sql,{...env,VERCEL_OIDC_TOKEN:req.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN}));}catch(e){return res.status(502).json({error:e.message});}
      }
      if(op==='meta-ads'&&req.method==='GET'){
        const rows=await sql`SELECT detail FROM console066_audit WHERE entity='meta-ads' AND action='read' ORDER BY id DESC LIMIT 1`;
        return res.status(200).json(rows[0]?.detail||{status:'Sin consulta directa guardada'});
      }
      if(op==='meta-ads-sync'&&req.method==='POST'){
        try{return res.status(200).json(await metaAdsSync(sql,body,env));}
        catch(e){return res.status(502).json({error:e.message});}
      }
      if(op==='ga4'&&req.method==='GET'){
        const rows=await sql`SELECT detail FROM console066_audit WHERE entity='ga4' AND action='read' ORDER BY id DESC LIMIT 1`;
        return res.status(200).json(rows[0]?.detail||{status:'Lectura GA4 pendiente'});
      }
      if(['ga4-sync','ga4-authorize'].includes(op)&&req.method==='POST'){
        try{const gaEnv={...env,VERCEL_OIDC_TOKEN:req.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN};return res.status(200).json(op==='ga4-authorize'?await ga4Credential('authorize',gaEnv):await ga4Sync(sql,body,gaEnv));}
        catch(e){return res.status(502).json({error:e.message});}
      }
      if(op==='metrics'&&req.method==='GET')return res.status(200).json(await privateMetrics(sql));
      if(op==='houston-routines'){
        try{return res.status(200).json(await houstonRoutines(req.method==='GET'?{action:'read'}:body,env));}
        catch(e){return res.status(502).json({error:e.message});}
      }
      if(op==='metrics-import'&&req.method==='POST'){
        const item=validateMetricImport(body);if(!item)return res.status(400).json({error:'Revisa la marca, periodo y columnas de Metricool.'});
        await sql`INSERT INTO console066_audit(entity,entity_id,action,detail) VALUES ('metrics',0,'import',${JSON.stringify(item)}::jsonb)`;
        return res.status(200).json({ok:true,network:item.network,importedAt:item.importedAt});
      }
      if (op === 'houston' && req.method === 'GET') return res.status(200).json(await houstonStatus(env));
      if (op === 'houston-mission' && req.method === 'POST') {
        if(!validateMission(body))return res.status(400).json({error:'Revisa la tarea y el agente.'});
        if(body.action==='start'&&body.purpose){
          const mission=MARKETING_MISSIONS[body.purpose];if(!mission||mission.slug!==body.slug)return res.status(400).json({error:'Tarea de marketing inválida.'});
          const metrics=await privateMetrics(sql);const leads=await sql`SELECT name,status FROM console066_leads WHERE status IN ('Contactado','En conversación','No contactar') ORDER BY updated_at DESC LIMIT 30`;
          let apolloContext=null;
          if(body.purpose==='contactos'){
            const apollo=await sql`SELECT detail FROM console066_audit WHERE entity='apollo' AND action='apollo-search' ORDER BY id DESC LIMIT 1`;
            apolloContext=apollo[0]?.detail||null;
          }
          body.text=marketingText(body.purpose,metrics,leads,apolloContext);
        }
        try{return res.status(200).json(await houstonMission(body,env));}
        catch(e){return res.status(502).json({error:e.message});}
      }
      if (op === 'houston-connect' && req.method === 'POST') {
        if (!['start','status','finish','cancel'].includes(body.action)) return res.status(400).json({error:'Acción de conexión inválida.'});
        try { return res.status(200).json(await houstonConnect(body.action,env)); }
        catch(e) { return res.status(502).json({error:e.message}); }
      }
      if (op === 'logout' && req.method === 'POST') {
        await sql`DELETE FROM console066_sessions WHERE token_hash=${hashToken(token)}`;
        res.setHeader('Set-Cookie',cookie('',0)); return res.status(200).json({ok:true});
      }
      // Estudio Creativo 066: authenticated metadata only. Never invokes a generative provider.
      if (op === 'studio' && req.method === 'GET') {
        const [projects,shots]=await Promise.all([
          sql`SELECT * FROM console066_studio_projects ORDER BY updated_at DESC,id DESC LIMIT 200`,
          sql`SELECT * FROM console066_studio_shots ORDER BY updated_at DESC,id DESC LIMIT 2000`
        ]);
        return res.status(200).json({projects,shots,engineConnected:false,voiceConnected:false});
      }
      if (op === 'studio-project' && req.method === 'POST') {
        const item=validateStudioProject(body);
        if(!item)return res.status(400).json({error:'Revisa el nombre, el tipo y los datos del proyecto.'});
        if(item.action==='create'){
          const saved=await sql`
            WITH created AS (
              INSERT INTO console066_studio_projects(name,type,description)
              VALUES (${item.name},${item.type},${item.description}) RETURNING *
            ), logged AS (
              INSERT INTO console066_audit(entity,entity_id,action,detail)
              SELECT 'studio-project',id,'create',jsonb_build_object('name',name,'type',type) FROM created
            ) SELECT * FROM created
          `;
          return res.status(201).json({project:saved[0]});
        }
        const saved=await sql`
          WITH changed AS (
            UPDATE console066_studio_projects
            SET name=${item.name},type=${item.type},description=${item.description},version=version+1,updated_at=now()
            WHERE id=${item.id} AND version=${item.version} RETURNING *
          ), logged AS (
            INSERT INTO console066_audit(entity,entity_id,action,detail)
            SELECT 'studio-project',id,'update',jsonb_build_object('version',version) FROM changed
          ) SELECT * FROM changed
        `;
        if(saved.length!==1)return res.status(409).json({error:'El proyecto cambió. Recarga la biblioteca antes de guardarlo.'});
        return res.status(200).json({project:saved[0]});
      }
      if (op === 'studio-shot' && req.method === 'POST') {
        const item=validateStudioShot(body);
        if(!item)return res.status(400).json({error:'Revisa el plano, la duración, el formato y las variantes.'});
        if(item.action==='create'){
          const saved=await sql`
            WITH created AS (
              INSERT INTO console066_studio_shots
              (project_id,title,script,reference_notes,aspect,resolution,duration_seconds,fps,variants,provider)
              SELECT id,${item.title},${item.script},${item.referenceNotes},${item.aspect},${item.resolution},${item.duration},${item.fps},${item.variants},${item.provider}
              FROM console066_studio_projects WHERE id=${item.projectId} RETURNING *
            ), logged AS (
              INSERT INTO console066_audit(entity,entity_id,action,detail)
              SELECT 'studio-shot',id,'create',jsonb_build_object('projectId',project_id,'title',title) FROM created
            ) SELECT * FROM created
          `;
          if(saved.length!==1)return res.status(404).json({error:'El proyecto ya no está disponible.'});
          return res.status(201).json({shot:saved[0]});
        }
        const saved=await sql`
          WITH changed AS (
            UPDATE console066_studio_shots
            SET title=${item.title},script=${item.script},reference_notes=${item.referenceNotes},
              aspect=${item.aspect},resolution=${item.resolution},duration_seconds=${item.duration},
              fps=${item.fps},variants=${item.variants},provider=${item.provider},
              version=version+1,updated_at=now()
            WHERE id=${item.id} AND project_id=${item.projectId} AND version=${item.version} RETURNING *
          ), logged AS (
            INSERT INTO console066_audit(entity,entity_id,action,detail)
            SELECT 'studio-shot',id,'update',jsonb_build_object('version',version,'provider',provider,'variants',variants) FROM changed
          ) SELECT * FROM changed
        `;
        if(saved.length!==1)return res.status(409).json({error:'El plano cambió. Recarga la biblioteca antes de guardarlo.'});
        return res.status(200).json({shot:saved[0]});
      }
      if (op === 'data' && req.method === 'GET') {
        const [leads,tasks] = await Promise.all([
          sql`SELECT * FROM console066_leads ORDER BY country,name LIMIT 1000`,
          sql`SELECT * FROM console066_tasks ORDER BY id`
        ]);
        let metaCheckedAt=null;
        try{const rows=await sql`SELECT detail->>'checkedAt' AS checked_at FROM console066_audit WHERE entity='meta-ads' AND action='read' ORDER BY id DESC LIMIT 1`;metaCheckedAt=rows[0]?.checked_at||null;}catch{/* Optional integration status. */}
        let ga4CheckedAt=null;
        try{const rows=await sql`SELECT detail->>'checkedAt' AS checked_at FROM console066_audit WHERE entity='ga4' AND action='read' ORDER BY id DESC LIMIT 1`;ga4CheckedAt=rows[0]?.checked_at||null;}catch{/* Optional integration status. */}
        return res.status(200).json({leads,tasks,integrations:[
          {name:'CRM',status:'Conectado',description:'Datos guardados en la base de La Llave.'},
          {name:'Apollo',status:'Ver en Prospección Apollo',description:'Búsqueda de organizaciones, revisión de duplicados y consulta de cuenta. No identifica lectores de Instagram.'},
          {name:'Houston / agentes IA',status:'Por comprobar',description:'El estado del motor se consulta al abrir Herramientas y agentes.'},
          {name:'Instagram',status:'Pendiente',description:'Mensajes preparados para revisión; envío desde Work Mode.'},
          {name:'Radar 08:00',status:'Externo',description:'Programado en ChatGPT; los resultados aún no se importan solos.'},
          {name:'Google Ads',status:'Ver Google Ads directo',description:'Consulta directa por campaña, informes, recomendaciones y propuestas de cambios para aprobación. El estado se verifica en Google Ads directo.'},
          {name:'Meta Ads directo',status:metaCheckedAt?'Consulta verificada':'Ver Métricas y ventas',description:metaCheckedAt?'Lectura por campaña guardada el '+metaCheckedAt+'. Actualiza desde Métricas y ventas; permiso de solo lectura.':'Consulta directa por campaña desde Métricas y ventas; el estado se confirma al consultar.'},
          {name:'GA4 directo',status:ga4CheckedAt?'Consulta verificada':'Ver Métricas y ventas',description:ga4CheckedAt?'Lectura de La Llave Oficial guardada el '+ga4CheckedAt+'. Actualiza desde Métricas y ventas; permiso de solo lectura.':'Tráfico, fuentes y eventos agregados de La Llave Oficial; permiso de solo lectura. El estado se confirma al consultar.'},
          {name:'Ads y analítica',status:'Metricool disponible',description:'Instagram mediante Metricool; Google Ads y Meta Ads tienen vistas de consulta directa. La mensajería sigue pendiente.'}
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
