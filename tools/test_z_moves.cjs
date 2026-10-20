const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.join(__dirname,'..'),noop=()=>{},close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function context(){
  const store=new Map(),s={console,Math:Object.create(Math),Date,JSON,Set,Map,Promise,TextEncoder,Uint8Array,
    performance:{now:()=>1000},setTimeout:noop,clearTimeout:noop,setInterval:noop,addEventListener:noop,
    matchMedia:()=>({matches:false}),location:{pathname:'/',protocol:'file:'},navigator:{language:'zh-CN'},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    document:{documentElement:{},addEventListener:noop},CanvasRenderingContext2D:function(){}};
  s.window=s;vm.createContext(s);s.load=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),s,{filename:f});
  for(const f of ['js/core/util.js','js/core/i18n.js','js/data/lang-en.js','js/data/lang-zh.js','js/data/pokedex.js','js/data/sprites-meta.js','js/data/types.js','js/data/moves.js','js/data/items.js','js/data/mega-forms.js','js/data/mega-types.js','js/data/abilities.js'])s.load(f);
  s.load('js/data/evolutions.js');s.load('js/systems/z-access.js');s.load('js/systems/progression-mon.js');
  const G=s.G;G.FIREBASE_CONFIG=null;G.Coop={active:false,isHost:false,scaleHp:()=>1,broadcast:noop};
  G.FX=new Proxy({},{get:()=>noop});G.Audio={sfx:noop};G.UI={toast:noop};G.Camera={kick:noop,sees:()=>false,outerRadius:()=>500};
  G.Sprites={PX:2,hasShiny:id=>typeof id==='number'||!!G.MEGA_SPRITE_META?.[id]?.sh,bodyRadius:()=>10,bodyHeight:()=>30,preload:noop,hovers:()=>false,dirFromAngle:()=>0,animMeta:()=>null,
    Animator:class{constructor(dex,scale,shiny){this.dex=dex;this.dir=0;this.shiny=!!shiny;}play(){}update(){}loop(){}busy(){return false;}}};
  G.Projectiles={clearOrbs:noop};G.Input={axis:()=>[0,0]};G.Dev={canUse:()=>false,invincible:false};
  G.World={biome:0,liquidEffect:()=>({}),isLiquid:()=>false,collide:noop,isWall:()=>false,isFree:()=>true,
    propsInCircle:()=>[],projectileBlock:()=>null,damageProp:noop,setArena:noop,setBiome:noop};
  G.Weather={speedFor:()=>1,mult:()=>1,force:noop,clear:noop};G.Tiles={T:16,arenaBiome:()=>0,ARENA_THEMES:{}};
  G.Judgment={AT:1800,noteDmg:noop};G.Pickups={drop:noop,dropXp:noop,pullAll:noop};G.Progress={event:noop,kill:noop};G.Events={golden:false,bag:()=>null};G.Hazards={clear:noop};G.Spawner={say:noop};
  let p;s.playerRef=()=>p;G.Game={state:'playing',st:{time:100},everyone:()=>p?[p]:[],flash:noop,offerBond:noop,debugMark:noop};
  s.load('js/systems/mega-preview.js');s.load('js/systems/mega.js');s.load('js/systems/z-moves.js');
  const db=fs.readFileSync(path.join(ROOT,'js/core/db.js'),'utf8').replace('ready, register, login,','_test:{newSave,migrate,sanitize}, ready, register, login,');vm.runInContext(db,s);G.DB.playAsGuest();
  for(const f of ['js/systems/abilities.js','js/entities/player.js','js/entities/enemy.js','js/entities/projectile.js','js/entities/vfx.js','js/systems/combat.js','js/systems/rift.js'])s.load(f);
  s.player=(dex=6,stone=false)=>{if(stone){const f=G.Mega.formsFor(dex)[0];G.Mega.grant(G.DB.save,f.id);G.Mega.equip(G.DB.save,dex,f.id);}p=new G.Player(G.DEX_BY[dex]);G.Game.player=p;return p;};
  s.enemy=(x=30,mega=null)=>G.EnemyMgr.add(new G.Enemy({dex:mega?G.Mega.BY[mega].dex:1,mega,hp:10000,spd:0,dmg:10,xp:1,behavior:'ranged'},x,0,{hp:1,spd:1,dmg:1},!!mega));
  s.evolve=p=>{G.Mega.tick(p,120);assert.ok(G.Mega.activate(p));};
  s.cast=(p,id,lvl=1)=>{const m=G.Moves.instance(id,lvl);p.moves=[m];p.slots=[[m]];p.active=0;p.target=G.EnemyMgr.all()[0];p.aim=0;G.EnemyMgr.rebuildGrid();G.Combat.tick(0,p,0);return m;};
  s.loadRift=()=>{let src=fs.readFileSync(path.join(ROOT,'js/systems/rift.js'),'utf8').replace('reset, update, drawable,','_start:start, reset, update, drawable,');vm.runInContext(src,s);};
  s.loadGame=()=>{G.UI.isOpen=()=>false;let src=fs.readFileSync(path.join(ROOT,'js/game.js'),'utf8').replace('init, startRun, everyone,',"_test:{keys:handleKeys,setPlayer(p){pl=p;state='playing';},collect:onCollect,offerItem,pending:()=>pendingLevels}, init, startRun, everyone,");vm.runInContext(src,s);G.Game._test.setPlayer(p);};
  return s;
}
function setup(id='ember', extras=[]) {
  const s=context(),{G}=s,p=s.player();
  const m=G.Moves.instance(id);G.ZMoves.grant(G.DB.save,m.type);G.ZMoves.equip(G.DB.save,p.dex,m.type);G.ZMoves.init(p,G.DB.save);
  p.moves=[m,...extras.map(x=>G.Moves.instance(x))];p.slots=[[m],...p.moves.slice(1).map(x=>[x])];p.active=0;p.aim=0;
  return Object.assign(s,{p,m});
}
function release(s){assert.ok(s.G.ZMoves.arm(s.p));assert.ok(s.G.ZMoves.choose(s.p,0));}
function capture(s){const hits=[];s.G.Combat.zHit=(p,e,dmg,m)=>hits.push({p,e,dmg,m});return hits;}
function advance(s,seconds,step=.01){for(let t=0;t<seconds-1e-8;t+=step)s.G.Combat.tick(Math.min(step,seconds-t),s.p,t);}

test('every damaging move can use Z; real collision totals stay comparable at level one, maximum level and evolution',t=>{
  const s=context(),{G}=s,report={};G.Camera.sees=()=>true;s.Math.random=()=>.5;
  for(const def of G.Moves.ALL){
    if(def.kind==='buff'){assert.ok(!G.ZMoves.KINDS.includes(def.kind));continue;}
    assert.ok(G.ZMoves.KINDS.includes(def.kind),def.id);
    for(const [lvl,evolved] of [[1,false],[def.maxLvl,false],[def.maxLvl,true]]){
      G.EnemyMgr.clear();G.Projectiles.clear();
      const p=s.player(),m=G.Moves.instance(def.id,lvl);if(evolved)G.Moves.evolve(m);
      G.ZMoves.grant(G.DB.save,m.type);G.ZMoves.equip(G.DB.save,p.dex,m.type);G.ZMoves.init(p,G.DB.save);
      p.moves=[m];p.slots=[[m]];p.active=0;p.aim=0;
      const e=s.enemy(100);e.types=[];e.boss=true;let dealt=0;e.hurt=d=>{dealt+=d;return 0;};G.EnemyMgr.rebuildGrid();
      release({G,p});
      for(let now=0;G.ZMoves.busy(p)&&now<6;now+=.01){
        G.Combat.tick(.01,p,now);G.Projectiles.update(.01,p,G.EnemyMgr.all());G.Combat.resolve(.01,p,now);
      }
      const ratio=dealt/(1200*(1+.4*(lvl-1))*(evolved?1.6:1)*p.atk);
      assert.ok(ratio>=.65&&ratio<=1.16,`${def.id} level ${lvl} evolved ${evolved}: ${ratio} radius=${m.radius} size=${m.size} enemy=${e.x},${e.y}`);
      const row=report[def.kind]||=[Infinity,0];row[0]=Math.min(row[0],ratio);row[1]=Math.max(row[1],ratio);
      assert.equal(p.zState.phase,'cooldown');assert.equal(p.zState.charges,0);
    }
  }
  t.diagnostic(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k,v])=>[k,v.map(n=>+n.toFixed(3))]))));
});

