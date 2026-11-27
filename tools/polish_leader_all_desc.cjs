/* Compile and validate standardized, concise, exact-runtime-value display descriptions
 * across ALL 9 generations (508 families) into `family.display.{zh,en}.{base,active,cost,five,eight}`.
 * Preserves `source` and original `description` untouched for historical traceability & tests. */
const fs=require('node:fs');

const TYPE_ZH={normal:'一般',fire:'火',water:'水',electric:'电',grass:'草',ice:'冰',fighting:'格斗',poison:'毒',ground:'地面',flying:'飞行',psychic:'超能',bug:'虫',rock:'岩石',ghost:'幽灵',dragon:'龙',dark:'恶',steel:'钢',fairy:'妖精'};
const TYPE_EN={normal:'Normal',fire:'Fire',water:'Water',electric:'Electric',grass:'Grass',ice:'Ice',fighting:'Fighting',poison:'Poison',ground:'Ground',flying:'Flying',psychic:'Psychic',bug:'Bug',rock:'Rock',ghost:'Ghost',dragon:'Dragon',dark:'Dark',steel:'Steel',fairy:'Fairy'};
const KIND_ZH={projectile:'投射物',boomerang:'回旋',cone:'扇形',melee:'近战',dash:'位移',beam:'能量柱',chain:'连锁',meteor:'陨石',trail:'地面轨迹',buff:'属性提升',nova:'冲击波',aura:'光环',orbit:'环绕',mine:'地雷',turret:'炮台'};
const KIND_EN={projectile:'Projectile',boomerang:'Boomerang',cone:'Cone',melee:'Melee',dash:'Dash',beam:'Beam',chain:'Chain',meteor:'Meteor',trail:'Trail',buff:'Buff',nova:'Nova',aura:'Aura',orbit:'Orbit',mine:'Mine',turret:'Turret'};
const STAT_ZH={hp:'生命',atk:'物攻',spa:'特攻',defense:'物防',spdef:'特防',spd:'移速',agility:'敏捷',stamina:'耐力'};
const STAT_EN={hp:'Max HP',atk:'Attack',spa:'Sp. Atk',defense:'Defense',spdef:'Sp. Def',spd:'Speed',agility:'Agility',stamina:'Stamina'};
const WX_ZH={sun:'晴天',rain:'雨天',sand:'沙暴',snow:'降雪',fog:'浓雾'};
const WX_EN={sun:'Sun',rain:'Rain',sand:'Sand',snow:'Snow',fog:'Fog'};

const CHARGE_ZH={
 auraHit:'光环命中',coneCast:'扇形施法',beamCast:'能量柱施法',chainCast:'连锁施法',novaCast:'冲击波施法',
 meleeCrit:'近战暴击',boomerangCast:'回旋施法',heavyHurt:'队长受重击(≥20%最大生命)',dashHit:'位移命中',
 mineTrigger:'地雷触发',orbitHit:'环绕命中',kill:'队伍击杀',burnStack:'施加灼伤',bounceHit:'反弹投射物命中',
 spore:'蘑菇感染',buffCast:'属性提升施法',distance:'队长移动(每80px)',hurtAmount:'队长受伤(每5%最大生命)',
 hurtCount:'队伍受伤',dashCast:'位移施法',meleeHit:'近战命中',beamHit:'能量柱命中',meleeCast:'近战施法',
 debuffKill:'击杀破防/易伤敌人',painTick:'痛觉池扣血',pickup:'拾取经验',projectileHit:'投射物命中',
 freeze:'冻结敌人',poisonStack:'施加中毒',knock:'击退命中',stun:'定身敌人',fruitPickup:'拾取/生成补给果',
 boomerangReturn:'回旋折返命中',poisonHit:'中毒跳伤',heal:'队伍治疗(每5%最大生命)',echoHit:'回响命中',
 crit:'招式暴击',shieldBreak:'击碎护盾',intercept:'拦截弹幕',repeatMelee:'连击同一目标近战',
 coneHit:'扇形命中',electricHit:'电系招式命中',burnHit:'灼伤跳伤',absorb:'护盾/水幕/免疫吸收(每5%最大生命)',
 cast:'队伍施法',stabHit:'本系招式命中',rangedHit:'投射物/地雷命中',areaHit:'陨石/位移命中',
 iceHit:'冰系招式命中',hit:'招式命中',distinctType:'施放不同属性招式'
};
const CHARGE_EN={
 auraHit:'Aura hits',coneCast:'Cone casts',beamCast:'Beam casts',chainCast:'Chain casts',novaCast:'Nova casts',
 meleeCrit:'Melee crits',boomerangCast:'Boomerang casts',heavyHurt:'Captain heavy hits (≥20% MaxHP)',dashHit:'Dash hits',
 mineTrigger:'Mine triggers',orbitHit:'Orbit hits',kill:'Team kills',burnStack:'Burn stacks applied',bounceHit:'Ricochet hits',
 spore:'Spore infections',buffCast:'Buff casts',distance:'Captain movement (per 80px)',hurtAmount:'Captain damage taken (per 5% MaxHP)',
 hurtCount:'Team hits taken',dashCast:'Dash casts',meleeHit:'Melee hits',beamHit:'Beam hits',meleeCast:'Melee casts',
 debuffKill:'Kills on debuffed foes',painTick:'Pain-pool ticks',pickup:'XP pickups',projectileHit:'Projectile hits',
 freeze:'Freezes',poisonStack:'Poison stacks applied',knock:'Knockback hits',stun:'Stuns',fruitPickup:'Fruit drops/pickups',
 boomerangReturn:'Boomerang return hits',poisonHit:'Poison ticks',heal:'Team heals (per 5% MaxHP)',echoHit:'Echo hits',
 crit:'Crits',shieldBreak:'Shield breaks',intercept:'Shot intercepts',repeatMelee:'Consecutive melee hits on same target',
 coneHit:'Cone hits',electricHit:'Electric move hits',burnHit:'Burn ticks',absorb:'Absorbed damage (per 5% MaxHP)',
 cast:'Team casts',stabHit:'STAB hits',rangedHit:'Projectile/Mine hits',areaHit:'Meteor/Dash hits',
 iceHit:'Ice move hits',hit:'Move hits',distinctType:'Distinct move types cast'
};

const nfmt=n=>Number.isInteger(n)?String(n):String(Number(n.toFixed(2)));
const pct=v=>nfmt(Math.round(v*10000)/100)+'%';
const sPct=v=>(v>=0?'+':'')+pct(v);
const dPct=m=>sPct(m-1); // multiplier -> signed % delta (1.25 -> +25%, 0.8 -> -20%)
const typesZh=arr=>arr.map(t=>TYPE_ZH[t]||t).join('/');
const typesEn=arr=>arr.map(t=>TYPE_EN[t]||t).join('/');

function groupIncoming(obj,lang){
 const groups=new Map();
 for(const [t,v]of Object.entries(obj||{})){
  const k=dPct(v);
  if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push(lang==='zh'?(TYPE_ZH[t]||t):(TYPE_EN[t]||t));
 }
 return [...groups.entries()].map(([k,list])=>lang==='zh'?`${list.join('、')}承伤 ${k}`:`${list.join('/')} damage taken ${k}`);
}

function formatStats(stats,lang){
 const out=[];
 for(const [k,v]of Object.entries(stats||{})){
  out.push(lang==='zh'?`${STAT_ZH[k]||k} ${sPct(v)}`:`${STAT_EN[k]||k} ${sPct(v)}`);
 }
 return out.length?[lang==='zh'?out.join('、'):out.join(', ')]:[];
}

function formatMoves(moves,lang){
 const out=[];
 for(const [kind,mods]of Object.entries(moves||{})){
  const parts=[];
  for(const [k,v]of Object.entries(mods||{})){
   if(k==='damage')parts.push(lang==='zh'?`伤害 ${dPct(v)}`:`damage ${dPct(v)}`);
   else if(k==='range')parts.push(lang==='zh'?`射程 ${dPct(v)}`:`range ${dPct(v)}`);
   else if(k==='radius')parts.push(lang==='zh'?`半径 ${dPct(v)}`:`radius ${dPct(v)}`);
   else if(k==='width')parts.push(lang==='zh'?`宽度 ${dPct(v)}`:`width ${dPct(v)}`);
   else if(k==='speed')parts.push(lang==='zh'?`速度 ${dPct(v)}`:`speed ${dPct(v)}`);
   else if(k==='cd')parts.push(lang==='zh'?`冷却 ${dPct(v)}`:`CD ${dPct(v)}`);
   else if(k==='knock')parts.push(lang==='zh'?`击退 ${dPct(v)}`:`knockback ${dPct(v)}`);
   else if(k==='amount')parts.push(lang==='zh'?`效果 ${dPct(v)}`:`strength ${dPct(v)}`);
   else if(k==='count')parts.push(lang==='zh'?`数量 +${v}`:`count +${v}`);
   else if(k==='crit')parts.push(lang==='zh'?`暴击率 +${pct(v)}`:`crit +${pct(v)}`);
   else if(k==='critMul')parts.push(lang==='zh'?`暴伤提至 ${nfmt(v)}倍`:`crit dmg ${nfmt(v)}×`);
   else if(k==='burn')parts.push(lang==='zh'?`附 ${v} 层灼伤`:`+${v} Burn`);
   else if(k==='poison')parts.push(lang==='zh'?`附 ${v} 层中毒`:`+${v} Poison`);
   else if(k==='arc')parts.push(lang==='zh'?`扇角 ${nfmt(v/Math.PI*180)}°`:`arc ${nfmt(v/Math.PI*180)}°`);
   else if(k==='arcFactor')parts.push(lang==='zh'?`扇角 ${dPct(v)}`:`arc ${dPct(v)}`);
   else throw Error('Unhandled move modifier: '+k);
  }
  out.push(lang==='zh'?`${KIND_ZH[kind]||kind}${parts.join('、')}`:`${KIND_EN[kind]||kind}: ${parts.join(', ')}`);
 }
 return out;
}

