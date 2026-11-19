const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{context}=require('./battle_fixture.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function setup(kind='projectile',count=5){
 const s=context('zh',false),g=s.G;for(const f of ['js/core/settings.js','js/data/egg-groups.js','js/entities/projectile.js','js/systems/expedition-rules.js','js/systems/squad.js','js/systems/squad-bonds.js','js/systems/move-control.js','js/systems/move-pp.js','js/systems/expedition-damage.js'])s.load(f);
 vm.runInContext(fs.readFileSync('js/systems/combat.js','utf8').replace('return { reach, tick,','return { _fields:()=>fields, reach, tick,'),s);
 g.Sprites.preload=()=>{};g.Sprites.Animator.prototype._start=()=>{};g.FX=new Proxy({},{get:(t,k)=>t[k]||(()=>{})});g.World.propsInCircle=()=>[];g.World.projectileBlock=()=>null;g.World.isWall=()=>false;g.World.isFree=()=>true;g.VFX={forMove:m=>({pal:m.bondPalette||m.type}),forType:()=>({})};g.EnemyMgr.get=id=>s.enemies.find(e=>e.id===id);g.Camera.sees=()=>true;
 const run=g.Economy.create();run.trainerLevel=10;run.phase='combat';g.Expedition={run};const cap=s.player(25);g.Squad.begin(cap);g.Squad.syncTrainer();
 const move=()=>g.Moves.instance(g.Moves.ALL.find(m=>m.kind===kind).id,2);cap.moves=[move()];cap.slots=[cap.moves];
 for(const dex of [1,4,7,16,19,21,23,27,29].slice(0,count)){const p=g.Squad.recruit(dex);assert.ok(p);p.moves=[move()];p.slots=[p.moves];p.active=0;p.critChance=0;p.invuln=100;}
 g.Squad.refresh();const p=g.Squad.deployed()[0];g.Game.player=cap;return Object.assign(s,{p,cap,m:p.moves[0]});
}
function enemy(s,x=60,y=0){const e=s.enemy();e.x=x;e.y=y;e.touchCd=100;e.hp=e.maxHp=1e9;e.calls=[];e.hurt=(n,...args)=>{e.calls.push({n,args});return n;};return e;}
function cast(s){s.p.target=s.enemies[0];s.p.aim=0;s.m.t=0;s.G.Combat.tick(.001,s.p,0);}

test('unified classes share counts and stacks, captain counts but never benefits, reserves and duplicate names do not count',()=>{
 const s=setup('projectile',2),g=s.G,B=g.SquadBonds;g.Squad.deployed()[1].moves=[g.Moves.instance('razor-leaf')];s.p.moves.push(g.Moves.instance('flamethrower'));g.Squad.refresh();assert.equal(B.state('cone').count,3);assert.equal(B.state('cone').tier,3);assert.equal(B.layer('skill','cone'),0);B.setLayer('skill','boomerang',200);close(B.layer('skill','projectile'),200);close(B.agility(s.p,s.m),2);close(B.agility(s.cap,s.cap.moves[0]),1);close(B.agility(s.p,{...s.m,zMove:true}),1);assert.equal(B.move(s.cap,s.cap.moves[0]),s.cap.moves[0]);
 const q=g.Squad.deployed()[1];q.mon={...q.mon,name:s.p.mon.name};g.Squad.refresh();assert.equal(B.state('cone').count,2);q.mon={...q.mon,name:'another'};q.dead=true;g.Squad.refresh();assert.equal(B.state('cone').count,3);g.Squad.bench(q);assert.equal(B.state('cone').count,2);assert.equal(B.agility(q,q.moves[0]),1);
 for(const [raw,canonical]of [['dash','melee'],['trail','area'],['meteor','area'],['aura','bloom'],['nova','bloom'],['mine','summon'],['turret','summon']])assert.equal(B.group(raw),canonical);
 assert.equal(B.state('buff').tier,0);for(const n of [NaN,-1,10001])assert.equal(B.setLayer('skill','area',n),false);
});

test('0/200/500 nodes interpolate and continue after 500 at half the last slope',()=>{
 const {G:g}=setup();for(const [n,v]of [[0,.5],[100,.75],[200,1],[350,1.25],[500,1.5],[800,1.75]]){g.SquadBonds.setLayer('skill','projectile',n);close(g.SquadBonds.value('projectile','agility'),v);}close(g.SquadBonds.value('area','agility',800),3);g.SquadBonds.reset();assert.equal(g.SquadBonds.layer('skill','projectile'),0);
});

