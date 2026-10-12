import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudConfiguration,signCloudUrl,validateAssetIntent,studioCloudApi,CLOUD_MAX_FILE} from '../lib/studio-cloud066.js';

const branch='br-little-sound-av8vyecq';
const env={
 STUDIO_CLOUD_ENABLED:'1',
 STUDIO_STORAGE_BRANCH_ID:branch,
 STUDIO_STORAGE_BUCKET:'studio066-media-preview',
 STUDIO_STORAGE_ENDPOINT:'https://'+branch+'.storage.c-11.us-east-1.aws.neon.tech',
 STUDIO_STORAGE_ACCESS_KEY_ID:'EXAMPLE_ACCESS_KEY_01',
 STUDIO_STORAGE_SECRET_ACCESS_KEY:'test_secret_never_send_to_client_12345',
 STUDIO_STORAGE_REGION:'us-east-1'
};
const id='507d3aca-8f20-43cb-9469-5a15252bc075';
const good={projectId:1,id,kind:'image',mime:'image/png',name:'Paula referencia.png',size:1234,sha256:'a'.repeat(64)};
test('cloud stays off until every server-side credential and explicit flag exist',()=>{
 assert.equal(cloudConfiguration({}),null);
 assert.equal(cloudConfiguration({...env,STUDIO_CLOUD_ENABLED:'0'}),null);
 assert.equal(cloudConfiguration({...env,STUDIO_STORAGE_SECRET_ACCESS_KEY:''}),null);
 assert.equal(cloudConfiguration({...env,STUDIO_STORAGE_ENDPOINT:'https://evil.example'}),null);
 assert.equal(cloudConfiguration({...env,STUDIO_STORAGE_ENDPOINT:'https://'+branch+'.storage.c-11.us-east-1.aws.neon.tech.evil.tld'}),null);
 assert.equal(cloudConfiguration({...env,STUDIO_STORAGE_BRANCH_ID:'br-another-branch'}),null);
 assert.equal(cloudConfiguration({...env,STUDIO_STORAGE_BUCKET:'public'}),null);
 assert.ok(cloudConfiguration(env));
});
test('uploads reject unexpected categories, oversized files, invalid hashes and identifiers',()=>{
 assert.deepEqual(validateAssetIntent(good),good);
 for(const x of [
 {...good,mime:'text/html'}, {...good,kind:'audio',mime:'image/png'},
 {...good,size:0}, {...good,size:CLOUD_MAX_FILE+1},
 {...good,id:'../otherproject'}, {...good,sha256:'x'.repeat(64)},
 {...good,name:'evil\nname.png'}, {...good,projectId:0}
 ])assert.equal(validateAssetIntent(x),null);
});
test('S3 URLs have bounded expiry, only project-prefixed keys, and never expose secrets',()=>{
 const config=cloudConfiguration(env);
 const key='studio066/projects/1/'+id;
 const timestamp=new Date('2026-10-10T15:00:00.000Z');
 const p=signCloudUrl(config,'PUT',key,{mime:good.mime,checksum:good.sha256,now:timestamp});
 assert.match(p.url,/X-Amz-Algorithm=AWS4-HMAC-SHA256/);
 assert.match(p.url,/X-Amz-Signature=[a-f0-9]{64}/);
 assert.match(p.url,/X-Amz-Expires=120/);
 assert.ok(!p.url.includes(env.STUDIO_STORAGE_SECRET_ACCESS_KEY));
 assert.equal(p.headers['Content-Type'],'image/png');
 assert.equal(p.headers['x-amz-checksum-sha256'],Buffer.from(good.sha256,'hex').toString('base64'));
 assert.equal(signCloudUrl(config,'PUT',key,{mime:good.mime,checksum:good.sha256,now:timestamp}).url,p.url);
 const get=signCloudUrl(config,'GET',key,{now:timestamp,expires:60});
 assert.ok(get.url.includes('X-Amz-Expires=60'));
 assert.deepEqual(get.headers,{});
 assert.throws(()=>signCloudUrl(config,'PUT','studio066/projects/1/../../etc',{mime:'image/png',checksum:good.sha256}),/key/);
 assert.throws(()=>signCloudUrl(config,'GET',key,{expires:1000}),/Unsupported/);
});
test('disabled cloud API advertises no remote storage and rejects writes without DB access',async()=>{
 const denied=()=>{throw Error('The cloud feature must not query the database when disabled');};
 const result=await studioCloudApi(denied,'studio-cloud',{method:'GET',query:{}},{});
 assert.deepEqual({enabled:result.data.enabled,code:result.status},{enabled:false,code:200});
 const post=await studioCloudApi(denied,'studio-cloud-upload',{method:'POST',body:good},{});
 assert.equal(post.status,503);
 assert.match(post.data.error,/no habilitada/);
});
test('configured cloud validates data and never signs malformed upload',async()=>{
 const denied=()=>{throw Error('Invalid payload should be rejected before querying SQL');};
 const invalid=await studioCloudApi(denied,'studio-cloud-upload',{method:'POST',body:{...good,sha256:'invalid'}},env);
 assert.equal(invalid.status,400);
});
