/* Base-stat support moves and missing-HP regeneration; no player saves. */
const test=require('node:test'),assert=require('node:assert/strict');
const {context}=require('./battle_fixture.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),noop=()=>{};
function setup(){
  const s=context('zh',false),{G}=s;
  G.VFX={forMove:()=>({pal:'normal'}),forType:()=>({})};G.Input={axis:()=>[0,0]};G.Sprites.preload=noop;
  Object.assign(G.World,{propsInCircle:()=>[],projectileBlock:()=>null,damageProp:noop,nearestBreakable:()=>null});
  for(const f of ['js/entities/projectile.js','js/systems/move-pp.js','js/systems/combat.js','js/systems/player-stats.js'])s.load(f);
  s.cast=(p,id,lvl=1)=>{const m=G.Moves.instance(id,lvl);p.moves=[m];p.slots=[[m]];p.active=0;G.Combat.tick(0,p,0);return m;};
  return s;
}

test('Swords Dance and Dragon Dance add IV-adjusted base attack, independent of berries and permanent growth',()=>{
  for(const id of ['swords-dance','dragon-dance'])for(const growth of [0,.8,3]){
    const s=setup(),{G}=s,p=new G.Player(G.DEX_BY[150],{statGrowth:{atk:growth,spa:growth/2}});
    const atk=p.atk,spa=p.spa,m=s.cast(p,id);
    close(p.atk-atk,p.baseAtk*m.amount);close(p.spa-spa,p.baseSpa*m.amount);
    p.growStat('atk',.1);close(p.atk,p.baseAtk*(1+growth+.1+m.amount));
  }
});

test('generic attack bonuses and damage remain separate from natural stat growth',()=>{
  const s=setup(),p=s.player(150);p.atkMul=1.4;p.growStat('atk',.8);p.growStat('spa',.4);
  const m=s.cast(p,'swords-dance');close(p.atk,p.baseAtk*(1.8+m.amount)*1.4);close(p.spa,p.baseSpa*(1.4+m.amount)*1.4);
  close(p.attackFor({damageClass:'physical'}),p.atk);close(p.attackFor({damageClass:'special'}),p.spa);
});

test('Agility raises only base Speed, sharing the additive natural stat layer',()=>{
  const s=setup(),p=s.player(6);p.growStat('spd',.7);p.spdMul=1.3;const speed=p.spd,agility=p.agility,cd=p.agilityCooldown;
  const m=s.cast(p,'agility');close(p.spd-speed,p.baseSpd*m.amount*1.3);close(p.agility,agility);close(p.agilityCooldown,cd);
  p.slowT=2;close(p.spd,p.baseSpd*(1.7+m.amount)*1.3*.5);
});

test('Harden strengthens both base defenses without changing generic reduction or pure damage',()=>{
  const s=setup(),{G}=s,p=s.player(150);p.growStat('defense',.4);p.growStat('spdef',.8);p.dmgReduce=.2;
  const m=s.cast(p,'harden');close(p.defenseFor({kind:'contact'}),p.baseDefense*(1.4+m.amount));close(p.defenseFor({kind:'beam'}),p.baseSpDef*(1.8+m.amount));close(p.reduction,.2);
  p.maxHp=p.hp=10000;for(const kind of ['contact','projectile']){p.invuln=0;const before=p.hp;p.hurt(100,null,false,{kind});close(before-p.hp,100/p.defenseFor({kind})*.8);}
  p.invuln=0;let before=p.hp;p.hurt(100,null,true,{kind:'contact'});close(before-p.hp,100);
  for(let i=0;i<10;i++)p.addBuff('def',m.amount,m.dur,m.stacks);close(p.reduction,.2);
});

test('normal buffs retain their level ladders, refresh together, expire and keep the shared attack pool',()=>{
  const s=setup(),{G}=s,p=s.player(6),m=s.cast(p,'swords-dance',5);
  for(let i=0;i<20;i++)p.addBuff(m.stat,m.amount,m.dur,m.stacks);assert.equal(p.buffs.atk.n,7);close(p.buffFraction('atk'),1.7836);close(p.buffs.atk.t,10.5);
  p.update(.5);close(p.buffs.atk.t,10);p.addBuff(m.stat,m.amount,m.dur,m.stacks);close(p.buffs.atk.t,10.5);
  const d=G.Moves.instance('dragon-dance');p.addBuff(d.stat,d.amount,d.dur,d.stacks);assert.equal(p.buffs.atk.n,5);close(p.buffFraction('atk'),.55);
  p.buffs.atk.t=.1;p.update(.1);assert.equal(p.buffs.atk.n,0);close(p.atk,p.baseAtk);
});

test('Clear Body, Mega effective stacks and specialization power preserve base-stat scaling',()=>{
  const s=setup(),{G}=s,p=s.player(6,'clearbody');p.growStat('atk',2);const m=s.cast(p,'swords-dance',5);close(p.buffs.atk.t,15.75);
  G.Mega={buffStacks:(p,n)=>n*2};close(p.atk,p.baseAtk*(3+m.amount*2));
  const v=G.Specialization.move(p,{...m,specializations:['n7']});p.addBuff(v.stat,v.amount,v.dur,v.stacks);close(p.buffFraction('atk'),4*m.amount*1.15);
});

test('base-stat effects survive evolution and use the evolved IV-adjusted bases',()=>{
  const s=setup(),{G}=s,p=s.player(4);p.evolutionPath=[4,5,6];p.monStage=4;p.growStat('atk',.5);p.growStat('defense',.3);
  const a=G.Moves.instance('swords-dance'),d=G.Moves.instance('harden');p.addBuff(a.stat,a.amount,a.dur,a.stacks);p.addBuff(d.stat,d.amount,d.dur,d.stacks);
  p.level=25;assert.ok(G.MonProgression.evolve(p,{dex:5}));assert.ok(G.MonProgression.evolve(p,{dex:6}));assert.equal(p.monStage,6);close(p.atk,p.baseAtk*(1.5+a.amount));close(p.defenseFor({kind:'contact'}),p.baseDefense*(1.3+d.amount));
});

test('Aqua Ring restores a percentage of missing HP rather than flat HP or maximum HP',()=>{
  const s=setup(),p=s.player(6);p.maxHp=1000;p.hp=400;const m=s.cast(p,'aqua-ring');close(m.amount,.016);close(p.regen,600*.016);
  p.hp=700;close(p.regen,300*.016);p.hp=1000;close(p.regen,0);p.regenerate(1);close(p.hp,1000);
  p.maxHp=2000;p.hp=1400;close(p.regen,600*.016);
});

test('Aqua Ring max-level and Mega stacks scale its missing-HP percentage',()=>{
  const s=setup(),{G}=s,p=s.player(6);p.maxHp=1000;p.hp=500;const m=s.cast(p,'aqua-ring',5);
  for(let i=0;i<10;i++)p.addBuff(m.stat,m.amount,m.dur,m.stacks);assert.equal(p.buffs.regen.n,6);close(p.missingHpRegen,.18816);close(p.regen,94.08);
  G.Mega={buffStacks:(p,n)=>n*2};close(p.missingHpRegen,.37632);close(p.regen,188.16);
});

test('missing-HP recovery is frame-rate independent, works beside flat regen and never overflows',()=>{
  const s=setup(),p=s.player(6);p.maxHp=1000;p.hp=300;p.regenFlat=5;s.cast(p,'aqua-ring');
  const expected=1000-((700+5/.016)*Math.exp(-.016*3)-5/.016);p.regenerate(3);close(p.hp,expected);
  p.hp=300;for(let i=0;i<180;i++)p.regenerate(1/60);close(p.hp,expected);
  p.regenerate(10000);close(p.hp,p.maxHp);p.hp=300;p.dead=true;p.regenerate(100);close(p.hp,300);
  p.dead=false;p.buffs.regen.n=0;p.regenerate(2);close(p.hp,310);p.regenerate(-1);close(p.hp,310);
});

test('the real player tick applies Aqua Ring and removes its recovery on expiration',()=>{
  const s=setup(),p=s.player(6);p.maxHp=1000;p.hp=500;s.cast(p,'aqua-ring');p.update(.1);close(p.hp,1000-500*Math.exp(-.016*.1));
  p.buffs.regen.t=.01;const hp=p.hp;p.update(.02);close(p.hp,hp);close(p.regen,0);
});

test('backpack attributes reconcile flat base skill gains and both defensive combat values',()=>{
  const s=setup(),{G}=s,p=new G.Player(G.DEX_BY[150],{statGrowth:{atk:.5,spa:.2,defense:.4,spdef:.1,spd:.3}});
  for(const id of ['swords-dance','harden','agility']){const m=G.Moves.instance(id);p.addBuff(m.stat,m.amount,m.dur,m.stacks);}
  const rows=G.PlayerStats.rows(p);
  for(const r of rows){close(r.total,r.base+r.permanent+r.fruit+r.skills+r.other);if(['atk','spa','defense','spdef','spd'].includes(r.key)){const stat=r.key==='spd'?'spd':['atk','spa'].includes(r.key)?'atk':'def';close(r.skills,r.base*p.buffFraction(stat));}}
});

test('new move descriptions and percentage labels exist in all supported languages',()=>{
  for(const lang of ['zh','en','es']){const {G}=context(lang,false);for(const id of ['swords-dance','dragon-dance','agility','harden','aqua-ring']){const desc=G.Moves.BY_ID[id].desc,translated=G.T(desc);assert.ok(translated.length>8);if(lang!=='es')assert.notEqual(translated,desc);}for(const label of ['Aumento del valor natural','Vida perdida recuperada por segundo'])if(lang!=='es')assert.notEqual(G.T(label),label);}
});
