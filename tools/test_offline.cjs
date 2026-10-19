const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.join(__dirname,'..'),noop=()=>{},HOUR=3600000,clone=x=>JSON.parse(JSON.stringify(x));
function context(){
  const storage=new Map(),handlers={},intervals=[];
  const s={console,Math:Object.create(Math),JSON,Map,Set,TextEncoder,Uint8Array,Promise,now:1800000000000,
    performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval:noop,
    addEventListener:(k,fn)=>{handlers[k]=fn;},matchMedia:()=>({matches:false}),location:{pathname:'/',protocol:'file:'},navigator:{language:'zh-CN'},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{hidden:false,documentElement:{},addEventListener:(k,fn)=>{handlers[k]=fn;}},CanvasRenderingContext2D:function(){}};
  s.Date=class extends Date{static now(){return s.now;}};s.window=s;s.G={};vm.createContext(s);
  s.load=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),s,{filename:f});
  for(const f of ['js/core/util.js','js/core/i18n.js','js/data/pokedex.js','js/systems/offline.js'])s.load(f);
  const G=s.G;G.FIREBASE_CONFIG=null;
  vm.runInContext(fs.readFileSync(path.join(ROOT,'js/core/db.js'),'utf8').replace('ready, register, login,',
    "_test:{newSave,migrate,sanitize,cloud(data,server){save=data;key=uid='cloud-test';user='CloudTest';guest=false;mode='cloud';fs=server;}}, ready, register, login,"),s);
  G.DB.playAsGuest();G.UI={refreshCoins:noop};G.OfflineUI={setReport:r=>s.report=r,pending:noop};
  s.firebase={firestore:{FieldValue:{serverTimestamp:()=>s.now}}};
  let seed=314159;s.Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  s.handlers=handlers;s.intervals=intervals;return s;
}
test('empty and complete collections exactly hit all six specified hourly endpoints',()=>{
  const {G}=context(),s=G.DB.save,O=G.Offline;let r=O.rates(s);assert.equal(r.coins,100);assert.equal(r.tickets,1);assert.equal(r.gems,.5);
  s.owned=Object.fromEntries(G.DEX.map(p=>[p.dex,{}]));s.shiny=clone(s.owned);r=O.rates(s);
  assert.equal(r.coins,5000);assert.equal(r.tickets,5);assert.equal(r.gems,2);
});
test('coin gains diminish, shiny weight is ten, and rare reward rates depend on shinies rather than ordinary entries',()=>{
  const {G}=context(),s=G.DB.save,O=G.Offline,ids=G.DEX.map(p=>p.dex);
  const coins=n=>{s.owned=Object.fromEntries(ids.slice(0,n).map(d=>[d,{}]));return O.rates(s).coins;};
  const first=coins(1)-coins(0),last=coins(901)-coins(900);assert.ok(first>last);
  const ten=coins(10);s.owned={};s.shiny={[ids[0]]:{}};assert.equal(O.rates(s).coins,ten);
  s.shiny={};coins(966);assert.equal(O.rates(s).tickets,1);assert.equal(O.rates(s).gems,.5);
  s.shiny={[ids[0]]:{}};assert.ok(O.rates(s).tickets>1);assert.ok(O.rates(s).gems>.5);
});
test('first visit starts the clock, fractional coins carry forward, same timestamp never pays twice and there is no daily cap',()=>{
  const s=context(),{G}=s,p=G.DB.save,O=G.Offline;s.Math.random=()=>0;
  assert.equal(O.claim(p,s.now).coins,0);const start=p.coins;
  for(let i=0;i<360;i++){s.now+=10000;O.claim(p,s.now);}assert.equal(p.coins-start,100);
  assert.equal(O.claim(p,s.now).coins,0);s.now+=HOUR*72;assert.equal(O.claim(p,s.now).coins,7200);
  const cursor=p.offline.seen;assert.equal(O.claim(p,s.now-HOUR).coins,0);assert.equal(p.offline.seen,cursor);
});
test('random ticket and gem drops have the requested means across zero-collection and full-shiny rates',()=>{
  const {G}=context();for(const mean of [1,.5,5,2]){let sum=0;for(let i=0;i<20000;i++)sum+=G.Offline.poisson(mean);assert.ok(Math.abs(sum/20000-mean)<.055,`${sum/20000} vs ${mean}`);}
});
test('departure rates apply to the away period and new collection rates only apply afterwards',()=>{
  const s=context(),{G}=s,p=G.DB.save,O=G.Offline;O.stamp(p,s.now);p.owned=Object.fromEntries(G.DEX.map(p=>[p.dex,{}]));p.shiny=clone(p.owned);
  s.now+=HOUR;assert.equal(O.claim(p,s.now).coins,100);s.now+=HOUR;assert.equal(O.claim(p,s.now).coins,5000);
});
test('guests receive no settlement, registered local accounts persist rewards and cursors across login',async()=>{
  const s=context(),{G}=s;assert.equal(await G.DB.settleOffline(s.now),null);assert.equal(G.DB.save.offline.seen,0);
  await G.DB.register('IdleTest','test-only');await G.DB.settleOffline(s.now);s.now+=HOUR;
  const r=await G.DB.settleOffline(s.now);assert.equal(r.coins,100);const coins=G.DB.save.coins;
  assert.equal((await G.DB.settleOffline(s.now)).coins,0);await G.DB.logout();await G.DB.login('IdleTest','test-only');assert.equal(G.DB.save.coins,coins);assert.equal(G.DB.save.offline.seen,s.now);
});
test('offline merge preserves already credited rewards even when a newer stale client spent currency, and is idempotent',()=>{
  const s=context(),{G}=s,a=G.DB.save;G.Offline.stamp(a,s.now);const b=clone(a);
  s.now+=HOUR;G.Offline.claim(a,s.now);a.updated=1;b.coins-=50;b.updated=2;G.Offline.stamp(b,s.now+1);
  const m=G.DB.merge(b,a);assert.equal(m.coins,a.coins-50);assert.equal(m.offline.total.coins,100);assert.equal(m.offline.seen,s.now+1);
  assert.equal(G.DB.merge(m,a).coins,m.coins);assert.equal(G.DB.merge(a,m).coins,m.coins);
});
test('active heartbeat yields no income, hidden time settles once on return, and logout stops tracking',async()=>{
  const s=context(),{G}=s;await G.DB.register('RuntimeTest','test-only');G.Offline.init();G.Offline.start();await new Promise(setImmediate);
  const coins=G.DB.save.coins;s.now+=HOUR;s.intervals.at(-1)();assert.equal(G.DB.save.coins,coins);
  s.document.hidden=true;s.handlers.visibilitychange();s.now+=HOUR;s.intervals.at(-1)();assert.equal(G.DB.save.coins,coins);
  s.document.hidden=false;s.handlers.visibilitychange();await new Promise(setImmediate);assert.equal(s.report.coins,100);assert.equal(G.DB.save.coins,coins+100);
  await G.DB.logout();assert.doesNotThrow(()=>s.intervals.at(-1)());
});

