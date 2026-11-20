const test=require('node:test'),assert=require('node:assert/strict'),{context}=require('./battle_fixture.cjs');
const noop=()=>{},close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(){const s=context('zh',false),g=s.G;
 for(const file of ['js/core/settings.js','js/data/egg-groups.js','js/entities/projectile.js','js/systems/expedition-rules.js','js/systems/squad.js','js/systems/expedition-growth.js','js/systems/expedition-damage.js','js/systems/squad-bonds.js','js/data/type-bonds.js','js/systems/type-bonds.js','js/systems/move-control.js','js/systems/move-pp.js','js/systems/combat.js','js/systems/levelup.js','js/systems/z-access.js','js/data/starter-items.js','js/data/breakthrough-items.js','js/systems/card-packs.js','js/systems/expedition-training.js'])s.load(file);
 g.Sprites.preload=noop;g.Sprites.Animator.prototype._start=noop;g.World.isFree=()=>true;g.World.isWall=()=>false;g.World.propsInCircle=()=>[];g.World.projectileBlock=()=>null;g.VFX={forMove:()=>({}),forType:()=>({})};g.Input={axis:()=>[0,0]};
 const cap=s.player(6);g.Game.player=cap;g.Squad.begin(cap);g.CardPacks.normalize(g.DB.save);return {...s,g,cap};}
