const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {context}=require('./battle_fixture.cjs'),noop=()=>{},close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(){
  const s=context('zh',false),{G}=s;
  for(const f of ['js/core/settings.js','js/systems/move-control.js','js/systems/move-pp.js','js/entities/projectile.js','js/systems/combat.js','js/systems/levelup.js'])s.load(f);
  G.VFX={forMove:()=>({pal:[]}),forType:()=>({})};Object.assign(G.World,{isFree:()=>true,propsInCircle:()=>[],projectileBlock:()=>null,damageProp:noop,nearestBreakable:()=>null});
  G.Game.state='playing';G.Input={axis:()=>[0,0]};G.Progress={event:noop};
  s.learn=(p,ids)=>{p.moves=ids.map(id=>G.Moves.instance(id));p.slots=p.moves.map(m=>[m]);p.active=0;p.baseStamina=0;p.baseAgility=80;p.target=s.enemy();p.target.x=30;return p.moves;};
  s.loadGame=p=>{G.UI.isOpen=()=>false;G.Rift={inArena:false};const src=fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8').replace('init, startRun, everyone,',"_test:{setPlayer(p){pl=p;state='playing';},collect:onCollect}, init, startRun, everyone,");vm.runInContext(src,s);G.Game._test.setPlayer(p);};
  return s;
}
test('PP rates are 70%/150%, and both directions keep their previous rate for one simulated second',()=>{
  const s=setup(),{G}=s,p=s.player(6),[a,b]=s.learn(p,['ember','water-gun']);for(const m of p.moves)G.MovePP.state(p,m).current=0;
  G.MovePP.tick(p,1);close(G.MovePP.state(p,a).current,.7);close(G.MovePP.state(p,b).current,1.5);
  p.setActive(1);G.MovePP.tick(p,.5);close(G.MovePP.state(p,a).current,1.05);close(G.MovePP.state(p,b).current,2.25);
  G.MovePP.tick(p,.5);close(G.MovePP.state(p,a).current,1.4);close(G.MovePP.state(p,b).current,3);
  G.MovePP.tick(p,1);close(G.MovePP.state(p,a).current,2.9);close(G.MovePP.state(p,b).current,3.7);
});
test('reversing a switch cancels its pending PP transition, and Inner Focus only boosts unused recovery',()=>{
  const s=setup(),{G}=s,p=s.player(149,'innerfocus'),[a,b]=s.learn(p,['tackle','ember']);for(const m of p.moves)G.MovePP.state(p,m).current=0;
  p.setActive(1);G.MovePP.tick(p,.3);p.setActive(0);G.MovePP.tick(p,.7);
  close(G.MovePP.state(p,a).current,.7);close(G.MovePP.state(p,b).current,1.8);
  a.t=b.t=10;G.Combat.tick(1,p,0);close(a.t,9);close(b.t,10);
});
test('a single PP update crossing the inertia deadline matches many small frames',()=>{
  const run=step=>{const s=setup(),{G}=s,p=s.player(6),[a,b]=s.learn(p,['ember','water-gun']);for(const m of p.moves)G.MovePP.state(p,m).current=0;p.setActive(1);for(let t=0;t<2-1e-8;t+=step)G.MovePP.tick(p,Math.min(step,2-t));return p.moves.map(m=>G.MovePP.state(p,m).current);};
  const a=run(2),b=run(.01);a.forEach((n,i)=>close(n,b[i]));assert.deepEqual(a,[2.2,2.2]);
});
test('Candy Jars add five over-cap points each and halve only the above-cap recovery, including threshold crossings',()=>{
  const s=setup(),{G}=s,p=s.player(6),[m]=s.learn(p,['ember']);G.Items.gain(p,'candyjar');let pp=G.MovePP.state(p,m);
  G.MovePP.tick(p,4);close(pp.current,16.4);assert.equal(pp.max,15);assert.equal(pp.limit,20);
  G.Items.gain(p,'candyjar');pp=G.MovePP.state(p,m);assert.equal(pp.limit,25);assert.equal(pp.current,16.4);
  pp.current=14.75;G.MovePP.tick(p,1);close(pp.current,15.225);G.MovePP.tick(p,100);close(pp.current,25);
  G.MovePP.restore(p,[m]);close(pp.current,25);G.MovePP.increaseMax(p);assert.equal(pp.max,16);assert.equal(pp.limit,26);close(pp.current,26);
});
test('legacy effects use one fifth strength, stack without replacing one another, and obsolete Choice Band has no effect',()=>{
  const s=setup(),{G}=s,p=s.player(6);s.learn(p,['ember','tackle']);p.active=0;
  for(const id of ['leftovers','quickclaw','amuletcoin','luckyegg','choicescarf','assaultvest','lifeorb'])assert.ok(G.Items.gain(p,id));
  close(p.regen,p.maxHp*.003);close(G.Items.cooldownFactor(p),.96);close(p.coinMul,1.1);close(p.effectiveXpMul,1.06);close(p.reduction,.04);close(G.Items.damageBonus(p),.06);
  p.setActive(1);assert.equal(p.active,1);assert.equal(G.MoveControl.input(p,1),true);assert.equal(G.Items.count(p,'choiceband'),0);
});
test('each Focus Sash is consumed by one fatal hit, with no hidden recharge or automatic replenishment',()=>{
  const s=setup(),{G}=s,p=s.player(6);p.moves=[];p.slots=[];G.Items.gain(p,'focussash');G.Items.gain(p,'focussash');
  for(const n of [1,0]){p.invuln=0;p.hurt(1e6,null,true);assert.equal(p.hp,1);assert.equal(p.dead,false);assert.equal(G.Items.count(p,'focussash'),n);}
  p.invuln=0;p.hurt(1e6,null,true);assert.equal(p.dead,true);assert.equal(G.Items.count(p,'focussash'),0);
});
test('Boss items add level-up choices, bank a link immediately, restore the melee slot and burn only ranged hits',()=>{
  const s=setup(),{G}=s,p=s.player(6),[a,b]=s.learn(p,['tackle','ember']);G.Items.gain(p,'luckymedal');assert.equal(G.LevelUp.offer(p).length,4);G.Items.gain(p,'luckymedal');assert.equal(G.LevelUp.offer(p).length,5);
  G.Items.gain(p,'linker');assert.equal(p.bonds,1);assert.equal(G.Items.count(p,'linker'),0);
  p.slots=[[a,b]];for(const m of p.moves)G.MovePP.state(p,m).current=1;G.Items.gain(p,'couragemedal');s.Math.random=()=>0;G.Combat.tick(0,p,0);for(const m of p.moves)close(G.MovePP.state(p,m).current,1);
  const e=s.enemy();e.maxHp=e.hp=1e5;G.Items.gain(p,'flamethrower');e.hurt(10,'#fff',0,0,0,null,p,{kind:'melee'});assert.equal(e.burn,0);e.hurt(10,'#fff',0,0,0,null,p,{kind:'projectile'});assert.equal(e.burn,1);
  G.Items.gain(p,'bugnet');close(G.MonProgression.captureChance({lastAttacker:p}),.0022);
});
test('rift reward cards are distinct and may contain Boss items; normal drops exclude those items',()=>{
  const {G}=setup();assert.deepEqual(Array.from(G.Items.rewardChoices(()=>0)),['masterytm','linker','luckymedal']);
  for(let i=0;i<100;i++){const cards=G.Items.rewardChoices();assert.equal(cards.length,3);assert.equal(new Set(cards).size,3);assert.ok(!G.Items.BY[G.Items.roll()].boss);}
});
test('active Super Potion heals 30%, starts its thirty-second cooldown only when useful, and coexists with special items',()=>{
  const s=setup(),{G}=s,p=s.player(6);p.moves=[];p.slots=[];G.Items.gain(p,'leftovers');
  assert.equal(G.Items.useActive(p),false);assert.equal(p.activeItemCd,0);p.hp=p.maxHp*.1;assert.ok(G.Items.useActive(p));close(p.hp,p.maxHp*.4);assert.equal(p.activeItemCd,30);assert.equal(G.Items.useActive(p),false);
  p.update(30);assert.equal(p.activeItemCd,0);assert.ok(G.Items.useActive(p));assert.equal(G.Items.count(p,'leftovers'),1);
});
test('PP Potion primes one actual normal cast, refills even an empty move, respects its cap and does not refill its fused sibling',()=>{
 const s=setup(),{G}=s,p=s.player(6),[a,b]=s.learn(p,['ember','tackle']);p.activeItem='pppotion';p.slots=[[a,b]];
 G.MovePP.state(p,a).current=G.MovePP.state(p,b).current=0;
 assert.ok(G.Items.useActive(p));assert.equal(p.activeItemCd,90);assert.equal(p.ppPotionReady,20);assert.equal(G.MovePP.state(p,a).current,0);
 // Waiting for an enemy must not consume the pending potion.
 p.slots=[[a]];p.target=null;G.Combat.tick(0,p,0);assert.equal(p.ppPotionReady,20);
 assert.ok(G.MovePP.consume(p,a));assert.equal(G.MovePP.state(p,a).current,14);assert.equal(p.ppPotionReady,0);assert.equal(G.MovePP.consume(p,b),false);
 p.activeItemCd=0;assert.ok(G.Items.useActive(p));p.activeItemCd=0;assert.equal(G.Items.useActive(p),false);assert.equal(p.activeItemCd,0);
 G.Items.gain(p,'candyjar');G.MovePP.state(p,a).current=0;assert.ok(G.MovePP.consume(p,a));assert.equal(G.MovePP.state(p,a).current,19);
});

test('Spirit Spray adds fifteen shared reserve PP at full HP, stacks with existing reserves and has a ninety-second cooldown',()=>{
 const s=setup(),{G}=s,p=s.player(6),[a]=s.learn(p,['ember']);p.activeItem='spiritspray';p.tempPP=20;G.MovePP.state(p,a).current=0;
 assert.ok(G.Items.useActive(p));assert.equal(p.tempPP,35);assert.equal(p.activeItemCd,90);assert.equal(G.Items.useActive(p),false);
 assert.ok(G.MovePP.consume(p,a));assert.equal(p.tempPP,34);assert.equal(G.MovePP.state(p,a).current,0);
 p.activeItemCd=0;assert.ok(G.Items.useActive(p));assert.equal(p.tempPP,49);
 for(const flag of ['dead','remote']){p.activeItemCd=0;p[flag]=true;assert.equal(G.Items.useActive(p),false);p[flag]=false;}
 G.Game.state='paused';assert.equal(G.Items.useActive(p),false);
});

test('auto, toggle and click modes affect only the selected slot; a linked click casts each move once',()=>{
  const s=setup(),{G}=s,p=s.player(6),[a,b]=s.learn(p,['ember','tackle']);p.slots=[[a,b]];let casts=0;p.cast=()=>casts++;
  G.Settings.set('castMode','toggle');G.Combat.tick(0,p,0);assert.equal(casts,0);G.MoveControl.input(p,0);G.Combat.tick(0,p,0);assert.equal(casts,2);
  G.MoveControl.input(p,0);G.Combat.tick(100,p,0);assert.equal(casts,2);
  G.Settings.set('castMode','click');G.Combat.tick(100,p,0);assert.equal(casts,2);G.MoveControl.input(p,0);G.Combat.tick(0,p,0);assert.equal(casts,4);G.Combat.tick(100,p,0);assert.equal(casts,4);
  G.Settings.set('castMode','auto');G.Combat.tick(0,p,0);assert.equal(casts,6);
});
test('toggle selects a new slot enabled, including a previously paused slot, but clicking the current slot pauses it',()=>{
 const s=setup(),{G}=s,p=s.player(6),[a,b]=s.learn(p,['ember','tackle']);G.Settings.set('castMode','toggle');
 assert.equal(G.MoveControl.wants(p,a),false);G.MoveControl.input(p,1);assert.ok(G.MoveControl.wants(p,b));assert.equal(G.MoveControl.wants(p,a),false);
 G.MoveControl.input(p,1);assert.equal(G.MoveControl.wants(p,b),false);G.MoveControl.input(p,0);assert.ok(G.MoveControl.wants(p,a));G.MoveControl.input(p,1);assert.ok(G.MoveControl.wants(p,b));
});

test('removed Choice Band cannot be gained, does not alter damage or block unused PP',()=>{
  const s=setup(),{G}=s,p=s.player(6),[a,b]=s.learn(p,['ember','tackle']);
  assert.equal(G.Items.BY.choiceband,undefined);assert.equal(G.Items.gain(p,'choiceband'),false);
  p.specialItems.choiceband=20;assert.equal(G.Items.damageBonus(p),0);assert.equal(G.Items.count(p,'choiceband'),0);
  G.MovePP.state(p,b).current=0;G.MovePP.tick(p,1);close(G.MovePP.state(p,b).current,1.5);
});

test('a click-triggered orbit lasts one cooldown cycle and does not restart by itself',()=>{
  const s=setup(),{G}=s,p=s.player(6),[m]=s.learn(p,['fire-spin']);m.cd=1;G.Settings.set('castMode','click');G.MoveControl.input(p,0);
  G.Combat.tick(0,p,0);assert.ok(G.Projectiles.all().some(o=>o.orb));G.Combat.tick(.5,p,.5);assert.ok(G.Projectiles.all().some(o=>o.orb));G.Combat.tick(.6,p,1.1);assert.ok(!G.Projectiles.all().some(o=>o.orb));
});
test('special reward choices pause and grant only the picked item; ordinary drops never replace them',()=>{
  const s=setup(),{G}=s,p=s.player(6);s.loadGame(p);let options,take;G.RunUI={showSpecialChoice:(a,cb)=>{options=a;take=cb;}};
  G.Game.offerSpecialChoice(['linker','luckymedal','candyjar']);assert.equal(G.Game.state,'choice');assert.equal(options.length,3);
  G.Game._test.collect({kind:'item',value:'leftovers'},p);assert.equal(G.Items.count(p,'leftovers'),1);assert.equal(G.Game.state,'choice');take('candyjar');assert.equal(G.Game.state,'playing');assert.equal(G.Items.count(p,'candyjar'),1);assert.equal(p.bonds,0);take('linker');assert.equal(p.bonds,0);
});
test('P2P item snapshots validate the catalogue and stack counts; host applies the remote damage bonus once',()=>{
  const s=setup(),{G}=s,p=s.player(6);let receive;G.Net={uid:'host',on:f=>receive=f,onPeer:noop};G.startMoveOf=()=> 'ember';G.Sprites.preload=noop;s.load('js/net/coop.js');
  G.Coop.begin({host:'host',members:[{uid:'host',dex:6},{uid:'peer',dex:6}]},p,{});
  const frame=[0,0,0,0,100,100,0,'ember',1,78,0,1,0,0,0,null,null,0,null,0,null,6,25,[4,5,6],[['lifeorb',2],['focussash',1],['__proto__',1],['leftovers',-1],['lifeorb',2001]]];
  receive('peer',{k:'f',p:frame,ev:[]});const peer=G.Coop.mate('peer').pl;
  assert.equal(G.Items.count(peer,'lifeorb'),2);assert.equal(G.Items.count(peer,'focussash'),1);assert.equal(Object.keys(peer.specialItems).length,2);
  const e=s.enemy(),before=e.hp;e.hurt(100,'#fff',0,0,0,null,peer,{kind:'melee'});assert.equal(before-e.hp,112);G.Coop.end();
});
