const test=require('node:test'),assert=require('node:assert/strict'),{context}=require('./battle_fixture.cjs');
const noop=()=>{},close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function setup(){const s=context('zh',false),g=s.G;for(const f of ['js/core/settings.js','js/data/egg-groups.js','js/entities/projectile.js','js/systems/expedition-rules.js','js/systems/squad.js','js/systems/squad-bonds.js','js/data/squad-traits.js','js/systems/squad-traits.js','js/systems/expedition-damage.js','js/systems/move-control.js','js/systems/move-pp.js','js/systems/player-stats.js','js/systems/combat.js'])s.load(f);
 g.Sprites.preload=noop;g.Sprites.Animator.prototype._start=noop;g.World.propsInCircle=()=>[];g.World.isWall=()=>false;g.World.projectileBlock=()=>null;g.VFX={forMove:()=>({}),forType:()=>({})};g.Pickups={dropXp:noop,drop:noop};g.Difficulty={factors:()=>({hp:1,damage:1,speed:1}),treasureChance:()=>0,onHurt:noop};
 const r={day:1,phase:'combat',kind:'battle',gold:100};g.Expedition={run:r,skillLabel:k=>k};const cap=s.player(25);cap.addMove('thunder-shock');g.Game.player=cap;g.Squad.begin(cap);for(let i=0;i<3;i++)g.Squad.upgrade();const p=g.Squad.recruit(4),q=g.Squad.recruit(37);p.squadTrait='daily-links';q.squadTrait='terminal-power';g.Squad.refresh();
 const actor=(id,rank=1,quality=1)=>{p.squadTrait=id;p.rank=rank;p.mon={...p.mon,rarity:quality};return p;};
 const fuel=n=>{g.SquadBonds.setLayer('types','fire',n-1);g.SquadBonds.setLayer('skill','projectile',1);};
 return {...s,g,r,cap,p,q,actor,fuel,T:g.SquadTraits};}