test('crystals migrate empty, union ownership, retain explicit unequip and exclude Mega equipment',()=>{
  const s=context(),{G}=s,sv=G.DB.save;
  assert.deepEqual(Object.keys(sv.zStones),[]);assert.deepEqual(Object.keys(sv.zEquipped),[]);
  G.ZMoves.grant(sv,'fire');G.ZAccess.unlock(sv,6);G.ZMoves.equip(sv,6,'fire');
  G.Mega.grant(sv,'6-mega-x');G.Mega.equip(sv,6,'6-mega-x');assert.equal(sv.zEquipped[6],null);
  G.ZMoves.equip(sv,6,'fire');assert.equal(sv.megaEquipped[6],null);
  assert.equal(G.ZMoves.equip(sv,6,'invalid'),false);
  const older=JSON.parse(JSON.stringify(sv));older.updated=1;G.ZMoves.grant(older,'water');
  const newer=JSON.parse(JSON.stringify(sv));newer.updated=2;G.ZMoves.equip(newer,6,null);
  const merged=G.DB.merge(newer,older);assert.ok(merged.zStones.water);assert.equal(merged.zEquipped[6],null);
  sv.zStones.invalid={at:1};sv.zEquipped[25]='invalid';G.ZMoves.normalize(sv);assert.equal(sv.zStones.invalid,undefined);assert.equal(sv.zEquipped[25],undefined);
});
test('collection grants count evolution-family duplicates once, including shiny, with sixth-duplicate Z guarantee',()=>{
  const s=context(),{G}=s;s.Math.random=()=>.99;
  G.DB.grant(4,'starter');assert.equal(G.DB.save.zDuplicates[4],undefined);
  G.DB.grant(6,'gacha');assert.equal(G.DB.save.zDuplicates[4],1);
  G.DB.grantShiny(5,'wild');assert.equal(G.DB.save.zDuplicates[4],2);
  for(let i=0;i<4;i++)G.DB.grant(4,'gacha');
  assert.equal(G.DB.save.zDuplicates[4],6);assert.ok(G.ZAccess.allowed(G.DB.save,6));
  assert.equal(G.ZMoves.equip(G.DB.save,6,'water'),true);assert.equal(Object.keys(G.DB.save.zStones).length,0);
});
test('legacy Z equipment migrates permission without losing the selected type',()=>{
  const s=context(),{G}=s,old=G.DB.fresh('LegacyFixture');old.owned[6]={iv:[1,1,1]};old.zStones.fire={at:1};old.zEquipped[6]='fire';
  delete old.zAccessMigrated;delete old.zAccess;delete old.zDuplicates;
  G.DB._test.migrate(old);assert.ok(G.ZAccess.allowed(old,4));assert.equal(old.zEquipped[6],'fire');
});

test('new Z families lock until all output completes, spend once and never alter learned move data',()=>{
  for(const id of ['razor-leaf','heat-wave','giga-drain','spikes','will-o-wisp','toxic','flamethrower']){
    const s=setup(id,['tackle']),{G,p,m}=s,before=JSON.stringify(m);release(s);
    const duration=p.zState.casts[0].duration;
    assert.equal(p.zState.charges,0);assert.equal(p.setActive(1),false);
    advance(s,duration-.01);assert.ok(G.ZMoves.busy(p),id);assert.equal(p.zState.phase,'cast');
    advance(s,.01);assert.equal(p.zState.phase,'cooldown');close(p.zState.cooldown,5);
    assert.equal(JSON.stringify({...m,t:0}),before);p.setActive(1);assert.equal(p.active,1);
  }
});

test('new Z visual copies show their native materials without dealing damage or applying statuses',()=>{
  for(const id of ['razor-leaf','heat-wave','giga-drain','spikes','will-o-wisp','toxic','flamethrower']){
    const s=setup(id),{G,p,m}=s,v=visuals(s),peer=new G.Player(G.DEX_BY[6]),e=s.enemy(100);e.boss=true;
    const hp=e.hp;peer.remote=true;G.Game.everyone=()=>[p,peer];G.ZMoves.sync(peer,[m.type,'cast',0,0]);
    assert.ok(G.ZMoves.remoteCast(peer,[[id,1,false]],[0]));
    G.EnemyMgr.rebuildGrid();G.ZMoves.tick(peer,.3);G.ZMoves.drawGround(v.ctx);G.ZMoves.draw(v.ctx);G.Projectiles.draw(v.ctx);G.FX.draw(v.ctx);
    G.Combat.resolve(.01,p,0);assert.equal(e.hp,hp);assert.equal(e.slow,0);assert.equal(e.burn,0);assert.equal(e.poison,0);
    const vis=G.VFX.forMove(m);
    assert.ok(v.sprites.some(x=>x.pal===vis.pal&&(x.shape===vis.proj||x.shape===vis.aura)),id);
    G.ZMoves.sync(peer,[m.type,'cooldown',5,0]);assert.equal(G.ZMoves.busy(peer),false);assert.equal(peer.zState.casts.length,0);
  }
});

test('a lone chain target receives all ten pulses, and overlapping fields cannot multiply a target budget',()=>{
  const s=setup('thunderbolt'),{G,p}=s,e=s.enemy(100),hits=capture(s);e.boss=true;G.EnemyMgr.rebuildGrid();release(s);advance(s,5);
  assert.equal(hits.length,10);close(hits.reduce((n,h)=>n+h.dmg,0),1200*p.atk);
  for(const id of ['spikes','toxic','heat-wave','flamethrower']){
    const q=setup(id),v=q.enemy(100);v.r=120;q.G.EnemyMgr.rebuildGrid();q.G.Camera.sees=()=>true;
    let total=0;v.types=[];v.boss=true;v.hurt=d=>{total+=d;return 0;};release(q);
    for(let now=0;q.G.ZMoves.busy(q.p)&&now<6;now+=.01){q.G.Combat.tick(.01,q.p,now);q.G.Projectiles.update(.01,q.p,[v]);q.G.Combat.resolve(.01,q.p,now);}
    assert.ok(total<=1200*q.p.atk*1.101,id);assert.ok(total>=1200*q.p.atk*.9,id);
  }
});

