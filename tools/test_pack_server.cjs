const {test}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const {createApp}=require('../server/server.cjs');
test('pack server owns the wallet, pending choice, finite stock and cosmetics across concurrent requests',async()=>{
 const app=createApp({dbFile:':memory:',stunUrls:'none'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;let cookie='';
 async function api(route,data){const r=await fetch(base+'/api'+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','X-PS-Client':'1',Origin:base,...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};}
 try{
  let r=await api('/register',{name:'PackAccount',pass:'isolated-pack-password-123'});assert.equal(r.status,201);const uid=r.data.user.uid;let s=r.data.save;delete s.cardPack;s.pupg={4:{hp:3}};s.coins=100000;app.db.prepare('UPDATE saves SET payload=? WHERE uid=?').run(JSON.stringify(s),uid);
  r=await api('/session');assert.equal(r.data.save.coins,100000+60+80+110);assert.equal(r.data.save.cardPack.taken['stat:hp'],0);const rev=r.data.rev;
  const both=await Promise.all([api('/packs/action',{action:'draw',rev}),api('/packs/action',{action:'draw',rev})]);assert.deepEqual(both.map(x=>x.status).sort(),[200,409]);r=both.find(x=>x.status===200);const pending=r.data.save.cardPack.pending;assert.equal(pending.options.length,3);assert.equal(r.data.save.coins,100250-800);
  const reread=await api('/session');assert.deepEqual(reread.data.save.cardPack.pending,pending);const oldRev=r.data.rev;
  r=await api('/packs/action',{action:'choose',rev:oldRev,seq:pending.seq,index:0});assert.equal(r.status,200);assert.equal(r.data.save.cardPack.taken[pending.options[0]],1);assert.equal((await api('/packs/action',{action:'choose',rev:oldRev,seq:pending.seq,index:0})).status,409);
  const forged=JSON.parse(JSON.stringify(r.data.save));forged.cardPack.taken['stat:hp']=10;forged.cardPack.taken['item:charcoal']=1;let save=await api('/save',{rev:r.data.rev,save:forged});assert.equal(save.status,200);assert.notEqual(save.data.save.cardPack.taken['stat:hp'],10);assert.equal(save.data.save.cardPack.taken['item:charcoal'],0);
  assert.equal((await api('/packs/action',{action:'toggle',rev:save.data.rev,id:'charcoal'})).status,400);
  assert.equal((await api('/packs/action',{action:'theme',rev:save.data.rev,id:'ocean'})).status,400);
 }finally{await app.close();}
});
