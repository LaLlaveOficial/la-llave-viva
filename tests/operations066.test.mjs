import test from 'node:test';import assert from 'node:assert/strict';
import {startOperationsLoop} from '../deploy/console066-houston/operations-loop.mjs';
import {makeAgentHandler} from '../api/agent-066.js';
test('model-free loop targets only owned API, logs no payload and stops future work',async()=>{
 const timers=[],logs=[],secret='s'.repeat(64);let calls=0;
 const stop=startOperationsLoop({env:{HOUSTON_HOST_TOKEN:secret},schedule:(fn,ms)=>{timers.push({fn,ms});return timers.length;},cancel:id=>logs.push({cancel:id}),log:x=>logs.push(x),fetcher:async(url,init)=>{calls++;assert.equal(url,'https://www.lallaveoficial.com/api/agent-066?agent=analitica&op=maintenance');assert.equal(init.method,'POST');assert.equal(init.redirect,'error');assert.equal(init.headers.Authorization,'Bearer '+secret);return {ok:true,json:async()=>({status:'partial',private:secret})};}});
 assert.equal(timers[0].ms,30000);await timers[0].fn();assert.equal(timers[1].ms,3600000);assert.equal(calls,1);assert.ok(!JSON.stringify(logs).includes(secret));stop();await timers[1].fn();assert.equal(calls,1);
});
test('failed tick is bounded, does not log credentials and retries only next interval',async()=>{
 const timers=[],logs=[];startOperationsLoop({env:{HOUSTON_HOST_TOKEN:'s'.repeat(64)},schedule:(fn,ms)=>{timers.push({fn,ms});return timers.length;},cancel(){},log:x=>logs.push(x),fetcher:async()=>{throw Error('secret error payload');}});await timers[0].fn();assert.equal(timers.length,2);assert.equal(timers[1].ms,3600000);assert.deepEqual(logs,['{"event":"operations066","status":"unavailable"}']);
});
test('maintenance cannot be called with browser session or another agent role',async()=>{
 let dbCalls=0;const env={DATABASE_URL:'test',HOUSTON_HOST_TOKEN:'s'.repeat(64)},handler=makeAgentHandler(()=>{dbCalls++;return async()=>[];},env),res=()=>({setHeader(){},status(n){this.code=n;return this;},json(x){this.body=x;return this;}});
 let r=res();await handler({method:'POST',query:{agent:'analitica',op:'maintenance'},headers:{cookie:'owner=session'}},r);assert.equal(r.code,401);assert.equal(dbCalls,0);
 r=res();await handler({method:'POST',query:{agent:'contenidos',op:'maintenance'},headers:{authorization:'Bearer '+env.HOUSTON_HOST_TOKEN}},r);assert.equal(r.code,403);
});