test('trail Z lays forward patches despite immobility, and turrets retain their chosen boss target',()=>{
  const s=setup('toxic'),{G,p}=s,e=s.enemy(400),hits=capture(s);e.boss=true;G.EnemyMgr.rebuildGrid();release(s);advance(s,4);
  close(p.x,0);assert.equal(hits.filter(h=>h.e===e).length,8);close(hits.reduce((n,h)=>n+h.dmg,0),1200*p.atk*1.04);
  const q=setup('will-o-wisp'),boss=q.enemy(300);boss.boss=true;q.enemy(100);q.G.EnemyMgr.rebuildGrid();release(q);
  const shots=q.G.Projectiles.all();assert.equal(shots.length,3);assert.ok(shots.every(s=>s.homingTarget===boss));
  q.G.Camera.sees=()=>true;q.G.Projectiles.update(.01,q.p,q.G.EnemyMgr.all());assert.ok(shots.every(s=>s.homingTarget===boss));
});

test('arming stops ordinary fire, same-slot selection works, casting locks switches until cooldown starts',()=>{
  const s=setup('ember',['water-gun']),{G,p}=s;
  assert.equal(G.ZMoves.timeFactor(),1);assert.ok(G.ZMoves.arm(p));assert.equal(G.ZMoves.timeFactor(),.1);
  const timer=s.m.t;G.Combat.tick(.2,p,0);assert.equal(G.Projectiles.count,0);assert.equal(s.m.t,timer);
  assert.equal(p.setActive(1),false);assert.equal(p.active,0);assert.ok(p.setActive(0));assert.equal(G.Projectiles.count,8);
  assert.equal(G.ZMoves.timeFactor(),1);assert.equal(p.setActive(1),false);assert.equal(p.active,0);
  advance(s,G.ZMoves.state(p).casts[0].duration);assert.equal(p.zState.phase,'cooldown');close(p.zState.cooldown,5);
  assert.equal(G.ZMoves.arm(p),false);p.setActive(1);assert.equal(p.active,1);
  advance(s,5,1);assert.equal(p.zState.phase,'ready');assert.equal(G.ZMoves.arm(p),false,'no charge regenerates with time');
});

test('buffs cannot arm, fused slots release all and only supported matching moves',()=>{
  const no=setup('swords-dance');assert.equal(no.G.ZMoves.arm(no.p),false);
  const s=setup('ember',['fire-spin','water-gun','flamethrower']),{G,p}=s;
  p.slots=[p.moves.slice(0,2).concat(p.moves[2],p.moves[3])];
  const before=p.moves.map(m=>({...m}));release(s);assert.equal(p.zState.casts.length,3);
  assert.equal(G.Projectiles.count,17);advance(s,2);assert.equal(G.ZMoves.busy(p),true);
  advance(s,3);assert.equal(G.ZMoves.busy(p),false);assert.equal(p.zState.phase,'cooldown');
  p.moves.forEach((m,i)=>{assert.equal(m.dmg,before[i].dmg);assert.equal(m.radius,before[i].radius);});
});

test('projectile Z emits eight symmetric fast piercing shots and prioritizes a boss',()=>{
  const s=setup(),{G,p,m}=s;
  for(let i=0;i<8;i++)s.enemy(150).y=i*5;const boss=s.enemy(-150);boss.boss=true;G.EnemyMgr.rebuildGrid();
  release(s);const shots=G.Projectiles.all();assert.equal(shots.length,8);
  for(let i=0;i<4;i++){close(shots[i].vx,shots[7-i].vx);close(shots[i].vy,-shots[7-i].vy);}
  close(Math.atan2(shots[0].vy,shots[0].vx),Math.PI*2/3);close(shots[0].r,m.size*5);
  for(const shot of shots){close(Math.hypot(shot.vx,shot.vy),m.speed*3);assert.equal(shot.pierce,(m.pierce||0)+999);close(shot.dmg,1200*p.atk*.55);assert.equal(shot.moveId,m.id);assert.ok(shot.visualScale>=5);}
});

test('automatic half-plane aim handles angles crossing zero and corridor aim favors clustered enemies',()=>{
  const s=setup(),{G,p,m}=s;
  for(const a of [-.2,-.1,0,.1,.2]){const e=s.enemy(Math.cos(a)*100);e.y=Math.sin(a)*100;}
  const e=s.enemy(-100);e.y=0;const a=G.ZMoves.aim(p,m);assert.ok(Math.abs(Math.sin(a))<.3);assert.ok(Math.cos(a)>0);
  const beam=G.Moves.instance('ice-beam');const b=G.ZMoves.aim(p,beam);assert.ok(Math.cos(b)>0);
});

test('distant small bosses cannot sit in the center gap of projectile, radial or cone Z patterns',()=>{
  for(const [id,x,y,expected] of [['ember',500,0,1.1],['heat-wave',300,130,.95],['flamethrower',350,80,1.1]]){
    const s=setup(id),{G,p}=s,e=s.enemy(x);e.y=y;e.r=10;e.types=[];e.boss=true;
    let total=0;e.hurt=d=>{total+=d;return 0;};G.EnemyMgr.rebuildGrid();G.Camera.sees=()=>true;
    release(s);
    for(let now=0;G.ZMoves.busy(p)&&now<6;now+=.01){G.Combat.tick(.01,p,now);G.Projectiles.update(.01,p,[e]);G.Combat.resolve(.01,p,now);}
    close(total/(1200*p.atk),expected);
  }
});

test('melee Z sweeps three times, charges one second, then spends the larger share on its final circle',()=>{
  const s=setup('tackle'),{G,p,m}=s,hits=capture(s);
  const near=s.enemy(m.radius*2.8),far=s.enemy(m.radius*4);G.EnemyMgr.rebuildGrid();release(s);advance(s,1.2);
  assert.equal(hits.filter(h=>h.e===near).length,3);assert.equal(hits.filter(h=>h.e===far).length,0);
  for(const h of hits)close(h.dmg,1200*p.atk*.2);assert.equal(p.zState.phase,'cast');
  assert.equal(p.setActive(1),false);advance(s,.99);assert.equal(hits.length,3);assert.ok(G.ZMoves.immune(p));
  advance(s,.01);assert.equal(hits.filter(h=>h.e===near).length,4);assert.equal(hits.filter(h=>h.e===far).length,1);
  hits.slice(3).forEach(h=>close(h.dmg,1200*p.atk*.5));assert.equal(p.zState.phase,'cooldown');assert.equal(G.ZMoves.immune(p),false);
});

test('beam Z locks origin and angle and deals six ticks across fourfold width and 99-fold length',()=>{
  const s=setup('ice-beam'),{G,p,m}=s,hits=capture(s);
  const far=s.enemy(m.radius*50);far.y=m.width*1.5;const boss=s.enemy(300);boss.boss=true;G.EnemyMgr.rebuildGrid();
  release(s);p.aim=Math.PI;p.x=150;p.y=200;advance(s,3);
  assert.equal(hits.filter(h=>h.e===far).length,6);assert.equal(hits.filter(h=>h.e===boss).length,6);
  hits.forEach(h=>close(h.dmg,1200*p.atk*1.1/6));assert.equal(p.zState.phase,'cooldown');
});

test('chain Z retains returning visual jumps but damages each target only once per pulse',()=>{
  const s=setup('thunderbolt'),{G,p,m}=s,hits=capture(s);
  const a=s.enemy(100),b=s.enemy(140);G.EnemyMgr.rebuildGrid();release(s);advance(s,5);
  assert.equal(hits.length,20);
  for(let i=0;i<hits.length;i++){close(hits[i].dmg,1200*p.atk*.1);assert.equal(hits[i].m.slow,.8);if(i%2)assert.notEqual(hits[i].e,hits[i-1].e);}
  assert.ok(hits.some(h=>h.e===a));assert.ok(hits.some(h=>h.e===b));assert.equal(p.zState.phase,'cooldown');
});

