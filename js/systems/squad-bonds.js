/* Run-only class counts and stacks. Physical kinds retain their original cast logic. */
G.SquadBonds=(()=>{
  const GROUPS={projectile:'projectile',boomerang:'projectile',cone:'projectile',melee:'melee',dash:'melee',beam:'beam',chain:'chain',meteor:'area',trail:'area',area:'area',buff:'buff',nova:'bloom',aura:'bloom',bloom:'bloom',orbit:'orbit',mine:'summon',turret:'summon',summon:'summon'};
  const KINDS=['projectile','melee','beam','chain','area','bloom','orbit','summon','buff'],ALL_KINDS=[...KINDS];
  const group=id=>GROUPS[id]||id,cfg=()=>G.EconomyConfig.classBonds;
  const L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
  function label(id){return ({projectile:L('Proyectil','Projectile','投射物'),melee:L('Cuerpo a cuerpo','Melee','近战'),beam:L('Rayo','Beam','能量柱'),chain:L('Cadena','Chain','连锁'),area:L('Ataque de área','Area strike','区域打击'),bloom:L('Floración','Bloom','绽放'),orbit:L('Órbita','Orbit','环绕'),summon:L('Invocación','Summon','召唤'),buff:L('Apoyo','Support','辅助')})[group(id)]||id;}
  let layers=Object.create(null),signature='',counts=new Map(),revision=0;
  const key=(category,id)=>category+':'+(category==='skill'?group(id):id);
  function reset(){layers=Object.create(null);signature='';counts=new Map();revision++;}
  function refresh(){
    const emblems=G.Expedition?.run?.emblems||{},team=G.Squad?.active?G.Squad.actors():[],next=JSON.stringify(emblems)+String(G.TrainerTalents?.sum('captainOmniTag')||0)+team.map(p=>p.mon.name+':'+p.mon.types.join(',')+':'+(G.EGG_GROUPS[p.dex]||[15]).join(',')+':'+p.moves.map(m=>group(m.kind)).join(',')).join('|');
    if(next===signature)return;signature=next;revision++;const names=new Map();
    for(const p of team){const tags={types:p.mon.types,eggs:G.EGG_GROUPS[p.dex]||[15],skill:p.moves.map(m=>group(m.kind))};
      for(const category of Object.keys(tags))for(const id of new Set(tags[category])){const k=key(category,id);if(!names.has(k))names.set(k,new Set());names.get(k).add(p.mon.name);}
    }
    counts=new Map([...names].map(([k,n])=>[k,n.size]));
    for(const [id,n]of Object.entries(emblems)){const k=key('types',id);counts.set(k,(counts.get(k)||0)+n);}
    const omni=G.TrainerTalents?.sum('captainOmniTag')||0;if(omni)for(const [k,n]of counts)if(n>0)counts.set(k,n+omni);
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
  function state(kind){kind=group(kind);const n=count('skill',kind),l=layer('skill',kind);return {kind,count:n,layers:l,tier:!KINDS.includes(kind)?0:n>=(kind==='buff'?cfg().buff.thresholds[1]:cfg().thresholds[1])?(kind==='buff'?5:7):n>=3?3:0,scale:scale(l)};}
  const applies=(p,m)=>!!p?.isSquadMember&&G.Squad?.active&&G.Squad.deployed().includes(p)&&!m?.zMove;
  function stats(p,m){return applies(p,m)?state(m?.kind):{count:0,layers:0,tier:0,scale:0};}
  function crowd(p){const c=cfg().melee;return Math.min(c.maxCrowd,G.EnemyMgr.queryCircle(p.x,p.y,c.crowdRadius).filter(e=>!e.dead).length);}
  function agility(p,m){const b=stats(p,m);if(!b.tier)return 1;return 1+(b.kind==='projectile'||b.kind==='area'?value(b.kind,'agility'):b.kind==='chain'&&b.tier===7?.3*b.scale:b.kind==='melee'&&b.tier===7?crowd(p)*cfg().melee.agilityPerEnemy:0);}
  function stamina(p,m){const b=stats(p,m);return 1+(b.tier&&(b.kind==='projectile'||b.kind==='area')?value(b.kind,'stamina'):0);}
  const sustain=()=>1;
  function damage(v,kind,k){v.dmg*=k;v.bondDamageContributions=[...(v.bondDamageContributions||[]),[kind,k]];}
  function move(p,m){
    if(m.bondApplied||!applies(p,m))return m;const b=stats(p,m);if(!b.tier||b.kind==='buff')return m;
    const v={...m,bondApplied:true,bondScale:b.scale,bondTier:b.tier,bondKind:b.kind};
    if(b.tier===7){v.bondPalette='class:'+b.kind;v.bondColor=cfg().visuals[b.kind][2];}
    if(b.kind==='projectile'&&b.tier===7)v.bondPierceGrowth=cfg().projectile.pierceGrowth;
    if(b.kind==='melee'){const k=1+value('melee','range');if(m.kind==='dash')v.width=(m.width||34)*k;else v.radius=m.radius*k;}
    if(b.kind==='beam'){v.radius=m.radius*(1+.35*b.scale);v.bondSustain=b.tier===7;}
    if(b.kind==='chain'){v.count=(m.count||1)+Math.max(1,Math.floor(2*b.scale));v.bondChain=b.tier===7;}
    if(b.kind==='area'&&b.tier===7){v.bondArea=true;v.bondPlacement=cfg().area.placementMultiplier;}
    if(b.kind==='bloom'){damage(v,b.kind,1+value('bloom','damage'));if(b.tier===7){const k=1+cfg().bloom.rangeBonus;if(m.radius!=null)v.radius=m.radius*k;if(m.size!=null)v.size=m.size*k;if(m.kind==='nova'){v.speed=m.speed*k;v.bondVisualScale=(m.size>=8?1.5:1)*k;}v.bondStun=cfg().bloom.stunSeconds;v.bondStunChance=cfg().bloom.stunChance;}}
    if(b.kind==='orbit'){v.radius=m.radius*(1+cfg().orbit.radiusBonus);damage(v,b.kind,1+value('orbit','damage'));v.bondLaunch=b.tier===7;}
    if(b.kind==='summon'){
      v.dur=(m.dur||(m.kind==='mine'?7:6))*(1+value('summon','life'));v.bondQuantity=1+value('summon','quantity');
      if(b.tier===7){if(m.kind==='turret'){v.bondTargets=1+cfg().summon.turretTargetsBonus;v.rate=(m.rate||.6)/cfg().summon.fireRateMultiplier;damage(v,b.kind,1+value('summon','turretDamage'));}
        else{v.radius=m.radius*(1+cfg().summon.mineRadiusBonus);damage(v,b.kind,1+value('summon','mineDamage'));v.bondStun=cfg().summon.mineStunSeconds;v.bondStunChance=1;}}
    }
    return v;
  }
  function afterHit(p,e,m,dealt){
    if(!(dealt>0)||!applies(p,m))return;
    if(group(m.kind)==='melee'&&stats(p,m).tier===7)p.heal(dealt*crowd(p)*cfg().melee.lifestealPerEnemy);
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
    const b=state(kind),k=b.kind,c=cfg(),sep=G.I18n.lang==='zh'?'。':'. ',pct=n=>Number((n*100).toFixed(2))+'%',num=n=>Number(n.toFixed(2));
    if(k==='buff')return L('3 aliados: reducción de daño del equipo ','3 allies: squad damage reduction ','3人激活：全队减伤 ')+pct(value('buff','reduction'))+sep+L('5 aliados: cada apoyo gana una venda cada 5s; cura al aliado con menos del 50% de vida por el 10% de la vida máxima total de apoyos.','5 allies: each support gains a bandage every 5s; heal an ally below half HP for 10% of support total max HP.','5人激活：辅助队员每5秒获得绷带；友方生命低于50%时，消耗绷带治疗辅助队员最大生命总和的10%。');
    if(!KINDS.includes(k))return L('Sin efecto activo todavía.','No active effect yet.','暂不激活羁绊效果。');
    if(!b.tier)return L('Se activa con 3 especies.','Activates with 3 species.','3名不同宝可梦激活。');
    const base={
      projectile:()=>L('Agilidad +','Agility +','结算敏捷+')+pct(value(k,'agility'))+L(', aguante +',', stamina +','，结算耐力+')+pct(value(k,'stamina')),
      melee:()=>L('Alcance de impacto +','Splash range +','溅射范围+')+pct(value(k,'range')),
      beam:()=>L('Longitud del rayo +','Beam length +','能量柱长度+')+pct(.35*b.scale),
      chain:()=>L('Saltos adicionales +','Additional jumps +','连锁数量+')+Math.max(1,Math.floor(2*b.scale)),
      area:()=>L('Agilidad +','Agility +','结算敏捷+')+pct(value(k,'agility'))+L(', aguante +',', stamina +','，结算耐力+')+pct(value(k,'stamina')),
      bloom:()=>L('Daño +','Damage +','技能伤害+')+pct(value(k,'damage')),
      orbit:()=>L('Radio +','Orbit radius +','环绕半径+')+pct(c.orbit.radiusBonus)+L(', daño +',', damage +','，伤害+')+pct(value(k,'damage')),
      summon:()=>L('Duración +','Lifetime +','持续时间+')+pct(value(k,'life'))+L(', límite +',', capacity +','，数量上限+')+pct(value(k,'quantity'))
    }[k]();
    if(b.tier<7)return base+sep+L('El segundo efecto requiere 7 especies.','The second effect requires 7 species.','7名不同宝可梦解锁二级效果。');
    const extra={
      projectile:()=>L('Tras perforar: tamaño y daño +','After penetration: size and damage +','每次穿透后体积与伤害+')+pct(c.projectile.pierceGrowth),
      melee:()=>L('Cada enemigo cercano: agilidad +','Per nearby enemy: agility +','周围每名敌人：敏捷+')+pct(c.melee.agilityPerEnemy)+L(', robo de vida +',', lifesteal +','，吸血率+')+pct(c.melee.lifestealPerEnemy)+L('; máximo ','; up to ','；最多')+c.melee.maxCrowd+L(' enemigos.',' enemies.','名敌人。'),
      beam:()=>L('Mantén el rayo gastando PP.','Sustain the beam by spending PP.','持续消耗PP维持光柱。'),
      chain:()=>L('Agilidad +','Agility +','敏捷+')+pct(.3*b.scale)+L('; saltos retardados que detienen al blanco brevemente.','; delayed jumps briefly stagger targets.','；延迟连锁使目标短暂停顿，可同时释放新连锁。'),
      area:()=>L('Aviso ×','Windup ×','陨石前摇×')+c.area.windupMultiplier+L(', crecimiento hasta ×',', splash grows to ×','，溅射范围成长至×')+c.area.maxRadiusMultiplier+L(', colocación ×',', placement ×','，落点范围×')+c.area.placementMultiplier,
      bloom:()=>L('Alcance +','Splash range +','溅射范围+')+pct(c.bloom.rangeBonus)+L('; aturdir: ','; stun chance: ','；眩晕概率')+pct(c.bloom.stunChance)+' · '+c.bloom.stunSeconds+L(' s, jefes ',' s, Bosses ','秒，BOSS ')+num(c.bloom.stunSeconds*c.bossStunFactor)+L(' s.',' s.','秒。'),
      orbit:()=>L('Repone un anillo por recarga; busca al ','Refills a full ring each cooldown; searches within ','每次冷却补满一圈，索敌半径为环绕半径的')+pct(c.orbit.launchRangeMultiplier)+L('; dispara a través del terreno, primer impacto ×','; shoots through terrain, first hit ×','；无视地形直线发射，首个敌人受到×')+c.orbit.launchDamage+L(' de daño orbital.',' orbit damage.','环绕伤害，命中即消失。'),
      summon:()=>L('Torreta: blancos +','Turret: targets +','炮台：目标+')+c.summon.turretTargetsBonus+L(', cadencia ×',', fire rate ×','，射速×')+c.summon.fireRateMultiplier+L(', daño +',', damage +','，伤害+')+pct(value(k,'turretDamage'))+L('; mina: radio +','; mine: radius +','；地雷：范围+')+pct(c.summon.mineRadiusBonus)+L(', daño +',', damage +','，伤害+')+pct(value(k,'mineDamage'))+L(', aturde ',', stun ','，眩晕')+c.summon.mineStunSeconds+L(' s (jefes ',' s (Bosses ','秒（BOSS ')+num(c.summon.mineStunSeconds*c.bossStunFactor)+L(' s).',' s).','秒）。')
    }[k]();
    return base+'。'+extra;
  }
  function restore(saved){reset();for(const [k,n]of Object.entries(saved||{})){const i=k.indexOf(':');setLayer(k.slice(0,i),k.slice(i+1),n);}refresh();}
  return {snapshot:()=>({...layers}),restore,KINDS,ALL_KINDS,group,label,reset,refresh,count,layer,setLayer,addLayer,state,stats,scale,value,crowd,agility,stamina,sustain,move,afterHit,onPierce,description,palette:id=>cfg().visuals[id.replace('class:','')],get revision(){return revision;}};
})();