test('expedition levels grant one percent HP and attacks to both roles without defenses or movement growth',()=>{
 const {g,cap}=setup(),member=g.Squad.recruit(1);
 const unchanged=['agility','stamina','spd'];
 const before=[cap,member].map(p=>unchanged.map(key=>p[key]));
 cap.level=4;
 g.ExpeditionGrowth.sync();
 for(const [p,i,atk,def] of [[cap,0,.03,0],[member,1,.03,0]]){
   close(p.expeditionGrowth.hp,atk);
   close(p.expeditionGrowth.atk,atk);
   close(p.expeditionGrowth.spa,atk);
   close(p.expeditionGrowth.defense||0,def);
   close(p.expeditionGrowth.spdef||0,def);
   unchanged.forEach((key,j)=>close(p[key],before[i][j]));
 }
 const hp=member.hp;
 g.ExpeditionGrowth.sync();
 close(member.hp,hp);
 const late=g.Squad.recruit(7);
 close(late.expeditionGrowth.atk,.03);
 close(late.expeditionGrowth.defense||0,0);
 for(const key of unchanged)assert.equal(late.expeditionGrowth[key],undefined);
});
test('half-strength companion berries apply to reserves and future recruits without buffing captain',()=>{
 const {g,cap}=setup(),p=g.Squad.recruit(1);const old=cap.statGrowth.atk;g.Squad.bench(p);g.ExpeditionGrowth.reward('attacks',.10);close(p.expeditionGrowth.atk,.05);close(cap.statGrowth.atk,old);const late=g.Squad.recruit(7);close(late.expeditionGrowth.atk,.05);g.ExpeditionGrowth.reward('attacks',.10);close(late.expeditionGrowth.atk,.10);
});
test('expedition level cards are team berries, while original modes keep skill offers',()=>{
 const {g,cap}=setup();cap.addMove('ember');for(let i=0;i<10;i++)assert.ok(g.LevelUp.offer(cap).every(c=>c.type==='stat'));g.Squad.reset();let skill=false;for(let i=0;i<20;i++)skill||=g.LevelUp.offer(cap).some(c=>c.type==='up'||c.type==='new');assert.ok(skill);
});
test('damage ledger counts actual HP/shield damage and separate bond entries without double counting',()=>{
 const s=setup(),{g,cap}=s,e=s.enemy();e.hp=10;e.shield=5;e.die=()=>{e.dead=true};e.hurt(1000,'#fff',0,0,0,null,cap,{id:'ember'});const f=s.enemy();f.hp=10;f.shield=0;f.die=()=>{f.dead=true};f.hurt(1000,'#fff',0,0,0,null,cap,{id:'typebond-fire',typeBondSecondary:true});const rows=g.ExpeditionDamage.snapshot();close(rows.reduce((n,r)=>n+r.damage,0),25);close(rows.find(r=>r.kind==='bond').damage,10);close(rows.find(r=>r.kind==='pokemon').damage,15);
});
test('long-march finite four-card pack unlocks permanent training permissions and exhausts without duplicate charges',()=>{
 const {g}=setup(),save=g.DB.save;save.coins=20000;const before=save.coins;for(let i=0;i<4;i++){const o=g.CardPacks.draw(save,()=>0,'long-march');g.CardPacks.choose(save,o.seq,0);}assert.equal(g.CardPacks.remaining(save,'long-march'),0);assert.equal(save.coins,before-20000);for(const kind of ['specialize','link','breakthrough'])assert.ok(g.ExpeditionTraining.unlocked(kind));assert.equal(save.cardPack.taken['training:pokemon-breakthrough'],1);assert.throws(()=>g.CardPacks.draw(save,()=>0,'long-march'),/Pack empty/);assert.equal(save.coins,before-20000);
});
test('training is free once after a valid effect and still honors permission',()=>{
 const {g,cap}=setup(),run={phase:'training',cycle:1,gold:0,captain:cap};cap.addMove('ember');const choice=g.ExpeditionTraining.choices('up',run)[0];assert.equal(g.ExpeditionTraining.purchase('up',{apply:()=>false},run),false);assert.equal(g.ExpeditionTraining.purchase('up',choice,run),true);assert.equal(run.gold,0);assert.equal(g.ExpeditionTraining.purchase('up',choice,run),false);run.trainingUsed=false;assert.equal(g.ExpeditionTraining.purchase('specialize',choice,run),false);assert.equal(g.ExpeditionTraining.purchase('up',g.ExpeditionTraining.choices('up',run)[0],run),true);assert.equal(cap.moves[0].lvl,5);assert.equal(run.gold,0);
});
test('breakthrough consumes a matching three-star material; random replacement retains companion rank and level',()=>{
 const {g,cap}=setup(),run={phase:'training',cycle:1,gold:10000,captain:cap};cap.addMove('ember');const m=cap.moves[0];while(g.Moves.levelUp(m)){}const material=g.Squad.recruit(37,null,3);g.DB.save.cardPack.taken['training:breakthrough']=1;const c=g.ExpeditionTraining.choices('breakthrough',run)[0];assert.ok(c);assert.ok(g.ExpeditionTraining.purchase('breakthrough',c,run,material));assert.equal(m.evolved,true);assert.ok(!g.Squad.roster.includes(material));const p=g.Squad.recruit(1,null,2),old=p.moveId;run.trainingUsed=false;const replacement=g.ExpeditionTraining.choices('replace',run).find(c=>c.owner===p);assert.ok(g.ExpeditionTraining.purchase('replace',replacement,run));assert.notEqual(p.moveId,old);assert.equal(p.rank,2);assert.equal(p.moves[0].lvl,3);
});

