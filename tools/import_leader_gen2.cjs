/* Import the authored five-part text; mechanics remain explicit reviewed data. */
const fs=require('node:fs'),crypto=require('node:crypto');
const source=process.argv[2]||'C:/Users/Gugusb/.gemini/antigravity/worktrees/PokeSurvivor-Next/design_leader_pokemon_abilities/docs/LEADER_ABILITIES_GEN2.md';
const text=fs.readFileSync(source,'utf8'),profiles={};
function p(root,event,base={},cost={},five={},eight={}){profiles[root]={charge:{event,targetSeconds:60},active:{kind:'johto'+root,duration:4},base,cost,five,eight};}
p(152,'absorb',{johto:{aroma:180},},{stats:{spd:-.25},moves:{melee:{crit:-.3}}},{johto:{aromaSlow:.3}},{johto:{aromaPower:.4,aromaRegen:2}});
p(155,'novaKill',{moves:{nova:{radius:1.5}},johto:{eruption:.8}},{johto:{lowHealthCD:1.35}},{dashGuard:.4,johto:{dashSpark:true}},{immune:['fire'],johto:{eruptionFire:true}});
p(158,'meleeHit',{moves:{melee:{damage:1.5}},johto:{jaws:true}},{stats:{spa:-.5},sheerForce:true},{johto:{jawsCrit:.3}},{johto:{jawsHeal:.15}});
p(161,'dashCast',{stats:{spd:.35},moves:{dash:{range:1.6}},johto:{dashGuardExtra:.4}},{stats:{atk:-.1,spa:-.1}},{johto:{scoutCrit:.3}},{johto:{dodgeHeal:.05}});
p(163,'rangedHit',{moves:{projectile:{range:1.5},beam:{range:1.5}},johto:{tinted:true}},{stats:{hp:-.3},physicalIncoming:1.35},{slowImmune:true,johto:{controlImmune:true}},{firstHealthyCrit:true,johto:{healthyPen:.5}});
p(165,'meleeHit',{moves:{melee:{damage:1.5,cd:.7}},johto:{fistDefense:.25}},{stats:{defense:-.45},ban:['beam']},{johto:{nextFist:.35}},{johto:{cometShield:.2}});
p(167,'webHit',{johto:{web:true}},{stats:{spd:-.25},incomingTypes:{fire:1.5,flying:1.5}},{johto:{webCrit:.25}},{johto:{webLong:true}});
p(170,'chainHit',{immune:['electric'],johto:{glow:160,electricHeal:1}},{stats:{defense:-.35},incomingTypes:{ground:1.6}},{johto:{glowLure:true}},{johto:{glowChains:3}});
p(173,'cast',{stats:{spdef:.3},johto:{magicGuard:true}},{stats:{defense:-.35},ban:['melee']},{johto:{heavyFriend:.3}},{johto:{wishHeal:.2}});
p(174,'songHit',{johto:{song:150}},{stats:{spd:-.3},incomingTypes:{steel:1.5,poison:1.5}},{contactStun:.4},{stats:{hp:.5},johto:{balloonKnock:true}});
p(175,'stun',{johto:{serene:2,airStun:.4}},{stats:{atk:-.5},incomingTypes:{electric:1.4,ice:1.4}},{johto:{hurtGuard:.3}},{johto:{auraSphere:true}});
p(177,'meteorCast',{moves:{meteor:{damage:1.5}},slowImmune:true,johto:{magicBounce:true}},{stats:{hp:-.35,defense:-.4}},{hurtSpeed:.4},{johto:{futureStun:true}});
p(179,'cottonHit',{moves:{beam:{width:1.5}},johto:{cotton:200}},{stats:{spd:-.25},incomingTypes:{ground:1.6}},{contactStun:1.5},{johto:{beaconBalls:3}});
p(183,'meleeDashHit',{stats:{atk:1},moves:{dash:{speed:1.5}}},{stats:{spa:-.6},cooldown:1.3},{incomingTypes:{fire:.5,ice:.5}},{johto:{dragonSlayer:true}});
p(185,'meleeHit',{stats:{defense:.5},recoilImmune:true},{moves:{dash:{range:.6}},johto:{movingIncoming:1.35}},{hurtSpeed:.4},{deathGuard:1,johto:{sturdyReflect:2}});
p(187,'distance',{stats:{spd:.35},johto:{infiltrator:true,float:true}},{stats:{defense:-.4,spdef:-.4},incomingTypes:{ice:2}},{johto:{sunHaste:.4}},{johto:{cottonLeech:.25}});
p(190,'echoHit',{technician:1.6,echo:.3},{ban:['nova'],physicalIncoming:1.3},{moves:{dash:{cd:.65}}},{johto:{openingCrit:true}});
p(191,'beamHit',{johto:{solarPower:.6,solarBeam:true}},{johto:{sunDrain:.015},rainDamage:.5},{johto:{iceHaste:true}},{openingWeather:'sun',johto:{openingSun:20,solarCrit:true}});
p(193,'acceleration',{johto:{acceleration:.04}},{incomingTypes:{rock:2},johto:{openingIncoming:1.4}},{johto:{rangedSpeed:1.4,rangedCrit:.15}},{johto:{sonicTrue:true}});
p(194,'swampTime',{immune:['water'],johto:{unaware:true,mud:true}},{stats:{spd:-.3},incomingTypes:{grass:2}},{johto:{damp:true}},{johto:{mudHeal:.02,mudDefense:.4}});
p(198,'crit',{critMultiplier:2,johto:{teamCrit:.3}},{stats:{spdef:-.4},incomingTypes:{fairy:1.35,electric:1.35,ice:1.35,rock:1.35}},{moves:{buff:{cd:.5}}},{johto:{eliteAttack:.2}});
p(200,'statusHit',{groundImmune:true,statusDamage:2,johto:{float:true}},{stats:{hp:-.35},incomingTypes:{ghost:1.6,dark:1.6}},{contactStun:.5},{johto:{ghostBurn:true}});
p(201,'bloomHit',{johto:{runes:true}},{stats:{hp:-.35},johto:{onlyBloom:true}},{orbitIntercept:true,johto:{runeBlocks:4}},{johto:{runeArmor:.5,runeHaste:true}});
p(202,'hurtAmount',{deathGuard:1,johto:{shadowTag:true,counterCast:1,convertShield:.3}},{ban:['dash'],johto:{counterOnly:true}},{johto:{bossEncore:.4}},{johto:{counterPower:3,counterGuard:2}});
p(203,'beamHit',{johto:{armorTail:true,doubleBeam:true}},{incomingTypes:{bug:1.5,dark:1.5},stats:{stamina:-.25}},{counterSpikes:4},{johto:{ruminate:true}});
p(204,'mineTrigger',{stats:{defense:.7},moves:{mine:{poison:1,slow:.4}},deathGuard:1,deathNova:true},{stats:{spd:-.35},incomingTypes:{fire:2}},{slowImmune:true,johto:{weatherImmune:true}},{johto:{explosionReflect:true}});
p(206,'dashHit',{moves:{dash:{width:1.8}},johto:{critDouble:true,dashStun:1}},{stats:{spa:-.5},moves:{dash:{cd:1.3}}},{hurtSpeed:.5},{johto:{drillReturn:true}});
p(207,'heal',{johto:{poisonHeal:.03,float:true}},{incomingTypes:{ice:2,water:1.5}},{johto:{sandGuard:.25,sandSpeed:.35}},{johto:{toxicClaw:true}});
p(209,'meleeConeHit',{johto:{intimidate:.3,quickFeet:.5}},{stats:{spd:-.25},incomingTypes:{poison:1.5,steel:1.5}},{johto:{lethalShield:.3}},{johto:{playRoughCrit:true}});
p(211,'poisonStack',{moves:{nova:{countFactor:1.5}},contactPoison:2,johto:{poisonNeedles:6}},{stats:{hp:-.35},incomingTypes:{ground:1.6}},{rainSpeed:.4,johto:{rainCD:.7}},{johto:{needlePuddle:true}});
p(213,'hurtCount',{stats:{defense:1.2,spdef:1.2,atk:-.6,spa:-.6}},{stats:{spd:-.4}},{hitCap:.3},{johto:{juice:true}});
p(214,'meleeHit',{shieldDamage:2,johto:{guts:.6}},{ban:['beam'],incomingTypes:{flying:2}},{johto:{meleeMoxie:.02}},{johto:{skillLink:true}});
p(215,'meleeCrit',{stats:{spd:.4},johto:{tripleSlash:true}},{stats:{hp:-.35},incomingTypes:{fighting:2}},{projectileTerrain:true,johto:{phaseAttacks:true}},{pressure:.5});
p(216,'meleeHit',{moves:{melee:{knock:2}},johto:{bearPower:1}},{noRegen:true,incomingTypes:{fighting:1.4}},{johto:{honey:.25}},{johto:{scrappy:true,bearGhostCrit:true}});
p(218,'burnStack',{contactBurn:3,movingTrail:'fire',fireTrailSlow:.4,johto:{magmaKnock:true}},{stats:{spd:-.35},incomingTypes:{water:2,ground:2}},{stats:{spdef:.3},johto:{iceImmune:true}},{johto:{magmaHaste:.5}});
p(220,'dashIceHit',{incomingTypes:{fire:.5,ice:.5},moves:{dash:{damage:1.6}},johto:{iceFront:true}},{incomingTypes:{fighting:1.4,grass:1.4,steel:1.4},johto:{notSnowSlow:.25}},{snowSpeed:.3,johto:{snowGuard:.25}},{attackDebuffImmune:true,johto:{mammothArmor:1}});
p(222,'hurtCount',{endCleanse:true,johto:{endMaxHeal:.25},physicalIncoming:.75},{stats:{spd:-.35},incomingTypes:{grass:2}},{johto:{coralWall:true}},{counterSpikes:8});
p(223,'rangedCrit',{critMultiplier:2.25,johto:{turretMode:true}},{johto:{movingDamage:.6}},{johto:{knockImmune:true}},{johto:{inkAmmo:true}});
p(225,'projectileCast',{johto:{presents:true}},{stats:{defense:-.35,spdef:-.35},incomingTypes:{rock:2}},{stats:{spd:.25},slowImmune:true,johto:{controlImmune:true}},{johto:{goldenGift:true}});
p(226,'absorb',{stats:{spdef:.8,spd:.3},johto:{tide:180,float:true}},{stats:{atk:-.4},incomingTypes:{electric:2}},{johto:{waterVeil:true}},{johto:{remoraid:true}});
p(227,'meleeHit',{stats:{defense:.8},deathGuard:1,johto:{steelSpikes:true}},{stats:{spd:-.25},incomingTypes:{fire:1.5,electric:1.5}},{ignoreDefenseBuffs:true},{johto:{steelReflect:.5}});
p(228,'burnStack',{immune:['fire'],johto:{flashSpa:.4,darkFire:true}},{rainDamage:.6,incomingTypes:{fighting:1.35,ground:1.35,rock:1.35,water:1.35}},{johto:{burnMeleeCrit:.3}},{johto:{hellSun:.4}});
p(231,'dashHit',{deathGuard:1,johto:{rollout:true}},{stats:{spdef:-.45},incomingTypes:{water:1.5,grass:1.5,ice:1.5}},{johto:{rollShield:.15}},{johto:{rollArmor:.4}});
p(234,'armorStack',{johto:{intimidate:.3,armorStack:.02}},{stats:{spd:-.25,spa:-.35}},{johto:{armorCrit:.3}},{johto:{barrierGuard:.5}});
p(235,'distinctKind',{allMoves:true,johto:{sketch:true},cooldown:.8},{captainHp:.75,johto:{captainAllStats:-.25}},{technician:1.5},{johto:{moody:true}});
p(236,'meleeHit',{stats:{atk:.4},johto:{tripleCombo:true}},{ban:['beam'],incomingTypes:{flying:1.4,psychic:1.4,fairy:1.4}},{johto:{defiant:.2}},{johto:{gyroStun:true}});
p(241,'dashHit',{johto:{scrappy:true,rollingPower:.3}},{johto:{rollingDecay:3}},{incomingTypes:{fire:.5,ice:.5}},{johto:{stompTrue:true}});
p(440,'heal',{stats:{hp:.8,spdef:.6},johto:{bliss:200}},{stats:{defense:-.5},incomingTypes:{fighting:1.8}},{endCleanse:true,johto:{endMaxHeal:.5}},{johto:{blissShield:true}});
p(243,'electricHit',{stats:{spd:.4},pressure:.5,moves:{chain:{range:1.8,count:2}}},{stats:{defense:-.35},incomingTypes:{ground:1.6}},{johto:{controlImmune:true,knockImmune:true}},{johto:{thunderBoss:true}});
p(244,'burnStack',{immune:['fire'],johto:{sacredFire:.5,flashAtk:.3}},{rainDamage:.6,incomingTypes:{ground:1.35,rock:1.35,water:1.35}},{johto:{globalSlow:.2}},{johto:{sacredFury:true}});
p(245,'beamHit',{stats:{spdef:.6},johto:{purifyingBeam:true}},{stats:{atk:-.4},incomingTypes:{electric:1.4,grass:1.4}},{slowImmune:true,johto:{controlImmune:true}},{frozenBeam:2});
p(246,'sandHit',{weather:'sand',stats:{atk:.5},johto:{sandArmor:.5,weatherImmune:true,sandDamage:true}},{stats:{spd:-.35},incomingTypes:{fighting:2}},{johto:{shedEvery:10}},{johto:{sandDouble:true,quakeBoss:true}});
p(249,'beamDashHit',{fullHpReduction:.5,moves:{beam:{crit:.4,critMul:2}}},{stats:{stamina:-.3},incomingTypes:{electric:1.35,ice:1.35,rock:1.35,ghost:1.35,dark:1.35}},{globalPressure:.25},{johto:{lowHeal:.4,aeroblastGuard:true}});
p(250,'burnStack',{stats:{spdef:.5},johto:{regenerator:true,allFireBurn:2,teamPhoenix:true}},{stats:{spd:-.2},incomingTypes:{rock:2}},{johto:{burnGuard:.3}},{johto:{sunFireCD:.6,burnRate:2}});
p(251,'cast',{cooldown:.75,johto:{timeAura:200,timeRewind:.3}},{stats:{atk:-.4},incomingTypes:{bug:2}},{endCleanse:true,johto:{endMaxHeal:.2}},{johto:{timeFury:true}});
const changes={
 161:[['降低 20%','降低 10%'],['延长 0.4 秒','最多延长0.4秒，且不超过本次实际冷却的90%']],
 201:[['“投射物”','“绽放”'],['除【觉醒力量】外无法装备任何常规伤害招式','只能装备绽放类伤害招式（冲击波 nova 与光环 aura），辅助增益招式仍可使用']],
 202:[['自身无法主动释放任何直接伤害招式','全队停止常规自动施法；每名成员受到直接攻击后，免费释放一次自身主招式，最短触发间隔1秒'],['全队所有招式的主动攻击面板为 0（必须完全依靠反弹与受创清算）','全队禁止常规自动施法，但保留受击反击技能与主动Z的正常伤害结算']],
 209:[['受到致死攻击前 0.5 秒获得 30% 白盾自保','判定受到致死攻击时，先获得30%最大生命白盾，再结算该次伤害；每名成员每场一次']],
 194:[['敌人身上的所有攻击力增益、防御强化或狂暴 Buff 在攻击全队或承受全队攻击时全部无效化（强制按敌方基础白值结算）','忽略敌方技能提供的临时攻击与防御增益；关卡超时激怒与阶段狂暴仍正常生效']],
 234:[['全队累积的全部防御力总和 100%','全队当前物防与特防总和的20倍（按本项目防御系数量纲换算）']],
 213:[['将全队超高的物理防御数值与攻击力数值**彻底瞬间对调**（持续 4 秒），期间全队攻击力暴增至 300%','以双方基础属性为基准交换物攻与物防的成长比例（持续4秒）；物攻最多为正常状态的3倍，避免直接交换不同量纲的面板数值']],
 225:[['获得 10 枚局内金币','获得1枚局内金币（全队每场礼物金币最多2枚；每2秒最多生成1份礼盒，地上最多6份）']],
 226:[['相当于自身特防数值 100% 的白盾','相当于15%最大生命加100%当前特防数值的白盾']],
 235:[['商店刷新时必定提供 1 个金色极品技能选项','每次技能修炼额外提供1个随机5级招式候选；队员更换技能后，可以立即选择1次专精，即使技能等级不足5级；仍每次事件只执行一项']],
 440:[['提升 **150%**','提升 **80%**'],['提升 **100%**','提升 **60%**'],['每秒恢复 2.5%','每秒恢复 1.5%'],['降低 **70%**','降低 **50%**'],['100% 特防白盾','20%最大生命白盾（每名成员最短触发间隔3秒）']],
 250:[['全队每 4 秒未承受攻击或脱战时，立即自动恢复 **33% 最大生命**','全队每名成员连续4秒未承受攻击时，恢复15%最大生命（每12秒最多触发一次）'],['并为全队回满 50% 生命，每场限 1 次','并为全队恢复50%最大生命，全队共享每场1次']]
};
const clean=s=>s.replace(/[（(]`[^`]+`[）)]/g,'').replace(/\*\*/g,'').replace(/`([^`]+)`/g,'$1').trim();
const families=[...text.matchAll(/^### #(\d+) (.+) \((.+) Family\)\s*\r?\n([\s\S]*?)(?=^### #|(?![\s\S]))/gm)].map(m=>{
 const root=+m[1],b=m[4],ls=b.split(/\r?\n/),core=ls.filter(l=>/^\s*>/.test(l)).map(l=>l.replace(/^\s*>\s*/,''));
 const source={base:core[0],active:core[1],cost:core[2],advances:ls.filter(l=>/Lv\.[58]/.test(l))};
 let fields=[source.base,source.active,source.cost,...source.advances];for(const [a,z]of changes[root]||[])fields=fields.map(s=>s.split(a).join(z));
 const effect=fields[1].replace(/^.*?后[，,]\s*/,'').replace(/^(?:下次[^【]*?)(?=【)/,'');
 const description={base:clean(fields[0]),active:'根据文档中的累计行为充能；常规构筑约60秒充满，最多保存1发，跨战保留。充满后按Z键或点击主动槽位手动释放：'+clean(effect),cost:clean(fields[2]).replace(/^代价[：:]\s*/,''),five:clean(fields[3]).replace(/^\s*\*\s*Lv\.5.*?[：:]\s*/,''),eight:clean(fields[4]).replace(/^\s*\*\s*Lv\.8.*?[：:]\s*/,'')};
 if(!profiles[root])throw Error('Missing explicit mechanics '+root);
 return {root,generation:2,members:[...ls.find(l=>l.includes('家族成员')).matchAll(/\((\d+)\)/g)].map(x=>+x[1]),id:b.match(/特性标识.*?`([^`]+)`/)[1],name:{zh:b.match(/特性名称\*\*\s*：\s*\*\*([^*]+)\*\*/)[1],en:b.match(/特性名称.*?\*\* \((.+)\)/)[1],es:b.match(/特性名称.*?\*\* \((.+)\)/)[1]},source,description:{zh:description},adjustments:changes[root]||[],...profiles[root]};
});
if(families.length!==55||Object.keys(profiles).length!==55)throw Error('Expected 55 Johto families');
fs.writeFileSync('config/leader_abilities_gen2.json',JSON.stringify({version:1,generation:2,sourceSha256:crypto.createHash('sha256').update(text).digest('hex'),families},null,2)+'\n');
console.log('Imported 55 explicit Johto profiles and full authored descriptions.');
