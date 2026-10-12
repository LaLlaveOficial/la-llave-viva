import {indexedDB} from 'fake-indexeddb';
export async function fakeIndexedDB(){
 const old=globalThis.window,oldIndexedDB=globalThis.indexedDB;
 globalThis.window={indexedDB};globalThis.indexedDB=indexedDB;
 const reset=async()=>new Promise((resolve,reject)=>{
  const r=indexedDB.deleteDatabase('llave-studio066-media-v1');r.onsuccess=resolve;r.onerror=()=>reject(r.error);
 });
 await reset();
 return {reset,finish:async()=>{await reset();if(old===undefined)delete globalThis.window;else globalThis.window=old;if(oldIndexedDB===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=oldIndexedDB;}};
}
