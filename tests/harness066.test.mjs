import test from 'node:test';
import assert from 'node:assert/strict';
import {harnessAllows,harnessPolicy,compactAgentContext,verifyHarnessOutput} from '../lib/harness066.js';
import {harnessSummary066} from '../public/centro-066/queue066.js';
test('tool catalog is role scoped and exposes no external execution tools',()=>{
 assert.equal(harnessAllows('contactos','search'),false);
 assert.equal(harnessAllows('prensa','search'),true);
 for(const op of ['publish','send','delete','buy','maintenance'])assert.equal(harnessAllows('crecimiento',op),false);
 assert.equal(harnessAllows('prensa','facebook-draft'),false);
 assert.deepEqual(harnessPolicy('analitica').tools.map(x=>x.name),['context','save']);
});
test('large context stays bounded without rewriting approved facts or dates',()=>{
 const record={id:'brand',approved:true,data:{title:'La Llave',price:15990},updated_at:'2026-10-20T10:00:00Z'};
 const original={agent:'crecimiento',checkedAt:'2026-10-20T11:00:00Z',instructions:'No inventes.',workspace:{records:[record,...Array.from({length:90},(_,i)=>({...record,id:String(i),data:{text:'x'.repeat(1000)}}))]},contacts:Array.from({length:100},(_,id)=>({id,name:'a'.repeat(500),updated_at:record.updated_at})),manager:{jobs:[{id:'mgr-test',state:'queued',data:{title:'Primera tarea'}}]},drafts:Array.from({length:90},()=>({text:'b'.repeat(1000)}))};
 const before=JSON.stringify(original),result=compactAgentContext(original,'crecimiento');
 assert.ok(Buffer.byteLength(JSON.stringify(result))<=48000);
 assert.deepEqual(result.workspace.records[0],record);
 assert.equal(result.checkedAt,original.checkedAt);
 assert.equal(result.manager.jobs[0].id,'mgr-test');
 assert.ok(Object.keys(result.harness.context.omissions).length>0);
 assert.equal(JSON.stringify(original),before);
});
test('oversized scalar is omitted explicitly rather than silently shortened',()=>{
 const result=compactAgentContext({checkedAt:'now',workspace:{data:'x'.repeat(90000)}},'contenidos');
 assert.equal(result.workspace.status,'omitted');
 assert.equal(result.harness.context.omissions.workspace,'section_omitted');
});
test('save verification rejects wrong roles, incomplete work and credential-bearing links',()=>{
 const output={agent:'contenidos',kind:'instagram',title:'Copy',text:'Texto completo para revisión.'};
 assert.equal(verifyHarnessOutput(output).ok,true);
 assert.equal(verifyHarnessOutput({...output,agent:'analitica'}).ok,false);
 assert.equal(verifyHarnessOutput({...output,text:'[TODO] completar'}).ok,false);
 assert.equal(verifyHarnessOutput({...output,text:'Bearer '+ 's'.repeat(40)}).ok,false);
 assert.equal(verifyHarnessOutput({...output,text:'https://example.com/?token=secret'}).ok,false);
 assert.equal(verifyHarnessOutput({...output,text:'https://127.0.0.1/private'}).ok,false);
 const research={...output,agent:'prensa',kind:'oportunidades'};
 assert.equal(verifyHarnessOutput(research).ok,false);
 assert.equal(verifyHarnessOutput({...research,text:'Sin novedades verificadas; búsqueda no disponible.'}).ok,true);
 const checked=verifyHarnessOutput({...research,text:'Candidato para investigar: https://example.com/club'});
 assert.equal(checked.ok,true);assert.equal(checked.sourceCount,1);assert.match(checked.scope,/requieren evidencia/);
});
test('console shows actual budgets and escapes usage values',()=>{
 const escape=s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;');
 const html=harnessSummary066({providerRefreshHours:24,teamSearchLimit:24,limits:{search:6},usage:[{agent:'<script>',operation:'search',used:6,failures:0}]},escape);
 assert.match(html,/Cupo agotado/);assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<script>'));assert.match(html,/no a los tokens facturados/);
});