test('a member blocked for more than two seconds returns to a valid captain-side point, without moving through a wall',()=>{
 const {g,cap}=setup(),p=g.Squad.recruit(1);p.x=-500;p.y=0;g.World.isFree=(x,y)=>Math.hypot(x-cap.x,y-cap.y)<60;for(let i=0;i<21;i++)g.Squad.tick(.1);assert.ok(Math.hypot(p.x-cap.x,p.y-cap.y)<65);assert.equal(p.stuckTime,0);
});
test('attributed bonus damage and direct bond bursts add up to actual damage without duplicating the Pokemon entry',()=>{
 const {g,cap}=setup();g.ExpeditionDamage.record(cap,{id:'ember'},180,{contributions:[['normal',1.8]]});g.ExpeditionDamage.record(cap,{id:'typebond-fire'},30);const rows=g.ExpeditionDamage.snapshot();close(rows.reduce((n,r)=>n+r.damage,0),210);close(rows.find(r=>r.kind==='pokemon').damage,100);close(rows.find(r=>r.type==='normal').damage,80);close(rows.find(r=>r.type==='fire').damage,30);
});
test('evolution reward berries also use half strength for all future companions rather than increasing the captain',()=>{
 const s=setup(),g=s.g,cap=s.player(4);g.Game.player=cap;g.Squad.begin(cap);cap.level=8;g.ExpeditionGrowth.sync();const card=g.LevelUp.evolutionOffer(cap).find(c=>c.statId!=='ppmax')||g.LevelUp.evolutionOffer(cap)[0],stat=g.LevelUp.TEAM_STATS.find(c=>c.id===card.statId),key=({attacks:'atk',defenses:'defense'})[stat.stat]||stat.stat,before=cap.statGrowth[key]||0;assert.ok(card.apply(cap));close(cap.statGrowth[key]||0,before);close(g.ExpeditionGrowth.berries[key],stat.amount*1.5);const late=g.Squad.recruit(7);close(late.expeditionGrowth[key],.35+stat.amount*1.5);
});
test('removed PP berries cannot grant resources through the expedition reward API',()=>{
 const {g}=setup(),p=g.Squad.recruit(1);for(const stat of ['maxpp','temppp','stamina','agility','spd'])assert.equal(g.ExpeditionGrowth.reward(stat,20),false);assert.equal(p.maxPpBonus,0);assert.equal(p.tempPP,0);assert.equal(Object.keys(g.ExpeditionGrowth.berries).length,0);
});
function controller(s){
 const g=s.g,noop=()=>{},el=()=>({children:[],style:{},classList:{add:noop,remove:noop},append(...a){this.children.push(...a)},replaceChildren(){this.children=[]},setAttribute:noop,scrollIntoView:noop,querySelector:()=>null,dataset:{},remove:noop}),nodes=new Map();s.document.getElementById=id=>{if(!nodes.has(id))nodes.set(id,el());return nodes.get(id)};s.document.createElement=el;s.window.requestAnimationFrame=noop;g.Camera.outerRadius=()=>300;g.Difficulty={current:4,eliteChance:()=>0,factors:()=>({hp:1,damage:1,speed:1})};g.Spawner={SHINY_RATE:0};g.Enemies={behaviorOf:()=>'chase'};g.UI.spriteCanvas=el;g.UI.show=noop;g.UI.hideAll=noop;g.Icons={html:()=>''};g.Game.expeditionPause=noop;g.Game.expeditionResume=noop;g.Game.loot={};g.Game.scoreEvent=noop;g.World.setBiome=noop;g.EnemyMgr.clear=()=>{s.enemies.length=0};g.EnemyMgr.add=e=>s.enemies.push(e);Object.defineProperty(g.EnemyMgr,'count',{get:()=>s.enemies.length});g.EnemyMgr.update=noop;g.Pickups={clear:noop,drop:noop};g.Hazards={clear:noop};g.Path.clear=noop;g.Touch={reset:noop};s.load('js/data/expedition-lang.js');s.load('js/systems/expedition.js');g.Expedition.begin(s.cap);const r=g.Expedition.run;r.map[1][3].kind='battle';g.Expedition.choose(1,3);return g.Expedition;
}
test('enemy warnings last two full game seconds and blocked positions do not consume the finite wave budget',()=>{
 const s=setup(),E=controller(s);E.tick(.3);assert.ok(E.run.pendingSpawns.length>0);const first=E.run.pendingSpawns[0].enemy;assert.equal(s.enemies.length,0);E.tick(1.69);assert.equal(s.enemies.includes(first),false);E.tick(.32);assert.ok(s.enemies.includes(first));assert.equal(E.run.wave.count,28);
 const t=setup(),F=controller(t);t.g.World.isFree=()=>false;F.tick(1);assert.equal(F.run.pendingSpawns.length,0);assert.equal(F.run.spawned,0);
});
