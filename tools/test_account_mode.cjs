"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {webcrypto,randomUUID}=require('node:crypto'),{once}=require('node:events');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const ROOT=path.join(__dirname,'..'),noop=()=>{},PASS='isolated-account-fixture-only';
function browser({url='https://accounts.example/',storage=new Map(),fetcher=()=>Promise.reject(new TypeError('offline'))}={}) {
  const s={console,Math,JSON,Map,Set,TextEncoder,Uint8Array,Promise,AbortController,crypto:webcrypto,
    location:new URL(url),navigator:{onLine:true},setTimeout:noop,clearTimeout:noop,setInterval:noop,clearInterval:noop,
    addEventListener:noop,document:{hidden:false,addEventListener:noop},fetch:fetcher,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
  s.window=s;s.G={I18n:{lang:'zh'},UI:{toast:noop},SelfNet:{on:noop,disconnect:noop}};vm.createContext(s);
  for(const file of ['js/core/db.js','js/net/server-client.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),s,{filename:file});
  return {...s.G,storage};
}
async function legacy() {
  const storage=new Map(),b=browser({url:'file:///game/dev.html',storage});
  await b.DB.ready();assert.equal((await b.DB.register('AccountFixture',PASS)).ok,true);
  b.DB.save.coins=777777;b.DB.save.partner=6;b.DB.commit();return storage;
}
async function fixture(t) {
  const app=createApp({dbFile:':memory:'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());
  const base='http://127.0.0.1:'+app.server.address().port,uid=randomUUID(),save=fresh('AccountFixture');save.partner=1;save.coins=321;
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,'AccountFixture','accountfixture',await hashPassword(PASS),'unused',Date.now());
  app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(save));
  let cookie='',health='ok';
  const fetcher=async(route,options={})=>{
    if(route==='/api/health') {
      if(health==='offline')throw new TypeError('offline');
      if(health==='404')return new Response('<html>missing</html>',{status:404});
    }
    const res=await fetch(base+route,{...options,headers:{...options.headers,...(cookie?{Cookie:cookie}:{})}});
    const next=res.headers.get('set-cookie');if(next)cookie=next.split(';')[0];return res;
  };
  return {app,uid,base,fetcher,setHealth:v=>health=v};
}
test('web API failures never restore or create a legacy account with the same name',async()=>{
  for(const fetcher of [()=>Promise.reject(new TypeError('offline')),()=>Promise.reject(Object.assign(new Error('aborted'),{name:'AbortError'})),
    ()=>Promise.resolve(new Response('{"error":"unavailable"}',{status:503})),()=>Promise.resolve(new Response('<html>gateway</html>',{status:502})),
    ()=>Promise.resolve(new Response('<html>missing</html>',{status:404})),()=>Promise.resolve(new Response('{"ok":true,"protocol":99}',{status:200}))]) {
    const storage=await legacy(),before=JSON.stringify([...storage]),b=browser({storage,fetcher});
    assert.equal(await b.DB.ready(),false);assert.equal(b.DB.mode,'server');assert.equal(b.DB.loggedIn,false);
    const result=await b.DB.register('AccountFixture',PASS);assert.equal(result.ok,false);assert.match(result.error,/账号服务器/);
    assert.equal(JSON.stringify([...storage]),before);
    b.DB.playAsGuest();assert.equal(b.DB.guest,true);assert.equal(JSON.stringify([...storage]),before);
  }
});
test('recovery returns the fixed server identity, rejects duplicate registration and preserves legacy data',async t=>{
  const f=await fixture(t),storage=await legacy(),local=storage.get('ps.save.accountfixture');f.setHealth('offline');
  const b=browser({storage,fetcher:f.fetcher});assert.equal(await b.DB.ready(),false);
  f.setHealth('ok');assert.equal((await b.DB.login('AccountFixture',PASS)).ok,true);
  assert.equal(b.DB.fb.uid,f.uid);assert.equal(b.DB.save.coins,321);assert.equal(b.DB.save.partner,1);
  assert.equal((await b.DB.register('aCCOUNTfIXTURE',PASS)).ok,false);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,1);
  assert.equal(storage.get('ps.save.accountfixture'),local);
  const again=browser({storage,fetcher:f.fetcher});assert.equal(await again.DB.ready(),true);assert.equal(again.DB.fb.uid,f.uid);assert.equal(again.DB.save.coins,321);
});
test('retry can restore the existing server session after a failed startup probe',async t=>{
  const f=await fixture(t),first=browser({fetcher:f.fetcher});await first.DB.ready();await first.DB.login('AccountFixture',PASS);
  f.setHealth('offline');const b=browser({fetcher:f.fetcher});assert.equal(await b.DB.ready(),false);
  f.setHealth('ok');const result=await b.DB.retryConnection();assert.equal(result.ok,true);assert.equal(result.restored,true);assert.equal(b.DB.fb.uid,f.uid);
});
test('static loopback preview stays available but an established server origin never falls back on 404',async t=>{
  const absent=()=>Promise.resolve(new Response('<html>Not found</html>',{status:404}));
  const local=browser({url:'http://127.0.0.1:8001/',fetcher:absent});await local.DB.ready();assert.equal(local.DB.mode,'local');assert.equal((await local.DB.register('StaticFixture',PASS)).ok,true);
  const f=await fixture(t),storage=await legacy(),first=browser({url:'http://localhost:8000/',storage,fetcher:f.fetcher});await first.DB.ready();
  const b=browser({url:'http://localhost:8000/',storage,fetcher:absent});assert.equal(await b.DB.ready(),false);assert.equal(b.DB.mode,'server');assert.equal(b.DB.loggedIn,false);
  const unknown=browser({url:'http://127.0.0.1:8000/'});await unknown.DB.ready();assert.equal(unknown.DB.mode,'server');
});
test('legacy backup preserves separate save data without credentials or session state',async()=>{
  const storage=await legacy(),before=JSON.stringify([...storage]),b=browser({storage});await b.DB.ready();
  const backup=b.DB.legacyBackup();assert.equal(backup.entries.length,1);assert.equal(backup.entries[0].save.coins,777777);assert.equal(backup.entries[0].name,'AccountFixture');
  const json=JSON.stringify(backup);for(const secret of ['salt','hash','ps.session',PASS])assert.ok(!json.includes(secret));
  assert.equal(JSON.stringify([...storage]),before);
});
test('database uniqueness survives simultaneous same-name registrations',async t=>{
  const f=await fixture(t);
  const responses=await Promise.all(Array.from({length:4},()=>fetch(f.base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json','X-PS-Client':'1'},body:JSON.stringify({name:'UniqueFixture',pass:PASS})})));
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,409,409,409]);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM users WHERE lower=?').get('uniquefixture').n,1);
});
