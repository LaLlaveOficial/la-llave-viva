import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProject,studioSave,studioList} from '../lib/multimedia-studio.js';
import {makeHandler} from '../api/console-066.js';
const project=()=>({title:'Caso 066',brief:'Continuación',continuity:'Paula con cabello mojado',format:'9:16',scenes:[{engine:'kling',duration:5,prompt:'Tracking shot',caption:'',referenceUrl:'https://example.com/frame.png',clipUrl:'',status:'draft'}]});
test('projects validate structure, bounds and reject misleading accepted scenes',()=>{
 const p=project();assert.ok(validateProject(p));
 for(const invalid of [{...p,format:'4K'},{...p,scenes:[]},{...p,scenes:Array(9).fill(p.scenes[0])},{...p,scenes:[{...p.scenes[0],duration:0}]},{...p,scenes:[{...p.scenes[0],engine:'unknown'}]},{...p,scenes:[{...p.scenes[0],status:'accepted'}]},{...p,scenes:[{...p.scenes[0],referenceUrl:'javascript:alert(1)'}]},{...p,scenes:[{...p.scenes[0],clipUrl:'https://user:secret@example.com/video.mp4'}]}])assert.equal(validateProject(invalid),null);
 assert.ok(validateProject({...p,scenes:[{...p.scenes[0],clipUrl:'https://example.com/v.mp4',status:'accepted'}]}));
});
test('save round trips a canonical project with server version and timestamp',async()=>{
 const sql=async(_, ...v)=>[{id:12,detail:JSON.parse(v[0])}];const r=await studioSave(sql,{project:project()});assert.equal(r.code,200);assert.equal(r.record.id,12);assert.equal(r.record.version,0);assert.ok(r.record.updatedAt);assert.deepEqual(r.record.project,project());
});
test('stale edits produce a conflict and do not silently overwrite',async()=>{
 const r=await studioSave(async()=>[],{id:12,version:0,project:project()});assert.equal(r.code,409);
});
test('invalid project never touches persistent storage',async()=>{
 let n=0;const r=await studioSave(async()=>{n++;},{project:{}});assert.equal(r.code,400);assert.equal(n,0);
});
test('engine status never claims generation is available',async()=>{
 const r=await studioList(async()=>[]);assert.equal(r.generationAvailable,false);assert.equal(r.engines.length,4);assert.ok(r.engines.every(e=>e.mode!=='connected'));
});
test('studio inherits authenticated access and same-origin writes',async()=>{
 const env={CONSOLE_ORIGIN:'https://lallaveoficial.com',CONSOLE_PASSWORD:'test-only-password-066',CONSOLE_SESSION_SECRET:'test-only-secret-'.repeat(3),DATABASE_URL:'postgresql://test-only'};
 let calls=0;const handler=makeHandler(()=>{calls++;return async()=>[];},env);
 const res=()=>({code:0,setHeader(){},status(c){this.code=c;return this;},json(d){this.data=d;return this;}});
 const a=res();await handler({method:'GET',query:{op:'studio'},headers:{}},a);assert.equal(a.code,401);assert.equal(calls,1);
 const b=res();await handler({method:'POST',query:{op:'studio-save'},headers:{origin:'https://other.example','content-type':'application/json'},body:{project:project()}},b);assert.equal(b.code,403);assert.equal(calls,1);
});
