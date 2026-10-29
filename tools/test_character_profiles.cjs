"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const {createApp}=require('../server/server.cjs'),{fresh,G}=require('../server/domain.cjs'),{identity}=require('../server/character-profiles.cjs');
async function setup(t){
 const app=createApp({dbFile:':memory:'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const base='http://127.0.0.1:'+app.server.address().port;
 const registered=await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json','X-PS-Client':'1'},body:JSON.stringify({name:'ProfileViewer',pass:'isolated-profile-fixture'})});const cookie=registered.headers.get('set-cookie').split(';')[0],viewer=(await registered.json()).user.uid;
 const add=(key,name,marked=true)=>{
  const uid=identity(key),s=fresh(name);s.partner=25;s.profile={favs:[25],title:''};s.stats={...s.stats,bestTime:1602,bestLevel:78,totalKills:7420,bossesTotal:9};
  for(const dex of G.DEX.slice(0,15).map(p=>p.dex))s.difficultyRecords[dex]=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,{best:1250,won:true}]));
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),'fixture-only','fixture-only',1);
  app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));
  app.db.prepare('INSERT INTO completion_scores VALUES(?,?,?)').run(uid,G.Difficulty.completedCount(s),1);
  app.db.prepare('INSERT INTO time_scores VALUES(?,?,?,?,?,?,?)').run(uid,1602,25,78,7420,'demo-anime-v1-'+key,1);
  const result=G.Difficulty.score({normal:7420},1602,8);app.db.prepare('INSERT INTO run_scores VALUES(?,?,?,?,?,?,?,?,?,?)').run(uid,result.total,8,1602,25,78,7420,'fixture-score',1,JSON.stringify(result));
  if(marked)app.db.prepare('INSERT INTO audit(actor,target,action,at) VALUES(?,?,?,?)').run('system:anime-demo-v1',uid,'seed-demo-rankings:anime-v1',1);
  return uid;
 };
 const get=async(route)=>{const r=await fetch(base+'/api'+route,{headers:{Cookie:cookie}});assert.equal(r.status,200);return r.json();};
 return {app,viewer,add,get};
}
test('curated characters use plain names across both boards without altering login identity or scores',async t=>{
 const f=await setup(t),uid=f.add('ash','小智_演示');
 for(const board of ['completion','survival']){const row=(await f.get('/ranking?board='+board)).rows.find(r=>r.uid===uid);assert.equal(row.name,'小智');}
 assert.equal(f.app.db.prepare('SELECT name FROM users WHERE uid=?').get(uid).name,'小智_演示');assert.equal(f.app.db.prepare('SELECT t FROM time_scores WHERE uid=?').get(uid).t,1602);
});
test('profiles include server-trusted character identity, valid partners, actual records and bounded medal gallery',async t=>{
 const f=await setup(t),uid=f.add('ash','小智_演示'),p=await f.get('/profile?uid='+uid);
 assert.equal(p.name,'小智');assert.equal(p.character.preset,true);assert.equal(p.character.bio.zh.length>0,true);assert.equal(p.favs.length,3);assert.deepEqual(p.favs.map(f=>f.dex),[25,6,658]);
 assert.equal(p.best.eightStar,1602);assert.equal(p.best.medals,15);assert.equal(p.best.bosses,9);assert.equal(p.completedDex.length,12);assert.ok(p.completedDex.every(d=>G.DEX_BY[d]));
});
test('a matching UID or client profile data cannot impersonate a curated character without the administrative seed marker',async t=>{
 const f=await setup(t),uid=f.add('roy','OrdinaryFixture',false),r=await f.get('/profile?uid='+uid);assert.equal(r.character,null);assert.equal(r.name,'OrdinaryFixture');
 const viewer=f.app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(f.viewer),s=JSON.parse(viewer.payload);s.profile.character={preset:true,name:'Spoofed'};
 f.app.db.prepare('UPDATE saves SET payload=? WHERE uid=?').run(JSON.stringify(s),f.viewer);
 const p=await f.get('/profile?uid='+f.viewer);assert.equal(p.character,null);assert.equal(p.name,'ProfileViewer');
});
