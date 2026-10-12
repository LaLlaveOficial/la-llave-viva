import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStudioProject,validateStudioShot} from '../lib/studio066.js';

const project={action:'create',name:'Caso 066',type:'cine',description:'Capítulo 4'};
const shot={action:'create',projectId:1,title:'Paula en el callejón',script:'Travelling hacia la izquierda',referenceNotes:'Llueve. Pelo mojado.',aspect:'9:16',resolution:'1080p',duration:5,fps:24,variants:2,provider:'pendiente'};
test('studio accepts safe project draft',()=>{assert.deepEqual(validateStudioProject(project)?.name,'Caso 066');assert.equal(validateStudioProject({...project,type:'desconocido'}),null);assert.equal(validateStudioProject({...project,name:' '}),null);});
test('studio validates shot and quality presets',()=>{assert.ok(validateStudioShot(shot));assert.ok(validateStudioShot({...shot,aspect:'16:9',resolution:'4k',variants:4,duration:20}));});
test('studio rejects invalid expensive or nonsensical config',()=>{assert.equal(validateStudioShot({...shot,variants:5}),null);assert.equal(validateStudioShot({...shot,duration:0}),null);assert.equal(validateStudioShot({...shot,provider:'secret'}),null);assert.equal(validateStudioShot({...shot,referenceNotes:'x'.repeat(3001)}),null);});
test('studio optimistic edits require safe IDs',()=>{assert.equal(validateStudioShot({...shot,action:'update',id:10,version:0}).version,0);assert.equal(validateStudioShot({...shot,action:'update',id:10,version:-1}),null);assert.equal(validateStudioProject({...project,action:'update',id:1,version:2}).version,2);});