test('orbit Z creates opposing layers with distinct damage and inner slow, and lasts five seconds',()=>{
  const s=setup('fire-spin'),{G,p,m}=s,hits=capture(s);
  const inner=s.enemy(m.radius*.75),outer=s.enemy(m.radius*1.5);G.EnemyMgr.rebuildGrid();release(s);
  const hi=hits.find(h=>h.e===inner),ho=hits.find(h=>h.e===outer);assert.ok(hi);assert.ok(ho);
  close(hi.dmg,1200*p.atk*.125);close(ho.dmg,1200*p.atk*.1);assert.equal(hi.m.slow,.8);
  advance(s,4.99);assert.ok(G.ZMoves.busy(p));advance(s,.01);assert.equal(p.zState.phase,'cooldown');
});

test('dash Z crosses blocked terrain, guarantees critical damage and has exactly two seconds of landing immunity',()=>{
  const s=setup('quick-attack'),{G,p,m}=s;const e=s.enemy(m.radius*5);e.hp=e.maxHp=10000000;G.EnemyMgr.rebuildGrid();
  G.World.isFree=(x,y)=>x>m.radius*10+15;release(s);assert.ok(G.ZMoves.immune(p));advance(s,.5);
  close(e.maxHp-e.hp,Math.round(1200*p.atk*1.1));assert.ok(p.x>m.radius*10+15);assert.ok(G.ZMoves.immune(p));
  const hp=p.hp;assert.equal(p.hurt(99999,null,true),false);assert.equal(p.hp,hp);
  advance(s,1.99);assert.ok(G.ZMoves.immune(p));advance(s,.01);assert.equal(G.ZMoves.immune(p),false);
  assert.equal(p.hurt(1,null,true),true);
});

test('a short fused dash does not repeatedly teleport or refresh immunity while another Z is still casting',()=>{
  const s=setup('quick-attack',['tackle']),{G,p}=s; p.slots=[p.moves];release(s);advance(s,.5);
  const x=p.x;p.x+=10;advance(s,.2);assert.equal(p.x,x+10);close(p.zState.guard,1.8);assert.ok(G.ZMoves.busy(p));
});

test('meteor Z schedules thirty impacts over three seconds and keeps the lock until the final landing',()=>{
  const s=setup('rock-slide'),{G,p,m}=s,hits=capture(s);s.enemy(100);G.EnemyMgr.rebuildGrid();release(s);
  const cast=p.zState.casts[0];advance(s,3.39);assert.equal(cast.pulses,30);assert.equal(hits.length,29);assert.ok(G.ZMoves.busy(p));
  advance(s,.01);assert.equal(hits.length,31);hits.slice(0,30).forEach(h=>close(h.dmg,1200*p.atk*.02));close(hits.at(-1).dmg,1200*p.atk*.5);assert.equal(p.zState.phase,'cooldown');close(p.zState.cooldown,5);
});

test('death or a cancelled selection cannot leave the whole party in bullet time',()=>{
  const s=setup(),{G,p}=s;G.ZMoves.arm(p);assert.equal(G.ZMoves.timeFactor(),.1);G.ZMoves.arm(p);assert.equal(G.ZMoves.timeFactor(),1);
  G.ZMoves.arm(p);p.dead=true;G.Combat.tick(.01,p,0);assert.equal(G.ZMoves.timeFactor(),1);assert.equal(p.zState.phase,'cooldown');
});

test('Z selection and every casting family are invincible, while normal cooldown grants no immunity',()=>{
  for(const id of ['ember','tackle','ice-beam','fire-spin','thunderbolt','quick-attack','rock-slide','razor-leaf','heat-wave','giga-drain','spikes','will-o-wisp','toxic','flamethrower']){
    const s=setup(id),{G,p}=s;assert.ok(G.ZMoves.arm(p));const hp=p.hp;
    assert.equal(p.hurt(99999,'fire',true),false);assert.equal(p.hp,hp);assert.equal(G.Abilities.damageFactor(p,{kind:'environment'}),0);
    p.setActive(0);assert.equal(p.hurt(99999,null,true),false);
    advance(s,p.zState.casts[0].duration);if(id==='quick-attack')advance(s,2);
    assert.equal(G.ZMoves.immune(p),false);assert.equal(p.hurt(1,null,true),true);
  }
});

test('remote Z casts are visual only, validate types, and all living players share one bullet-time factor',()=>{
  const s=setup(),{G,p}=s;const peer=new G.Player(G.DEX_BY[6]);peer.remote=true;
  G.Game.everyone=()=>[p,peer];G.ZMoves.sync(peer,['fire','choose',0]);assert.equal(G.ZMoves.timeFactor(),.1);
  assert.equal(G.ZMoves.remoteCast(peer,[['water-gun',1,false]],[0]),false);
  assert.equal(G.ZMoves.remoteCast(peer,[['ember',1,false]],[0]),true);
  const shots=G.Projectiles.all();assert.equal(shots.length,8);assert.ok(shots.every(p=>p.ghost));assert.equal(G.ZMoves.timeFactor(),1);
  const e=s.enemy(30);const hp=e.hp;G.Combat.resolve(.01,p,0);assert.equal(e.hp,hp);
});

function observer(s){
  const {G}=s;let receive;G.Net={uid:'viewer',hostUid:'host',on:f=>receive=f,onPeer:noop};G.startMoveOf=()=> 'water-gun';
  s.load('js/core/sprites.js');G.Sprites.preload=noop;s.load('js/net/coop.js');
  const p=s.player(25);G.Coop.begin({host:'host',members:[{uid:'host',dex:6,equipment:{abilities:{},megas:['6-mega-x'],z:null}},{uid:'peer',dex:9,equipment:{abilities:{},megas:[],z:'water'}},{uid:'viewer',dex:25}]},p,{syncTeam:noop});
  G.Game.everyone=()=>G.Coop.players();
  const state=(dex,mega=null,z=null)=>[0,0,0,0,100,130,0,'water-gun',1,78,0,1,0,0,0,null,mega,mega?60:0,mega,0,z,dex,15,G.MonProgression.pathFor(dex)];
  const send=(players,ev=[])=>receive('host',{k:'f',p:players,ev,t:100,lv:15,xp:0,xn:100,ki:0,bo:0,co:0});
  return {G,state,send};
}
test('observers apply evolution and Mega visuals before casts, retain the animator across snapshots and restore the base form',()=>{
  const s=context(),{G,state,send}=observer(s),seen=[];G.Combat.ghostCast=p=>seen.push({anim:p.anim.dex,types:p.mon.types.slice(),mega:G.Mega.active(p)});
  send({host:state(6,'6-mega-x')},[['c','host','ember',1,0,0]]);
  const p=G.Coop.mate('host').pl;assert.equal(p.anim.dex,'6-mega-x');assert.equal(seen[0].anim,'6-mega-x');assert.equal(seen[0].mega,true);assert.deepEqual(Array.from(seen[0].types),['fire','dragon']);
  const anim=p.anim;send({host:state(6,'6-mega-x')});assert.equal(p.anim,anim);
  send({host:state(6)});assert.equal(p.anim.dex,6);assert.equal(p.spriteDex,6);assert.equal(p.monStage,6);assert.equal(G.Mega.active(p),false);G.Coop.end();
});
test('first-snapshot fused Z effects reach an observer and cooldown clears stale casting effects',()=>{
  const s=context(),{G,state,send}=observer(s);
  send({peer:state(9,null,['water','cast',0,0])},[['zc','peer',[['water-gun',1,false],['hydro-pump',1,false]],[0,0]]]);
  const p=G.Coop.mate('peer').pl;assert.equal(p.anim.dex,9);assert.equal(p.zState.casts.length,2);assert.ok(p.zState.casts.every(e=>e.ghost));assert.equal(G.Projectiles.all().filter(x=>x.owner===p&&x.ghost).length,8);
  p.netUpdate(.01);assert.equal(p.anim.cur,'Charge');assert.equal(p.zState.casts.length,2);
  send({peer:state(9,null,['water','cooldown',5,0])});assert.equal(p.zState.casts.length,0);assert.equal(G.ZMoves.busy(p),false);p.netUpdate(.01);assert.equal(p.anim.base,'Idle');G.Coop.end();
});

