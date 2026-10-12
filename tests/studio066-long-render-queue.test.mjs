import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStudioRenderQueue,LONG_RENDER_SECONDS} from '../deploy/console066-houston/studio-render-queue.mjs';

async function fixture(t){const root=await mkdtemp(join(tmpdir(),'studio-long-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
test('three hours render as bounded segments, queue shares the existing Houston lock',async t=>{
 const root=await fixture(t),segments=[],resources={busy:true};
 const queue=await createStudioRenderQueue({root,resources,renderSegment:async s=>segments.push([s.index,s.start,s.seconds]),assemble:async()=>({bytes:100,seconds:LONG_RENDER_SECONDS})});
 const job=await queue.enqueue({seconds:LONG_RENDER_SECONDS,manifest:{clips:[]}});
 await queue.drain();assert.equal(segments.length,0);assert.equal(resources.busy,true);
 resources.busy=false;await queue.drain();
 assert.equal(segments.length,360);assert.deepEqual(segments.at(-1),[359,10770,30]);
 assert.equal(queue.get(job.id).status,'ready');assert.equal(resources.busy,false);
 await assert.rejects(queue.enqueue({seconds:LONG_RENDER_SECONDS+1,manifest:{}}),/Invalid/);
});
test('restart repeats the interrupted segment and keeps completed work',async t=>{
 const root=await fixture(t),first=[];
 const queue=await createStudioRenderQueue({root,renderSegment:async s=>{first.push(s.index);if(s.index===1)throw Error('Simulated interruption');},assemble:async()=>({})});
 const job=await queue.enqueue({seconds:65,manifest:{clips:[{id:'source'}]}});await queue.drain();
 assert.deepEqual(first,[0,1]);assert.deepEqual(queue.get(job.id).completed,[0]);
 // A process crash leaves a rendering state rather than a caught failure.
 const path=join(root,job.id,'state.json'),state=JSON.parse(await readFile(path,'utf8'));state.status='rendering';await writeFile(path,JSON.stringify(state));
 const resumed=[];const restart=await createStudioRenderQueue({root,renderSegment:async s=>resumed.push([s.index,s.seconds]),assemble:async()=>({verified:true})});
 assert.equal(restart.get(job.id).status,'queued');await restart.drain();
 assert.deepEqual(resumed,[[1,30],[2,5]]);assert.equal(restart.get(job.id).status,'ready');
});
test('cancellation aborts a running segment and cannot be overwritten by completion',async t=>{
 const root=await fixture(t);let enter,finish;const entered=new Promise(r=>enter=r),finished=new Promise(r=>finish=r);
 const queue=await createStudioRenderQueue({root,renderSegment:async({signal})=>{enter(signal);await finished;},assemble:async()=>assert.fail('Cancelled job assembled')});
 const job=await queue.enqueue({seconds:60,manifest:{}});const draining=queue.drain();const signal=await entered;
 await queue.cancel(job.id);assert.equal(signal.aborted,true);finish();await draining;
 assert.equal(queue.get(job.id).status,'cancelled');assert.deepEqual(queue.get(job.id).completed,[]);
 const restored=await createStudioRenderQueue({root,renderSegment:async()=>assert.fail('Cancelled job restarted'),assemble:async()=>({})});await restored.drain();
 assert.equal(restored.get(job.id).status,'cancelled');await restored.remove(job.id);assert.equal(restored.get(job.id),null);
});
test('retry retains completed segments and enqueue is idempotent',async t=>{
 const root=await fixture(t);let fail=true;const segments=[];
 const queue=await createStudioRenderQueue({root,renderSegment:async s=>{segments.push(s.index);if(s.index===1&&fail)throw Error('Encoder failed');},assemble:async()=>({})});
 const job=await queue.enqueue({seconds:65,manifest:{original:'hash'}});
 assert.equal((await queue.enqueue({id:job.id,seconds:65,manifest:{original:'hash'}})).id,job.id);
 await assert.rejects(queue.enqueue({id:job.id,seconds:65,manifest:{original:'different'}}),/already used/);
 await queue.drain();fail=false;await queue.retry(job.id);await queue.drain();
 assert.deepEqual(segments,[0,1,1,2]);assert.equal(queue.get(job.id).status,'ready');
});
