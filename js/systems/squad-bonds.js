/* Run-only class counts and stacks. Physical kinds retain their original cast logic. */
G.SquadBonds=(()=>{
  const GROUPS={projectile:'projectile',boomerang:'projectile',cone:'projectile',melee:'melee',dash:'melee',beam:'beam',chain:'chain',meteor:'area',trail:'area',area:'area',buff:'buff',nova:'bloom',aura:'bloom',bloom:'bloom',orbit:'orbit',mine:'summon',turret:'summon',summon:'summon'};
  const KINDS=['projectile','melee','beam','chain','area','bloom','orbit','summon'],ALL_KINDS=[...KINDS,'buff'];
  const group=id=>GROUPS[id]||id,cfg=()=>G.EconomyConfig.classBonds;
  const L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
  function label(id){return ({projectile:L('Proyectil','Projectile','投射物'),melee:L('Cuerpo a cuerpo','Melee','近战'),beam:L('Rayo','Beam','能量柱'),chain:L('Cadena','Chain','连锁'),area:L('Ataque de área','Area strike','区域打击'),bloom:L('Floración','Bloom','绽放'),orbit:L('Órbita','Orbit','环绕'),summon:L('Invocación','Summon','召唤'),buff:L('Amplificación','Amplification','增幅')})[group(id)]||id;}
  let layers=Object.create(null),signature='',counts=new Map(),revision=0;
  const key=(category,id)=>category+':'+(category==='skill'?group(id):id);
  function reset(){layers=Object.create(null);signature='';counts=new Map();revision++;}
  function refresh(){
    const emblems=G.Expedition?.run?.emblems||{},team=G.Squad?.active?G.Squad.actors():[],next=JSON.stringify(emblems)+team.map(p=>p.mon.name+':'+p.mon.types.join(',')+':'+(G.EGG_GROUPS[p.dex]||[15]).join(',')+':'+p.moves.map(m=>group(m.kind)).join(',')).join('|');
    if(next===signature)return;signature=next;revision++;const names=new Map();
    for(const p of team){const tags={types:p.mon.types,eggs:G.EGG_GROUPS[p.dex]||[15],skill:p.moves.map(m=>group(m.kind))};
      for(const category of Object.keys(tags))for(const id of new Set(tags[category])){const k=key(category,id);if(!names.has(k))names.set(k,new Set());names.get(k).add(p.mon.name);}
    }
    counts=new Map([...names].map(([k,n])=>[k,n.size]));
    for(const [id,n]of Object.entries(emblems)){const k=key('types',id);counts.set(k,(counts.get(k)||0)+n);}
  }
  function count(category,id){return counts.get(key(category,id))||0;}
  function layer(category,id){return layers[key(category,id)]??(category==='eggs'?1:0);}
  function setLayer(category,id,n){
    const valid=category==='types'?Object.hasOwn(G.U.TYPE_NAME,id):category==='eggs'?Number.isInteger(+id)&&+id>=1&&+id<=15:category==='skill'&&ALL_KINDS.includes(group(id));
    if(!G.Squad?.active||!valid||!Number.isFinite(n)||n<0||n>10000)return false;
    n=Math.round(n*1e6)/1e6;if(layers[key(category,id)]!==n)revision++;layers[key(category,id)]=n;return true;
  }
  function addLayer(category,id,amount){return Number.isFinite(amount)&&amount>0&&setLayer(category,id,Math.min(10000,layer(category,id)+amount));}
  const scale=n=>1+.25*Math.log2(Math.max(1,n));
  function value(id,stat,n=layer('skill',id)){
    const v=cfg()[group(id)]?.[stat];if(!Array.isArray(v))return v||0;const [a,b,c]=cfg().layerNodes;
    return n<=b?v[0]+(v[1]-v[0])*(n-a)/(b-a):n<=c?v[1]+(v[2]-v[1])*(n-b)/(c-b):v[2]+(v[2]-v[1])*(n-c)/(c-b)*cfg().after500SlopeFactor;
  }
  function state(kind){kind=group(kind);const n=count('skill',kind),l=layer('skill',kind);return {kind,count:n,layers:l,tier:!KINDS.includes(kind)?0:n>=6?6:n>=3?3:0,scale:scale(l)};}
  const applies=(p,m)=>!!p?.isSquadMember&&G.Squad?.active&&G.Squad.deployed().includes(p)&&!m?.zMove;
  function stats(p,m){return applies(p,m)?state(m?.kind):{count:0,layers:0,tier:0,scale:0};}
  function crowd(p){const c=cfg().melee;return Math.min(c.maxCrowd,G.EnemyMgr.queryCircle(p.x,p.y,c.crowdRadius).filter(e=>!e.dead).length);}
  function agility(p,m){const b=stats(p,m);if(!b.tier)return 1;return 1+(b.kind==='projectile'||b.kind==='area'?value(b.kind,'agility'):b.kind==='chain'&&b.tier===6?.3*b.scale:b.kind==='melee'&&b.tier===6?crowd(p)*cfg().melee.agilityPerEnemy:0);}
  function stamina(p,m){const b=stats(p,m);return 1+(b.tier&&(b.kind==='projectile'||b.kind==='area')?value(b.kind,'stamina'):0);}
  const sustain=()=>1;
  function damage(v,kind,k){v.dmg*=k;v.bondDamageContributions=[...(v.bondDamageContributions||[]),[kind,k]];}
  function move(p,m){
    if(m.bondApplied||!applies(p,m))return m;const b=stats(p,m);if(!b.tier)return m;
    const v={...m,bondApplied:true,bondScale:b.scale,bondTier:b.tier,bondKind:b.kind};
    if(b.tier===6){v.bondPalette='class:'+b.kind;v.bondColor=cfg().visuals[b.kind][2];}
    if(b.kind==='projectile'&&b.tier===6)v.bondPierceGrowth=cfg().projectile.pierceGrowth;
    if(b.kind==='melee'){const k=1+value('melee','range');if(m.kind==='dash')v.width=(m.width||34)*k;else v.radius=m.radius*k;}
    if(b.kind==='beam'){v.radius=m.radius*(1+.35*b.scale);v.bondSustain=b.tier===6;}
    if(b.kind==='chain'){v.count=(m.count||1)+Math.max(1,Math.floor(2*b.scale));v.bondChain=b.tier===6;}
    if(b.kind==='area'&&b.tier===6){v.bondArea=true;v.bondPlacement=cfg().area.placementMultiplier;}
    if(b.kind==='bloom'){damage(v,b.kind,1+value('bloom','damage'));if(b.tier===6){const k=1+cfg().bloom.rangeBonus;if(m.radius!=null)v.radius=m.radius*k;if(m.size!=null)v.size=m.size*k;if(m.kind==='nova'){v.speed=m.speed*k;v.bondVisualScale=(m.size>=8?1.5:1)*k;}v.bondStun=cfg().bloom.stunSeconds;v.bondStunChance=cfg().bloom.stunChance;}}
    if(b.kind==='orbit'){v.radius=m.radius*(1+cfg().orbit.radiusBonus);damage(v,b.kind,1+value('orbit','damage'));v.bondLaunch=b.tier===6;}
    if(b.kind==='summon'){
      v.dur=(m.dur||(m.kind==='mine'?7:6))*(1+value('summon','life'));v.bondQuantity=1+value('summon','quantity');
      if(b.tier===6){if(m.kind==='turret'){v.bondTargets=1+cfg().summon.turretTargetsBonus;v.rate=(m.rate||.6)/cfg().summon.fireRateMultiplier;damage(v,b.kind,1+value('summon','turretDamage'));}
        else{v.radius=m.radius*(1+cfg().summon.mineRadiusBonus);damage(v,b.kind,1+value('summon','mineDamage'));v.bondStun=cfg().summon.mineStunSeconds;v.bondStunChance=1;}}
    }
    return v;
  }
  function afterHit(p,e,m,dealt){
    if(!(dealt>0)||!applies(p,m))return;
    if(group(m.kind)==='melee'&&stats(p,m).tier===6)p.heal(dealt*crowd(p)*cfg().melee.lifestealPerEnemy);
    if(m.bondStun&&!e.dead&&Math.random()<(m.bondStunChance??1)){e.classStunT=Math.max(e.classStunT||0,m.bondStun*(e.boss?cfg().bossStunFactor:1));G.FX.ring(e.x,e.y,e.r,e.r+8,m.bondColor||'#fff',.18,2);}
  }
  function onPierce(p){
    if(!(p.pierce>0)||!p.bondPierceGrowth||p.zMove)return;
    const k=1+p.bondPierceGrowth,c=cfg().projectile;
    p.bondBaseR??=p.r;p.bondBaseScale??=p.visualScale||(p.r>=8?1.5:1);
    p.bondSizeGrowth=Math.min(c.maxSizeMultiplier,(p.bondSizeGrowth||1)*k);
    p.r=Math.min(c.maxRadius,p.bondBaseR*p.bondSizeGrowth);p.visualScale=p.bondBaseScale*p.r/p.bondBaseR;
    // Keep damage growing independently of the size cap; leave headroom for later multipliers.
    const before=p.dmg;p.dmg=Math.min(Number.MAX_VALUE/1e12,p.dmg*k);const damageK=before>0?p.dmg/before:1;
    const factors=[...(p.bondDamageContributions||[])],i=factors.findIndex(([id])=>id==='projectile');
    if(i>=0)factors[i]=['projectile',factors[i][1]*damageK];else factors.push(['projectile',damageK]);p.bondDamageContributions=factors;
  }
  function description(kind){
    const note=L(' Valores a 0/200/500 capas; después crecen a media pendiente.',' Values at 0/200/500 stacks; growth continues at half slope afterward.','数值对应0/200/500层；500层后按末段一半增速继续成长。');
    return ({
      projectile:L('3: agilidad y aguante +50/100/150%. 6: cada perforación multiplica tamaño y daño por 1,2 (tamaño: máximo ×6, radio 128).','3: agility and stamina +50/100/150%. 6: each penetration multiplies size and damage by 1.2 (size capped at ×6, radius 128).','3：结算敏捷、耐力+50/100/150%。6：每次穿透后体积与伤害×1.2，尺寸最多初始6倍、半径上限128，伤害继续成长。')+note,
      melee:L('3: alcance +50/100/150%. 6: cada enemigo a 180 aporta 10% agilidad y 2% robo de vida, máximo 10.','3: splash range +50/100/150%. 6: each enemy within 180 grants 10% agility and 2% lifesteal, up to 10.','3：溅射范围+50/100/150%。6：180范围内每名敌人提供10%敏捷、2%吸血，最多计10名。')+note,
      beam:L('3: rayos más largos. 6: canaliza con PP.','3: longer beams. 6: channel by spending PP.','3：能量柱更长。6：持续消耗PP维持光柱。'),
      chain:L('3: más saltos. 6: saltos retardados, breve pausa y más agilidad.','3: more jumps. 6: delayed jumps, a brief stagger and more agility.','3：连锁数量提高。6：敏捷提高，延迟连锁使目标短暂停顿，可同时释放新连锁。'),
      area:L('3: agilidad y aguante +80/150/250%. 6: aviso más largo, área crece hasta ×3 y colocación ×2.','3: agility and stamina +80/150/250%. 6: longer windup, splash grows to ×3, placement range ×2.','3：结算敏捷、耐力+80/150/250%。6：陨石前摇×2，轨迹预警1秒；范围逐渐增至3倍，落点范围×2。')+note,
      bloom:L('3: daño +20/100/150%. 6: alcance +200%, 25% de aturdir 1 s (jefes: 0,5 s).','3: damage +20/100/150%. 6: splash range +200%, 25% chance to stun for 1 s (Bosses: 0.5 s).','3：伤害+20/100/150%。6：溅射范围+200%，25%概率眩晕1秒，BOSS减半。')+note,
      orbit:L('3: radio +100%, daño +50/100/150%. 6: cada recarga repone un anillo; apunta a 420 y dispara recto, atraviesa terreno e impacta al primer enemigo al ×3 de daño de órbita.','3: orbit radius +100%, damage +50/100/150%. 6: each cooldown refills a full ring; aims within 420 and fires straight through terrain, hitting the first enemy for ×3 orbit damage.','3：环绕半径+100%，伤害+50/100/150%。6：每次冷却结束补满一圈；420范围瞄准后直线发射，无视地形、0穿透，首个命中敌人受到3倍环绕伤害，不享受投射物职业加成。')+note,
      summon:L('3: duración +50/100/150%, límite +100/200/300%. 6: torreta +2 blancos, cadencia ×3 y daño +20/50/100%; mina radio ×3, daño +100/200/300% y aturde 2 s (jefes: 1 s).','3: lifetime +50/100/150%, capacity +100/200/300%. 6: turrets +2 targets, fire rate ×3, damage +20/50/100%; mines radius ×3, damage +100/200/300%, stun 2 s (Bosses: 1 s).','3：持续时间+50/100/150%，数量上限+100/200/300%。6：炮台目标+2、射速×3、伤害+20/50/100%；地雷范围×3、伤害+100/200/300%，眩晕2秒，BOSS减半。')+note
    })[group(kind)]||L('Amplificación: sin efecto activo todavía.','Amplification: no active bond effect yet.','增幅：暂不激活羁绊效果。');
  }
  return {KINDS,ALL_KINDS,group,label,reset,refresh,count,layer,setLayer,addLayer,state,stats,scale,value,crowd,agility,stamina,sustain,move,afterHit,onPierce,description,palette:id=>cfg().visuals[id.replace('class:','')],get revision(){return revision;}};
})();