function formatPart(part,family,partName,lang){
 const zh=lang==='zh',out=[];
 if(!part||!Object.keys(part).length)return out;
 const kObj=part.kalos||{},aObj=part.alola||{},gObj=part.galar||{},pObj=part.paldea||{};
 const handled=new Set(['stats','moves','kalos','alola','galar','paldea']);

 // 1. Base stats & moves
 out.push(...formatStats(part.stats,lang));
 out.push(...formatMoves(part.moves,lang));

 // 2. Native keys
 for(const [k,v]of Object.entries(part)){
  if(handled.has(k))continue;
  switch(k){
   case 'captainHp': out.push(zh?`队长最大生命 ${dPct(v)}`:`Captain Max HP ${dPct(v)}`);break;
   case 'damage': out.push(zh?`全伤害 ${dPct(v)}`:`All damage ${dPct(v)}`);break;
   case 'allyDamage': out.push(zh?`队员伤害 ${dPct(v)}`:`Ally damage ${dPct(v)}`);break;
   case 'firstDamage': out.push(zh?`首段伤害 ${dPct(v)}`:`First-hit damage ${dPct(v)}`);break;
   case 'stabDamage': out.push(zh?`本系招式伤害 ${dPct(v)}`:`STAB move damage ${dPct(v)}`);break;
   case 'nonStabDamage': out.push(zh?`非本系招式伤害 ${dPct(v)}`:`Non-STAB move damage ${dPct(v)}`);break;
   case 'fireDamage': out.push(zh?`火属性招式伤害 ${dPct(v)}`:`Fire move damage ${dPct(v)}`);break;
   case 'fireFormation': out.push(zh?`火属性投射物/陨石范围 +15%`:`Fire Projectiles & Meteors radius +15%`);break;
   case 'rainDamage': out.push(zh?`雨天伤害 ${dPct(v)}`:`Rain damage ${dPct(v)}`);break;
   case 'burnDamage': out.push(zh?`火属性对灼伤敌人伤害 ${dPct(v)}`:`Fire damage vs burned foes ${dPct(v)}`);break;
   case 'statusDamage': out.push(zh?`对异常敌人伤害 ${dPct(v)}`:`Damage vs statused foes ${dPct(v)}`);break;
   case 'statusDuration': out.push(zh?`灼伤/中毒持续 ${dPct(v)}，对异常敌人伤害 +5%`:`Burn/Poison duration ${dPct(v)}, +5% vs statused`);break;
   case 'healthyDamage': out.push(zh?`生命 >85% 时伤害 ${dPct(v)}`:`Damage ${dPct(v)} above 85% HP`);break;
   case 'healthyProjectile': out.push(zh?`投射物对生命 >70% 敌人伤害 ${dPct(v)}`:`Projectiles deal ${dPct(v)} vs foes >70% HP`);break;
   case 'farDamage': out.push(zh?`队员距队长 >350 时伤害 ${dPct(v)}`:`Allies >350px from captain deal ${dPct(v)}`);break;
   case 'mineDamage': out.push(zh?`地雷伤害 ${dPct(v)}`:`Mine damage ${dPct(v)}`);break;
   case 'technician': out.push(zh?`1—3级招式伤害 ${dPct(v)}`:`Lv.1–3 move damage ${dPct(v)}`);break;
   case 'smallMoveRate': out.push(zh?`1级/副槽招式施法频率 ${dPct(v)}`:`Lv.1 & secondary-slot cast rate ${dPct(v)}`);break;
   case 'cooldown': out.push(zh?`全招式冷却 ${dPct(v)}`:`All cooldowns ${dPct(v)}`);break;
   case 'sunCooldown': out.push(zh?`晴天冷却速率 ${dPct(1/v)}`:`Sun cooldown rate ${dPct(1/v)}`);break;
   case 'sunStats': out.push(zh?`晴天移速与敏捷 +${pct(v)}`:`Sun Speed & Agility +${pct(v)}`);break;
   case 'sunSlow': out.push(zh?`晴天移速 -${pct(v)}`:`Sun Speed -${pct(v)}`);break;
   case 'sunIncoming': out.push(zh?`晴天承伤 ${dPct(v)}`:`Sun damage taken ${dPct(v)}`);break;
   case 'rainSpeed': out.push(zh?`雨天移速 +${pct(v)}`:`Rain Speed +${pct(v)}`);break;
   case 'rainMelee': out.push(zh?`雨天近战 0.15 秒后追加 20% 威力近战`:`Rain Melee triggers +20% follow-up Melee`);break;
   case 'rainOrbits': out.push(zh?`雨天环绕数量 +1、转速 +20%`:`Rain Orbits count +1, speed +20%`);break;
   case 'snowSpeed': out.push(zh?`降雪移速 +${pct(v)}`:`Snow Speed +${pct(v)}`);break;
   case 'weather': out.push(zh?`战斗常驻${WX_ZH[v]||v}`:`Permanent ${WX_EN[v]||v} weather`);break;
   case 'openingWeather': out.push(zh?`开战触发${WX_ZH[v]||v}`:`Starts combat in ${WX_EN[v]||v}`);break;
   case 'incoming': out.push(zh?`全伤害承伤 ${dPct(v)}`:`All damage taken ${dPct(v)}`);break;
   case 'physicalIncoming': out.push(zh?`物理接触承伤 ${dPct(v)}`:`Physical contact damage taken ${dPct(v)}`);break;
   case 'rangedIncoming': out.push(zh?`远程承伤 ${dPct(v)}`:`Ranged damage taken ${dPct(v)}`);break;
   case 'specialIncoming': out.push(zh?`特殊承伤 ${dPct(v)}`:`Special damage taken ${dPct(v)}`);break;
   case 'incomingTypes': out.push(...groupIncoming(v,lang));break;
   case 'weakReduction': out.push(zh?`受属性克制伤害 -${pct(v)}`:`Super-effective damage taken -${pct(v)}`);break;
   case 'neutralReduction': out.push(zh?`中性属性承伤 -${pct(v)}`:`Neutral damage taken -${pct(v)}`);break;
   case 'fullHpReduction': out.push(zh?`满血(≥99%)时承伤 -${pct(v)}`:`-${pct(v)} damage taken at full HP (≥99%)`);break;
   case 'poisonIncoming': out.push(zh?`受中毒敌人伤害 ${dPct(v)}`:`Damage from poisoned foes ${dPct(v)}`);break;
   case 'dashGuard': out.push(zh?`位移期间承伤 -${pct(v)}`:`Take -${pct(v)} damage while dashing`);break;
   case 'dashAfterIncoming': out.push(zh?`位移结束后 0.5 秒内承伤 ${dPct(v)}`:`${dPct(v)} damage taken for 0.5s after Dash`);break;
   case 'dashInvuln': out.push(zh?`施放位移获得 0.25 秒无敌`:`Dash grants 0.25s invulnerability`);break;
   case 'dashEndSpeed': out.push(zh?`位移结束 0.5 秒内移速 +${pct(v)}`:`Speed +${pct(v)} for 0.5s after Dash`);break;
   case 'dashExecute': out.push(zh?`位移直接处决生命低于 ${pct(v)} 的普通敌人`:`Dash executes normal foes <${pct(v)} HP`);break;
   case 'dashIntimidate': out.push(zh?`位移使180内敌人降攻 25%（2秒）`:`Dash lowers enemy attack 25% in 180px (2s)`);break;
   case 'longDashTrail': out.push(zh?`位移留下5秒半径65火阵（每0.5秒 3% 火伤 + 1灼伤）`:`Dash drops 5s fire zone (r=65, 3% Fire/0.5s)`);break;
   case 'stationaryDefense': out.push(zh?`站立超过 1 秒时双防 +${pct(v)}`:`Defense & Sp. Def +${pct(v)} after standing 1s`);break;
   case 'lowDefense': out.push(zh?`生命低于 40% 时双防 +${pct(v)}`:`Defense & Sp. Def +${pct(v)} below 40% HP`);break;
   case 'safeDefense': out.push(zh?`连续 5 秒未受伤时双防 +${pct(v)}`:`Defense & Sp. Def +${pct(v)} after 5s undamaged`);break;
   case 'safeRegen': out.push(zh?`连续 5 秒未受伤时自然回复 ${dPct(v)}`:`Natural regen ${dPct(v)} after 5s undamaged`);break;
   case 'beamDefense': out.push(zh?`施放能量柱 0.4 秒内双防 +${pct(v)}`:`Defense & Sp. Def +${pct(v)} for 0.4s on Beam`);break;
   case 'poorDefense': out.push(zh?`持有金币 <30G 时双防 ${dPct(v)}`:`Defense & Sp. Def ${dPct(v)} below 30G`);break;
   case 'frontParry': out.push(zh?`每 3 秒自动格挡 1 次正面近战接触攻击`:`Parries 1 frontal contact hit every 3s`);break;
   case 'heavyShield': out.push(zh?`单次受伤 >20% 最大生命时获 ${pct(v)} 白盾（5秒）`:`Heavy hit (>20% HP) grants ${pct(v)} shield (5s)`);break;
   case 'heavyFury': out.push(zh?`受重击(≥20%最大生命)后 4 秒内伤害 +25%`:`Heavy hit (≥20% HP) grants +25% damage (4s)`);break;
   case 'deathGuard': out.push(zh?`每战每名队员1次致死锁血并无敌 ${nfmt(v)} 秒`:`Once/battle/ally: survive lethal with ${nfmt(v)}s invuln`);break;
   case 'deathHeal': out.push(zh?`每战每名队员1次致死保命，回复 ${pct(v)} 最大生命并无敌 1.5 秒`:`Once/battle/ally: survive lethal at ${pct(v)} HP (1.5s invuln)`);break;
   case 'deathNova': out.push(zh?`每战1次致死保命并引发全屏爆发（30%伤，1秒定身）`:`Once/battle: survive lethal with 30% full-screen blast`);break;
   case 'emergencyWarp': out.push(zh?`每战每名队员1次致死保命并无敌 ${nfmt(v)} 秒`:`Once/battle/ally: survive lethal with ${nfmt(v)}s invuln`);break;
   case 'delayedDamage': out.push(zh?`所受伤害的 ${pct(v)} 转入4秒痛觉池均匀扣除`:`${pct(v)} of damage taken defers into 4s pain pool`);break;
   case 'painDefense': out.push(zh?`痛觉池非空期间双防 +${pct(v)}`:`Defense & Sp. Def +${pct(v)} while pain pool active`);break;
   case 'immune': out.push(zh?`免疫${v.map(t=>TYPE_ZH[t]||t).join('、')}属性伤害`:`Immune to ${v.map(t=>TYPE_EN[t]||t).join('/')} damage`);break;
   case 'groundImmune': out.push(zh?`免疫地面属性伤害`:`Immune to Ground damage`);break;
   case 'soundImmune': out.push(zh?`免疫声波伤害`:`Immune to sound damage`);break;
   case 'recoilImmune': out.push(zh?`免疫反冲伤害`:`Immune to recoil damage`);break;
   case 'slowImmune': out.push(zh?`免疫减速`:`Immune to slow`);break;
   case 'attackDebuffImmune': out.push(zh?`免疫敌方降攻`:`Immune to attack debuffs`);break;
   case 'absorbedHeal': out.push(zh?`触发免疫吸收时回复 ${pct(v)} 最大生命`:`Absorbing immune hits heals ${pct(v)} Max HP`);break;
   case 'lightningRodAttack': out.push(zh?`触发免疫吸收后 4 秒内物攻 +${pct(v)}`:`Absorbing immune hits grants +${pct(v)} Attack (4s)`);break;
   case 'statusPenalty': out.push(zh?`减速与减攻持续时间 ${dPct(v)}`:`Slow & attack-debuff duration ${dPct(v)}`);break;
   case 'regenRate': out.push(zh?`自然回复速率 ${dPct(v)}`:`Natural regen rate ${dPct(v)}`);break;
   case 'endHeal': out.push(zh?`战后存活全员回复 ${pct(v)} 已损生命`:`Post-battle: survivors heal ${pct(v)} missing HP`);break;
   case 'meleeLeech': out.push(zh?`近战造成伤害的 ${pct(v)} 转为吸血`:`Melee leeches ${pct(v)} of damage dealt`);break;
   case 'projectileLeech': out.push(zh?`投射物造成伤害的 ${pct(v)} 转为吸血`:`Projectiles leech ${pct(v)} of damage dealt`);break;
   case 'meleeSpeed': out.push(zh?`施放近战 1 秒内移速 +${pct(v)}`:`Speed +${pct(v)} for 1s after Melee`);break;
   case 'hurtAttack': out.push(zh?`受伤后 3 秒内物攻 +${pct(v)}`:`Attack +${pct(v)} for 3s after hit taken`);break;
   case 'hurtSpeed': out.push(zh?`受伤后 3 秒内移速 +${pct(v)}`:`Speed +${pct(v)} for 3s after hit taken`);break;
   case 'rageSpeed': out.push(zh?`生命低于 40% 时移速 +${pct(v)}`:`Speed +${pct(v)} below 40% HP`);break;
   case 'flyingSpeed': out.push(zh?`回旋或位移飞行期间移速 +${pct(v)}`:`Speed +${pct(v)} while Boomerang/Dash active`);break;
   case 'missingHealthPower': out.push(zh?`按已损生命比例提升物攻与敏捷，最高 +${pct(v)}`:`Up to +${pct(v)} Attack & Agility by missing HP%`);break;
   case 'burnSpa': out.push(zh?`场上每1名灼伤敌人提升特攻 +${pct(v)}（上限 +25%）`:`+${pct(v)} Sp. Atk per burned foe (max +25%)`);break;
   case 'psychicPenetration': out.push(zh?`主体攻击无视敌方 ${pct(v)} 双防`:`Main attacks ignore ${pct(v)} enemy defenses`);break;
   case 'ignoreDefenseBuffs': out.push(zh?`攻击带盾敌人额外 +10% 穿甲`:`+10% extra armor pen vs shielded foes`);break;
   case 'critMultiplier': {
    const hasBase=partName!=='base'&&family.base?.critMultiplier!=null;
    out.push(hasBase?(zh?`暴击伤害额外 +${pct(v)}（总 ${nfmt(family.base.critMultiplier+v)}倍）`:`Crit damage +${pct(v)} (${nfmt(family.base.critMultiplier+v)}× total)`):(zh?`暴击伤害提至 ${nfmt(v)}倍`:`Crit damage increased to ${nfmt(v)}×`));
    break;
   }
   case 'firstHealthyCrit': out.push(zh?`首次命中生命 >80% 敌人必暴`:`First hit on foes >80% HP crits`);break;
   case 'knockCrit': out.push(zh?`命中被击退敌人必暴`:`Guaranteed crit vs knocked-back foes`);break;
   case 'lastHitCrit': out.push(zh?`每第 5 次招式命中必暴`:`Every 5th move hit crits`);break;
   case 'returnCrit': out.push(zh?`回旋折返命中必暴`:`Boomerang return hits crit`);break;
   case 'returnDamage': out.push(zh?`回旋折返伤害 ${dPct(v)}、半径 +50%`:`Boomerang return dmg ${dPct(v)}, radius +50%`);break;
   case 'returnPull': out.push(zh?`回旋折返拉回非BOSS敌人`:`Boomerang return pulls non-bosses`);break;
   case 'electricCrit': out.push(zh?`电属性招式暴击率 +${pct(v)}`:`Electric move crit +${pct(v)}`);break;
   case 'burnCrit': out.push(zh?`扇形命中灼伤目标暴击率 +${pct(v)}`:`Cone crit +${pct(v)} vs burned foes`);break;
   case 'beamCritRamp': out.push(zh?`能量柱每次命中暴击率 +${pct(v)}（上限 +30%）`:`Beam hits stack +${pct(v)} crit (max +30%)`);break;
   case 'critVenom': out.push(zh?`近战暴击附加 ${pct(v)} 该次伤害的4秒毒伤`:`Melee crits add ${pct(v)} dmg as 4s poison`);break;
   case 'frozenVulnerable': out.push(zh?`对冻结/定身敌人伤害 +${pct(v)}`:`Damage +${pct(v)} vs frozen/stunned foes`);break;
   case 'frozenBeam': out.push(zh?`能量柱对冻结/定身敌人伤害 ${dPct(v)}`:`Beams deal ${dPct(v)} vs frozen/stunned foes`);break;
   case 'stunVulnerable': out.push(zh?`对定身敌人伤害 +${pct(v)}`:`Damage +${pct(v)} vs stunned foes`);break;
   case 'auraSlow': out.push(zh?`光环命中减速 ${pct(v)}（1秒）`:`Aura hits slow ${pct(v)} (1s)`);break;
   case 'sweetAura': out.push(zh?`队长160半径芳香场减速 20% 并易伤 15%`:`160px sweet aura: 20% slow & +15% vuln`);break;
   case 'toxicAura': out.push(zh?`队长${v}半径毒环每0.5秒施加 1 层中毒`:`${v}px toxic aura applies +1 Poison/0.5s`);break;
   case 'poisonRate': out.push(zh?`队长180半径内敌人中毒跳伤频率 ${dPct(v)}`:`Poison tick rate ${dPct(v)} within 180px`);break;
   case 'puddleBuff': out.push(zh?`站在毒池内伤害 +${pct(v)}`:`Damage +${pct(v)} while inside poison pool`);break;
   case 'acidPuddle': out.push(zh?`扇形命中 10% 概率留2秒酸池`:`Cone hits have 10% chance to drop 2s acid pool`);break;
   case 'acidDefense': out.push(zh?`扇形命中削减敌人 ${pct(v)} 双防（3秒）`:`Cone hits shred ${pct(v)} defenses (3s)`);break;
   case 'contactSlow': out.push(zh?`接触攻击者减速 ${pct(v)}（2秒）`:`Contact attackers slowed ${pct(v)} (2s)`);break;
   case 'contactFear': out.push(zh?`接触攻击者定身 ${nfmt(v)} 秒`:`Contact attackers stunned ${nfmt(v)}s`);break;
   case 'contactStun': out.push(zh?`受接触攻击 ${pct(v)} 概率定身攻击者 0.75 秒`:`${pct(v)} chance to stun contact attackers 0.75s`);break;
   case 'contactPoison': out.push(zh?`接触攻击者附加 ${v} 层中毒`:`Contact attackers receive +${v} Poison`);break;
   case 'contactBurn': out.push(zh?`接触攻击者附加 ${v} 层灼伤`:`Contact attackers receive +${v} Burn`);break;
   case 'screenAura': out.push(zh?`队长${v}半径光墙减速敌弹 35%，50内清除`:`${v}px barrier slows enemy shots 35%, erases <50px`);break;
   case 'screenShieldRegen': out.push(zh?`有白盾时每秒再生 ${pct(v)} 最大生命白盾`:`Active shield regens ${pct(v)} Max HP/s`);break;
   case 'waterCurtain': out.push(zh?`队长${v}半径水幕削减敌弹 25% 伤害`:`${v}px water curtain cuts enemy shot damage 25%`);break;
   case 'orbitIntercept': out.push(zh?`己方环绕法球可击落敌方弹幕`:`Allied Orbits destroy enemy shots`);break;
   case 'shieldOrbit': out.push(zh?`持有白盾时环绕伤害 ${dPct(v)}`:`Orbit damage ${dPct(v)} while shielded`);break;
   case 'spdefOrbit': out.push(zh?`基础特防转化为环绕伤害（上限 +40%）`:`Base Sp. Def boosts Orbit damage (max +40%)`);break;
   case 'defMelee': {
    const cap=kObj.defCap||.4;
    out.push(zh?`基础物防转化为近战伤害（上限 +${pct(cap)}）`:`Base Defense boosts Melee damage (max +${pct(cap)})`);
    break;
   }
   case 'speedDash': out.push(zh?`基础移速转化为位移伤害（上限 +40%）`:`Base Speed boosts Dash damage (max +40%)`);break;
   case 'phaseTerrain': out.push(zh?`全队移动无视墙体障碍`:`Team phases through walls`);break;
   case 'projectileTerrain': out.push(zh?`投射物穿透墙体障碍`:`Projectiles pierce walls`);break;
   case 'ricochet': out.push(zh?`投射物触墙反弹 ${v} 次`:`Projectiles bounce off walls ${v} times`);break;
   case 'homingTurns': out.push(zh?`投射物获得追踪转向能力`:`Projectiles gain homing`);break;
   case 'burrowCycle': out.push(zh?`队长连续移动每 6 秒触发 1.1 秒遁地无敌`:`Captain gains 1.1s burrow invuln every 6s moving`);break;
   case 'movingTrail': out.push(zh?`移动每0.5秒留下2秒火焰尾迹（每0.5秒 2.5% 火伤 + 1灼伤）`:`Moving leaves 2s fire trails (2.5% Fire/0.5s, +1 Burn)`);break;
   case 'fireTrailSlow': out.push(zh?`火焰尾迹附加 ${pct(v)} 减速`:`Fire trails apply ${pct(v)} slow`);break;
   case 'trapSilence': out.push(zh?`地雷/轨迹命中减速 70% 并沉默 ${nfmt(v)} 秒`:`Mines/Trails slow 70% & silence ${nfmt(v)}s`);break;
   case 'mushroomUses': out.push(zh?`每枚地雷可重复触发 ${v} 次`:`Each Mine triggers up to ${v} times`);break;
   case 'meteorCover': out.push(zh?`陨石数量 +1`:`Meteor count +1`);break;
   case 'ban': out.push(zh?`禁止学习【${v.map(x=>KIND_ZH[x]||x).join('】【')}】招式`:`Bans ${v.map(x=>KIND_EN[x]||x).join(' & ')} moves`);break;
   case 'extraPP': out.push(...Object.entries(v).map(([mk,n])=>zh?`${KIND_ZH[mk]||mk} PP 消耗 +${n}`:`${KIND_EN[mk]||mk} PP cost +${n}`));break;
   case 'selfCostPP': out.push(zh?`每次施法每点PP反噬 ${pct(v)} 最大生命（不致死）`:`Spending PP costs ${pct(v)} Max HP/PP (non-lethal)`);break;
   case 'noItems': out.push(zh?`队长无法使用携带道具`:`Captain cannot use held items`);break;
   case 'shopRefreshFactor': out.push(zh?`商店付费刷新费用 ×${nfmt(v)}（向上取整）`:`Paid shop refresh cost ×${nfmt(v)} (rounded up)`);break;
   default: throw Error('Unhandled native key: '+k+' in #'+family.root);
  }
 }

 // 3. Kalos namespace
 for(const [k,v]of Object.entries(kObj)){
  if(['defCap','echoDelay','echoTypes','iceAuraDamage','critPPType','bankCap','interestCap'].includes(k))continue;
  switch(k){
   case 'bank': out.push(zh?`每持20G伤害 +${pct(v)}（上限 +${pct(kObj.bankCap||.3)}）；每20杀战后 +1G（单场上限2G）`:`+${pct(v)} dmg/20G (max +${pct(kObj.bankCap||.3)}); +1G/20 kills (max 2G)`);break;
   case 'killGold': out.push(zh?`每累计 20 击杀战后 +1G（单场上限 2G）`:`+1G post-battle per 20 kills (max 2G)`);break;
   case 'povertyGold': out.push(zh?`战后金币 <20G 时额外补贴 +${v}G`:`+${v}G post-battle if gold <20G`);break;
   case 'solarGold': out.push(zh?`本战电系或暴击命中 ≥15 次，战后额外 +${v}G`:`+${v}G post-battle if ≥15 Electric/crit hits`);break;
   case 'bankShield': out.push(zh?`开战金币 ≥${v}G 时全队获等额白盾（上限 40% 最大生命）`:`Combat start with ≥${v}G grants gold-value shield (cap 40% HP)`);break;
   case 'interestDivisor': out.push(zh?`银行利息放宽至每 ${v}G 产 1G，利息上限 +${kObj.interestCap||0}G`:`Bank interest every ${v}G, cap +${kObj.interestCap||0}G`);break;
   case 'visitRefresh': out.push(zh?`每次进店额外获得 +${v} 次免费刷新`:`+${v} free shop refresh per shop visit`);break;
   case 'eliteChoice': out.push(zh?`精英战胜利后额外获得 1 次携带道具三选一`:`+1 extra 3-pick held item choice after Elite victory`);break;
   case 'fruitChance': out.push(zh?`击杀 ${pct(v)} 概率产补给果（战后结算回8%已损血+1PP，每战上限4）`:`${pct(v)} kill chance for fruit (post-battle +8% missing HP & 1 PP, max 4)`);break;
   case 'carrots': out.push(zh?`每20击杀产1份大粮（战后回10%最大生命，每战上限2）`:`Every 20 kills yields 1 ration (post-battle +10% HP, max 2)`);break;
   case 'foodSpeed': out.push(zh?`补给赋予下战前6秒移速提升至 +${pct(v)}`:`Supplies grant +${pct(v)} Speed for first 6s of next battle`);break;
   case 'overheal': out.push(zh?`溢出治疗的 ${pct(v)} 转为白盾（共享3%/秒速率）`:`${pct(v)} of overhealing converts to white shield`);break;
   case 'sync': out.push(zh?`施放属性提升时向队友同步 ${pct(v)} 效果（上限5秒）`:`Buff casts sync ${pct(v)} effect to allies (max 5s)`);break;
   case 'teamMoxie': out.push(zh?`全队每击杀1名敌人，全队物攻 +${pct(v)}（上限 +35%）`:`Team kills grant +${pct(v)} team Attack (max +35%)`);break;
   case 'meleeShield': out.push(zh?`近战命中获 ${pct(v)} 最大生命白盾（每次施法/0.5秒一次）`:`Melee hits grant ${pct(v)} Max HP shield (once/cast, 0.5s CD)`);break;
   case 'meleeEcho': {
    const t=kObj.echoTypes?typesZh(kObj.echoTypes):'';
    const te=kObj.echoTypes?typesEn(kObj.echoTypes)+' ':'';
    out.push(zh?`近战命中后追加 ${pct(v)} 实际伤害${t?t+'系':''}回响`:`Melee triggers ${pct(v)} ${te}echo`);break;
   }
   case 'rainEcho': out.push(zh?`雨天近战额外追加 ${pct(v)} 实际伤害水系回响`:`Rain Melee triggers extra ${pct(v)} Water echo`);break;
   case 'echo': {
    const t=kObj.echoTypes?typesZh(kObj.echoTypes):'';
    const te=kObj.echoTypes?typesEn(kObj.echoTypes)+' ':'';
    out.push(zh?`招式命中后追加 ${pct(v)} 实际伤害${t?t+'系':''}回响`:`Hits trigger ${pct(v)} ${te}echo`);break;
   }
   case 'echoStun': out.push(zh?`回响命中 20% 概率定身 ${nfmt(v)} 秒`:`Echoes have 20% chance to stun ${nfmt(v)}s`);break;
   case 'critPP': out.push(zh?`${kObj.critPPType?(TYPE_ZH[kObj.critPPType]+'系'):''}暴击 ${pct(v)} 概率返还 1 点 PP（0.5秒冷却）`:`${kObj.critPPType?(TYPE_EN[kObj.critPPType]+' '):''}Crits have ${pct(v)} chance to restore 1 PP (0.5s CD)`);break;
   case 'dashKillReset': out.push(zh?`位移击杀缩减自身位移冷却 ${pct(v)}（每次施法一次）`:`Dash kills reduce Dash CD by ${pct(v)} (once/cast)`);break;
   case 'killGuard': out.push(zh?`击杀后无敌 ${nfmt(v)} 秒（1.5秒冷却）`:`Kills grant ${nfmt(v)}s invuln (1.5s CD)`);break;
   case 'eliteReset': out.push(zh?`击败精英/BOSS重置全队冷却（10秒冷却）`:`Elite/Boss kills reset team CDs (10s CD)`);break;
   case 'pollen': out.push(zh?`异常敌人死亡引发70半径虫毒爆（2%伤+1中毒）`:`Statused kills explode (r=70, 2% Bug + 1 Poison)`);break;
   case 'parasitic': out.push(zh?`地雷转为4秒寄生毒（每秒1.5%血上限2.5%伤），死后留孢子区`:`Mines infect 4s poison (1.5% HP/s, capped) and leave spores`);break;
   case 'parasiteHeal': out.push(zh?`寄生目标死亡回复全队 ${pct(v)} 已损生命`:`Parasitized kills heal team ${pct(v)} missing HP`);break;
   case 'iceAura': out.push(zh?`队长${v}半径寒霜场持续减速敌人 30%${kObj.iceAuraDamage===0?'':'并造成低频冰伤'}`:`${v}px frost aura slows foes 30%${kObj.iceAuraDamage===0?'':' with chip Ice dmg'}`);break;
   case 'freezeBeam': out.push(zh?`能量柱减速 ${pct(v)} 并有 15% 概率冻结 0.7 秒`:`Beams slow ${pct(v)} with 15% chance to freeze 0.7s`);break;
   case 'iceCounter': out.push(zh?`受击每2秒向四周发射 ${v} 枚冰弹（各20%主招伤）`:`On hit (2s CD): fires ${v} Ice shards (20% primary dmg)`);break;
   case 'counterSpikes': out.push(zh?`受击每2秒向四周发射 ${v} 枚岩刺（各20%主招伤）`:`On hit (2s CD): fires ${v} Rock spikes (20% primary dmg)`);break;
   case 'typedCounter': out.push(zh?`受击每2秒向四周发射 ${v.count} 枚${TYPE_ZH[v.type]||v.type}弹（各20%主招伤）`:`On hit (2s CD): fires ${v.count} ${TYPE_EN[v.type]||v.type} bolts (20% primary)`);break;
   case 'reflect': out.push(zh?`受接触伤害反击攻击者 ${pct(v)} 草属性伤害`:`Reflects ${pct(v)} of contact damage as Grass`);break;
   case 'contactCharge': out.push(zh?`受到接触/近战伤害时计入吸收充能`:`Contact/melee hits taken count as absorb charge`);break;
   case 'waterHeal': out.push(zh?`免疫水属性伤害并排队回复 ${pct(v)} 最大生命`:`Immune to Water; queues ${pct(v)} Max HP heal`);break;
   case 'rainRegen': out.push(zh?`雨天自然回复 ${dPct(v)}`:`Natural regen ${dPct(v)} in Rain`);break;
   case 'zRegen': out.push(zh?`主动Z期间每秒回复全队 ${pct(v)} 最大生命`:`Heals team ${pct(v)} Max HP/s during Manual Z`);break;
   case 'pressure': out.push(zh?`队长250半径内敌人攻击频率降低 ${pct(v)}`:`Foes within 250px attack ${pct(v)} slower`);break;
   case 'globalPressure': out.push(zh?`全图敌人攻击频率降低 ${pct(v)}`:`All enemies attack ${pct(v)} slower map-wide`);break;
   case 'lifeRescue': out.push(zh?`每战1次队长致死触发全队救援：拉起全员至 25% 血并无敌 2 秒`:`Once/battle: captain lethal hit revives team to 25% HP (2s invuln)`);break;
   case 'terrainImmune': out.push(zh?`免疫地形减速与伤害陷阱`:`Immune to terrain slow & hazard traps`);break;
   default: throw Error('Unhandled kalos key: '+k+' in #'+family.root);
  }
 }

 // 4. Alola namespace
 for(const [k,v]of Object.entries(aObj)){
  if(['killSpaCap','killSpaScope','engineScope','engineCrit','burnCritKinds','reflectType','statusFactor','lowPowerOnly','highHpThreshold'].includes(k))continue;
  switch(k){
   case 'openingShield': out.push(zh?`开战授予全队 ${pct(v)} 最大生命白盾`:`Starts combat with ${pct(v)} Max HP team shield`);break;
   case 'openingRain': out.push(zh?`开战触发 ${v} 秒雨天`:`Starts combat with ${v}s Rain`);break;
   case 'killSpa': out.push(zh?`${aObj.killSpaScope==='team'?'全队':'自身'}每击杀1名敌人特攻 +${pct(v)}（上限 +${pct(aObj.killSpaCap||.25)}）`:`${aObj.killSpaScope==='team'?'Team':'Own'} kills grant +${pct(v)} Sp. Atk (max +${pct(aObj.killSpaCap||.25)})`);break;
   case 'guzzlordGrowth': out.push(zh?`队长每击杀1名敌人永久提升本局物攻 +${pct(v)}（跨战保留，上限 +35%）`:`Captain kills permanently add +${pct(v)} Attack for run (max +35%)`);break;
   case 'devourPP': out.push(zh?`队长击杀有 ${pct(v)} 概率回复全招式 1 点 PP`:`Captain kills have ${pct(v)} chance to restore 1 PP`);break;
   case 'engine': out.push(zh?`${aObj.engineCrit?'电系或暴击':'电系'}命中叠层，${aObj.engineScope==='team'?'全队':'自身'}每层敏捷 +${pct(v)}（上限 +30%）`:`${aObj.engineCrit?'Electric/crit':'Electric'} hits stack +${pct(v)} ${aObj.engineScope==='team'?'team ':''}Agility (max +30%)`);break;
   case 'engineCD': out.push(zh?`电系引擎叠层同步加速全招式冷却（上限 +30%）`:`Engine stacks also boost cooldown speed (max +30%)`);break;
   case 'links': out.push(zh?`电系引擎叠层时每秒电击220内最近敌人（3%主招10秒电伤）`:`While Engine active, zaps nearest foe (220px) every 1s for 3% Electric`);break;
   case 'killHaste': out.push(zh?`每击杀1名敌人冷却速度 +1%（上限 +${pct(v)}）`:`Kills grant +1% cooldown rate (max +${pct(v)})`);break;
   case 'lowRangedCD': out.push(zh?`生命 <40% 时远程招式冷却 ${dPct(v)}`:`Ranged move CD ${dPct(v)} below 40% HP`);break;
   case 'missingPower': out.push(zh?`${aObj.lowPowerOnly?'生命 <40% 时':''}按已损生命提升双攻与敏捷，最高 +${pct(v)}`:`${aObj.lowPowerOnly?'Below 40% HP: ':''}up to +${pct(v)} Attack/Sp.Atk/Agility by missing HP%`);break;
   case 'download': out.push(zh?`击杀按目标双防自适应提升 ${pct(v)} 物攻或特攻`:`Kills adaptively boost Attack or Sp. Atk by +${pct(v)}`);break;
   case 'rockCannon': out.push(zh?`每 3 次位移自动发射 1 枚穿透岩炮（60%主招伤）`:`Every 3rd Dash fires a piercing Rock boulder (60% primary)`);break;
   case 'meleeStones': out.push(zh?`每次近战追加 2 枚岩石碎石（各10%主招伤）`:`Melee casts launch 2 Rock shards (10% primary each)`);break;
   case 'extraFists': out.push(zh?`每次近战 0.2 秒后追加 1 记 ${pct(v)} 威力近战`:`Melee triggers a ${pct(v)} follow-up Melee 0.2s later`);break;
   case 'thunderFists': out.push(zh?`近战命中每0.5秒向250内至多2敌放出电弧（共40%主招伤）`:`Melee arcs Electric to up to 2 foes within 250px (40% primary, 0.5s CD)`);break;
   case 'buffShield': out.push(zh?`施放属性提升获 ${pct(v)} 最大生命白盾（5秒）`:`Buff casts grant ${pct(v)} Max HP shield (5s)`);break;
   case 'meleeCritBoost': out.push(zh?`近战命中后 3 秒内暴击伤害提至 ${nfmt(v)}倍`:`Melee hits raise crit damage to ${nfmt(v)}× for 3s`);break;
   case 'meleeDashCritMul': out.push(zh?`近战与位移暴击伤害提至 ${nfmt(v)}倍`:`Melee & Dash crit damage raised to ${nfmt(v)}×`);break;
   case 'critCap': out.push(zh?`全队最终暴击倍率封顶 ${nfmt(v)}倍`:`Final team crit multiplier capped at ${nfmt(v)}×`);break;
   case 'meleePenetration': out.push(zh?`主体近战无视敌方 ${pct(v)} 防御`:`Main Melee attacks ignore ${pct(v)} defense`);break;
   case 'echoHeal': out.push(zh?`命中回响每0.5秒排队回复 ${pct(v)} 最大生命`:`Hits queue ${pct(v)} Max HP heal (0.5s CD)`);break;
   case 'shieldQuake': out.push(zh?`击碎护盾引发180半径地震（10%主招10秒地伤，1秒冷却）`:`Breaking shields triggers 180px quake (10% Ground, 1s CD)`);break;
   case 'shieldShards': out.push(zh?`白盾破裂喷射 ${v.count} 枚${TYPE_ZH[v.type]||v.type}碎片（2秒冷却）`:`Shield break fires ${v.count} ${TYPE_EN[v.type]||v.type} shards (2s CD)`);break;
   case 'acidHits': out.push(zh?`扇形/投射物/能量柱命中 10% 概率留3秒酸池并破防 35%`:`Cone/Projectile/Beam hits (10%) drop 3s acid pool & shred 35% defense`);break;
   case 'reflect': out.push(zh?`受接触/近战伤害反击 ${pct(v)} ${TYPE_ZH[aObj.reflectType]||''}物理伤害`:`Reflects ${pct(v)} of contact damage as ${TYPE_EN[aObj.reflectType]||''}`);break;
   case 'contactLightning': out.push(zh?`受接触攻击每1秒电击220内至多 ${v} 敌（共30%主招伤）`:`Contact hits zap up to ${v} foes within 220px (30% primary, 1s CD)`);break;
   case 'burnCrit': {
    const allKinds=(aObj.burnCritKinds||[]).length>=10;
    const scopeZh=allKinds?'全招式':aObj.burnCritKinds?aObj.burnCritKinds.map(x=>KIND_ZH[x]||x).join('/'):'招式';
    const scopeEn=allKinds?'All moves':aObj.burnCritKinds?aObj.burnCritKinds.map(x=>KIND_EN[x]||x).join('/'):'Moves';
    out.push(zh?`${scopeZh}命中灼伤敌人暴击率 +${pct(v)}`:`${scopeEn} gain +${pct(v)} crit vs burned foes`);break;
   }
   case 'physicalCrit': out.push(zh?`物理招式暴击率 +${pct(v)}`:`Physical move crit +${pct(v)}`);break;
   case 'movingCritPenalty': out.push(zh?`移动期间暴击率 -${pct(v)}`:`Crit chance -${pct(v)} while moving`);break;
   case 'waterRange': out.push(zh?`生命 >85% 时水系投射物/光环范围 ${dPct(v)}`:`Water Projectile/Aura range ${dPct(v)} above 85% HP`);break;
   case 'waterSize': out.push(zh?`水系投射物体积 ${dPct(v)}`:`Water Projectile size ${dPct(v)}`);break;
   case 'waterAbsorb': out.push(zh?`受水伤减免${v.final?`至${nfmt(v.final)}倍`:dPct(v.factor)}并排队回复 ${pct(v.heal)} 最大生命`:`Reduces Water damage taken and queues ${pct(v.heal)} Max HP heal`);break;
   case 'highHpReduction': out.push(zh?`生命 ≥${pct(aObj.highHpThreshold||.8)} 时承伤 -${pct(v)}`:`Take -${pct(v)} damage at ≥${pct(aObj.highHpThreshold||.8)} HP`);break;
   case 'lowWeak': out.push(zh?`生命 <40% 时${groupIncoming(v,'zh').join('、')}`:`Below 40% HP: ${groupIncoming(v,'en').join(', ')}`);break;
   case 'rodTeam': out.push(zh?`免疫电伤后全队 4 秒物攻与敏捷 +25%`:`Electric absorb grants team +25% Attack & Agility (4s)`);break;
   case 'parryRage': out.push(zh?`正面格挡成功触发 3 秒受伤增攻状态`:`Successful front parry triggers 3s hurt-attack boost`);break;
   case 'sandWeaken': out.push(zh?`队长250半径内敌人攻击降低 20%`:`Enemies within 250px deal -20% damage`);break;
   case 'statusShort': out.push(zh?`${v.map(s=>s==='slow'?'减速':'减攻').join('与')}持续时间 ${dPct(aObj.statusFactor||.5)}`:`${v.join('/')} debuff duration ${dPct(aObj.statusFactor||.5)}`);break;
   case 'clinic': out.push(zh?`战斗中全队连续 10 秒保持满血，下次进店 +1 次免费刷新`:`Keep full team at 100% HP for 10s to earn +1 free shop refresh`);break;
   case 'xpRebate': out.push(zh?`每家商店首次购买训练家经验返还 ${v}G`:`First trainer XP purchase per shop rebates ${v}G`);break;
   case 'trapImmune': out.push(zh?`免疫地面减速陷阱`:`Immune to ground slow traps`);break;
   case 'strictSpore': break; // internal charging flag
   default: throw Error('Unhandled alola key: '+k+' in #'+family.root);
  }
 }

 // 5. Galar namespace
 for(const [k,v]of Object.entries(gObj)){
  switch(k){
   case 'obstacleBounce': out.push(zh?`投射物撞墙或场边反弹提速 +50% 并获得追踪`:`Bounced Projectiles gain +50% speed and homing`);break;
   case 'beamTerrain': out.push(zh?`能量柱穿透墙体障碍`:`Beams pierce walls`);break;
   case 'weatherImmune': out.push(zh?`免疫${v===true?'天气':(WX_ZH[v]||v)}持续伤害`:`Immune to ${v===true?'weather':(WX_EN[v]||v)} chip damage`);break;
   case 'sandSpeed': out.push(zh?`沙暴天气移速 +${pct(v)}`:`Sandstorm Speed +${pct(v)}`);break;
   case 'poisonShockDamage': out.push(zh?`对中毒或感电敌人伤害 ${dPct(v)}`:`Damage ${dPct(v)} vs poisoned or shocked foes`);break;
   case 'agilityMissing': out.push(zh?`按已损生命比例提升敏捷，最高 +${pct(v)}`:`Up to +${pct(v)} Agility by missing HP%`);break;
   case 'lowMissing': out.push(zh?`生命 <40% 时按已损生命提升物攻与敏捷，最高 +${pct(v)}`:`Below 40% HP: up to +${pct(v)} Attack & Agility by missing HP%`);break;
   case 'highHpSlow': out.push(zh?`生命 >50% 时移速 -${pct(v)}`:`Speed -${pct(v)} above 50% HP`);break;
   case 'captainSlow': out.push(zh?`队长移速 -${pct(v)}`:`Captain Speed -${pct(v)}`);break;
   case 'captainStationaryDefense': out.push(zh?`队长站立超过 1 秒时双防 +${pct(v)}`:`Captain Defense & Sp. Def +${pct(v)} when stationary >1s`);break;
   case 'meleeShieldBypass': out.push(zh?`主体近战直接无视敌人护盾`:`Main Melee attacks bypass enemy shields`);break;
   case 'meleeCritArmor': out.push(zh?`近战暴击削减敌人 ${pct(v)} 双防（3秒）`:`Melee crits shred ${pct(v)} enemy defenses (3s)`);break;
   case 'linksNearCaptain': out.push(zh?`队员距队长220内时每秒电击200内最近敌人（3%主招10秒电伤）`:`Allies within 220px of captain zap nearest foe (200px) every 1s for 3% Electric`);break;
   case 'banPhysicalMelee': out.push(zh?`禁止学习物理近战招式`:`Bans physical Melee moves`);break;
   default: throw Error('Unhandled galar key: '+k+' in #'+family.root);
  }
 }

 // 6. Paldea namespace
 for(const [k,v]of Object.entries(pObj)){
  switch(k){
   case 'hurtSpa': out.push(zh?`受伤后 3 秒内特攻 +${pct(v)}`:`Sp. Atk +${pct(v)} for 3s after hit taken`);break;
   case 'poisonTrail': out.push(zh?`移动每0.5秒留下2秒毒气尾迹（每0.5秒 2.5% 毒伤 + 1中毒）`:`Moving leaves 2s poison trails (2.5% Poison/0.5s, +1 Poison)`);break;
   case 'poisonTrailSlow': out.push(zh?`毒气尾迹附加 ${pct(v)} 减速`:`Poison trails apply ${pct(v)} slow`);break;
   case 'burrowDebuff': out.push(zh?`遁地结束时令220内敌人降攻 ${pct(v)}（3秒）`:`Emerging from burrow lowers enemy attack ${pct(v)} in 220px (3s)`);break;
   case 'rescueDashReset': out.push(zh?`免死触发时同步重置自身位移冷却`:`Lethal survival also resets own Dash cooldowns`);break;
   case 'snowHeal': out.push(zh?`降雪天气全队每秒排队回复 ${pct(v)} 最大生命`:`Snow queues ${pct(v)} Max HP/s team heal`);break;
   case 'weatherImmune': out.push(zh?`免疫${v===true?'天气':(WX_ZH[v]||v)}持续伤害`:`Immune to ${v===true?'weather':(WX_EN[v]||v)} chip damage`);break;
   case 'specialCrit': out.push(zh?`特殊与能量柱招式暴击率 +${pct(v)}`:`Special & Beam move crit +${pct(v)}`);break;
   case 'linksNearCaptain': out.push(zh?`队员距队长220内时每秒电击200内最近敌人（3%主招10秒电伤）`:`Allies within 220px of captain zap nearest foe (200px) every 1s for 3% Electric`);break;
   case 'weatherHaste': out.push(zh?`${v.kinds.map(x=>WX_ZH[x]||x).join('/')}天气冷却速率 +${pct(v.rate)}`:`${v.kinds.map(x=>WX_EN[x]||x).join('/')} cooldown rate +${pct(v.rate)}`);break;
   case 'iceSlow': out.push(zh?`冰属性招式命中减速敌人 ${pct(v)}（1.5秒）`:`Ice moves slow enemies ${pct(v)} (1.5s)`);break;
   case 'dashPenetration': out.push(zh?`主体位移无视敌方 ${pct(v)} 防御`:`Main Dash attacks ignore ${pct(v)} defense`);break;
   case 'sunWaterSafe': out.push(zh?`晴天时水属性招式不受天气降威`:`Water moves ignore Sun damage penalty`);break;
   case 'meleeShieldBypass': out.push(zh?`主体近战直接无视敌人护盾`:`Main Melee attacks bypass enemy shields`);break;
   case 'minPPCost': out.push(zh?`非零 PP 招式每次消耗不低于 ${v} 点`:`Non-zero PP moves cost at least ${v} PP`);break;
   default: throw Error('Unhandled paldea key: '+k+' in #'+family.root);
  }
 }

 // Merge concise short lines if >3 items so every part stays 1-3 crisp bullets
 if(out.length>3){
  const merged=[];
  const sep=zh?'；':'; ';
  for(let i=0;i<out.length;i++){
   if(merged.length&&merged[merged.length-1].length+out[i].length+2<=(zh?88:145))merged[merged.length-1]+=sep+out[i];
   else merged.push(out[i]);
  }
  return merged;
 }
 return out;
}

