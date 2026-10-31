/* Hidden protection: pure progression, real player damage and per-owner loot. */
const test=require('node:test'),assert=require('node:assert/strict');
const {context}=require('./battle_fixture.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function setup(){const s=context(),{G}=s;s.load('js/systems/failure-protection.js');return {...s,G,F:G.FailureProtection};}
function losses(F,s,n=1,count=8){for(let i=1;i<=count;i++)F.record(s,n,100,{failed:true,ended:true,id:`${n}-loss-${i}`},i);return s.failureProtection[n];}

test('the first two short defeats give no points; later additions accelerate and cap at 100',()=>{
  const {F,G}=setup(),s=G.DB.save,points=[0,0,5,15,30,50,75,100,100];
  points.forEach((value,i)=>{assert.ok(F.record(s,1,599.99,{failed:true,ended:true,id:'defeat-'+i},i+1));assert.equal(s.failureProtection[1].points,value);assert.equal(s.failureProtection[1].losses,i+1);});
  assert.equal(F.record(s,1,100,{failed:true,ended:true,id:'defeat-8'}),false);assert.equal(s.failureProtection[1].losses,9);
});

test('each difficulty keeps a separate history shared across the account Pokémon',()=>{
  const {F,G}=setup(),s=G.DB.save;losses(F,s,1,4);losses(F,s,2,3);assert.equal(s.failureProtection[1].points,15);assert.equal(s.failureProtection[2].points,5);
  for(const dex of [4,150]){const p=new G.Player(G.DEX_BY[dex]);F.begin(p,s,1);close(F.xpFactor(p),1.045);}
});

test('ten-minute defeats and quitting break the short-loss streak but preserve accumulated points',()=>{
  const {F,G}=setup(),s=G.DB.save;losses(F,s,1,5);F.record(s,1,600,{failed:true,ended:true,id:'longer'});assert.equal(s.failureProtection[1].points,30);assert.equal(s.failureProtection[1].losses,0);
  F.record(s,1,100,{failed:true,ended:true,id:'again'});assert.equal(s.failureProtection[1].losses,1);assert.equal(s.failureProtection[1].points,30);
  F.record(s,1,20,{failed:false,ended:true,id:'quit'});assert.equal(s.failureProtection[1].losses,0);assert.equal(s.failureProtection[1].points,30);
});

test('the reset is strictly after twelve game minutes and is idempotent through run completion',()=>{
  const {F,G}=setup(),s=G.DB.save;losses(F,s);assert.equal(F.record(s,1,720,{id:'survivor'}),false);assert.equal(s.failureProtection[1].points,100);
  assert.ok(F.record(s,1,720.001,{id:'survivor'}));assert.equal(s.failureProtection[1].points,0);assert.equal(s.failureProtection[1].losses,0);const rev=s.failureProtection[1].rev;
  assert.equal(F.record(s,1,800,{id:'survivor',ended:true,failed:true}),false);assert.equal(s.failureProtection[1].rev,rev);
});

test('dirty runs, invalid tiers and unfinished short runs cannot farm or clear protection',()=>{
  const {F,G}=setup(),s=G.DB.save;losses(F,s,1,3);const before=JSON.stringify(s.failureProtection);
  for(const args of [[1,100,{failed:true,ended:true,clean:false}],[1,100,{}],[9,100,{ended:true,failed:true}],[1,NaN,{ended:true,failed:true}],[1,800,{clean:false}]])assert.equal(F.record(s,...args),false);
  assert.equal(JSON.stringify(s.failureProtection),before);
});

test('normalization bounds malformed saves and merging keeps newer resets instead of resurrecting old points',()=>{
  const {F}=setup(),old={failureProtection:{1:{points:100,losses:8,rev:8,at:10,last:'old'}}},reset={failureProtection:{1:{points:0,losses:0,rev:9,at:1,last:'reset'}}};
  for(const [a,b]of [[old,reset],[reset,old]]){const r=F.merge(a,b);assert.equal(r.failureProtection[1].points,0);assert.equal(r.failureProtection[1].rev,9);}
  const bad={failureProtection:{1:{points:200,losses:2000,rev:-1,at:NaN,last:42},2:[],9:{points:100}}};F.normalize(bad);assert.equal(bad.failureProtection[1].points,100);assert.equal(bad.failureProtection[1].losses,1000);assert.equal(bad.failureProtection[1].rev,0);assert.equal(bad.failureProtection[1].last,'');assert.deepEqual(Object.keys(bad.failureProtection),['1']);
});

test('experience and loot scale linearly with points and end exactly at the top-clock ten-minute mark',()=>{
  const {F,G}=setup(),s=G.DB.save,p=new G.Player(G.DEX_BY[6]);losses(F,s);F.begin(p,s,1,'current');
  close(F.xpFactor(p),1.3);close(F.lootBonus(p),.8);F.advance(p,s,599.999);close(F.xpFactor(p),1.3);F.advance(p,s,600);close(F.xpFactor(p),1);close(F.lootBonus(p),0);
  assert.equal(F.advance(p,s,1),false);close(F.xpFactor(p),1);F.advance(p,s,721);assert.equal(s.failureProtection[1].points,0);
});

test('run coefficients are snapshotted and never leak to remote players or a different tier',()=>{
  const {F,G}=setup(),s=G.DB.save,p=new G.Player(G.DEX_BY[6]);losses(F,s,1,4);F.begin(p,s,1);close(F.strength(p),.15);s.failureProtection[1].points=100;close(F.strength(p),.15);
  p.remote=true;close(F.strength(p),0);p.remote=false;F.begin(p,s,2);close(F.strength(p),0);close(F.xpFactor({}),1);
});

test('real XP gain multiplies existing bonuses and Lucky Egg without affecting PP or cooldowns',()=>{
  const {F,G}=setup(),s=G.DB.save,p=new G.Player(G.DEX_BY[6]);losses(F,s);p.xpMul=1.2;G.Items.gain(p,'luckyegg');F.begin(p,s,1);const agility=p.agilityCooldown,interval=p.ppInterval;
  close(p.effectiveXpMul,1.2*1.06*1.3);p.gainXp(1);close(p.xp,1.2*1.06*1.3);close(p.agilityCooldown,agility);close(p.ppInterval,interval);
});

test('fatal protection ignores the whole hit and preserves Focus Sash, Sturdy and boss lifesteal',()=>{
  const s=setup(),{F,G}=s,p=new G.Player(G.DEX_BY[6]);losses(F,G.DB.save);F.begin(p,G.DB.save,1);p.hp=50;p.maxHp=100;p.ability='sturdy';G.Items.gain(p,'focussash');let leech=0;G.BossCombat={leech:()=>leech++};
  s.Math.random=()=>.099999;assert.equal(p.hurt(100,null,true,{enemy:{},kind:'contact'}),false);close(p.hp,50);assert.ok(p.invuln>0);assert.equal(G.Items.count(p,'focussash'),1);assert.equal(G.Abilities.state(p).sturdyUsed,false);assert.equal(leech,0);
  p.invuln=0;s.Math.random=()=>.1;assert.equal(p.hurt(100,null,true,{kind:'contact'}),true);assert.equal(G.Abilities.state(p).sturdyUsed,true);
});

test('nonlethal hits and inactive protection never roll; failed rescue falls back to existing items',()=>{
  const {F,G}=setup(),p=new G.Player(G.DEX_BY[6]);losses(F,G.DB.save);F.begin(p,G.DB.save,1);p.hp=50;let rolls=0;assert.equal(F.avoidLethal(p,49,()=>{rolls++;return 0;}),false);assert.equal(rolls,0);
  F.advance(p,G.DB.save,600);assert.equal(F.avoidLethal(p,100,()=>{rolls++;return 0;}),false);assert.equal(rolls,0);G.Items.gain(p,'focussash');p.hurt(100,null,true);assert.equal(p.hp,1);assert.equal(G.Items.count(p,'focussash'),0);
});

test('reward probability is raised relatively, while ordinary and rift Boss pools keep their restrictions',()=>{
  const {G}=setup(),rng=value=>{let i=0;return ()=>i++%2===0?value:0;};
  assert.equal(G.Items.rewardChoices(rng(.3),false).filter(id=>G.Items.BY[id].boss).length,0);
  const ordinary=G.Items.rewardChoices(rng(.3),false,.8);assert.equal(new Set(ordinary).size,3);assert.equal(ordinary.filter(id=>G.Items.BY[id].boss).length,2);assert.ok(ordinary.filter(id=>G.Items.BY[id].boss).every(id=>['linker','masterytm'].includes(id)));
  assert.equal(G.Items.rewardChoices(rng(.7),true).filter(id=>G.Items.BY[id].boss).length,0);assert.equal(G.Items.rewardChoices(rng(.7),true,.8).filter(id=>G.Items.BY[id].boss).length,3);
});

test('protected chest rewards use the recipient coefficient and duplicate network receipts never reroll',()=>{
  const s=setup(),{F,G}=s,p=new G.Player(G.DEX_BY[6]);losses(F,G.DB.save);F.begin(p,G.DB.save,1);G.Game.player=p;let options,rolls=0;G.Game.offerSpecialChoice=x=>options=x;
  s.Math.random=()=>rolls++%2===0?.3:0;assert.ok(G.BossRewards.receive(100,{rift:false,options:['leftovers','quickclaw','focussash']}));assert.equal(options.filter(id=>G.Items.BY[id].boss).length,2);const count=rolls;
  assert.equal(G.BossRewards.receive(100,{rift:false,options:['leftovers','quickclaw','focussash']}),false);assert.equal(rolls,count);
  F.advance(p,G.DB.save,600);assert.ok(G.BossRewards.receive(101,{rift:false,options:['leftovers','quickclaw','focussash']}));assert.deepEqual(Array.from(options),['leftovers','quickclaw','focussash']);assert.equal(rolls,count);
});

test('finishing a run records at most once and disables assistance before the summary',()=>{
  const {F,G}=setup(),p=new G.Player(G.DEX_BY[6]);losses(F,G.DB.save,1,3);F.begin(p,G.DB.save,1,'finished');assert.ok(F.finish(p,G.DB.save,{time:20,failed:true,clean:true}));assert.equal(G.DB.save.failureProtection[1].points,15);close(F.xpFactor(p),1);assert.equal(F.finish(p,G.DB.save,{time:20,failed:true,clean:true}),false);
});
