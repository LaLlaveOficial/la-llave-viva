import {createHash} from 'node:crypto';
// Deterministic controls for the OP066 tool boundary. No model calls or credentials.
export const HARNESS_VERSION='066.1';
export const HARNESS_LIMITS=Object.freeze({context:24,search:6,save:12,'facebook-candidate':6,'facebook-draft':6});
const roles={
 'radar-lectores':['oportunidades'],prensa:['oportunidades','seguimiento'],contactos:['seguimiento'],
 contenidos:['instagram','facebook','tiktok'],analitica:['analitica'],
 crecimiento:['instagram','facebook','tiktok','plan-ventas','oportunidades','seguimiento','analitica'],
 'facebook-comunidad':['facebook','oportunidades']
};
const searchRoles=['radar-lectores','prensa','crecimiento','facebook-comunidad'];
export function harnessAllows(agent,operation){
 return Object.hasOwn(roles,agent)&&(operation==='context'||operation==='save'||(operation==='search'&&searchRoles.includes(agent))||(['facebook-candidate','facebook-draft'].includes(operation)&&agent==='facebook-comunidad'));
}
export function harnessPolicy(agent){
 if(!Object.hasOwn(roles,agent))throw Error('Agente inválido.');
 return {version:HARNESS_VERSION,tools:Object.keys(HARNESS_LIMITS).filter(op=>harnessAllows(agent,op)).map(name=>({name,dailyLimit:HARNESS_LIMITS[name]})),outputKinds:roles[agent],teamSearchLimit:24,maxContextBytes:48000,providerRefreshHours:24,maxConsecutiveFailures:3,cooldownMinutes:15,
  instructions:'Usa únicamente las herramientas de tu rol. El contexto omite información por tamaño: consulta los contadores y no inventes lo omitido. No reintentes 403, 429 ni una entrega inválida sin corregirla. Antes de finalizar, revisa fuentes, fechas y requisitos del encargo; confirma saved:true e id. La validación estructural no acredita hechos, publicaciones ni ventas. No se permiten envíos, publicaciones, compras, borrados ni cambios de campañas desde estas herramientas.'};
}
// UPSERT is the admission decision, not a COUNT followed by a provider call.
// Failed attempts consume a slot too; a restart cannot reset a daily budget.
async function takeSlot(sql,agent,operation,limit){
 return sql`INSERT INTO console066_harness_budget(day,agent,operation,used)
 VALUES((now() AT TIME ZONE 'America/Santiago')::date,${agent},${operation},1)
 ON CONFLICT(day,agent,operation) DO UPDATE SET used=console066_harness_budget.used+1,updated_at=now()
 WHERE console066_harness_budget.used<${limit} AND (console066_harness_budget.blocked_until IS NULL OR console066_harness_budget.blocked_until<=now())
 RETURNING used`;
}
export async function admitHarnessTool(sql,agent,operation){
 if(!harnessAllows(agent,operation))return {allowed:false,status:403,error:'Herramienta no habilitada para este rol.'};
 if(operation==='search'&&!(await takeSlot(sql,'team','search',24)).length)return {allowed:false,status:429,error:'Cupo diario de búsquedas del equipo agotado. No reintentes hoy.'};
 if(!(await takeSlot(sql,agent,operation,HARNESS_LIMITS[operation])).length)return {allowed:false,status:429,error:'Cupo agotado o herramienta en pausa por fallos. Conserva el último resultado y no reintentes en bucle.'};
 return {allowed:true};
}
export async function recordHarnessOutcome(sql,agent,operation,ok){
 await sql`UPDATE console066_harness_budget SET failures=CASE WHEN ${ok} THEN 0 ELSE failures+1 END,
 blocked_until=CASE WHEN NOT ${ok} AND failures+1>=3 THEN now()+interval '15 minutes' ELSE NULL END,updated_at=now()
 WHERE day=(now() AT TIME ZONE 'America/Santiago')::date AND agent=${agent} AND operation=${operation}`;
}
export async function reserveMetricsRefresh(sql){
 const rows=await sql`INSERT INTO console066_harness_refresh(id,attempted_at) VALUES(1,now())
 ON CONFLICT(id) DO UPDATE SET attempted_at=now() WHERE console066_harness_refresh.attempted_at<=now()-interval '24 hours' RETURNING id`;
 return rows.length===1;
}
const bytes=v=>Buffer.byteLength(JSON.stringify(v));
function fitSection(value,limit,path,omissions){
 const copy=structuredClone(value);
 if(bytes(copy)<=limit)return copy;
 // Remove whole array entries, never rewrite approved records or source dates.
 const arrays=[];
 function visit(v,p){if(Array.isArray(v))arrays.push({v,p});else if(v&&typeof v==='object')for(const [k,x]of Object.entries(v))visit(x,p+'.'+k);}
 visit(copy,path);
 while(bytes(copy)>limit){
  const largest=arrays.filter(x=>x.v.length).sort((a,b)=>bytes(b.v)-bytes(a.v))[0];
  if(!largest)break;
  largest.v.pop();omissions[largest.p]=(omissions[largest.p]||0)+1;
 }
 if(bytes(copy)<=limit)return copy;
 omissions[path]='section_omitted';return {status:'omitted',reason:'La sección supera el presupuesto de contexto; no se ha resumido ni verificado.'};
}
export function compactAgentContext(context,agent){
 const policy=harnessPolicy(agent),omissions={};
 const result={agent,checkedAt:context.checkedAt,instructions:context.instructions,harness:policy};
 const budgets={workspace:7500,manager:7500,metrics:5500,contacts:3500,drafts:2000,facebook:4500,subscribers:800,refresh:800,contactsScope:300};
 for(const [key,limit]of Object.entries(budgets))if(context[key]!==undefined)result[key]=fitSection(context[key],limit,key,omissions);
 result.harness={...policy,context:{omissions,inputBytes:bytes(context),estimatedTokens:null,scope:'Selección determinista del contexto; no es memoria completa ni una medición de facturación.'}};
 result.harness.context.outputBytes=bytes(result)+100;
 result.harness.context.estimatedTokens=Math.ceil(result.harness.context.outputBytes/4);
 if(bytes(result)>policy.maxContextBytes)throw Error('El contexto supera el límite del harness.');
 return result;
}
export function verifyHarnessOutput(output){
 const checks=[];
 if(!roles[output?.agent]?.includes(output?.kind))checks.push('El formato no corresponde al rol.');
 const text=String(output?.title||'')+'\n'+String(output?.text||'');
 if(/Bearer\s+[A-Za-z0-9._~-]{16,}|\bsk-[A-Za-z0-9_-]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(text))checks.push('La entrega contiene un posible secreto.');
 if(/\[(?:TODO|INSERTAR|PENDIENTE DE COMPLETAR)\]/i.test(text))checks.push('La entrega contiene marcadores sin completar.');
 const sources=[...new Set((text.match(/https?:\/\/[^\s<>"\]\)]+/g)||[]).map(x=>x.replace(/[.,;]+$/,'')))];
 for(const source of sources){
  try{const url=new URL(source);if(url.protocol!=='https:'||url.username||url.password||/^(localhost|127\.|169\.254\.|10\.|192\.168\.|\[|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)||[...url.searchParams.keys()].some(k=>/token|secret|password|api[_-]?key/i.test(k)))throw Error();}
  catch{checks.push('Incluye únicamente fuentes HTTPS públicas sin credenciales.');break;}
 }
 if(output?.kind==='oportunidades'&&!sources.length&&!/sin novedades|no (?:hay|se encontraron) (?:nuevas )?oportunidades|bloqueo|sin acceso|no disponible/i.test(text))checks.push('Las oportunidades necesitan fuentes públicas o un bloqueo explícito.');
 return {ok:checks.length===0,version:HARNESS_VERSION,checks,sourceCount:sources.length,scope:'Validación de rol, formato y secretos; los hechos y acciones externas requieren evidencia y revisión del propietario.',checkedAt:new Date().toISOString()};
}
export const outputFingerprint=output=>createHash('sha256').update(JSON.stringify([output.agent,output.kind,output.title,output.text,output.managerJobId||null])).digest('hex');
export async function harnessStatus(sql){
 const usage=await sql`SELECT agent,operation,used,failures,blocked_until FROM console066_harness_budget WHERE day=(now() AT TIME ZONE 'America/Santiago')::date ORDER BY agent,operation`;
 return {version:HARNESS_VERSION,limits:HARNESS_LIMITS,teamSearchLimit:24,maxContextBytes:48000,providerRefreshHours:24,usage,scope:'Controles de herramientas de OP066; no limita terminales ni proveedores externos al puente, ni mide tokens facturados por el modelo.'};
}
