import test from 'node:test';
import assert from 'node:assert/strict';
import {renderManagerReport,managerReport} from '../lib/manager-report.js';
test('approval and CRM status never become claimed external execution; details are whitelisted',()=>{
 const text=renderManagerReport({generatedAt:'2026-10-12T07:00:00Z',outputs:[{id:1,created_at:'2026-10-12T06:00:00Z',detail:{title:'Plan',text:'Prioridad',status:'approved',token:'SECRET'}}],events:[{id:2,entity:'lead',action:'update',detail:{status:'Contactado',approved:true,password:'SECRET'}}],videos:[{title:'Pieza',status:'ready',duration:15,format:'vertical',createdAt:'2026-10-12T07:00:00Z'}]});
 assert.match(text,/Texto aprobado; ejecución por comprobar/);assert.match(text,/No acredita contacto externo/);assert.match(text,/MP4 terminado y privado; no publicado/);assert.ok(!text.includes('SECRET'));
});
test('bounded records disclose truncation',()=>{const text=renderManagerReport({outputs:Array.from({length:101},(_,id)=>({id,detail:{title:'P'+id}})),events:Array.from({length:501},(_,id)=>({id,entity:'task'}))});assert.match(text,/Lista de propuestas recortada/);assert.match(text,/Lista de eventos recortada/);assert.ok(!text.includes('· P100'));});
test('video failure preserves the report and labels unknown state',async()=>{
 let calls=0;const sql=async strings=>{calls++;assert.match(strings[0],/interval '24 hours'/);return [];};
 const text=await managerReport(sql,async()=>{throw Error('motor no disponible');},'2026-10-12T07:00:00Z');assert.equal(calls,2);assert.match(text,/estado de videos desconocido/);assert.match(text,/Sin eventos registrados/);
});