test('self-hosted routine presence does not upload the full save every thirty seconds',async()=>{
  const s=context(),{G}=s,save=G.DB.save;let full=0,presence=0;
  G.DB={save,guest:false,user:'ServerFixture',mode:'server',loggedIn:true,onLeave:()=>{},settleOffline:async()=>null,commit:()=>full++};
  G.Server={presence:()=>{presence++;}};G.Offline.init();G.Offline.start();await new Promise(setImmediate);
  const initial=full;for(let i=0;i<5;i++)s.intervals.at(-1)();assert.equal(full,initial);assert.equal(presence,5);
  s.document.hidden=true;s.handlers.visibilitychange();assert.equal(presence,6);assert.equal(full,initial);
});
test('cloud transaction serializes simultaneous devices and pays an overlapping absence once',async()=>{
  const a=context(),b=context(),base=clone(a.G.DB.save);a.G.Offline.stamp(base,a.now);let remote=base,chain=Promise.resolve();
  const server={collection:()=>({doc:()=>({})}),runTransaction:fn=>{const job=chain.then(()=>fn({get:async()=>({exists:true,data:()=>({save:clone(remote)})}),set:(ref,doc)=>{remote=clone(doc.save);}}));chain=job.catch(noop);return job;}};
  a.G.DB._test.cloud(clone(base),server);b.G.DB._test.cloud(clone(base),server);a.now+=HOUR;b.now=a.now;
  const rewards=await Promise.all([a.G.DB.settleOffline(a.now),b.G.DB.settleOffline(b.now)]);
  assert.equal(rewards.reduce((sum,r)=>sum+r.coins,0),100);assert.equal(remote.coins,base.coins+100);assert.equal(a.G.DB.save.coins,remote.coins);assert.equal(b.G.DB.save.coins,remote.coins);
});
test('failed cloud settlement leaves both cursor and wallet unchanged so a later retry can settle',async()=>{
  const s=context(),{G}=s,p=clone(G.DB.save);G.Offline.stamp(p,s.now);s.now+=HOUR;
  G.DB._test.cloud(p,{collection:()=>({doc:()=>({})}),runTransaction:()=>Promise.reject(new Error('offline'))});
  const before=JSON.stringify(G.DB.save);await assert.rejects(G.DB.settleOffline(s.now),/offline/);assert.equal(JSON.stringify(G.DB.save),before);
});
