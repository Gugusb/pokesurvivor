const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {G,fresh,sanitize}=require('../server/domain.cjs'),{context}=require('./battle_fixture.cjs');
test('hundred pulls pay once and preserve each ten-pull guarantee in both banners',()=>{
 const s=context(),g=s.G,save=g.DB.save;save.tickets={t1:100,t10:10};save.abilityGems=100;
 for(const [system,use]of [[g.Gacha,'t1'],[g.Gacha,'t10'],[g.AbilityGacha,undefined]]){
  const results=system.pull(save,100,1,use);assert.equal(results.length,100);
  for(let i=0;i<100;i+=10)assert.ok(results.slice(i,i+10).some(x=>x.rarity>=4));
 }
 assert.equal(save.tickets.t1,0);assert.equal(save.tickets.t10,0);assert.equal(save.abilityGems,0);assert.equal(save.stats.abilityPulls,100);
 assert.equal(g.Gacha.pull(save,100),null);assert.equal(g.AbilityGacha.pull(save,100),null);assert.equal(g.Gacha.costOf(save,99),null);
});
test('owned packs consume a token instead of coins and remain atomic across pending choices',()=>{
 const s=fresh('Owned');s.coins=0;assert.equal(G.CardPacks.grantToken(s,'beginner',2),true);
 const before=G.CardPacks.remaining(s),p=G.CardPacks.draw(s,()=>0,'beginner',true);assert.equal(p.token,true);assert.equal(s.cardPack.tokens.beginner,1);assert.equal(s.coins,0);
 assert.equal(G.CardPacks.draw(s,()=>0,'beginner',true).seq,p.seq);assert.equal(s.cardPack.tokens.beginner,1);G.CardPacks.choose(s,p.seq,0);assert.equal(G.CardPacks.remaining(s),before-1);
 G.CardPacks.draw(s,()=>0,'beginner',true);assert.equal(s.cardPack.tokens.beginner,0);assert.equal(s.coins,0);
 const forged=JSON.parse(JSON.stringify(s));forged.cardPack.tokens.beginner=1e6;forged.cardPack.taken['speed:3']=1;const clean=sanitize(forged,s);assert.equal(clean.cardPack.tokens.beginner,0);assert.equal(clean.cardPack.taken['speed:3'],0);
});
test('speed permissions are finite account cards in their specified packs',()=>{
 const s=fresh('Speeds');assert.deepEqual(Array.from(G.CardPacks.allowedSpeeds(s)),[1]);
 for(const [speed,pack]of [[1.5,'beginner'],[2,'beginner'],[3,'breakthrough']]){const c=G.CardPacks.BY['speed:'+speed];assert.equal(c.max,1);assert.ok(G.CardPacks.packBy[pack].cards.includes(c));s.cardPack.taken[c.id]=1;assert.equal(G.CardPacks.speedAllowed(s,speed),true);}
 assert.deepEqual(Array.from(G.CardPacks.allowedSpeeds(s)),[1,1.5,2,3]);assert.equal(G.CardPacks.speedAllowed(s,4),false);
 assert.equal(G.CardPacks.rollBoss(false,()=>.1),null);assert.equal(G.CardPacks.rollBoss(true,()=>.19),'beginner');let rolls=[.09,.9];assert.equal(G.CardPacks.rollBoss(false,()=>rolls.shift()),'breakthrough');
});
test('typed waves keep their chosen type and retain the untyped remainder',()=>{
 const s=context(),g=s.G;g.Events.bag=()=>null;g.Difficulty={current:4};s.load('js/data/enemies.js');g.Enemies.rollRun();
 for(const t of [0,240,900,1800])for(const type of g.Enemies.waveTypes(t)){const pool=g.Enemies.typeWave(type,t);assert.ok(pool.same.length);assert.ok(pool.other.length);assert.ok(pool.same.every(d=>g.DEX_BY[d.dex].types.includes(type)));assert.ok(pool.other.every(d=>!g.DEX_BY[d.dex].types.includes(type)));}
 const src=fs.readFileSync(path.join(__dirname,'../js/systems/spawner.js'),'utf8').replace('return {','return {_test:{formation,spawnOne},');vm.runInContext(src,s);
 let seed=123456;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);s.Math.random=rng;let typed=0;for(let i=0;i<2000;i++)if(g.Spawner._test.formation(600))typed++;assert.ok(typed>920&&typed<1080,typed);
 // Isolate the 85% selection branch while using the real spawn path.
 const defs={same:[{dex:1}],other:[{dex:4}]};g.Enemies.scale=()=>({});g.Enemy=class {constructor(def){this.dex=def.dex;}};g.EnemyMgr.add=()=>{};g.EnemyMgr.count=0;g.World.isFree=()=>true;g.Sprites.hasShiny=()=>false;g.Difficulty.eliteChance=()=>0;g.Camera.outerRadius=()=>100;g.Coop.scaleHp=()=>1;
 let same=0;for(let i=0;i<3000;i++){const e=g.Spawner._test.spawnOne({x:0,y:0},600,0,defs);if(e?.dex===1)same++;}assert.ok(same>2450&&same<2650,same);
});
test('enemy color preference changes drawing only and never recolors friendly projectiles',()=>{
 const s=context(),g=s.G;let red=false;g.Settings={get:k=>k==='hostileRed'&&red};s.load('js/entities/projectile.js');const palettes=[];g.VFX={forType:()=>({proj:'bolt',pal:'water'}),isDir:()=>false,spins:()=>false,draw:(ctx,shape,pal)=>palettes.push(pal)};
 const p={friendly:false,vis:{proj:'bolt',pal:'water'},life:5,t:1,r:5,x:0,y:0};g.Projectiles.drawSprite({},p);red=true;g.Projectiles.drawSprite({},p);g.Projectiles.drawSprite({},{...p,friendly:true});assert.deepEqual(palettes,['water','hostileRed','water']);assert.equal(p.vis.pal,'water');
 s.load('js/systems/hazards.js');const h=g.Hazards.add({kind:'zone',x:0,y:0,r:40,delay:1,type:'water',color:'#abcdef'},true),colors=[];const ctx=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>{if(k==='fillStyle'||k==='strokeStyle')colors.push(v);o[k]=v;return true;}});g.Hazards.draw(ctx);assert.ok(colors.every(c=>c==='#ff3048'));assert.equal(h.color,'#abcdef');assert.equal(h.type,'water');
});
test('hurt feedback triggers only for real local attacks, not blocked hits or other players',()=>{
 const s=context(),g=s.G,p=s.player(4);g.Game.player=p;let stops=0,shakes=0;g.Game.hitStop=()=>stops++;g.Camera.kick=()=>shakes++;
 p.hurt(1,null,true,{kind:'contact'});assert.equal(stops,1);p.hurt(1,null,true,{kind:'contact'});assert.equal(stops,1);p.invuln=0;p.hurt(1,null,true,{kind:'weather'});assert.equal(stops,1);assert.equal(shakes,2);
 g.Game.player={};p.invuln=0;p.hurt(1,null,true,{kind:'contact'});assert.equal(stops,1);assert.equal(shakes,2);
});
