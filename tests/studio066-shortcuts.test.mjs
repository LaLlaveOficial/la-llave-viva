import test from 'node:test';import assert from 'node:assert/strict';
import {resolveShortcut,shortcutCatalog} from '../public/centro-066/studio-shortcuts.js';
test('every advertised shortcut resolves to its own command, including Windows delete and Mac modifiers',()=>{
 for(const item of shortcutCatalog){const event={key:item.key,shiftKey:!!item.shift,ctrlKey:!!item.modifier};assert.equal(resolveShortcut(event),item.id,item.shortcut);if(item.modifier)assert.equal(resolveShortcut({...event,ctrlKey:false,metaKey:true}),item.id);}
 for(const key of ['Delete','Del','Supr','Backspace'])assert.equal(resolveShortcut({key}),'remove');
 assert.equal(resolveShortcut({key:'?',code:'Slash',shiftKey:true}),'keyboard');
});
test('shortcuts never intercept typing, IME, repetitions or unrelated browser commands',()=>{
 assert.equal(resolveShortcut({key:'Delete',target:{closest:()=>({})}}),null);
 assert.equal(resolveShortcut({key:'v',ctrlKey:true}),null);assert.equal(resolveShortcut({key:'f',ctrlKey:true}),null);
 assert.equal(resolveShortcut({key:'Delete',repeat:true}),null);assert.equal(resolveShortcut({key:'s',isComposing:true}),null);assert.equal(resolveShortcut({key:'v',altKey:true}),null);
});
