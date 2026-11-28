const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{context}=require('./battle_fixture.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`),noop=()=>{};
function setup(){
 const s=context('zh',false),g=s.G;for(const file of ['js/core/settings.js','js/data/egg-groups.js','js/data/support-skills.js','js/entities/projectile.js','js/systems/expedition-rules.js','js/data/expedition-quality.js','js/systems/expedition-quality.js','js/systems/squad.js','js/systems/squad-bonds.js','js/data/squad-traits.js','js/systems/squad-traits.js','js/systems/squad-support.js','js/systems/move-pp.js','js/systems/player-stats.js','js/systems/combat.js'])s.load(file);
 g.Sprites.preload=noop;g.Sprites.Animator.prototype._start=noop;g.World.propsInCircle=()=>[];g.World.isWall=()=>false;g.World.projectileBlock=()=>null;g.Difficulty={factors:()=>({hp:1,damage:1,speed:1}),onHurt:noop};g.Pickups={dropXp:noop,drop:noop};g.VFX={forMove:()=>({}),forType:()=>({})};
 const cap=s.player(25,'pressure');cap.addMove('thunder-shock');const r={...g.Economy.create(),day:1,phase:'combat',kind:'battle',gold:100,captain:cap,trainerLevel:2,extraPopPurchases:3};g.Expedition={run:r,get phase(){return r.phase;},get active(){return true;}};g.Game.player=cap;g.Squad.begin(cap);g.Squad.syncTrainer();const p=g.Squad.recruit(4),q=g.Squad.recruit(37);q.squadTraitOverride='indep_bond_type_atk';g.Squad.refresh();
 const actor=(effect,event=null)=>{const d=g.SquadTraitDefs.LIST.find(d=>d.effect===effect&&d.event===event);assert.ok(d,effect+' '+event);p.squadTraitOverride=d.id;g.SquadTraits.assign(p);return p;};
 return {...s,g,r,cap,p,q,T:g.SquadTraits,actor};
}
test('v3 Plan B JSON assigns every species, freezes all 143 Q5 families, keeps 6 mid-tier terminals and hits 773:193 species / 368:141 family split',()=>{
  const {g}=setup(),source=JSON.parse(fs.readFileSync('data/trait_rework_index.json','utf8'));
  assert.equal(source.version,'3.0.0');assert.equal(source.plan,'B');assert.equal(source.families.length,509);
  const terminals=new Set(['indep_bond_type_atk','indep_bond_type_def','indep_bond_class_stat','indep_legendary_all','indep_mythical_revive']);
  let n=0,tFam=0,tSpec=0,q5=0;const tplCounts={};
  for(const f of source.families){
    if(f.quality===5){q5++;assert.ok(!String(f.effectId||f.traitId).startsWith('v3_'),'Q5 frozen');}
    if(f.template)tplCounts[f.template]=(tplCounts[f.template]||0)+1;
    if(terminals.has(f.effectId||f.traitId)){tFam++;tSpec+=f.members.length;}
    for(const m of f.members){
      const d=g.SquadTraitDefs.forDex(m.dex);
      assert.equal(d.id,f.traitId);
      for(let rank=1;rank<=3;rank++)assert.equal(g.SquadTraitDefs.value({dex:m.dex,rank}),f.values[rank-1]);
      n++;
    }
  }
  assert.equal(n,966);assert.equal(q5,143);assert.equal(tFam,141);assert.equal(tSpec,193);assert.equal(n-tSpec,773);
  assert.equal(source.families.filter(f=>f.category==='independent').length,166);
  assert.equal(source.families.filter(f=>f.category==='conditional').length,343);
  for(const root of [4,775,84,207,751,884])assert.ok(terminals.has(g.SquadTraitDefs.forDex(root).effect),'Plan B kept terminal '+root);
  assert.deepEqual(tplCounts,{E1:10,E2:10,E3:6,E4:9,E5:10,S1:28,S2:23,S3:23,S4:23,S5:15,B1:7,B2:6,B3:7,B4:6,B5:4,B6:3});
});
test('type attack and defense depend on own active stacks, in complete ten-stack blocks, without mutating bases',()=>{const {g,T,p,q,actor}=setup();actor('indep_bond_type_atk');g.SquadBonds.setLayer('types','fire',0);const base=p.atk;g.SquadBonds.setLayer('types','fire',19);close(p.atk,base*1.07);close(p.spa/(p.baseSpa*(g.ExpeditionQuality.factors(p).ad)),1.07);g.SquadBonds.setLayer('types','water',100);close(T.factor(p,'atk'),1.07);const raw=p.baseAtk;for(let i=0;i<40;i++)g.Squad.refresh();assert.equal(p.baseAtk,raw);close(p.atk,base*1.07);actor('indep_bond_type_def');const original=p.baseDefense;close(p.defenseFor({kind:'contact'}),original*1.07);close(p.defenseFor({kind:'ranged'}),p.baseSpDef*1.07);g.Squad.bench(q);close(T.factor(p,'defense'),1);});
test('class fuel powers real agility/stamina cooldown and PP values and is removed from reserves',()=>{const {g,T,p,actor}=setup();actor('indep_bond_class_stat');g.SquadBonds.setLayer('skill','projectile',0);const a=p.agility,b=p.stamina,cd=g.PlayerStats.cooldown(p,p.moves[0]);g.SquadBonds.setLayer('skill','projectile',20);close(p.agility,a*1.14);close(p.stamina,b*1.14);assert.ok(g.PlayerStats.cooldown(p,p.moves[0])<cd);g.Squad.bench(p);close(T.factor(p,'agility'),1);});
test('legendary growth scales five combat stats, actual health and visual/collision size once and preserves injuries',()=>{const {g,T,p,actor}=setup();actor('indep_legendary_all');g.SquadBonds.setLayer('types','fire',0);g.SquadBonds.setLayer('skill','projectile',0);const hp=p.maxHp,atk=p.atk,spa=p.spa,def=p.defenseFor({kind:'contact'}),spdef=p.defenseFor({kind:'ranged'}),sp=p.spd,agi=p.agility,sta=p.stamina;p.hp=hp*.4;g.SquadBonds.setLayer('types','fire',20);g.Squad.refresh();const k=1+2*T.value(p)/100;close(p.maxHp,hp*k);close(p.hp,p.maxHp*.4);close(p.atk,atk*k);close(p.spa,spa*k);close(p.defenseFor({kind:'contact'}),def*k);close(p.defenseFor({kind:'ranged'}),spdef*k);close(p.spd,sp);close(p.agility,agi);close(p.stamina,sta);close(T.visualScale(p),k);close(p.r,10*k);for(let i=0;i<20;i++)g.Squad.refresh();close(p.maxHp,hp*k);g.Squad.bench(p);close(p.maxHp,hp);close(p.hp,hp*.4);});
test('family traits survive move replacement instead of forcing all buff moves into the former healer trait',()=>{const {g,T,p}=setup(),id=T.def(p).id;p.moves=[g.Moves.instance('swords-dance')];g.Squad.refresh();assert.equal(T.def(p).id,id);assert.equal(p.ability,null);assert.equal(g.Game.player.ability,'pressure');});
test('heal-on-cast affects the two formation neighbors, never self or distant actors, and uses floored v2 value',()=>{const {g,T,p,q,cap,actor}=setup();actor('indep_heal_allies');cap.hp=1;q.hp=1;p.hp=p.maxHp*.5;const own=p.hp,n=p.maxHp*T.value(p)/100;g.SquadSupport.cast(p,p.moves[0]);close(cap.hp,1+n);close(q.hp,Math.min(q.maxHp,1+n));close(p.hp,own);g.Squad.bench(p);T.cast(p,p.moves[0]);close(cap.hp,1+n);});
test('battle and rest events are independent, once-only, exclude fallen/reserve owners, and grant the new economy',()=>{const {T,p,r,actor,g}=setup();actor('gold','battle_end');const n=T.value(p);T.finishBattle(false);assert.equal(r.gold,100+n);T.finishBattle(true);assert.equal(r.gold,100+n);r.day++;p.dead=true;T.finishBattle();assert.equal(r.gold,100+n);p.dead=false;actor('gold','rest_end');r.phase='rest';T.restEnd();assert.equal(r.gold,100+n+T.value(p));T.restEnd();assert.equal(r.gold,100+n+T.value(p));assert.equal(g.EconomyConfig.economicTraitsEnabled,true);});
test('own cast and kill milestones retain progress across battles; reserve, menus and secondary damage do not add casts',()=>{const {T,p,r,actor,g}=setup();actor('bond_self','cast_100');for(let i=0;i<60;i++)T.cast(p,p.moves[0]);T.beginBattle();r.day++;for(let i=0;i<39;i++)T.cast(p,p.moves[0]);assert.equal(g.SquadBonds.layer('types','fire'),0);T.cast(p,p.moves[0]);assert.equal(g.SquadBonds.layer('types','fire'),T.value(p));T.cast(p,{id:'typebond-fire'});assert.equal(T.state(p).casts,0);actor('gold','kill_30');const n=T.value(p);for(let i=0;i<20;i++)T.kill(p);T.beginBattle();r.phase='shop';for(let i=0;i<20;i++)T.kill(p);r.phase='combat';for(let i=0;i<10;i++)T.kill(p);assert.equal(r.gold,100+n);});
test('former buy_xp traits (26 families) trigger every 3 trainer XP gained without recursion; global star-up cannot replay one material',()=>{
  const {g,T,p,r,cap,actor}=setup();
  assert.equal(g.SquadTraitIndex.families.filter(f=>f.event==='buy_xp').length,0);
  assert.equal(g.SquadTraitIndex.families.filter(f=>f.event==='xp_gain_3').length,26);
  r.phase='shop';assert.equal(g.Economy.buyXp(r),false);
  actor('gold','xp_gain_3');const n=T.value(p);
  const g0=r.gold;
  g.Economy.addXp(r,2);assert.equal(r.gold,g0);assert.equal(T.xpProgress,2);
  g.Economy.addXp(r,2);assert.equal(r.gold,g0+n);assert.equal(T.xpProgress,1);
  // exp@xp_gain_3 triggers once without infinite recursion
  actor('exp','xp_gain_3');const xpBefore=r.trainerXp;
  g.Economy.addXp(r,2); // 1 + 2 = 3 -> triggers exp@xp_gain_3 once
  assert.equal(r.trainerXp,xpBefore+2+T.value(p));assert.equal(T.xpProgress,0);
  // Checkpoint snapshot/restore preserves xpProgress
  g.Economy.addXp(r,2);assert.equal(T.xpProgress,2);
  const snap=T.snapshot([cap,p]);T.reset();assert.equal(T.xpProgress,0);
  T.restore(snap,[cap,p]);assert.equal(T.xpProgress,2);
  actor('gold','star_up');const material={};p.rank=2;r.gold=0;T.merge({},material);assert.equal(r.gold,T.value(p));T.merge({},material);assert.equal(r.gold,T.value(p));
});
test('adjacent bond gains deduplicate a shared global bond and max-type selects only one activated leader',()=>{const {g,T,p,q,actor,cap}=setup();actor('bond_adjacent','battle_end');cap.mon={...cap.mon,types:['fire']};g.Squad.refresh();T.trigger(p,'battle_end');assert.equal(g.SquadBonds.layer('types','fire'),T.value(p));actor('bond_max_type','rest_end');g.SquadBonds.setLayer('types','electric',999);g.SquadBonds.setLayer('types','fire',10);T.trigger(p,'rest_end');assert.equal(g.SquadBonds.layer('types','fire'),10+T.value(p));assert.equal(g.SquadBonds.layer('types','electric'),999);});
test('permanent neighbor stats and crit survive rearrangement and evolution without changing or repeatedly adding base stats',()=>{const {g,T,p,q,cap,actor}=setup();const raw=cap.baseAtk,old=cap.atk;actor('stat_atk_spa','battle_end');const n=T.value(p);T.trigger(p,'battle_end');close(cap.atk,old+T.flat(cap,'atk'));assert.equal(cap.baseAtk,raw);const granted=cap.atk;for(let i=0;i<20;i++)g.Squad.refresh();close(cap.atk,granted);actor('stat_agi_sta','rest_end');const agility=cap.agility;T.trigger(p,'rest_end');close(cap.agility,agility+T.value(p));actor('stat_crit','star_up');T.trigger(p,'star_up');close(T.crit(cap),T.value(p)/100);assert.equal(T.flat(p,'atk'),0);const flat=q.traitPermanent.atk;g.Squad.promote(q,{});assert.equal(q.traitPermanent.atk,flat);});
test('all four resource effects credit actual balances and report combat gains without paying them twice',()=>{const {T,p,r,cap,actor,g}=setup();actor('exp','battle_end');const xp=r.trainerXp;T.trigger(p,'battle_end');assert.equal(r.trainerXp,xp+T.value(p));actor('mon_xp','battle_end');const before=cap.level;T.trigger(p,'battle_end');assert.ok(cap.xp>0||cap.level>before);actor('free_refresh','battle_end');T.trigger(p,'battle_end');assert.equal(r.traitFreeRefresh,T.value(p));actor('gold','battle_end');T.trigger(p,'battle_end');const balance=r.gold,trait=r.traitBattleRewards.gold;const report=g.Economy.settleDay(r,{eventType:'battle',victory:true,cleared:true,remainingHpRatio:1,lockedGoldAtBattleStart:0});assert.equal(r.gold-balance,report.totalGoldGained-trait);assert.equal(report.traitGold,trait);assert.equal(report.traitXp,r.traitBattleRewards.exp);});
test('revival waits three simulation seconds, consumes a finite quota, gains new quotas only from layers and resets per battle',()=>{const {g,T,p,actor}=setup();actor('indep_mythical_revive');g.SquadBonds.setLayer('types','fire',50);T.beginBattle();const quota=T.reviveTotal(p);assert.ok(quota>0);for(let i=0;i<quota;i++){p.hp=1;p.invuln=0;p.hurt(10000,null,true,{kind:'ranged'});assert.ok(p.dead);T.tick(2.99);assert.ok(p.dead);T.tick(.01);assert.equal(p.dead,false);close(p.hp,p.maxHp);}p.hp=1;p.invuln=0;p.hurt(10000,null,true,{kind:'ranged'});T.tick(4);assert.ok(p.dead);T.beginBattle();assert.equal(T.state(p).usedRevives,0);g.Squad.recover();p.hp=1;p.invuln=0;p.hurt(10000,null,true,{kind:'ranged'});T.tick(3);assert.equal(p.dead,false);});
test('descriptions expose final integers only in all three languages and old terminal damage hooks are neutral',()=>{const {T,p,g,actor}=setup();actor('stat_atk_spa','battle_end');p.rank=2;for(const lang of ['zh','en','es']){g.I18n.lang=lang;const text=T.description(p);assert.ok(text.includes(String(T.value(p))));assert.doesNotMatch(text,/\[|×|stat_atk|conditional|Rank|品质|层数.*0.*200.*500/);}for(const d of g.SquadTraitDefs.LIST.filter(x=>String(x.effect).startsWith('v3_'))){p.squadTraitOverride=d.id;for(const lang of ['zh','en','es']){g.I18n.lang=lang;const text=T.description(p);assert.ok(text.length>10);assert.doesNotMatch(text,/\[|×|v3_/);}}assert.equal(T.beforeHit(p,{},{}).factor,1);assert.equal(T.cooldown(p),1);assert.equal(T.shield(p),0);});

test('E1 wage gold pays 1G per 2 victories with team 1G/battle cap, carry-over queue, and max 1 pending per holder',()=>{
  const {g,T,p,q,r,actor}=setup();
  actor('v3_wage_gold','battle_win_2');
  q.squadTraitOverride='v3_e1_wage';T.assign(q);
  r.day=1;T.finishBattle(true);assert.equal(r.gold,100);assert.equal(T.pendingWageCount(),0);
  r.day=2;T.finishBattle(true);assert.equal(r.gold,101);assert.equal(T.pendingWageCount(),1);assert.equal(r.traitPendingWage,1);
  r.day=3;T.finishBattle(true);assert.equal(r.gold,102);assert.equal(T.pendingWageCount(),0);
  // Holder cannot stack more than 1 pending qualification
  T.state(p).wagePending={amount:1,qualifiedAt:1};T.state(p).winCount=1;
  T.state(q).wagePending={amount:1,qualifiedAt:0};
  r.day=4;T.finishBattle(true);assert.equal(r.gold,103);assert.equal(T.state(p).winCount,1);assert.equal(T.state(p).wagePending.amount,1);
});

test('E2 battle log grants 1 trainer XP per 80 normal casts post-battle, capped 1/member and 2/team, ignoring extraCast',()=>{
  const {g,T,p,q,r,actor}=setup();
  const s3=g.Squad.recruit(10);
  actor('v3_trainer_xp','cast_80');q.squadTraitOverride='v3_e2_battle_log';s3.squadTraitOverride='v3_e2_battle_log';
  T.beginBattle();
  const xpBefore=r.trainerXp;
  // extraCast never counts
  for(let i=0;i<100;i++)T.cast(p,{...p.moves[0],extraCast:true});
  assert.equal(T.state(p).casts,0);
  for(let i=0;i<80;i++)T.cast(p,p.moves[0]);
  assert.equal(r.trainerXp,xpBefore,'paid after battle, not mid-battle');
  // second 80 on same member clamps at 79
  for(let i=0;i<85;i++)T.cast(p,p.moves[0]);
  assert.equal(T.state(p).casts,79);
  // second member fills team cap to 2; third member clamps at 79
  for(let i=0;i<80;i++)T.cast(q,q.moves[0]);
  for(let i=0;i<85;i++)T.cast(s3,s3.moves[0]);
  assert.equal(T.state(s3).casts,79);
  r.day=10;T.finishBattle(true);
  assert.equal(r.trainerXp,xpBefore+2);
  assert.equal(r.traitBattleRewards.exp,2);
});

test('E3 sweep notes grants 20/30/40 mon XP per 20 kills post-battle, max 2/battle per member, clamping at 19',()=>{
  const {T,p,r,cap,actor}=setup();
  actor('v3_mon_xp','kill_20');p.rank=2;
  T.beginBattle();
  const xp0=cap.xp,lvl0=cap.level;
  for(let i=0;i<40;i++)T.kill(p);
  assert.equal(cap.xp,xp0);assert.equal(cap.level,lvl0);
  for(let i=0;i<25;i++)T.kill(p);
  assert.equal(T.state(p).kills,19);
  // Star-up after trigger does not retroactively inflate locked pending reward
  p.rank=3;
  r.day=11;T.finishBattle(true);
  assert.equal(r.traitBattleRewards.mon_xp,60);
});

test('E4 rest study fills xpJar by 20/30/40 bounded by capacity, once per rest day',()=>{
  const {T,p,r,actor}=setup();
  actor('v3_xp_jar','rest_end');p.rank=3;
  r.phase='rest';r.day=12;r.xpJar=980;
  T.restEnd();assert.equal(r.xpJar,1000);
  r.xpJar=100;T.restEnd();assert.equal(r.xpJar,100,'once per rest day');
});

test('E5 scout refresh grants 1 free shop refresh per 3 victories, capped 2 per cycle across team, clamping at 2',()=>{
  const {T,p,q,r,actor}=setup();
  actor('v3_free_refresh','battle_win_3');q.squadTraitOverride='v3_e5_scout_refresh';
  const s3=T.state(p),sq=T.state(q);s3.winCount=2;sq.winCount=2;
  r.day=1;r.cycle=1;T.finishBattle(true);
  assert.equal(r.traitFreeRefresh,2);assert.equal(s3.winCount,0);assert.equal(sq.winCount,0);
  // 3rd trigger in same cycle clamps at 2
  s3.winCount=2;r.day=2;T.finishBattle(true);
  assert.equal(r.traitFreeRefresh,2);assert.equal(s3.winCount,2);
  // Next cycle unlocks again
  r.day=21;r.cycle=2;T.finishBattle(true);
  assert.equal(r.traitFreeRefresh,3);assert.equal(s3.winCount,0);
});

test('S1-S5 active stackers obey activation checks, clamping, 1s rate limit, deduplication and fixed tie-break',()=>{
  const {g,T,p,q,cap,actor}=setup();
  const s3=g.Squad.recruit(6); // fire/flying projectile -> activates projectile(3) & fire(>=2)
  g.Squad.refresh();
  // S1: cast 20 -> triggering move class; unactivated clamps at 19, 1s rate limit clamps at 19
  actor('v3_stack_own_class','cast_20');T.beginBattle();
  g.SquadBonds.setLayer('skill','projectile',0);
  for(let i=0;i<20;i++)T.cast(p,p.moves[0]);
  const nS1=T.value(p);
  assert.equal(g.SquadBonds.layer('skill','projectile'),nS1);
  for(let i=0;i<25;i++)T.cast(p,p.moves[0]); // same battleTime=0 -> rate-limited
  assert.equal(T.state(p).casts,19);
  assert.equal(g.SquadBonds.layer('skill','projectile'),nS1);
  T.tick(1);T.cast(p,p.moves[0]);
  assert.equal(g.SquadBonds.layer('skill','projectile'),nS1*2);
  // S2: cast 25 -> primary type; unactivated clamps at 24
  actor('v3_stack_own_type1','cast_25');T.beginBattle();
  g.SquadBonds.setLayer('types','fire',0);
  for(let i=0;i<25;i++)T.cast(p,p.moves[0]);
  assert.equal(g.SquadBonds.layer('types','fire'),T.value(p));
  // S3: cast 30 -> adjacent active bonds deduplicated, excludes self
  actor('v3_stack_adj','cast_30');T.beginBattle();
  g.SquadBonds.setLayer('types','fire',0);
  for(let i=0;i<30;i++)T.cast(p,p.moves[0]);
  assert.equal(g.SquadBonds.layer('types','fire'),T.value(p),'deduplicated across neighbors');
  // S4: kill 15 -> main move class
  actor('v3_stack_main_class','kill_15');T.beginBattle();
  const beforeS4=g.SquadBonds.layer('skill','projectile');
  for(let i=0;i<15;i++)T.kill(p);
  assert.equal(g.SquadBonds.layer('skill','projectile'),beforeS4+T.value(p));
  // S5: kill 30 -> team max active type
  actor('v3_stack_max_type','kill_30');T.beginBattle();
  g.SquadBonds.setLayer('types','fire',50);
  for(let i=0;i<30;i++)T.kill(p);
  assert.equal(g.SquadBonds.layer('types','fire'),50+T.value(p));
});

test('B1/B3 temp atk/def buffs affect adjacent actors including captain, refresh without stacking, and expire after 8s',()=>{
  const {T,p,q,cap,actor}=setup();
  actor('v3_buff_adj_atk','cast_20');T.beginBattle();
  const capAtk0=cap.atk,qAtk0=q.atk,pAtk0=p.atk;
  for(let i=0;i<20;i++)T.cast(p,p.moves[0]);
  const k=1+T.value(p)/100;
  close(cap.atk,capAtk0*k);close(q.atk,qAtk0*k);close(p.atk,pAtk0);
  // During 12s CD casts clamp at 19
  for(let i=0;i<25;i++)T.cast(p,p.moves[0]);
  assert.equal(T.state(p).casts,19);
  T.tick(8.01);
  close(cap.atk,capAtk0);close(q.atk,qAtk0);
  // B3 def buff does not alter damage reduction
  actor('v3_buff_adj_def','cast_25');T.beginBattle();
  const capDef0=cap.defenseFor({kind:'contact'}),red0=cap.reduction;
  for(let i=0;i<25;i++)T.cast(p,p.moves[0]);
  close(cap.defenseFor({kind:'contact'}),capDef0*(1+T.value(p)/100));
  assert.equal(cap.reduction,red0);
});

test('B2 rhythm lead grants base-agility extra to adjacent actors for next normal move and removes on cast or 6s',()=>{
  const {T,p,q,cap,actor}=setup();
  actor('v3_buff_adj_agi','cast_20');T.beginBattle();
  const capAgi0=cap.agility,qAgi0=q.agility;
  for(let i=0;i<20;i++)T.cast(p,p.moves[0]);
  const pct=Math.min(18,T.value(p))/100;
  close(cap.agility,capAgi0+cap.baseAgility*pct);
  close(q.agility,qAgi0+q.baseAgility*pct);
  // Captain casts normal move -> B2 consumed immediately
  T.cast(cap,cap.moves[0]);
  close(cap.agility,capAgi0);
  // Neighbor still has buff until 6s expiry
  close(q.agility,qAgi0+q.baseAgility*pct);
  T.tick(6.01);
  close(q.agility,qAgi0);
});

test('B4 adjacent triage heals lower HP ratio neighbor (preceding tie-break), caps at 3% target maxHp and 3%/s shared rate',()=>{
  const {T,p,q,cap,actor}=setup();
  actor('v3_buff_adj_heal','cast_6');T.beginBattle();
  // Full HP -> clamps at 5
  cap.hp=cap.maxHp;q.hp=q.maxHp;
  for(let i=0;i<8;i++)T.cast(p,p.moves[0]);
  assert.equal(T.state(p).casts,5);
  // Equal ratio -> preceding (cap) wins
  cap.hp=cap.maxHp*.5;q.hp=q.maxHp*.5;const capBefore=cap.hp,qBefore=q.hp;
  T.cast(p,p.moves[0]);
  const expected=Math.min(p.maxHp*.02,cap.maxHp*.03);
  close(cap.hp,capBefore+expected);close(q.hp,qBefore);
  // Immediate second trigger hitting cap's remaining 3%/s budget respects 3%/s ceiling
  for(let i=0;i<6;i++)T.cast(p,p.moves[0]);
  assert.ok(cap.hp-capBefore<=cap.maxHp*.03+1e-6);
});

test('B5 opening shield grants 3/4/5% white shield for 8s once per day, absorbs damage, and shares 40% cap',()=>{
  const {T,p,q,cap,r,actor}=setup();
  actor('v3_buff_adj_shield','battle_start');p.rank=2;r.day=15;
  T.beginBattle();
  close(T.shield(cap),cap.maxHp*.04);close(T.shield(q),q.maxHp*.04);close(T.shield(p),0);
  // Absorb via player.hurt
  const hp0=cap.hp;cap.invuln=0;cap.hurt(cap.maxHp*.02,null,true,{kind:'ranged'});
  close(cap.hp,hp0);close(T.shield(cap),cap.maxHp*.02);
  // Calling beginBattle again on same day does not double-grant
  T.beginBattle();close(T.shield(cap),0);
  // Expires after 8s on a fresh day
  r.day=16;T.beginBattle();assert.ok(T.shield(cap)>0);T.tick(8.01);assert.equal(T.shield(cap),0);
});

test('B6 PP relay restores 1 ordinary PP to lowest-ratio neighbor primary move with 10s CD and deficit cap',()=>{
  const {g,T,p,q,cap,actor}=setup();
  actor('v3_buff_adj_pp','cast_25');T.beginBattle();
  const capSt=g.MovePP.state(cap,cap.moves[0]),qSt=g.MovePP.state(q,q.moves[0]);
  capSt.current=capSt.max;qSt.current=qSt.max;
  // All full -> clamps at 24
  for(let i=0;i<26;i++)T.cast(p,p.moves[0]);
  assert.equal(T.state(p).casts,24);
  // q has lower PP ratio -> q gets +1 PP
  capSt.current=capSt.max-1;qSt.current=1;
  T.cast(p,p.moves[0]);
  assert.equal(qSt.current,2);assert.equal(capSt.current,capSt.max-1);
  // During 10s CD clamps at 24
  for(let i=0;i<26;i++)T.cast(p,p.moves[0]);
  assert.equal(T.state(p).casts,24);
  T.tick(10.01);T.cast(p,p.moves[0]);
  assert.equal(qSt.current,3);
});

test('checkpoint restore preserves v2 traits for legacy runs while new runs use v3 Plan B',()=>{
  const {g,T,cap}=setup();
  const bulba=g.Squad.recruit(1);
  assert.equal(T.schemaVersion,'3.0.0');
  assert.equal(T.def(bulba).effect,'v3_buff_adj_heal');
  // Legacy v2 snapshot (no schemaVersion field) restores v2 trait for Bulbasaur
  T.restore({battles:[1],rests:[],states:[{},{casts:5,kills:0}]},[cap,bulba]);
  assert.equal(T.schemaVersion,'2.0.0');
  assert.equal(T.def(bulba).effect,'indep_bond_type_def');
  assert.equal(T.value(bulba),5);
  // Resetting for a new run restores v3.0.0
  T.reset();
  assert.equal(T.schemaVersion,'3.0.0');
  assert.equal(T.def(bulba).effect,'v3_buff_adj_heal');
});