function extractZTitle(f){
 const a=(f.source?.parts?.active||[]).join('\n');
 const m=a.match(/\*\*([^*（(]+?)(?:\s*\([^)]*\))?\*\*/);
 return m?m[1].trim().replace(/\s*Z$/,''):f.name.zh;
}

function formatZ(f,lang){
 const zh=lang==='zh',a=f.active,titleZh=extractZTitle(f),tZh=typesZh(a.types||['normal']),tEn=typesEn(a.types||['normal']);
 const pow=a.power?pct(a.power):'';
 const critTagZh=a.critical?'必暴':'',critTagEn=a.critical?'crit ':'';
 const trueTagZh=a.trueDamage?'真实':'',trueTagEn=a.trueDamage?'true ':'';
 const dmgZh=a.power?`${pow} 主招10秒${tZh}${trueTagZh}${critTagZh}伤`:'';
 const dmgEn=a.power?`${pow} ${tEn} ${trueTagEn}${critTagEn}dmg`:'';

 let coreZh='',coreEn='';
 switch(a.shape){
  case 'nova': coreZh=`${a.count?`释放${a.count}发`:''}${a.radius?`半径${a.radius}`:'全屏'}爆发，造成 ${dmgZh}`;coreEn=`${a.count?`${a.count}-shot `:''}${a.radius?`${a.radius}px`:'full-screen'} nova for ${dmgEn}`;break;
  case 'delayedNova': coreZh=`蓄力 ${nfmt(a.delay||1)} 秒后引爆半径${a.radius||260}冲击，造成 ${dmgZh}`;coreEn=`After ${nfmt(a.delay||1)}s, blasts ${a.radius||260}px for ${dmgEn}`;break;
  case 'targetNova': coreZh=`瞬移至高血目标旁引爆半径${a.radius||240}冲击，造成 ${dmgZh}`;coreEn=`Warps to highest-HP foe and blasts ${a.radius||240}px for ${dmgEn}`;break;
  case 'rush': coreZh=`向前突进${a.range||650}距离，造成 ${dmgZh}`;coreEn=`Dashes ${a.range||650}px for ${dmgEn}`;break;
  case 'doubleRush': coreZh=`往返两次突进${a.range||700}距离，共造成 ${dmgZh}`;coreEn=`Dashes out and back (${a.range||700}px) for ${dmgEn} total`;break;
  case 'rushNova': coreZh=`突进${a.range||600}距离并引发半径${a.radius||220}震荡，共造成 ${dmgZh}`;coreEn=`Dashes ${a.range||600}px into a ${a.radius||220}px blast for ${dmgEn} total`;break;
  case 'astralRush': coreZh=`发射贯穿射线并引爆半径${a.radius||220}冲击，共造成 ${dmgZh}`;coreEn=`Fires piercing beam into ${a.radius||220}px blast for ${dmgEn} total`;break;
  case 'beam': coreZh=`射出${a.count>1?`${a.count}道`:'宽幅'}贯穿光柱，共造成 ${dmgZh}`;coreEn=`Fires ${a.count>1?`${a.count} `:''}piercing beam${a.count>1?'s':''} for ${dmgEn} total`;break;
  case 'beamNova': coreZh=`射出贯穿光柱并引爆半径${a.radius||230}冲击，共造成 ${dmgZh}`;coreEn=`Fires beam + ${a.radius||230}px blast for ${dmgEn} total`;break;
  case 'cone': coreZh=`向前方扇区释放${a.count?`${a.count}发`:''}冲击，共造成 ${dmgZh}`;coreEn=`Fires ${a.count?`${a.count}-shot `:''}cone volley for ${dmgEn} total`;break;
  case 'melee': coreZh=`半径${a.range||260}强力斩击，造成 ${dmgZh}`;coreEn=`${a.range||260}px melee strike for ${dmgEn}`;break;
  case 'multiMelee': coreZh=`连续 ${a.count||3} 段半径${a.range||260}斩击，共造成 ${dmgZh}`;coreEn=`${a.count||3} rapid ${a.range||260}px slashes for ${dmgEn} total`;break;
  case 'meleeChain': coreZh=`向至多 ${a.count||6} 名敌人连续电拳连闪，共造成 ${dmgZh}`;coreEn=`Strikes up to ${a.count||6} targets with rapid melee chains for ${dmgEn} total`;break;
  case 'targets': coreZh=`锁定至多 ${a.count||8} 名敌人齐射打击，共造成 ${dmgZh}`;coreEn=`Strikes up to ${a.count||8} targets for ${dmgEn} total`;break;
  case 'field': coreZh=`展开 ${nfmt(a.duration||4)} 秒半径${a.radius||250}领域，持续造成共 ${dmgZh}`;coreEn=`${nfmt(a.duration||4)}s field (r=${a.radius||250}) dealing ${dmgEn} total`;break;
  case 'targetField': coreZh=`在高血目标处展开 ${nfmt(a.duration||4)} 秒半径${a.radius||260}领域，共造成 ${dmgZh}`;coreEn=`${nfmt(a.duration||4)}s field on highest-HP foe (r=${a.radius||260}) for ${dmgEn} total`;break;
  case 'projectile': coreZh=`发射 ${a.count||1} 枚追踪弹丸，共造成 ${dmgZh}`;coreEn=`Fires ${a.count||1} homing projectile${(a.count||1)>1?'s':''} for ${dmgEn} total`;break;
  case 'boomerang': coreZh=`掷出 ${a.count||1} 枚穿透回旋，往返共造成 ${dmgZh}`;coreEn=`Throws ${a.count||1} piercing boomerang${(a.count||1)>1?'s':''} for ${dmgEn} total`;break;
  case 'teamBoomerang': coreZh=`全队齐掷穿透回旋，共造成 ${dmgZh}`;coreEn=`All allies throw piercing boomerangs sharing ${dmgEn}`;break;
  case 'teamFetch': coreZh=`全队掷出回旋并连锁打击至多4敌，共造成 ${dmgZh}`;coreEn=`Team boomerangs + 4-target chain sharing ${dmgEn}`;break;
  case 'missile': coreZh=`向高血目标发射追踪导弹并引爆半径${a.radius||260}冲击，共造成 ${dmgZh}`;coreEn=`Fires homing missile exploding in ${a.radius||260}px for ${dmgEn} total`;break;
  case 'multiMissile': coreZh=`向敌群连发 ${a.count||3} 枚追踪爆破弹（半径${a.radius||180}），共造成 ${dmgZh}`;coreEn=`Fires ${a.count||3} homing blast orbs (r=${a.radius||180}) for ${dmgEn} total`;break;
  case 'darts': coreZh=`齐射 ${a.count||12} 枚追踪龙箭，共造成 ${dmgZh}`;coreEn=`Launches ${a.count||12} homing darts sharing ${dmgEn}`;break;
  case 'targetBlast': coreZh=`锁定高血目标引爆半径${a.radius||260}天降打击，造成 ${dmgZh}`;coreEn=`Blasts highest-HP foe (r=${a.radius||260}) for ${dmgEn}`;break;
  case 'anchor': coreZh=`锁定高血目标重砸半径${a.radius||240}区域，造成 ${dmgZh}`;coreEn=`Slams highest-HP foe (r=${a.radius||240}) for ${dmgEn}`;break;
  case 'scatter': coreZh=`在周边引爆 ${a.count||8} 处半径${a.radius||140}爆点，共造成 ${dmgZh}`;coreEn=`Detonates ${a.count||8} blasts (r=${a.radius||140}) sharing ${dmgEn}`;break;
  case 'meteor': coreZh=`降下 ${a.count||8} 枚半径${a.radius||140}陨石，共造成 ${dmgZh}`;coreEn=`Drops ${a.count||8} meteors (r=${a.radius||140}) sharing ${dmgEn}`;break;
  case 'fireLash': coreZh=`半径${a.range||320}横扫并留下5座3秒火阵，共造成 ${dmgZh}`;coreEn=`${a.range||320}px sweep + five 3s fire zones sharing ${dmgEn}`;break;
  case 'fireCross': coreZh=`${a.coneRange?'扇形喷射':a.beamWidth?'高能光柱':'引导'}并在敌群布下5座${nfmt(a.duration||4)}秒火阵，共造成 ${dmgZh}`;coreEn=`${a.coneRange?'Cone':a.beamWidth?'Beam':'Calls'} + 5 cross fire zones (${nfmt(a.duration||4)}s) sharing ${dmgEn}`;break;
  case 'torchSong': coreZh=`连续 ${a.count||3} 轮扇形加半径${a.radius||220}咏唱爆破，共造成 ${dmgZh}`;coreEn=`${a.count||3} waves of cone + ${a.radius||220}px blasts sharing ${dmgEn}`;break;
  case 'beamMelee': coreZh=`发射光柱并连续3段半径${a.meleeRange||260}斩击，共造成 ${dmgZh}`;coreEn=`Beam + 3 slashes (r=${a.meleeRange||260}) sharing ${dmgEn}`;break;
  case 'tripleDive': coreZh=`连续 ${a.waves||3} 轮三连水流扇形齐射，共造成 ${dmgZh}`;coreEn=`${a.waves||3} waves of triple water volleys sharing ${dmgEn}`;break;
  case 'poisonDetonate': coreZh=`发动范围打击并引爆全屏中毒目标，共造成 ${dmgZh}`;coreEn=`Area strike + detonates all poisoned foes sharing ${dmgEn}`;break;
  case 'poisonNova': coreZh=`${a.poisonOnly?'引爆中毒敌人':'半径'+(a.radius||'全屏')+'毒爆'}，造成 ${dmgZh}${a.percent?` + ${pct(a.percent)}当前生命`:''}`;coreEn=`${a.poisonOnly?'Detonates poisoned foes':'Poison nova'} for ${dmgEn}${a.percent?` + ${pct(a.percent)} current HP`:''}`;break;
  case 'percentNova': coreZh=`全屏冲击造成 ${dmgZh} + ${a.missingPercent?`${pct(a.missingPercent)}已损生命`:`${pct(a.percent||0)}当前生命`}`;coreEn=`Full-screen blast for ${dmgEn} + ${a.missingPercent?`${pct(a.missingPercent)} missing HP`:`${pct(a.percent||0)} current HP`}`;break;
  case 'devourNova': coreZh=`半径${a.radius||260}吞噬冲击，造成 ${dmgZh} + ${pct(a.missingPercent||a.percent||0)}${a.missingPercent?'已损':'当前'}生命`;coreEn=`${a.radius||260}px devour blast for ${dmgEn} + ${pct(a.missingPercent||a.percent||0)} HP`;break;
  case 'painPurge': coreZh=`清空全队痛觉池引爆全屏真伤（痛觉总量上限100% + ${pow}），${pct(a.painHeal||0)}痛觉转治疗`;coreEn=`Purges team pain pools for full-screen true blast (pool + ${pow}) and heals ${pct(a.painHeal||0)} of pool`;break;
  case 'quadMask': coreZh=`依次挥出草/火/水/岩4记半径${a.range||260}重击，共造成 ${dmgZh}`;coreEn=`4 sequential Grass/Fire/Water/Rock strikes (r=${a.range||260}) sharing ${dmgEn}`;break;
  case 'teraStarstorm': coreZh=`释放 ${a.waves||6} 轮交替光束与半径${a.radius||280}星陨，共造成 ${dmgZh}`;coreEn=`${a.waves||6} alternating beam & ${a.radius||280}px starstorm waves sharing ${dmgEn}`;break;
  case 'support': case 'screenWard': coreZh=`展开全队战术守护`;coreEn=`Activates team tactical ward`;break;
  default: throw Error('Unhandled Z shape: '+a.shape+' in #'+f.root);
 }

 const extrasZh=[],extrasEn=[];
 if(a.captainCost){extrasZh.push(`消耗队长 ${pct(a.captainCost)} 当前生命`);extrasEn.push(`costs captain ${pct(a.captainCost)} current HP`);}
 if(a.selfCost){extrasZh.push(`消耗全队 ${pct(a.selfCost)} 当前生命`);extrasEn.push(`costs team ${pct(a.selfCost)} current HP`);}
 if(a.guard){extrasZh.push(`无敌 ${nfmt(a.guard)} 秒`);extrasEn.push(`${nfmt(a.guard)}s invuln`);}
 if(a.reflect){extrasZh.push(`反射全屏敌弹`);extrasEn.push(`reflects shots`);}
 else if(a.clear){extrasZh.push(`清除敌弹`);extrasEn.push(`clears shots`);}
 if(a.breakShield){extrasZh.push(`碎盾`);extrasEn.push(`breaks shields`);}
 if(a.execute){extrasZh.push(`处决 <${pct(a.execute)} 血普通怪${a.resetOnExecute?'并重置冷却':''}`);extrasEn.push(`executes <${pct(a.execute)} normal foes`);}
 if(a.stun){extrasZh.push(`定身 ${nfmt(a.stun)} 秒`);extrasEn.push(`${nfmt(a.stun)}s stun`);}
 if(a.nonBossStun){extrasZh.push(`非BOSS定身 ${nfmt(a.nonBossStun)} 秒`);extrasEn.push(`${nfmt(a.nonBossStun)}s non-boss stun`);}
 if(a.returnStun){extrasZh.push(`折返定身 ${nfmt(a.returnStun)} 秒`);extrasEn.push(`${nfmt(a.returnStun)}s return stun`);}
 if(a.freeze){extrasZh.push(`冻结 ${nfmt(a.freeze)} 秒`);extrasEn.push(`${nfmt(a.freeze)}s freeze`);}
 if(a.slow){extrasZh.push(`减速 ${pct(a.slow)}`);extrasEn.push(`${pct(a.slow)} slow`);}
 if(a.silence){extrasZh.push(`沉默 ${nfmt(a.silence)} 秒`);extrasEn.push(`${nfmt(a.silence)}s silence`);}
 if(a.burn){extrasZh.push(`${a.burn}层灼伤`);extrasEn.push(`+${a.burn} Burn`);}
 if(a.poison){extrasZh.push(`${a.poison}层中毒`);extrasEn.push(`+${a.poison} Poison`);}
 if(a.armor){extrasZh.push(`破甲 ${pct(a.armor)}`);extrasEn.push(`-${pct(a.armor)} def`);}
 if(a.vulnerable){extrasZh.push(`易伤 ${pct(a.vulnerable)}`);extrasEn.push(`+${pct(a.vulnerable)} vuln`);}
 if(a.attackDown||a.globalDebuff){const v=a.attackDown||a.globalDebuff;extrasZh.push(`降攻 ${pct(v)}`);extrasEn.push(`-${pct(v)} foe atk`);}
 if(a.sun){extrasZh.push(`${a.sun}秒晴天`);extrasEn.push(`${a.sun}s Sun`);}
 if(a.rain){extrasZh.push(`${a.rain}秒雨天`);extrasEn.push(`${a.rain}s Rain`);}
 if(a.snow){extrasZh.push(`${a.snow}秒降雪`);extrasEn.push(`${a.snow}s Snow`);}
 if(a.shield){extrasZh.push(`全队 ${pct(a.shield)} 白盾`);extrasEn.push(`${pct(a.shield)} team shield`);}
 if(a.physicalGuard){extrasZh.push(`${nfmt(a.duration||5)}秒物理减伤 ${pct(a.physicalGuard)}`);extrasEn.push(`${pct(a.physicalGuard)} phys guard`);}
 if(a.heal){extrasZh.push(`全队回 ${pct(a.heal)} 最大生命`);extrasEn.push(`heals team ${pct(a.heal)} HP`);}
 if(a.healMissing){extrasZh.push(`全队回 ${pct(a.healMissing)} 已损生命`);extrasEn.push(`heals ${pct(a.healMissing)} missing HP`);}
 if(a.damageHeal){extrasZh.push(`${pct(a.damageHeal)} 伤害转团队治疗`);extrasEn.push(`${pct(a.damageHeal)} dmg heals team`);}
 if(a.healingTrail){extrasZh.push(`沿途每敌回 ${pct(a.healPerTarget||.005)} 血`);extrasEn.push(`heals per foe hit`);}
 if(a.supplies){extrasZh.push(`额外产 ${a.supplies} 份补给果`);extrasEn.push(`+${a.supplies} bonus fruits`);}
 if(a.pp){extrasZh.push(`全队回 ${a.pp} PP`);extrasEn.push(`+${a.pp} team PP`);}
 if(a.reduceCd){extrasZh.push(`冷却 -${pct(a.reduceCd)}`);extrasEn.push(`-${pct(a.reduceCd)} CD`);}
 const buffsZh=[],buffsEn=[];
 if(a.attackBuff){buffsZh.push(`双攻 +${pct(a.attackBuff)}`);buffsEn.push(`Atk/SpA +${pct(a.attackBuff)}`);}
 if(a.spaBuff){buffsZh.push(`特攻 +${pct(a.spaBuff)}`);buffsEn.push(`SpA +${pct(a.spaBuff)}`);}
 if(a.speedBuff){buffsZh.push(`移速 +${pct(a.speedBuff)}`);buffsEn.push(`Spd +${pct(a.speedBuff)}`);}
 if(a.agilityBuff){buffsZh.push(`敏捷 +${pct(a.agilityBuff)}`);buffsEn.push(`Agi +${pct(a.agilityBuff)}`);}
 if(a.haste){buffsZh.push(`冷却加速 +${pct(a.haste)}`);buffsEn.push(`Haste +${pct(a.haste)}`);}
 if(a.defenseBuff){buffsZh.push(`物防 ${sPct(a.defenseBuff)}`);buffsEn.push(`Def ${sPct(a.defenseBuff)}`);}
 if(buffsZh.length){const d=nfmt(a.buffDuration||a.duration||5);extrasZh.push(`${d}秒${buffsZh.join('/')}`);extrasEn.push(`${d}s ${buffsEn.join('/')}`);}
 if(a.postExposure){extrasZh.push(`落地后 ${nfmt(a.postExposure)} 秒承伤 +25%`);extrasEn.push(`+25% dmg taken for ${nfmt(a.postExposure)}s after`);}

 const ev=f.charge.event;
 const line1Zh=`【${titleZh}】${coreZh}${extrasZh.length?'；'+extrasZh.join('、'):''}。`;
 const line2Zh=`充能：120秒基础充能，【${CHARGE_ZH[ev]||ev}】每次+1秒双倍加速；上限1发，跨战保留。`;
 const line1En=`${coreEn}${extrasEn.length?'; '+extrasEn.join(', '):''}.`;
 const line2En=`Charge: 120s base; [${CHARGE_EN[ev]||ev}] adds +1s of 2× speed. Holds 1 charge across battles.`;
 return zh?[line1Zh,line2Zh]:[line1En,line2En];
}