test('Z crystal reserves the item slot and ordinary item pickups convert to XP',()=>{
  const s=setup(),{G,p}=s;s.loadGame();assert.equal(p.equip('leftovers'),false);
  const xp=p.xp;G.Game._test.collect({kind:'item',value:'leftovers'},p);assert.equal(p.item,null);assert.ok(p.xp>xp);
});

function visuals(s){
  const sprites=[],canvas=[];
  s.G.Settings={fx:2,get:()=>true};s.load('js/entities/fx.js');
  s.G.VFX.draw=(ctx,shape,pal,x,y,opts)=>sprites.push({shape,pal,x,y,...opts});
  const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...args)=>canvas.push([k,...args])});
  return {ctx,sprites,canvas,clear(){sprites.length=0;canvas.length=0;}};
}

test('Z beams retain each original animated material, quadruple sprite size and use pixel beam bodies',()=>{
  for(const [id,shape] of [['hydro-pump','drop'],['ice-beam','shard'],['psybeam','ring'],['dragon-rage','fire'],['flash-cannon','shard']]){
    const s=setup(id),{G,p,m}=s,v=visuals(s),vis=G.VFX.forMove(m);
    G.FX.beam(p.x,p.y-G.LIFT,0,m.radius,m.width,G.U.TYPE_COLOR[m.type],vis);G.FX.draw(v.ctx);
    const normal=v.sprites.find(x=>x.shape===shape);assert.ok(normal,`${id} normal material`);
    v.clear();release(s);G.ZMoves.draw(v.ctx);
    const z=v.sprites.find(x=>x.shape===shape);assert.ok(z,`${id} Z material`);
    assert.equal(z.pal,normal.pal);close(z.scale,normal.scale*4);
    assert.ok(v.canvas.filter(x=>x[0]==='fillRect').length>20,'original pixel beam body');
    assert.equal(v.canvas.some(x=>x[0]==='lineTo'),false,'no solid replacement beam');
    v.clear();G.Combat.tick(.5,p,0);G.ZMoves.draw(v.ctx);assert.ok(v.sprites.some(x=>x.shape===shape));
  }
});

test('both Z orbit layers retain the normal fire, leaf and wind sprites with facing and animation',()=>{
  for(const id of ['fire-spin','leaf-storm','gust']){
    const s=setup(id),{G,p,m}=s,v=visuals(s),vis=G.VFX.forMove(m);
    G.Projectiles.spawnOrb({x:p.x+m.radius,y:p.y,owner:p,vis,r:m.size,oa:0,t:.25});G.Projectiles.draw(v.ctx);
    const normal=v.sprites[0];v.clear();release(s);G.ZMoves.drawGround(v.ctx);G.ZMoves.draw(v.ctx);
    assert.equal(v.sprites.length,m.count*2);
    for(const z of v.sprites){assert.equal(z.shape,normal.shape);assert.equal(z.pal,normal.pal);close(z.scale,normal.scale*2.5);}
    assert.equal(v.sprites[0].frame,0);G.Combat.tick(.25,p,0);v.clear();G.ZMoves.draw(v.ctx);
    assert.ok(v.sprites.every(x=>x.frame===3));assert.ok(v.canvas.some(x=>x[0]==='ellipse'));
  }
});

test('Z meteors retain rock and ice sprites and the normal falling trajectory and ground warnings',()=>{
  for(const id of ['rock-slide','hail','meteor-mash']){
    const s=setup(id),{G,m}=s,v=visuals(s),vis=G.VFX.forMove(m);
    G.FX.drawMeteor(v.ctx,{x:100,y:50,t:.25,fall:.5,vis});const normal=v.sprites[0];v.clear();
    s.enemy(100);G.EnemyMgr.rebuildGrid();release(s);G.Combat.tick(.25,s.p,0);
    G.ZMoves.drawGround(v.ctx);G.ZMoves.draw(v.ctx);
    const z=v.sprites[0];assert.equal(z.shape,normal.shape);assert.equal(z.pal,normal.pal);close(z.scale,normal.scale*3);
    close(z.x,normal.x);close(z.y,normal.y-50);close(z.angle,normal.angle);
    assert.ok(v.canvas.some(x=>x[0]==='setLineDash'&&x[1].join(',')==='4,4'));
    assert.ok(v.canvas.some(x=>x[0]==='ellipse'&&Math.abs(x[3]-m.radius*3)<1e-8));
  }
});

test('Z melee accents and dash trails keep move-specific shapes instead of generic geometry',()=>{
  for(const [id,shape] of [['tackle','impact'],['bite','jaws'],['metal-claw','claw'],['vine-whip','leaf'],['quick-attack','streak'],['aerial-ace','wind']]){
    const s=setup(id),{G}=s,v=visuals(s);release(s);G.FX.draw(v.ctx);
    const z=v.sprites.find(x=>x.shape===shape);assert.ok(z,`${id} retained ${shape}`);assert.equal(z.pal,G.VFX.forMove(s.m).pal);
    assert.ok(z.scale>=3);v.clear();G.ZMoves.draw(v.ctx);
    assert.equal(v.canvas.some(x=>x[0]==='lineTo'),false,'no replacement dash band');
  }
});

test('Z hotkey arms and cancels selection, ignores text inputs and does not activate Mega',()=>{
  const s=setup(),{G,p}=s;s.loadGame();G.SettingsUI={isOpen:false};G.Input.tap=key=>key==='keyz';
  G.Game._test.keys();assert.equal(p.zState.phase,'choose');G.Game._test.keys();assert.equal(p.zState.phase,'ready');
  s.document.activeElement={closest:()=>true};G.Game._test.keys();assert.equal(p.zState.phase,'ready');
  s.document.activeElement=null;p.zState.type=null;let mega=0;G.Mega.activate=()=>mega++;
  G.Game._test.keys();assert.equal(mega,0);G.Input.tap=key=>key==='keyf';G.Game._test.keys();assert.equal(mega,1);
});

test('developer two-second Z cooldown repeats after every cast, defaults off and is disabled in co-op',()=>{
  const s=setup('quick-attack'),{G,p}=s;G.AbilityGacha={};s.load('js/ui/developer.js');
  assert.equal(G.Dev.zShortCooldown,false);assert.equal(G.Dev.setZCooldown(true),false);
  G.Dev.setEnabled(true);assert.equal(G.Dev.zShortCooldown,false);
  release(s);advance(s,.5);close(p.zState.cooldown,5);G.ZMoves.grantCharge(p,'test:1');
  assert.equal(G.Dev.setZCooldown(true),true);close(p.zState.cooldown,2);
  advance(s,2);assert.equal(p.zState.phase,'ready');release(s);advance(s,.5);close(p.zState.cooldown,2);
  advance(s,2);G.ZMoves.grantCharge(p,'test:2');release(s);advance(s,.5);close(p.zState.cooldown,2);
  G.Dev.setZCooldown(false);G.ZMoves.debugCharge(p);release(s);advance(s,.5);close(p.zState.cooldown,5);
  G.Dev.setZCooldown(true);G.Coop.active=true;assert.equal(G.Dev.zShortCooldown,false);assert.equal(G.Dev.setZCooldown(false),false);
  G.Coop.active=false;G.Dev.setEnabled(false);assert.equal(G.Dev.zShortCooldown,false);G.Dev.setEnabled(true);assert.equal(G.Dev.zShortCooldown,false);
});

