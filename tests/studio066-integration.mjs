// Real isolated SQL + DOM integration tests for Studio 066. No external providers.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {scryptSync} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {JSDOM} from 'jsdom';
import {makeHandler} from '../api/console-066.js';
import {studioView} from '../public/centro-066/studio.js';

const base=fileURLToPath(new URL('../',import.meta.url));
const db=new PGlite();
try {
  await db.exec(await fs.readFile(base+'/migrations/20261007_console066.sql','utf8'));
  const migration=await fs.readFile(base+'/migrations/20261010_studio066.sql','utf8');
  await db.exec(migration);
  await db.exec(migration); // Idempotence on dedicated empty test database.
  const genMigration=await fs.readFile(base+'/migrations/20261010_studio066_generations.sql','utf8');
  await db.exec(genMigration);
  await db.exec(genMigration);
  const sql=async(parts,...values)=>(await db.query(parts.map((p,i)=>p+(i<values.length?'$'+(i+1):'')).join(''),values)).rows;
  const salt='ab'.repeat(16);
  const password='qa-studio-066-password';
  const env={CONSOLE_ORIGIN:'https://lallaveoficial.com',CONSOLE_PASSWORD_HASH:salt+':'+scryptSync(password,salt,64).toString('hex'),CONSOLE_SESSION_SECRET:'qa-studio-secret-'.repeat(3),DATABASE_URL:'postgresql://test-only'};
  const handler=makeHandler(()=>sql,env);
  let cookie='';
  const call=async(op,body,origin=env.CONSOLE_ORIGIN)=>{
    const res={code:0,headers:{},data:null,setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(d){this.data=d;return this;}};
    await handler({method:body?'POST':'GET',query:{op},body,headers:{origin,'content-type':'application/json',cookie}},res);
    return res;
  };
  let res=await call('studio');
  assert.equal(res.code,401,'Una sesión anónima no puede leer el estudio');
  const login=await call('login',{password});
  assert.equal(login.code,200,'El login real debe ser válido');
  cookie=login.headers['Set-Cookie'].split(';')[0];
  res=await call('studio');
  assert.equal(res.code,200);
  assert.deepEqual(res.data.projects,[]);
  assert.deepEqual(res.data.shots,[]);
  assert.equal(res.data.engineConnected,false);
  assert.equal(res.data.voiceConnected,false);

  const project={action:'create',name:'Caso 066 · Capítulo 4',description:'Ciudad Central, lluvia, cine noir',type:'cine'};
  assert.equal((await call('studio-project',{...project,type:'invalid'})).code,400);
  assert.equal((await call('studio-project',project,'https://attacker.example')).code,403);
  const created=await call('studio-project',project);
  assert.equal(created.code,201);
  const id=Number(created.data.project.id);
  assert.ok(id>0);
  assert.equal(created.data.project.version,0);
  const projects=await call('studio');
  assert.equal(projects.data.projects.length,1);
  const updated=await call('studio-project',{...project,action:'update',id,version:0,name:'Caso 066 · Reel 4'});
  assert.equal(updated.code,200);
  assert.equal(updated.data.project.version,1);
  assert.equal((await call('studio-project',{...project,action:'update',id,version:0})).code,409);

  const shot={action:'create',projectId:id,title:'Escape bajo la lluvia',script:'Cámara en travelling',referenceNotes:'Paula mantiene cabello mojado; Rosa a la izquierda.',aspect:'9:16',resolution:'1080p',duration:5,fps:24,variants:2,provider:'pendiente'};
  assert.equal((await call('studio-shot',{...shot,variants:5})).code,400);
  assert.equal((await call('studio-shot',{...shot,projectId:99999})).code,404);
  const saved=await call('studio-shot',shot);
  assert.equal(saved.code,201);
  const shotId=Number(saved.data.shot.id);
  assert.ok(shotId>0);
  const enriched=await call('studio-shot',{...shot,action:'update',id:shotId,version:0,aspect:'16:9',resolution:'4k',duration:20,fps:60,variants:4,provider:'kling'});
  assert.equal(enriched.code,200);
  assert.equal(enriched.data.shot.version,1);
  assert.equal(enriched.data.shot.resolution,'4k');
  assert.equal(enriched.data.shot.variants,4);
  assert.equal((await call('studio-shot',{...shot,action:'update',id:shotId,version:0})).code,409);
  const capabilities=await call('studio-video-capabilities');
  assert.equal(capabilities.code,200);
  assert.equal(capabilities.data.canGenerate,false);
  assert.equal(capabilities.data.canCharge,false);
  const genId='5ba22ccc-899e-42c7-88ce-41ef808dc066';
  const assetId='bf90a616-0de3-4954-b242-bbb79647ed19';
  const generatedId='be90a616-0de3-4954-b242-bbb79647ed20';
  const genRequest={mode:'frames',title:'Paula en el callejón',prompt:'Rainy escape, tracking shot',negative:'No identity drift',continuity:'Wet hair and dark coat',model:'pendiente',aspect:'9:16',resolution:'1080p',duration:5,fps:24,variants:2,audio:false,seed:'',preserveIdentity:true,preserveComposition:true,refs:[{assetId,role:'start'}]};
  assert.equal((await call('studio-generations')).code,400);
  assert.equal((await call('studio-generations',{projectId:id})).code,404); // GET only
  assert.equal((await call('studio-generation',{action:'create',projectId:id,id:genId,request:{...genRequest,variants:99},results:[]})).code,400);
  assert.equal((await call('studio-generation',{action:'create',projectId:id,id:genId,request:genRequest,results:[]},'https://invalid.example')).code,403);
  const createdGen=await call('studio-generation',{action:'create',projectId:id,id:genId,request:genRequest,results:[]});
  assert.equal(createdGen.code,201);
  assert.equal(createdGen.data.record.status,'prepared');
  assert.equal(createdGen.data.record.version,0);
  assert.equal((await call('studio-generation',{action:'create',projectId:id,id:genId,request:genRequest,results:[]})).code,409);
  const importedGen=await call('studio-generation',{action:'update',projectId:id,id:genId,version:0,request:genRequest,results:[{assetId:generatedId}]});
  assert.equal(importedGen.code,200);
  assert.equal(importedGen.data.record.version,1);
  assert.equal(importedGen.data.record.status,'imported');
  assert.equal((await call('studio-generation',{action:'update',projectId:id,id:genId,version:0,request:genRequest,results:[]})).code,409);
  assert.equal((await db.query('SELECT COUNT(*)::int n FROM console066_studio_generations')).rows[0].n,1);
  console.log('Generation metadata: authenticated + verified create/update, version conflict, no billing, no provider call.');
  const read=await call('studio');
  assert.equal(read.data.shots.length,1);
  assert.equal(read.data.shots[0].title,'Escape bajo la lluvia');
  assert.equal(read.data.shots[0].fps,60);
  assert.equal((await db.query("SELECT COUNT(*)::int n FROM console066_audit WHERE entity LIKE 'studio-%'")).rows[0].n,4);
  console.log('DB integration: migration, session auth, same-origin, project/shot CRUD, 400/401/403/404/409, persistence and audit passed.');

  const dom=new JSDOM('<!doctype html><html><body><div id="studio-test"></div></body></html>',{url:env.CONSOLE_ORIGIN,pretendToBeVisual:true});
  try {
    const root=dom.window.document.querySelector('#studio-test');
    const request=async(op,body)=>{
      const res=await call(op,body);
      if(res.code>=400)throw new Error(res.data.error);
      return res.data;
    };
    studioView(root,request,()=>{});
    await new Promise(r=>setTimeout(r,50));
    assert.match(root.textContent,/Estudio Creativo 066/);
    assert.match(root.textContent,/Caso 066/);
    root.querySelector('[data-studio-tab="shots"]').click();
    assert.ok(root.querySelector('#studio-shot-form'));
    const resolution=root.querySelector('[name=resolution]');
    assert.ok(Array.from(resolution.options).some(o=>o.value==='4k'));
    const variants=root.querySelector('[name=variants]');
    assert.equal(variants.options.length,4);
    assert.ok(root.querySelector('button[disabled]'),'La generación pagada no debe estar disponible');
    root.querySelector('[data-studio-tab="voices"]').click();
    assert.ok(root.querySelector('button[disabled]'),'No mostrar previews de voces sin conexión');
    root.querySelector('[data-studio-tab="editor"]').click();
    assert.match(root.textContent,/Montaje y efectos/); // El editor ahora se monta en un módulo separado.
    root.querySelector('[data-studio-tab="ads"]').click();
    assert.match(root.textContent,/Creatividades publicitarias/);
    assert.match(root.textContent,/1.91:1/);
    console.log('DOM integration: menus, library, output controls, disabled provider actions and Ads layout passed.');
  } finally {dom.window.close();}
  assert.equal((await call('logout',{})).code,200);
  assert.equal((await call('studio')).code,401);
  console.log('Studio 066 integration checks all passed.');
} finally {await db.close();}