test('catalogue is 15/9/6 and all species have stable family assignments with five rarity weights',()=>{
 const {g,T}=setup();assert.equal(g.SquadTraitDefs.LIST.length,30);for(const [kind,n]of [['stacking',15],['economic',9],['terminal',6]])assert.equal(g.SquadTraitDefs.LIST.filter(d=>d.category===kind).length,n);for(const mon of g.DEX)assert.ok(g.SquadTraitDefs.forDex(mon.dex));for(const dex of [4,5,6])assert.equal(g.SquadTraitDefs.forDex(dex).id,g.SquadTraitDefs.forDex(4).id);for(const [rarity,w]of [[1,1],[2,1.2],[3,1.5],[4,2],[5,2.5]])close(T.weight({rank:3,mon:{rarity}}),3*w);
});
test('the runtime replaces legacy support and leaves captain ability medals independent',()=>{
 const {g,cap,p}=setup();cap.ability='pressure';p.mon={...p.mon,types:['normal']};g.Squad.refresh();for(const key of ['atk','hp','agility','stamina','regen'])assert.equal(g.Squad.growth(cap,key),0);assert.equal(cap.ability,'pressure');assert.equal(p.ability,null);assert.ok(g.Squad.talent(p).category);
});
test('3-star quality-four day stacking gives six to every owned active bond, never captain or undesigned eggs',()=>{
 const {g,T,actor,r}=setup(),p=actor('daily-links',3,4);p.moves.push(g.Moves.instance('razor-leaf'),g.Moves.instance('flamethrower'));g.Squad.refresh();T.dayEnd();close(g.SquadBonds.layer('types','fire'),6);close(g.SquadBonds.layer('skill','projectile'),6);close(g.SquadBonds.layer('types','electric'),0);close(g.SquadBonds.layer('eggs',1),1);assert.equal(T.layers(p),12);T.dayEnd();close(g.SquadBonds.layer('types','fire'),6);r.day=2;T.dayEnd();close(g.SquadBonds.layer('types','fire'),12);
});
test('fractional layers are retained and inactive milestone progress does not bank retroactive rewards',()=>{
 const {g,T,actor,p}=setup();actor('ember-notes',1,2);p.mon={...p.mon,types:['ice']};g.Squad.refresh();for(let i=0;i<60;i++)T.hit(p,{id:p.moves[0].id},false,1);close(g.SquadBonds.layer('types','ice'),0);p.mon={...p.mon,types:['fire']};g.Squad.refresh();for(let i=0;i<59;i++)T.hit(p,{id:p.moves[0].id},false,1);close(g.SquadBonds.layer('types','fire'),0);T.hit(p,{id:p.moves[0].id},false,1);close(g.SquadBonds.layer('types','fire'),1.2);assert.ok(g.SquadBonds.setLayer('types','fire',9999.9));g.SquadBonds.addLayer('types','fire',100);close(g.SquadBonds.layer('types','fire'),10000);
});
test('micro triggers ignore generated bond damage, equipment hits, menus, reserves and fallen owners',()=>{
 const {g,T,actor,p,r}=setup();actor('ember-notes');for(let i=0;i<80;i++){T.hit(p,{id:'typebond-fire',typeBondSecondary:true},true,5);T.hit(p,{},true,5);}r.phase='shop';for(let i=0;i<80;i++)T.hit(p,{id:'ember'},true,5);r.phase='combat';g.Squad.bench(p);for(let i=0;i<80;i++)T.hit(p,{id:'ember'},true,5);g.Squad.place(p,0);p.dead=true;for(let i=0;i<80;i++)T.hit(p,{id:'ember'},true,5);close(g.SquadBonds.layer('types','fire'),0);
});
test('elite events pay once, with gold using total weight and refresh counts using rank only',()=>{
 const {T,r,actor}=setup();actor('elite-supplier',3,4);r.kind='elite';for(let i=0;i<50;i++)T.kill(actor('elite-supplier',3,4));assert.equal(r.gold,100);T.finishBattle(true);assert.equal(r.gold,250);assert.equal(r.traitFreeRefresh,3);T.finishBattle(true);assert.equal(r.gold,250);r.day=20;r.kind='boss';actor('boss-recruiter',3,4);T.finishBattle(true);assert.equal(r.gold,610);assert.equal(r.traitRecruitTickets,3);
});
test('dead elite owners do not collect after recovery and elite stacking is one event rather than per enemy',()=>{
 const {g,T,r,actor,p}=setup();actor('elite-links',3,4);r.kind='elite';p.dead=true;p.hp=0;T.finishBattle(true);p.dead=false;p.hp=p.maxHp;T.finishBattle(true);close(g.SquadBonds.layer('types','fire'),0);r.day=2;T.finishBattle(false);close(g.SquadBonds.layer('types','fire'),36);for(let i=0;i<40;i++)T.kill(p);close(g.SquadBonds.layer('types','fire'),36);
});
test('fractional economic gains accumulate without loss and day interest uses the pre-event wallet',()=>{
 const {g,T,r,p,q,actor}=setup();actor('battle-purse',1,2);for(let i=0;i<150;i++)T.kill(p);assert.equal(r.gold,124);close(T.coinCarry,0);T.reset();r.gold=100;p.squadTrait='daily-interest';q.squadTrait='daily-purse';p.rank=q.rank=1;p.mon={...p.mon,rarity:1};q.mon={...q.mon,rarity:1};T.dayEnd();assert.equal(r.gold,110);T.reset();r.gold=100;g.Squad.swap(p,q);T.dayEnd();assert.equal(r.gold,110);
});
test('release and merge events cannot be replayed and a merge uses the newly acquired rank',()=>{
 const {g,T,r,p,actor}=setup();actor('farewell-purse',3,4);const a=new g.Squad.Member(7),b=new g.Squad.Member(9);T.release(a);assert.equal(r.gold,148);T.release(a);assert.equal(r.gold,148);T.release(p);assert.equal(r.gold,148);T.release(b);assert.equal(r.gold,196);
 const s=setup();s.actor('merge-class');const discarded=s.g.Squad.recruit(4);assert.equal(s.p.rank,2);const after=s.g.SquadBonds.layer('skill','projectile');close(after,4*s.T.weight(s.p));s.T.merge(s.p,discarded);close(s.g.SquadBonds.layer('skill','projectile'),after);
});
test('sixteen layers and 3-star quality-four power is an independent 76.8% multiplier with conserved damage attribution',()=>{
 const s=setup(),{g,T,p,fuel}=s;s.actor('terminal-power',3,4);fuel(16);const e=s.enemy();e.hp=e.maxHp=10000;p.critChance=0;const a={id:'ember',kind:'projectile'};close(T.beforeHit(p,e,a).factor,1.768);e.hurt(100,'#fff',0,0,0,null,p,a);assert.equal(e.hp,9823);const rows=g.ExpeditionDamage.snapshot();close(rows.reduce((n,r)=>n+r.damage,0),177);assert.ok(!rows.some(r=>r.type==='trait:terminal-power'));assert.equal(rows.find(r=>r.kind==='pokemon').damage,177);close(T.beforeHit(p,e,{id:'typebond-fire',typeBondSecondary:true}).factor,1);
});
test('terminal haste caps at forty percent and affects the actual cooldown curve without changing PP',()=>{
 const {g,T,p,fuel,actor}=setup();fuel(16);const m=p.moves[0];m.t=10;p.squadTrait='daily-links';const base=g.PlayerStats.cooldown(p,m);g.Combat.tick(.1,p,0);const step=10-m.t;actor('terminal-haste',3,4);close(T.cooldown(p),.6);m.t=10;g.Combat.tick(.1,p,0);close(10-m.t,step/.6);close(g.PlayerStats.cooldown(p,m),base*.6);
});
test('terminal range changes real hit dimensions and keeps preview dimensions identical',()=>{
 const {g,T,p,fuel,actor}=setup();actor('terminal-size',3,4);fuel(16);const m=p.moves[0],view=T.move(p,m);close(view.size,m.size*1.576);const again=T.move(p,view);assert.equal(again,view);close(g.PlayerStats.move(p,m).view.size,view.size);g.Squad.bench(p);assert.equal(T.move(p,m),m);
});
test('terminal execution affects ordinary enemies but gives bounded extra damage to Bosses and elites',()=>{
 const s=setup(),{T,p,fuel,actor}=s;actor('terminal-execute',3,4);fuel(16);const e=s.enemy();e.hp=300;e.maxHp=1000;e.shield=20;e.die=()=>{e.dead=true};e.hurt(1,'#fff',0,0,0,null,p,{id:'ember'});assert.equal(e.dead,true);const boss=s.enemy();boss.boss=true;boss.hp=300;boss.maxHp=1000;boss.hurt(100,'#fff',0,0,0,null,p,{id:'ember'});assert.equal(boss.hp,162);close(T.beforeHit(p,boss,{id:'ember'}).factor,1.384);
});
test('terminal barrier equals 480 percent base HP, absorbs before HP events and resets each battle',()=>{
 const {T,p,fuel,actor}=setup();actor('terminal-shield',3,4);fuel(16);T.beginBattle();const total=p.baseHp*4.8;close(T.shield(p),total);const hp=p.hp;p.invuln=0;assert.equal(p.hurt(10,null,true,{kind:'ranged'}),false);close(p.hp,hp);close(T.shield(p),total-10);p.invuln=0;p.hurt(T.shield(p)+2,null,true,{kind:'ranged'});close(p.hp,hp-2);close(T.shield(p),0);T.beginBattle();close(T.shield(p),total);
});
test('recruit discounts are live, bounded and disappear when their owners are benched or downed',()=>{
 const {g,T,p,q,actor}=setup();actor('recruit-bargain',3,4);q.squadTrait='recruit-bargain';q.rank=3;q.mon={...q.mon,rarity:4};assert.equal(T.price(100,'mon'),50);assert.equal(T.price(100,'item'),100);p.dead=true;assert.equal(T.price(100,'mon'),52);g.Squad.bench(q);assert.equal(T.price(100,'mon'),100);
});
function controller(s){
 const g=s.g,el=()=>({children:[],style:{},classList:{add:noop},append(...a){this.children.push(...a)},replaceChildren(){this.children=[]},setAttribute:noop,scrollIntoView:noop,querySelector:()=>null,dataset:{},remove:noop}),nodes=new Map();s.document.getElementById=id=>{if(!nodes.has(id))nodes.set(id,el());return nodes.get(id)};s.document.createElement=el;s.window.requestAnimationFrame=noop;g.UI.spriteCanvas=el;g.UI.show=noop;g.UI.hideAll=noop;g.Icons={html:()=>''};g.Game.expeditionPause=noop;g.Game.expeditionResume=noop;g.Game.loot={};g.Game.scoreEvent=noop;g.World.setBiome=noop;g.World.isFree=()=>true;g.Camera.outerRadius=()=>300;g.EnemyMgr.clear=()=>{s.enemies.length=0};g.EnemyMgr.add=e=>s.enemies.push(e);Object.defineProperty(g.EnemyMgr,'count',{get:()=>s.enemies.length});g.EnemyMgr.update=noop;g.Pickups={clear:noop,drop:noop};g.Hazards={clear:noop};g.Path.clear=noop;g.Touch={reset:noop};s.load('js/data/expedition-quality.js');s.load('js/systems/expedition-quality.js');s.load('js/data/expedition-lang.js');s.load('js/systems/expedition.js');g.Expedition.begin(s.cap);return g.Expedition;
}
test('shop resource transactions preserve all locked slots, prioritize shop then trait refreshes and keep failed tickets',()=>{
 const s=setup(),g=s.g,E=controller(s);E.run.trainerLevel=4;g.Squad.syncTrainer();const mon=g.ExpeditionRules.shopFamilies(g.DEX).find(m=>g.ExpeditionQuality.quality(m)===2&&![1,4,7,10,13,16,19].includes(m.dex));E.run.unitPool=new g.UnitPool([mon]);for(const dex of [1,4,7,10,13,16,19])g.Squad.recruit(dex);E.run.map[1][3].kind='shop';E.choose(1,3);E.run.gold=0;E.run.traitFreeRefresh=2;E.run.traitRecruitTickets=1;
 assert.ok(E.offers.every(o=>o.kind==='mon'&&o.rank===1));const locked=E.offers;assert.equal(E.toggleShopLock(),true);assert.equal(E.run.gold,0);assert.equal(E.buy(0,true),false);assert.equal(E.run.traitRecruitTickets,1);g.Squad.release(g.Squad.reserves()[0]);assert.equal(E.buy(0,true),true);assert.equal(E.run.traitRecruitTickets,0);assert.equal(E.buy(0,true),false);
 E.showRoute();E.run.map[2][3].kind='shop';E.choose(2,3);assert.equal(E.offers,locked);assert.equal(E.offers[0].sold,true);const before=E.run.gold;assert.equal(E.refreshShop(),true);assert.equal(E.run.shopLocked,false);assert.notEqual(E.offers,locked);assert.equal(E.run.gold,before);assert.equal(E.run.shopFreeRefreshes,0);assert.equal(E.run.traitFreeRefresh,2);assert.equal(E.refreshShop(),true);assert.equal(E.run.traitFreeRefresh,1);assert.equal(E.run.gold,before);
 E.begin(s.cap);assert.equal(E.run.shopLocked,false);assert.equal(E.offers.length,0);assert.equal(E.run.gold,0);
});
