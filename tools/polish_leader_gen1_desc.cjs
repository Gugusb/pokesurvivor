/* Generate standardized, concise, exact-value descriptions for all 74 Gen 1 captain families.
 * Preserves all runtime parameters and original source notes untouched. */
const fs=require('node:fs');
const file='config/leader_abilities_gen1.json';
const cfg=JSON.parse(fs.readFileSync(file,'utf8'));

const chargeZh={
 auraHit:'光环命中',coneCast:'扇形施法',beamCast:'能量柱施法',chainCast:'连锁施法',novaCast:'冲击波施法',
 meleeCrit:'近战暴击',boomerangCast:'回旋施法',heavyHurt:'队长受重击(≥20%最大生命)',dashHit:'位移命中',
 mineTrigger:'地雷触发',orbitHit:'环绕命中',kill:'队伍击杀',burnStack:'施加灼伤',bounceHit:'反弹投射物命中',
 spore:'蘑菇感染',buffCast:'属性提升施法',distance:'队长移动(每80px)',hurtAmount:'队长受伤(每5%最大生命)',
 hurtCount:'队伍受伤',dashCast:'位移施法',meleeHit:'近战命中',beamHit:'能量柱命中',meleeCast:'近战施法',
 debuffKill:'击杀破防/易伤敌人',painTick:'痛觉池扣血',pickup:'拾取经验',projectileHit:'投射物命中',
 freeze:'冻结敌人',poisonStack:'施加中毒',knock:'击退命中',stun:'定身敌人',fruitPickup:'拾取治愈果',
 boomerangReturn:'回旋折返命中',poisonHit:'中毒跳伤',heal:'队伍治疗(每5%最大生命)',echoHit:'回响命中',
 crit:'招式暴击',shieldBreak:'击碎护盾',intercept:'拦截弹幕',repeatMelee:'连击同一目标近战',
 coneHit:'扇形命中',electricHit:'电系招式命中',burnHit:'灼伤跳伤',absorb:'护盾/水幕/免疫吸收(每5%最大生命)',
 cast:'队伍施法',stabHit:'本系招式命中',rangedHit:'投射物/地雷命中',areaHit:'陨石/位移命中',
 iceHit:'冰系招式命中',hit:'招式命中',distinctType:'施放不同属性招式'
};
const chargeEn={
 auraHit:'Aura hits',coneCast:'Cone casts',beamCast:'Beam casts',chainCast:'Chain casts',novaCast:'Nova casts',
 meleeCrit:'Melee crits',boomerangCast:'Boomerang casts',heavyHurt:'Captain heavy hits (≥20% MaxHP)',dashHit:'Dash hits',
 mineTrigger:'Mine triggers',orbitHit:'Orbit hits',kill:'Team kills',burnStack:'Burn stacks applied',bounceHit:'Ricochet hits',
 spore:'Spore infections',buffCast:'Buff casts',distance:'Captain movement (per 80px)',hurtAmount:'Captain damage taken (per 5% MaxHP)',
 hurtCount:'Team hits taken',dashCast:'Dash casts',meleeHit:'Melee hits',beamHit:'Beam hits',meleeCast:'Melee casts',
 debuffKill:'Kills on debuffed foes',painTick:'Pain-pool ticks',pickup:'XP pickups',projectileHit:'Projectile hits',
 freeze:'Freezes',poisonStack:'Poison stacks applied',knock:'Knockback hits',stun:'Stuns',fruitPickup:'Fruit pickups',
 boomerangReturn:'Boomerang return hits',poisonHit:'Poison ticks',heal:'Team heals (per 5% MaxHP)',echoHit:'Echo hits',
 crit:'Crits',shieldBreak:'Shield breaks',intercept:'Shot intercepts',repeatMelee:'Consecutive melee hits on same target',
 coneHit:'Cone hits',electricHit:'Electric move hits',burnHit:'Burn ticks',absorb:'Absorbed damage (per 5% MaxHP)',
 cast:'Team casts',stabHit:'STAB hits',rangedHit:'Projectile/Mine hits',areaHit:'Meteor/Dash hits',
 iceHit:'Ice move hits',hit:'Move hits',distinctType:'Distinct move types cast'
};

const zLine=(ev)=>`充能：120秒基础充能，【${chargeZh[ev]||ev}】每次+1秒双倍加速；上限1发，跨战保留。`;
const zLineEn=(ev)=>`Charge: 120s base; [${chargeEn[ev]||ev}] adds +1s of 2× charge speed. Holds 1 charge across battles.`;

