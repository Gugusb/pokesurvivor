// All accounts and clocks are isolated; no production DB or real credentials.
const test=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events'),{randomUUID,randomBytes,createHash}=require('node:crypto');
const {createApp}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
async function fixture(t){
 let now=Date.UTC(2026,10,16,1);const app=createApp({coopEnabled:true,dbFile:':memory:',stunUrls:'none',now:()=>now,lootRng:()=>0});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const base='http://127.0.0.1:'+app.server.address().port;
 function account(){const uid=randomUUID(),token=randomBytes(32).toString('hex'),s=fresh('Loot'+uid.slice(0,6));s.partner=4;s.owned[4]={iv:Array(8).fill(20)};
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,s.name||uid,uid,'unused','unused',now);app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));app.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),uid,now+864e5);return {uid,cookie:'ps_session='+token,rev:1};}
 async function api(a,route,b){const r=await fetch(base+'/api'+route,{method:b?'POST':'GET',headers:{Cookie:a.cookie,...(b?{'Content-Type':'application/json','X-PS-Client':'1'}:{})},...(b?{body:JSON.stringify({...b,rev:a.rev})}:{})});const value=await r.json();if(value.rev)a.rev=value.rev;return {status:r.status,...value};}
 function read(a){return JSON.parse(app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(a.uid).payload);}
 function write(a,s){app.db.prepare('UPDATE saves SET payload=? WHERE uid=?').run(JSON.stringify(s),a.uid);}
 function hatch(a,guest=null,started=now-1000,remaining=1e7){const id=randomUUID();app.db.prepare('INSERT INTO nursery_hatches(id,owner,guest,dex,partner,a,b,started,ends) VALUES(?,?,?,?,?,?,?,?,?)').run(id,a.uid,guest?.uid||null,4,7,'[1,2,3]','[4,5,6]',started,now+remaining);return id;}
 const a=account();await api(a,'/session');return {app,a,account,api,read,write,hatch,tick:ms=>now+=ms,clock:()=>now,ends:id=>app.db.prepare('SELECT ends FROM nursery_hatches WHERE id=?').get(id).ends};
}
const counts={normal:0,elite:0,boss:1,rift:1,events:0};
test('server grants Boss pack tokens once across heartbeats, end and retries, and owned opening costs no coins',async t=>{
 const f=await fixture(t),{a}=f,start=await f.api(a,'/run/start',{dex:4,stars:1,clean:true});assert.equal(start.status,200);
 f.tick(10000);const payload={id:start.id,t:10,alive:true,clean:true,kills:2,scoreCounts:counts};let r=await f.api(a,'/run/beat',payload);assert.equal(r.status,200);assert.equal(r.runLoot.beginner,2);assert.equal(r.progress.packTokens.beginner,2);
 r=await f.api(a,'/run/end',payload);assert.equal(r.status,200);assert.equal(r.save.cardPack.tokens.beginner,2);const rev=r.rev;
 r=await f.api(a,'/run/end',payload);assert.equal(r.alreadyEnded,true);assert.equal(r.rev,rev);assert.equal(r.save.cardPack.tokens.beginner,2);
 const coins=r.save.coins;r=await f.api(a,'/packs/action',{action:'draw',pack:'beginner',token:true});assert.equal(r.status,200);assert.equal(r.save.coins,coins);assert.equal(r.save.cardPack.tokens.beginner,1);assert.equal(r.save.cardPack.pending.token,true);
 r=await f.api(a,'/packs/action',{action:'draw',pack:'beginner',token:true});assert.equal(r.save.cardPack.tokens.beginner,1);assert.equal(r.save.coins,coins);
});
test('hatching requires more than three minutes and applies six times game time once to own and shared eggs',async t=>{
 const f=await fixture(t),{a}=f,b=f.account(),own=f.hatch(a),shared=f.hatch(b,a),before=[f.ends(own),f.ends(shared)];
 let start=await f.api(a,'/run/start',{dex:4,stars:1,clean:true}),payload={id:start.id,alive:true,clean:true,kills:0};
 for(const n of [90,180]){f.tick(90000);const r=await f.api(a,'/run/beat',{...payload,t:n});assert.equal(r.status,200);}
 let r=await f.api(a,'/run/end',{...payload,t:180});assert.equal(r.status,200);assert.deepEqual(r.hatchAcceleration,[]);assert.equal(f.ends(own),before[0]);
 start=await f.api(a,'/run/start',{dex:4,stars:1,clean:true});payload.id=start.id;
 for(const n of [90,180]){f.tick(90000);assert.equal((await f.api(a,'/run/beat',{...payload,t:n})).status,200);}f.tick(1000);
 r=await f.api(a,'/run/end',{...payload,t:181});assert.equal(r.status,200);assert.equal(r.hatchAcceleration.length,2);for(const h of r.hatchAcceleration)assert.equal(h.seconds,1086);assert.equal(f.ends(own),before[0]-1086000);assert.equal(f.ends(shared),before[1]-1086000);
 await f.api(a,'/run/end',{...payload,t:181});assert.equal(f.ends(own),before[0]-1086000);
});
test('egg acceleration caps at completion and ignores time before the egg was placed',async t=>{
 const f=await fixture(t),{a}=f;const start=await f.api(a,'/run/start',{dex:4,stars:1,clean:true}),payload={id:start.id,alive:true,clean:true,kills:0};
 f.tick(100000);await f.api(a,'/run/beat',{...payload,t:100});const id=f.hatch(a,null,f.clock(),150000);f.tick(100000);
 const r=await f.api(a,'/run/end',{...payload,t:200});assert.equal(r.status,200);assert.equal(r.hatchAcceleration[0].seconds,50);assert.equal(f.ends(id),f.clock());
});
test('speed permissions validate starts and fractional run clocks; dirty runs grant no packs or hatch bonus',async t=>{
 const f=await fixture(t),{a}=f;assert.equal((await f.api(a,'/run/start',{dex:4,stars:1,clean:true,speed:3})).status,400);
 const s=f.read(a);s.cardPack.taken['speed:1.5']=1;s.cardPack.taken['speed:3']=1;f.write(a,s);
 for(const speed of [1.5,3]){const start=await f.api(a,'/run/start',{dex:4,stars:1,clean:true,speed});assert.equal(start.status,200);f.tick(20000);const r=await f.api(a,'/run/end',{id:start.id,t:20*speed,speed,alive:true,clean:true,kills:0});assert.equal(r.status,200);}
 const id=f.hatch(a),ends=f.ends(id),start=await f.api(a,'/run/start',{dex:4,stars:1,clean:false});for(const n of [100,200]){f.tick(100000);const r=await f.api(a,n===200?'/run/end':'/run/beat',{id:start.id,t:n,clean:false,alive:true,kills:2,scoreCounts:counts});assert.equal(r.status,200);if(n===200){assert.deepEqual(r.runLoot,{});assert.deepEqual(r.hatchAcceleration,[]);}}
 assert.equal(f.ends(id),ends);
});
test('co-op speed permission belongs to the host and guests acknowledge speed before advancing its clock',async t=>{
 const f=await fixture(t),{a}=f,b=f.account(),s=f.read(a);s.cardPack.taken['speed:3']=1;f.write(a,s);
 f.app.rooms.set('fixture-room',{id:'fixture-room',host:a.uid,open:false,cfg:{difficulty:1},members:new Map([[a.uid,{}],[b.uid,{}]])});
 const start=await f.api(b,'/run/start',{dex:4,stars:1,mode:'g',clean:true,speed:1});assert.equal(start.status,200);
 const payload={id:start.id,speed:3,t:0,alive:true,clean:true,kills:0};assert.equal((await f.api(b,'/run/beat',payload)).status,200);f.tick(10000);
 assert.equal((await f.api(b,'/run/beat',{...payload,t:30})).status,200);assert.equal(f.read(b).cardPack.taken['speed:3'],0);
 s.cardPack.taken['speed:3']=0;f.write(a,s);assert.equal((await f.api(b,'/run/beat',{...payload,t:30})).status,400);
});
