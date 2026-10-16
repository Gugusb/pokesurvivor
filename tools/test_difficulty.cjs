const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.join(__dirname, '..'), noop = () => {}, close = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);
function context() {
  const store = new Map(), s = { console, Math, Date, JSON, Map, Set, TextEncoder, Uint8Array, Promise,
    now: 2000000, performance: { now: () => s.now }, setTimeout: noop, clearTimeout: noop, setInterval: noop, addEventListener: noop,
    matchMedia: () => ({matches:false}), location: {pathname:'/',protocol:'file:'}, navigator: {language:'zh-CN'},
    localStorage: {getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    document: {documentElement:{},addEventListener:noop}, CanvasRenderingContext2D: function(){} };
  s.window=s;s.G={};vm.createContext(s);s.load=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),s,{filename:f});
  for(const f of ['js/core/util.js','js/core/i18n.js','js/data/lang-en.js','js/data/lang-zh.js','js/data/pokedex.js','js/systems/difficulty.js'])s.load(f);
  const G=s.G;G.FIREBASE_CONFIG=null;
  vm.runInContext(fs.readFileSync(path.join(ROOT,'js/core/db.js'),'utf8').replace('ready, register, login,','_test:{newSave,migrate,sanitize}, ready, register, login,'),s);G.DB.playAsGuest();
  G.Sprites={PX:2,animMeta:()=>null,bodyRadius:()=>10,bodyHeight:()=>20,hovers:()=>false,Animator:class {play(){}},preload:noop};
  G.Coop={active:false,isHost:false,end:noop};G.Spawner={CAP:64};G.FX=new Proxy({},{get:()=>noop});G.Audio={sfx:noop,music:noop};G.Camera={kick:noop};
  s.load('js/entities/enemy.js');
  s.run=(stars=1,dex=6)=>G.Difficulty.begin(G.DB.save,dex,stars);
  s.enemy=(boss=false)=>new G.Enemy({dex:1,hp:1000,spd:20,dmg:100,xp:5,shotDmg:20,behavior:'ranged'},0,0,{hp:2,spd:1,dmg:3},boss);
  s.loadGame=(simulate=false)=>{
    G.UI={toast:(...v)=>(s.toasts||=[]).push(v),chrome:noop,isOpen:()=>false};G.Social={refreshMember:noop,me:null};
    G.Progress={event:noop,checkAch:noop};G.Judgment={summary:()=>null,reset:noop};G.Ranking={submitSolo:noop,submitGroup:noop};
    G.RunUI={showOver:r=>s.over=r};G.Flow={afterRun:noop};G.Settings={sample:noop};G.Input={tap:()=>false,endFrame:noop};G.UI.tick=noop;G.Dev={isOpen:false};G.SettingsUI={isOpen:false};
    let source=fs.readFileSync(path.join(ROOT,'js/game.js'),'utf8').replace('init, startRun, everyone,',
      "_test:{setRun(p,r,t,dirty=false){pl=p;challenge=r;time=t;tampered=dirty;runReal=1000;last=1000;state='playing';},checkChallenge,endRun,frame,clean,setState(v){state=v;}}, init, startRun, everyone,");
    if(simulate){s.testSteps=[];s.stopOnStep=false;source=source.replace('function update(dt) {',"function update(dt) { time+=dt;testSteps.push(dt);if(stopOnStep)state='levelup';return;").replace('function render() {','function render() {return;');}
    vm.runInContext(source,s);
    s.player=()=>({dex:6,mon:G.DEX_BY[6],dead:false,hp:100,maxHp:100,atkMul:1,spdMul:1,cdMul:1,level:2,coinMul:1,kills:0,bosses:0,coins:0,t1:0,t10:0,moves:[]});
  };
  return s;
}
test('every star keeps the original 5%/3% growth while the whole curve is scaled to 70% HP and 80% damage',()=>{
  const s=context(),D=s.G.Difficulty;
  close(D.factors(4).hp,0.7);close(D.factors(4).dmg,0.8);
  for(let n=1;n<8;n++){close(D.factors(n+1).hp/D.factors(n).hp,1.05);close(D.factors(n+1).dmg/D.factors(n).dmg,1.03);}
  s.run(4);let e=s.enemy();assert.equal(e.maxHp,1400);assert.equal(e.dmg,240);assert.equal(e.shotDmg(),48);
  s.run(8);e=s.enemy(true);assert.equal(e.maxHp,Math.round(2000*0.7*1.05**4));close(e.dmg,300*0.8*1.03**4);close(e.shotDmg(),60*0.8*1.03**4);
  assert.equal(e.spd,20);assert.equal(e.xp,5);
});

