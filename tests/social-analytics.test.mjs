import test from 'node:test';
import assert from 'node:assert/strict';
import {socialPostReport} from '../lib/social-analytics.js';
import {marketingText,MARKETING_MISSIONS} from '../lib/console-marketing.js';
test('provider post data keeps missing observations and never combines organic reach with TikTok views',()=>{
 const ig=socialPostReport('instagram',[['20261006000007','Caso 066','https://www.instagram.com/reel/example/',null,'293','2','2','343','7.022']],{from:'2026-09-10',to:'2026-10-08'});
 assert.equal(ig.posts[0].comments,null);assert.equal(ig.posts[0].reach,293);assert.equal(ig.posts[0].views,343);assert.equal(ig.posts[0].averageWatchSeconds,7.022);
 const tk=socialPostReport('tiktok',[['20261005233014','https://www.tiktok.com/@lallavesagaoficial/video/123','Caso 066','4577','296','2','0','7']],{});
 assert.equal(tk.posts[0].views,4577);assert.equal(tk.posts[0].saved,undefined);assert.match(tk.scope,/pagada/);
 assert.throws(()=>socialPostReport('tiktok',[['20261005233014','https://attacker.example','x',1,1,1,1,1]],{}),/Enlace/);
});
test('growth agent gets both networks with dated evidence under Houston limit',()=>{
 const report=network=>({network,source:'Metricool',from:'2026-09-10',to:'2026-10-08',checkedAt:'2026-10-09',scope:'Fuente con retraso',posts:Array.from({length:20},(_,i)=>({date:'20261005233014',url:'https://www.'+network+'.com/'+i,text:'X'.repeat(1000),views:4577,shares:0,averageWatchSeconds:7}))});
 const metrics={checkedAt:'2026-10-09',directConnections:{instagram:'Metricool',tiktok:'Metricool'},snapshots:[],socialPosts:[report('instagram'),report('tiktok')]};
 const text=marketingText('influencer',metrics,[{status:'En conversación'}]),context=JSON.parse(text.slice(text.indexOf('{')));
 assert.equal(MARKETING_MISSIONS.influencer.slug,'crecimiento');assert.ok(text.length<=4000);
 assert.deepEqual(context.socialPosts.map(s=>s.network),['instagram','tiktok']);assert.ok(context.socialPosts.every(s=>s.posts.length));assert.equal(context.contactCounts['En conversación'],1);
 assert.match(text,/no publiques/i);
});
