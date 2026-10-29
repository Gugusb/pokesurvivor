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
  s.load('js/data/evolutions.js');s.load('js/systems/progression-mon.js');
  const G=s.G;G.FIREBASE_CONFIG=null;G.Coop={active:false,isHost:false,scaleHp:()=>1,broadcast:noop};
  G.FX=new Proxy({},{get:()=>noop});G.Audio={sfx:noop};G.UI={toast:noop};G.Camera={kick:noop,sees:()=>false,outerRadius:()=>500};
  G.Sprites={PX:2,hasShiny:id=>typeof id==='number'||!!G.MEGA_SPRITE_META?.[id]?.sh,bodyRadius:()=>10,bodyHeight:()=>30,preload:noop,hovers:()=>false,dirFromAngle:()=>0,animMeta:()=>null,
    Animator:class{constructor(dex,scale,shiny){this.dex=dex;this.dir=0;this.shiny=!!shiny;}play(){}update(){}loop(){}busy(){return false;}}};
  G.Projectiles={clearOrbs:noop};G.Input={axis:()=>[0,0]};G.Dev={canUse:()=>false,invincible:false};
  G.World={biome:0,liquidEffect:()=>({}),isLiquid:()=>false,collide:noop,isWall:()=>false,isFree:()=>true,
    propsInCircle:()=>[],projectileBlock:()=>null,damageProp:noop,setArena:noop,setBiome:noop};
  G.Weather={speedFor:()=>1,mult:()=>1,force:noop,clear:noop};G.Tiles={T:16,arenaBiome:()=>0,ARENA_THEMES:{}};
  G.Judgment={AT:1800,noteDmg:noop};G.Pickups={drop:noop,dropXp:noop,pullAll:noop};G.Progress={event:noop,kill:noop};G.Events={golden:false};G.Hazards={clear:noop};G.Spawner={say:noop};
  let p;s.playerRef=()=>p;G.Game={state:'playing',st:{time:100},everyone:()=>p?[p]:[],flash:noop,offerBond:noop,debugMark:noop};
  s.load('js/systems/mega-preview.js');s.load('js/systems/mega.js');
  const db=fs.readFileSync(path.join(ROOT,'js/core/db.js'),'utf8').replace('ready, register, login,','_test:{newSave,migrate,sanitize}, ready, register, login,');vm.runInContext(db,s);G.DB.playAsGuest();
  for(const f of ['js/systems/abilities.js','js/entities/player.js','js/entities/enemy.js','js/entities/projectile.js','js/entities/vfx.js','js/systems/combat.js','js/systems/rift.js'])s.load(f);
  s.player=(dex=6,stone=true)=>{if(stone){const f=G.Mega.formsFor(dex)[0];G.Mega.grant(G.DB.save,f.id);G.Mega.equip(G.DB.save,dex,f.id);}p=new G.Player(G.DEX_BY[dex]);p.baseDefense=p.baseSpDef=1;p.baseSpa=p.baseAtk;G.Game.player=p;return p;};
  s.enemy=(x=30,mega=null)=>{const e=G.EnemyMgr.add(new G.Enemy({dex:mega?G.Mega.BY[mega].dex:1,mega,hp:10000,spd:0,dmg:10,xp:1,behavior:'ranged'},x,0,{hp:1,spd:1,dmg:1},!!mega));e.defense=e.spdef=1;return e;};
  s.evolve=p=>{G.Mega.tick(p,120);assert.ok(G.Mega.activate(p));};
  s.cast=(p,id,lvl=1)=>{const m=G.Moves.instance(id,lvl);p.moves=[m];p.slots=[[m]];p.active=0;p.target=G.EnemyMgr.all()[0];p.aim=0;G.EnemyMgr.rebuildGrid();G.Combat.tick(0,p,0);return m;};
  s.loadRift=()=>{let src=fs.readFileSync(path.join(ROOT,'js/systems/rift.js'),'utf8').replace('reset, update, drawable,','_start:start, reset, update, drawable,');vm.runInContext(src,s);};
  s.loadGame=()=>{G.UI.isOpen=()=>false;let src=fs.readFileSync(path.join(ROOT,'js/game.js'),'utf8').replace('init, startRun, everyone,',"_test:{setPlayer(p){pl=p;state='playing';},collect:onCollect,offerItem,pending:()=>pendingLevels}, init, startRun, everyone,");vm.runInContext(src,s);G.Game._test.setPlayer(p);};
  return s;
}
test('all 36 stone forms have pinned canonical types, and legacy partial forms stay preview-only',()=>{
  const {G}=context();assert.equal(G.Mega.LIST.length,36);assert.equal(G.Mega.BY['80-mega'],undefined);
  assert.deepEqual(Array.from(G.MEGA_TYPES['6-mega-x']),['fire','dragon']);assert.deepEqual(Array.from(G.MEGA_TYPES['334-mega']),['dragon','fairy']);
  assert.deepEqual(Array.from(G.MEGA_TYPES['428-mega']),['normal','fighting']);assert.equal(Object.keys(G.MEGA_TYPES).length,36);
  const source=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/mega/battle-types.json'),'utf8'));assert.match(source.commit,/^[a-f0-9]{40}$/);
  for(const f of G.Mega.LIST)assert.deepEqual(Array.from(G.MEGA_TYPES[f.id]),source.forms[f.id].types);
});
test('stones migrate empty, sanitize invalid equipment, merge ownership and preserve a deliberate unequip',()=>{
  const {G}=context(),s=G.DB.save;assert.equal(Object.keys(s.megaStones).length,0);
  G.Mega.grant(s,'6-mega-x');assert.equal(G.Mega.grant(s,'6-mega-x'),false);assert.equal(G.Mega.equip(s,65,'6-mega-x'),false);
  assert.ok(G.Mega.equip(s,6,'6-mega-x'));s.megaStones.bad={at:1};s.megaEquipped[65]='6-mega-x';G.DB._test.sanitize(s);
  assert.equal(s.megaStones.bad,undefined);assert.equal(s.megaEquipped[65],undefined);
  const old=JSON.parse(JSON.stringify(s));s.updated=20;old.updated=10;G.Mega.equip(s,6,null);G.Mega.grant(old,'65-mega');
  const merged=G.DB.merge(s,old);assert.equal(merged.megaEquipped[6],null);assert.ok(merged.megaStones['65-mega']);
  const legacy=G.DB._test.migrate({name:'old',owned:{},stats:{},abilityStarterGranted:true},'old');assert.equal(legacy.v,7);assert.equal(Object.keys(legacy.megaStones).length,0);
});
test('a real local save retains stone ownership and equipment through logout/login',async()=>{
  const {G}=context();assert.ok((await G.DB.register('MegaTest','test-only')).ok);G.Mega.grant(G.DB.save,'6-mega-x');G.Mega.equip(G.DB.save,6,'6-mega-x');G.DB.commit(true);
  await G.DB.logout();assert.ok((await G.DB.login('MegaTest','test-only')).ok);assert.ok(G.Mega.owns(G.DB.save,'6-mega-x'));assert.equal(G.DB.save.megaEquipped[6],'6-mega-x');
});
test('energy takes 120 idle seconds, capped kill bonuses are deduplicated and Mega never recharges',()=>{
  const s=context(),{G}=s,p=s.player();G.Mega.tick(p,119.9);assert.equal(G.Mega.activate(p),false);G.Mega.tick(p,.1);assert.ok(G.Mega.activate(p));
  assert.equal(p.megaState.left,60);G.Mega.onKill(p,1);G.Mega.tick(p,59);assert.equal(p.megaState.energy,0);G.Mega.tick(p,1);assert.equal(p.megaState.left,0);assert.equal(p.megaState.energy,0);
  G.Mega.tick(p,1);G.Mega.onKill(p,2);G.Mega.onKill(p,2);G.Mega.onKill(p,3);G.Mega.onKill(p,4);G.Mega.onKill(p,5);close(p.megaState.energy,1.25);
  p.dead=true;G.Mega.tick(p,100);close(p.megaState.energy,1.25);p.dead=false;G.Game.state='paused';p.megaState.energy=120;assert.equal(G.Mega.activate(p),false);
  const q=s.player(65,false);G.Mega.tick(q,1000);assert.equal(q.megaState.energy,0);
});
test('transform and expire preserve HP ratio, acquired max-HP upgrades and canonical type resistance',()=>{
  const s=context(),{G}=s,p=s.player();p.addMaxHp(20);p.hp=p.maxHp/2;const base=p.maxHp;s.evolve(p);
  close(p.maxHp,base*1.3);close(p.hp/p.maxHp,.5);assert.deepEqual(Array.from(p.mon.types),['fire','dragon']);assert.equal(p.spriteDex,'6-mega-x');
  p.addMaxHp(10);close(p.maxHp,(base+10)*1.3);const frac=p.hp/p.maxHp;
  p.invuln=0;p.hurt(13,null,true);close(p.hp,(base+10)*1.3*frac-10);
  const before=p.hp/p.maxHp;G.Mega.tick(p,60);close(p.maxHp,base+10);close(p.hp/p.maxHp,before);assert.equal(p.mon,G.DEX_BY[6]);
  s.evolve(p);p.dead=true;p.hp=0;G.Mega.tick(p,.1);assert.equal(G.Mega.active(p),false);assert.equal(p.hp,0);
});
test('Mega pushes all nearby enemies including bosses, and debug preview cannot replace real evolution',()=>{
  const s=context(),{G}=s,p=s.player(),near=s.enemy(),boss=s.enemy(50,'65-mega'),far=s.enemy(181);s.evolve(p);
  assert.ok(near.kx>0);assert.ok(boss.kx>0);assert.equal(far.kx,0);G.Dev.canUse=()=>true;
  assert.equal(G.MegaPreview.apply(p,'6-mega-x'),false);assert.equal(G.MegaPreview.restore(p),false);
  G.Dev.canUse=()=>false;assert.equal(G.Mega.debugCharge(p),false);
});
test('every skill family is enhanced without mutating learned or evolved move instances',()=>{
  const s=context(),{G}=s,p=s.player();s.evolve(p);const kinds=new Set();
  for(const def of G.Moves.ALL){const m=G.Moves.instance(def.id,def.maxLvl);G.Moves.evolve(m);const before=JSON.stringify(m);const v=G.Mega.move(p,m);kinds.add(m.kind);
    assert.equal(JSON.stringify(m),before);assert.equal(v.megaFx,true);assert.equal(G.VFX.forMove(v).pal,'mega');
    if(m.kind==='projectile'||m.kind==='boomerang'){close(v.size,m.size*1.3);assert.equal(v.pierce,(m.pierce||0)+3);}
    if(m.kind==='beam')close(v.width,m.width*2);
    if(m.kind==='chain'||m.kind==='meteor')assert.equal(v.count,m.count*2);
    if(m.kind==='orbit'){close(v.radius,m.radius*1.3);close(v.speed,m.speed*2);}
    if(m.kind==='nova')close(v.life,m.life*1.3);
    if(['aura','mine'].includes(m.kind))close(v.radius,m.radius*1.3);
    if(m.kind==='turret')close(v.rate,(m.rate||.6)/2);
    if(m.kind==='trail')close(v.dmg,m.dmg*1.4);
  }assert.equal(kinds.size,15);
});
test('real projectile casts gain pierce, collision radius and Mega palette; melee recharges 50% faster',()=>{
  const s=context(),{G}=s,p=s.player();s.enemy();s.evolve(p);const m=s.cast(p,'ember'),shot=G.Projectiles.all()[0];
  assert.equal(shot.pierce,m.pierce+3);close(shot.r,m.size*1.3);assert.equal(shot.vis.pal,'mega');assert.equal(m.megaFx,undefined);
  const melee=s.cast(p,'tackle');const cd=melee.t;G.Combat.tick(.1,p,.1);close(melee.t,cd-.15);
  const cone=s.cast(p,'bubble-beam');const ct=cone.t;G.Combat.tick(.1,p,.2);close(cone.t,ct-.1/.75);
});
test('real beams widen hit area; meteors double and turret shots use doubled attack speed',()=>{
  const s=context(),{G}=s,p=s.player();const e=s.enemy(50);e.y=35;s.evolve(p);e.kx=0;
  s.cast(p,'ice-beam',5);assert.ok(e.hp<e.maxHp);
  G.Combat.clearFields();s.cast(p,'hail');assert.equal(G.Combat.fieldCount,G.Moves.BY_ID.hail.count*2);
  G.Combat.clearFields();s.cast(p,'substitute');G.Combat.updateFields(.3);const count=G.Projectiles.all().length;G.Combat.updateFields(.31);assert.ok(G.Projectiles.all().length>count);
});
test('buff effective stacks double including pre-existing stacks, and the original cap returns on expiry',()=>{
  const s=context(),{G}=s,p=s.player();const m=G.Moves.instance('swords-dance');p.addBuff('atk',m.amount,m.dur,m.stacks);const base=p.baseAtk;s.evolve(p);
  assert.equal(p.buffStacks(p.buffs.atk),2);close(p.atk,base*(1+2*m.amount));
  for(let i=0;i<20;i++)s.cast(p,'swords-dance');assert.equal(p.buffStacks(p.buffs.atk),m.stacks*2);
  G.Mega.finish(p);assert.equal(p.buffStacks(p.buffs.atk),m.stacks);
});
test('dash post-guard reduces damage by 70% and real outgoing damage applies Mega exactly once',()=>{
  const s=context(),{G}=s,p=s.player(),e=s.enemy();s.evolve(p);s.cast(p,'aerial-ace');assert.equal(p.megaDashGuard,.6);
  p.hp=p.maxHp;p.update(.31);assert.equal(p.dashGuardT,0);assert.ok(p.megaDashGuard>0);
  p.hurt(13,null,true);close(p.maxHp-p.hp,3);p.megaDashGuard=0;p.invuln=0;
  p.x=0;p.y=0;G.EnemyMgr.rebuildGrid();const hp=e.hp;G.Combat.counterTackle(p,e);const tackle=G.Moves.instance('tackle');close(hp-e.hp,Math.round(tackle.dmg*p.atk*G.Types.mult('normal',e.types)*1.5));
});
test('every rift has a 20% Mega branch, excludes partial forms, and 5% awards are authority-driven and idempotent',()=>{
  const s=context(),{G}=s,p=s.player();s.loadRift();s.Math.random=()=>.1999;G.Rift._start();assert.ok(G.Rift.arena.mega);assert.equal(G.Mega.BY[G.Rift.arena.mega].basicComplete,true);
  let boss=G.EnemyMgr.get(G.Rift.arena.bossId);assert.equal(boss.spriteDex,G.Rift.arena.mega);assert.deepEqual(Array.from(boss.types),Array.from(G.MEGA_TYPES[boss.mega]));
  const id=boss.mega;boss.die();G.EnemyMgr.clear();s.Math.random=()=>.0499;G.Rift.update(.01,p,100);assert.ok(G.Mega.owns(G.DB.save,id));assert.equal(G.DB.save.abilityGems,11);
  G.Rift.onEvent(['aw',id]);assert.equal(G.DB.save.abilityGems,11);
  G.Rift.reset();s.Math.random=()=>.2;G.Rift._start();assert.equal(G.Rift.arena.mega,null);
  G.Rift.reset();s.Math.random=()=>.1;G.Rift._start(null,'65-mega');boss=G.EnemyMgr.get(G.Rift.arena.bossId);boss.die();s.Math.random=()=>.05;G.Rift.update(.01,p,100);assert.equal(G.Mega.owns(G.DB.save,'65-mega'),false);
});
test('co-op validates Mega species, applies one damage multiplier, pushes once and credits only the killer',()=>{
  const s=context(),{G}=s;let receive;G.Net={uid:'host',on:f=>receive=f,onPeer:noop};G.startMoveOf=()=> 'ember';s.load('js/net/coop.js');
  const p=s.player(65);G.Coop.begin({host:'host',members:[{uid:'host',dex:65,name:'Host'},{uid:'peer',dex:6,name:'Peer'}]},p,{});
  const e=s.enemy(50);const frame=(mega,left)=>[0,0,0,0,100,130,0,'ember',1,78,0,1,0,0,0,null,mega,left];
  receive('peer',{k:'f',p:frame('6-mega-x',60),ev:[['mx','6-mega-x'],['h',e.id,10,'#fff',0,0,0,'ember']]});
  assert.equal(e.maxHp-e.hp,15);const knock=e.kx;assert.ok(knock>0);const mate=G.Coop.mate('peer').pl;assert.equal(mate.spriteDex,'6-mega-x');
  receive('peer',{k:'f',p:frame('6-mega-x',59),ev:[['mx','6-mega-x']]});assert.equal(e.kx,knock);
  e.lastAttacker=mate;e.die();assert.ok(G.Coop.mate('peer').q.some(ev=>ev[0]==='mk'&&ev[1]===e.id));
  receive('peer',{k:'f',p:frame('65-mega',60),ev:[]});assert.equal(mate.spriteDex,6);assert.equal(G.Mega.active(mate),false);
});
test('a held Mega stone converts item pickups to XP without equipping or offering a choice, normal items still equip',()=>{
  const s=context(),{G}=s,p=s.player();s.loadGame();p.xpMul=2;const xp=G.Mega.itemXp(p)*2,threshold=p.xpNext;
  G.Game._test.collect({kind:'item',value:'leftovers'},p);close(p.xp,xp);assert.equal(p.item,null);assert.equal(p.equip('leftovers'),false);
  G.Game._test.offerItem('quickclaw');close(p.xp,xp*2);assert.equal(p.level,1);
  G.Game._test.offerItem('quickclaw');close(p.xp,xp*3-threshold);assert.equal(p.level,2);assert.equal(G.Game._test.pending(),1);
  const q=s.player(65,false);G.Game._test.setPlayer(q);G.Game._test.collect({kind:'item',value:'leftovers'},q);assert.equal(q.item,'leftovers');assert.equal(q.xp,0);
});
test('a final-form stone blocks items throughout the run but energy and Mega unlock only after evolution',()=>{
  const s=context(),{G}=s;
  G.Mega.grant(G.DB.save,'6-mega-x');G.Mega.equip(G.DB.save,6,'6-mega-x');
  const p=s.player(4,false);p.evolutionPath=[4,5,6];p.monStage=4;s.loadGame();G.Dev.canUse=()=>true;
  assert.ok(G.Mega.hasStone(p));assert.equal(G.Mega.eligible(p),false);
  G.Mega.tick(p,120);G.Mega.onKill(p,1);assert.equal(p.megaState.energy,0);assert.equal(p.megaState.bonus,0);
  assert.equal(G.Mega.debugCharge(p),false);p.megaState.energy=120;assert.equal(G.Mega.activate(p),false);p.megaState.energy=0;
  G.Game._test.collect({kind:'item',value:'leftovers'},p);assert.equal(p.item,null);assert.ok(p.xp>0);assert.equal(p.equip('leftovers'),false);
  p.monStage=5;G.Mega.tick(p,120);G.Mega.onKill(p,2);assert.equal(p.megaState.energy,0);
  p.monStage=6;p.mon=G.DEX_BY[6];p.spriteDex=6;assert.ok(G.Mega.eligible(p));
  G.Mega.tick(p,1);close(p.megaState.energy,1);G.Mega.tick(p,119);assert.ok(G.Mega.activate(p));
  assert.equal(p.mon.dex,6);assert.equal(p.spriteDex,'6-mega-x');assert.deepEqual(Array.from(p.mon.types),['fire','dragon']);
  G.Mega.finish(p);assert.equal(p.spriteDex,6);assert.equal(p.mon,G.DEX_BY[6]);assert.equal(p.dex,4);
});
test('stone selection follows the selected evolution branch and does not borrow a sibling stone',()=>{
  const s=context(),{G}=s;G.Mega.grant(G.DB.save,'282-mega');G.Mega.equip(G.DB.save,282,'282-mega');
  const gardevoir=new G.Player(G.DEX_BY[280],{},false,282),gallade=new G.Player(G.DEX_BY[280],{},false,475);
  assert.ok(G.Mega.hasStone(gardevoir));assert.equal(G.Mega.hasStone(gallade),false);
  G.Mega.grant(G.DB.save,'475-mega');G.Mega.equip(G.DB.save,475,'475-mega');
  const ready=new G.Player(G.DEX_BY[280],{},false,475);assert.equal(ready.megaState.id,'475-mega');assert.equal(G.Mega.eligible(ready),false);
});
test('co-op recognizes a stone before activation and converts a peer item into shared XP once',()=>{
  const s=context(),{G}=s;let receive;G.Net={uid:'host',on:f=>receive=f,onPeer:noop};G.startMoveOf=()=> 'ember';s.load('js/net/coop.js');
  const p=s.player(65,false);s.loadGame();G.Coop.begin({host:'host',members:[{uid:'host',dex:65,name:'Host'},{uid:'peer',dex:6,name:'Peer'}]},p,{});
  const a=[0,0,0,0,100,100,0,'ember',1,78,0,1,0,0,0,null,null,0,'6-mega-x'];receive('peer',{k:'f',p:a,ev:[]});
  const mate=G.Coop.mate('peer');assert.ok(G.Mega.hasStone(mate.pl));assert.equal(G.Mega.active(mate.pl),false);
  const expected=G.Mega.itemXp(p)*G.Coop.xpFactor();G.Game._test.collect({id:900,kind:'item',value:'leftovers'},mate.pl);
  close(p.xp,expected);assert.equal(mate.q.filter(e=>e[0]==='ix').length,1);assert.equal(mate.q.filter(e=>e[0]==='item').length,0);assert.equal(p.item,null);
});
test('real HUD hides ordinary equipment for stone users and keeps the Mega and move buttons separate at mobile and desktop widths',()=>{
  const s=context(),{G}=s,p=s.player();p.item='leftovers';p.slots=['ember','ice-beam','tackle','hail'].map(id=>[G.Moves.instance(id)]);
  const icons=[],buttons=[];G.Touch={active:false,clearButtons:()=>{buttons.length=0;},addButton:(x,y,w,h,fn)=>buttons.push({x,y,w,h,fn})};G.Icons={draw:(ctx,name)=>icons.push(name)};
  G.World.biomeName=()=> 'Forest';G.Events.drawHud=noop;G.Spawner.banner=()=>null;
  const ctx=new Proxy({measureText:txt=>({width:txt.length*5}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});s.load('js/ui/hud.js');
  for(const width of [320,758,1280]){icons.length=0;G.HUD.draw(ctx,width,720,p,{time:100});assert.ok(icons.includes('megaStone'));assert.ok(!icons.includes('leftovers'));assert.equal(buttons.length,5);
    assert.ok(buttons[0].x>=0);assert.ok(buttons[0].x+buttons[0].w<buttons[1].x);assert.ok(buttons[4].x+buttons[4].w<=width);
  }
  p.megaState.id=null;icons.length=0;G.HUD.draw(ctx,758,720,p,{time:100});assert.ok(icons.includes('leftovers'));assert.ok(!icons.includes('megaStone'));
});
