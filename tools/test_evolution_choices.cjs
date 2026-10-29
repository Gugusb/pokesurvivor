const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.join(__dirname,'..'),noop=()=>{},close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function setup(){
  const s={G:{},console,Math:Object.create(Math),Map,Set,WeakMap,JSON,Date,performance:{now:()=>1000},addEventListener:noop};s.window=s;vm.createContext(s);
  s.load=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),s,{filename:f});
  for(const f of ['js/core/util.js','js/data/pokedex.js','js/data/evolutions.js','js/data/moves.js'])s.load(f);
  const G=s.G;G.T=x=>x;G.DB={save:{},ivOf:()=>[1,1,1]};G.Abilities={equipped:()=>null,levelChoices:()=>1};G.Projectiles={clearOrbs:noop};G.Audio={sfx:noop};G.FX={ring:noop};
  G.Sprites={Animator:class{},bodyRadius:()=>12,bodyHeight:()=>24,preload:noop};s.load('js/systems/progression-mon.js');s.load('js/systems/levelup.js');
  let seed=123456;s.Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  s.player=(dex=1,level=8)=>{const mon=G.DEX_BY[dex],stats=G.MonProgression.stats(dex);return {dex,monStage:dex,ivDex:dex,evolutionPath:G.MonProgression.pathFor(dex).slice(),level,mon,anim:{dir:3},spriteDex:dex,x:0,y:0,
    maxHp:stats.hp,hp:stats.hp,baseAtk:stats.atk,baseSpd:stats.spd,atkMul:1,spdMul:1,cdMul:1,dmgReduce:0,regenFlat:0,magnet:78,xpMul:1,statsTaken:{},moves:[],slots:[],maxMoves:0,
    addMaxHp(n){this.maxHp+=n;this.hp+=n;},heal(n){this.hp=Math.min(this.maxHp,this.hp+n);},hasMove:()=>false};};return s;
}
test('Eevee draws three distinct eligible directions, with passive attributes only, and can reach every branch',()=>{
  const s=setup(),G=s.G,p=s.player(133,7);assert.equal(G.LevelUp.evolutionOffer(p).length,0);assert.equal(G.MonProgression.evolve(p,{dex:134}),false);p.level=8;assert.equal(G.MonProgression.evolutionOptions(p).length,8);
  const seen=new Set();for(let i=0;i<50;i++){const cards=G.LevelUp.evolutionOffer(p);assert.equal(cards.length,3);assert.equal(new Set(cards.map(c=>c.evolutionDex)).size,3);for(const c of cards){seen.add(c.evolutionDex);assert.equal(c.type,'evolution');assert.equal(c.category,'stat');assert.notEqual(c.statId,'heal');assert.ok(G.MonProgression.validPath(c.evolutionPath,133));}}
  assert.equal(seen.size,8);assert.equal(p.dex,133);
});
test('single evolution gives three passive options; Kirlia displays exactly its two legal branches at level twenty-five',()=>{
  const s=setup(),G=s.G,p=s.player(1),cards=G.LevelUp.evolutionOffer(p);assert.equal(cards.length,3);assert.ok(cards.every(c=>c.evolutionDex===2));
  const r=s.player(280);assert.equal(G.MonProgression.evolve(r,{dex:281}),true);for(const level of [15,24]){r.level=level;assert.equal(G.LevelUp.evolutionOffer(r).length,0);assert.equal(G.MonProgression.evolve(r,{dex:475}),false);}r.level=25;
  assert.deepEqual(Array.from(G.LevelUp.evolutionOffer(r),c=>c.evolutionDex).sort((a,b)=>a-b),[282,475]);
  const selected=G.LevelUp.evolutionOffer(r).find(c=>c.evolutionDex===475);selected.apply(r);assert.equal(r.dex,475);assert.equal(r.spriteDex,475);assert.equal(r.evolutionPath.at(-1),475);assert.equal(G.LevelUp.evolutionOffer(r).length,0);
});
test('each evolution attribute has exactly three times the normal percentage or flat gain and advances its cap by three',()=>{
  const s=setup(),G=s.G,found=new Map();for(let i=0;i<100;i++)for(const c of G.LevelUp.evolutionOffer(s.player()))found.set(c.statId,c);assert.equal(found.size,8);
  const expected={hp:p=>close(p.maxHp,G.MonProgression.stats(2).hp+60),atk:p=>close(p.atkMul,1.3),spd:p=>close(p.spdMul,1.21),cd:p=>close(p.cdMul,.76),def:p=>close(p.dmgReduce,.18),rgn:p=>close(p.regenFlat,2.7),mag:p=>close(p.magnet,78*1.9),xp:p=>close(p.xpMul,1.36)};
  for(const [id,card]of found){const p=s.player();assert.equal(card.apply(p),true);expected[id](p);assert.equal(p.statsTaken[id],3);const after=JSON.stringify(p);assert.equal(card.apply(p),false);assert.equal(JSON.stringify(p),after);}
});
test('evolution preserves earned maximum HP and health ratio instead of erasing permanent gains',()=>{
  const s=setup(),G=s.G,p=s.player();p.addMaxHp(40);p.hp=p.maxHp*.4;const beforeAtk=p.atkMul=1.5;
  assert.equal(G.MonProgression.evolve(p,{dex:2}),true);close(p.maxHp,G.MonProgression.stats(2).hp+40);close(p.hp,p.maxHp*.4);assert.equal(p.atkMul,beforeAtk);assert.equal(p.dex,2);assert.equal(p.monStage,2);assert.equal(p.anim.dir,3);
});
test('threefold cards respect stat caps and never roll a capped reduction or an instant-healing item',()=>{
  const s=setup(),G=s.G,p=s.player();p.dmgReduce=.66;p.statsTaken={atk:40,spd:7,cd:10,mag:6,xp:8};
  for(let i=0;i<20;i++)for(const c of G.LevelUp.evolutionOffer(p))assert.ok(['hp','rgn'].includes(c.statId));
});
test('Slow Start extra ordinary choices are rolled once; the separate evolution choice never rolls it again in co-op',()=>{
  const s=setup(),G=s.G,p=s.player(133);let rolls=0,done=0;const screens=[];G.Abilities.levelChoices=()=>{rolls++;return 2;};G.LevelUp.offer=()=>[{type:'stat',apply:noop}];
  G.RunUI={showLevelUp:(level,cards,cb,coop,evolution)=>screens.push({cards,cb,coop,evolution:!!evolution})};
  let source=fs.readFileSync(path.join(ROOT,'js/game.js'),'utf8').replace('init, startRun, everyone,','_sequence(p,done,coop){pl=p;chooseLevelRewards(p.level,done,coop);}, init, startRun, everyone,');vm.runInContext(source,s);
  G.Game._sequence(p,()=>done++,true);assert.equal(screens.length,1);screens[0].cb(screens[0].cards[0]);assert.equal(screens.length,2);screens[1].cb(screens[1].cards[0]);assert.equal(screens.length,3);assert.equal(screens[2].evolution,true);assert.equal(screens[2].coop,true);assert.equal(done,0);
  const selected=screens[2].cards[0];screens[2].cb(selected);assert.equal(done,1);assert.equal(rolls,1);assert.equal(p.dex,selected.evolutionDex);assert.equal(screens.length,3);
});
