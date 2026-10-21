// Local-only full UI + real handler + Postgres verification; never calls providers.
import assert from 'node:assert/strict';import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {scryptSync} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';import {makeHandler} from '../api/console-066.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),db=new PGlite();
await db.exec(await fs.readFile(root+'migrations/20261007_console066.sql','utf8'));await db.exec(await fs.readFile(root+'migrations/20261016_marketing_workspace.sql','utf8'));
for(const migration of ['20261016_instagram_inbox.sql','20261021_attention_deliveries066.sql','20261016_publication_outbox.sql','20261017_facebook_groups066.sql'])await db.exec(await fs.readFile(root+'migrations/'+migration,'utf8'));
await db.exec("CREATE TABLE orders(external_reference text PRIMARY KEY,payment_status text)");
const sql=async(parts,...values)=>(await db.query(parts.map((p,i)=>p+(i<values.length?'$'+(i+1):'')).join(''),values)).rows;
const salt='ac'.repeat(16),password='local-browser-only-066';
const env={CONSOLE_ORIGIN:'https://local-review.example',CONSOLE_PASSWORD_HASH:salt+':'+scryptSync(password,salt,64).toString('hex'),CONSOLE_SESSION_SECRET:'browser-test-secret-'.repeat(3),DATABASE_URL:'postgresql://local'};
const handler=makeHandler(()=>sql,env);let cookie='';
async function api(op,body){const r={headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.data=v;return this}};await handler({method:body?'POST':'GET',query:{op},body,headers:{cookie,origin:env.CONSOLE_ORIGIN,'content-type':'application/json'}},r);return r;}
const login=await api('login',{password});cookie=login.headers['Set-Cookie'].split(';')[0];
const server=http.createServer(async(req,res)=>{const file=path.join(root,'public',new URL(req.url,'http://localhost').pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/console-066?**',async route=>{const req=route.request(),op=new URL(req.url()).searchParams.get('op');const r=await api(op,req.method()==='POST'?req.postDataJSON():undefined);await route.fulfill({status:r.code,contentType:'application/json',body:JSON.stringify(r.data)});});
 await page.goto('http://127.0.0.1:'+server.address().port+'/centro-066/index.html');
 await page.getByRole('button',{name:'Centro de marketing',exact:true}).click();
 await page.getByRole('button',{name:'Agregar marca',exact:true}).click();await page.getByRole('button',{name:'Guardar borrador',exact:true}).click();
 await page.getByRole('button',{name:'Aprobar versión 1',exact:true}).click();await page.getByText('Marca · Aprobado',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Agregar producto',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Nombre',{exact:true}).fill('Producto sintético para QA');await dialog.getByLabel('País o cobertura').fill('Chile');await dialog.getByLabel('Formato',{exact:true}).fill('físico');await dialog.getByLabel('Enlace HTTPS de compra').fill('https://www.lallaveoficial.com/comprar');await dialog.getByLabel('Precio confirmado · vacío si falta').fill('15990');await dialog.getByLabel('Moneda',{exact:true}).selectOption('CLP');
 await dialog.getByRole('button',{name:'Guardar borrador'}).click();await page.getByRole('button',{name:'Aprobar versión 1',exact:true}).click();await page.getByRole('button',{name:'Crear enlace UTM'}).click();await page.getByRole('button',{name:'Preparar texto',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[name=reply]')?.value.includes('utm_source=instagram'));assert.match(await page.getByLabel('Texto para revisar').inputValue(),/utm_source=instagram/);await page.getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.getByRole('button',{name:'Calendario',exact:true}).click();await page.getByRole('button',{name:'Agregar pieza de contenido'}).click();await dialog.getByLabel('Título interno').fill('Booktrailer QA');await dialog.getByLabel('Copy',{exact:true}).fill('Texto sintético del ensayo de interfaz.');await dialog.getByRole('button',{name:'Guardar borrador'}).click();await page.getByRole('button',{name:'Aprobar versión 1',exact:true}).click();await page.getByText('Pieza de contenido · Aprobado',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Crear adaptación'}).click();await dialog.getByLabel('Canal',{exact:true}).selectOption('tiktok');await dialog.getByRole('button',{name:'Guardar borrador'}).click();await page.getByRole('heading',{name:'Booktrailer QA · adaptación',exact:true}).waitFor();
 await page.getByRole('button',{name:'Campañas y experimentos',exact:true}).click();await page.getByRole('button',{name:'Agregar experimento'}).click();await dialog.getByLabel('Experimento',{exact:true}).fill('Hipótesis QA');await dialog.getByLabel('Hipótesis',{exact:true}).fill('Una llamada más clara puede mejorar clics.');await dialog.getByRole('button',{name:'Guardar borrador'}).click();
 await page.getByRole('button',{name:'SEO y visibilidad',exact:true}).click();await page.getByRole('button',{name:'Agregar brief seo',exact:true}).click();await dialog.getByLabel('Título propuesto').fill('SEO QA');await dialog.getByLabel('Consulta o palabra clave').fill('thriller distópico');await dialog.getByLabel('Esquema, fuentes y CTA').fill('Brief sintético de revisión.');await dialog.getByRole('button',{name:'Guardar borrador'}).click();
 await page.screenshot({path:root+'../marketing-suite-desktop.png'});
 await page.getByRole('button',{name:'Marca y catálogo',exact:true}).click();await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:root+'../marketing-suite-mobile.png'});
 await page.getByRole('button',{name:'Historial',exact:true}).first().click();await page.getByRole('heading',{name:'Historial de versiones'}).waitFor();await page.getByRole('dialog').getByText('approve · versión 2',{exact:true}).waitFor();
 await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.getByRole('button',{name:'Publicaciones y entregas',exact:true}).click();await page.getByRole('heading',{name:'Publicaciones y entregas'}).waitFor();
 await page.getByRole('button',{name:'Correo y CRM',exact:true}).click();await page.getByRole('heading',{name:'Correo y CRM'}).waitFor();await page.getByRole('button',{name:'Autorizar Gmail',exact:true}).waitFor();
 await page.getByRole('button',{name:'Bandeja Instagram',exact:true}).click();await page.getByRole('heading',{name:'Bandeja de Instagram y CRM'}).waitFor();await page.getByText('Conexión pendiente',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);const records=(await api('marketing-workspace')).data.records;assert.equal(records.filter(r=>r.kind==='content').length,2);assert.equal(records.find(r=>r.kind==='brand').status,'approved');
 // Regression: Postgres bigint audit IDs arrive as strings; exact approvals must send numbers.
 await page.evaluate(async()=>{
  const {googleAdsView}=await import('/centro-066/google-ads.js');const mount=document.createElement('section');document.body.replaceChildren(mount);
  const proposal={id:'123',detail:{status:'validated',createdAt:new Date().toISOString(),reason:'QA exacta',change:{action:'negative_keyword',campaignId:'7',value:'otro titulo',matchType:'EXACT'},before:{}}};
  await googleAdsView(mount,async(op,body)=>{if(op==='google-ads')return {ready:true,status:'QA'};if(op==='google-ads-reports')return {reports:[],sections:[],changes:[proposal],missions:[],capabilities:{approvedChanges:true}};if(op==='google-ads-approve'){window.exactApprovalQA=body;return {detail:{status:'verified'}};}},()=>{});
 });
 await page.getByRole('button',{name:'Revisar y aprobar cambio',exact:true}).click();await page.getByRole('button',{name:'Apruebo este cambio y ejecutarlo',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>window.exactApprovalQA),{id:123,confirm:true});assert.deepEqual(errors,[]);
 console.log('Browser + Postgres + authenticated handler passed: brand approval, catalog, UTM, content/adaptation, experiments, SEO, version history, mobile layout and no JavaScript errors. No providers called.');
}finally{if(browser)await browser.close();server.close();await db.close();}

