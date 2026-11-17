const test=require('node:test'),assert=require('node:assert/strict'),{context}=require('./battle_fixture.cjs'),{once}=require('node:events');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),noop=()=>{};
function controller(s){
 const g=s.G,el=()=>({children:[],style:{},classList:{add:noop},append(...a){this.children.push(...a);},replaceChildren(){this.children=[];},setAttribute:noop,scrollIntoView:noop,querySelector:()=>null,dataset:{}}),nodes=new Map();
 s.document.getElementById=id=>{if(!nodes.has(id))nodes.set(id,el());return nodes.get(id);};s.document.createElement=el;s.requestAnimationFrame=noop;
 g.UI.spriteCanvas=el;g.UI.show=noop;g.UI.hideAll=noop;g.Icons={html:()=>''};g.Game.expeditionPause=noop;g.Game.expeditionResume=noop;g.Game.loot={gems:0,packs:{},stones:{}};g.Game.scoreEvent=noop;
 g.World.setBiome=noop;g.World.isFree=()=>true;g.EnemyMgr.clear=()=>{s.enemies.length=0;};g.EnemyMgr.update=noop;g.Projectiles.clear=noop;g.Combat={clearFields:noop};g.Pickups={clear:noop,drop:noop};g.Hazards={clear:noop};g.Path.clear=noop;g.Touch={reset:noop};
 s.load('js/data/expedition-lang.js');s.load('js/systems/expedition.js');g.Expedition.begin(s.player(4));return g.Expedition;
}
function setup(){const s=context('zh',false),g=s.G;for(const f of ['js/core/settings.js','js/data/egg-groups.js','js/entities/projectile.js','js/systems/expedition-rules.js','js/systems/squad.js','js/systems/move-control.js','js/systems/move-pp.js'])s.load(f);g.Sprites.preload=noop;g.Sprites.Animator.prototype._start=noop;return s;}

test('reserve warehouse has four slots, rejects overflow without changes, allows merging when full and release frees a slot',()=>{
 const s=setup(),g=s.G;g.Squad.begin(s.player(4));const team=[6,9,3,26,65,68,94].map(d=>g.Squad.recruit(d));assert.ok(team.every(Boolean));assert.equal(g.Squad.reserves().length,4);assert.equal(g.Squad.roster.length,7);
 assert.equal(g.Squad.recruit(143),null);assert.equal(g.Squad.roster.length,7);assert.equal(g.Squad.bench(team[0]),false);assert.equal(g.Squad.release(g.Squad.actors()[0]),false);
 assert.ok(g.Squad.recruit(94));assert.equal(g.Squad.roster.length,7);assert.equal(g.Squad.roster.find(p=>p.dex===94).rank,2);assert.ok(g.Squad.release(team[3]));assert.equal(g.Squad.reserves().length,3);assert.ok(g.Squad.recruit(143));assert.equal(g.Squad.reserves().length,4);
});

test('rank-one, rank-two and rank-three companion attacks use level 2, level 5 and the actual evolved move',()=>{
 const s=setup(),g=s.G;g.Squad.begin(s.player(25));const a=g.Squad.recruit(4,'ember');assert.equal(a.moves[0].lvl,2);g.Squad.recruit(4,'tackle');assert.equal(a.moves[0].lvl,5);assert.equal(a.moves[0].evolved,undefined);g.Squad.recruit(4);g.Squad.recruit(4);assert.equal(a.rank,3);assert.equal(a.moves[0].evolved,true);assert.equal(a.moves[0].name,g.Moves.EVO.ember[0]);assert.ok(a.moves[0].dmg>g.Moves.instance('ember',5).dmg);
 const b=new g.Squad.Member(4,3,'swords-dance');assert.equal(b.moves[0].evolved,true);assert.equal(b.moves[0].stacks,g.Moves.instance('swords-dance',5).stacks*2);
});

test('releasing a companion removes all its consecutive projectiles without deleting another companion shots',()=>{
 const s=setup(),g=s.G;g.Squad.begin(s.player(4));const a=g.Squad.recruit(7),b=g.Squad.recruit(25);for(let i=0;i<4;i++)g.Projectiles.spawn({owner:a,x:0,y:0});g.Projectiles.spawn({owner:b,x:0,y:0});g.Squad.release(a);assert.equal(g.Projectiles.all().length,1);assert.equal(g.Projectiles.all()[0].owner,b);
});

