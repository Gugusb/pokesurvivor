/* Unova extends the existing field-ability hooks; all run/actor state is serializable. */
G.LeaderUnova=(()=>{
 const L=G.LeaderAbilities,H=G.LeaderSinnoh,Z=L._z,{actors,enemies,captain,state,own,shield,heal,direct,blast,stun,budget,synthetic,schedule,event,clearShots,pull,field}=Z;
 const active=()=>L.active()&&L.definition(captain()?.dex)?.generation===5,has=p=>active()&&Z.team(p),root=()=>L.definition(captain()?.dex)?.root,f=()=>L.profile()?.unova||{},c=()=>L.profile()?.sinnoh||{},now=()=>state()?.time||0,R=()=>G.Expedition.run;
 const s=()=>state().unova||={start:now(),kills:0,casts:0,resources:[],zToken:0},q=p=>p.unovaState||={lastHurt:now(),lastCast:now(),hurt:0,at:{},debt:{}};
 const wx=()=>G.Weather.current?.kind,t=()=>now()-(s().start||0),zOn=()=>active()&&state().z==='unova'+root()&&state().zUntil>now(),typed=m=>c().types?.includes(m?.type),wet=p=>p.inLiquid||wx()==='rain';
 const bad=p=>p.slowT>0||p.attackDebuffT>0||Object.values(p.actorStatus||{}).some(v=>v.left>0),controlled=e=>e.slowT>0||e.freezeT>0||e.classStunT>0||e.unovaParalyzedUntil>now(),allStats=['hp','atk','spa','defense','spdef','spd','agility','stamina'];
 const stream=m=>['projectile','cone'].includes(m?.kind),punch=m=>['karate-chop','body-slam','meteor-mash','fire-punch','ice-punch','thunder-punch','mach-punch','bullet-punch','drain-punch','hammer-arm','arm-thrust'].includes(m?.id),whip=m=>['vine-whip','power-whip','fire-lash','giga-drain'].includes(m?.id),wind=m=>m?.type==='flying'&&['projectile','cone','boomerang','beam'].includes(m.kind),needle=m=>['pin-missile','bullet-seed','rock-blast','tail-slap','barrage','spike-cannon'].includes(m?.id),sound=m=>['hyper-voice','boomburst','bug-buzz','echoed-voice','snarl','chatter','perish-song','disarming-voice','metal-sound','screech'].includes(m?.id);
 const melee=m=>['melee','dash'].includes(m?.kind),damaging=m=>m&&m.kind!=='buff',fusion=()=>H.fusion(),countType=type=>actors().reduce((n,p)=>n+p.moves.filter(m=>m.type===type).length,0),itemsOf=types=>actors().reduce((n,p)=>n+(G.STARTER_ITEMS||[]).filter(i=>types.includes(i.type)).reduce((n,i)=>n+G.Items.count(p,i.id),0),0);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),maxSquad=()=>G.ExpeditionSupplies?.maxHp(R())||100,squadRatio=()=>clamp(R().squadHp/Math.max(1,maxSquad()),0,1),captainRatio=()=>captain().hp/captain().maxHp;
 function proc(p,key,cd){const a=q(p);a.at||={};if((a.at[key]??-Infinity)>now())return false;a.at[key]=now()+cd;return true;}
 function eproc(e,key,cd){e.unovaAt||={};if((e.unovaAt[key]??-Infinity)>now())return false;e.unovaAt[key]=now()+cd;return true;}
 function charge(n=1){event('unovaAction',n);}
 function burst(p,n){if(p&&!p.dead&&n>0)p.heal(Math.min(n,p.maxHp-p.hp));}
 function teamHeal(n,missing=false){for(const p of actors())burst(p,(missing?p.maxHp-p.hp:p.maxHp)*n);}
 function echo(p,e,amount,type,opts={}){return direct(p,e,amount,type,{sinnohSecondary:true,unovaSecondary:true,...opts});}
 function areaEcho(p,x,y,r,amount,type,opts={}){for(const e of G.EnemyMgr.queryCircle(x,y,r))echo(p,e,amount,type,opts);G.FX.ring(x,y,5,r,G.U.TYPE_COLOR[type]||'#e1d7ff',.35,3);}
 function resetLongest(p,seconds=Infinity){const m=p.moves.filter(m=>m.t>0).sort((a,b)=>b.t-a.t)[0];if(m)m.t=Math.max(0,m.t-seconds);}
 function cleanse(){H.cleanse();}
 function actionMatch(kind,p,m,e,critical){const id=root();
  if(kind==='cast'&&id===498)return m.kind==='dash';
  if(kind==='cast')return [494,501,504,506,509,511,513,519,529,539,543,550,551,554,556,557,559,566,568,570,572,582,585,588,597,602,607,610,615,619,621,624,627,629,631,632,636,640,642,644,646,647].includes(id)?false:
   id===495?m.type==='grass':id===498?m.kind==='dash':id===515?m.type==='water':id===517||id===577||id===648||id===649||id===599?true:id===524?m.type==='rock':id===527?sound(m)||m.type==='psychic':id===531?false:id===532?false:id===535?['water','ground'].includes(m.type):id===540?['bug','grass'].includes(m.type):id===546?['grass','fairy'].includes(m.type):id===548?false:id===561||id===574||id===605?m.type==='psychic':id===580?['water','flying'].includes(m.type):id===587?m.type==='electric'||m.kind==='dash':id===590?m.type==='grass':id===594?false:id===595?m.kind==='mine':id===613?m.type==='ice':id===622||id===633||id===643?true:id===638?false:id===639?m.kind==='melee':id===641?m.type==='flying'||stream(m):id===645?m.type==='ground'||stream(m):false;
  if(kind==='hit')return id===494||id===519||id===566||id===570?critical:id===498?false:id===501||id===539||id===551||id===554||id===559||id===585||id===588||id===610||id===619||id===632||id===638?melee(m):id===504?['beam','projectile'].includes(m.kind):id===506||id===529||id===550?melee(m):id===509?m.kind==='melee':id===511?stream(m):id===532?m.kind==='melee':id===543?m.kind==='dash':id===548?m.kind==='orbit':id===556?needle(m)||stream(m):id===568?m.type==='poison':id===572?needle(m)||stream(m):id===595?m.type==='electric':id===602||id===642?m.type==='electric':id===607?e.boss:id===617?m.kind==='dash'||m.type==='water'&&stream(m):id===624?m.kind==='melee':id===631?m.type==='fire':id===644?m.type==='electric'||m.kind==='melee':id===646?['ice','dragon'].includes(m.type):false;
  if(kind==='hurt')return [517,524,557,577,590,594,597,621,629].includes(id)||id===531;
  if(kind==='kill')return [607].includes(id);
  return false;
 }
 function factor(p,key){if(!has(p))return 1;const a=f(),b=q(p),u=s(),capt=p===captain(),atk=['atk','spa'].includes(key),def=['defense','spdef'].includes(key);let n=1;
  if(capt){if(a.captainFour&&(atk||def))n*=a.captainFour;if(a.captainHp&&key==='hp')n*=a.captainHp;if(a.captainAtk&&key==='atk')n*=1+a.captainAtk;if(a.captainDefense&&key==='defense')n*=a.captainDefense;if(a.captainSpdef&&key==='spdef')n*=a.captainSpdef;if(a.captainSpeed&&key==='spd')n*=a.captainSpeed;}
  if(a.defeatist&&squadRatio()<(a.defeatistThreshold||.5)&&(atk||def))n*=.5;
  if(a.sunSpa&&wx()==='sun'&&key==='spa')n*=1+a.sunSpa;
  if(key==='atk'){
   if(a.fireSkillAttack)n*=1+Math.min(a.skillAttackCap||.36,countType('fire')*a.fireSkillAttack);if(a.burnAttack&&actors().some(p=>G.ActorStatus.active(p,'burn')))n*=a.burnAttack;
   if(a.gutsAttack&&actors().some(bad))n*=1+a.gutsAttack;
   if(a.killAtk)n*=1+Math.min(a.killAtkCap||.5,H.s().kills*a.killAtk);
   if(u.angerUntil>now())n*=1+(a.criticalAnger||0);
   if(u.darkBoostUntil>now())n*=1+(a.darkHitAttack||a.darkHitBoth||0);
   if(a.grassAbsorbAttack&&u.grassAttack)n*=1+a.grassAbsorbAttack;
   if(u.defiantUntil>now())n*=1+(a.defiant||0);
   n*=1+(R().unovaGrowth?.atk||0);
  }
  if(key==='spa'){
   if(a.contrary)n*=1+(u.contraryStacks||0)*.2;
   if(u.competitiveUntil>now())n*=1+(a.competitive||0);
   if(u.darkBoostUntil>now())n*=1+(a.darkHitBoth||0);
   if(a.dryCaptainSpa&&capt&&!wet(p))n*=a.dryCaptainSpa;
   if(a.zen&&u.zen&&capt)n*=2;
   if(u.postSpaUntil>now())n*=u.postSpa||1;
   if(u.danceUntil>now())n*=1.3;
   n*=1+(R().unovaGrowth?.spa||0);
  }
  if(a.quiverStep&&['spa','spdef','spd'].includes(key))n*=1+(u.quiver||0)*a.quiverStep;
  if(a.cosmicStep&&(atk||def))n*=1+(u.cosmic||0)*a.cosmicStep;
  if(a.stillDefense&&def&&own(p).stationary>=.5)n*=1+a.stillDefense;
  if(a.zen&&u.zen&&capt&&key==='defense')n*=1.8;
  if(a.physicalDefense&&key==='defense')n*=1+a.physicalDefense;
  if(a.sandSpdef&&key==='spdef'&&wx()==='sand')n*=1+a.sandSpdef;
  if(a.unfrozenDefense&&key==='defense'&&!enemies().some(e=>e.freezeT>0))n*=a.unfrozenDefense;
  if(a.openingDefense&&key==='defense'&&t()<5)n*=a.openingDefense;
  if(b.weakArmorUntil>now()&&key==='defense')n*=.9;
  if(u.shellUntil>now()){if(atk)n*=1.8;if(key==='defense')n*=.8;}
  if(u.contraryAtkUntil>now()&&key==='atk')n*=1.5;if(u.contrarySpeedUntil>now()&&key==='spd')n*=1.5;
  if(u.postDefUntil>now()&&def)n*=.8;
  if(b.breakUntil>now()&&def)n*=.85;
  if(u.coilUntil>now()&&def)n*=1.3;
  if(b.sealUntil>now()&&atk)n*=1.6;
  if(u.dragonDanceUntil>now()&&['atk','spd'].includes(key))n*=1+(u.dragonDance||0)*.15;
  if(a.meloetta){const form=R().unovaConfig?.meloetta||'song';if(form==='song'&&key==='spa')n*=1.35;if(form==='dance'&&key==='atk')n*=1.35;if(form==='dance'&&key==='spd')n*=1.3;}
  if(a.download&&(key==='atk'&&u.download==='physical'||key==='spa'&&u.download==='special'))n*=1.35;
  if(key==='spd'){
   if(a.speedStack)n*=1+Math.min(a.speedMax||10,Math.floor(t()/(a.speedEvery||3)))*a.speedStack;
   if(wx()==='sun')n*=1+(a.sunSpeed||0);if(wx()==='sand'||a.muddyDash&&p.inLiquid)n*=1+(a.sandSpeed||0);if(wx()==='rain')n*=1+(a.rainSpeed||0);
   if(a.drySpeed&&!wet(p))n*=a.drySpeed;
   if(a.dryGrassSpeed&&!p.inLiquid&&!G.World.propsInCircle(p.x,p.y,50).some(v=>v.type==='grass'))n*=a.dryGrassSpeed;
   if(wx()==='snow'&&a.snowSpeed)n*=a.snowSpeed;
   if(a.permanentTailwind)n*=1+a.permanentTailwind;
   if(a.unbrokenSpeed&&!(u.shellUntil>now()))n*=a.unbrokenSpeed;
   if(b.unburdenUntil>now())n*=1+(a.unburdenSpeed||0);
   if(b.electricUntil>now())n*=1+(a.electricSpeed||0);
   if(u.hitSpeed)n*=1+u.hitSpeed*(a.hitSpeed||0);
   if(b.weakArmorUntil>now())n*=1.4;
   if(u.tailwindUntil>now())n*=1+(u.tailwindSpeed||.4);
   if(u.critSpeedUntil>now())n*=1+(a.critSpeed||.2);
   if(u.danceUntil>now())n*=1.2;
   if(u.therian)n*=1.35;
   if(u.postSpeedUntil>now())n*=u.postSpeed||1;
   if(u.zen&&capt)n*=.8;
   if(b.sealUntil>now())n*=1.2;
  }
  return Math.max(.05,n);
 }
 function haste(p,m){if(!has(p))return 1;const a=f(),u=s(),b=q(p);let n=1;
  if(a.captainCD&&p===captain())n/=a.captainCD;if(a.dashCD&&m.kind==='dash')n/=a.dashCD;
  if(a.prankster&&(m.kind==='buff'||m.kind==='aura'||m.type==='flying'))n/=a.prankster;
  if(wx()==='sun'){n*=1+(a.sunHaste||0);if(a.sunCD)n/=a.sunCD;}
  if((wx()==='sand'||a.muddyDash&&p.inLiquid)&&melee(m))n*=1+(a.sandHaste||0);
  if(a.waterSkillCD)n/=1-Math.min(.4,countType('water')*a.waterSkillCD);
  if(a.steelSkillCD)n/=1-Math.min(.3,(countType('steel')+itemsOf(['steel']))*a.steelSkillCD);
  if(a.bugSteelItemHaste&&m.kind==='melee')n*=1+Math.min(a.itemHasteCap||.4,itemsOf(['bug','steel'])*a.bugSteelItemHaste);
  if(a.punchCD&&(punch(m)||m.kind==='melee'))n/=a.punchCD;
  if(a.hungryHaste&&!(u.foodUntil>now()))n*=a.hungryHaste;
  if(u.foodUntil>now())n*=1+(a.foodHaste||0);
  if(a.shurikenRate&&m.type==='water'&&stream(m))n*=a.shurikenRate;
  if(u.tailwindUntil>now())n*=1+(u.tailwindHaste||.25);
  if(u.gearUntil>now())n*=1.35;
  if(u.kickUntil>now()&&m.type==='fighting'&&m.kind==='melee')n*=1.4;
  if(u.aquaUntil>now())n*=1.4;
  if(b.sturdyUntil>now())n*=2;
  if(b.sealUntil>now())n*=1.4;
  if(a.iceRush){if(actors().some(p=>p.moves.some(m=>m.type==='ice'))||enemies().some(e=>e.freezeT>0))n*=1.25;if(now()-(u.freezeAt??u.start)>8)n*=a.noFreezeHaste||.8;}
  if(u.darkHasteUntil>now())n*=1+(a.darkHitHaste||0);
  if(b.fireRapidUntil>now())n=Math.max(n,Math.max(1,m.cd*p.cdMul/.15));
  return Math.min(n,Math.max(1,m.cd*p.cdMul/.15));
 }
 function adjustedCount(p,m,ratio,plus=0){const a=q(p),key=m.id+':'+(m.unovaSerial||0);a.countCache||={};if(a.countCache.key===key)return a.countCache.count;const debtKey=m.id+':shots',raw=Math.max(1,m.count||1)*ratio+plus+(a.debt?.[debtKey]||0),count=Math.floor(raw+1e-9);a.debt||={};a.debt[debtKey]=raw-count;a.countCache={key,count:Math.max(1,count)};return a.countCache.count;}
 function move(p,m){if(!has(p)||m.leaderGenerated)return m;const a=f(),n={...m},u=s();
  if(a.sheer){n.burn=n.poison=n.slow=n.freeze=n.stun=n.leaderStun=0;n.drain=0;}
  if(a.projectileSpeed&&n.speed&&['projectile','cone','boomerang'].includes(m.kind))n.speed*=a.projectileSpeed;
  if(a.dashSpeed&&m.kind==='dash')n.speed=(n.speed||600)*a.dashSpeed;
  if(a.narrowDash&&m.kind==='dash'&&G.World.propsInCircle(p.x,p.y,90).some(v=>v.solid))n.radius*=a.narrowDash;
  if(a.shortRange&&n.radius)n.radius*=a.shortRange;
  if(a.hitbox&&p===captain()){if(n.radius)n.radius*=a.hitbox;if(n.width)n.width*=a.hitbox;if(n.size)n.size*=a.hitbox;}
  if(a.waterWidth&&m.type==='water'){if(n.width)n.width*=a.waterWidth;if(n.size)n.size*=a.waterWidth;}
  if(a.allRange){for(const key of ['radius','width','life','range'])if(n[key])n[key]*=a.allRange;}
  if(a.soundArea&&sound(m)){if(n.radius)n.radius*=a.soundArea;if(n.life)n.life*=a.soundArea;}
  if(a.beamRange&&(m.kind==='beam'||stream(m))){if(n.radius)n.radius*=a.beamRange;if(n.life)n.life*=a.beamRange;if(n.pierce)n.pierce=Math.ceil(n.pierce*a.beamPierce);}
  if(a.windPierce&&wind(m))n.pierce=(n.pierce||0)+a.windPierce;
  if(a.whipRange&&whip(m)){if(n.radius)n.radius*=a.whipRange;if(n.life)n.life*=a.whipRange;}
  if(a.blizzardArea&&m.type==='ice'&&['meteor','nova','aura','cone'].includes(m.kind))n.radius=(n.radius||50)*a.blizzardArea;
  if(a.meleeAgility&&m.kind==='melee')n.unovaMeleeAgility=1+a.meleeAgility;
  if(a.mineArea&&m.kind==='mine'){n.radius*=a.mineArea;n.slow=Math.max(n.slow||0,a.mineSlow);}
  let ratio=1,extra=0;if(a.shots&&stream(m))ratio*=a.shots;if(a.needleQuantity&&(needle(m)||m.kind==='cone'))ratio*=a.needleQuantity;if(a.iceShots&&m.type==='ice'&&stream(m))ratio*=a.iceShots;if(a.orbitQuantity&&m.kind==='orbit')ratio*=a.orbitQuantity;if(a.typedExtraShots&&typed(m)&&m.damageClass==='special'&&n.count)extra+=a.typedExtraShots;
  if(ratio!==1||extra)n.count=adjustedCount(p,m,ratio,extra);
  if(a.skillLink&&needle(m))n.count=Math.max(5,n.count||1);
  if(a.meloetta&&R().unovaConfig?.meloetta!=='dance'&&sound(m))n.pierce=(n.pierce||0)+2;
  if(a.biteKnock&&m.kind==='melee')n.knock=Math.max(n.knock||0,a.biteKnock);
  if(a.knock)n.knock=(n.knock||0)*a.knock;
  if(a.lowFireTrue&&m.type==='fire'&&p.hp<p.maxHp*.35)n.leaderTrue=true;
  if(a.zen&&u.zen&&p===captain()&&m.kind!=='buff'){n.kind='beam';n.type='psychic';n.width=Math.max(n.width||0,70);n.radius=Math.max(n.radius||0,650);n.damageClass='special';n.count=1;}
  if(a.sheer)n.dmg*=1+a.sheer;
  return n;
 }
 function outgoing(p,e,m){if(!has(p)||m.unovaSecondary&&!m.unovaZ)return 1;const a=f(),u=s(),b=q(p);let n=1,base=1+(c().typeDamage||0);
  if(a.specialOnly&&m.damageClass!=='special'&&typed(m)||a.physicalOnly&&m.damageClass!=='physical'&&typed(m))n/=base;
  if(a.dragonOrMelee&&m.kind==='melee'&&!typed(m))n*=1.35;
  if(a.iceOrOrbit&&m.kind==='orbit'&&!typed(m))n*=1.3;
  if(a.physicalOrDash){if(typed(m)&&m.damageClass!=='physical'&&m.kind!=='dash')n/=base;else if(!typed(m)&&(m.kind==='dash'||m.damageClass==='physical'&&['normal','flying'].includes(m.type)))n*=1.35;}
  if(a.damage)n*=1+a.damage;if(a.captainDamage&&p===captain())n*=a.captainDamage;
  if(a.foulPlay&&m.id==='foul-play')n*=clamp((e.dmg||1)/Math.max(1,p.atk),.5,2);
  if(a.acrobatics&&(m.id==='acrobatics'||m.type==='flying'&&m.kind==='dash')&&!p.activeItem)n*=a.acrobatics;
  if(m.unovaBurnDot)n*=a.burnRate||1;
  if(m.damageClass==='physical'&&e.unovaPhysicalUntil>now())n*=1+(e.unovaPhysicalVulnerable||0);
  if(m.unovaDarkBoost)n*=1.5;
  if(m.type==='fire'&&u.fireAbsorbUntil>now())n*=1.2;
  if(a.fireStream&&m.type==='fire'&&stream(m))n*=1+a.fireStream;
  if(a.beamDamage&&(m.kind==='beam'||stream(m)))n*=1+a.beamDamage;
  if(a.meleePhysical&&m.kind==='melee'&&m.damageClass==='physical')n*=1+a.meleePhysical;
  if(a.punchDashDamage&&(punch(m)||m.kind==='dash'))n*=1+a.punchDashDamage;
  if(a.reckless&&m.kind==='dash')n*=a.reckless;
  if(a.waterAdapt&&m.type==='water'&&p.mon.types.includes('water'))n*=a.waterAdapt;
  if(a.technician){const def=G.Moves.instance(m.id,1);if(def.dmg<=20)n*=a.technician;}
  if(a.livingDamage)n*=1+Math.min(a.livingCap||.36,actors().filter(v=>v!==captain()&&!v.dead).length*a.livingDamage);
  if(a.speedDash&&m.kind==='dash')n*=1+Math.min(a.speedDashCap||.8,Math.max(0,p.spd/p.baseSpd-1)*a.speedDash);
  if(a.retaliate&&now()-b.lastHurt<=2)n*=1+a.retaliate;
  if(a.dreamDamage&&m.type==='psychic'&&controlled(e))n*=1+a.dreamDamage;
  if(a.poisonGround&&m.type==='ground'&&e.poison>0)n*=1+a.poisonGround;
  if(a.lowGrassDamage&&m.type==='grass'&&p.hp<p.maxHp*.35)n*=1+a.lowGrassDamage;
  if(a.lowWaterDamage&&m.type==='water'&&p.hp<p.maxHp*.35)n*=1+a.lowWaterDamage;
  if(a.wetFire&&m.type==='fire'&&['rain','snow'].includes(wx()))n*=a.wetFire;
  if(a.lowDragonDamage&&m.type==='dragon'&&p.hp<p.maxHp*.5)n*=1+a.lowDragonDamage;
  if(a.crossDamage&&m.id==='x-scissor')n*=1+a.crossDamage;
  if(a.burnedDamage&&e.burn>0)n*=1+a.burnedDamage;
  if(a.darkControlled&&m.type==='dark'&&controlled(e))n*=1+a.darkControlled;
  if(a.frozenDamage&&e.freezeT>0)n*=a.frozenDamage;
  if(a.soulCap&&['water','ghost'].includes(m.type))n*=1+Math.min(a.soulCap,u.souls||0);
  if(a.electricDamage&&m.type==='electric')n*=1+a.electricDamage;
  if(a.nonSteelDamage&&m.type!=='steel')n*=a.nonSteelDamage;
  if(a.slowerDamage&&e.spd*Math.max(.1,1-(e.slow||0))<p.spd)n*=1+a.slowerDamage;
  if(a.gyroSpeed&&m.id==='gyro-ball')n*=1+Math.min(a.gyroCap||.75,Math.max(0,1-p.spd/p.baseSpd)*a.gyroSpeed*10);
  if(a.meleeDamage&&m.kind==='melee')n*=a.meleeDamage;
  if(a.squadLowDamage&&typed(m))n*=1+Math.min(a.squadLowCap||.48,Math.floor((1-u.squadLow+1e-8)*10)*a.squadLowDamage);
  if(a.controlledDamage&&controlled(e))n*=1+a.controlledDamage;
  if(a.highHpDamage&&e.hp>e.maxHp*.7)n*=1+a.highHpDamage;
  if(a.wealthDamage)n*=1+Math.min(a.wealthCap||.4,Math.floor(R().gold/50)*a.wealthDamage);
  if(a.goldFire&&m.type==='fire')n*=1+Math.min(a.goldFireCap||.3,Math.floor(R().gold/50)*a.goldFire);
  if(a.fusionDamage&&(!a.fusionTypes||a.fusionTypes.includes(m.type)))n*=1+Math.min(a.fusionCap||.45,fusion()*a.fusionDamage);
  if(m.type==='electric'&&e.unovaConductUntil>now())n*=1+(e.unovaConduct||0);
  if(a.kyuremModes){const mode=R().unovaConfig?.kyurem;if(mode==='black'&&m.kind==='melee'&&m.damageClass==='physical'||mode==='white'&&m.kind==='beam'&&m.damageClass==='special')n*=1.4;}
  if(a.driveSuperDamage&&m.unovaZ&&m.type===R().unovaConfig?.drive&&G.Types.mult(m.type,e.types)>1)n*=1+a.driveSuperDamage;
  if(m.unovaSmelt)n*=1.5;if(u.nextDark&&m.type==='dark'&&!m.leaderGenerated)n*=1.5;
  if(a.fireResonance&&m.unovaZ&&countType('fire')>0)n*=1+(G.Abilities.critMultiplier(p)+L.critMultiplier(p,m)-1)*.35;
  if(a.electricResonance&&m.unovaZ&&countType('electric')>0)n*=1.5;
  return n;
 }
 function crit(p,m,e){if(!has(p))return 0;const a=f(),u=s();let n=(a.crit||0)-(a.critPenalty||0);
  if(a.healthyCrit&&squadRatio()>.5)return 1;
  if(a.meleeCrit&&m?.kind==='melee')n+=a.meleeCrit;
  if(a.kickCrit&&melee(m))n+=a.kickCrit;
  if(a.dashCrit&&m?.kind==='dash')n+=a.dashCrit;
  if(a.dryCritPenalty&&wx()!=='sand'&&wx()!=='rain')n-=a.dryCritPenalty;
  if(a.typedCrit&&typed(m))n+=a.typedCrit;
  if(a.breakCrit&&u.armorCritUntil>now())n+=a.breakCrit;
  if(a.fightSkillCrit&&m?.kind==='melee')n+=Math.min(.3,countType('fighting')*a.fightSkillCrit);
  if(a.dashCritFloor&&m?.kind==='dash')n=Math.max(n,a.dashCritFloor-(p.critChance||0));
  if(a.sunCritFloor&&wx()==='sun')n=Math.max(n,a.sunCritFloor-(p.critChance||0));
  if(a.needleCritFloor&&(needle(m)||stream(m)))n=Math.max(n,a.needleCritFloor-(p.critChance||0));
  if(a.hornCritFloor&&melee(m))n=Math.max(n,a.hornCritFloor-(p.critChance||0));
  if(a.flyingDashCrit&&m?.kind==='dash'&&m.type==='flying')n=Math.max(n,a.flyingDashCrit-(p.critChance||0));
  if(a.tailwindCrit&&(u.tailwindUntil>now()||a.permanentTailwind))n+=a.tailwindCrit;
  if(a.movingFlyingCrit&&p.walking&&m?.type==='flying')n+=a.movingFlyingCrit;
  if(a.shurikenCrit&&m?.type==='water'&&stream(m))n+=a.shurikenCrit;
  if(a.paralyzedCrit&&e?.unovaParalyzedUntil>now()&&m?.type==='electric')n+=a.paralyzedCrit;
  if(a.bossCrit&&e?.boss)n+=a.bossCrit;
  if(a.brokenCrit&&e&&(e.sinnohArmor>0||e.sinnohPhysicalArmor>0))return 1;
  if(a.meleeFrozenCrit&&m?.kind==='melee'&&e?.freezeT>0)return 1;
  if(a.statusCrit&&m?.type==='dark'&&controlled(e))return 1;
  if(a.illusion&&q(p).firstAttack&&m.unovaSerial===q(p).firstAttack)return 1;
  if(a.thunderWeb&&m?.id==='thunder'&&e?.unovaWebUntil>now())return 1;
  return n;
 }
 function critMultiplier(p,m,e){if(!has(p))return 1.5;const a=f();let n=a.critMul||1.5;
  if(m?.kind==='melee')n=Math.max(n,a.meleeCritMul||1.5);if(m?.kind==='dash')n=Math.max(n,a.dashCritMul||1.5);
  if(a.typedCritMul&&typed(m))n=Math.max(n,a.typedCritMul);
  if(a.illusion&&q(p).firstAttack===m?.unovaSerial)n=Math.max(n,a.illusionCritMul||2.8);
  if(a.skillCritDamage)n+=Math.min(.6,countType('fire')*a.skillCritDamage);
  if(a.bossCritMul&&e?.boss)n=Math.max(n,a.bossCritMul);
  if(a.paralyzedCritMul&&e?.unovaParalyzedUntil>now())n=Math.max(n,a.paralyzedCritMul);
  if(a.healthyPhysicalCritMul&&m?.damageClass==='physical'&&e?.hp>e?.maxHp*.5)n=Math.max(n,a.healthyPhysicalCritMul);
  if(a.frozenCritMul&&e?.freezeT>0)n=Math.max(n,a.frozenCritMul);
  if(a.lowSteelDarkSuper&&p.hp<p.maxHp*.3&&typed(m))n=Math.max(n,3);
  return n;
 }
 function typeFactor(p,type,e,k,m){if(!has(p))return k;const a=f();if(a.scrappy&&type==='normal'&&k===0&&e.types.includes('ghost'))k=G.Types.mult(type,e.types.filter(t=>t!=='ghost'))||1;
  if(a.tinted&&k>0&&k<1)k=Math.min(1,k*2);
  if(a.freezeDry&&type==='ice'&&e.types.includes('water'))k=2;
  if(a.universalConduct){if(k>0&&e.unovaParalyzedUntil>now())k+=.5;if(type==='electric'&&k===1)k=1.6;}
  const superType=a.superTypes?.includes(type)||a.fightSuper&&type==='fighting'||a.darkSuper&&type==='dark'||a.fireSuper&&type==='fire'||a.flyingSuper&&type==='flying'||a.groundSuper&&type==='ground'||a.iceSuper&&type==='ice'||a.driveSuper&&[...(c().types||[]),R().unovaConfig?.drive].includes(type)||a.danceSuper&&s().danceUntil>now()&&typed({type})||a.lowSteelDarkSuper&&p.hp<p.maxHp*.3&&typed({type});
  if(k>1&&superType)k=Math.min(3,k*1.5);return k;
 }
 function enemyDefense(p,e,m,value){if(!has(p))return value;const a=f();let v=value;if(a.weakDefense&&m.id==='psyshock')v=Math.min(e.defense||1,e.spdef||1);if(m.unovaPhysicalDefense)v=e.defense||1;
  const cut=Math.max(m.unovaArmor||0,a.physicalArmor&&m.damageClass==='physical'?a.physicalArmor:0);if(cut){const kind=m.damageClass==='physical'?'sinnohPhysicalArmor':'sinnohSpecialArmor',prior=Math.max(e.sinnohArmor||0,e.sinnohSoftUntil>now()?e.sinnohSoft||0:0,(!e[kind+'Until']||e[kind+'Until']>now())?e[kind]||0:0);v*=Math.max(.1,1-Math.max(cut,prior))/Math.max(.1,1-prior);}return Math.max(.05,v);
 }
 function beforeHurt(p,type,src){if(!has(p))return true;const a=f(),b=q(p),u=s();
  if(a.magicGuard&&['status','weather','environment','recoil'].includes(src.kind))return false;
  if(a.captainGroundImmune&&p===captain()&&type==='ground')return false;
  if([535,556].includes(root())&&type==='water')burst(p,src.rawAmount||0);
  if(a.grassAbsorbAttack&&type==='grass')u.grassAttack=true;
  if(a.electricSpeed&&type==='electric')for(const ally of actors())q(ally).electricUntil=now()+6;
  if(a.electricAbsorbHeal&&type==='electric'){if(proc(p,'absorbHeal',3))burst(p,p.maxHp*a.electricAbsorbHeal);return false;}
  if(a.fireAbsorbShield&&type==='fire'){shield(p,src.rawAmount||0);u.fireAbsorbUntil=now()+6;return false;}
  if(a.illusion&&b.concealed){b.concealed=false;b.lastHurt=now();b.breakUntil=now()+2;return false;}
  if(a.finalWeak?.[type])src.unovaWeak=a.finalWeak[type]/Math.max(.01,G.Types.mult(type,p.mon.types));
  if((a.darkHitAttack||a.darkHitBoth||a.darkHitHaste)&&type==='dark'){u.darkBoostUntil=u.darkHasteUntil=now()+6;}
  let dodge=0;if(!a.noDodge){if(a.movingDodge&&p.walking)dodge=Math.max(dodge,a.movingDodge);if(a.sunDodge&&wx()==='sun')dodge=Math.max(dodge,a.sunDodge);if(a.rainDodge&&wx()==='rain')dodge=Math.max(dodge,a.rainDodge);if(b.unburdenUntil>now())dodge=Math.max(dodge,a.unburdenDodge||0);if(b.leafDodgeUntil>now())dodge=Math.max(dodge,a.leafDodge||0);}
  if(dodge&&Math.random()<Math.min(.5,dodge)){if(a.leafDodge&&proc(p,'dodgeLeaf',.5)){const e=G.Projectiles.nearest(enemies(),p.x,p.y,300);if(e)echo(p,e,p.atk*1.2,'grass');}return false;}return true;
 }
 function incoming(p,n,type,src){if(!has(p))return n;const a=f(),b=q(p),u=s();n*=src.unovaWeak||1;
  if(a.unaware&&src.enemy?.skillAttackBuff>1)n/=src.enemy.skillAttackBuff;
  if(a.physicalReduction&&['contact','melee'].includes(src.kind))n*=1-a.physicalReduction;
  if(a.physicalIncoming&&['contact','melee'].includes(src.kind))n*=a.physicalIncoming;
  if(a.notMeleeIncoming&&!p.activeGroup().some(m=>melee(m)))n*=a.notMeleeIncoming;
  if(a.emptySoulIncoming&&!H.s().kills)n*=a.emptySoulIncoming;
  if(a.nearIncoming&&enemies().filter(e=>Math.hypot(e.x-p.x,e.y-p.y)<150).length>=3)n*=a.nearIncoming;
  if(a.stillIncoming&&!p.walking)n*=a.stillIncoming;
  if(a.lowIncoming&&p.hp<p.maxHp*.5)n*=a.lowIncoming;
  if(a.dashReduction&&b.dashUntil>now())n*=1-a.dashReduction;
  if(a.burnedEnemyAttackDown&&src.enemy?.burn>0)n*=1-a.burnedEnemyAttackDown;
  if(u.coilUntil>now())n*=.9;
  if(u.danceUntil>now()&&['ranged','projectile','beam'].includes(src.kind))n*=.75;
  if(u.zWindowIncoming&&state().zUntil>now())n*=u.zWindowIncoming;
  if(u.chargeUntil>now()&&p===captain())n*=1.25;
  if(a.absorbKinetic&&!['status','weather','environment'].includes(src.kind)){const saved=n*a.absorbKinetic;u.kinetic=Math.min(budget(captain()),(u.kinetic||0)+saved);n-=saved;}

  if((a.sturdy||a.fullSturdy)&&p.hp>1&&(!a.fullSturdy||p.hp>=p.maxHp-1e-6)&&n>=p.hp&&proc(p,'sturdy',10)){u.lethal=true;n=p.hp-1;b.sturdyUntil=now()+3;if(a.sturdyRage)p.invuln=Math.max(p.invuln,3);if(a.sturdyTeamGuard)for(const ally of actors())ally.invuln=Math.max(ally.invuln,a.sturdyTeamGuard);if(a.sturdyNova)areaEcho(p,p.x,p.y,Z.screenRadius(),Math.min(budget(p)*.3,n),'rock',{leaderStun:2});}
  if(a.noEnemyCrit&&src.critical)n/=src.critMultiplier||1.5;
  if(a.waterRing&&own(p).shield>0)n*=.95;
  if(a.ironWillShield&&own(p).shield>0)n*=.8;
  return n;
 }
 function hurt(p,n,type,src){if(!has(p)||!(n>0)||src.kind==='shared')return;const a=f(),u=s(),b=q(p);b.lastHurt=now();b.safeUsed=false;b.hurt++;u.hurt=(u.hurt||0)+1;if(actionMatch('hurt',p))charge([531,594].includes(root())?n/Math.max(1,p.maxHp)*5:1);
  if(a.crewHurtSoul&&proc(p,'soul',1))u.souls=Math.min(a.soulCap,(u.souls||0)+a.crewHurtSoul);
  if(a.kinetic)u.kinetic=Math.min(budget(captain()),(u.kinetic||0)+n*a.kinetic);
  if(src.critical&&a.criticalAnger)u.angerUntil=now()+6;
  if(a.weakArmor&&['contact','melee'].includes(src.kind))b.weakArmorUntil=now()+4;
  if(src.kind==='contact'&&src.enemy){const e=src.enemy;
   if(a.physicalReflect&&proc(p,'reflect',.75))echo(p,e,n*a.physicalReflect*(a.lowReflectDouble&&p.hp<p.maxHp*.5?2:1),'dragon');
   if(a.maxHpReflect&&proc(p,'barbs',.75))echo(p,e,H.fraction(p,e,a.reflectAdvance||a.maxHpReflect),'steel',{unovaBarbs:true});
   if(a.ownHpPoisonReflect&&proc(p,'poisonReflect',.75))areaEcho(p,p.x,p.y,100,p.maxHp*a.ownHpPoisonReflect,'poison');
   if(a.contactPoison)e.applyPoison(a.contactPoison,p,true);
   if(a.contactBurn&&Math.random()<a.contactBurn)e.applyBurn(2,p,true);
   if(a.contactParalysis&&Math.random()<a.contactParalysis){e.unovaPermanentSlow=.3;e.unovaParalyzedUntil=now()+1200;e.applySlow(.3,1200);}
   if(a.contactCharm&&Math.random()<a.contactCharm)stun(e,2);
   if(a.contactSpore){const roll=Math.floor(Math.random()*3);if(roll===0)e.applyPoison(3,p,true);else if(roll===1){e.applySlow(.5,3);e.unovaParalyzedUntil=now()+3;}else stun(e,2);}
   if(a.contactCounter&&Math.random()<a.contactCounter&&proc(p,'dogCounter',1))synthetic(p,'melee',{type:'normal',dmg:.5,radius:120});
   if(a.mummy){e.skillAttackBuff=e.skillSpeedBuff=1;e.skillReduction=0;e.shield=0;}
  }
  if(src.critical&&a.criticalDecoy&&proc(p,'decoy',8)){p.invuln=Math.max(p.invuln,1);const x=p.x-Math.cos(p.aim)*150,y=p.y-Math.sin(p.aim)*150;if(G.World.isFree(x,y,p.r)){p.x=x;p.y=y;}u.decoy={x:p.x,y:p.y,left:2};}
 }
 function status(p,kind,source){if(!has(p))return true;const a=f(),u=s();
  if(a.attackDebuffImmune&&kind==='attack'||a.rainImmune&&wx()==='rain'||a.mindImmune&&['stun','freeze'].includes(kind)||a.aquaDash&&u.aquaUntil>now()&&kind==='slow')return false;
  if(a.statusDodge&&Math.random()<a.statusDodge)return false;
  if(a.competitive&&['slow','attack'].includes(kind))u.competitiveUntil=now()+6;
  if(a.defiant&&['slow','attack'].includes(kind))u.defiantUntil=now()+6;
  if(a.contrary&&['slow','attack'].includes(kind)){u.contrarySpeedUntil=now()+5;if(kind==='attack')u.contraryAtkUntil=now()+5;return false;}
  if(a.synchronize){for(const e of enemies()){if(kind==='poison')e.applyPoison(3,p,true);else if(kind==='burn')e.applyBurn(2,p,true);else if(['slow','stun','freeze'].includes(kind))stun(e,1);} }
  return true;
 }
 function onCast(p,m){if(!has(p)||m.leaderGenerated)return;const a=f(),u=s(),b=q(p);m.unovaSerial=++u.casts;b.lastCast=now();b.safeUsed=false;b.castHit=false;
  if(b.concealed){b.concealed=false;b.firstAttack=m.unovaSerial;b.breakUntil=now()+2;}
  if(actionMatch('cast',p,m))charge();
  if(a.contrary&&m.id==='leaf-storm')u.contraryStacks=Math.min(4+(a.contraryExtra||0),(u.contraryStacks||0)+1);
  if(a.cosmicStep&&m.kind==='buff')u.cosmic=Math.min(a.cosmicCap,(u.cosmic||0)+1);
  if(a.quiverChance&&m.type==='grass'&&Math.random()<a.quiverChance)u.quiver=Math.min(a.quiverCap,(u.quiver||0)+1);
  if(a.unburdenSpeed)for(const ally of actors())q(ally).unburdenUntil=now()+3;
  if(a.tailwind&&m.id==='tailwind'){u.tailwindUntil=now()+6;u.tailwindSpeed=.4;u.tailwindHaste=.25;}
  if(a.waterCastShield&&m.type==='water')for(const ally of actors())shield(ally,p.maxHp*a.waterCastShield);
  if(a.recoil&&m.kind==='dash'&&!a.recoilImmune)p.hp=Math.max(1,p.hp-p.hp*a.recoil);
  if(m.kind==='dash'){b.dashUntil=now()+.6;if(a.dashGuard&&proc(p,'dashGuard',8))p.invuln=Math.max(p.invuln,a.dashGuard);}
  if(a.smeltResidue&&u.smelt){m.unovaSmelt=true;if(m.type==='fire')u.smelt=false;}else delete m.unovaSmelt;
  if(u.nextDark&&m.type==='dark'){m.unovaDarkBoost=true;u.nextDark=false;}
  if(a.lowRapidFire&&p.hp<p.maxHp*.4&&!b.rapidUsed){b.rapidUsed=true;b.fireRapidUntil=now()+3;}
  if(a.emptyMeleeRecoil&&m.kind==='melee'){const serial=m.unovaSerial;schedule(.1,()=>{if(q(p).lastHitSerial!==serial&&proc(p,'emptyMelee',1))p.hp=Math.max(1,p.hp-p.maxHp*a.emptyMeleeRecoil);});}
 }
 function hit(p,e,m,dealt,critical){if(!has(p)||!(dealt>0))return;const a=f(),u=s(),b=q(p);if(m.unovaZ){u.zHits||=[];if(!u.zHits.includes(e.id))u.zHits.push(e.id);if(a.kowtowShield&&u.zHits.length>=3&&!u.kowtowShield){u.kowtowShield=true;shield(captain(),captain().maxHp*.25);u.nextDark=true;}if(a.driveField&&m.type===R().unovaConfig?.drive&&proc(p,'driveField',.5))field(p,'unovaDrive',e.x,e.y,90,3,budget(p)*.008,m.type,{slow:m.type==='ice'?.5:0,burn:m.type==='fire'?1:0});}
  if(m.leaderGenerated||m.typeBondSecondary)return;b.lastHitSerial=m.unovaSerial;b.castHit=true;if(actionMatch('hit',p,m,e,critical))charge();
  if(a.hitSpeed)u.hitSpeed=Math.min(a.hitSpeedCap,(u.hitSpeed||0)+1);
  if(a.armorChance&&melee(m)&&Math.random()<a.armorChance){H.armor(e,a.armorCut,4,'physical');u.armorCritUntil=now()+3;}
  if(a.meleeArmor&&melee(m))H.armor(e,a.meleeArmor,4,'physical');if(a.meleeShieldCut&&melee(m))e.shield*=1-a.meleeShieldCut;
  if(a.poisonChance&&Math.random()<a.poisonChance)e.applyPoison(1,p,true);if(a.dashPoison&&m.kind==='dash')e.applyPoison(a.dashPoison,p,true);
  if(a.wallCrush&&(m.knock||0)>0&&eproc(e,'wallCrush',1)&&!G.World.isFree(e.x+Math.cos(p.aim)*50,e.y+Math.sin(p.aim)*50,e.r))echo(p,e,dealt*a.wallCrush,m.type);
  if(a.fireSplash&&m.type==='fire'&&proc(p,'fireSplash',.5))areaEcho(p,e.x,e.y,120,dealt*a.fireSplash,'fire');
  if(a.leafShield&&['leaf-blade','x-scissor'].includes(m.id)&&critical&&proc(p,'leafShield',1))for(const ally of actors())shield(ally,p.maxHp*a.leafShield);
  if(a.critTailwind&&critical){u.tailwindUntil=now()+3;u.tailwindSpeed=.4;u.tailwindHaste=.2;}
  if(a.critSpeed&&critical){u.critSpeedUntil=now()+3;}
  if(a.critBreak&&critical||a.shurikenCritBreak&&critical&&m.type==='water'&&stream(m))e.shield=0;
  if(a.windHighDouble&&critical&&wind(m)&&e.hp+dealt>e.maxHp*.8&&eproc(e,'windHigh',1))echo(p,e,dealt,m.type);
  if(a.meleeCritEcho&&critical&&m.kind==='melee'&&Math.random()<a.meleeCritEcho&&proc(p,'meleeEcho',1))echo(p,e,dealt*a.echoPower,m.type);
  if(a.needleArmor&&(needle(m)||stream(m)))H.armor(e,a.needleArmor,4,'physical');
  if(a.thunderWeb&&m.id==='thunder'&&e.unovaWebUntil>now()&&proc(p,'webThunder',.5))echo(p,e,dealt*.8,'electric');
  if(a.darkFlinch&&m.type==='dark'&&Math.random()<a.darkFlinch&&eproc(e,'darkFlinch',1))stun(e,1);
  if(a.electricParalysis&&m.type==='electric'&&eproc(e,'electricParalysis',1)){stun(e,.6);e.unovaParalyzedUntil=now()+3;}
  if(a.stenchChance&&Math.random()<a.stenchChance&&eproc(e,'stench',1))stun(e,.5);

  if(a.grassFruit&&m.type==='grass'&&Math.random()<a.grassFruit&&proc(p,'food',2))u.fruit=Math.min(4,(u.fruit||0)+1);
  if(a.pickpocket&&m.kind==='melee'&&Math.random()<a.pickpocket&&proc(p,'steal',1))u.stolenGold=Math.min(3,(u.stolenGold||0)+1);
  if(a.controlledHeal&&controlled(e)&&proc(p,'controlledHeal',.75)){for(const ally of actors()){heal(ally,ally.maxHp*a.controlledHeal);for(const move of ally.moves)move.t=Math.max(0,move.t-(a.controlledCD||0));}}
  if(a.highDefenseTrue&&m.type==='dragon'&&e.defense*100>50&&proc(p,'highDefense',.5))echo(p,e,Math.min(dealt*.5,(e.defense*100-50)*.5),'dragon');
  if(a.movingRefraction&&p.walking&&['beam','orbit'].includes(m.kind)&&proc(p,'refract',.5))for(const other of enemies().filter(v=>v!==e&&Math.hypot(v.x-e.x,v.y-e.y)<300).slice(0,2))echo(p,other,dealt,m.type);
  if(a.meleeFrozenCrit&&m.kind==='melee'&&e.freezeT>0&&a.iceFragments&&eproc(e,'iceFragments',1))for(let i=0;i<6;i++)synthetic(p,'projectile',{type:'ice',dmg:dealt*.1/Math.max(.1,p.spa),damageClass:'special',count:1,life:.6,speed:350,unovaSecondary:true},i*Math.PI/3);
  if(a.freezeDry&&m.type==='ice'&&e.types.includes('water')){e.leaderDamage=.8;e.leaderDamageUntil=now()+5;}
  const leech=(a.dreamLeech&&m.type==='psychic'&&controlled(e)?a.dreamLeech:0)+(a.lowGrassLeech&&m.type==='grass'&&p.hp<p.maxHp*.4?a.lowGrassLeech:0)+(a.seedLeech&&m.id==='leech-seed'?a.seedLeech:0)+(a.hornLeech&&melee(m)?a.hornLeech:0)+(u.kickUntil>now()&&m.kind==='melee'?.1:0)+(a.meloetta&&R().unovaConfig?.meloetta==='dance'&&m.kind==='melee'?.15:0);
  if(leech)heal(p,dealt*leech*(a.criticalLeechDouble&&critical?2:1));
 }
 function resource(kind,x,y){const u=s();u.resources||=[];if(u.resources.length>=24){collect(kind);return;}u.resources.push({kind,x,y,left:20});}
 function collect(kind){const u=s();u[kind]=(u[kind]||0)+1;if(kind==='scrap'&&proc(captain(),'scrapShield',2))for(const p of actors())shield(p,p.maxHp*.1,3);if(kind==='silver'){u.tailwindUntil=now()+3;u.tailwindSpeed=.1;u.tailwindHaste=0;}if(kind==='scrap')charge(.5);}
 function killed(e){if(!active()||!Z.team(e.lastAttacker))return;const a=f(),u=s(),p=e.lastAttacker,m=e.lastTypeBondAttack||{};u.kills++;
  if(actionMatch('kill',p,m,e))charge();
  if(a.crewHurtSoul&&p.dead)u.souls=Math.min(a.soulCap,(u.souls||0)+a.crewHurtSoul*2);
  if(a.criticalAnger&&e.elite&&a.eliteKillStacks)H.s().kills=Math.min(100,H.s().kills+a.eliteKillStacks);
  if(a.eliteGuard&&(e.elite||e.boss)&&proc(captain(),'eliteGuard',10))for(const ally of actors())ally.invuln=Math.max(ally.invuln,a.eliteGuard);
  if(a.economy==='scrap'&&u.kills%(a.scrapEvery||5)===0)resource('scrap',e.x,e.y);
  if(a.silverChance&&Math.random()<a.silverChance)resource('silver',e.x,e.y);
  if(a.economy==='scout'&&m.unovaZ)u.zGoldKills=Math.min(2,(u.zGoldKills||0)+1);
  if(a.economy==='smelter'&&(e.types.includes('bug')||e.types.includes('steel'))&&Math.random()<.4)u.smeltGold=Math.min(2,(u.smeltGold||0)+1);
  if(a.smeltResidue&&e.burn>0&&Math.random()<.5){u.smelt=true;u.smeltGold=Math.min(2,(u.smeltGold||0)+1);}
  if(a.fireKillHeal&&m.type==='fire')for(const ally of actors())heal(ally,ally.maxHp*a.fireKillHeal);
  if(a.reflectKillHeal&&m.unovaBarbs)for(const ally of actors())heal(ally,ally.maxHp*a.reflectKillHeal);
  if(a.burnKillHeal&&e.burn>0){for(const ally of actors())heal(ally,ally.maxHp*a.burnKillHeal);if(proc(captain(),'burnCD',1))for(const ally of actors())resetLongest(ally,a.burnKillCD||1);}
  if(a.burnKillSparks&&e.burn>0&&!m.leaderGenerated&&proc(p,'deathSparks',.5))for(let i=0;i<4;i++)synthetic(p,'projectile',{type:'fire',dmg:.15,count:1,life:.7,speed:300,unovaSecondary:true},i*Math.PI/2);
  if(a.orbitKillReset&&proc(p,'orbitKill',1)){for(const move of p.moves.filter(m=>m.kind==='orbit'))move.t=0;G.Projectiles.clearOrbs(p);}
  if(a.dashKillReset&&m.kind==='dash'&&proc(p,'dashKill',1))for(const move of p.moves.filter(m=>m.kind==='dash'))move.t=0;
  if(a.killCooldownReset&&Math.random()<a.killCooldownReset&&proc(p,'killReset',2))resetLongest(p);
  if(a.danceKillExtend&&u.danceUntil>now())u.danceUntil=Math.min(u.danceMax,u.danceUntil+a.danceKillExtend);
  if(a.killZRefund&&m.unovaZ&&!u.refunded){u.refunded=true;state().charge=Math.min(1,state().charge+a.killZRefund);}
  if(a.harvestKill&&m.unovaZ){for(const ally of actors())heal(ally,ally.maxHp*.01);if(Math.random()<.3)u.harvestGold=Math.min(2,(u.harvestGold||0)+1);}
  if(a.pluckKill&&m.unovaZ){if(Math.random()<.5)for(const ally of actors())heal(ally,ally.maxHp*.03);if(Math.random()<.2)u.harvestGold=Math.min(2,(u.harvestGold||0)+1);}
  if((e.elite||e.boss)&&(a.eliteAtkGrowth||a.eliteSpaGrowth)){R().unovaGrowth||={atk:0,spa:0};const key=a.eliteAtkGrowth?'atk':'spa';R().unovaGrowth[key]=Math.min(a.eliteGrowthCap||.2,R().unovaGrowth[key]+(a.eliteAtkGrowth||a.eliteSpaGrowth));}
 }
 function rescue(p,old){if(!has(p))return old(p);const a=f(),u=s(),b=q(p);u.lethal=true;
  if(a.teamRescue&&!u.teamRescued){u.teamRescued=true;p.hp=p.maxHp*a.teamRescue;p.dead=false;p.invuln=2;return true;}
  if(a.cleanseRescue&&!b.cleanseRescued){b.cleanseRescued=true;p.hp=p.maxHp*a.cleanseRescue;p.dead=false;p.invuln=2;cleanse();for(const e of enemies()){e.skillAttackBuff=e.skillSpeedBuff=1;e.skillReduction=0;}return true;}
  return old(p);
 }
 function start(){if(!active())return;state().unova={start:now(),casts:0,kills:0,hurt:0,resources:[],squadLow:squadRatio(),zToken:0};R().unovaConfig||={drive:defaults.drive,kyurem:'normal',meloetta:'song'};const a=f(),u=s();
  for(const p of actors()){p.unovaState={lastHurt:now(),lastCast:now(),at:{shed:now()+6,cleanse:now()+(a.cleanseEvery||5),ring:now()+3},debt:{},concealed:!!a.illusion};if(a.startShield)shield(p,p.maxHp*a.startShield);if(a.startReset)for(const m of p.moves)m.t=0;}
  if(R().unovaWealthShield)for(const p of actors())shield(p,p.maxHp*R().unovaWealthShield,120);
  if(a.permanentTailwind){u.tailwindUntil=now()+10000;u.tailwindSpeed=0;u.tailwindHaste=0;}
  u.foodUntil=R().unovaFoodReady?now()+6:0;R().unovaFoodReady=false;if(a.startFood)u.foodUntil=now()+6;
  if(a.download){const foes=[...enemies(),...(R().pendingSpawns||[]).map(w=>w.enemy)],sum=foes.reduce((v,e)=>({def:v.def+e.defense,spdef:v.spdef+e.spdef}),{def:0,spdef:0});u.download=sum.def<sum.spdef?'physical':'special';u.downloadScanned=foes.length>0;}
 }
 function tick(dt){if(!active()||R().phase!=='combat'||!(dt>0))return;const a=f(),u=s(),cp=captain();u.squadLow=Math.min(u.squadLow??1,squadRatio());if(u.decoy&&(u.decoy.left-=dt)<=0)delete u.decoy;
  if(a.zen){const ratio=captainRatio();if(!u.zen&&ratio<.5)u.zen=true;else if(u.zen&&ratio>.6)u.zen=false;if(u.zen){q(cp).nativeTypes||=[...cp.mon.types];cp.mon={...cp.mon,types:['fire','psychic']};}else if(q(cp).nativeTypes)cp.mon={...cp.mon,types:[...q(cp).nativeTypes]};}
  if(a.download&&!u.downloadScanned&&enemies().length){const sum=enemies().reduce((v,e)=>({def:v.def+e.defense,spdef:v.spdef+e.spdef}),{def:0,spdef:0});u.download=sum.def<sum.spdef?'physical':'special';u.downloadScanned=true;}
  if(a.therianRescue&&captainRatio()<.5&&!u.therianUsed){u.therianUsed=true;u.therian=true;u.therianHealUntil=now()+5;}if(u.therianHealUntil>now())for(const p of actors())heal(p,p.maxHp*.03*dt);
  for(const p of actors()){const b=q(p);if(p.dead)continue;const wanted=factor(p,'hp'),previous=p.unovaHpFactor||1;if(wanted!==previous){const ratio=p.hp/p.maxHp;p.maxHp=p.maxHp/previous*wanted;p.hp=p.maxHp*ratio;p.unovaHpFactor=wanted;}const ns=p.slowT>0&&!b.wasSlowed,na=p.attackDebuffT>0&&!b.wasWeakened;b.wasSlowed=p.slowT>0;b.wasWeakened=p.attackDebuffT>0;if(ns||na){if(status(p,ns?'slow':'attack',null)===false){p.slowT=0;p.attackDebuffT=0;p.attackDebuff=0;}}
   const quiet=now()-Math.max(b.lastCast,b.lastHurt)>=(a.regenQuiet||3);if(a.regenerator&&quiet&&!b.safeUsed){b.safeUsed=true;burst(p,p.maxHp*a.regenerator);}if(a.illusion&&quiet&&!b.concealed&&!b.illusionReady){b.concealed=true;b.illusionReady=true;}if(!quiet)b.illusionReady=false;
   if(a.shedChance&&proc(p,'shed',a.shedEvery||6)&&Math.random()<a.shedChance){G.ActorStatus.clear(p);burst(p,p.maxHp*.1);}
   if(a.cleanseEvery&&proc(p,'cleanse',a.cleanseEvery))G.ActorStatus.clear(p);
   if(a.waterRing&&proc(p,'ring',3)){burst(p,p.maxHp*.03);shield(p,p.maxHp*.03,3);}
   if(a.sealOverdrive&&p.hp<p.maxHp*.4&&!b.sealUsed){b.sealUsed=true;b.sealUntil=now()+10;shield(p,p.maxHp*.5,10);}
      if(a.lowBoneShield&&p.hp<p.maxHp*.5&&!b.boneUsed){b.boneUsed=true;shield(p,p.maxHp*clamp(p.defenseFor({kind:'contact'})/Math.max(.1,p.baseDefense)*.2,.1,.4));}
   if([615,622,627,636,640,647].includes(root())&&p===cp){const dx=p.x-(b.lastX??p.x),dy=p.y-(b.lastY??p.y);if(p.walking)charge(Math.hypot(dx,dy)/100);b.lastX=p.x;b.lastY=p.y;}

  }
  for(const r of [...u.resources]){r.left-=dt;if(actors().some(p=>!p.dead&&Math.hypot(p.x-r.x,p.y-r.y)<p.r+22)||r.left<=0){collect(r.kind);u.resources.splice(u.resources.indexOf(r),1);}}
  u.pulse=(u.pulse||0)+dt;if(u.pulse>=.5){u.pulse-=.5;pulse();}
 }
 function pulse(){const a=f(),u=s(),cp=captain();
  if(a.periodIntimidate&&t()>=(u.intimidateNext||0)){u.intimidateNext=t()+10;for(const e of enemies()){e.leaderDamage=1-a.periodIntimidate;e.leaderDamageUntil=now()+5;}}
  for(const e of enemies()){
   e.unovaBorn??=now();
   if(a.openingAttackDown&&now()-e.unovaBorn<8){e.leaderDamage=1-a.openingAttackDown;e.leaderDamageUntil=now()+.6;}
   if(a.openingSlow&&now()-e.unovaBorn<3)e.applySlow(a.openingSlow,.6);
   if(a.openingEliteCut&&e.elite&&!e.unovaOpeningCut&&(u.openingEliteCount||0)<3){e.unovaOpeningCut=true;u.openingEliteCount=(u.openingEliteCount||0)+1;echo(cp,e,H.fraction(cp,e,a.openingEliteCut),cp.mon.types[0]);}
   if(a.openingMagnet&&(e.elite||e.boss)&&!e.unovaOpeningMagnet&&(u.openingMagnets||0)<3){e.unovaOpeningMagnet=true;u.openingMagnets=(u.openingMagnets||0)+1;stun(e,2);H.armor(e,.3,4);}
   if(a.shadowTag)e.applySlow(.3,.7);
   if(a.globalSlow)e.applySlow(a.globalSlow,.7);
   if(a.dreamAura&&Math.hypot(e.x-cp.x,e.y-cp.y)<a.dreamAura&&Math.random()<a.dreamChance&&eproc(e,'dreamAura',1))stun(e,2);
   if(a.poisonAura&&Math.hypot(e.x-cp.x,e.y-cp.y)<a.poisonAura){e.applySlow(.35,.6);echo(cp,e,a.poisonAuraFlat*.5,'poison');}
   if(a.freezeDuration&&e.freezeT>0&&!e.unovaExtendedFreeze){e.unovaExtendedFreeze=true;e.freezeT*=a.freezeDuration;}if(e.freezeT<=0)e.unovaExtendedFreeze=false;
   if(e.freezeT>0){u.freezeAt=now();if(root()===582&&eproc(e,'freezeCharge',2))charge();}
   if(e.unovaDotUntil>now()&&eproc(e,'dot',.5))echo(cp,e,Math.min(e.unovaDotPower*.5,e.boss||e.elite?budget(cp)*.05:Infinity),e.unovaDotType||'fire');
   if(e.unovaMoveShockUntil>now()&&Math.hypot(e.x-(e.unovaShockX??e.x),e.y-(e.unovaShockY??e.y))>4&&eproc(e,'moveShock',.5))echo(cp,e,budget(cp)*.04,'electric');e.unovaShockX=e.x;e.unovaShockY=e.y;
  }
  if(a.trickRoomSlow&&actors().some(p=>p.moves.some(m=>m.id==='trick-room'))){for(const shot of G.Projectiles.all())if(!shot.friendly){const previous=shot.unovaSpeedScale||1,scale=1-a.trickRoomSlow;shot.vx*=scale/previous;shot.vy*=scale/previous;shot.unovaSpeedScale=scale;}}
  if(u.coilUntil>now())for(const e of G.EnemyMgr.queryCircle(cp.x,cp.y,100))echo(cp,e,cp.spa*.4,'electric');
 }
 function finish(){if(!active())return;const u=s(),a=f();u.finishedAt=now();u.healthy=actors().every(p=>!p.dead&&p.hp>=p.maxHp*.7);u.pokemonXp=R().pokemonXpGained||u.pokemonXp||0;u.resources=[];if(a.regenerator)teamHeal(a.regenerator);if(a.startFood||u.fruit)R().unovaFoodReady=true;if(a.shopHeal)R().unovaShopHeal=a.shopHeal;for(const p of actors())if(q(p).nativeTypes)p.mon={...p.mon,types:q(p).nativeTypes};H.s().unova={...u,resources:[]};}
 function afterFinish(){if(active())G.HoennMarket?.captureBattle({...H.s(),unova:{...s(),resources:[]}});}
 function draw(ctx){if(!active())return;for(const r of s().resources||[]){ctx.save();ctx.fillStyle=r.kind==='scrap'?'#bdd5cc':'#f5e6bc';ctx.strokeStyle='#3f6072';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(r.x-6,r.y-G.LIFT-5,12,10,3);ctx.fill();ctx.stroke();ctx.restore();}if(s().decoy){const d=s().decoy;ctx.save();ctx.globalAlpha=.4;ctx.fillStyle='#8c7cb9';ctx.beginPath();ctx.ellipse(d.x,d.y,20,30,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
 const defaults={drive:'water'};
 function configure(field,value){if(!['drive','kyurem'].includes(field)||!(field==='drive'?['water','electric','fire','ice']:['normal','black','white']).includes(value))return false;if(active()&&R().phase==='combat')return false;if(field==='kyurem'&&(!active()||root()!==646||R().trainerLevel<3))return false;defaults[field]=value;if(active()){R().unovaConfig||={};R().unovaConfig[field]=value;}return true;}
 function zBudget(e,amount,m){if(!active()||!m.unovaZ||!e.boss&&!e.elite)return amount;const token=s().zToken;e.unovaZBudget||={};const a=e.unovaZBudget;if(a.token!==token){a.token=token;a.used=0;}return Math.max(0,Math.min(amount,budget(captain())*.65-a.used));}
 const wrap=H.wrap;
 wrap('factor',(old,p,k)=>old(p,k)*factor(p,k));wrap('rate',(old,p,m)=>old(p,m)*haste(p,m));wrap('move',(old,p,m)=>move(p,old(p,m)));wrap('outgoing',(old,p,e,m)=>old(p,e,m)*outgoing(p,e,m));wrap('crit',(old,p,m,e)=>old(p,m,e)+crit(p,m,e));
 wrap('critMultiplier',(old,p,m,e)=>Math.max(old(p,m,e),critMultiplier(p,m,e||p?.target)-1.5));
 wrap('beforeHurt',(old,p,type,src)=>beforeHurt(p,type,src)&&old(p,type,src));wrap('incoming',(old,p,n,type,src)=>old(p,incoming(p,n,type,src),type,src));
 for(const [key,fn]of Object.entries({onCast,hit,hurt,killed}))wrap(key,(old,...args)=>{old(...args);fn(...args);});
 wrap('beginBattle',old=>{old();start();});wrap('tick',(old,dt)=>{old(dt);tick(dt);});wrap('finishBattle',old=>{finish();old();afterFinish();});wrap('rescue',(old,p)=>rescue(p,old));wrap('draw',(old,ctx)=>{old(ctx);draw(ctx);});
 wrap('ppCost',(old,p,m,n)=>has(p)&&f().lowFireFree&&m.type==='fire'&&p.hp<p.maxHp*.35?0:old(p,m,n));
 wrap('agility',(old,p,m)=>old(p,m)*(has(p)&&f().meleeAgility&&m?.kind==='melee'?1+f().meleeAgility:1));
 wrap('enemyTick',(old,e,dt)=>{old(e,dt);if(active()&&root()===513&&e.burn>0&&Z.team(e.burnOwner))charge(dt/.5);if(active()&&f().gravityField&&L.fields.some(v=>v.kind==='unovaGravity'&&Math.hypot(e.x-v.x,e.y-v.y)<v.r)){if(['dash','jump','leap'].includes(e.phase))e.phase='idle';if(e.ai&&['dash','jump','leap'].includes(e.ai.phase))e.ai.phase='idle';}});
 wrap('refreshCost',(old,n)=>active()&&f().oneGoldRefresh?1:Math.ceil(old(n)*(active()&&f().shopDiscount||1)));
 const oldBuff=G.Player.prototype.addBuff;G.Player.prototype.addBuff=function(stat,amount,dur,count){if(has(this)){if(f().contrary)amount=-amount;if(this===captain()&&f().captainNoDefenseBuff&&stat==='def'&&amount>0)return;}return oldBuff.call(this,stat,amount,dur,count);};
 const oldHurt=G.Enemy.prototype.hurt;G.Enemy.prototype.hurt=function(...args){const m=args[7]||{};const before=this.hp+(this.shield||0),result=oldHurt.apply(this,args);if(active()&&m.unovaZ&&this.unovaZBudget)this.unovaZBudget.used+=Math.max(0,before-this.hp-(this.shield||0));return result;};
 const oldProp=G.World.damageProp;G.World.damageProp=function(prop,...args){const alive=prop.hp>0,out=oldProp.call(this,prop,...args);if(active()&&alive&&prop.hp<=0){if(f().economy==='scrap')resource('scrap',prop.x,prop.y);if(f().silverChance&&Math.random()<f().silverChance)resource('silver',prop.x,prop.y);if(f().rockShards)areaEcho(captain(),prop.x,prop.y,100,budget(captain())*.02,'rock');}return out;};
 const oldRegen=G.Player.prototype.regenerate;G.Player.prototype.regenerate=function(dt){if(has(this)&&this===captain()&&f().noAllyHealing&&R().phase==='combat')return;return oldRegen.call(this,dt);};
 const oldHeal=G.Player.prototype.heal;G.Player.prototype.heal=function(amount){if(has(this)&&this===captain()&&f().noAllyHealing&&R().phase==='combat'&&!s().allowSelfHeal)return;const before=this.hp,result=oldHeal.call(this,amount);if(has(this)&&[531,594].includes(root())&&R().phase==='combat'&&this.hp>before)charge((this.hp-before)/Math.max(1,this.maxHp)*5);return result;};
 const oldEnemyHeal=G.Abilities.healEnemy;G.Abilities.healEnemy=(e,...args)=>active()&&f().enemyNoHeal?0:oldEnemyHeal(e,...args);if(G.BossCombat){const oldLeech=G.BossCombat.leech;G.BossCombat.leech=(e,...args)=>active()&&f().enemyNoHeal?0:oldLeech(e,...args);}
 const oldPermit=G.Items.permitted;G.Items.permitted=item=>!(active()&&f().noCursedCritArmor&&(item?.critBonus>0||item?.effect==='crit')&&(item?.armorPenalty>0||item?.defenseFactor<1))&&oldPermit(item);
 const oldAI=G.Enemy.prototype.updateAI;G.Enemy.prototype.updateAI=function(dt,p){if(!active())return oldAI.call(this,dt,p);const a=f(),cp=captain(),before={x:this.x,y:this.y,d:Math.hypot(this.x-cp.x,this.y-cp.y)};let target=p;if(a.illusion&&q(p).concealed){this.unovaLastVisible||={x:p.x,y:p.y};target=Object.assign(Object.create(p),this.unovaLastVisible);}else this.unovaLastVisible={x:p.x,y:p.y};const result=oldAI.call(this,dt,target);if(a.shadowTag&&!this.dead){const dx=this.x-cp.x,dy=this.y-cp.y,dist=Math.hypot(dx,dy);if(dist>before.d&&dist>0){this.x=cp.x+dx/dist*before.d;this.y=cp.y+dy/dist*before.d;}}return result;};
 return {active,has,root,f,c,s,q,now,t,zOn,proc,eproc,charge,burst,teamHeal,echo,areaEcho,resetLongest,cleanse,typed,stream,punch,whip,wind,needle,sound,melee,controlled,clamp,fusion,configure,defaults,critMultiplier,typeFactor,enemyDefense,zBudget,
  capIncoming:(p,n,src)=>has(p)&&f().hitCap&&!['status','weather','environment','shared'].includes(src.kind)?Math.min(n,p.maxHp*f().hitCap):n,
  blocksShield:p=>has(p)&&p===captain()&&!!f().captainNoShield,
  canCast:p=>!has(p)||!(p===captain()&&s().chargeUntil>now()),immobile:p=>has(p)&&p===captain()&&s().chargeUntil>now(),suppresses:p=>has(p)&&!!f().sheer,
  steer(p,ax,ay,dt){if(!has(p)||p!==captain()||!f().inertia||p.spd<=p.baseSpd*1.4||(!ax&&!ay))return [ax,ay];const b=q(p),angle=Math.atan2(ay,ax);b.inertiaAim=b.inertiaAim==null?angle:b.inertiaAim+Math.atan2(Math.sin(angle-b.inertiaAim),Math.cos(angle-b.inertiaAim))*(1-Math.exp(-dt*8));const length=Math.hypot(ax,ay);return [Math.cos(b.inertiaAim)*length,Math.sin(b.inertiaAim)*length];},
  weatherImmune:p=>has(p)&&!!f().magicGuard,status,knockImmune:()=>false,guts:p=>has(p)&&!!f().gutsAttack,
  selfHeal(p,amount){s().allowSelfHeal=true;try{return heal(p,amount);}finally{s().allowSelfHeal=false;}}
 };
})();