const desc={
 1:{
  zh:{
   base:['光环半径 +50%，跳伤频率 +25%。','光环命中使敌人减速 25%（1秒）。'],
   active:['【花粉毒爆】光环范围内造成 15% 主招10秒毒伤并附加 3 层中毒；每命中1名敌人回复全队 3% 已损生命（上限 30%）。'],
   cost:['移速 -20%。','禁止学习【位移】招式。'],
   five:['队长180半径内敌人的中毒跳伤频率 +50%。'],
   eight:['主动Z留下10秒花粉领域（半径180，持续毒伤），期间全队自然回复翻倍。']
  },
  en:{
   base:['Aura radius +50%, tick rate +25%.','Aura hits slow enemies by 25% (1s).'],
   active:['Toxic Bloom: Deals 15% primary 10s Poison damage in aura range with +3 Poison; heals team 3% missing HP per target hit (max 30%).'],
   cost:['Speed -20%.','Bans Dash moves.'],
   five:['Poison tick rate +50% on foes within 180 radius of captain.'],
   eight:['Manual Z leaves a 10s pollen field (r=180) and doubles team natural regen.']
  }
 },
 4:{
  zh:{
   base:['扇形射程 +70%、结算敏捷 +30%、击退 +50%。'],
   active:['【巨型烈风】全队各释放12发巨型扇形火浪，造成 65% 主招10秒伤并强力击退（200）。'],
   cost:['受到属性克制伤害 +35%。'],
   five:['扇形命中灼伤敌人时暴击率 +20%，暴击追加 1 层灼伤。'],
   eight:['主动Z额外引爆距队长超过70%屏幕半径的非BOSS敌人（半径85，15% 主招10秒火伤，击退150）。']
  },
  en:{
   base:['Cone range +70%, effective agility +30%, knockback +50%.'],
   active:['Giant Cone: Each ally fires a 12-shot cone for 65% primary 10s damage with 200 knockback.'],
   cost:['Super-effective damage taken +35%.'],
   five:['Cone crits +20% vs burned foes; Cone crits apply +1 Burn.'],
   eight:['Manual Z detonates non-boss foes beyond 70% screen radius (r=85, 15% Fire damage, 150 knockback).']
  }
 },
 7:{
  zh:{
   base:['能量柱射程 +60%、宽度 +60%、击退 +80%。','能量柱每贯穿1名敌人，后续伤害 +8%（上限 +40%）。'],
   active:['【三联水炮】全队各射出3道全屏必暴水柱（各 24% 主招10秒水伤），附带 1.5 秒定身。'],
   cost:['能量柱每次施法 PP 消耗 +1；全队耐力 -20%。'],
   five:['施放能量柱后的 0.4 秒内，双防 +35%。'],
   eight:['主动Z使精英与BOSS定身 3 秒（BOSS减半）并易伤 +20%（3秒）。']
  },
  en:{
   base:['Beam range +60%, width +60%, knockback +80%.','Beams gain +8% damage per enemy pierced (max +40%).'],
   active:['Triple Beam: Each ally fires 3 guaranteed-crit full-screen Water beams (24% primary 10s damage each, 1.5s stun).'],
   cost:['Beam PP cost +1; team Stamina -20%.'],
   five:['+35% Defense & Sp. Def for 0.4s after casting a Beam.'],
   eight:['Manual Z stuns elites/bosses (3s, halved on bosses) and adds +20% vulnerability (3s).']
  }
 },
 172:{
  zh:{
   base:['连锁跳跃次数 +2、射程 +40%。','连锁每跳跃1次伤害 +10%（上限 +40%）。'],
   active:['【超载雷暴】以最高生命敌人为中心引爆全屏电击，造成 65% 主招10秒电伤并减速 60%（2秒）。'],
   cost:['物防 -25%；接触受击无敌时间 -25%。'],
   five:['暴击时有 25% 概率回复 1 点 PP；连锁暴击额外回复自身 1 点 PP。'],
   eight:['主动Z雷暴伤害额外 +30%（总 84.5% 主招10秒电伤）。']
  },
  en:{
   base:['Chain jumps +2, range +40%.','Chain gains +10% damage per bounce (max +40%).'],
   active:['Overcharge: Full-screen Electric blast on highest-HP foe for 65% primary 10s damage and 60% slow (2s).'],
   cost:['Defense -25%; contact invulnerability duration -25%.'],
   five:['25% chance to restore 1 PP on crit; Chain crits also restore 1 PP to that Chain move.'],
   eight:['Manual Z deals +30% more damage (84.5% primary 10s Electric damage).']
  }
 },
 10:{
  zh:{
   base:['冲击波弹数 +35%、弹速 -20%，附加 1 层中毒与 20% 减速。'],
   active:['【催眠鳞粉】在脚下生成3秒半径250鳞粉场，每0.5秒造成 4.5% 主招10秒虫伤、2秒定身、1层中毒与 20% 易伤（3秒）。'],
   cost:['物防 -30%；火、岩属性承伤 +30%。'],
   five:['站立超过 1 秒后，双防 +60%。'],
   eight:['灼伤/中毒持续时间 +40%，对异常敌人伤害 +5%；带异常敌人死亡引发半径70毒爆（2% 主招10秒虫伤 + 1层中毒）。']
  },
  en:{
   base:['Nova projectile count +35%, speed -20%, adds +1 Poison and 20% slow.'],
   active:['Sleep Pollen: 3s field (r=250) dealing 4.5% Bug damage every 0.5s with 2s stun, +1 Poison, and +20% vulnerability.'],
   cost:['Defense -30%; Fire & Rock damage taken +30%.'],
   five:['+60% Defense & Sp. Def after standing still for 1s.'],
   eight:['Burn/Poison duration +40%, +5% damage vs statused foes; statused kills explode (r=70, 2% Bug + 1 Poison).']
  }
 },
 13:{
  zh:{
   base:['近战暴击率 +25%、暴击伤害提至 2倍，附加 1 层中毒。'],
   active:['【双针绝杀】全队2连必暴近战（各 30% 主招10秒虫伤，半径240）；处决240内生命低于 30% 的普通敌人（对精英/BOSS追加 30% 虫伤），处决成功重置全队冷却。'],
   cost:['生命 -20%；禁止学习【能量柱】与【光环】招式。'],
   five:['近战暴击附加 15% 该次伤害的持续毒伤（4秒内跳完）。'],
   eight:['近战半径 +40%；主动Z普通敌人处决血线提至 35%。']
  },
  en:{
   base:['Melee crit +25%, crit damage 2×, adds +1 Poison.'],
   active:['Twin Sting: 2 crit Melee hits (30% Bug each, r=240); executes normal foes <30% HP (+30% Bug vs elites/bosses) and resets team CDs.'],
   cost:['Max HP -20%; bans Beam and Aura moves.'],
   five:['Melee crits inflict 15% of dealt damage as 4s poison DoT.'],
   eight:['Melee range +40%; Manual Z execute threshold raised to 35% HP.']
  }
 },
 16:{
  zh:{
   base:['回旋持续时间 +50%；折返伤害 +50%、折返半径 +50%，并拉回非BOSS敌人（100）。'],
   active:['【烈风回刃】全队发射2枚穿透风刃（各 18% 主招10秒飞伤），前方生成3秒半径180吸附风场（每0.5秒 2.5% 飞伤），并清除全屏敌弹。'],
   cost:['站立超过 1 秒时，全承伤 +30%。'],
   five:['己方回旋飞行期间，移速 +25%。'],
   eight:['命中被击退敌人必定暴击；免疫减速。']
  },
  en:{
   base:['Boomerang duration +50%; return hits deal +50% damage, +50% radius, and pull non-bosses.'],
   active:['Storm Blades: Each ally throws 2 wind blades (18% Flying each), creates a 3s vortex (r=180, 2.5% Flying/0.5s), and clears enemy shots.'],
   cost:['Damage taken +30% while standing still >1s.'],
   five:['Speed +25% while your Boomerang is in flight.'],
   eight:['Guaranteed crit vs knocked-back foes; immune to slow.']
  }
 },
 19:{
  zh:{
   base:['按已损生命比例提升物攻与敏捷，最高 +60%。'],
   active:['【绝境门牙】持续 4 秒：近战与投射物命中附加目标当前生命 5% 伤害（单目标0.25秒间隔，精英/BOSS封顶 30% 主招10秒伤），近战额外吸血 10%。'],
   cost:['自然回复归零（主动治疗仍生效）；生命高于 85% 时伤害 -15%。'],
   five:['首次命中生命高于 80% 的敌人必定暴击。'],
   eight:['每战每名队员享有 1 次致死锁血（留1点生命）并无敌 2 秒。']
  },
  en:{
   base:['Gain up to +60% Attack & Agility based on missing HP%.'],
   active:['Fury Fang (4s): Melee & Projectile hits deal bonus 5% target current HP (0.25s/target, capped vs elites/bosses); Melee leeches 10% HP.'],
   cost:['Natural regen disabled (active healing works); damage -15% above 85% HP.'],
   five:['First hit on foes above 80% HP is a guaranteed crit.'],
   eight:['Once per battle per ally, survive lethal damage at 1 HP with 2s invulnerability.']
  }
 },
 21:{
  zh:{
   base:['位移射程 +60%、宽度 +40%、伤害 +40%。'],
   active:['【钻孔暴风】全队650距离冲刺（55% 主招10秒飞伤，击退200），并在原地生成3秒半径180风场（每0.5秒 4% 飞伤，减速50%）。'],
   cost:['投射物与能量柱射程 -25%；位移结束后的 0.5 秒内承伤 +20%。'],
   five:['位移击杀敌人时，返还自身位移招式 35% 剩余冷却。'],
   eight:['主动Z清除450半径内敌人护盾，并对其中BOSS追加 20% 主招10秒飞伤。']
  },
  en:{
   base:['Dash range +60%, width +40%, damage +40%.'],
   active:['Drill Wind: Team dashes 650px (55% Flying, 200 knockback) and leaves a 3s wind field (r=180, 4% Flying/0.5s, 50% slow).'],
   cost:['Projectile & Beam range -25%; +20% damage taken for 0.5s after dashing.'],
   five:['Dash kills reduce own Dash remaining cooldown by 35%.'],
   eight:['Manual Z breaks shields within 450px and deals +20% extra Flying damage to bosses.']
  }
 },
 23:{
  zh:{
   base:['地雷持续 +70%、半径 +30%；地面轨迹持续 +70%。','地雷与地面轨迹命中使敌人减速 70% 并沉默 2 秒（禁止发射弹幕/技能）。'],
   active:['【毒蛇酸潮】清除全屏敌弹，令全场敌人易伤 +25%（4秒）并附 2 层中毒，全队释放16发穿透毒弹（各 12% 主招10秒毒伤）。'],
   cost:['移速 -15%；投射物伤害 -20%。'],
   five:['接触攻击我方的敌人定身 1 秒（BOSS减半）。'],
   eight:['每战每名队员1次致死锁血并无敌 1.5 秒，同时触发全屏毒爆（30% 主招10秒伤、1秒定身、3层中毒）。']
  },
  en:{
   base:['Mine duration +70% & radius +30%; Trail duration +70%.','Mines & Trails slow by 70% and silence foes for 2s.'],
   active:['Acid Serpents: Clears shots, applies +25% vulnerability (4s) & +2 Poison to all foes, and fires 16 piercing poison bolts per ally (12% each).'],
   cost:['Speed -15%; Projectile damage -20%.'],
   five:['Contact attackers are stunned for 1s (halved on bosses).'],
   eight:['Once per battle per ally, survive lethal damage with 1.5s invulnerability and a full-screen toxic blast (30% damage, 1s stun, +3 Poison).']
  }
 },
 27:{
  zh:{
   base:['每次近战额外射出 3 枚岩石碎石（各 18% 伤害、穿透1）。','基础物防按 8% 转化为近战暴击伤害（上限 +50%）。'],
   active:['【裂地重斩】宽100全屏地裂光柱（60% 主招10秒地伤，击退150，定身1.5秒），650半径内敌人破甲 40%（3秒）并被拉向前方。'],
   cost:['特防 -25%；禁止学习特殊攻击招式。'],
   five:['施放近战后的 1 秒内，移速 +20%。'],
   eight:['近战暴击率 +15%；受接触伤害时反击攻击者 50% 所受伤害。']
  },
  en:{
   base:['Melee casts fire 3 piercing Rock shards (18% damage each).','Converts 8% of base Defense into Melee crit damage (max +50%).'],
   active:['Earth Split: Wide Ground beam (60% damage, 150 knockback, 1.5s stun); pulls foes within 650px and shreds 40% armor (3s).'],
   cost:['Sp. Def -25%; bans Special moves.'],
   five:['Speed +20% for 1s after casting Melee.'],
   eight:['Melee crit +15%; reflects 50% of contact damage back to attacker.']
  }
 },
 29:{
  zh:{
   base:['环绕数量 +1、半径 +30%、转速 +20%。','环绕命中回复施法者 0.2% 最大生命（受3%/秒上限）。'],
   active:['【母皇壁垒】全队获得 20% 最大生命白盾，持续 5 秒。'],
   cost:['全招式冷却 +15%；队员距队长超过 350 时伤害 -20%。'],
   five:['环绕附加 1 层中毒；受中毒敌人的伤害 -15%。'],
   eight:['持有白盾时，环绕伤害 +50%。']
  },
  en:{
   base:['Orbit count +1, radius +30%, rotation speed +20%.','Orbit hits heal caster for 0.2% Max HP (subject to 3%/s cap).'],
   active:['Mother Barrier: Grants the team a 20% Max HP white shield for 5s.'],
   cost:['All cooldowns +15%; allies >350px from captain deal -20% damage.'],
   five:['Orbits apply +1 Poison; take -15% damage from poisoned foes.'],
   eight:['Orbit damage +50% while shielded.']
  }
 },
 32:{
  zh:{
   base:['移除招式自带灼伤/中毒/减速/定身，换取全伤害 +35%、对护盾伤害 +60%。'],
   active:['【暴君弹幕】持续 3 秒：投射物弹数翻倍（上限48），无限穿透且无视墙壁。'],
   cost:['每次施法按消耗的 PP 每点扣除 0.5% 最大生命（不致死）。'],
   five:['投射物命中生命高于 70% 的敌人时伤害 +20%。'],
   eight:['击碎敌方护盾时引发半径180地震（10% 主招10秒地伤，击退100）。']
  },
  en:{
   base:['Strips Burn/Poison/Slow/Stun from moves for +35% damage and +60% damage to shields.'],
   active:['Tyrant Barrage (3s): Doubles Projectile count (max 48) with infinite pierce and wall phasing.'],
   cost:['Spending PP drains 0.5% Max HP per PP spent (non-lethal).'],
   five:['Projectiles deal +20% damage to foes above 70% HP.'],
   eight:['Breaking an enemy shield triggers a 180px quake (10% Ground damage, 100 knockback).']
  }
 },
 37:{
  zh:{
   base:['陨石半径 +40%、前摇 -50%，附加 2 层灼伤。'],
   active:['【九尾狐火】发射3朵追踪狐火（各 25% 主招10秒火伤，附3层灼伤），并引爆场上≥8层灼伤的敌人（半径90，10% 火伤 + 2层灼伤）。'],
   cost:['物攻 -30%；水属性承伤 +40%。'],
   five:['场上每有1名灼伤敌人，全队特攻 +1.5%（上限 +25%）。'],
   eight:['战斗常驻晴天；主动Z狐火弹速翻倍。']
  },
  en:{
   base:['Meteor radius +40%, windup -50%, adds +2 Burn.'],
   active:['Fox Fire: Fires 3 homing fireballs (25% Fire each, +3 Burn) and detonates foes with ≥8 Burn (r=90, 10% Fire + 2 Burn).'],
   cost:['Attack -30%; Water damage taken +40%.'],
   five:['+1.5% team Sp. Atk per burned enemy (max +25%).'],
   eight:['Permanent Sun in combat; Manual Z foxfire speed doubled.']
  }
 },
 41:{
  zh:{
   base:['投射物触墙反弹 2 次；投射物造成伤害的 2% 转为吸血（受3%/秒上限）。'],
   active:['【超声震荡】清除全屏敌弹并使全场敌人定身 3 秒（BOSS减半）。'],
   cost:['生命 -20%；晴天时暴击率 -20%。'],
   five:['投射物吸血额外 +1.5%（总 3.5%）；满血时溢出吸血的 20% 转为白盾（单次上限0.5%最大生命）。'],
   eight:['移速 +30%。']
  },
  en:{
   base:['Projectiles bounce off walls 2 times; Projectiles leech 2% of damage dealt.'],
   active:['Ultrasound: Clears all enemy shots and stuns all foes for 3s (halved on bosses).'],
   cost:['Max HP -20%; crit chance -20% in Sun.'],
   five:['Projectile leech +1.5% (3.5% total); 20% of overheal leech converts to white shield.'],
   eight:['Speed +30%.']
  }
 },
 43:{
  zh:{
   base:['持有环绕招式时，每0.5秒自动发射1枚草系飞花（25%伤害、穿透1）；晴天移速与敏捷 +30%。'],
   active:['【花瓣狂舞】持续 5 秒：环绕半径扩至全屏且伤害 +60%。'],
   cost:['火、冰属性承伤 +30%；雨雪天气冷却 +20%。'],
   five:['队长周身160半径散发甜气，使敌人减速 20% 并易伤 +15%（1秒）。'],
   eight:['主动Z期间每秒回复全队 2% 最大生命。']
  },
  en:{
   base:['While holding an Orbit move, fires a Grass petal every 0.5s; +30% Speed & Agility in Sun.'],
   active:['Petal Dance (5s): Expands Orbits to screen radius with +60% damage.'],
   cost:['Fire & Ice damage taken +30%; cooldowns +20% in Rain/Snow.'],
   five:['160px sweet aura slows nearby foes 20% and applies +15% vulnerability.'],
   eight:['Heals team 2% Max HP/s during Manual Z.']
  }
 },
 46:{
  zh:{
   base:['地雷转为寄生蘑菇：命中感染敌人 4 秒（每秒造成 1.5% 最大生命毒伤，上限 2.5% 主招10秒伤），感染目标死亡时分裂出2个5秒孢子区。'],
   active:['【催眠孢子】使非BOSS敌人定身 2.5 秒，并生成2.5秒全屏孢子领域（减速60%并持续感染寄生）。'],
   cost:['火属性承伤 +60%；位移弹速 -20%。'],
   five:['被寄生敌人易伤 +20%（4秒），死亡时回复全队 3% 已损生命。'],
   eight:['每个寄生蘑菇地雷可触发 3 次。']
  },
  en:{
   base:['Mines become parasitic mushrooms: infects foes for 4s (1.5% MaxHP/s Poison, capped) and spawns 2 spore zones on kill.'],
   active:['Sleep Spores: Stuns non-boss foes for 2.5s and creates a 2.5s full-screen spore field (60% slow + infection).'],
   cost:['Fire damage taken +60%; Dash speed -20%.'],
   five:['Parasitized foes take +20% damage (4s) and heal team 3% missing HP on death.'],
   eight:['Each parasitic Mine triggers up to 3 times.']
  }
 },
 48:{
  zh:{
   base:['属性提升效果 +40%、持续 +60%。','每有1层增益，能量柱伤害与宽度各 +8%（上限5层，+40%）。'],
   active:['【蝶舞极光】清除全屏敌弹；全队连射5道扫射超能光柱（各 12% 主招10秒超伤，定身1秒）；随后4秒能量柱全屏穿墙并附1秒定身。'],
   cost:['身上无任何增益时，伤害 -20%。'],
   five:['属性提升招式冷却 -20%。'],
   eight:['蝶舞Z期间必定暴击，且特防提升约 +43%（÷0.7）。']
  },
  en:{
   base:['Buff strength +40%, duration +60%.','Beams gain +8% damage & width per active buff stack (max 5 stacks, +40%).'],
   active:['Butterfly Beam: Clears shots, fires 5 Psychic beams per ally (12% each, 1s stun); for 4s Beams pierce walls full-screen with 1s stun.'],
   cost:['Damage -20% when holding no active buffs.'],
   five:['Buff cooldowns -20%.'],
   eight:['Manual Z grants guaranteed crits and ~+43% Sp. Def during its 4s window.']
  }
 },
 50:{
  zh:{
   base:['移速 +20%；队长连续移动每 6 秒触发 1.1 秒遁地无敌。'],
   active:['【破土突袭】队长无敌 1.1 秒并引发半径250震荡（60% 主招10秒地伤，拉拢150，定身0.6秒）。'],
   cost:['生命 -25%；地面、水属性承伤 +30%。'],
   five:['主动Z留下3秒半径220流沙场（每0.5秒 1.5% 主招10秒地伤，减速60%）。'],
   eight:['主动Z改为连续3次破土震荡（各 20% 主招10秒地伤）。']
  },
  en:{
   base:['Speed +20%; moving continuously for 6s grants captain 1.1s burrow invulnerability.'],
   active:['Burrow: 1.1s invulnerability and a 250px quake (60% Ground damage, 150 pull, 0.6s stun).'],
   cost:['Max HP -25%; Ground & Water damage taken +30%.'],
   five:['Manual Z leaves a 3s quicksand field (r=220, 1.5% Ground/0.5s, 60% slow).'],
   eight:['Manual Z erupts 3 times in succession (20% Ground damage each).']
  }
 },
 52:{
  zh:{
   base:['1级与副槽招式施法频率 +25%。','每持有 20 金币全队伤害 +3%（上限 +30%）；战斗每20击杀战后额外 +1G（单场上限 2G）。'],
   active:['【聚宝功】立刻获得当前金币的 3%（最少 1G、最多 3G），并授予全队临时白盾（当前金币×10%，上限 10% 最大生命，持续5秒）。'],
   cost:['持有金币少于 30G 时双防 -20%；商店付费刷新费用 ×1.5（向上取整）。'],
   five:['精英战胜利后额外获得 +1 件携带道具。'],
   eight:['开战金币 ≥150G 时，全队获得等额白盾（上限 40% 最大生命）。']
  },
  en:{
   base:['Lv.1 & secondary-slot moves cast +25% faster.','+3% team damage per 20G held (max +30%); +1G post-battle per 20 kills (max 2G/battle).'],
   active:['Pay Day: Gain 3% of current gold (min 1G, max 3G) and grant a 5s white shield (10% of gold, max 10% Max HP).'],
   cost:['Defense & Sp. Def -20% below 30G; paid shop refresh cost ×1.5 (rounded up).'],
   five:['+1 extra held item after winning an Elite battle.'],
   eight:['Starting combat with ≥150G grants a white shield equal to gold (max 40% Max HP).']
  }
 },
 54:{
  zh:{
   base:['冲击波半径 +50%、伤害 +30%。'],
   active:['【念力剧痛】引爆全屏超能冲击，造成 60% 主招10秒超伤并定身 1.5 秒。'],
   cost:['队长满血时，冲击波冷却 +50%。'],
   five:['主动Z回复全队 8% 已损生命。'],
   eight:['主动Z对BOSS额外追加 20% 主招10秒超伤。']
  },
  en:{
   base:['Nova radius +50%, damage +30%.'],
   active:['Headache: Full-screen Psychic blast for 60% primary 10s damage and 1.5s stun.'],
   cost:['Nova cooldown +50% while captain is at full HP.'],
   five:['Manual Z heals the team for 8% missing HP.'],
   eight:['Manual Z deals +20% extra Psychic damage to bosses.']
  }
 },
 56:{
  zh:{
   base:['本场每受伤1次，近战伤害 +1.5%（上限 +100%），且每次受伤为当前主招式组回复 1 点 PP。'],
   active:['【狂怒铁拳】持续 4 秒：近战变为 360° 全向攻击且必定暴击。'],
   cost:['双防 -20%；自然回复归零（主动治疗仍生效）。'],
   five:['生命低于 40% 时，移速 +30%。'],
   eight:['受伤近战增伤额外 +1%/次（合计 +2.5%/次，上限 +100%）；每战首次生命低于 30% 时获得 1 秒无敌且伤害 +50%。']
  },
  en:{
   base:['Each hit taken grants +1.5% Melee damage (max +100%) and restores 1 PP to active move group.'],
   active:['Rage Fists (4s): Melee becomes 360° and guaranteed crit.'],
   cost:['Defense & Sp. Def -20%; natural regen disabled.'],
   five:['Speed +30% below 40% HP.'],
   eight:['+1% extra Melee gain per hit (2.5%/hit total, max +100%); first drop below 30% HP grants 1s invulnerability and +50% damage.']
  }
 },
 58:{
  zh:{
   base:['位移弹速 +70%、冷却 -20%；基础移速转化为位移伤害（每10点移速 +5%，上限 +40%）。'],
   active:['【威吓冲锋】全场敌人定身 2 秒、减速 50% 并降攻 30%（3秒），全队600距离火系冲锋（40% 主招10秒火伤）。'],
   cost:['禁止学习【光环】与【炮台】；站立超过 1 秒时暴击率归零。'],
   five:['位移期间击落队长80半径内的敌方弹幕。'],
   eight:['每次位移在原地留下3秒半径65火焰地带（每0.5秒 3% 主招10秒火伤，附1层灼伤）。']
  },
  en:{
   base:['Dash speed +70%, cooldown -20%; base Speed boosts Dash damage (+5% per 10 Speed, max +40%).'],
   active:['Roar Rush: Stuns all foes 2s, slows 50%, lowers attack 30% (3s); team dashes 600px (40% Fire).'],
   cost:['Bans Aura & Turret moves; crit chance becomes 0% after standing still >1s.'],
   five:['Dashing intercepts enemy shots within 80px of captain.'],
   eight:['Dash leaves a 3s fire zone (r=65, 3% Fire/0.5s, +1 Burn).']
  }
 },
 60:{
  zh:{
   base:['近战命中 0.15 秒后追加 20% 实际伤害的二段回响；雨天近战再追加一次 20% 威力近战。'],
   active:['【催眠暴雨】召唤 12 秒雨天，令250半径内敌人定身 2 秒、削减 30% 护盾并造成 35% 主招10秒水伤。'],
   cost:['晴天时移速 -15%、冷却 +25%。'],
   five:['接触攻击我方的敌人减速 40%（2秒）。'],
   eight:['每场战斗开局强制召唤雨天。']
  },
  en:{
   base:['Melee triggers a 20% damage echo after 0.15s; in Rain, Melee casts an extra 20% Melee strike.'],
   active:['Hypnosis Rain: Summons 12s Rain; stuns foes within 250px for 2s, strips 30% shield, deals 35% Water damage.'],
   cost:['In Sun: Speed -15%, cooldowns +25%.'],
   five:['Contact attackers are slowed 40% (2s).'],
   eight:['Forces Rain weather at battle start.']
  }
 },
 63:{
  zh:{
   base:['能量柱射程 +80%；特攻 +25%；免疫地面属性伤害。'],
   active:['【折跃光束】全队发射贯穿超能光束（30% 主招10秒超伤，定身1.5秒），向前瞬移200并无敌 0.5 秒后再射第二道同威力光束。'],
   cost:['生命 -30%；物防 -25%。'],
   five:['每次能量柱命中叠加 +6% 暴击率（上限 +30%）。'],
   eight:['每战每名队员1次致死保命（留1点生命）并获得 2 秒无敌。']
  },
  en:{
   base:['Beam range +80%; Sp. Atk +25%; immune to Ground damage.'],
   active:['Warp Beam: Team fires a 30% Psychic beam (1.5s stun), warps 200px forward with 0.5s invulnerability, and fires a second 30% beam.'],
   cost:['Max HP -30%; Defense -25%.'],
   five:['Each Beam hit stacks +6% Beam crit chance (max +30%).'],
   eight:['Once per battle per ally, survive lethal damage at 1 HP with 2s invulnerability.']
  }
 },
 66:{
  zh:{
   base:['物攻 +25%；近战变为 360° 全向攻击，击退 +60%。'],
   active:['【四臂连拳】全队连续挥出4记半径200格斗重拳（各 18% 主招10秒斗伤），每拳削减目标 20% 护盾，前3拳击退130、末拳必暴。'],
   cost:['全伤害承伤 +25%；禁止学习【能量柱】招式。'],
   five:['施放近战后的 0.3 秒内，承伤 -30%。'],
   eight:['每次近战 0.2 秒后自动追加 1 记 20% 威力近战。']
  },
  en:{
   base:['Attack +25%; Melee becomes 360° with +60% knockback.'],
   active:['Four Fists: Team unleashes 4 Fighting strikes (r=200, 18% each); each strips 20% shield, first 3 knock back 130, 4th guaranteed crit.'],
   cost:['All damage taken +25%; bans Beam moves.'],
   five:['Take -30% damage for 0.3s after casting Melee.'],
   eight:['Melee triggers an extra 20% power Melee strike 0.2s later.']
  }
 },
 69:{
  zh:{
   base:['扇形扇角 -30%、射程 +50%；扇形命中削减目标 25% 双防（3秒）。'],
   active:['【强酸吞噬】对200半径内非BOSS敌人造成 30% 已损生命 + 12% 主招10秒草伤，并将总伤害的 10% 平分治疗全队。'],
   cost:['移速 -20%；对无异常状态敌人的伤害 -15%。'],
   five:['扇形命中时有 10% 概率在目标脚下生成2秒半径50酸池（每0.5秒 1% 毒伤 + 1层中毒）。'],
   eight:['扇形命中生命低于 30% 的敌人时，有 10% 概率回复全招式 1 点 PP。']
  },
  en:{
   base:['Cone angle -30%, range +50%; Cone hits shred 25% target defenses (3s).'],
   active:['Devour: Deals 30% missing HP + 12% Grass damage to non-bosses within 200px; heals team for 10% of damage dealt.'],
   cost:['Speed -20%; -15% damage vs foes with no status ailments.'],
   five:['Cone hits have 10% chance to drop a 2s acid pool (r=50, 1% Poison/0.5s + 1 Poison).'],
   eight:['Cone hits vs foes below 30% HP have 10% chance to restore 1 PP.']
  }
 },
 72:{
  zh:{
   base:['环绕数量 +1，命中 50% 概率附加 1 层中毒；基础特防按 8% 转化为环绕伤害（上限 +40%）。'],
   active:['【剧毒水幕】授予全队白盾（15% 最大生命与特防×10取高，持续5秒），对250半径敌人造成 30% 主招10秒毒伤、击退150并附3层中毒。'],
   cost:['物防 -25%；电属性承伤 +35%。'],
   five:['白盾破碎时向外喷射 8 枚穿透毒刺（各 30% 伤害）。'],
   eight:['雨天时环绕数量再 +1、转速 +20%。']
  },
  en:{
   base:['Orbit count +1 with 50% chance to apply +1 Poison; converts 8% base Sp. Def into Orbit damage (max +40%).'],
   active:['Toxic Curtain: Grants 5s shield (max of 15% Max HP or Sp.Def×10) and deals 30% Poison damage in 250px (150 knockback, +3 Poison).'],
   cost:['Defense -25%; Electric damage taken +35%.'],
   five:['Shield break fires 8 Poison shards (30% damage each).'],
   eight:['In Rain: +1 extra Orbit and +20% Orbit speed.']
  }
 },
 74:{
  zh:{
   base:['物防 +30%；冲击波半径 +40%、击退 +60%。','每战每名队员1次致死锁血（留1点生命）并无敌 1.5 秒，同时触发全屏爆发（30% 主招10秒伤，1秒定身）。'],
   active:['【岩石爆破】清除全场敌方护盾，引爆全屏落石造成 65% 主招10秒岩伤并击退180。'],
   cost:['移速 -20%；水、草属性承伤 +60%。'],
   five:['施放位移时获得 0.25 秒无敌。'],
   eight:['致死锁血无敌时间延长至 2.5 秒。']
  },
  en:{
   base:['Defense +30%; Nova radius +40%, knockback +60%.','Once per battle per ally, survive lethal damage at 1 HP (1.5s invulnerable) with a 30% full-screen blast (1s stun).'],
   active:['Rock Detonation: Breaks all enemy shields and deals 65% Rock damage full-screen with 180 knockback.'],
   cost:['Speed -20%; Water & Grass damage taken +60%.'],
   five:['Dashing grants 0.25s invulnerability.'],
   eight:['Lethal survival invulnerability extended to 2.5s.']
  }
 },
 77:{
  zh:{
   base:['移速 +30%；移动时每0.5秒留下2秒半径50火痕（每0.5秒 2.5% 主招10秒火伤，附1层灼伤）。'],
   active:['【烈焰疾驰】持续 3 秒：移速再 +50%，移动火痕半径扩至 100。'],
   cost:['站立超过 1 秒时，全承伤 +35%。'],
   five:['位移冷却 -25%，每次位移留下5秒半径65火焰地带（每0.5秒 3% 火伤 + 1层灼伤）。'],
   eight:['火痕附加 30% 减速，队友踩在火痕内移速 +15%。']
  },
  en:{
   base:['Speed +30%; moving leaves 2s fire trails every 0.5s (r=50, 2.5% Fire/0.5s, +1 Burn).'],
   active:['Flame Gallop (3s): +50% extra Speed and fire trail radius increases to 100px.'],
   cost:['Damage taken +35% while standing still >1s.'],
   five:['Dash cooldown -25%; Dash leaves a 5s fire zone (r=65, 3% Fire/0.5s, +1 Burn).'],
   eight:['Fire trails slow foes 30% and boost ally Speed +15%.']
  }
 },
 79:{
  zh:{
   base:['所受伤害的 40% 延迟转入痛觉池，在 4 秒内均匀扣除。'],
   active:['【痛觉释放】清空全队痛觉池，引爆全屏超能冲击（痛觉池总量封顶100%主招10秒伤 + 基础 25% 超伤）并定身 1.5 秒。'],
   cost:['移速 -25%；全招式冷却 +15%。'],
   five:['痛觉池非空期间，双防 +40%。'],
   eight:['主动Z将清空痛觉池的 35% 平分转化为全队治疗。']
  },
  en:{
   base:['40% of damage taken is deferred into a 4s pain pool.'],
   active:['Pain Release: Clears team pain pools for a full-screen Psychic blast (pool up to 100% + 25% base damage, 1.5s stun).'],
   cost:['Speed -25%; all cooldowns +15%.'],
   five:['Defense & Sp. Def +40% while pain pool is active.'],
   eight:['Manual Z converts 35% of cleared pain pool into team healing.']
  }
 },
 81:{
  zh:{
   base:['经验拾取半径 ×2.5；环绕数量 +1；环绕半径每50px提供 +2.5% 环绕伤害（上限 +35%）。'],
   active:['【极磁风暴】全屏造成 40% 主招10秒电伤，向队长强力拉拢非BOSS敌人（250）并减速 50%（2秒）。'],
   cost:['地面属性承伤 +60%；位移冷却 +25%。'],
   five:['队员距队长220半径内时，每秒自动电击200内最近敌人（3% 主招10秒电伤）。'],
   eight:['拦截敌方弹幕时，为全队提供 2 点白盾（3秒）。']
  },
  en:{
   base:['XP pickup radius ×2.5; Orbit count +1; +2.5% Orbit damage per 50px radius (max +35%).'],
   active:['Magnet Storm: Full-screen 40% Electric blast pulling non-bosses (250) and slowing 50% (2s).'],
   cost:['Ground damage taken +60%; Dash cooldown +25%.'],
   five:['Allies within 220px of captain zap nearest foe (200px) every 1s for 3% Electric damage.'],
   eight:['Intercepting shots grants 2 white shield (3s) to all allies.']
  }
 },
 83:{
  zh:{
   base:['近战暴击率 +35%、半径 +40%。'],
   active:['【大葱破星】全屏前方必暴格斗斩击（65% 主招10秒斗伤），清除前方敌人护盾。'],
   cost:['非暴击伤害 -20%；生命 -15%。'],
   five:['每 3 秒自动格挡 1 次来自正面的近战接触攻击。'],
   eight:['近战暴击与主动Z使敌人易伤 +25%（2–3秒）。']
  },
  en:{
   base:['Melee crit +35%, range +40%.'],
   active:['Meteor Thrust: Full-screen frontal guaranteed-crit Fighting slash (65% damage) that breaks shields.'],
   cost:['Non-crit damage -20%; Max HP -15%.'],
   five:['Automatically parries 1 frontal contact attack every 3s.'],
   eight:['Melee crits and Manual Z apply +25% vulnerability (2–3s).']
  }
 },
 84:{
  zh:{
   base:['投射物数量 +1；基础移速转化为投射物伤害（每10点移速 +10%，上限 +40%）。'],
   active:['【三首齐射】全队连续3轮各射出3发弹幕（每发 10% 主招10秒伤），同时移速 +30%（4秒）。'],
   cost:['特防 -25%；减速与减攻持续时间 +30%。'],
   five:['受伤后的 3 秒内，移速 +30%。'],
   eight:['每第 3 次招式命中额外附加 20% 该次伤害的直伤追击。']
  },
  en:{
   base:['Projectile count +1; base Speed boosts Projectile damage (+10% per 10 Speed, max +40%).'],
   active:['Triple Volley: Team fires 3 waves of 3 projectiles (10% each) and gains +30% Speed (4s).'],
   cost:['Sp. Def -25%; slow & attack-debuff duration +30%.'],
   five:['Speed +30% for 3s after taking damage.'],
   eight:['Every 3rd move hit deals +20% bonus direct damage.']
  }
 },
 86:{
  zh:{
   base:['火、冰属性承伤 -40%；能量柱命中减速 80%（1秒）并有 15% 概率定身 0.7 秒。'],
   active:['【极光射线】宽100全屏冰柱（55% 主招10秒冰伤，定身1秒），沿途留下5段4秒冰路（每0.5秒 2% 冰伤，减速60%）。'],
   cost:['晴天承伤 +25%；能量柱冷却 +15%。'],
   five:['每场战斗开局强制召唤降雪天气。'],
   eight:['命中冻结/定身且生命低于 20% 的普通敌人时直接处决。']
  },
  en:{
   base:['Fire & Ice damage taken -40%; Beams slow 80% (1s) with 15% chance to stun 0.7s.'],
   active:['Polar Beam: Wide Ice beam (55% damage, 1s stun) leaving 5 four-second ice patches (2% Ice/0.5s, 60% slow).'],
   cost:['Damage taken +25% in Sun; Beam cooldown +15%.'],
   five:['Forces Snow weather at battle start.'],
   eight:['Executes stunned/frozen normal foes below 20% HP.']
  }
 },
 88:{
  zh:{
   base:['队长周身120半径毒环每0.5秒对敌人施加 1 层中毒。'],
   active:['【剧毒喷发】引爆全场所有中毒敌人：消耗1层毒，造成 8% 当前生命（精英/BOSS封顶30%主招10秒伤）+ 10% 主招10秒毒伤并定身 1.5 秒。'],
   cost:['移速 -25%；禁止学习【位移】招式。'],
   five:['受近战接触时在脚下生成3秒半径60毒池（每0.5秒 2% 毒伤，减速30% + 1层中毒）。'],
   eight:['站在己方毒池内时，全伤害 +20%。']
  },
  en:{
   base:['120px aura around captain applies +1 Poison every 0.5s.'],
   active:['Toxic Eruption: Detonates all poisoned foes (-1 stack) for 8% current HP (capped vs elites/bosses) + 10% Poison damage and 1.5s stun.'],
   cost:['Speed -25%; bans Dash moves.'],
   five:['Contact hits drop a 3s poison pool (r=60, 2% Poison/0.5s, 30% slow + 1 Poison).'],
   eight:['Damage +20% while standing inside a poison pool.']
  }
 },
 90:{
  zh:{
   base:['投射物数量 +1；物防 +40%。'],
   active:['【破壳强袭】持续 5 秒：双攻 +50%、移速 +30%、投射物频率 +50%，但物防 -35%。'],
   cost:['施放主动Z后的 7 秒内，输出 +20%、承伤 +30%。'],
   five:['受击每 2 秒向四周发射 6 枚冰刺（各 20% 伤害）。'],
   eight:['每第 5 次招式命中必定暴击。']
  },
  en:{
   base:['Projectile count +1; Defense +40%.'],
   active:['Shell Smash (5s): Attack & Sp. Atk +50%, Speed +30%, Projectile rate +50%, Defense -35%.'],
   cost:['For 7s after Manual Z: damage +20%, damage taken +30%.'],
   five:['Fires 6 Ice shards (20% damage each) on hit taken (2s CD).'],
   eight:['Every 5th move hit is a guaranteed crit.']
  }
 },
 92:{
  zh:{
   base:['全队移动与投射物均可穿墙；远程承伤 -20%。'],
   active:['【幽冥影球】发射缓慢巨型暗影球（60% 主招10秒幽伤，穿透6），前方生成3秒半径180暗影场（每0.5秒 4% 幽伤，拉拢120，定身0.5秒）。'],
   cost:['生命 -25%；物防 -30%。'],
   five:['攻击带异常状态的敌人时，伤害 +25%。'],
   eight:['击杀敌人后获得 0.3 秒短暂无敌。']
  },
  en:{
   base:['Team and Projectiles phase through walls; ranged damage taken -20%.'],
   active:['Shadow Ball: Slow piercing Ghost orb (60% damage, 6 pierce) + 3s shadow field (r=180, 4% Ghost/0.5s, 120 pull, 0.5s stun).'],
   cost:['Max HP -25%; Defense -30%.'],
   five:['Damage +25% vs enemies with status ailments.'],
   eight:['Grants 0.3s invulnerability on kill.']
  }
 },
 95:{
  zh:{
   base:['物防 +50%；近战半径 +60%；基础物防按 12% 转化为近战伤害（上限 +40%）。'],
   active:['【巨岩摆尾】全屏180°岩系横扫（65% 主招10秒岩伤，击退450），场边70%半径外非BOSS敌人额外承受 15% 岩伤。'],
   cost:['移速 -25%；位移射程 -30%；特殊承伤 +30%。'],
   five:['单次受伤不超过自身最大生命的 30%。'],
   eight:['施放近战后的 0.3 秒内，击落队长120半径内敌方弹幕。']
  },
  en:{
   base:['Defense +50%; Melee range +60%; converts 12% base Defense into Melee damage (max +40%).'],
   active:['Titan Tail: 180° full-screen Rock sweep (65% damage, 450 knockback); +15% Rock damage to non-bosses beyond 70% screen radius.'],
   cost:['Speed -25%; Dash range -30%; Special damage taken +30%.'],
   five:['Single-hit damage taken capped at 30% Max HP.'],
   eight:['Melee casts intercept enemy shots within 120px of captain for 0.3s.']
  }
 },
 96:{
  zh:{
   base:['光环半径 +50%；持有光环的队员每0.5秒有 15% 概率使150半径内敌人定身 0.5 秒。'],
   active:['【食梦盛宴】吞噬全场定身/冻结敌人的 30% 已损生命（精英/BOSS封顶30%主招10秒伤）+ 15% 超伤，将总伤害的 15% 平分治疗全队。'],
   cost:['移速 -20%；幽灵、恶属性承伤 +35%。'],
   five:['攻击定身敌人时，伤害 +20%。'],
   eight:['命中定身敌人每 2 秒为全招式回复 2 点 PP。']
  },
  en:{
   base:['Aura radius +50%; allies with Aura have 15% chance every 0.5s to stun foes within 150px (0.5s).'],
   active:['Dream Feast: Drains stunned/frozen foes for 30% missing HP (capped) + 15% Psychic damage; heals team for 15% of total dealt.'],
   cost:['Speed -20%; Ghost & Dark damage taken +35%.'],
   five:['Damage +20% vs stunned foes.'],
   eight:['Hitting stunned foes restores 2 PP to all moves (2s CD).']
  }
 },
 98:{
  zh:{
   base:['物攻 +30%；免疫敌方降攻效果。'],
   active:['【断头巨钳】230半径必暴水系重斩（60% 主招10秒水伤），处决生命低于 35% 的普通敌人（对BOSS追加 25% 水伤）。'],
   cost:['全招式冷却 +20%；禁止学习【能量柱】与【冲击波】。'],
   five:['近战命中获得 2.5% 最大生命白盾（4秒，上限40%）。'],
   eight:['主动Z处决敌人时，全队获得 4 秒近战移速加成状态。']
  },
  en:{
   base:['Attack +30%; immune to attack debuffs.'],
   active:['Guillotine: Guaranteed-crit Water slash (r=230, 60% damage); executes normal foes <35% HP (+25% Water vs bosses).'],
   cost:['All cooldowns +20%; bans Beam and Nova moves.'],
   five:['Melee hits grant 2.5% Max HP white shield (4s, cap 40%).'],
   eight:['Executing a foe with Manual Z grants the team 4s of melee haste state.']
  }
 },
 100:{
  zh:{
   base:['移速 +35%；位移冷却 -25%，每次位移追加3目标电链（30%伤害）。','每战每名队员1次致死保命并触发全屏爆发（30% 主招10秒伤，1秒定身）。'],
   active:['【过载雷爆】清除全屏敌弹，600距离电系冲刺（35% 电伤），0.3秒后原地280半径爆炸（40% 电伤，击退200，减速50%）。'],
   cost:['生命 -25%；站立超过 1 秒时每秒流失 0.5% 最大生命（不致死）。'],
   five:['施放位移时获得 0.25 秒无敌。'],
   eight:['移速再 +15%；主动Z额外授予全队 15% 最大生命白盾。']
  },
  en:{
   base:['Speed +35%; Dash CD -25% and fires a 3-target Electric chain (30%).','Once per battle per ally, survive lethal damage with a 30% full-screen blast (1s stun).'],
   active:['Overload: Clears shots, dashes 600px (35% Electric), then blasts 280px (40% Electric, 200 knockback, 50% slow).'],
   cost:['Max HP -25%; standing still >1s drains 0.5% Max HP/s (non-lethal).'],
   five:['Dashing grants 0.25s invulnerability.'],
   eight:['Speed +15%; Manual Z grants a 15% Max HP team shield.']
  }
 },
 102:{
  zh:{
   base:['陨石数量 +1；击杀有 30% 概率掉落治愈果（2秒冷却，场上上限6颗；拾取回 8% 已损血 + 1 PP）。'],
   active:['【丰收陨雨】重置全队陨石冷却；持续 4 秒陨石极速轰炸（间隔缩至0.15秒），半径 +50% 并附 1 秒定身。'],
   cost:['虫属性承伤 +60%；位移冷却 +30%。'],
   five:['拾取治愈果后的 3 秒内，移速 +20%。'],
   eight:['晴天时陨石数量再 +1。']
  },
  en:{
   base:['Meteor count +1; 30% kill chance to drop healing fruit (2s CD, max 6; restores 8% missing HP + 1 PP).'],
   active:['Harvest (4s): Resets team Meteor cooldowns; Meteors fire at 0.15s interval with +50% radius and 1s stun.'],
   cost:['Bug damage taken +60%; Dash cooldown +30%.'],
   five:['Picking up a fruit grants +20% Speed for 3s.'],
   eight:['+1 extra Meteor in Sun.']
  }
 },
 104:{
  zh:{
   base:['回旋宽度 +50%，折返命中拉回非BOSS敌人；受伤后的 3 秒内物攻 +10%。'],
   active:['【回力骨风】掷出穿透巨骨（45% 主招10秒地伤），清除全屏敌弹并使BOSS易伤 +25%（3秒）。'],
   cost:['特攻 -30%；耐力 -20%。'],
   five:['近战与回旋的暴击伤害提至 2倍。'],
   eight:['每战每名队员1次致死锁血并无敌 1.5 秒；回旋折返必定暴击。']
  },
  en:{
   base:['Boomerang width +50%, return hits pull non-bosses; +10% Attack for 3s after taking damage.'],
   active:['Bone Cyclone: Throws a piercing Ground bone (45% damage), clears shots, and adds +25% boss vulnerability (3s).'],
   cost:['Sp. Atk -30%; Stamina -20%.'],
   five:['Melee & Boomerang crit damage increased to 2×.'],
   eight:['Once per battle per ally, survive lethal damage (1.5s invulnerable); Boomerang return hits guaranteed crit.']
  }
 },
 108:{
  zh:{
   base:['免疫减速；近战半径 +80%，命中附带 30% 减速。'],
   active:['【巨舌横扫】全屏120°横扫（60% 主招10秒一般伤，定身2秒）并将全图非BOSS敌人拉向队长前方（180）。'],
   cost:['移速 -20%；全招式冷却 +15%。'],
   five:['近战命中时有 20% 概率使敌人定身 0.5 秒。'],
   eight:['生命 +20%；受接触伤害时反击攻击者 25% 所受伤害。']
  },
  en:{
   base:['Immune to slow; Melee range +80% and applies 30% slow.'],
   active:['Tongue Sweep: 120° full-screen Normal sweep (60% damage, 2s stun) pulling non-bosses forward (180).'],
   cost:['Speed -20%; all cooldowns +15%.'],
   five:['Melee hits have 20% chance to stun for 0.5s.'],
   eight:['Max HP +20%; reflects 25% of contact damage.']
  }
 },
 109:{
  zh:{
   base:['队长周身150半径毒气场每0.5秒施加 1 层中毒，并延迟非BOSS敌人弹幕/技能冷却 1 秒。'],
   active:['【毒气引爆】清除全屏敌弹，引爆所有中毒敌人（12% 当前生命封顶30%主招10秒伤 + 15% 主招10秒毒伤）。'],
   cost:['天气/环境持续承伤 +30%；特殊招式冷却 +15%。'],
   five:['免疫地面属性伤害。'],
   eight:['毒气场与光环半径 +50%（光环必附毒）；每战每名队员1次致死锁血并无敌 2 秒。']
  },
  en:{
   base:['150px gas aura applies +1 Poison every 0.5s and delays non-boss attacks by 1s.'],
   active:['Gas Detonation: Clears enemy shots and detonates all poisoned foes for 12% current HP (capped) + 15% Poison damage.'],
   cost:['Weather/environment DoT taken +30%; Special move cooldowns +15%.'],
   five:['Immune to Ground damage.'],
   eight:['Gas & Aura radius +50% (Aura adds Poison); once per battle per ally, survive lethal damage with 2s invulnerability.']
  }
 },
 111:{
  zh:{
   base:['受属性克制伤害 -25%；位移期间承伤 -35%。'],
   active:['【重装岩冲】清除全屏敌弹，750距离宽100岩系冲撞（70% 主招10秒岩伤，击退450）。'],
   cost:['移速 -25%；位移冷却 +25%；水、草属性承伤 +50%。'],
   five:['免疫电属性伤害，触发免疫后的 4 秒内物攻 +15%。'],
   eight:['每施放 4 次位移，自动发射 1 枚穿透岩石炮（60% 伤害、穿透2）。']
  },
  en:{
   base:['Super-effective damage taken -25%; take -35% damage while dashing.'],
   active:['Rock Rush: Clears shots and charges 750px (w=100, 70% Rock damage, 450 knockback).'],
   cost:['Speed -25%; Dash CD +25%; Water & Grass damage taken +50%.'],
   five:['Immune to Electric damage; absorbing Electric grants +15% Attack for 4s.'],
   eight:['Every 4th Dash fires a piercing Rock boulder (60% damage, 2 pierce).']
  }
 },
 114:{
  zh:{
   base:['自然回复速率 +75%；近战造成伤害的 4% 转为吸血（受3%/秒上限）。'],
   active:['【荆棘牢域】全场定身 2 秒并向队长拉拢（150），展开2秒全屏荆棘场（每0.5秒 8% 主招10秒草伤 + 拉拢100）。'],
   cost:['移速 -20%；火、冰属性承伤 +35%。'],
   five:['晴天时自然回复再 +50%、移速与敏捷 +20%。'],
   eight:['连续 5 秒未受伤后，自然回复翻倍且双防 +30%。']
  },
  en:{
   base:['Natural regen +75%; Melee leeches 4% of damage dealt.'],
   active:['Thorn Field: Stuns all foes 2s and pulls (150); creates a 2s full-screen thorn field (8% Grass/0.5s + pull).'],
   cost:['Speed -20%; Fire & Ice damage taken +35%.'],
   five:['In Sun: natural regen ×1.5, Speed & Agility +20%.'],
   eight:['After 5s undamaged: natural regen ×2 and Defense & Sp. Def +30%.']
  }
 },
 115:{
  zh:{
   base:['主体招式命中 0.12 秒后追加 35% 该次实际伤害的亲子回响。'],
   active:['【亲子狂怒】持续 4 秒：亲子回响伤害提至首段的 70%，全队移速 +30%。'],
   cost:['首段伤害 -10%；物理承伤 +20%。'],
   five:['每次亲子回响回复施法者 0.2% 最大生命（受3%/秒上限）。'],
   eight:['亲子回响有 20% 概率使目标定身 0.5 秒。']
  },
  en:{
   base:['Move hits trigger a 35% damage Parental Echo 0.12s later.'],
   active:['Parent Fury (4s): Echo increases to 70% of first hit and Speed +30%.'],
   cost:['First-hit damage -10%; physical damage taken +20%.'],
   five:['Each echo heals caster for 0.2% Max HP.'],
   eight:['Echoes have 20% chance to stun target for 0.5s.']
  }
 },
 116:{
  zh:{
   base:['全队暴击伤害提至 2.25倍；投射物与陨石暴击率 +25%。'],
   active:['【龙卷漩涡】在最高生命敌人处生成3秒大范围龙卷（每0.5秒 7% 龙伤 + 拉拢220），结束时300半径爆炸（35% 龙伤，定身1秒）。'],
   cost:['非暴击伤害 -15%；生命 -15%。'],
   five:['接触攻击我方的敌人附加 2 层中毒。'],
   eight:['雨天暴击率 +20%；暴击时有 25% 概率回复 1 点 PP。']
  },
  en:{
   base:['Team crit damage increased to 2.25×; Projectile & Meteor crit +25%.'],
   active:['Dragon Vortex: 3s vortex on highest-HP foe (7% Dragon/0.5s + 220 pull), ending in a 300px blast (35% Dragon, 1s stun).'],
   cost:['Non-crit damage -15%; Max HP -15%.'],
   five:['Contact attackers receive +2 Poison.'],
   eight:['+20% crit in Rain; 25% chance to restore 1 PP on crit.']
  }
 },
 118:{
  zh:{
   base:['免疫电属性伤害，触发免疫后 4 秒敏捷 +25%；对护盾伤害 +60%。'],
   active:['【金角穿刺】清除全屏敌弹，750距离水系贯穿冲锋（70% 主招10秒水伤，定身2秒）。'],
   cost:['特防 -25%；非雨天时草属性承伤 +35%。'],
   five:['位移结束后的 0.5 秒内，移速 +35%。'],
   eight:['位移命中生命低于 20% 的普通敌人时直接处决。']
  },
  en:{
   base:['Immune to Electric (+25% Agility for 4s on absorb); +60% damage to shields.'],
   active:['Golden Drill: Clears shots and charges 750px (70% Water damage, 2s stun).'],
   cost:['Sp. Def -25%; Grass damage taken +35% outside Rain.'],
   five:['Speed +35% for 0.5s after dashing.'],
   eight:['Dash executes normal foes below 20% HP.']
  }
 },
 120:{
  zh:{
   base:['己方环绕法球可击落碰撞到的敌方弹幕；攻击动作期间全伤害 +30%。'],
   active:['【八向极光】全队向八个方位各射出1道水/超能贯穿光柱（各 10% 主招10秒伤，减速50%）。'],
   cost:['生命 -20%；物防 -25%。'],
   five:['战斗胜利后全员回复 15% 已损生命，并清除减速与减攻状态。'],
   eight:['主动Z持续期间，全队暴击率 +25%。']
  },
  en:{
   base:['Allied Orbits destroy colliding enemy shots; +30% damage while attacking.'],
   active:['Eight Beams: Each ally fires 8 radial Water/Psychic beams (10% each, 50% slow).'],
   cost:['Max HP -20%; Defense -25%.'],
   five:['Post-battle: heal 15% missing HP and cleanse slow/attack debuffs.'],
   eight:['+25% team crit chance during Manual Z.']
  }
 },
 122:{
  zh:{
   base:['中性属性承伤 -20%；队长160半径光墙使敌弹减速 35%，进入50半径内直接清除。'],
   active:['【镜面反波】将全屏敌弹反射为追踪超能弹（无弹时改射6枚追踪弹），并震退240内敌人（15% 超伤，击退200）。'],
   cost:['物攻 -15%、特攻 -15%；全招式冷却 +10%。'],
   five:['免疫声波系伤害。'],
   eight:['持有白盾时每秒再生 1.5% 最大生命白盾；免疫减速。']
  },
  en:{
   base:['Neutral damage taken -20%; 160px barrier slows enemy shots 35% and erases them within 50px.'],
   active:['Mirror Wave: Reflects all enemy shots as homing Psychic bolts (or fires 6 bolts) and blasts 240px (15% Psychic, 200 knockback).'],
   cost:['Attack & Sp. Atk -15%; all cooldowns +10%.'],
   five:['Immune to sound damage.'],
   eight:['Shields regenerate 1.5% Max HP/s while active; immune to slow.']
  }
 },
 123:{
  zh:{
   base:['1—3级招式伤害 +35%；近战冷却 -20%。'],
   active:['【十字连斩】连续3段半径280必暴虫系横扫（各 25% 主招10秒虫伤，定身1秒），并削减280内敌人 35% 双防（3秒）。'],
   cost:['火属性承伤 +60%；禁止学习【冲击波】招式。'],
   five:['施放近战后的 1 秒内，移速 +25%。'],
   eight:['每次近战额外向前发出 2 道虫系剑气（各 15% 伤害、穿透1）。']
  },
  en:{
   base:['Lv.1–3 moves deal +35% damage; Melee cooldown -20%.'],
   active:['Cross Slash: 3 guaranteed-crit Bug slashes (r=280, 25% each, 1s stun) shredding 35% defenses (3s).'],
   cost:['Fire damage taken +60%; bans Nova moves.'],
   five:['Speed +25% for 1s after casting Melee.'],
   eight:['Melee casts launch 2 piercing Bug waves (15% damage each).']
  }
 },
 124:{
  zh:{
   base:['扇形射程 +40%，命中附带 40% 减速。'],
   active:['【恶魔霜吻】前方12发扇形冰息（50% 主招10秒冰伤），令前方120°敌人定身 2.5 秒，定身结束时追加 15% 当前生命冰伤（精英/BOSS封顶30%主招10秒伤）。'],
   cost:['物防 -30%；火、恶属性承伤 +35%。'],
   five:['免疫减速；降雪天气移速 +25%。'],
   eight:['免疫水属性伤害，触发免疫时将原伤害的 50% 转为治疗（受3%/秒上限）。']
  },
  en:{
   base:['Cone range +40% and applies 40% slow.'],
   active:['Frost Kiss: 12-shot Ice cone (50% damage); stuns foes in 120° arc for 2.5s, dealing 15% current HP Ice damage when stun ends (capped).'],
   cost:['Defense -30%; Fire & Dark damage taken +35%.'],
   five:['Immune to slow; Speed +25% in Snow.'],
   eight:['Immune to Water damage; heals 50% of absorbed Water damage.']
  }
 },
 125:{
  zh:{
   base:['免疫电属性伤害；触发电系免疫/蓄能叠层时每层敏捷 +6%（上限 +30%）。'],
   active:['【雷光连拳】8段快速电拳（各 6% 电伤）同步释放8次4目标电链（各 4.5% 电伤，定身0.4秒）。'],
   cost:['地面属性承伤 +40%；耐力 -20%。'],
   five:['受接触攻击时有 30% 概率使攻击者定身 0.75 秒。'],
   eight:['每次近战额外向250半径内释放2目标电链（20%伤害）。']
  },
  en:{
   base:['Immune to Electric; stacks +6% Agility per Electric Engine stack (max +30%).'],
   active:['Thunder Fists: 8 rapid Electric melee strikes (6% each) paired with 4-target chains (4.5% each, 0.4s stun).'],
   cost:['Ground damage taken +40%; Stamina -20%.'],
   five:['30% chance to stun contact attackers for 0.75s.'],
   eight:['Melee casts emit a 2-target Electric chain (20% damage, r=250).']
  }
 },
 126:{
  zh:{
   base:['投射物与陨石范围 +50% 并附 2 层灼伤；火属性招式伤害 +30%。'],
   active:['【大字爆炎】在目标处布下5座持续5秒的十字火阵（每0.5秒 2.5% 主招10秒火伤，击退50 + 1层灼伤）。'],
   cost:['雨天伤害 -25%；移速 -20%。'],
   five:['接触攻击我方的敌人附加 3 层灼伤。'],
   eight:['火属性投射物与陨石范围再 +15%。']
  },
  en:{
   base:['Projectile & Meteor radius +50% (+2 Burn); Fire move damage +30%.'],
   active:['Fire Cannon: 5 cross-shaped fire zones for 5s (2.5% Fire/0.5s, 50 knockback, +1 Burn).'],
   cost:['Damage -25% in Rain; Speed -20%.'],
   five:['Contact attackers receive +3 Burn.'],
   eight:['Fire Projectiles & Meteors gain an extra +15% radius.']
  }
 },
 127:{
  zh:{
   base:['每击杀1名敌人自身物攻 +1%（单场上限 +35%）；近战击退 +60%。'],
   active:['【巨钳投掷】抓取400内最近非BOSS敌人掷向前方引发250半径震爆（65% 主招10秒虫伤，定身2秒；无目标则原地200半径 35% 虫伤，定身1秒）。'],
   cost:['特防 -30%；火、飞、岩属性承伤 +25%。'],
   five:['攻击持有护盾的敌人时额外获得 +10% 穿甲。'],
   eight:['主动Z持续期间，全队暴击率 +25%。']
  },
  en:{
   base:['+1% Attack per kill (max +35%/battle); Melee knockback +60%.'],
   active:['Titan Throw: Hurls nearest non-boss within 400px for a 250px blast (65% Bug, 2s stun; or 200px 35% Bug if none).'],
   cost:['Sp. Def -30%; Fire, Flying & Rock damage taken +25%.'],
   five:['+10% armor penetration vs shielded foes.'],
   eight:['+25% team crit chance during Manual Z.']
  }
 },
 128:{
  zh:{
   base:['位移射程 +60%、伤害 +40%；单次受重击（≥20%最大生命）后 4 秒内伤害 +25%。'],
   active:['【狂牛践踏】清除全屏敌弹，发射3道宽80全屏幻影冲锋（各 24% 一般伤，击退300，定身1.5秒）。'],
   cost:['物理承伤 +30%；位移结束后的 0.5 秒内承伤 +20%。'],
   five:['每次位移威吓180内敌人，使其攻击降低 25%（2秒）。'],
   eight:['位移获得 0.25 秒无敌；主动Z对BOSS额外追加 20% 主招10秒一般伤。']
  },
  en:{
   base:['Dash range +60%, damage +40%; taking heavy hit (≥20% Max HP) boosts damage +25% for 4s.'],
   active:['Stampede: Clears shots and launches 3 wide Normal beams (24% each, 300 knockback, 1.5s stun).'],
   cost:['Physical damage taken +30%; +20% damage taken for 0.5s after dashing.'],
   five:['Dash intimidates foes within 180px (-25% attack for 2s).'],
   eight:['Dash grants 0.25s invulnerability; Manual Z deals +20% extra Normal damage to bosses.']
  }
 },
 129:{
  zh:{
   base:['鲤鱼王队长获得经验 +50%；进化为暴鲤龙后队长物攻 +40%。'],
   active:['【狂龙咆哮】全场敌人定身 1 秒、减速 50% 并降攻 30%（3秒）；全队 5 秒内物攻与移速 +40%。'],
   cost:['电属性承伤 +60%；暴鲤龙形态队长特防 -20%。'],
   five:['近战暴击每 1 秒触发100半径水波（5% 主招10秒水伤，击退80）。'],
   eight:['击败精英或BOSS时，立刻重置该击杀者全部招式冷却。']
  },
  en:{
   base:['Magikarp captain gains +50% XP; evolved Gyarados captain gains +40% Attack.'],
   active:['Dragon Roar: Stuns foes 1s, slows 50%, lowers attack 30% (3s); team gains +40% Attack & Speed for 5s.'],
   cost:['Electric damage taken +60%; Gyarados captain Sp. Def -20%.'],
   five:['Melee crits trigger a 100px water wave (5% Water, 80 knockback, 1s CD).'],
   eight:['Elite or Boss kills reset all cooldowns of the killer.']
  }
 },
 131:{
  zh:{
   base:['免疫水、冰属性伤害，触发免疫回复 15% 最大生命（受3%/秒上限）；队长200半径水幕削减敌弹 25% 伤害。'],
   active:['【乘风圣咏】清除全屏敌弹，令非BOSS敌人定身 2 秒，回复全队 8% 已损生命。'],
   cost:['移速 -25%；位移冷却 +25%。'],
   five:['单次受伤超过 20% 最大生命时，获得 15% 最大生命白盾（5秒）。'],
   eight:['能量柱命中冻结或定身敌人时，伤害 +60%。']
  },
  en:{
   base:['Immune to Water & Ice (heals 15% Max HP on absorb, capped at 3%/s); 200px water curtain reduces enemy shot damage by 25%.'],
   active:['Sea Hymn: Clears shots, stuns non-bosses 2s, heals team 8% missing HP.'],
   cost:['Speed -25%; Dash cooldown +25%.'],
   five:['Taking >20% Max HP in one hit grants a 15% Max HP shield (5s).'],
   eight:['Beams deal +60% damage to stunned or frozen foes.']
  }
 },
 132:{
  zh:{
   base:['开战自动复制双攻最高队员的主招式作为队长技能。'],
   active:['【量子回响】持续 4 秒：被复制队友每次施法时，队长免费同步施放一次 70% 威力的同款招式。'],
   cost:['队长最大生命 -30%；队长无法使用携带道具。'],
   five:['受接触攻击时有 35% 概率使攻击者定身 0.75 秒。'],
   eight:['主动Z持续期间，全队暴击率 +25%。']
  },
  en:{
   base:['Copies the highest-offense ally’s primary move at battle start.'],
   active:['Quantum Echo (4s): Whenever the copied ally casts, captain mirrors it for free at 70% power.'],
   cost:['Captain Max HP -30%; captain cannot use held items.'],
   five:['35% chance to stun contact attackers for 0.75s.'],
   eight:['+25% team crit chance during Manual Z.']
  }
 },
 133:{
  zh:{
   base:['本系招式伤害 +50%；受到与自身同属性的伤害 -2.5%。'],
   active:['【九彩新星】清除全屏敌弹，按队长首属性引爆全屏新星（60% 主招10秒伤；火附3灼伤、水冰减速60%、电超妖定身1.5秒）。'],
   cost:['非本系招式伤害 -35%、冷却 +20%。'],
   five:['受到属性克制伤害 -20%。'],
   eight:['施放主动Z后，全队获得 4 秒属性强化共振状态。']
  },
  en:{
   base:['STAB move damage +50%; same-type damage taken -2.5%.'],
   active:['Prism Nova: Clears shots and blasts full-screen (60% primary type: Fire +3 Burn, Water/Ice 60% slow, Electric/Psychic/Fairy 1.5s stun).'],
   cost:['Non-STAB damage -35%, cooldowns +20%.'],
   five:['Super-effective damage taken -20%.'],
   eight:['Manual Z triggers a 4s elemental surge state for the team.']
  }
 },
 137:{
  zh:{
   base:['击杀敌人后按目标双防自适应提升 35% 物攻或特攻（目标物防≥特防时升特攻，反之升物攻）。'],
   active:['【数据溢出】持续 3 秒：全图敌人与弹幕减速 60%，全队攻击必定暴击。'],
   cost:['格斗属性承伤 +40%；耐力 -15%。'],
   five:['投射物获得追踪转向能力。'],
   eight:['已激活下载状态时，每施放 4 次能量柱免费追加 1 道 30% 威力光束。']
  },
  en:{
   base:['Kills adaptively grant +35% Sp. Atk (if target Def≥SpDef) or +35% Attack (otherwise).'],
   active:['Data Overflow (3s): Slows all foes & enemy shots by 60%; all team attacks guaranteed crit.'],
   cost:['Fighting damage taken +40%; Stamina -15%.'],
   five:['Projectiles gain homing capability.'],
   eight:['Every 4th Beam while Download is active fires a free 30% power Beam.']
  }
 },
 138:{
  zh:{
   base:['单次受伤不超过最大生命的 35%；投射物数量 +1；地雷伤害 +30%。'],
   active:['【远古棘刺】全向发射 24 枚无限穿透且穿墙的岩石尖刺（各 6.5% 主招10秒岩伤，减速50%）。'],
   cost:['移速 -20%；草属性承伤 +60%。'],
   five:['受击每 2 秒向四周发射 4 枚岩刺（各 20% 伤害）。'],
   eight:['攻击带护盾敌人时额外削减等同该次伤害 20% 的护盾值。']
  },
  en:{
   base:['Single-hit damage taken capped at 35% Max HP; Projectile count +1; Mine damage +30%.'],
   active:['Ancient Spikes: Fires 24 wall-piercing Rock spikes radially (6.5% each, 50% slow).'],
   cost:['Speed -20%; Grass damage taken +60%.'],
   five:['Fires 4 Rock shards (20% each) on hit taken (2s CD).'],
   eight:['Hits on shielded foes strip an extra 20% of damage dealt from their shield.']
  }
 },
 140:{
  zh:{
   base:['近战暴击率 +25%，近战造成伤害的 5% 转为吸血（受3%/秒上限）。'],
   active:['【镰刃狂舞】队长获得 2 秒无敌并在周身240半径持续高速斩击（每0.5秒 12% 主招10秒水伤，击退100）。'],
   cost:['非雨天时全招式冷却 +15%；草属性承伤 +60%。'],
   five:['生命低于 40% 时，双防 +100%。'],
   eight:['雨天近战吸血额外 +5%（总 10%），移速 +30%。']
  },
  en:{
   base:['Melee crit +25%; Melee leeches 5% of damage dealt.'],
   active:['Scythe Dance (2s): Captain becomes invulnerable and slashes 240px around (12% Water/0.5s, 100 knockback).'],
   cost:['All cooldowns +15% outside Rain; Grass damage taken +60%.'],
   five:['Defense & Sp. Def +100% below 40% HP.'],
   eight:['In Rain: +5% extra Melee leech (10% total) and +30% Speed.']
  }
 },
 142:{
  zh:{
   base:['移速 +30%；免疫地面属性伤害；250半径内敌人攻击频率降低 35%。'],
   active:['【远古天陨】在敌群落下 8 枚半径145巨岩陨石（各 13% 主招10秒岩伤，定身1.5秒）。'],
   cost:['生命 -25%；冰、水、电、钢、岩属性承伤 +25%。'],
   five:['免疫反冲伤害。'],
   eight:['陨石数量 +1。']
  },
  en:{
   base:['Speed +30%; immune to Ground damage; foes within 250px attack 35% slower.'],
   active:['Ancient Meteors: Drops 8 boulders (r=145, 13% Rock each, 1.5s stun).'],
   cost:['Max HP -25%; Ice, Water, Electric, Steel & Rock damage taken +25%.'],
   five:['Immune to recoil damage.'],
   eight:['Meteor count +1.']
  }
 },
 143:{
  zh:{
   base:['生命 +60%；火、冰属性承伤 -35%。'],
   active:['【腹鼓重压】消耗全队当前 20% 生命（至少留1点），引爆全屏重压（35% 一般伤，定身2秒），随后 6 秒全队物攻 +80%。'],
   cost:['移速 -25%；格斗属性承伤 +40%。'],
   five:['每累计 20 击杀掉落 1 份米饭（每战上限2份，拾取回复 10% 最大生命）。'],
   eight:['每战每名队员1次致死保命，回复 40% 最大生命并无敌 1.5 秒。']
  },
  en:{
   base:['Max HP +60%; Fire & Ice damage taken -35%.'],
   active:['Belly Drum: Costs 20% current HP (min 1) for a 35% full-screen Normal slam (2s stun) and +80% team Attack for 6s.'],
   cost:['Speed -25%; Fighting damage taken +40%.'],
   five:['Drops rice every 20 kills (max 2/battle, restores 10% Max HP).'],
   eight:['Once per battle per ally, survive lethal damage with 40% Max HP and 1.5s invulnerability.']
  }
 },
 144:{
  zh:{
   base:['战斗常驻降雪天气；队长220半径霜环每0.5秒减速敌人 30% 并造成 1% 主招10秒冰伤。'],
   active:['【绝对暴雪】清除全屏敌弹，引爆全屏暴雪（65% 主招10秒冰伤，定身2.5秒），持续 2.5 秒期间全队必定暴击。'],
   cost:['岩属性承伤 +60%；位移冷却 +25%。'],
   five:['攻击冻结或定身敌人时，伤害 +20%。'],
   eight:['主动Z期间每秒回复全队 5% 最大生命（受3%/秒上限）。']
  },
  en:{
   base:['Permanent Snow in combat; 220px frost aura slows foes 30% and deals 1% Ice damage every 0.5s.'],
   active:['Blizzard: Clears shots, deals 65% Ice full-screen (2.5s stun); team attacks guaranteed crit for 2.5s.'],
   cost:['Rock damage taken +60%; Dash cooldown +25%.'],
   five:['Damage +20% vs stunned or frozen foes.'],
   eight:['Heals team 5% Max HP/s during Manual Z (subject to 3%/s cap).']
  }
 },
 145:{
  zh:{
   base:['战斗常驻雨天；电属性招式暴击率 +25%。'],
   active:['【雷霆天罚】依次降下 12 道半径100天雷（各 8% 主招10秒电伤，碎盾并定身2秒）。'],
   cost:['物防 -20%；冰、岩属性承伤 +35%。'],
   five:['受接触攻击时反击3目标电链（30%伤害）。'],
   eight:['主动Z持续期间，全队暴击率 +25%。']
  },
  en:{
   base:['Permanent Rain in combat; Electric move crit +25%.'],
   active:['Thunderstorm: Calls down 12 lightning bolts (r=100, 8% Electric each, breaks shields, 2s stun).'],
   cost:['Defense -20%; Ice & Rock damage taken +35%.'],
   five:['Contact hits retaliate with a 3-target Electric chain (30%).'],
   eight:['+25% team crit chance during Manual Z.']
  }
 },
 146:{
  zh:{
   base:['战斗常驻晴天；移动每0.5秒留下2秒火焰尾迹（每0.5秒 2.5% 火伤 + 1层灼伤）。','每战1次涅槃救援：致死时复活全队并各回复 25% 最大生命、无敌 2 秒，引发全屏 25% 火爆（+3灼伤）。'],
   active:['【不死鸟风暴】清除全屏敌弹，在所有灼伤敌人处引发半径100连环火爆（各 15% 火伤 + 2灼伤；无灼伤目标则全屏 40% 火伤 + 3灼伤）。'],
   cost:['岩属性承伤 +60%；雨天伤害 -25%。'],
   five:['接触攻击我方的敌人附加 3 层灼伤。'],
   eight:['火属性对灼伤敌人伤害 +50%；主动Z期间暴击率 +25%。']
  },
  en:{
   base:['Permanent Sun; moving drops 2s fire trails (2.5% Fire/0.5s, +1 Burn).','Once per battle: lethal hit revives team (+25% Max HP, 2s invulnerable) with a 25% full-screen Fire blast (+3 Burn).'],
   active:['Phoenix Storm: Clears shots and blasts every burned foe (r=100, 15% Fire + 2 Burn; or 40% full-screen + 3 Burn if none).'],
   cost:['Rock damage taken +60%; damage -25% in Rain.'],
   five:['Contact attackers receive +3 Burn.'],
   eight:['+50% Fire damage vs burned foes; +25% crit during Manual Z.']
  }
 },
 147:{
  zh:{
   base:['满血（≥99%）时受击减伤 45%；位移与近战范围 +50%。'],
   active:['【逆鳞狂潮】清除全队减速与减攻，持续 5 秒双攻 +50%、移速 +40% 且免疫减速。'],
   cost:['冰属性承伤 +60%；禁止学习【地雷】招式。'],
   five:['处于减速或减攻状态时，承伤 -40%。'],
   eight:['主动Z开启后的首 1 秒全队无敌。']
  },
  en:{
   base:['-45% damage taken at full HP (≥99%); Dash & Melee range +50%.'],
   active:['Outrage (5s): Cleanses slow/attack debuffs; grants +50% Attack & Sp. Atk, +40% Speed, and slow immunity.'],
   cost:['Ice damage taken +60%; bans Mine moves.'],
   five:['Take -40% damage while slowed or attack-debuffed.'],
   eight:['First 1s of Manual Z grants full team invulnerability.']
  }
 },
 150:{
  zh:{
   base:['特攻 +25%；全队主体攻击无视敌方 25% 双防。'],
   active:['【精神时停】悬停全屏敌弹并定身非BOSS敌人 2 秒，结束时反射全部敌弹并引爆全屏超伤（基础 30% + 每反射1弹 +1.5%，上限 +30%）。'],
   cost:['队员伤害 -15%；队长受幽灵、恶属性承伤 +40%。'],
   five:['全图敌人攻击频率降低 20%。'],
   eight:['每战每名队员1次致死保命（回复 40% 最大生命并无敌 1.5 秒）；主动Z期间暴击率 +25%。']
  },
  en:{
   base:['Sp. Atk +25%; team attacks ignore 25% enemy defenses.'],
   active:['Psychic Stop: Freezes enemy shots and stuns non-bosses for 2s, then reflects all shots and blasts full-screen (30% + 1.5% per shot, max +30%).'],
   cost:['Ally damage -15%; captain takes +40% Ghost & Dark damage.'],
   five:['All enemies attack 20% slower map-wide.'],
   eight:['Once per battle per ally, survive lethal damage (40% Max HP, 1.5s invulnerable); +25% crit during Manual Z.']
  }
 },
 151:{
  zh:{
   base:['技能修炼可学习全图鉴招式；敏捷 +30%；所有招式 PP 消耗 -1（最低0）。'],
   active:['【万物创世】重置全队冷却，持续 4 秒零 PP 消耗且全招式极速施法（最短间隔 0.15 秒）。'],
   cost:['生命 -20%；若自身仅携带单一属性招式，全伤害 -25%。'],
   five:['施放属性提升招式时，向队友同步 30% 增益效果（上限3层、5秒）。'],
   eight:['主动Z期间每 0.5 秒自动释放 1 轮8发多属性穿透冲击波（共6轮，各 2.5% 伤）。']
  },
  en:{
   base:['Skill training unlocks all moves; Agility +30%; all move PP costs -1 (min 0).'],
   active:['Genesis (4s): Resets team cooldowns; 0 PP cost and rapid casting (0.15s min interval).'],
   cost:['Max HP -20%; -25% damage if carrying moves of only 1 type.'],
   five:['Buff casts sync 30% of their effect to teammates (max 3 stacks, 5s).'],
   eight:['Manual Z fires 6 waves of 8 multi-type piercing Novas every 0.5s (2.5% each).']
  }
 }
};

let count=0;
for(const f of cfg.families){
 const entry=desc[f.root];
 if(!entry)throw Error('Missing Gen 1 polished description for root #'+f.root);
 f.description={
  zh:{
   base:entry.zh.base,
   active:[...entry.zh.active,zLine(f.charge.event)],
   cost:entry.zh.cost,
   five:entry.zh.five,
   eight:entry.zh.eight
  },
  en:{
   base:entry.en.base,
   active:[...entry.en.active,zLineEn(f.charge.event)],
   cost:entry.en.cost,
   five:entry.en.five,
   eight:entry.en.eight
  }
 };
 count++;
}
if(count!==74)throw Error('Expected 74 Gen 1 families, got '+count);
fs.writeFileSync(file,JSON.stringify(cfg,null,2)+'\n');
console.log('Polished descriptions for '+count+' Gen 1 captain families.');