test('stopped captain attracts the tail, companions keep wandering and real Walk frames advance; reserves and fainted partners stay still',()=>{
 const s=setup(),g=s.G;s.load('js/core/sprites.js');g.Sprites.preload=noop;g.Squad.begin(s.player(4));const front=[7,25,133,1].map(d=>g.Squad.recruit(d));front[0].x=-400;const bench=front[3];bench.x=-600;const frames=new Set(),positions=new Set();
 for(let i=0;i<720;i++){g.Squad.tick(1/60);if(i>500){frames.add(front[0].anim.frame);positions.add(Math.round(front[0].x)+','+Math.round(front[0].y));}}
 assert.ok(Math.hypot(front[0].x,front[0].y)<120);assert.ok(front.slice(0,3).every(p=>p.walking));assert.ok(frames.size>=2);assert.ok(positions.size>10);assert.equal(bench.x,-600);
 const p=front[0];p.dead=true;p.anim.play('Faint',{hold:true});const pos=[p.x,p.y];for(let i=0;i<90;i++)g.Squad.tick(1/60);assert.deepEqual([p.x,p.y],pos);assert.equal(p.walking,false);assert.equal(p.anim.cur,'Faint');
 const leader=g.Squad.actors()[0];for(let i=0;i<180;i++){leader.x+=2;g.Squad.tick(1/60);}assert.ok(front[1].x>150);assert.ok(front[1].x<leader.x);assert.equal(bench.x,-600);
});

test('idle wandering respects blocked terrain and sealed arena boundaries',()=>{
 const s=setup(),g=s.G,p=s.player(4);p.x=60;g.Squad.begin(p);const a=g.Squad.recruit(7);g.World.isFree=(x,y,r)=>x-r>=0;g.World.arenaContains=(x,y,r)=>Math.hypot(x,y)+r<=170;
 for(let i=0;i<1800;i++){g.Squad.tick(1/60);assert.ok(a.x-a.r>=0);assert.ok(Math.hypot(a.x,a.y)+a.r<=170);}assert.equal(a.walking,true);
});

test('distant idle followers consume the existing pathfinder direction tuple without invalid coordinates',()=>{
 const s=setup(),g=s.G;g.Squad.begin(s.player(4));const a=g.Squad.recruit(7);a.x=-300;let paths=0;g.Path.dirFor=()=>{paths++;return [0,1];};g.Squad.tick(.3);assert.ok(paths>0);assert.equal(a.x,-300);assert.ok(a.y>0&&Number.isFinite(a.y));
});

test('buff moves support only self and immediate formation neighbors at thirty percent, following drag order',()=>{
 const s=setup(),g=s.G;s.load('js/systems/combat.js');g.VFX={forMove:()=>({})};const leader=s.player(4);g.Squad.begin(leader);const [a,b,c,bench]=[7,25,133,1].map(d=>g.Squad.recruit(d));const m=g.Moves.instance('swords-dance',2),cast=p=>{m.t=0;p.moves=[m];p.slots=[[m]];p.active=0;g.Combat.tick(.01,p,0);};cast(a);
 for(const p of [leader,a,b]){assert.equal(p.buffs.atk.n,1);close(p.buffFraction('atk'),m.amount*.3);}assert.equal(c.buffs.atk.n,0);assert.equal(bench.buffs.atk.n,0);
 g.Squad.place(c,0);for(const p of g.Squad.actors())p.buffs.atk.n=0;cast(a);assert.equal(leader.buffs.atk.n,0);for(const p of [a,b])assert.equal(p.buffs.atk.n,1);assert.equal(c.buffs.atk.n,0);
 g.Squad.reset();leader.buffs.atk.n=0;cast(leader);close(leader.buffFraction('atk'),m.amount);
});

test('battle recruitment is deferred, at most one companion; pending loot can wait for release and cannot be claimed twice',()=>{
 const s=setup(),g=s.G,E=controller(s);E.run.map[1][3].kind='battle';assert.ok(E.choose(1,3));s.random([0,0,0]);E.killed({expedition:true,dex:7});E.killed({expedition:true,dex:25});assert.equal(g.Squad.roster.length,0);assert.equal(E.run.companion,7);assert.equal(E.claimCompanion(),false);
 E.run.phase='rewards';E.recordPickup({kind:'xp',value:25});E.recordPickup({kind:'ticket',value:1});E.recordPickup({kind:'coin',value:12});E.showLoot(2);assert.equal(E.phase,'loot');assert.equal(E.run.levels,2);assert.equal(E.run.loot.xp,25);assert.equal(E.run.loot.coin,12);
 for(const d of [6,9,3,26,65,68,94])g.Squad.recruit(d);assert.equal(E.claimCompanion(),false);assert.equal(E.run.companionResolved,false);g.Squad.release(g.Squad.reserves()[0]);assert.equal(E.claimCompanion(),true);assert.equal(E.claimCompanion(),false);assert.equal(g.Squad.reserves().length,4);
});