test('actual penetrations compound damage, collision and art; no penetration means no growth; attribution follows the damage',()=>{
 for(const kind of ['projectile','boomerang','cone']){const s=setup(kind),g=s.G;const a=enemy(s,60),b=enemy(s,160),c=enemy(s,260);s.m.count=1;s.m.pierce=2;cast(s);const p=g.Projectiles.all()[0];for(const q of [...g.Projectiles.all()])if(q!==p)g.Projectiles.remove(q);p.pierce=2;const base=p.dmg,r=p.r,art=p.r>=8?1.5:1;
 for(const [i,e]of [a,b,c].entries()){p.x=p.px=e.x;p.y=p.py=e.y;g.Combat.resolve(0,s.cap,i+1);close(e.calls[0].n,base*1.2**i);if(i<2){close(p.r,r*1.2**(i+1));close(p.visualScale,art*1.2**(i+1));}}
 assert.equal(g.Projectiles.count,0);assert.equal(p.bondUnstable,undefined);const contributions=c.calls[0].args.at(-1).bondDamageContributions;close(contributions[0][1],1.44);
 }
 const s=setup(),g=s.G,e=enemy(s);s.m.pierce=0;cast(s);const p=g.Projectiles.all()[0],r=p.r;p.x=p.px=e.x;p.y=p.py=e.y;g.Combat.resolve(0,s.cap,1);close(p.r,r);
});

test('solid props consume penetration and grow a shot, grass does neither',()=>{
 const s=setup(),g=s.G;enemy(s,400);s.m.pierce=2;cast(s);const p=g.Projectiles.all()[0],r=p.r;g.World.damageProp=()=>{};g.World.propsInCircle=()=>[{id:1,solid:false},{id:2,solid:true}];g.Combat.resolve(0,s.cap,1);assert.equal(p.pierce,1);close(p.r,r*1.2);
});

test('melee splash and dash width grow while dash distance stays fixed; crowd grants agility and actual damage lifesteal',()=>{
 const s=setup('melee'),g=s.G;enemy(s,40);enemy(s,50);const view=g.SquadBonds.move(s.p,s.m);close(view.radius,s.m.radius*1.5);close(g.SquadBonds.agility(s.p,s.m),1.2);s.p.hp=s.p.maxHp-10;const hp=s.p.hp;g.SquadBonds.afterHit(s.p,s.enemies[0],view,10);close(s.p.hp,hp+.4);g.SquadBonds.afterHit(s.p,s.enemies[0],view,0);close(s.p.hp,hp+.4);
 const d=g.SquadBonds.move(s.p,g.Moves.instance('quick-attack'));close(d.width,34*1.5);close(d.radius,g.Moves.instance('quick-attack').radius);assert.equal(g.SquadBonds.move(s.p,view),view);
});

test('area strikes delay damage and grow radius during warning/active lifetime; projectile placement reach is expanded',()=>{
 const s=setup('meteor'),g=s.G;enemy(s,40);cast(s);const f=g.Combat._fields()[0];close(f.fall,1);const base=f.r;g.Combat.updateFields(.5);close(f.r,base*2);assert.equal(s.enemies[0].calls.length,0);g.Combat.updateFields(.5);assert.equal(s.enemies[0].calls.length,1);close(f.r,base*3);close(g.Combat.reach(g.SquadBonds.move(s.p,s.m)),680);close(g.SquadBonds.agility(s.p,s.m),1.8);
 const t=setup('trail'),h=t.G;t.Math.random=()=>.5;const e=enemy(t,0);cast(t);const patch=h.Combat._fields()[0];e.x=patch.x;e.y=patch.y;h.Combat.updateFields(.9);assert.equal(e.calls.length,0);h.Combat.updateFields(.2);assert.equal(e.calls.length,1);h.Combat.updateFields(1);assert.ok(patch.r>patch.baseR*1.6);
});

test('bloom buffs both physical kinds and stuns elites fully, Bosses for half duration; stunned Boss skills and contact stop',()=>{
 const s=setup('aura'),g=s.G,e=enemy(s,30);e.boss=true;s.Math.random=()=>.01;cast(s);const v=g.SquadBonds.move(s.p,s.m);close(v.dmg,s.m.dmg*1.2);close(v.radius,s.m.radius*3);close(e.classStunT,.5);let ticks=0;g.BossCombat={tick:()=>ticks++};e.updateAI(.1,s.cap);assert.equal(ticks,0);close(e.classStunT,.4);const n=g.SquadBonds.move(s.p,g.Moves.instance('heat-wave'));close(n.speed,g.Moves.instance('heat-wave').speed*3);e.boss=false;g.SquadBonds.afterHit(s.p,e,v,1);close(e.classStunT,1);
});