function validateDisplay(gen,f){
 const d=f.display;
 if(!d)throw Error(`Missing display on G${gen} #${f.root}`);
 for(const lang of ['zh','en']){
  for(const key of ['base','active','cost','five','eight']){
   const arr=d[lang]?.[key];
   if(!Array.isArray(arr)||!arr.length)throw Error(`Missing display.${lang}.${key} on G${gen} #${f.root}`);
   for(const line of arr){
    if(typeof line!=='string'||line.trim().length<2)throw Error(`Empty line on G${gen} #${f.root} ${lang}.${key}`);
    if(/budget\(|stats\.[a-z]|moves\.[a-z]|zCrit|incomingTypes|classStunT|applySlow|\*\*|`/.test(line))throw Error(`Forbidden token on G${gen} #${f.root} ${lang}.${key}: ${line}`);
   }
  }
 }
}

const args=new Set(process.argv.slice(2));
const only6to9=args.has('--6to9');
let total=0;

// Gen 1: mirror polished description -> display
if(!only6to9){
 const c1=JSON.parse(fs.readFileSync('config/leader_abilities_gen1.json','utf8'));
 for(const f of c1.families){f.display=f.description;validateDisplay(1,f);total++;}
 fs.writeFileSync('config/leader_abilities_gen1.json',JSON.stringify(c1,null,2)+'\n');

 // Gen 2-5: merge authored concise maps from tools/desc_gen{2..5}.json
 for(const g of [2,3,4,5]){
  const mapPath=`tools/desc_gen${g}.json`;
  if(!fs.existsSync(mapPath))throw Error('Missing '+mapPath);
  const map=JSON.parse(fs.readFileSync(mapPath,'utf8'));
  const c=JSON.parse(fs.readFileSync(`config/leader_abilities_gen${g}.json`,'utf8'));
  for(const f of c.families){
   const entry=map[String(f.root)];
   if(!entry)throw Error(`Missing entry for G${g} #${f.root} in ${mapPath}`);
   f.display=entry;
   validateDisplay(g,f);
   total++;
  }
  fs.writeFileSync(`config/leader_abilities_gen${g}.json`,JSON.stringify(c,null,2)+'\n');
 }
}

// Gen 6-9: deterministic exact-runtime compile
for(const g of [6,7,8,9]){
 const c=JSON.parse(fs.readFileSync(`config/leader_abilities_gen${g}.json`,'utf8'));
 for(const f of c.families){
  const zh={
   base:formatPart(f.base,f,'base','zh'),
   active:formatZ(f,'zh'),
   cost:formatPart(f.cost,f,'cost','zh'),
   five:formatPart(f.five,f,'five','zh'),
   eight:formatPart(f.eight,f,'eight','zh')
  };
  const en={
   base:formatPart(f.base,f,'base','en'),
   active:formatZ(f,'en'),
   cost:formatPart(f.cost,f,'cost','en'),
   five:formatPart(f.five,f,'five','en'),
   eight:formatPart(f.eight,f,'eight','en')
  };
  for(const key of ['base','cost','five','eight']){
   if(!zh[key].length)zh[key]=['无额外规则'];
   if(!en[key].length)en[key]=['No additional rule'];
  }
  f.display={zh,en};
  validateDisplay(g,f);
  total++;
 }
 fs.writeFileSync(`config/leader_abilities_gen${g}.json`,JSON.stringify(c,null,2)+'\n');
}

console.log(`Compiled and validated display descriptions for ${total} families${only6to9?' (Gen 6-9 only)':' (Gen 1-9 all)'}.`);