test('shop moves are rolled before purchase, survive page refresh, and insufficient capacity never spends gold or stock',()=>{
 const s=setup(),g=s.G,E=controller(s);E.run.map[1][3].kind='shop';assert.ok(E.choose(1,3));const o=E.offers[0];assert.ok(g.Moves.poolFor(g.DEX_BY[o.dex]).includes(o.moveId));const move=o.moveId;E.refreshScreen();assert.equal(E.offers[0].moveId,move);assert.ok(E.buy(0));assert.equal(g.Squad.roster[0].moves[0].id,move);
 for(const p of [...g.Squad.roster])g.Squad.release(p);for(const d of [6,9,3,26,65,68,94])g.Squad.recruit(d);E.run.gold=500;E.offers.push({kind:'mon',dex:143,moveId:'tackle',cost:20});const i=E.offers.length-1;assert.equal(E.buy(i),false);assert.equal(E.run.gold,500);assert.equal(E.offers[i].sold,undefined);g.Squad.release(g.Squad.reserves()[0]);assert.equal(E.buy(i),true);assert.equal(E.run.gold,480);
});

test('higher shop levels progressively favor rank two and three; direct purchases retain the advertised rank and move',()=>{
 const s=setup(),g=s.G,R=g.ExpeditionRules;let previous=0;
 for(let lv=1;lv<=6;lv++){const counts=[0,0,0];for(let n=0;n<10000;n++)counts[R.shopRank(lv,()=>n/10000)-1]++;assert.ok(counts[1]+counts[2]>=previous);previous=counts[1]+counts[2];for(let i=0;i<3;i++)assert.ok(Math.abs(counts[i]/10000-R.rankRates[lv-1][i])<.001);}
 const E=controller(s);E.run.map[1][3].kind='shop';E.choose(1,3);E.run.gold=1000;E.offers.push({kind:'mon',dex:6,rank:3,moveId:'ember',cost:100});assert.ok(E.buy(E.offers.length-1));const a=g.Squad.roster[0];assert.equal(a.rank,3);assert.equal(a.moves[0].id,'ember');assert.equal(a.moves[0].evolved,true);
});
test('schedule is 21 by 7: start at column four, only three adjacent next-day cells, every cycle ends in seven Bosses',()=>{
 const g=setup().G,R=g.ExpeditionRules;
 for(let cycle=1;cycle<=4;cycle++){const grid=R.matrix(cycle);assert.equal(grid.length,21);assert.ok(grid.every(r=>r.length===7));assert.ok(grid[20].every(c=>c.kind==='boss'&&c.day===cycle*20));assert.equal(grid[0][3].day,(cycle-1)*20);for(const row of grid)for(const c of row)assert.equal(R.reachable(0,3,c.row,c.col),c.row===1&&[2,3,4].includes(c.col));}
 assert.equal(R.matrix(3)[20][0].day,60);assert.equal(R.reachable(3,0,4,0),true);assert.equal(R.reachable(3,0,4,-1),false);assert.equal(R.reachable(3,0,5,0),false);
});
test('non-Boss schedule distribution follows 10:2:5:5 and generation pool includes captain plus two distinct regions',()=>{
 const g=setup().G,R=g.ExpeditionRules;let seed=7;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),counts={battle:0,elite:0,shop:0,rest:0};
 for(let i=0;i<300;i++)for(const row of R.matrix(1,rng).slice(1,20))for(const c of row)counts[c.kind]++;
 const total=300*19*7;for(const [id,w]of R.weights)assert.ok(Math.abs(counts[id]/total-w/22)<.01,JSON.stringify(counts));
 const gens=R.generations(g.DEX_BY[6],rng);assert.equal(gens.length,3);assert.equal(new Set(gens).size,3);assert.ok(gens.includes(1));assert.ok(R.pool(gens).every(p=>gens.includes(p.gen)&&g.SPRITE_META[p.dex]));
});
test('cycle transition is a discrete large increase; finite waves have bounded spawn count and deadline',()=>{
 const R=setup().G.ExpeditionRules;for(let day=1;day<200;day++){const w=R.wave(day);assert.ok(w.count>0&&w.count<=168);assert.ok(w.duration>=24&&w.duration<=60);assert.ok(Number.isFinite(w.hp)&&Number.isFinite(w.dmg));}
 close(R.wave(21).hp/R.wave(1).hp,3);close(R.wave(41).dmg/R.wave(21).dmg,1.8);for(const day of [20,40,60,80]){assert.ok(R.wave(day+1).hp>R.wave(day).hp);assert.ok(R.wave(day+1).dmg>R.wave(day).dmg);assert.ok(R.wave(day+1).speed>=R.wave(day).speed);}
 assert.equal(R.capacity(1),4);assert.equal(R.capacity(6),9);assert.ok(R.upgradeCost(5)>R.upgradeCost(1));
});
test('recruitment immediately deploys one random legal move at level two, with half agility and half stamina, independent of click controls',()=>{
 const s=setup(),g=s.G,leader=s.player(4);g.Squad.begin(leader);leader.level=17;const p=g.Squad.recruit(6);assert.equal(p.level,17);assert.equal(p.moves.length,1);assert.equal(p.moves[0].lvl,2);assert.ok(g.Moves.poolFor(p.mon).includes(p.moves[0].id));close(p.agilityFor(p.moves[0]),p.agility*.5);close(p.staminaFor(p.moves[0]),p.stamina*.5);close(p.ppIntervalFor(),g.MonProgression.ppInterval(p.stamina*.5));g.Settings.set('castMode','click');assert.equal(g.MoveControl.wants(p,p.moves[0]),true);p.gainXp(100000);assert.equal(p.level,17);assert.equal(p.moves[0].lvl,2);assert.ok(g.Squad.actors().includes(p));
});
test('two equal species and equal ranks combine, evolve one stage and never exceed rank three',()=>{
 const s=setup(),g=s.G;g.Squad.begin(s.player(25));for(let i=0;i<2;i++)g.Squad.recruit(4);assert.equal(g.Squad.roster.length,1);assert.equal(g.Squad.roster[0].dex,5);assert.equal(g.Squad.roster[0].rank,2);assert.equal(g.Squad.roster[0].moves[0].lvl,5);const move=g.Squad.roster[0].moves[0].id;
 for(let i=0;i<2;i++)g.Squad.recruit(4);assert.equal(g.Squad.roster.length,1);assert.equal(g.Squad.roster[0].dex,6);assert.equal(g.Squad.roster[0].rank,3);assert.equal(g.Squad.roster[0].moves[0].id,move);assert.equal(g.Squad.roster[0].moves[0].lvl,5);assert.equal(g.Squad.roster[0].moves[0].evolved,true);
 for(let i=0;i<4;i++)g.Squad.recruit(4);assert.equal(g.Squad.roster.length,2);assert.ok(g.Squad.roster.every(p=>p.dex===6&&p.rank===3));
});
test('tags include both types, both egg groups, and the actual random skill class',()=>{
 const s=setup(),g=s.G;g.Squad.begin(s.player(25));const p=g.Squad.recruit(6),t=g.Squad.tags(p);assert.deepEqual(Array.from(t.types),['fire','flying']);assert.deepEqual(Array.from(t.eggs),[1,14]);assert.equal(t.skill,p.moves[0].kind);
});
test('knocked out deployed members keep support talents; reserves give no support; rearrangement and shop upgrade change deployed roster',()=>{
 const s=setup(),g=s.G,leader=s.player(4);g.Squad.begin(leader);const a=g.Squad.recruit(6),b=g.Squad.recruit(7),c=g.Squad.recruit(25),reserve=g.Squad.recruit(12);const talent=g.Squad.talent(a);assert.equal(talent.key,'atk');close(g.Squad.growth(leader,'atk'),.03);a.dead=true;a.hp=0;g.Squad.refresh();close(g.Squad.growth(leader,'atk'),.03);assert.ok(!g.Squad.actors().includes(reserve));assert.equal(g.Squad.growth(reserve,'atk'),0);const before=leader.agility;assert.ok(g.Squad.reorder(3,-1));assert.ok(g.Squad.deployed().includes(reserve));assert.ok(leader.agility<before);assert.ok(g.Squad.upgrade());assert.equal(g.Squad.deployed().length,4);assert.ok(g.Squad.actors().includes(c));
});
test('support HP recalculation does not repeatedly heal or grow health; fallen allies restore after stage',()=>{
 const s=setup(),g=s.G,leader=s.player(4);g.Squad.begin(leader);g.Squad.recruit(19);const max=leader.maxHp;leader.hp=max/2;for(let i=0;i<10;i++)g.Squad.refresh();close(leader.maxHp,max);close(leader.hp,max/2);
 const p=g.Squad.roster[0];p.dead=true;p.hp=0;g.MovePP.state(p,p.moves[0]).current=0;leader.level=22;g.Squad.recover();assert.equal(p.level,22);assert.equal(p.dead,false);close(p.hp,p.maxHp);close(g.MovePP.state(p,p.moves[0]).current,g.MovePP.max(p,p.moves[0]));
});
test('snake formation follows sampled captain route, shares level, and keeps members within a finite trail',()=>{
 const s=setup(),g=s.G,leader=s.player(4);g.Squad.begin(leader);for(const d of [7,25,133])g.Squad.recruit(d);leader.level=7;
 for(let i=0;i<160;i++){leader.x+=3;if(i>80)leader.y+=2;g.Squad.tick(1/30);}
 const members=g.Squad.deployed();assert.ok(members.every(p=>p.level===7&&p.x<leader.x&&Number.isFinite(p.y)));assert.ok(members[0].x>members[1].x&&members[1].x>members[2].x);
});
test('real companion Walk frames advance across sampled-path gaps, casts animate without losing half-stat role, and Faint holds',()=>{
 const s=setup(),g=s.G;s.load('js/core/sprites.js');g.Sprites.preload=noop;const leader=s.player(4);g.Squad.begin(leader);const p=g.Squad.recruit(7),frames=new Set(),states=[];
 for(let i=0;i<180;i++){leader.x+=leader.spd/60;g.Squad.tick(1/60);if(i>70){states.push(p.anim.cur);if(p.anim.cur==='Walk')frames.add(p.anim.frame);}}
 assert.ok(frames.size>=3,JSON.stringify({frames:[...frames],states}));assert.ok(states.filter(x=>x==='Walk').length>states.length*.9);
 const m=g.Moves.instance('water-gun');p.moves=[m];p.slots=[[m]];p.anim._start('Idle',false);assert.equal(p.isPrimaryMove(m),false);p.cast(m);assert.equal(p.anim.cur,'Shoot');assert.ok(p.anim.once);const shotFrames=new Set();for(let i=0;i<24;i++){p.update(1/60);if(p.anim.cur==='Shoot')shotFrames.add(p.anim.frame);}assert.ok(shotFrames.size>=2);
 p.dead=true;p.anim.play('Faint',{hold:true});for(let i=0;i<180;i++)p.update(1/60);assert.equal(p.anim.cur,'Faint');assert.equal(p.anim.done,true);
});
test('companion details show full stat totals and the effective half agility/stamina actually consumed by its skill',()=>{
 const s=setup(),g=s.G;for(const f of ['js/systems/player-stats.js','js/ui/squad-ui.js'])s.load(f);g.Squad.begin(s.player(4));const p=g.Squad.recruit(7);p.baseAgility=160;p.baseStamina=200;
 const rows=g.SquadUI.statRows(p);assert.equal(rows.length,8);assert.equal(rows.find(r=>r.key==='agility').total,160);assert.ok(rows.find(r=>r.key==='agility').battle.includes('80'));assert.equal(rows.find(r=>r.key==='stamina').total,200);assert.ok(rows.find(r=>r.key==='stamina').battle.includes('100'));assert.ok(rows.find(r=>r.key==='stamina').battle.includes('3 PP/s'));
});
test('timed world chests accumulate nearby time, lose progress away, and still open once after 3.5 seconds',()=>{
 const s=setup(),g=s.G;s.load('js/systems/interact.js');const p=s.player(4),chest={type:'bigchest',x:0,y:0,r:14,open:0};let opens=0;g.World.specialsNear=()=>opens?[]:[chest];g.World.breakProp=()=>opens++;
 g.Interact.update(3,p);assert.equal(opens,0);close(chest.open,3);p.x=500;g.Interact.update(1,p);close(chest.open,1.5);p.x=0;g.Interact.update(1.99,p);assert.equal(opens,0);g.Interact.update(.02,p);assert.equal(opens,1);g.Interact.update(20,p);assert.equal(opens,1);
});
test('new expedition difficulty has fivefold enemy health and double finite-wave spawn frequency, with the original deadline and field cap',()=>{
 const R=setup().G.ExpeditionRules;for(const day of [1,20,21,40,60]){const c=R.cycleOf(day),w=(day-1)%20+1;close(R.wave(day).hp,5*(1+.8*Math.pow(w/20,1.7))*Math.pow(3,c-1));assert.equal(R.wave(day).count,2*(12+Math.min(72,day*2)));close(R.wave(day).duration,Math.min(60,24+day*1.2));}
});
test('drag formation can swap active and reserve partners, leave an empty field slot and deploy again without changing membership',()=>{
 const s=setup(),g=s.G,leader=s.player(4);g.Squad.begin(leader);const a=g.Squad.recruit(6),b=g.Squad.recruit(7),c=g.Squad.recruit(25),d=g.Squad.recruit(133),ids=g.Squad.roster.map(p=>p.squadId);assert.equal(g.Squad.reserves()[0],d);
 assert.ok(g.Squad.place(d,0));assert.equal(g.Squad.formation[0],d);assert.ok(g.Squad.reserves().includes(a));assert.equal(g.Squad.growth(leader,'atk'),0);assert.ok(g.Squad.bench(b));assert.equal(g.Squad.formation[1],null);assert.equal(g.Squad.deployed().length,2);assert.ok(g.Squad.place(a,1));assert.equal(g.Squad.formation[1],a);assert.ok(g.Squad.growth(leader,'atk')>0);assert.ok(g.Squad.swap(c,b));assert.equal(g.Squad.formation[2],b);assert.ok(g.Squad.reserves().includes(c));assert.deepEqual(g.Squad.roster.map(p=>p.squadId),ids);
 assert.equal(g.Squad.place(leader,0),false);assert.equal(g.Squad.place(a,8),false);assert.equal(g.Squad.place(a,-1),false);assert.equal(new Set(g.Squad.deployed()).size,g.Squad.deployed().length);
});
test('new recruits fill vacancies, and merging an active copy into a reserve copy preserves its formation slot',()=>{
 const s=setup(),g=s.G;g.Squad.begin(s.player(25));const a=g.Squad.recruit(4);g.Squad.bench(a);g.Squad.recruit(4);assert.equal(g.Squad.roster.length,1);assert.equal(g.Squad.formation[0],a);assert.equal(a.dex,5);assert.equal(a.rank,2);g.Squad.bench(a);const b=g.Squad.recruit(7);assert.equal(g.Squad.formation[0],b);assert.ok(g.Squad.reserves().includes(a));
});
test('shop border uses all eight IVs and perfect values are red; unregistered species stay white',()=>{
 const g=setup().G,R=g.ExpeditionRules,s={owned:{}};assert.equal(R.border(s,4),'white');for(const [v,color]of [[1,'blue'],[16,'purple'],[25,'orange'],[31,'red']]){s.owned[4]={iv:Array(8).fill(v)};assert.equal(R.border(s,4),color);}
});
test('all local bodies can be hit by hostile projectiles and hazards; friendly damage is credited to actual companion owner',()=>{
 const s=setup(),g=s.G,leader=s.player(4);for(const f of ['js/entities/projectile.js','js/systems/combat.js','js/systems/hazards.js'])s.load(f);g.Squad.begin(leader);const p=g.Squad.recruit(6);p.x=100;p.y=0;leader.x=-300;p.invuln=leader.invuln=0;g.World.projectileBlock=()=>null;g.World.propsInCircle=()=>[];g.VFX={forType:()=>({}),forMove:()=>({})};g.Game.player=leader;g.Game.everyone=()=>g.Squad.actors();const hp=p.hp;
 g.Projectiles.spawn({friendly:false,x:p.x,y:p.y,dmg:10,r:4});g.Combat.resolve(0,leader,0);assert.ok(p.hp<hp);assert.equal(leader.hp,leader.maxHp);
 const e=s.enemy();e.x=p.x;e.y=p.y;let owner;e.hurt=(amount,col,x,y,k,eff,attacker)=>{owner=attacker;return 3;};p.critChance=0;leader.critChance=1;
 g.Projectiles.spawn({x:e.x,y:e.y,dmg:10,r:8,owner:p,hits:new Set(),phits:new Set(),pierce:0});g.Combat.resolve(0,leader,0);assert.equal(owner,p);assert.equal(p.dmgDealt,3);assert.equal(leader.dmgDealt,0);
 g.EnemyMgr.get=()=>null;const prev=p.hp;g.Hazards.add({kind:'zone',x:p.x,y:p.y,r:50,delay:0,dmg:7,color:'#f00'});g.Hazards.update(.1);assert.ok(p.hp<prev);
});
test('expedition victory requires Arceus, never elapsed time; survival mode retains its old checkpoint',()=>{
 const {G,fresh}=require('../server/domain.cjs'),D=G.Difficulty,s=fresh('Victory'),r={stars:1,dex:4,eligible:true,mode:'q',expedition:{day:59,arceus:false}};assert.equal(D.record(s,r,3600,true,true),false);assert.equal(D.unlocked(s),1);r.expedition={day:60,arceus:true};assert.equal(D.record(s,r,300,true,true),true);assert.equal(D.unlocked(s),2);for(const dex of [4,5,6])assert.equal(s.difficultyRecords[dex][1].won,true);assert.equal(D.claimBonus(s,r,100),100);assert.equal(s.coins>=200,true);assert.equal(D.claimBonus(s,r,100),0);
});
test('continuing past victory closes only that run cashout window; next run may still claim the difficulty opportunity',()=>{
 const R=require('../server/domain.cjs').G.ExpeditionRules;const won=R.progress({day:60,arceus:true,cashout:true});assert.ok(won.cashout);const continued=R.progress({day:60,arceus:true,cashout:false},won);assert.equal(continued.cashout,false);assert.equal(R.progress({day:60,arceus:true,cashout:true},continued).cashout,false);assert.equal(R.progress({day:61,arceus:true,cashout:true},won).cashout,false);assert.equal(R.progress({day:20,arceus:false},won).arceus,true);
});
test('isolated server records day-60 victory, pays one doubled cashout, rejects time-only victory and keeps new mode out of old score board',async t=>{
 const {createApp}=require('../server/server.cjs'),app=createApp({dbFile:':memory:',stunUrls:'none'});t.after(()=>app.close());app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;let cookie;
 async function call(route,body){const res=await fetch(base+'/api'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-PS-Client':'1',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});cookie=res.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:res.status,data:await res.json()};}
 const a=await call('/register',{name:'ExpeditionTest',pass:'test-only-strong-password'});assert.equal(a.status,201);const uid=a.data.user.uid,row=app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(uid),save=JSON.parse(row.payload);save.partner=4;save.owned[4]={iv:Array(8).fill(20)};app.db.prepare('UPDATE saves SET payload=? WHERE uid=?').run(JSON.stringify(save),uid);
 const started=await call('/run/start',{dex:4,stars:1,mode:'q',clean:true});assert.equal(started.status,200);const id=started.data.id,baseRun={id,t:1801,speed:1,alive:true,clean:true,kills:3,lv:5,scoreCounts:{normal:0,elite:0,boss:3,rift:0,events:59},expedition:{day:59,arceus:false,cashout:false}};
 const early=await call('/run/beat',baseRun);assert.equal(early.status,200,JSON.stringify(early));assert.equal((await call('/session')).data.save.difficulty.cleared[1],undefined);assert.equal((await call('/run/bonus',{...baseRun,coins:100})).status,400);
 const victory={...baseRun,expedition:{day:60,arceus:true,cashout:true}},bonus=await call('/run/bonus',{...victory,coins:100});assert.equal(bonus.status,200,JSON.stringify(bonus));assert.equal(bonus.data.extra,100);assert.equal(bonus.data.save.difficulty.cleared[1],true);assert.equal((await call('/run/bonus',{...victory,coins:100})).data.extra,0);
 const end=await call('/run/end',{...victory,alive:false,failed:true});assert.equal(end.status,200);assert.equal(app.db.prepare('SELECT COUNT(*) n FROM run_scores').get().n,0);assert.equal((await call('/run/end',{...victory,alive:false})).data.alreadyEnded,true);
 const second=await call('/run/start',{dex:4,stars:1,mode:'q',clean:true}),other={...victory,id:second.data.id};assert.equal((await call('/run/beat',other)).status,200);assert.equal((await call('/run/beat',{...other,expedition:{day:60,arceus:true,cashout:false}})).status,200);assert.equal((await call('/run/bonus',{...other,coins:100})).status,400);
});
