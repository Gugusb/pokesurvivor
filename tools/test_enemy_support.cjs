const test=require('node:test'),assert=require('node:assert/strict');
const {context}=require('./battle_fixture.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(){
  const s=context(),{G}=s,p=s.player(6);p.x=p.y=0;
  s.support=(kind,x=40)=>{const e=new G.Enemy({dex:kind==='healer'?113:213,hp:100,spd:0,dmg:1,xp:1,behavior:kind,shotCd:3.5,range:230},x,0,{hp:1,spd:1,dmg:1});s.enemies.push(e);return e;};
  return s;
}
test('healers spend once per group heal and stop after three successful casts',()=>{
  const s=setup(),{G}=s,h=s.support('healer'),a=s.enemy(),b=s.enemy();a.hp=b.hp=100;
  for(let i=0;i<3;i++){const before=a.hp;assert.equal(h.healAround(),true);close(a.hp-before,a.maxHp*.07);assert.equal(h.supportUses,2-i);}
  a.hp=b.hp=1;const before=[a.hp,b.hp];for(let i=0;i<20;i++)assert.equal(h.healAround(),false);assert.deepEqual([a.hp,b.hp],before);assert.equal(h.supportUses,0);
});
test('full-health, dead and out-of-range targets do not consume healing uses; self-healing still counts',()=>{
  const s=setup(),h=s.support('healer'),a=s.enemy();assert.equal(h.healAround(),false);assert.equal(h.supportUses,3);
  a.hp=1;a.dead=true;assert.equal(h.healAround(),false);a.dead=false;a.x=1000;assert.equal(h.healAround(),false);assert.equal(h.supportUses,3);
  h.hp=50;assert.equal(h.healAround(),true);close(h.hp,57);assert.equal(h.supportUses,2);
});
test('shield grants and refreshes spend one cast, retain their old strength and expire without renewal',()=>{
  const s=setup(),{G}=s,h=s.support('shielder'),a=s.enemy();
  for(let i=0;i<3;i++){assert.equal(h.castShields(),true);close(a.shield,a.maxHp*.35);assert.equal(a.shieldT,8);assert.equal(h.supportUses,2-i);a.shieldT=1;}
  a.shield=0;a.shieldT=0;assert.equal(h.castShields(),false);assert.equal(a.shield,0);assert.equal(a.shieldT,0);
  h.shieldT=.01;h.update(.02,s.players[0]);assert.equal(h.shield,0);
});
test('shield target cap remains six; an empty cast does not spend a use',()=>{
  const s=setup(),h=s.support('shielder');s.enemies.length=0;assert.equal(h.castShields(),false);assert.equal(h.supportUses,3);
  s.enemies.push(h);for(let i=0;i<10;i++){const e=s.enemy();e.x=45+i;}
  assert.equal(h.castShields(),true);assert.equal(s.enemies.filter(e=>e.shield>0).length,6);assert.equal(h.supportUses,2);
});
test('budgets belong to each spawned support and do not refill on elite conversion or healing',()=>{
  const s=setup(),a=s.support('healer'),b=s.support('healer');a.hp=1;a.healAround();assert.equal(a.supportUses,2);assert.equal(b.supportUses,3);
  a.makeElite(false);assert.equal(a.supportUses,2);a.hp=a.maxHp;assert.equal(a.supportUses,2);assert.equal(s.support('healer').supportUses,3);
});
test('real AI keeps moving and attacking normally but never casts support again after exhaustion',()=>{
  const s=setup(),h=s.support('healer'),sh=s.support('shielder'),a=s.enemy();a.hp=1;
  for(let i=0;i<3;i++){h.shotCd=0;sh.skillCd=0;h.update(.01,s.players[0]);sh.update(.01,s.players[0]);}
  assert.equal(h.supportUses,0);assert.equal(sh.supportUses,0);a.hp=1;a.shield=a.shieldT=0;
  for(let i=0;i<400;i++){h.update(.1,s.players[0]);sh.update(.1,s.players[0]);}
  assert.equal(a.hp,1);assert.equal(a.shield,0);assert.equal(h.dead,false);assert.equal(sh.dead,false);
});
test('dead or remote copies cannot consume uses or apply support effects',()=>{
  const s=setup(),a=s.enemy();a.hp=1;
  for(const kind of ['healer','shielder'])for(const prop of ['dead','remote']){const h=s.support(kind);h[prop]=true;assert.equal(h[kind==='healer'?'healAround':'castShields'](),false);assert.equal(h.supportUses,3);}
  assert.equal(a.hp,1);assert.equal(a.shield,0);
});
test('stashing and restoring a map keeps the same support object and its spent uses',()=>{
  const s=setup(),{G}=s;s.load('js/entities/enemy.js');
  const h=new G.Enemy({dex:113,hp:100,spd:0,dmg:1,xp:1,behavior:'healer'},0,0,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(h);G.EnemyMgr.rebuildGrid();h.hp=1;h.healAround();assert.equal(h.supportUses,2);
  G.EnemyMgr.stash();assert.equal(G.EnemyMgr.all().length,0);G.EnemyMgr.restore();assert.equal(G.EnemyMgr.get(h.id),h);assert.equal(h.supportUses,2);
});
