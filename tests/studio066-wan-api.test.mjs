import test from 'node:test';
import assert from 'node:assert/strict';
import {studioWanApi,validateWanJob,wanConfiguration} from '../lib/studio-wan066.js';
const env={STUDIO_WAN_ENABLED:'true',STUDIO_WAN_ENDPOINT_ID:'unit-endpoint',RUNPOD_API_KEY:'test-key-not-a-real-credential',STUDIO_WAN_TEST_ESTIMATE_USD:'1',STUDIO_WAN_TEST_CEILING_USD:'2'};
const id='12345678-1234-4234-9234-123456789abc';
const input={id,projectId:1,prompt:'Run along the street',duration:5,orientation:'portrait',seed:42,approveCost:true,approvedEstimateUsd:1,image_base64:Buffer.from([137,80,78,71,13,10,26,10]).toString('base64')};
test('unconfigured or over-budget endpoint cannot submit or call provider',async()=>{
 let calls=0;const reject=()=>{calls++;throw Error('Must not call');};
 for(const settings of [{},{...env,STUDIO_WAN_TEST_CEILING_USD:'0.5'}]){
  assert.equal(wanConfiguration(settings).ready,false);
  const r=await studioWanApi(reject,'studio-wan-submit',{method:'POST',body:input},settings,reject);
  assert.equal(r.status,503);
 }
 assert.equal(calls,0);
});
test('missing cost consent and malformed image are rejected',()=>{
 for(const change of [{approveCost:false},{image_base64:'a==='},{duration:20},{seed:-1},{image_base64:Buffer.from('not an image').toString('base64')}])assert.equal(validateWanJob({...input,...change}),null);
 assert.ok(validateWanJob(input));
});
test('same request ID is returned without a second paid submission',async()=>{
 const sql=async()=>[{id,status:'IN_QUEUE',provider_id:'existing'}];let calls=0;
 const r=await studioWanApi(sql,'studio-wan-submit',{method:'POST',body:input},env,()=>{calls++;});
 assert.equal(r.data.reused,true);assert.equal(calls,0);
});
test('lost provider response marks UNKNOWN and never retries',async()=>{
 const statements=[];const sql=async(strings)=>{const q=strings.join('?');statements.push(q);if(q.includes('SELECT id,provider_id'))return [];if(q.includes('INSERT INTO'))return [{id,status:'SUBMITTING'}];return [];};
 let calls=0;const r=await studioWanApi(sql,'studio-wan-submit',{method:'POST',body:input},env,async()=>{calls++;throw Error('Timeout');});
 assert.equal(r.status,502);assert.equal(r.data.job.status,'UNKNOWN');assert.equal(calls,1);assert.ok(statements.at(-1).includes("status='UNKNOWN'"));
});
test('native result is returned only for the measured resolution',async()=>{
 const sql=async(strings)=>strings.join('').includes('SELECT')?[{id,provider_id:'provider-job',status:'IN_PROGRESS'}]:[];
 const req={method:'GET',query:{id,projectId:'1'}};
 for(const [width,height,expected] of [[704,1280,200],[1,901120,502]]){
  const fetcher=async()=>({ok:true,json:async()=>({status:'COMPLETED',output:{video_base64:'AAAA',metadata:{width,height,fps:24,audio:false}}})});
  assert.equal((await studioWanApi(sql,'studio-wan-status',req,env,fetcher)).status,expected);
 }
});
