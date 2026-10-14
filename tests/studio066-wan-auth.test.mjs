import test from 'node:test';
import assert from 'node:assert/strict';
import {makeHandler} from '../api/console-066.js';
const env={CONSOLE_ORIGIN:'https://www.lallaveoficial.com',CONSOLE_PASSWORD:'test-password-not-real',CONSOLE_SESSION_SECRET:'test-session-secret-32-characters-long',DATABASE_URL:'postgresql://not-a-real-database'};
function response(){return {code:0,data:null,setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};}
test('native Wan endpoints require the existing console session',async()=>{
 const res=response();let calls=0;
 await makeHandler(()=>async()=>{calls++;return [];},env)({method:'GET',query:{op:'studio-wan-capabilities'},headers:{}},res);
 assert.equal(res.code,401);assert.equal(calls,0);
});
test('native Wan submission rejects a foreign origin before provider or database',async()=>{
 const res=response();let calls=0;
 await makeHandler(()=>{calls++;throw Error('Should not connect');},env)({method:'POST',query:{op:'studio-wan-submit'},headers:{origin:'https://foreign.example','content-type':'application/json'},body:{}},res);
 assert.equal(res.code,403);assert.equal(calls,0);
});
test('authenticated console reports unavailable GPU without provider activity',async()=>{
 const res=response();let calls=0;
 await makeHandler(()=>async()=>{calls++;return [{token_hash:'fixture'}];},env)({method:'GET',query:{op:'studio-wan-capabilities'},headers:{cookie:'__Host-llave-console='+'a'.repeat(43)}},res);
 assert.equal(res.code,200);assert.equal(res.data.ready,false);assert.equal(res.data.canSubmit,false);assert.equal(calls,1);
});
