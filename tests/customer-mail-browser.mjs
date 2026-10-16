// Synthetic UI + actual authenticated handler/Postgres. No real providers.
import assert from 'node:assert/strict';import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {scryptSync} from 'node:crypto';
import {customerFixture} from './customer-mail-fixture.mjs';import {makeHandler} from '../api/console-066.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),{db,sql}=await customerFixture();
const salt='ad'.repeat(16),password='local-customer-browser';const env={CONSOLE_ORIGIN:'https://local-review.example',CONSOLE_PASSWORD_HASH:salt+':'+scryptSync(password,salt,64).toString('hex'),CONSOLE_SESSION_SECRET:'customer-browser-secret-'.repeat(3),DATABASE_URL:'postgresql://local'};
const handler=makeHandler(()=>sql,env);let cookie='';
async function api(op,body){const r={headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.data=v;return this}};await handler({method:body?'POST':'GET',query:{op},body,headers:{cookie,origin:env.CONSOLE_ORIGIN,'content-type':'application/json'}},r);return r;}
cookie=(await api('login',{password})).headers['Set-Cookie'].split(';')[0];
const server=http.createServer(async(req,res)=>{try{const f=path.join(root,'public',new URL(req.url,'http://localhost').pathname);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(f));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/console-066?**',async route=>{const req=route.request(),r=await api(new URL(req.url()).searchParams.get('op'),req.method()==='POST'?req.postDataJSON():undefined);await route.fulfill({status:r.code,contentType:'application/json',body:JSON.stringify(r.data)});});
 await page.goto('http://127.0.0.1:'+server.address().port+'/centro-066/index.html');
 await page.getByRole('button',{name:'Clientes y mailing',exact:true}).click();
 await page.getByRole('heading',{name:'Clientes con pago aprobado',exact:true}).waitFor();
 await page.getByRole('button',{name:'Pedidos y entregas',exact:true}).click();
 await page.getByRole('row').filter({hasText:'LLAVE-QA-PAID'}).getByRole('button',{name:'Ver pedido'}).click();
 let d=page.getByRole('dialog');await d.getByLabel('Estado de entrega').selectOption('shipped');await d.getByLabel('Transportista',{exact:true}).fill('Courier QA');await d.getByLabel('Número de seguimiento').fill('QA123');await d.getByRole('button',{name:'Guardar seguimiento'}).click();await page.getByText('Despachado',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Checkouts pendientes',exact:true}).click();await page.getByText('Checkout sin aprobación después de 2 horas. Motivo desconocido.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Campañas de email',exact:true}).click();await page.getByRole('button',{name:'Preparar Halloween · 10%',exact:true}).click();
 d=page.getByRole('dialog');assert.match(await d.getByLabel('Mensaje',{exact:true}).inputValue(),/Santibañez/);await d.getByRole('button',{name:'Guardar borrador'}).click();await page.getByRole('heading',{name:'Halloween · Archivo 066',exact:true}).waitFor();
 await page.getByRole('button',{name:'Vista previa y revisión',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Congelar contenido y destinatarios'}).click();await page.getByText('Lista para aprobar · v1',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Vista previa y revisión',exact:true}).click();d=page.getByRole('dialog');await d.getByRole('button',{name:'Aprobar esta campaña y activar código'}).click();await d.getByRole('alert').getByText('Marca la confirmación después de revisar.',{exact:true}).waitFor();
 await d.getByRole('checkbox').check();await d.getByRole('button',{name:'Aprobar esta campaña y activar código'}).click();await page.getByText('Aprobada · v1',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Vista previa y revisión'}).click();assert.equal(await page.getByRole('button',{name:'Enviar siguiente lote · hasta 5 correos'}).isDisabled(),true);await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 assert.equal((await sql`SELECT count(*)::int n FROM console066_mail_recipients WHERE status='sent'`)[0].n,0);
 console.log('Customer/mail browser passed: navigation, fulfillment, honest abandonment, editable Halloween draft, freeze/review approval, send disabled without service and mobile layout. No real emails/payments.');
}finally{if(browser)await browser.close();server.close();await db.close();}
