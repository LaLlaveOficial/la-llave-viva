import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,appendFile,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createStudioOriginalStore,ORIGINAL_CHUNK} from '../deploy/console066-houston/studio-original-store.mjs';
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'studio-original-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
test('original upload resumes after restart, retries exact parts and verifies the complete file',async t=>{
 const root=await fixture(t),data=Buffer.alloc(ORIGINAL_CHUNK+7,42),sha256=createHash('sha256').update(data).digest('hex');
 let store=await createStudioOriginalStore({root});await store.init({sha256,bytes:data.length});
 await store.chunk({sha256,offset:0,data:data.subarray(0,ORIGINAL_CHUNK)});
 await assert.rejects(store.resolve(sha256),/not verified/);
 await assert.rejects(store.verify(sha256),/incomplete/);
 // Emulate a crash after bytes reached disk but before metadata committed them.
 await appendFile(join(root,sha256,'upload'),Buffer.from('uncommitted'));
 store=await createStudioOriginalStore({root});assert.equal((await store.init({sha256,bytes:data.length})).received,ORIGINAL_CHUNK);
 await store.chunk({sha256,offset:0,data:data.subarray(0,ORIGINAL_CHUNK)});
 await assert.rejects(store.chunk({sha256,offset:0,data:Buffer.alloc(ORIGINAL_CHUNK,1)}),/conflicts/);
 await store.chunk({sha256,offset:ORIGINAL_CHUNK,data:data.subarray(ORIGINAL_CHUNK)});
 await store.verify(sha256);assert.deepEqual(await readFile(await store.resolve(sha256)),data);
});
test('corrupt originals never become render inputs and path traversal is rejected',async t=>{
 const root=await fixture(t),store=await createStudioOriginalStore({root}),sha256='a'.repeat(64);
 await assert.rejects(store.init({sha256:'../../private',bytes:5}),/Invalid/);
 await store.init({sha256,bytes:5});await store.chunk({sha256,offset:0,data:Buffer.from('wrong')});
 await assert.rejects(store.verify(sha256),/hash mismatch/);await assert.rejects(store.resolve(sha256),/not verified/);
});
test('recovery handles a crash after final rename but before verified metadata',async t=>{
 const root=await fixture(t),data=Buffer.from('verified original'),sha256=createHash('sha256').update(data).digest('hex');
 const store=await createStudioOriginalStore({root});await store.init({sha256,bytes:data.length});await store.chunk({sha256,offset:0,data});await store.verify(sha256);
 const path=join(root,sha256,'state.json'),state=JSON.parse(await readFile(path,'utf8'));state.status='uploading';await writeFile(path,JSON.stringify(state));
 const restarted=await createStudioOriginalStore({root});await restarted.verify(sha256);assert.deepEqual(await readFile(await restarted.resolve(sha256)),data);
});
