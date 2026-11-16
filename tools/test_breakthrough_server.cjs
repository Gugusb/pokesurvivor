const {test}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const {createApp}=require('../server/server.cjs'),{G}=require('../server/domain.cjs');
test('breakthrough API charges 2700, persists pending family Z unlock and blocks forged skill cards',async()=>{
 const app=createApp({dbFile:':memory:',stunUrls:'none'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;let cookie='';
 async function api(route,data){const r=await fetch(base+'/api'+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','X-PS-Client':'1',Origin:base,...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};}
 try{
  let r=await api('/register',{name:'BreakthroughQA',pass:'isolated-breakthrough-password-123'});assert.equal(r.status,201);const uid=r.data.user.uid,s=r.data.save;s.coins=10000;delete s.cardPack.skillMigrated;s.cardPack.taken['stat:cd']=7;
  app.db.prepare('UPDATE saves SET payload=? WHERE uid=?').run(JSON.stringify(s),uid);r=await api('/session');const migrated=r.data.save;assert.equal(migrated.cardPack.skillMigrated,1);assert.ok(Math.abs(G.Upgrades.perks(G.CardPacks.levels(migrated)).statGrowth.agility-.21)<1e-8);const rev=r.data.rev;assert.equal((await api('/session')).data.rev,rev);
  for(const c of G.CardPacks.packBy.breakthrough.cards)migrated.cardPack.taken[c.id]=c.max;migrated.cardPack.taken['z:133']=0;app.db.prepare('UPDATE saves SET payload=? WHERE uid=?').run(JSON.stringify(migrated),uid);
  r=await api('/packs/action',{action:'draw',pack:'breakthrough',rev});assert.equal(r.status,200);assert.equal(r.data.save.coins,7300);assert.deepEqual(r.data.save.cardPack.pending.options,['z:133']);
  let p=r.data.save.cardPack.pending;const again=await api('/packs/action',{action:'draw',pack:'beginner',rev:r.data.rev});assert.equal(again.status,200);assert.equal(again.data.save.coins,7300);assert.deepEqual(again.data.save.cardPack.pending,p);
  r=await api('/packs/action',{action:'choose',rev:again.data.rev,seq:p.seq,index:0});assert.equal(r.status,200);for(const d of [133,134,135,136,196,197,470,471,700])assert.ok(G.ZAccess.allowed(r.data.save,d));assert.equal((await api('/session')).data.save.zAccess[133].from,'cardpack');
  const forged=JSON.parse(JSON.stringify(r.data.save));forged.cardPack.taken['skill:agility']=0;forged.zAccess={};const saved=await api('/save',{rev:r.data.rev,save:forged});assert.equal(saved.status,200);assert.equal(saved.data.save.cardPack.taken['skill:agility'],6);assert.ok(G.ZAccess.allowed(saved.data.save,700));
  const invalid=await api('/packs/action',{action:'draw',pack:'unknown',rev:saved.data.rev});assert.equal(invalid.status,400);assert.equal((await api('/session')).data.save.coins,7300);
 }finally{await app.close();}
});
