// Real HTTP + browser save code, isolated databases and fake outages only.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {randomUUID,randomBytes,createHash,webcrypto}=require('node:crypto'),{once}=require('node:events'),{WebSocket}=require('../server/node_modules/ws');
const {createApp}=require('../server/server.cjs'),{G:rules,fresh}=require('../server/domain.cjs'),noop=()=>{};
async function fixture(t){
 let now=Date.now();const app=createApp({dbFile:':memory:',now:()=>now,stunUrls:'none'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const base='http://127.0.0.1:'+app.server.address().port,uid=randomUUID(),token=randomBytes(32).toString('hex'),cookie='ps_session='+token,s=fresh('RecoveryFixture');s.partner=s.starter=4;s.owned[4]={iv:Array(8).fill(20)};s.coins=100;
 app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,s.name||'RecoveryFixture',uid,'unused','unused',now);app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));app.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),uid,now+30*864e5);
 async function request(route,data){const r=await fetch(base+'/api'+route,{method:data?'POST':'GET',headers:{Cookie:cookie,...(data?{'Content-Type':'application/json','X-PS-Client':'1'}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,...await r.json()};}
 function browser(storage=new Map()){
  let offline=false,lose=false;const toasts=[],listeners={},s={console,Math,JSON,Date,Map,Set,TextEncoder,Uint8Array,Promise,AbortController,crypto:webcrypto,location:new URL(base),navigator:{onLine:true},setTimeout:noop,clearTimeout:noop,setInterval:noop,clearInterval:noop,addEventListener:(k,f)=>listeners[k]=f,document:{hidden:false,addEventListener:noop},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:async(route,options={})=>{if(offline)throw TypeError('offline');const r=await fetch(base+route,{...options,headers:{...options.headers,Cookie:cookie}});if(lose&&route==='/api/save'){lose=false;throw TypeError('response lost after commit');}return r;}};s.window=s;s.G={I18n:{lang:'zh'},UI:{toast:m=>toasts.push(m),refreshCoins:noop},SelfNet:{on:noop,disconnect:noop},Settings:{get:()=>1},CardPacks:rules.CardPacks,ZAccess:rules.ZAccess};vm.createContext(s);for(const file of ['js/core/db.js','js/systems/save-sync.js','js/net/server-client.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),s,{filename:file});
  return {G:s.G,storage,toasts,listeners,offline:v=>offline=v,loseNextSave:()=>lose=true};
 }
 return {app,uid,cookie,base,request,browser,tick:ms=>now+=ms,read:()=>JSON.parse(app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(uid).payload)};
}
test('lost save response retries the same operation exactly once and retains edits made afterwards',async t=>{
 const f=await fixture(t),b=f.browser();await b.G.DB.ready();await b.G.Server.flush();b.G.DB.save.coins+=100;b.G.DB.commit();b.loseNextSave();await assert.rejects(b.G.Server.flush());assert.equal(f.read().coins,200);const lostId=JSON.parse(b.storage.get('ps.selfhost.'+f.uid)).pending.operation;
 await b.G.Server.presence();assert.equal(b.G.DB.save.coins,200);b.G.DB.save.coins+=7;b.G.DB.commit();await b.G.Server.flush();assert.equal(b.G.DB.save.coins,207);await b.G.Server.flush();assert.equal(f.read().coins,207);assert.equal(b.G.Server.conflict,false);
 assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM save_operations WHERE uid=? AND operation=?').get(f.uid,lostId).n,1);
});
test('simultaneous devices merge independent wallet deltas and collections without reload or overwrite',async t=>{
 const f=await fixture(t),a=f.browser(),b=f.browser();await a.G.DB.ready();await b.G.DB.ready();a.G.DB.save.coins+=50;a.G.DB.save.owned[7]={iv:Array(8).fill(15)};a.G.DB.commit();b.G.DB.save.coins+=80;b.G.DB.save.owned[25]={iv:Array(8).fill(25)};b.G.DB.commit();await Promise.all([a.G.Server.flush(),b.G.Server.flush()]);assert.equal(f.read().coins,230);assert.ok(f.read().owned[7]&&f.read().owned[25]);await a.G.Server.presence();assert.equal(a.G.DB.save.coins,230);assert.equal(a.G.Server.conflict,false);
});
test('pending local save survives reload even when the remote revision changed',async t=>{
 const f=await fixture(t),a=f.browser(),b=f.browser();await a.G.DB.ready();await b.G.DB.ready();a.offline(true);a.G.DB.save.coins+=75;a.G.DB.commit();await assert.rejects(a.G.Server.flush());b.G.DB.save.coins+=30;b.G.DB.commit();await b.G.Server.flush();
 const restored=f.browser(a.storage);assert.equal(await restored.G.DB.ready(),true);await restored.G.Server.flush();assert.equal(restored.G.DB.save.coins,205);assert.equal(f.read().coins,205);
});
test('multiple offline run endings stay queued and sync after a long gap, including runs started offline',async t=>{
 const f=await fixture(t),b=f.browser();await b.G.DB.ready();b.G.Game={st:{time:0},speed:1,runClean:()=>true,player:{hp:100,maxHp:100,dead:false,level:3,kills:0},scoreCounts:()=>({normal:0,elite:0,boss:0,rift:0,events:0})};b.offline(true);
 for(const seconds of [3600,9000]){const r=await b.G.Server.prepareRun('s',4,1);assert.ok(r.id);b.G.Game.st.time=seconds;b.G.DB.save.coins+=15;b.G.DB.commit();await assert.rejects(b.G.Server.finish(true,false));}
 const key='ps.pending-runs.'+f.uid;assert.equal(JSON.parse(b.storage.get(key)).length,2);b.storage.set('ps.pending-run.'+f.uid,JSON.stringify(JSON.parse(b.storage.get(key))[0]));f.tick(864e5);b.offline(false);await b.G.Server.flush();await b.G.Server.retryRuns();assert.equal(JSON.parse(b.storage.get(key)).length,0);assert.equal(b.storage.has('ps.pending-run.'+f.uid),false);assert.equal(f.read().coins,130);assert.equal(f.read().difficulty.cleared[1],true);assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM runs WHERE ended=1').get().n,2);await b.G.Server.retryRuns();assert.equal(f.read().coins,130);
});
test('a long idle gap and stale presence revision do not invalidate a run or ordinary save',async t=>{
 const f=await fixture(t),start=await f.request('/run/start',{dex:4,stars:1,clean:true});f.tick(6*3600e3);const p=await f.request('/presence',{rev:0});assert.equal(p.status,200);assert.ok(p.save);
 const r=await f.request('/run/end',{id:start.id,t:20000,clean:true,alive:true,kills:0});assert.equal(r.status,200);assert.equal(r.save.difficulty.cleared[1],true);
});
test('same-account social connections coexist and closing a secondary page cannot kick the primary',async t=>{
 const f=await fixture(t),connect=()=>new WebSocket(f.base.replace('http:','ws:')+'/ws',{headers:{Cookie:f.cookie}}),a=connect();await once(a,'open');const b=connect();await once(b,'open');assert.equal(a.readyState,WebSocket.OPEN);assert.equal(f.app.sockets.get(f.uid).readyState,WebSocket.OPEN);b.close();await once(b,'close');assert.equal(a.readyState,WebSocket.OPEN);a.close();
});

test('shared pack transactions refresh a stale revision automatically without duplicating remote income',async t=>{
 const f=await fixture(t),b=f.browser();await b.G.DB.ready();b.G.DB.save.coins=2000;b.G.DB.commit();await b.G.Server.flush();const remote=await f.request('/session');remote.save.coins+=100;assert.equal((await f.request('/save',{rev:remote.rev,save:remote.save})).status,200);
 await b.G.Server.packAction({action:'draw',pack:'beginner'});assert.equal(b.G.DB.save.coins,1300);assert.equal(f.read().coins,1300);assert.equal(b.G.Server.conflict,false);assert.ok(b.G.DB.save.cardPack.pending);
});

test('late heartbeat snapshots are acknowledged without rolling back progress or replaying Boss loot',async t=>{
 const f=await fixture(t),start=await f.request('/run/start',{dex:4,stars:1,clean:true}),newer={id:start.id,t:100,alive:true,clean:true,kills:1,scoreCounts:{normal:1,elite:0,boss:0,rift:0,events:0}};assert.equal((await f.request('/run/beat',newer)).status,200);
 const old=await f.request('/run/beat',{...newer,t:99.8,kills:0,scoreCounts:{normal:0,elite:0,boss:0,rift:0,events:0}});assert.equal(old.status,200);const row=f.app.db.prepare('SELECT t,score_counts FROM runs WHERE id=?').get(start.id);assert.equal(row.t,100);assert.equal(JSON.parse(row.score_counts).normal,1);
});
