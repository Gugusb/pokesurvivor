'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID,randomBytes,createHash}=require('node:crypto'),{once}=require('node:events'),{gunzipSync}=require('node:zlib');
const {context}=require('./battle_fixture.cjs'),{createApp}=require('../server/server.cjs'),{fresh,G:rules}=require('../server/domain.cjs');
function battle(){
 const c=context('zh',false),G=c.G,storage=new Map();let dirty=false,clock=0,enabled=true;
 G.DB={...G.DB,mode:'server'};G.Server={user:{uid:'owner'},mirrorRecorder:true};G.Updater={version:'0123456789'};G.Settings={get:k=>k==='mirrorRecording'?enabled:'auto'};
 c.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 for(const f of ['js/systems/move-control.js','js/systems/move-pp.js','js/systems/player-stats.js','js/systems/mirror-snapshot.js','js/systems/mirror-recorder.js'])c.load(f);
 const p=c.player(4);p.addMove('tackle');G.Game={player:p,runClean:()=>!dirty,st:{time:0}};
 return{c,G,p,storage,dirty:v=>dirty=v,enabled:v=>enabled=v,tick:t=>{clock=t;G.Game.st.time=t;G.MirrorRecorder.tick(p,t,.02);},make:t=>G.MirrorSnapshot.make(p,{checkpoint:t,t}, {seconds:60,moving:40,casts:{tackle:20}})};
}
test('combat-only snapshots retain eight IVs, stats, slots, PP, buffs, gear and ability flags',()=>{
 const b=battle();b.p.ability='pressure';Object.assign(b.G.Abilities.state(b.p),{naturalReady:true,sturdyUsed:false,phaseInside:false,confidence:[1,2]});b.p.specialItems={leftovers:2};b.p.tempPP=20;b.p.buffs.regen={n:2,t:3,amount:.1};const s=b.make(240);
 assert.ok(s);assert.equal(s.ivs.length,8);assert.equal(s.moves[0].id,'tackle');assert.ok(s.moves[0].pp.max>0);assert.deepEqual(Array.from(s.slots[0]),['tackle']);assert.equal(s.modifiers.tempPP,20);assert.equal(s.items.leftovers,2);assert.equal(s.abilityState.naturalReady,true);assert.equal(s.buffs.regen.n,2);assert.equal(s.style,'melee');
 const n=rules.MirrorSnapshot.normalize({...JSON.parse(JSON.stringify(s)),password:'never persist',cookie:'secret'});assert.ok(n);assert.equal(n.password,undefined);assert.equal(n.cookie,undefined);
});
test('normalization rejects invalid clocks, stats, IVs, unknown skills and malformed slots',()=>{
 const b=battle(),s=JSON.parse(JSON.stringify(b.make(240)));
 for(const edit of [x=>x.t=239,x=>x.t=243,x=>x.maxHp=Infinity,x=>x.hp=0,x=>x.ivs[0]=32,x=>x.effective.atk=NaN,x=>x.moves[0].id='arbitrary',x=>x.slots[0]=['unknown'],x=>x.active=7,x=>x.types=['unknown']]){const n=structuredClone(s);edit(n);assert.equal(rules.MirrorSnapshot.normalize(n),null);}
});
test('crossing each checkpoint records exactly once, while a late clock jump fabricates no earlier samples',()=>{
 const b=battle(),r='test-run-1234';b.G.MirrorRecorder.begin(r,b.p);b.tick(239.9);assert.equal(b.G.MirrorRecorder.pending(r).length,0);
 for(const t of [240,480,720,960,1200]){b.tick(t);b.tick(t+.1);}assert.equal(b.G.MirrorRecorder.pending(r).length,5);assert.equal(JSON.parse([...b.storage.values()][0]).length,5);
 const c=battle();c.G.MirrorRecorder.begin(r,c.p);c.tick(1200);assert.equal(c.G.MirrorRecorder.pending(r).length,1);assert.equal(c.G.MirrorRecorder.pending(r)[0].snapshot.checkpoint,1200);
});
test('recorder excludes visitors, source builds, co-op, disabled capture and sessions marked dirty',()=>{
 for(const edit of [b=>b.G.DB.mode='guest',b=>b.G.Updater.version=null,b=>b.G.Coop.active=true,b=>b.enabled(false),b=>b.dirty(true)]){const b=battle();edit(b);b.G.MirrorRecorder.begin('test-run-1234',b.p);b.tick(240);assert.equal(b.G.MirrorRecorder.pending('test-run-1234').length,0);}
 const b=battle();b.G.MirrorRecorder.begin('test-run-1234',b.p);b.tick(240);b.dirty(true);b.tick(241);assert.equal(b.G.MirrorRecorder.pending('test-run-1234').length,0);
});
test('recent casts guide AI profiles, queues survive reload and acknowledgements are per account',()=>{
 const b=battle(),r='test-run-1234';b.G.MirrorRecorder.begin(r,b.p);b.G.Game.st.time=235;for(let i=0;i<7;i++)b.G.MirrorRecorder.cast(b.p,b.p.moves[0]);b.tick(240);
 assert.equal(b.G.MirrorRecorder.pending(r)[0].snapshot.behavior.casts.tackle,7);b.G.MirrorRecorder.stop();assert.equal(b.G.MirrorRecorder.pending(r).length,1);
 b.G.Server.user={uid:'other'};assert.equal(b.G.MirrorRecorder.pending(r).length,0);b.G.Server.user={uid:'owner'};b.G.MirrorRecorder.ack({accepted:[r+':240']});assert.equal(b.G.MirrorRecorder.pending(r).length,0);
});
test('storage failures and background upload outages never escape into gameplay',async()=>{
 const b=battle(),r='test-run-1234';b.G.MirrorRecorder.begin(r,b.p);b.tick(240);b.c.navigator.onLine=true;let requests=0;b.G.Server.api=async()=>{requests++;throw Error('offline');};await b.G.MirrorRecorder.flush();assert.equal(requests,1);assert.equal(b.G.MirrorRecorder.pending(r).length,1);
 b.c.localStorage.setItem=()=>{throw Error('quota');};assert.doesNotThrow(()=>b.tick(480));
});
async function fixture(t,opts={}){
 let now=Date.now();const app=createApp({dbFile:':memory:',now:()=>now,...opts});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());
 const uid=randomUUID(),token=randomBytes(32).toString('hex'),s=fresh('MirrorFixture');s.partner=s.starter=4;s.owned[4]={iv:Array(8).fill(20)};
 app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,'MirrorFixture',uid,'unused','unused',now);app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));app.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),uid,now+30*864e5);
 const base='http://127.0.0.1:'+app.server.address().port;
 async function api(route,data,auth=true){const r=await fetch(base+'/api'+route,{method:data?'POST':'GET',headers:{...(auth?{Cookie:'ps_session='+token}:{}),...(data?{'Content-Type':'application/json','X-PS-Client':'1'}:{})},...(data?{body:JSON.stringify(data)}:{})});return{status:r.status,...await r.json()};}
 const sample=battle().make(240);
 async function start(){return(await api('/run/start',{dex:4,stars:1,clean:true,mode:'s'})).id;}
 function row(run,checkpoint=240){return{id:run+':'+checkpoint,run,at:now,clean:true,build:'0123456789',snapshot:{...sample,checkpoint,t:checkpoint}};}
 return{app,uid,api,start,row,tick:n=>now+=n,count:()=>app.db.prepare('SELECT COUNT(*) AS n FROM mirror_snapshots').get().n};
}
test('heartbeat stores compressed snapshots and acknowledges idempotent retries without changing run rewards',async t=>{
 const f=await fixture(t),id=await f.start(),before=f.app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(f.uid).payload;
 const b={id,t:240,alive:true,clean:true,kills:0,mirrors:[f.row(id)]},r=await f.api('/run/beat',b);assert.equal(r.status,200);assert.deepEqual(r.mirrors.accepted,[id+':240']);assert.equal(f.count(),1);
 const saved=f.app.db.prepare('SELECT * FROM mirror_snapshots').get();assert.equal(JSON.parse(gunzipSync(saved.payload)).dex,4);assert.ok(saved.payload.length<saved.bytes);assert.equal(saved.stars,1);
 assert.equal((await f.api('/run/beat',b)).status,200);assert.equal(f.count(),1);assert.equal(JSON.parse(before).coins,JSON.parse(f.app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(f.uid).payload).coins);
});
test('batch waits for ordinary run progress, accepts after end, and cannot read another account or leak snapshots',async t=>{
 const f=await fixture(t),id=await f.start(),row=f.row(id);
 assert.deepEqual((await f.api('/mirrors/batch',{records:[row]})).retry,[row.id]);await f.api('/run/end',{id,t:240,alive:true,clean:true,kills:0});assert.deepEqual((await f.api('/mirrors/batch',{records:[row]})).accepted,[row.id]);
 assert.equal((await f.api('/mirrors/batch',{records:[row]},false)).status,401);assert.equal((await f.api('/mirrors/batch',undefined)).status,405);
 const other=randomUUID();f.app.db.prepare('UPDATE runs SET uid=? WHERE id=?').run(f.uid,id);const foreign={...row,id:other+':240',run:other};assert.deepEqual((await f.api('/mirrors/batch',{records:[foreign]})).retry,[foreign.id]);assert.equal(f.count(),1);
});
test('bad samples do not reject gameplay and a later dirty heartbeat removes previously recorded mirrors',async t=>{
 const f=await fixture(t),id=await f.start(),row=f.row(id);const bad={...row,snapshot:{...row.snapshot,moves:[{id:'malicious'}]}};
 const r=await f.api('/run/beat',{id,t:240,clean:true,alive:true,kills:0,mirrors:[bad]});assert.equal(r.status,200);assert.deepEqual(r.mirrors.discarded,[row.id]);assert.equal(f.count(),0);
 await f.api('/run/beat',{id,t:240,clean:true,alive:true,kills:0,mirrors:[row]});assert.equal(f.count(),1);
 assert.equal((await f.api('/run/beat',{id,t:241,clean:false,alive:true,kills:0})).status,200);assert.equal(f.count(),0);assert.deepEqual((await f.api('/mirrors/batch',{records:[row]})).discarded,[row.id]);
});
test('kill switch is advertised and never prevents normal run settlement',async t=>{
 const f=await fixture(t,{mirrorRecorder:false}),id=await f.start();assert.equal((await f.api('/health')).mirrorRecorder,0);
 const r=await f.api('/run/end',{id,t:240,clean:true,alive:true,kills:0,mirrors:[f.row(id)]});assert.equal(r.status,200);assert.equal(f.count(),0);assert.equal(r.mirrors.discarded.length,1);
});
test('per-owner retention caps each checkpoint at three snapshots',async t=>{
 const f=await fixture(t);for(let n=0;n<5;n++){const id=await f.start();assert.equal((await f.api('/run/end',{id,t:240,clean:true,alive:true,kills:0,mirrors:[f.row(id)]})).status,200);f.tick(1000);}assert.equal(f.count(),3);
});
