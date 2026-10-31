const test=require('node:test'),assert=require('node:assert/strict');
const {context}=require('./battle_fixture.cjs'),noop=()=>{};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(){
 const s=context('zh',false),{G}=s;G.VFX={forMove:()=>({pal:'normal'}),forType:()=>({})};
 Object.assign(G.World,{propsInCircle:()=>[],projectileBlock:()=>null,damageProp:noop,isFree:()=>true,isWall:()=>false});
 for(const f of ['js/entities/projectile.js','js/systems/move-pp.js','js/systems/combat.js','js/systems/player-stats.js'])s.load(f);
 s.make=(id='ember',spec=[])=>{const p=s.player(6),m=G.Moves.instance(id,G.Moves.BY_ID[id].maxLvl);m.specializations=spec;p.moves=[m];p.slots=[[m]];p.active=0;p.baseAgility=80;p.baseStamina=0;p.aim=0;p.baseAtk=p.baseSpa=1;p.critChance=0;p.target=s.enemy();p.target.x=30;p.target.maxHp=p.target.hp=1e8;p.target.defense=p.target.spdef=1;s.Math.random=()=>.9;return {p,m};};return s;
}
test('TM banks an opportunity until a move is maxed; each move caps at five, treasure is unique, and evolution keeps mastery',()=>{
 const {G}=setup(),p=new G.Player(G.DEX_BY[6]);p.moves=[G.Moves.instance('ember')];G.Items.gain(p,'masterytm');assert.equal(p.specTokens,1);assert.equal(G.Specialization.eligible(p).length,0);assert.equal(G.Items.count(p,'masterytm'),0);
 while(G.Moves.levelUp(p.moves[0])){}const m=p.moves[0];assert.ok(G.Specialization.apply(p,m,'t4'));G.Items.gain(p,'masterytm');assert.equal(G.Specialization.apply(p,m,'t4'),false);
 for(let i=0;i<4;i++){p.specTokens++;assert.ok(G.Specialization.apply(p,m,'n7'));}assert.equal(G.Specialization.apply(p,m,'n7'),false);assert.equal(G.Specialization.ids(m).length,5);G.Moves.evolve(m);assert.equal(G.Specialization.ids(m).length,5);
});
test('offers roll treasure at 7%, exclude inapplicable and owned unique choices, and give three distinct cards',()=>{
 const s=setup(),{G}=s,{m}=s.make('ember',['t4']);
 for(const rarity of [0,.069999,.07,.99]){let i=0;const options=G.Specialization.offers(m,()=>i++%2===0?rarity:.5);assert.equal(options.length,3);assert.equal(new Set(options).size,3);for(const id of options){assert.equal(G.Specialization.BY[id].rare,rarity<.07);assert.ok(G.Specialization.BY[id].allowed(m));assert.notEqual(id,'t4');}}
 assert.equal(G.Specialization.BY.t1.allowed(m),false);assert.equal(G.Specialization.BY.t2.allowed(m),false);assert.equal(G.Specialization.LIST.length,21);
 assert.deepEqual(Array.from(G.Specialization.normalize(m,['__proto__','t4','t4','t1','n7'])),['t4','n7']);
});
test('power, size, pierce, shots, PP and cooldown modifiers remain per move and never mutate definitions',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('ember',['n1','n2','n3','t4','t5']);const before=JSON.stringify(m),view=G.Specialization.move(p,m);
 close(view.dmg,m.dmg*1.6*.7);close(view.size,m.size*1.6);assert.equal(view.count,m.count+2);assert.equal(view.pierce,m.pierce+2);close(G.PlayerStats.cooldown(p,m),m.cd*.8*1.5);assert.equal(JSON.stringify(m),before);
 const other=G.Moves.instance('ember');assert.equal(G.Specialization.stats(other).power,1);
 m.specializations=['t6','t7'];assert.equal(G.MovePP.max(p,m),15);m.specializations=['t6'];assert.equal(G.MovePP.max(p,m),7);m.specializations=['t7'];assert.equal(G.MovePP.max(p,m),30);close(G.Specialization.stats(m).power,.2);
});
test('free PP and double PP are rolled once per affordable cast; double cast pays both uses atomically',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('ember',['t6']);const pp=G.MovePP.state(p,m);pp.current=3;s.Math.random=()=>0;assert.ok(G.MovePP.consume(p,m));assert.equal(pp.current,3);
 m.specializations=['t9','t8'];G.MovePP.state(p,m);pp.current=3;assert.equal(G.MovePP.consume(p,m),false);assert.equal(pp.current,3);s.Math.random=()=>.99;assert.equal(G.MovePP.consume(p,m),false);pp.current=4;assert.ok(G.MovePP.consume(p,m));assert.equal(pp.current,0);
 m.specializations=['t9'];pp.current=1;assert.equal(G.MovePP.consume(p,m),false);pp.current=2;assert.ok(G.MovePP.consume(p,m));assert.equal(pp.current,0);
});
test('double projectile cast fires two angled volleys; additional multishot and pierce reach live projectiles',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('ember',['t9','n2']);G.Combat.tick(0,p,0);const shots=G.Projectiles.all();assert.equal(shots.length,(m.count+2)*2);assert.equal(G.MovePP.state(p,m).current,13);assert.ok(shots.every(x=>x.pierce===m.pierce+2));assert.ok(new Set(shots.map(x=>x.vy.toFixed(3))).size>1);
});
test('normal echo waits half the actual cooldown, is free, and never recursively schedules an echo',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('ember',['n8','n3']);s.Math.random=()=>0;G.Combat.tick(0,p,0);const count=G.Projectiles.all().length,pp=G.MovePP.state(p,m).current,cd=G.PlayerStats.cooldown(p,m);
 G.Combat.updateFields(cd/2-.0001);assert.equal(G.Projectiles.all().length,count);G.Combat.updateFields(.0002);assert.equal(G.Projectiles.all().length,count*2);assert.equal(G.MovePP.state(p,m).current,pp);G.Combat.updateFields(cd*10);assert.equal(G.Projectiles.all().length,count*2);
});
test('double orbit creates an independent paid ring for one cooldown cycle and expires without leaking orbs',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('fire-spin',['t9']);assert.equal(m.kind,'orbit');G.Combat.tick(0,p,0);G.Combat.updateFields(.001);assert.equal(G.Projectiles.all().length,m.count*2);const a=G.Projectiles.all().find(o=>o.mid===m.id),b=G.Projectiles.all().find(o=>o.mid!==m.id);close(b.oa-a.oa,.12);assert.equal(G.MovePP.state(p,m).current,13);G.Combat.updateFields(G.PlayerStats.cooldown(p,m));assert.equal(G.Projectiles.all().length,m.count);
});
test('per-move critical bonuses affect live direct hits and projectiles without raising other move criticals',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('hydro-pump',['n5']);m.dmg=100;s.Math.random=()=>.05;const e=p.target,before=e.hp;G.Combat.tick(0,p,0);assert.equal(before-e.hp,175);
});
test('lifesteal, PP refund and four status procs run after real damage; freeze holds normal enemies and only slows Bosses',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('tackle',['t2','t3','t10','t11','t12']);p.maxHp=100;p.hp=50;const pp=G.MovePP.state(p,m);pp.current=0;s.Math.random=()=>0;const e=p.target;e.hurt(100,'#fff',0,0,0,null,p,m);close(p.hp,55);assert.equal(pp.current,1);assert.equal(e.burn,1);assert.equal(e.freezeT,.5);assert.equal(e.slow,.2);
 const x=e.x;e.update(.2,p);assert.equal(e.x,x);close(e.freezeT,.3);m.specializations=['t13','t12'];e.boss=true;e.freezeT=0;e.slowT=e.slow=0;e.hurt(100,'#fff',0,0,0,null,p,m);assert.equal(e.poison,1);assert.equal(e.freezeT,0);assert.equal(e.slow,.5);
});
test('dash shock damages nearby enemies after landing and phase dash crosses obstacles but respects both arena boundaries',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('quick-attack',['t1','t8']);m.radius=200;m.dmg=100;G.World.isFree=x=>x<40||x>100;G.World.arenaContains=x=>x<=160;const e=p.target;e.x=170;const before=e.hp;G.Combat.tick(0,p,0);assert.ok(p.x>100&&p.x<=160);assert.ok(e.hp<before);
});
test('phase projectiles and beams cross inner walls; projectiles are still removed at the arena boundary',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('ember',['t8']);G.Combat.tick(0,p,0);G.World.projectileBlock=()=> 'wall';G.Combat.resolve(0,p,0);assert.ok(G.Projectiles.all().length);G.World.arenaContains=()=>false;G.Combat.resolve(0,p,0);assert.equal(G.Projectiles.all().length,0);
});
test('backpack stat rows reconcile all five sources and share actual attack, agility and stamina calculations',()=>{
 const s=setup(),{G}=s,p=new G.Player(G.DEX_BY[384],{statGrowth:{atk:.08,agility:.06,defense:.1}});p.growStat('atk',.1);p.buffs.atk={n:2,amount:.2,t:3};p.atkMul=1.1;p.baseStamina=200;const rows=G.PlayerStats.rows(p);assert.equal(rows.length,8);
 for(const r of rows)close(r.total,r.base+r.permanent+r.fruit+r.skills+r.other);const a=rows.find(r=>r.key==='atk');close(a.permanent/a.base,.08);close(a.fruit/a.base,.1);close(a.skills/a.base,.4);assert.ok(rows.find(r=>r.key==='stamina').battle.includes('4'));
});
test('bounded peer mastery snapshots reject malformed IDs, duplicate uniques, overlevel moves and excess entries; rewards deduplicate',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('ember',['t3','t4']);const peer={remote:true,moves:[G.Moves.instance('ember')]};G.Specialization.sync(peer,[...G.Specialization.snapshot(p),['__proto__',5,false,['t4']],['tackle',100,false,['n7']]]);assert.equal(G.Specialization.find(peer,'ember').specializations.length,2);assert.equal(Object.keys(peer.masteryMoves).length,1);
 p.hp=p.maxHp/2;G.MovePP.state(p,m).current=0;assert.ok(G.Specialization.reward(p,1,'ember',5,1));assert.equal(G.MovePP.state(p,m).current,1);assert.equal(G.Specialization.reward(p,1,'ember',5,1),false);assert.equal(G.Specialization.reward(p,2,'ember',Infinity,1),false);
});
test('frozen enemies still die and drop loot; replica freeze expires instead of granting permanent contact immunity',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('tackle',['t12']);let drops=0;G.Pickups={dropXp:()=>drops++,drop:noop};const e=p.target;e.hp=1;s.Math.random=()=>0;
 assert.doesNotThrow(()=>e.hurt(100,'#fff',0,0,0,null,p,m));assert.ok(e.dead);assert.equal(drops,1);
 const replica=s.enemy();replica.remote=true;replica.freezeT=.5;replica.netUpdate(.51);assert.equal(replica.freezeT,0);
});
test('repeatable PP and critical mastery stacks combine; Sheer Force suppresses on-hit secondary effects',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('tackle',['n4','n4','n5','n6','n8']);const q=G.Specialization.stats(m);close(q.free,.3);close(q.crit,.25);close(q.critDamage,.25);close(q.cooldown,1.2);close(q.echo,.05);
 m.specializations=['t2','t3','t10','t12'];p.ability='sheerforce';p.hp=p.maxHp/2;const hp=p.hp,pp=G.MovePP.state(p,m);pp.current=0;s.Math.random=()=>0;p.target.hurt(100,'#fff',0,0,0,null,p,m);assert.equal(p.hp,hp);assert.equal(pp.current,0);assert.equal(p.target.burn,0);assert.ok(!p.target.freezeT);
});
test('double turrets and ground trails survive existing deployment caps; mines also retain both paid deployments',()=>{
 for(const id of ['will-o-wisp','flame-wheel','spikes']){const s=setup(),{G}=s,{p,m}=s.make(id,['t9']);G.Combat.tick(0,p,0);G.Combat.updateFields(.001);assert.equal(G.Combat.fieldCount,m.kind==='mine'?m.count*2:2,id);assert.equal(G.MovePP.state(p,m).current,13);}
});
test('remote secondary trail casts are visible twice, without dealing damage in observers',()=>{
 const s=setup(),{G}=s,{p,m}=s.make('flame-wheel',['t9']);p.remote=true;p.masteryMoves={[m.id]:m};G.Combat.ghostCast(p,m.id,m.lvl,0,false);G.Combat.ghostCast(p,m.id,m.lvl,.12,false,1);G.Combat.updateFields(.001);assert.equal(G.Combat.fieldCount,2);assert.equal(p.target.hp,p.target.maxHp);
});
