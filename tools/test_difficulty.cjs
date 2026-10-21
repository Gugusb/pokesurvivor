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
    G.RunUI={showOver:r=>s.over=r,showVictory:(...a)=>{(s.victoryChoices||=[]).push(a);s.takeVictory=a[4];s.keepPlaying=a[5];}};G.Flow={afterRun:noop};G.Settings={sample:noop};G.Input={tap:()=>false,endFrame:noop};G.UI.tick=noop;G.UI.hide=noop;G.Dev={isOpen:false};G.SettingsUI={isOpen:false};
    let source=fs.readFileSync(path.join(ROOT,'js/game.js'),'utf8').replace('init, startRun, everyone,',
      "_test:{setRun(p,r,t,dirty=false){pl=p;challenge=r;time=t;tampered=dirty;runReal=1000;last=1000;state='playing';},checkChallenge,maybeVictoryChoice,cashoutVictory,coinPayout,coopApi,endRun,frame,clean,setState(v){state=v;}}, init, startRun, everyone,");
    if(simulate){s.testSteps=[];s.stopOnStep=false;source=source.replace('function update(dt) {',"function update(dt) { time+=dt;testSteps.push(dt);if(stopOnStep)state='levelup';return;").replace('function render() {','function render() {return;');}
    vm.runInContext(source,s);
    s.player=()=>({dex:6,mon:G.DEX_BY[6],dead:false,hp:100,maxHp:100,atkMul:1,spdMul:1,cdMul:1,level:2,coinMul:1,kills:0,bosses:0,coins:0,t1:0,t10:0,moves:[]});
  };
  return s;
}
test('star-specific growth replaces fixed HP/damage multipliers while lower stars have explicit assistance',()=>{
  const s=context(),D=s.G.Difficulty;
  close(D.factors(4).hp,0.7);close(D.factors(4).dmg,0.8);
  close(D.factors(1).hp,.56);close(D.factors(2).dmg,.4);close(D.factors(3).spd,.67);
  for(let n=1;n<8;n++){assert.equal(D.growth(0,'normal',n).hp,1);assert.ok(D.growth(1800,'normal',n+1).hp>D.growth(1800,'normal',n).hp);}
  s.run(4);let e=s.enemy();assert.equal(e.maxHp,1400);assert.equal(e.dmg,240);assert.equal(e.shotDmg(),48);
  s.run(8);e=s.enemy(true);assert.equal(e.maxHp,Math.round(2000*.7));close(e.dmg,300*.8);close(e.shotDmg(),60*.8);
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

test('survival leaderboard accepts normal and double-speed eight-star runs but excludes easier tiers',()=>{
  for(const [tier,double,expected] of [[8,false,1],[4,false,0],[1,false,0],[8,true,1]]){
    const s=context(),G=s.G;s.loadGame();let sent=0;G.Ranking.submitSolo=()=>{sent++;};
    G.Game._test.setRun(s.player(),s.run(tier),1300);if(double){G.Game.setSpeed(2);G.Game.setSpeed(1);}
    G.Game._test.endRun(false);assert.equal(sent,expected);assert.equal(s.over.rankingExcluded,!expected);
  }
});

test('final coin payout multiplies the whole subtotal by difficulty and keeps Fortune separate',()=>{
  for(const [stars,reward] of [[1,1],[4,1.5],[8,2.6]]){
    const s=context(),G=s.G;s.loadGame();const p=s.player();p.coins=50;p.kills=40;p.bosses=1;p.coinMul=1.2;
    G.Game._test.setRun(p,s.run(stars),100);G.Game._test.endRun(false);
    assert.equal(s.over.coins,Math.round((20+10+80+50)*reward*1.2));
    if(stars>1)assert.ok(s.over.breakdown.includes('×'+reward.toFixed(2)));
    assert.ok(s.over.breakdown.includes('×1.20 Fortuna'));
  }
});
test('summons inherit the original spawn scale once; remote enemies keep host HP and damage unchanged',()=>{
  const s=context(),G=s.G;s.run(8);const e=s.enemy(true);e.summon();
  assert.equal(e.minions.length,2);assert.ok([Math.round(350*2*.7),Math.round(350*2*.7)*5].includes(e.minions[0].maxHp));
  close(e.minions[0].dmg,60*3*.8*(e.minions[0].elite?2:1));
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
  assert.equal(D.begin(s,6,3).stars,3);close(D.factors().hp,.7);
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
  r=s.run(1);p.dead=true;G.Game._test.setRun(p,r,1100);G.Game._test.checkChallenge();assert.equal(r.victory,false);
  G.Game._test.endRun(true);assert.equal(G.Difficulty.unlocked(G.DB.save),1);assert.equal(G.Difficulty.highest(G.DB.save,6).best,1100);assert.equal(G.Difficulty.frame(G.DB.save,6),'');
});

test('solo deaths after twenty minutes award victory even without an earlier checkpoint, including Arceus at thirty minutes',()=>{
  for(const t of [1199.99,1200,1200.01,1801]){
    const s=context(),G=s.G;s.loadGame();const p=s.player();p.dead=true;p.hp=0;const r=s.run(1);
    G.Game._test.setRun(p,r,t);G.Game._test.endRun(true);
    assert.equal(s.over.victory,t>1200);assert.equal(s.over.completed,t>1200);
    assert.equal(G.Difficulty.unlocked(G.DB.save),t>1200?2:1);
    assert.equal(G.Difficulty.frame(G.DB.save,6),t>1200?'gold':'');
  }
});

test('thirty-minute developer and locked-difficulty runs show completion without granting medals or unlocks',()=>{
  for(const [dirty,stars,reason] of [[true,1,'debug'],[false,8,'locked']]){
    const s=context(),G=s.G;s.loadGame();const p=s.player();p.dead=true;p.hp=0;
    G.Game._test.setRun(p,s.run(stars),1801,dirty);G.Game._test.endRun(true);
    assert.equal(s.over.completed,true);assert.equal(s.over.victory,false);assert.equal(s.over.progressExcluded,reason);
    assert.equal(G.Difficulty.unlocked(G.DB.save),1);assert.equal(G.Difficulty.highest(G.DB.save,6),null);
  }
});

test('a dead co-op player cannot use the team clock to claim solo completion, but a living checkpoint preserves their victory',()=>{
  for(const survived of [false,true]){
    const s=context(),G=s.G;s.loadGame();G.Coop.members=[];G.Social.setPlaying=noop;
    const p=s.player();p.uid='peer';const r=s.run(1);G.Game._test.setRun(p,r,1300);
    if(survived)G.Game._test.checkChallenge();p.dead=true;p.hp=0;
    G.Game._test.setRun(p,r,1801);G.Game._test.endRun(true);
    assert.equal(s.over.completed,survived);assert.equal(s.over.victory,survived);
    assert.equal(G.Difficulty.unlocked(G.DB.save),survived?2:1);
  }
});

test('a validation failure is explained rather than conflated with failing the survival objective',()=>{
  const s=context(),G=s.G;s.loadGame();const p=s.player();p.dead=true;p.hp=0;p.cdMul=.001;
  G.Game._test.setRun(p,s.run(1),1801);G.Game._test.endRun(true);
  assert.equal(s.over.completed,true);assert.equal(s.over.victory,false);assert.equal(s.over.progressExcluded,'validation');
  assert.equal(G.Difficulty.unlocked(G.DB.save),1);
});

test('the actual result UI distinguishes a recorded win from completed developer runs in Chinese',()=>{
  const s=context(),{G}=s;s.loadGame();s.load('js/ui/difficulty-ui.js');assert.equal(G.I18n.lang,'zh');const elements=new Map();
  G.UI.$=id=>id==='over-ask'?null:(elements.get(id)||elements.set(id,{textContent:'',innerHTML:''}).get(id));
  G.UI.show=noop;G.Icons={html:()=>''};s.load('js/ui/run-ui.js');
  const result={difficulty:1,completed:true,dead:true,time:1801,level:20,kills:100,bosses:3,coins:100,moves:[],breakdown:''};
  G.RunUI.showOver({...result,victory:true},noop);assert.equal(elements.get('over-title').textContent,'Dificultad superada');
  assert.ok(elements.get('over-stats').innerHTML.includes('胜利'));assert.ok(!elements.get('over-stats').innerHTML.includes('未通关'));
  G.RunUI.showOver({...result,victory:false,progressExcluded:'debug'},noop);
  assert.equal(elements.get('over-title').textContent,'生存挑战已达标');assert.ok(elements.get('over-stats').innerHTML.includes('已达标，但不计入进度'));
  assert.ok(elements.get('over-stats').innerHTML.includes('未计入挑战勋章'));assert.ok(!elements.get('over-stats').innerHTML.includes('开发者'));assert.ok(!elements.get('over-stats').innerHTML.includes('未通关'));
});

test('twenty-minute victory pauses for one choice; continuing preserves the opportunity through a later death',()=>{
  const s=context(),{G}=s;s.loadGame(true);const p=s.player();p.anim={update:noop};const r=s.run(1);
  G.Game._test.setRun(p,r,1200);G.Game._test.checkChallenge();assert.equal(G.Game._test.maybeVictoryChoice(),false);
  G.Game._test.setRun(p,r,1200.01);G.Game._test.checkChallenge();assert.equal(G.Game._test.maybeVictoryChoice(),true);
  assert.equal(G.Game.state,'victory');assert.equal(G.Difficulty.unlocked(G.DB.save),2);assert.equal(s.victoryChoices[0][1],true);
  const t=G.Game.st.time;G.Game._test.frame(1016);assert.equal(G.Game.st.time,t);assert.equal(s.testSteps.length,0);
  s.keepPlaying();assert.equal(G.Game.state,'playing');assert.equal(G.Game._test.maybeVictoryChoice(),false);assert.equal(s.victoryChoices.length,1);
  p.dead=true;G.Game._test.setRun(p,r,1801);G.Game._test.endRun(true);assert.equal(s.over.victory,true);assert.equal(G.Difficulty.bonusAvailable(G.DB.save,1),true);
});

test('immediate victory cashout doubles the final amount once, including Fortune and difficulty, and keeps other currencies unchanged',async()=>{
  const s=context(),{G}=s;s.loadGame();G.DB.save.difficulty.cleared={1:true,2:true,3:true};
  const p=s.player();p.coinMul=1.2;p.coins=50;p.kills=40;p.bosses=1;
  const r=s.run(4);G.Game._test.setRun(p,r,1201);G.Game._test.checkChallenge();G.Game._test.maybeVictoryChoice();
  const before=G.DB.save.coins,base=Math.round((240+10+80+50)*1.2*1.5),gems=G.DB.save.abilityGems;
  await Promise.all([s.takeVictory(),s.takeVictory()]);assert.equal(s.over.coins,base*2);assert.equal(G.DB.save.coins,before+base*2);
  assert.equal(G.DB.save.stats.coinsEarned,base*2);assert.equal(G.DB.save.stats.runs,1);assert.equal(G.DB.save.abilityGems,gems);
  assert.equal(G.Difficulty.bonusAvailable(G.DB.save,4),false);assert.ok(s.over.breakdown.includes('×2'));
  const next=s.run(4,25);G.Game._test.setRun(p,next,1201);G.Game._test.checkChallenge();G.Game._test.maybeVictoryChoice();
  assert.equal(s.victoryChoices.at(-1)[1],false);await s.takeVictory();assert.equal(s.over.coins,base);
});

test('debug runs never open the victory choice, and a busy Z move delays the choice until casting finishes',()=>{
  const s=context(),{G}=s;s.loadGame();const p=s.player();let r=s.run(1);
  G.Game._test.setRun(p,r,1300,true);G.Game._test.checkChallenge();assert.equal(G.Game._test.maybeVictoryChoice(),false);
  r=s.run(1);G.Game._test.setRun(p,r,1300);G.Game._test.checkChallenge();G.ZMoves={busy:()=>true};
  assert.equal(G.Game._test.maybeVictoryChoice(),false);assert.equal(r.choiceShown,undefined);
  G.ZMoves.busy=()=>false;assert.equal(G.Game._test.maybeVictoryChoice(),true);
});

test('failed bonus saving leaves the choice paused and spendable, and a retry settles exactly once',async()=>{
  const s=context(),{G}=s;s.loadGame();const p=s.player();G.Game._test.setRun(p,s.run(1),1201);G.Game._test.checkChallenge();G.Game._test.maybeVictoryChoice();
  const claim=G.DB.claimVictoryBonus;G.DB.claimVictoryBonus=()=>Promise.reject(new Error('offline'));
  assert.equal(await s.takeVictory(),false);assert.equal(G.Game.state,'victory');assert.equal(G.Difficulty.bonusAvailable(G.DB.save,1),true);
  G.DB.claimVictoryBonus=claim;assert.equal(await s.takeVictory(),true);assert.equal(G.Game.state,'over');assert.equal(s.over.coins,480);
});

test('legacy saves retain unclaimed opportunities; per-star receipts survive merge, spending and registered local relogin',async()=>{
  const s=context(),{G}=s,D=G.Difficulty;await G.DB.register('VictoryBonusTest','test-only');const save=G.DB.save;
  const old=JSON.parse(JSON.stringify(save));delete old.difficulty.cashouts;old.updated=Date.now()+1000;old.coins-=50;
  const r=s.run(1);D.record(save,r,1201,true,true);const before=save.coins;
  assert.equal(await G.DB.claimVictoryBonus(r,240),240);assert.equal(save.coins,before+480);
  const merged=G.DB.merge(old,save);assert.equal(merged.coins,before+480-50);assert.equal(D.bonusAvailable(merged,1),false);
  assert.equal(G.DB.merge(merged,save).coins,merged.coins);assert.equal(merged.stats.coinsEarned,480);
  assert.equal(await G.DB.claimVictoryBonus(r,240),0);assert.equal(D.bonusAvailable(save,2),true);
  await G.DB.logout();await G.DB.login('VictoryBonusTest','test-only');assert.equal(D.bonusAvailable(G.DB.save,1),false);
  assert.equal(G.DB.save.coins,before+480);
});

test('the eighth-star victory UI offers the final clear instead of inventing a ninth difficulty, and blocks duplicate clicks',async()=>{
  const s=context(),{G}=s;s.loadGame();s.load('js/ui/difficulty-ui.js');const els=new Map();
  G.UI.$=id=>els.get(id)||els.set(id,{textContent:'',classList:{toggle:noop}}).get(id);G.UI.show=noop;s.load('js/ui/run-ui.js');
  let resolve,calls=0,kept=0;G.RunUI.showVictory(8,true,false,false,()=>{calls++;return new Promise(r=>resolve=r);},()=>kept++);
  assert.ok(els.get('victory-unlock').textContent.includes('八个'));assert.ok(!els.get('victory-unlock').textContent.includes('9'));
  const click=els.get('victory-cashout').onclick,task=click();await click();els.get('victory-continue').onclick();assert.equal(calls,1);assert.equal(kept,0);
  resolve(false);await task;assert.equal(els.get('victory-cashout').disabled,false);assert.ok(els.get('victory-status').textContent.includes('奖励仍在等着你'));
  G.RunUI.showVictory(1,false,false,false,async()=>true,noop);assert.ok(els.get('victory-cashout').textContent.includes('领取金币'));
  assert.ok(!els.get('victory-cashout').textContent.includes('双倍'));assert.ok(els.get('victory-unlock').textContent.includes('2★'));
  G.RunUI.showVictory(1,true,true,true,()=>{throw new Error('guest cannot decide');},()=>{throw new Error('guest cannot decide');});
  assert.ok(els.get('victory-title').textContent.includes('队伍'));assert.ok(els.get('victory-status').textContent.includes('等待房主'));
  await els.get('victory-cashout').onclick();els.get('victory-continue').onclick();
});

test('co-op victory decisions belong to the host while guests wait and resume without spending their opportunity',()=>{
  for(const host of [true,false]){
    const s=context(),{G}=s;s.loadGame();const p=s.player();p.uid=host?'host':'peer';let holds=0;
    G.Coop.active=true;G.Coop.isHost=host;G.Coop.players=()=>[p];G.Coop.holdStart=()=>holds++;G.Coop.holdEnd=()=>holds--;
    G.Game._test.setRun(p,s.run(1),1201);G.Game._test.checkChallenge();assert.equal(G.Game._test.maybeVictoryChoice(),host);
    if(!host)G.Game._test.coopApi.victory(true);
    assert.equal(s.victoryChoices[0][3],!host);assert.equal(G.Game.state,'victory');
    if(host)s.keepPlaying();else G.Game._test.coopApi.victory(false);
    assert.equal(G.Game.state,'playing');assert.equal(holds,0);assert.equal(G.Difficulty.bonusAvailable(G.DB.save,1),true);
  }
});

test('the real screen registry hides the victory overlay when showing the final result',()=>{
  const s=context(),{G}=s;s.loadGame();s.load('js/ui/difficulty-ui.js');const nodes=new Map();
  s.document.getElementById=id=>{
    if(id==='over-ask')return null;
    if(!nodes.has(id)){
      const classes=new Set(['hidden']);nodes.set(id,{textContent:'',innerHTML:'',classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle:(k,on)=>on?classes.add(k):classes.delete(k)}});
    }return nodes.get(id);
  };
  s.load('js/ui/ui.js');G.Icons={html:()=>''};s.load('js/ui/run-ui.js');G.RunUI.showVictory(1,true,false,false,async()=>true,noop);
  assert.equal(G.UI.isOpen('scr-victory'),true);
  G.RunUI.showOver({difficulty:1,victory:true,time:1201,level:1,kills:0,bosses:0,coins:480,moves:[],breakdown:'×2'},noop);
  assert.equal(G.UI.isOpen('scr-victory'),false);assert.equal(G.UI.isOpen('scr-over'),true);
});