test('orbit launches tracking missiles at triple enhanced damage and waits after hit or timeout before refilling',()=>{
 const s=setup('orbit'),g=s.G,e=enemy(s,80);cast(s);let p=g.Projectiles.all()[0];assert.equal(p.seeking,true);close(p.dmg,s.m.dmg*s.p.attackFor(s.m)*1.5*3);close(p.orad,s.m.radius*2);assert.equal(p.homingTarget,e);const slot=p.orbitSlot,mid=p.mid;g.Projectiles.remove(p);g.Combat.tick(.2,s.p,.2);assert.equal(g.Projectiles.all().filter(p=>p.mid===mid&&p.orbitSlot===slot).length,0);g.Combat.tick(1,s.p,1.2);p=g.Projectiles.all().find(p=>p.mid===mid&&p.orbitSlot===slot);assert.ok(p);g.Projectiles.update(1.6,s.cap,s.enemies);assert.equal(g.Projectiles.all().includes(p),false);close(p.orbitSlotState.wait,1.2);g.Projectiles.clearOrbs(s.p);assert.equal(g.Projectiles.count,0);
});

test('summon lifetime and caps scale; turrets lock three distinct targets and fire three times faster',()=>{
 const s=setup('turret'),g=s.G;for(const x of [80,100,120,140])enemy(s,x);cast(s);const f=g.Combat._fields()[0];close(f.life,(s.m.dur||6)*1.5);close(f.m.rate,(s.m.rate||.6)/3);g.Combat.updateFields(.3);assert.equal(g.Projectiles.count,3);close(g.Projectiles.all()[0].dmg,s.m.dmg*s.p.attackFor(s.m)*1.2);g.Combat.updateFields(f.m.rate+.001);assert.equal(g.Projectiles.count,6);assert.equal(new Set(g.Projectiles.all().slice(0,3).map(p=>Math.atan2(p.vy,p.vx))).size,3);
 cast(s);cast(s);const live=g.Combat._fields().filter(f=>!f.gone);assert.ok(live.length<=Math.floor(Math.max(1,s.m.count)*2));
});

test('enhanced mines explode at triple radius and stun Bosses for one second',()=>{
 const s=setup('mine'),g=s.G,e=enemy(s,0);e.boss=true;cast(s);const f=g.Combat._fields()[0];e.x=f.x;e.y=f.y;close(f.r,s.m.radius*3);close(f.dmg,s.m.dmg*s.p.attackFor(s.m)*2);g.Combat.updateFields(.36);close(e.classStunT,1);assert.equal(e.calls.length,1);
});

test('beam channel and delayed chain keep established effects and PP consumption',()=>{
 const s=setup('beam'),g=s.G,e=enemy(s,100),pp=g.MovePP.state(s.p,s.m);cast(s);assert.equal(g.Combat.fieldCount,1);close(pp.current,pp.max-1);close(e.calls[0].n,s.m.dmg*s.p.attackFor(s.m)*.5);g.Combat.updateFields(.5);assert.equal(e.calls.length,2);close(pp.current,pp.max-2);g.Squad.bench(g.Squad.deployed().at(-1));g.Combat.updateFields(.5);assert.equal(g.Combat.fieldCount,0);
 const c=setup('chain');for(const x of [50,100,150])enemy(c,x);cast(c);assert.equal(c.enemies[0].calls.length,1);assert.ok(c.enemies[0].freezeT>0);c.G.Combat.updateFields(.12);assert.equal(c.enemies[1].calls.length,1);
});

test('class damage attribution conserves actual damage across member and bond rows',()=>{
 const s=setup('aura'),g=s.G,e=enemy(s);const m=g.SquadBonds.move(s.p,s.m);g.ExpeditionDamage.record(s.p,m,120);const rows=g.ExpeditionDamage.snapshot();close(rows.reduce((n,r)=>n+r.damage,0),120);close(rows.find(r=>r.type==='bloom').damage,20);close(rows.find(r=>r.kind==='pokemon').damage,100);
});