test('Z projectiles cross walls and solid props without consuming pierce and still damage enemies beyond them',()=>{
  const s=setup('ember'),{G,p}=s;const e=s.enemy(120);e.hp=e.maxHp=1000000;e.boss=true;G.EnemyMgr.rebuildGrid();
  const solid={id:1,x:60,y:0,r:20,solid:true,destructible:true},fixed={id:2,solid:true,destructible:false};
  G.Camera.sees=()=>true;G.World.projectileBlock=()=> 'wall';G.World.propsInCircle=()=>[solid,fixed];
  let propHits=0;G.World.damageProp=prop=>{if(prop.destructible)propHits++;};
  release(s);const shots=G.Projectiles.all().slice();
  for(let i=0;i<3;i++){G.Projectiles.update(.05,p,G.EnemyMgr.all());G.Combat.resolve(.05,p,i*.05);}
  assert.equal(G.Projectiles.count,8);assert.ok(e.hp<e.maxHp);assert.ok(propHits>0);
  for(const shot of shots){const enemyHits=shot.hits.size;assert.equal(shot.pierce,999-enemyHits);}
  G.Projectiles.clear();G.Projectiles.spawn({x:60,y:0,friendly:true,owner:p,hits:new Set(),pierce:10});
  G.Combat.resolve(.05,p,1);assert.equal(G.Projectiles.count,0,'ordinary shots remain blocked by walls');
});

test('Z selection and casting reduce movement by 99.9 percent even with slow immunity, then restore it',()=>{
  const s=setup('ice-beam'),{G,p}=s;const base=p.spd;
  G.ZMoves.arm(p);close(p.spd,base*.001);
  G.Abilities.slowImmune=()=>true;close(p.spd,base*.001);
  p.setActive(0);close(p.spd,base*.001);advance(s,3);close(p.spd,base);
  p.zState.phase='ready';G.ZMoves.arm(p);G.ZMoves.arm(p);close(p.spd,base);
});

test('Z movement removes preexisting ice sliding momentum while the scripted dash retains its full range',()=>{
  const s=setup('ice-beam'),{G,p}=s;G.World.nearestBreakable=()=>null;G.Input.axis=()=>[1,0];
  G.World.isLiquid=()=>true;G.World.liquidEffect=()=>({slide:true});p.inLiquid=true;p.svx=p.spd*5;p.svy=100;
  const speed=p.spd;G.ZMoves.arm(p);const x=p.x,y=p.y;p.update(.1);close(p.x-x,speed*.001*.1);close(p.y,y);
  const d=setup('quick-attack');release(d);advance(d,.5);close(Math.hypot(d.p.x,d.p.y),d.m.radius*10);
});

function tier(s,n){s.load('js/systems/difficulty.js');s.G.Difficulty.begin(s.G.DB.save,6,n);return s.G.Difficulty;}

test('bounded cubic growth shares its first two minutes and separates stars later without exceeding caps',()=>{
  const s=context(),D=tier(s,4);
  for(const t of [0,30,120])for(let n=1;n<=8;n++){assert.equal(D.growth(t,'normal',n).hp,1);assert.equal(D.growth(t,'normal',n).dmg,1);}
  for(let n=1;n<=8;n++){
    let last=1;for(let t=0;t<=3600;t+=30){const h=D.growth(t,'normal',n).hp;assert.ok(h>=last);last=h;}
    assert.ok(D.growth(1e8,'normal',n).hp<=[9,11,14,18,23,29,36,44][n-1]);
    if(n<8){assert.ok(D.growth(1200,'normal',n+1).hp>D.growth(1200,'normal',n).hp);assert.ok(D.rewards(n+1)>D.rewards(n));}
  }
  assert.ok(D.growth(180,'normal',8).hp/D.growth(180,'normal',4).hp<1.06);
  assert.ok(D.growth(1200,'normal',8).hp/D.growth(1200,'normal',4).hp>2);
});

test('low tiers reduce ranged weight while tiers five through eight retain the original bag',()=>{
  const s=context(),{G}=s,D=tier(s,1);s.load('js/data/enemies.js');G.Enemies.rollRun();
  const source=G.Enemies.cast[5].list;assert.ok(source.length);
  const types=new Set(['ranged','fan','beamer','zoner']);
  const ratio=bag=>bag.filter(x=>types.has(x.behavior)).length/bag.length;
  // Same run roster; only weights change, and every species remains obtainable.
  const low=G.Enemies.bagAt(600);D.begin(G.DB.save,6,5);const high=G.Enemies.bagAt(600);
  assert.deepEqual([...new Set(low.map(x=>x.dex))].sort(),[...new Set(high.map(x=>x.dex))].sort());
  assert.ok(ratio(low)<=ratio(high));D.begin(G.DB.save,6,8);assert.equal(G.Enemies.bagAt(600).length,high.length);
});

test('directional spawns concentrate at low tiers and the preferred direction changes on its timer',()=>{
  const s=context(),{G}=s,D=tier(s,1);G.Enemies={rollRun:noop,upcomingDex:()=>[]};s.load('js/systems/spawner.js');
  let seed=19;s.Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};G.Spawner.reset();
  const sample=()=>{const a=Array.from({length:2000},()=>G.Spawner.spawnAngle());return [a.reduce((v,x)=>v+Math.cos(x),0)/a.length,a.reduce((v,x)=>v+Math.sin(x),0)/a.length];};
  const first=sample();assert.ok(Math.hypot(...first)>.5);
  G.Enemies.BOSSES=[];G.EnemyMgr.count;G.Rift={inArena:false};G.Judgment.active=false;G.Coop.scaleRate=()=>1;
  // Keep the live cap full so this test advances only the direction clock.
  const original=G.EnemyMgr;G.EnemyMgr={count:64,bossAlive:()=>true};G.Spawner.update(51,[s.player()],100);
  const next=sample();assert.ok(first[0]*next[0]+first[1]*next[1]<0);G.EnemyMgr=original;
  D.begin(G.DB.save,6,5);assert.ok(Math.hypot(...sample())<.08);
});

test('real low-star and high-star waves keep equal counts, with elite rolls applied before network publication',()=>{
  const counts=[];
  for(const n of [1,5,6]){
    const s=context(),{G}=s,p=s.player();tier(s,n);G.Coop.scaleRate=()=>1;
    s.Math.random=()=>.0075;s.load('js/data/enemies.js');s.load('js/systems/spawner.js');G.Spawner.reset();
    const published=[];G.Coop.isHost=true;G.Coop.enemyAdded=e=>published.push({elite:!!e.elite,hp:e.hp});
    for(let i=0;i<20;i++)G.Spawner.update(.5,[p],i*.5);
    counts.push(G.EnemyMgr.count);assert.ok(counts.at(-1)>0);
    assert.ok(G.EnemyMgr.all().every(e=>!!e.elite===(n===6)));
    assert.deepEqual(published,Array.from(G.EnemyMgr.all(),e=>({elite:!!e.elite,hp:e.hp})));
  }
  assert.ok(counts.every(n=>n===counts[0]));
});

