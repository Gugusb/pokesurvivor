const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.join(__dirname,'..'),noop=()=>{},copy=x=>JSON.parse(JSON.stringify(x));
function context(){
  const storage=new Map(),s={console,Math,Date,JSON,Map,Set,TextEncoder,Uint8Array,Promise,
    performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,setInterval:noop,addEventListener:noop,
    matchMedia:()=>({matches:false}),location:{pathname:'/',protocol:'file:'},navigator:{language:'zh-CN'},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{documentElement:{},addEventListener:noop},CanvasRenderingContext2D:function(){}};
  s.window=s;vm.createContext(s);const load=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),s,{filename:f});
  for(const f of ['js/core/util.js','js/core/i18n.js','js/data/pokedex.js','js/systems/difficulty.js'])load(f);
  s.G.FIREBASE_CONFIG=null;s.G.UI={refreshCoins:noop};s.firebase={firestore:{FieldValue:{serverTimestamp:()=>Date.now()}}};
  vm.runInContext(fs.readFileSync(path.join(ROOT,'js/core/db.js'),'utf8').replace('ready, register, login,',
    "_test:{migrate,sanitize,cloud(data,server){save=data;key=uid='victory-test';user='VictoryTest';guest=false;mode='cloud';fs=server;}}, ready, register, login,"),s);
  s.G.DB.playAsGuest();s.run=()=>{const r=s.G.Difficulty.begin(s.G.DB.save,6,1);s.G.Difficulty.record(s.G.DB.save,r,1201,true,true);return r;};return s;
}

test('Firestore serializes simultaneous device cashouts and credits one full double payout with one receipt',async()=>{
  const a=context(),b=context();const base=copy(a.G.DB.save);base.difficulty.cleared[1]=true;
  let remote=base,chain=Promise.resolve();
  const server={collection:()=>({doc:()=>({})}),runTransaction:fn=>{
    const job=chain.then(()=>fn({get:async()=>({exists:true,data:()=>({save:copy(remote),ban:true})}),set:(ref,doc)=>{assert.equal(doc.ban,true);remote=copy(doc.save);}}));
    chain=job.catch(noop);return job;
  }};
  a.G.DB._test.cloud(copy(base),server);b.G.DB._test.cloud(copy(base),server);
  const rewards=await Promise.all([a.G.DB.claimVictoryBonus(a.run(),240),b.G.DB.claimVictoryBonus(b.run(),240)]);
  assert.equal(rewards.reduce((n,x)=>n+x,0),240);assert.equal(remote.coins,base.coins+480);assert.equal(remote.stats.coinsEarned,480);
  assert.equal(a.G.DB.save.coins,remote.coins);assert.equal(b.G.DB.save.coins,remote.coins);assert.equal(remote.difficulty.cashouts[1].coins,480);
  assert.equal(await a.G.DB.claimVictoryBonus(a.run(),240),0);assert.equal(remote.coins,base.coins+480);
});

test('failed cloud claims consume neither the opportunity nor coins, and a later retry pays normally',async()=>{
  const s=context(),{G}=s,base=copy(G.DB.save);base.difficulty.cleared[1]=true;
  G.DB._test.cloud(base,{collection:()=>({doc:()=>({})}),runTransaction:()=>Promise.reject(new Error('offline'))});
  const run=s.run(),before=JSON.stringify(G.DB.save),coinsBefore=G.DB.save.coins;await assert.rejects(G.DB.claimVictoryBonus(run,240),/offline/);
  assert.equal(JSON.stringify(G.DB.save),before);assert.equal(G.Difficulty.bonusAvailable(G.DB.save,1),true);
  let remote=copy(G.DB.save);G.DB._test.cloud(G.DB.save,{collection:()=>({doc:()=>({})}),runTransaction:async fn=>fn({get:async()=>({exists:true,data:()=>({save:copy(remote)})}),set:(ref,doc)=>remote=copy(doc.save)})});
  assert.equal(await G.DB.claimVictoryBonus(run,240),240);assert.equal(remote.coins,coinsBefore+480);
});

test('malformed bonus receipts are rejected, and stale saves cannot restore a consumed opportunity or erase its payout',()=>{
  const {G}=context(),save=G.DB.save,D=G.Difficulty;
  save.difficulty.cashouts={1:{coins:-100,at:10},2:{coins:Infinity,at:10},3:{coins:100,at:NaN},4:{coins:480,at:10}};
  G.DB._test.sanitize(save);assert.deepEqual(Object.keys(save.difficulty.cashouts),['4']);
  assert.equal(D.bonusAvailable(save,1),true);assert.equal(D.bonusAvailable(save,4),false);
  const stale=copy(save);stale.difficulty.cashouts={};stale.coins=200;stale.updated=save.updated+100;
  const merged=G.DB.merge(stale,save);assert.equal(merged.coins,680);assert.equal(D.bonusAvailable(merged,4),false);
  assert.equal(G.DB.merge(merged,save).coins,680);assert.equal(G.DB.merge(save,merged).coins,680);
});