test('formal double speed uses two normal physics steps and remains eligible for a 20-minute victory after ten real minutes',()=>{
  const s=context(),G=s.G;s.loadGame(true);const p=s.player(),r=s.run();G.Game._test.setRun(p,r,0);
  assert.equal(G.Game.setSpeed(3),false);assert.equal(G.Game.setSpeed(2),true);
  for(let i=1;i<=36001;i++){s.now=1000+i*1000/60;G.Game._test.frame(s.now);}
  assert.equal(s.testSteps.length,72002);assert.ok(s.testSteps.every(dt=>dt<=1/30));assert.ok(G.Game.st.time>1200);
  assert.equal(G.Game._test.clean(),true);G.Game._test.checkChallenge();assert.equal(r.victory,true);
  G.Game.debugSpeed(2);assert.equal(G.Game._test.clean(),false);
});

test('double speed stops at the first level-up step and does not advance gameplay while paused',()=>{
  const s=context(),G=s.G;s.loadGame(true);const p=s.player();p.anim={update:noop};G.Game._test.setRun(p,s.run(),0);G.Game.setSpeed(2);s.stopOnStep=true;
  G.Game._test.frame(1016);assert.equal(s.testSteps.length,1);assert.equal(G.Game.state,'levelup');
  G.Game._test.setState('paused');G.Game._test.frame(1032);assert.equal(s.testSteps.length,1);
});

test('co-op speed is set by the host while guests follow host snapshots',()=>{
  const s=context(),G=s.G;s.loadGame();G.Game._test.setRun(s.player(),s.run(),0);G.Coop.active=true;
  assert.equal(G.Game.setSpeed(2),false);assert.equal(G.Game.speed,1);assert.equal(G.Game.setSpeed(2,true),true);assert.equal(G.Game.speed,2);
  G.Coop.isHost=true;assert.equal(G.Game.setSpeed(1),true);
});