test('non-boss contact attackers stop for at least 0.6 seconds after the target runs away',()=>{
  const s=context(),{G}=s,p=s.player();tier(s,4);G.Path={dirFor:()=>null};
  const e=new G.Enemy({dex:1,hp:100,spd:100,dmg:10,xp:1,behavior:'chase'},20,0,{hp:1,spd:1,dmg:1});
  e.update(.01,p);assert.ok(e.contactHold>=.6);p.x=1000;const x=e.x;e.update(.5,p);assert.ok(e.contactHold>0);assert.ok(e.x-x<2);
  e.update(.16,p);assert.equal(e.contactHold,0);assert.ok(e.x-x>10);
  const boss=new G.Enemy({dex:1,hp:100,spd:100,dmg:10,xp:1,behavior:'chase'},p.x+20,0,{hp:1,spd:1,dmg:1},true);boss.update(.01,p);assert.equal(boss.contactHold,0);
});

test('elites multiply stats once, enlarge their sprite and keep those visuals in network copies',()=>{
  const s=context(),{G}=s;tier(s,6);const e=s.enemy(100),hp=e.hp,dmg=e.dmg,xp=e.xp,scale=e.scale;
  assert.ok(e.makeElite());assert.equal(e.hp,hp*5);assert.equal(e.dmg,dmg*2);assert.equal(e.xp,xp*5);assert.equal(e.scale,scale*1.5);
  assert.equal(e.makeElite(),false);assert.equal(e.hp,hp*5);assert.equal(G.Difficulty.eliteChance(5),.005);assert.equal(G.Difficulty.eliteChance(6),.01);
  const remote=G.EnemyMgr.addRemote({id:999,dex:1,hp:e.maxHp,dmg:e.dmg,x:10,y:0,elite:true});assert.ok(remote.elite);assert.equal(remote.maxHp,e.maxHp);assert.equal(remote.dmg,e.dmg);assert.equal(remote.scale,e.scale);
});

test('elite loot supplies five times XP and five ordinary bonus-drop rolls, plus difficulty treasure',()=>{
  const s=context(),{G}=s,p=s.player();tier(s,8);const e=s.enemy(100);e.makeElite();e.lastAttacker=p;
  G.Settings={fx:0};s.load('js/entities/pickup.js');s.Math.random=()=>0;e.die();
  const drops=G.Pickups.all();assert.equal(drops.filter(x=>x.kind==='ticket').length,5);assert.equal(drops.filter(x=>x.kind==='treasure').length,5);
  assert.equal(drops.filter(x=>['xp','xpBig'].includes(x.kind)).reduce((n,x)=>n+x.value,0),5);
});

test('corrupted cards reveal the ten-HP penalty and apply it only when picked, with a one-HP floor',()=>{
  const s=setup('ember'),{G,p}=s;tier(s,7);s.load('js/systems/levelup.js');s.Math.random=()=>0;
  const before=p.maxHp,cards=G.LevelUp.offer(p);assert.ok(cards.every(c=>c.corrupted));assert.equal(p.maxHp,before);
  const move=cards.find(c=>c.type!=='stat')||cards[0];move.apply(p);close(p.maxHp,before+(move.key==='stat:hp'?20:0)-10);
  p.maxHp=p.hp=5;move.apply(p);assert.equal(p.maxHp,1);assert.equal(p.hp,1);
  G.Difficulty.begin(G.DB.save,6,6);assert.ok(G.LevelUp.offer(p).every(c=>!c.corrupted));
});

test('eight-star damage curse clears temporary effects but preserves permanent growth and cannot chain during cooldown',()=>{
  const s=setup('ember'),{G,p}=s,D=tier(s,8);s.Math.random=()=>0;
  p.buffs.atk.n=3;p.buffs.spd.n=2;p.atkMul=1.4;G.Abilities.state(p).growthAtk=.2;G.Abilities.state(p).justiceT=5;
  assert.ok(D.onHurt(p));assert.equal(p.buffs.atk.n,0);assert.equal(p.buffs.spd.n,0);assert.equal(p.atkMul,1.4);assert.equal(G.Abilities.state(p).growthAtk,.2);assert.equal(G.Abilities.state(p).justiceT,0);assert.equal(p.slowT,2.5);
  p.buffs.atk.n=1;assert.equal(D.onHurt(p),false);assert.equal(p.buffs.atk.n,1);
  p.difficultyCurseT=0;D.begin(G.DB.save,6,7);assert.equal(D.onHurt(p),false);
});

test('Z charges start at one, spend once per fused cast, cap at three and never regenerate on cooldown',()=>{
  const s=setup('quick-attack',['tackle']),{G,p}=s;p.slots=[p.moves];assert.equal(p.zState.charges,1);
  G.ZMoves.arm(p);G.ZMoves.arm(p);assert.equal(p.zState.charges,1);release(s);assert.equal(p.zState.charges,0);advance(s,2.2);advance(s,5);assert.equal(G.ZMoves.arm(p),false);
  for(let i=0;i<5;i++)G.ZMoves.grantCharge(p,'reward:'+i);assert.equal(p.zState.charges,3);release(s);assert.equal(p.zState.charges,2);
  assert.equal(G.ZMoves.grantCharge(p,'reward:4'),false);assert.equal(p.zState.charges,2);
});

test('Z recharge chances distinguish ordinary kills, elites, guaranteed bosses and successful events',()=>{
  const s=setup(),{G,p}=s;tier(s,1);p.zState.charges=0;
  s.Math.random=()=>.002;G.ZMoves.onKill({id:1,lastAttacker:p});assert.equal(p.zState.charges,0);
  s.Math.random=()=>.0019;G.ZMoves.onKill({id:2,lastAttacker:p});assert.equal(p.zState.charges,1);
  s.Math.random=()=>.049;G.ZMoves.onKill({id:3,elite:true,lastAttacker:p});assert.equal(p.zState.charges,2);
  s.Math.random=()=>.99;G.ZMoves.onKill({id:4,boss:true,lastAttacker:null});assert.equal(p.zState.charges,3);
  p.zState.charges=0;s.Math.random=()=>.8;G.ZMoves.eventReward();assert.equal(p.zState.charges,0);
  s.Math.random=()=>.799;G.ZMoves.eventReward();assert.equal(p.zState.charges,1);
});

test('host grants remote Z charge rewards through one idempotent targeted message without rerolling on clients',()=>{
  const s=setup(),{G,p}=s,peer=new G.Player(G.DEX_BY[6]);peer.remote=true;peer.uid='peer';G.ZMoves.sync(peer,['fire','ready',0,0]);
  const sent=[];G.Coop.active=true;G.Coop.isHost=true;G.Coop.zAward=(p,k)=>sent.push([p.uid,k]);G.Game.everyone=()=>[p,peer];G.ZMoves.onKill({id:77,boss:true});
  assert.deepEqual(sent,[['peer','boss:77']]);p.zState.charges=0;G.ZMoves.grantCharge(p,'boss:77');assert.equal(p.zState.charges,0,'already delivered reward is not replayed after spending');
  G.Coop.isHost=false;G.ZMoves.onKill({id:78,boss:true});assert.equal(sent.length,1);
});

