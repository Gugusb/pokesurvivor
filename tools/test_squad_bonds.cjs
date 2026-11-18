const test=require('node:test'),assert=require('node:assert/strict'),{context}=require('./battle_fixture.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const moves={projectile:'ember',melee:'tackle',beam:'ice-beam',orbit:'fire-spin',chain:'thunderbolt'};
function setup(kind='projectile',count=6){
 const s=context('zh',false),g=s.G;for(const f of ['js/core/settings.js','js/data/egg-groups.js','js/entities/projectile.js','js/systems/expedition-rules.js','js/systems/squad.js','js/systems/squad-bonds.js','js/systems/move-control.js','js/systems/move-pp.js','js/systems/combat.js'])s.load(f);
 g.Sprites.preload=()=>{};g.Sprites.Animator.prototype._start=()=>{};g.FX=new Proxy({},{get:(t,k)=>t[k]||(()=>{})});g.World.propsInCircle=()=>[];g.World.projectileBlock=()=>null;g.World.isWall=()=>false;g.VFX={forMove:()=>({}),forType:()=>({})};g.EnemyMgr.get=id=>s.enemies.find(e=>e.id===id);
 const cap=s.player(25);cap.moves=[g.Moves.instance(moves[kind],2)];cap.slots=[cap.moves];g.Squad.begin(cap);for(let i=0;i<3;i++)g.Squad.upgrade();
 for(const dex of [6,9,3,26,65,68].slice(0,count)){const p=g.Squad.recruit(dex);p.moves=[g.Moves.instance(moves[kind],2)];p.slots=[p.moves];p.active=0;p.critChance=0;p.invuln=100;}
 g.Squad.refresh();const p=g.Squad.deployed()[0];g.Game.player=cap;return Object.assign(s,{p,cap,m:p.moves[0]});
}
function enemy(s,x=60,y=0){const e=s.enemy();e.x=x;e.y=y;e.touchCd=100;e.hp=e.maxHp=1e9;e.calls=[];e.hurt=(n,...args)=>{e.calls.push({n,args});return n;};return e;}
function cast(s){s.p.target=s.enemies[0];s.p.aim=0;s.G.Combat.tick(.001,s.p,0);}

test('counts deduplicate a species per tag, count different evolution names, keep fainted contributors and exclude reserves',()=>{
 const s=setup('projectile',2),g=s.G,a=g.Squad.deployed()[0];g.Squad.recruit(a.dex,null,3);g.Squad.recruit(a.dex,null,3);for(const p of g.Squad.roster){p.moves=[g.Moves.instance('ember')];p.slots=[p.moves];}g.Squad.refresh();assert.equal(g.SquadBonds.count('skill','projectile'),3);
 const b=g.Squad.deployed()[1];b.dead=true;g.Squad.refresh();assert.equal(g.SquadBonds.count('skill','projectile'),3);g.Squad.bench(b);assert.equal(g.SquadBonds.count('skill','projectile'),2);g.Squad.recruit(5,'ember');assert.equal(g.SquadBonds.count('skill','projectile'),3);assert.equal(g.SquadBonds.count('types','fire'),2);
});

test('bond stacks are independent of contributor count, bounded inputs, monotonic effects, zero disables, and new runs reset stacks',()=>{
 const s=setup('projectile',2),g=s.G,B=g.SquadBonds,n=B.count('skill','projectile'),before=s.p.agilityFor(s.m),save=JSON.stringify(g.DB.save);assert.equal(B.layer('skill','projectile'),1);assert.equal(B.state('projectile').tier,3);assert.ok(B.setLayer('skill','projectile',8));close(B.scale(8),1.75);assert.equal(B.count('skill','projectile'),n);assert.ok(s.p.agilityFor(s.m)>before);assert.equal(JSON.stringify(g.DB.save),save);
 for(const args of [['skill','bad',1],['types','__proto__',1],['eggs',0,1],['skill','beam',NaN],['skill','beam',-1],['skill','beam',10001]])assert.equal(B.setLayer(...args),false);
 B.setLayer('skill','projectile',0);assert.equal(B.state('projectile').tier,0);close(s.p.agilityFor(s.m),s.p.agility*.5);g.Squad.begin(s.cap);assert.equal(B.layer('skill','projectile'),1);
});

test('projectile thresholds affect only deployed members and the corresponding move; captain and Z moves stay unchanged',()=>{
 const s=setup('projectile',2),g=s.G;close(s.p.agilityFor(s.m),s.p.agility*.5*1.25);close(s.p.staminaFor(s.m),s.p.stamina*.5*1.25);close(s.p.ppIntervalFor(s.m),g.MonProgression.ppInterval(s.p.stamina*.5*1.25));close(g.SquadBonds.agility(s.cap,s.cap.moves[0]),1);assert.equal(g.SquadBonds.move(s.p,s.m).bondUnstable,undefined);
 close(g.SquadBonds.agility(s.p,{...s.m,zMove:true}),1);close(g.SquadBonds.agility(s.p,g.Moves.instance('tackle')),1);g.Squad.bench(s.p);close(g.SquadBonds.agility(s.p,s.m),1);
});

test('melee range and crowd bonus use actual live enemies inside the enhanced radius, with layer scaling',()=>{
 const s=setup('melee'),g=s.G;const es=[enemy(s,30,0),enemy(s,40,8),enemy(s,45,-8)];let radius;g.FX.slash=(x,y,a,r)=>radius=r;cast(s);close(radius,s.m.radius*1.2);const base=s.m.dmg*s.p.attackFor(s.m);for(const e of es)close(e.calls[0].n,base*1.12);assert.ok(g.SquadBonds.meleeDamage(s.p,s.m,20)>1.5);
 const view=g.SquadBonds.move(s.p,s.m);assert.equal(g.SquadBonds.move(s.p,view),view);
});

test('beam channel damages only every half second, maintenance spends PP without consuming a primed potion, and empty PP stops it',()=>{
 const s=setup('beam'),g=s.G,e=enemy(s,100),pp=g.MovePP.state(s.p,s.m);let visuals=0;g.FX.beam=()=>visuals++;cast(s);assert.equal(g.Combat.fieldCount,1);assert.equal(e.calls.length,1);close(e.calls[0].n,s.m.dmg*s.p.attackFor(s.m)*.5);close(pp.current,pp.max-1);s.p.ppPotionReady=20;
 g.Combat.updateFields(.499);assert.equal(e.calls.length,1);assert.ok(visuals>=2);g.Combat.updateFields(.002);assert.equal(e.calls.length,2);close(pp.current,pp.max-2);assert.equal(s.p.ppPotionReady,20);
 pp.current=0;s.p.tempPP=1;g.Combat.updateFields(.5);assert.equal(s.p.tempPP,0);assert.equal(e.calls.length,3);g.Combat.updateFields(.5);assert.equal(g.Combat.fieldCount,0);assert.equal(e.calls.length,3);assert.equal(s.p.ppPotionReady,20);
});

test('beam channels end on a wall, lost threshold, dead caster or removed source move, and clearFields removes all delayed work',()=>{
 for(const reason of ['wall','threshold','dead','source','clear']){const s=setup('beam'),g=s.G;enemy(s,100);cast(s);const pp=g.MovePP.state(s.p,s.m).current;
  if(reason==='wall')g.World.isWall=()=>true;if(reason==='threshold')g.SquadBonds.setLayer('skill','beam',0);if(reason==='dead')s.p.dead=true;if(reason==='source')s.p.moves=[];if(reason==='clear')g.Combat.clearFields(s.p);
  g.Combat.updateFields(.6);assert.equal(g.Combat.fieldCount,0,reason);close(g.MovePP.state(s.p,s.m).current,pp);
 }
});

test('orbit PP sustains longer without slowing its damage interval; six contributors accelerate orbs and apply a slow',()=>{
 const s=setup('orbit'),g=s.G,e=enemy(s,0);cast(s);close(s.m.t,s.m.cd*s.p.cdMul*1.35);const orb=g.Projectiles.all().find(p=>p.orb);close(orb.ospeed,s.m.speed*1.6);close(orb.slow,.2);close(orb.rehit,Math.max(.12,s.m.cd)*s.p.cdMul*s.p.agilityCooldownFor(s.m));g.Combat.resolve(0,s.cap,1);close(e.slow,.2);
});

test('six-member chains hop after a delay, stagger targets, and allow another independent chain before previous jumps finish',()=>{
 const s=setup('chain'),g=s.G,es=Array.from({length:9},(_,i)=>enemy(s,50+i*25));cast(s);assert.equal(es.reduce((n,e)=>n+e.calls.length,0),1);assert.equal(g.Combat.fieldCount,1);assert.ok(es[0].freezeT>0);close(s.p.agilityFor(s.m),s.p.agility*.5*1.3);
 g.Combat.updateFields(.119);assert.equal(es[1].calls.length,0);g.Combat.updateFields(.002);assert.equal(es[1].calls.length,1);s.m.t=0;cast(s);assert.equal(g.Combat.fieldCount,2);assert.equal(es[0].calls.length,2);g.Combat.updateFields(4);assert.equal(g.Combat.fieldCount,0);const total=es.reduce((n,e)=>n+e.calls.length,0);assert.equal(total,2*(s.m.count+2));
});

function projectile(mode,pierce=0){const s=setup('projectile'),g=s.G,e=enemy(s,60);enemy(s,130);s.m.pierce=pierce;cast(s);const p=g.Projectiles.all()[0];for(const other of [...g.Projectiles.all()])if(other!==p)g.Projectiles.remove(other);p.x=p.px=e.x;p.y=p.py=e.y;s.Math.random=()=>mode/5+.01;return {...s,pShot:p,e};}
test('unstable pierce has a fixed original hit budget, even when procs add more pierce',()=>{
 const s=projectile(0),g=s.G,p=s.pShot;assert.equal(p.bondBudget,1);g.Combat.resolve(0,s.cap,1);assert.equal(p.bondProcs,1);assert.ok(g.Projectiles.all().includes(p));p.x=p.px=s.enemies[1].x;g.Combat.resolve(0,s.cap,2);assert.equal(p.bondProcs,1);assert.equal(g.Projectiles.all().includes(p),false);
});
test('unstable bounce redirects toward a new target without hitting it in the same frame',()=>{
 const s=projectile(1),g=s.G,p=s.pShot;g.Combat.resolve(0,s.cap,1);assert.equal(s.enemies[1].calls.length,0);assert.ok(p.vx>0);assert.equal(p.x,s.e.x);assert.equal(p.bondProcs,1);assert.ok(g.Projectiles.all().includes(p));
});
test('unstable explosion is non-recursive area damage, double critical uses twice the crit multiplier, and growth enlarges collision and art',()=>{
 const a=projectile(2);a.enemies[1].x=100;a.G.Combat.resolve(0,a.cap,1);assert.equal(a.pShot.bondProcs,1);assert.equal(a.enemies[1].calls.length,1);close(a.enemies[1].calls[0].n,a.pShot.dmg*.35);
 const b=projectile(3);b.G.Combat.resolve(0,b.cap,1);close(b.e.calls[0].n,b.pShot.dmg*b.G.Abilities.critMultiplier(b.p)*2);
 const c=projectile(4,2),r=c.pShot.r;c.G.Combat.resolve(0,c.cap,1);close(c.pShot.r,r*1.35);assert.ok(c.pShot.visualScale>c.pShot.bondBaseScale);assert.equal(c.pShot.bondBudget,3);
});