test('original leaderboard accepts clean normal four-star runs but excludes easier tiers and any use of double speed',()=>{
  for(const [tier,double,expected] of [[4,false,1],[1,false,0],[4,true,0]]){
    const s=context(),G=s.G;s.loadGame();let sent=0;G.Ranking.submitSolo=()=>{sent++;};
    G.Game._test.setRun(s.player(),s.run(tier),1300);if(double){G.Game.setSpeed(2);G.Game.setSpeed(1);}
    G.Game._test.endRun(false);assert.equal(sent,expected);assert.equal(s.over.rankingExcluded,!expected);
  }
});
test('summons inherit the original spawn scale once; remote enemies keep host HP and damage unchanged',()=>{
  const s=context(),G=s.G;s.run(8);const e=s.enemy(true);e.summon();
  assert.equal(e.minions.length,2);assert.equal(e.minions[0].maxHp,Math.round(350*2*0.7*1.05**4));close(e.minions[0].dmg,60*3*0.8*1.03**4);
  const copy=G.EnemyMgr.addRemote({id:999,dex:1,hp:e.maxHp,dmg:e.dmg,x:0,y:0,boss:true});assert.equal(copy.maxHp,e.maxHp);close(copy.dmg,e.dmg);
});
test('new and legacy saves start at one star, and progression cannot skip a locked tier',()=>{
  const {G}=context(),D=G.Difficulty,s=G.DB.save;assert.equal(D.unlocked(s),1);assert.equal(D.select(s,4),false);
  let r=D.begin(s,6);assert.equal(r.stars,1);assert.equal(D.record(s,r,1200,true,true),false);assert.equal(D.unlocked(s),1);
  assert.equal(D.record(s,r,1200.01,true,true),true);assert.equal(D.unlocked(s),2);assert.equal(D.select(s,2),true);
  const locked=D.begin(s,6,4);assert.equal(D.record(s,locked,1300,true,true),false);assert.equal(D.unlocked(s),2);
  const old=G.DB._test.migrate({name:'old',stats:{bestTime:3600}},'old');assert.equal(old.v,6);assert.equal(D.unlocked(old),1);assert.deepEqual(Object.keys(old.difficultyRecords),[]);
});
test('medals and highest-difficulty best times belong to the actual base species, with all eight required for ruby',()=>{
  const {G}=context(),D=G.Difficulty,s=G.DB.save;
  for(let n=1;n<=8;n++){const r=D.begin(s,6,n);D.record(s,r,1250+n,true,true);assert.equal(D.frame(s,6),n===8?'ruby':n>=5?'emerald':'gold');}
  assert.equal(D.frame(s,25),'');assert.equal(D.highest(s,6).stars,8);assert.equal(D.highest(s,6).best,1258);
  const r=D.begin(s,25,8);D.record(s,r,100,false,true);assert.equal(D.frame(s,25),'');assert.equal(D.highest(s,25).stars,8);
  D.record(s,r,1500,true,true);assert.equal(D.frame(s,25),'gold');D.record(s,r,1400,true,true);assert.equal(D.highest(s,25).best,1500);
});
test('save merge unions clears and medals and takes per-tier max times; normalization rejects malformed records',()=>{
  const {G}=context(),D=G.Difficulty,a=G.DB.save;D.record(a,D.begin(a,6),1300,true,true);a.updated=10;
  const b=JSON.parse(JSON.stringify(a));D.select(b,2);D.record(b,D.begin(b,25),1400,true,true);b.updated=20;
  const m=G.DB.merge(a,b);assert.equal(D.unlocked(m),3);assert.equal(m.difficulty.selected,2);assert.equal(m.difficultyRecords[6][1].won,true);assert.equal(m.difficultyRecords[25][2].won,true);
  const twice=G.DB.merge(m,a);assert.equal(JSON.stringify(twice.difficultyRecords),JSON.stringify(m.difficultyRecords));
  m.difficulty.selected=99;m.difficultyRecords[999999]={1:{best:1400,won:true}};m.difficultyRecords[6][8]={best:Infinity,won:true};G.DB._test.sanitize(m);
  assert.equal(m.difficulty.selected,1);assert.equal(m.difficultyRecords[999999],undefined);assert.equal(m.difficultyRecords[6][8],undefined);
});
test('a registered local save persists selected tier, medals and record through logout/login',async()=>{
  const {G}=context();await G.DB.register('DifficultyTest','test-only');const s=G.DB.save,D=G.Difficulty;
  D.record(s,D.begin(s,6),1320,true,true);D.select(s,2);G.DB.commit(true);await G.DB.logout();await G.DB.login('DifficultyTest','test-only');
  assert.equal(G.DB.save.difficulty.selected,2);assert.equal(D.frame(G.DB.save,6),'gold');assert.equal(D.highest(G.DB.save,6).best,1320);
});
test('co-op chooses one tier within every member’s unlocked range, including legacy member fallback',()=>{
  const {G}=context(),s=G.DB.save,D=G.Difficulty;for(let n=1;n<=8;n++)s.difficulty.cleared[n]=true;s.difficulty.selected=7;
  assert.equal(D.partyLevel(s,[{difficultyLimit:8},{difficultyLimit:3}]),3);assert.equal(D.partyLevel(s,[{difficultyLimit:8},{}]),1);
  assert.equal(D.begin(s,6,3).stars,3);close(D.factors().hp,0.7/1.05);
});
test('real game checkpoint grants victory once after 20 minutes, keeps playing, then persists the longer end time',()=>{
  const s=context(),G=s.G;s.loadGame();const p=s.player(),r=s.run(1);G.Game._test.setRun(p,r,1200);G.Game._test.checkChallenge();assert.equal(r.victory,false);
  G.Game._test.setRun(p,r,1200.1);G.Game._test.checkChallenge();assert.equal(r.victory,true);assert.equal(G.Game.state,'playing');assert.equal(s.toasts.length,1);
  G.Game._test.checkChallenge();assert.equal(s.toasts.length,1);p.dead=true;G.Game._test.setRun(p,r,1500);G.Game._test.endRun(true);
  assert.equal(s.over.victory,true);assert.equal(s.over.difficulty,1);assert.equal(G.Difficulty.highest(G.DB.save,6).best,1500);
});
test('real game rejects debug or dead checkpoints and debug end times, while clean failed attempts retain time only',()=>{
  const s=context(),G=s.G;s.loadGame();const p=s.player();let r=s.run(1);
  G.Game._test.setRun(p,r,1300,true);G.Game._test.checkChallenge();G.Game._test.endRun(false);assert.equal(G.Difficulty.unlocked(G.DB.save),1);assert.equal(G.Difficulty.highest(G.DB.save,6),null);
  r=s.run(1);p.dead=true;G.Game._test.setRun(p,r,1300);G.Game._test.checkChallenge();assert.equal(r.victory,false);
  G.Game._test.endRun(true);assert.equal(G.Difficulty.unlocked(G.DB.save),1);assert.equal(G.Difficulty.highest(G.DB.save,6).best,1300);assert.equal(G.Difficulty.frame(G.DB.save,6),'');
});
