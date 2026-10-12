import test from 'node:test';import assert from 'node:assert/strict';
import {parseSubtitles,addSubtitleCues,exportSubtitles,wrapSubtitle} from '../public/centro-066/studio-subtitles.js';
import {defaultWorkspace,parseWorkspace} from '../public/centro-066/studio-media.js';
test('SRT and WebVTT preserve time, Spanish text and line breaks, ignoring metadata and style markup',()=>{
 const cues=parseSubtitles('\uFEFF1\r\n00:00:01,250 --> 00:00:03,750\r\n¿Dónde está Paula?\r\nEn Ciudad Central.\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,000\r\n<i>Vamos</i> &amp; seguimos.');
 assert.deepEqual(cues,[{start:1.25,duration:2.5,text:'¿Dónde está Paula?\nEn Ciudad Central.'},{start:4,duration:1,text:'Vamos & seguimos.'}]);
 const vtt=parseSubtitles('WEBVTT\n\nNOTE comentario\nNo se renderiza\n\ncue1\n00:01.250 --> 00:03.750 align:center\n<v Paula>¿Dónde está Paula?</v>\nEn Ciudad Central.');
 assert.deepEqual(vtt,[cues[0]]);
});
test('import is atomic, persists subtitle style and export follows edited timeline times',()=>{
 const original=defaultWorkspace(),cues=[{start:.5,duration:1,text:'CASO 066'},{start:2.5,duration:1,text:'Ciudad Central'}];let id=0;
 const next=addSubtitleCues(original,cues,'V2',()=> 'caption-'+(++id));assert.equal(original.clips.length,0);assert.equal(next.clips.length,2);
 const saved=parseWorkspace(next);assert.equal(saved.clips[0].textRole,'subtitle');assert.equal(saved.clips[0].subtitleSize,4.8);
 saved.clips[0].start=1.125;const exported=exportSubtitles(saved.clips);assert.match(exported,/00:00:01,125 --> 00:00:02,125/);assert.deepEqual(parseSubtitles(exported).map(c=>c.text),cues.map(c=>c.text));
 assert.throws(()=>addSubtitleCues({...original,clips:Array(120).fill({})},cues),/120 clips/);assert.throws(()=>addSubtitleCues(original,cues,'A1'),/pista de video/);
});
test('malformed, empty, oversized and out-of-range subtitles are rejected rather than silently dropping cues',()=>{
 for(const value of ['','sin tiempos','1\n00:00:60,000 --> 00:01:02,000\nX','1\n00:00:02,000 --> 00:00:01,000\nX','1\n00:09:59,000 --> 00:10:01,000\nX','1\n00:00:01,000 --> 00:00:02,000\n','x'.repeat(250001)])assert.throws(()=>parseSubtitles(value));
 assert.throws(()=>exportSubtitles([]),/No hay/);assert.throws(()=>exportSubtitles([{kind:'text',textRole:'subtitle',text:' '}]),/vacíos/);
});
test('wrapping keeps all text, splits long words and respects manual line breaks',()=>{
 const ctx={measureText:value=>({width:[...value].length*10})};
 assert.deepEqual(wrapSubtitle(ctx,'Hola Ciudad Central\nSí',70),['Hola','Ciudad','Central','Sí']);
 assert.equal(wrapSubtitle(ctx,'abcdefghijklmnop',50).join(''),'abcdefghijklmnop');
});
