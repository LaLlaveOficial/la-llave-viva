import {parseRPC} from './metricool-connect.js';
export const APOLLO_UID='apollo/la-llave-viva';
const COUNTRIES=['Chile','Argentina','Perú','Colombia','Ecuador','Bolivia','México','Estados Unidos'];
const CATEGORIES={librerias:'bookstore',editoriales:'publishing',medios:'media production'};
export async function apolloCredential(action,env,fetcher=fetch){
 if(!['token','authorize'].includes(action)||!env.VERCEL_OIDC_TOKEN)throw new Error('No está disponible la identidad del proyecto para Apollo.');
 const response=await fetcher(`https://api.vercel.com/v1/connect/${action}/${encodeURIComponent(APOLLO_UID)}`,{method:'POST',headers:{Authorization:`Bearer ${env.VERCEL_OIDC_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({subject:{type:'user',id:'console066-owner'},...(action==='authorize'?{returnUrl:'https://www.lallaveoficial.com/operaciones-066'}:{})}),signal:AbortSignal.timeout(20000)});
 const data=await response.json();
 if(!response.ok)throw new Error('Autoriza Apollo para esta consola con el botón Conectar Apollo.');
 if(action==='authorize'){
  let url;try{url=new URL(data.url||data.authorizationUrl);}catch{throw new Error('Apollo no devolvió un enlace válido.');}
  if(url.protocol!=='https:'||!['connect.vercel.com','vercel.com','app.apollo.io'].includes(url.hostname))throw new Error('Destino de autorización no reconocido.');
  return {url:url.href};
 }
 if(!data.token||typeof data.token!=='string')throw new Error('Apollo no devolvió el permiso solicitado.');
 return data.token;
}
export function validateApolloSearch(body){return body&&COUNTRIES.includes(body.country)&&Object.hasOwn(CATEGORIES,body.category)?{country:body.country,category:body.category}:null;}
function unpack(result){
 if(result?.isError)throw new Error('Apollo rechazó la consulta.');
 const raw=result?.structuredContent||result?.content?.filter(x=>x.type==='text').map(x=>x.text).join('\n');
 let value=raw||result;
 if(typeof value==='string'){try{value=JSON.parse(value);}catch{throw new Error('Respuesta de Apollo no reconocida.');}}
 return value?.data&&typeof value.data==='object'?value.data:value;
}
function verifyOwner(profile){
 if(typeof profile?.email!=='string')throw new Error('Apollo no devolvió un correo de cuenta verificable.');
 if(profile.email.trim().toLowerCase()!=='contacto@lallaveoficial.com')throw new Error('La cuenta autorizada no corresponde a contacto@lallaveoficial.com.');
}
export async function apolloQuery(kind,input,env,fetcher=fetch){
 if(!['check','search'].includes(kind))throw new Error('Consulta de Apollo inválida.');
 const query=kind==='search'?validateApolloSearch(input):null;
 if(kind==='search'&&!query)throw new Error('Selecciona un país y una categoría válidos.');
 const token=await apolloCredential('token',env,fetcher);let id=0,session;
 async function rpc(method,params){
  const response=await fetcher('https://mcp.apollo.io/mcp',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(session?{'Mcp-Session-Id':session,'MCP-Protocol-Version':'2025-03-26'}:{})},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params}),signal:AbortSignal.timeout(25000)});
  session=response.headers.get('mcp-session-id')||session;if(!response.ok)throw new Error(`Apollo no pudo responder (${response.status}).`);
  const value=parseRPC(await response.text());if(value.error)throw new Error('Apollo rechazó la consulta de lectura.');return value.result;
 }
 await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'La Llave 066',version:'1.0.0'}});
 const tools=(await rpc('tools/list',{})).tools||[];
 const action=kind==='check'?'apollo_users_api_profile':'apollo_organizations_lookup';
 // These two read actions are the entire allowlist. No reveal, enrichment, sequences or sending.
 const direct=tools.find(t=>t.name===action);
 const dispatcher=tools.find(t=>t.name==='apollo_read');
 if(!direct&&!dispatcher)throw new Error('Apollo no expone la consulta gratuita esperada.');
 const args=kind==='check'?{include_credit_usage:true}:{display_mode:'fuzzy_select_mode',organization_locations:[query.country==='Perú'?'Peru':query.country==='México'?'Mexico':query.country==='Estados Unidos'?'United States':query.country],q_organization_keyword_tags:[CATEGORIES[query.category]],per_page:10,page:1};
 if(kind==='search'){
  const profileTool=tools.find(t=>t.name==='apollo_users_api_profile');
  if(!profileTool&&!dispatcher)throw new Error('No se pudo verificar la cuenta de Apollo.');
  const profile=unpack(await rpc('tools/call',{name:profileTool?profileTool.name:dispatcher.name,arguments:profileTool?{}:{action:'apollo_users_api_profile'}}));
  verifyOwner(profile);
 }
 const value=unpack(await rpc('tools/call',{name:direct?direct.name:dispatcher.name,arguments:direct?args:{action,...args}}));
 const checkedAt=new Date().toISOString();
 if(kind==='check'){
  verifyOwner(value);
  return {status:'Conectado',checkedAt,email:value.email,creditsRemaining:value.num_credits_remaining??null};
 }
 if(!Array.isArray(value.organizations))throw new Error('Apollo no devolvió una lista de organizaciones reconocida.');
 return {status:'Consulta verificada',checkedAt,...query,candidates:value.organizations.slice(0,10).flatMap(o=>{
  let url;try{url=new URL(o.website_url);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return [];}catch{return [];}
  return typeof o.name==='string'&&o.name.length<=160?[{name:o.name,url:url.href,domain:url.hostname.replace(/^www\./,''),apolloId:String(o.id||'').slice(0,50)}]:[];
 })};
}
export function matchApolloCandidates(candidates,leads){
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
 return candidates.map(c=>{const known=leads.find(l=>{let host='';try{host=new URL(l.source_url).hostname.replace(/^www\./,'');}catch{}return host===c.domain||normalize(l.name)===normalize(c.name)||(normalize(c.name)==='bookfail'&&normalize(l.name).includes('bookfail'));});return {...c,crmStatus:known?.status||null,existing:!!known};});
}