test('a kill by a teammate without a Z stone shares one roll with all Z owners, including downed teammates',()=>{
  const s=setup(),{G,p}=s,killer=new G.Player(G.DEX_BY[25]),water=new G.Player(G.DEX_BY[9]),grass=new G.Player(G.DEX_BY[3]);
  p.zState.charges=0;water.remote=true;water.uid='water';water.dead=true;grass.remote=true;grass.uid='grass';
  G.ZMoves.sync(water,['water','ready',0,0]);G.ZMoves.sync(grass,['grass','ready',0,3]);
  const sent=[];let rolls=0;G.Coop.active=true;G.Coop.isHost=true;G.Coop.zAward=(p,key)=>sent.push([p.uid,key]);G.Game.everyone=()=>[p,killer,water,grass];s.Math.random=()=>{rolls++;return 0;};
  G.ZMoves.onKill({id:801,lastAttacker:killer});assert.equal(rolls,1);assert.equal(p.zState.charges,1);assert.equal(G.ZMoves.hasStone(killer),false);
  assert.deepEqual(sent,[['water','kill:801'],['grass','kill:801']]);G.ZMoves.grantTeamCharge('kill:801');assert.equal(sent.length,2);assert.equal(p.zState.charges,1);
  G.ZMoves.onKill({id:802,elite:true,lastAttacker:killer});assert.equal(rolls,2);assert.equal(p.zState.charges,2);assert.equal(sent.length,4);
});

test('shared Z awards cap independently, do not replay after spending, and guests cannot fan out a reward',()=>{
  const s=setup(),{G,p}=s,full=new G.Player(G.DEX_BY[9]),downed=new G.Player(G.DEX_BY[3]);G.ZMoves.sync(full,[]);
  G.ZMoves.grant(G.DB.save,'water');G.ZMoves.equip(G.DB.save,9,'water');G.ZMoves.init(full,G.DB.save);
  G.ZMoves.grant(G.DB.save,'grass');G.ZMoves.equip(G.DB.save,3,'grass');G.ZMoves.init(downed,G.DB.save);downed.dead=true;
  p.zState.charges=0;full.zState.charges=3;downed.zState.charges=0;G.Game.everyone=()=>[p,full,downed];G.Coop.active=true;G.Coop.isHost=true;
  assert.equal(G.ZMoves.grantTeamCharge('pickup:900'),true);assert.deepEqual([p.zState.charges,full.zState.charges,downed.zState.charges],[1,3,1]);
  full.zState.charges=2;assert.equal(G.ZMoves.grantTeamCharge('pickup:900'),false);assert.equal(full.zState.charges,2);
  G.Coop.isHost=false;assert.equal(G.ZMoves.grantTeamCharge('pickup:901'),false);assert.deepEqual([p.zState.charges,full.zState.charges,downed.zState.charges],[1,2,1]);
});

test('successful timed events recharge once, while an expired lost-Pokémon rescue gives no Z reward',()=>{
  const s=setup(),{G,p}=s;p.zState.charges=0;s.Math.random=()=>0;
  s.load('js/systems/events.js');G.Events.reset();G.Events.debugStart('gold');G.Events.update(31,[p],100);
  assert.equal(p.zState.charges,1);G.Events.update(.1,[p],100);assert.equal(p.zState.charges,1);
  G.Events.reset();G.Events.debugStart('lost');assert.equal(G.Events.current,'lost');
  G.Events.update(121,[p],100);assert.equal(G.Events.current,null);assert.equal(p.zState.charges,1);
});

test('guest protocol deduplicates Z recharge packets and preserves elite stats and size',()=>{
  const s=setup(),{G,p}=s;let receive;p.zState.charges=0;
  G.Net={uid:'peer',on:fn=>receive=fn,onPeer:noop};G.startMoveOf=()=> 'ember';G.Judgment.netApply=noop;
  s.load('js/net/coop.js');G.Coop.begin({host:'host',members:[{uid:'host',dex:6},{uid:'peer',dex:6}]},p,{syncTeam:noop});
  const frame={k:'f',ev:[['za','boss:42'],['ne',42,1,100,0,0,0,500,20,'chase',null,1]],p:{},t:1,lv:1,xp:0,xn:100,ki:1,bo:0,co:0};
  receive('host',frame);assert.equal(p.zState.charges,1);const elite=G.EnemyMgr.get(42);
  assert.ok(elite.elite);assert.equal(elite.scale,1.5);assert.equal(elite.maxHp,500);assert.equal(elite.dmg,20);
  p.zState.charges=0;receive('host',frame);assert.equal(p.zState.charges,0);assert.equal(G.EnemyMgr.all().length,1);G.Coop.end();
});

test('capture and treasure chances rise together, and treasure pickups add their full coin value',()=>{
  const s=setup(),{G,p}=s,D=tier(s,1);const e=s.enemy(100),base=G.MonProgression.captureChance(e);
  D.begin(G.DB.save,6,8);close(G.MonProgression.captureChance(e),base*2.6);close(D.treasureChance(),.002*2.6);
  close(G.MonProgression.captureChance({boss:true}),.05*2.6);
  s.loadGame();const before=p.coins;G.Game._test.collect({kind:'treasure',value:50},p);assert.equal(p.coins,before+50);
});

test('weather chip respects Z immunity and triggers the eight-star curse only on actual HP loss',()=>{
  const s=setup(),{G,p}=s;tier(s,8);s.Math.random=()=>0;s.load('js/systems/weather.js');
  G.Weather.force('sand',30);p.buffs.atk.n=3;const hp=p.hp;G.ZMoves.arm(p);
  G.Weather.update(2,100,p);assert.equal(p.hp,hp);assert.equal(p.buffs.atk.n,3);
  G.ZMoves.cancel(p);G.Weather.update(2,100,p);assert.ok(p.hp<hp);assert.equal(p.buffs.atk.n,0);assert.equal(p.slowT,2.5);
});

test('co-op snapshots preserve a shared victory pause, reject late combat, resume, and deliver the host cashout decision',()=>{
  const h=setup(),c=setup(),host=h.G,guest=c.G;let fromPeer,fromHost;const packets=[],order=[];
  host.Net={uid:'host',on:fn=>fromPeer=fn,onPeer:noop,slow:()=>false,viaTurn:()=>false,send:(uid,msg)=>packets.push(msg)};
  guest.Net={uid:'peer',on:fn=>fromHost=fn,onPeer:noop};
  for(const s of [h,c]){s.G.Social={me:null};s.G.startMoveOf=()=> 'ember';s.G.Judgment.netState=()=>null;s.G.Judgment.netApply=noop;s.load('js/net/coop.js');}
  const cfg={host:'host',members:[{uid:'host',dex:6},{uid:'peer',dex:6}]};
  const team={time:1201,level:1,xp:0,xpNext:100,kills:0,bosses:0,coins:0,t1:0,t10:0,victory:true};
  host.Coop.begin(cfg,h.p,{team:()=>team});guest.Coop.begin(cfg,c.p,{syncTeam:()=>order.push('team'),victory:v=>order.push(v?'open':'close'),hold:()=>order.push('hold'),over:d=>order.push(d.victoryCashout?'cashout':'over')});
  const enemy=h.enemy(100),hp=enemy.hp;host.Coop.holdStart();const pause=packets.at(-1);assert.equal(pause.victory,true);
  fromHost('host',pause);assert.equal(order[0],'team');assert.equal(order[1],'open');assert.ok(order.indexOf('hold')>1);
  fromPeer('peer',{k:'f',ev:[['h',enemy.id,10,'#fff',0,0,0,'ember']]});assert.equal(enemy.hp,hp);
  team.victory=false;host.Coop.holdEnd();fromHost('host',packets.at(-1));assert.ok(order.includes('close'));
  host.Coop.over({why:'victory',victoryCashout:true});fromHost('host',packets.at(-1));assert.equal(order.at(-1),'cashout');
  assert.equal(guest.Coop.active,false);
});
