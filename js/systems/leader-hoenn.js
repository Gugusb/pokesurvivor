/* Hoenn runtime: explicit battle hooks; all stored state is serializable. */
G.LeaderHoenn=(()=>{
 const L=G.LeaderAbilities,Z=L._z,{actors,enemies,captain,state,own,shield,heal,direct,blast,percent,budget,field,schedule,synthetic,stun,pull,clearShots,event}=Z;
 const active=()=>L.active()&&L.definition(captain()?.dex)?.generation===3,has=p=>active()&&Z.team(p),root=()=>L.definition(captain()?.dex)?.root,f=()=>L.profile()?.hoenn||{},now=()=>state()?.time||0;
 const s=()=>state().hoenn||=( {kills:0,elite:0,armored:0,shieldKills:0,intercepts:0,gems:0,weatherKinds:[],casts:0,battle:0} ),q=p=>p.hoennState||=( {lastHurt:now(),kills:0,combo:0,received:0,boost:0,cast:0} );
 const zOn=()=>active()&&state().z==='hoenn'+root()&&state().zUntil>now(),wx=()=>G.Weather?.current?.kind,t=()=>now()-(s().start||0),bad=p=>p.slowT>0||p.attackDebuffT>0||Object.values(p.actorStatus||{}).some(v=>v.left>0),frozen=e=>e.freezeT>0||e.classStunT>0;
 const tag=(m,k)=>k==='punch'?['karate-chop','body-slam','meteor-mash'].includes(m?.id):k==='kick'?['tackle','wing-attack','quick-attack','flame-charge'].includes(m?.id):k==='sound'?m?.id==='hyper-voice':k==='recoil'?m?.kind==='dash':k==='vortex'?['mine','trail'].includes(m?.kind):false;
 const near=(p,r)=>Math.hypot(p.x-captain().x,p.y-captain().y)<=r;
 function proc(p,id,cd){const a=q(p);a.at||={};if((a.at[id]??-Infinity)>now())return false;a.at[id]=now()+cd;return true;}
 function burst(p,n){if(!p.dead&&n>0)p.heal(Math.min(n,p.maxHp-p.hp));}
 function teamHeal(n,missing=false){for(const p of actors())burst(p,(missing?p.maxHp-p.hp:p.maxHp)*n);}
 function cleanse(){for(const p of actors())G.ActorStatus.clear(p);}
 const allStats=['atk','spa','defense','spdef','spd','agility','stamina','hp'];
 function factor(p,key){if(!has(p))return 1;const a=f(),b=q(p),u=s();let n=1;
  if(allStats.includes(key)){if(a.forecast&&!wx())n*=key==='atk'||key==='spa'?.75:1;if(wx()==='sun'&&a.sunAll)n*=a.sunAll;if(wx()==='rain'&&a.rainAll)n*=a.rainAll;n*=1+(G.HoennMarket?.statBonus(key)||0);if(p===captain()&&a.captainAttack&&['atk','spa'].includes(key))n*=a.captainAttack;}
  if(p===captain()&&a.captainDefense&&['defense','spdef'].includes(key))n*=a.captainDefense;
  if(key==='atk'||key==='spa'){
   if(key==='atk'&&a.killAtk)n+=a.killAtk*Math.min(a.killCap,u.kills);if(a.killBoth)n+=u.kills*a.killBoth;
   if(a.electricStack&&key==='spa')n+=Math.min(4,u.electricStacks||0)*a.electricStack;
   if(key==='atk'&&a.guts&&bad(p))n+=a.guts;if(key==='atk'&&a.toxicBoost&&G.ActorStatus.active(p,'poison'))n+=a.toxicBoost;
   if(a.rainAtk&&wx()==='rain')n+=a.rainAtk;if(a.sunAtk&&wx()==='sun')n+=a.sunAtk;
   if(a.tailGlow&&key==='spa'&&b.glowUntil>now())n+=a.tailGlow;if(b.elementAtkUntil>now())n+=.2;
   if(b.angerUntil>now())n+=a.criticalAnger||0;if(a.competitive&&key==='spa'&&b.competitiveUntil>now())n+=a.competitive;
   if(a.defenseAttack)n+=Math.min(.4,Math.max(p.baseDefense,p.baseSpDef)*a.defenseAttack*.1);
   if(a.shellKills)n+=Math.min(15,Math.floor(u.kills/5))*.03;
   if(a.marvel&&captain().dex===349)n*=.7;
   if(a.poorCat&&G.Expedition.run.gold<30)n*=.7;
   if(b.contraryUntil>now())n+=b.contraryAttack||0;
   if(zOn()&&[263,283].includes(root()))n+=root()===263?1:key==='spa'?.5:0;

   if(u.danceStacks&&key==='atk')n+=u.danceStacks*.03;
   if(G.HoennMarket?.pearlSold())n+=.5;
  }
  if(['defense','spdef'].includes(key)){
   if(a.marvel&&(bad(p)||p.hp<p.maxHp*.5))n*=2;
   if(a.rooting&&!captain().walking)n*=1.4;
   if(a.snowDefense&&wx()==='snow')n*=1+a.snowDefense;
   if(a.relicDefense)n+=Math.min(.2,(G.Expedition.run.hoennMarket?.relics||0)*a.relicDefense);
   if(a.shellKills)n+=Math.min(15,Math.floor(u.kills/5))*.03;
   if(a.equalDefense){const thisD=key==='defense'?p.baseDefense:p.baseSpDef;n*=Math.max(p.baseDefense,p.baseSpDef)/Math.max(.1,thisD)*a.equalDefense;}
   if(zOn()&&root()===283&&key==='spdef')n*=1.5;
   if(u.deltaWeakUntil>now())n*=.8;
   if(G.HoennMarket?.pearlSold())n*=.8;
  }
  if(key==='spd'){
   if(a.speedBoost)n+=Math.min(10,Math.floor(t()/(a.boostEvery||2)))*a.speedBoost;
   if(a.quickFeet&&bad(p))n+=a.quickFeet;if(a.toxicBoost&&G.ActorStatus.active(p,'poison'))n+=.3;
   if(a.vigour&&t()%6<4)n+=.6;
   if(a.wealthCrit)n+=Math.min(20,Math.floor(Math.max(0,G.Expedition.run.gold)/10))*.02;
   if(a.tropical&&(!wx()||wx()==='sun'))n+=.4;
   if(a.waterMove&&(!p.inLiquid||p.mon.types.includes('water')))n+=a.waterMove;
   if(a.rainSlow&&wx()==='rain')n*=1-a.rainSlow;
   if(a.drySlow&&!p.inLiquid&&wx()!=='rain')n*=1-a.drySlow;
   if(b.contraryUntil>now())n+=b.contrarySpeed||0;
   if(a.sandDodge&&conditionSand(p))n+=.3;
   if(a.metalModes&&b.dashUntil>now())n+=.4;
   if(zOn()&&root()===283)n+=.5;
   if(u.danceStacks)n+=u.danceStacks*.03;
   if(root()===366)n*=G.HoennMarket?.pearlSold()?1.5:.75;
  }
  if(a.dna)n*=dnaFactor(key,p);
  if(allStats.includes(key)&&b.moodyKey===key)n*=1.5;
  return Math.max(.05,n);
 }
 function dnaFactor(key,p){const form=s().form||'normal',carry=q(p).dnaCarry||{};let n=form==='normal'?1.2:1;
  const bonus=k=>k==='attack'&&['atk','spa'].includes(key)?2:k==='defense'&&['defense','spdef'].includes(key)?2.5:k==='speed'&&key==='spd'?1.8:1;
  n=Math.max(n,bonus(form));for(const[k,until]of Object.entries(carry))if(until>now())n=Math.max(n,bonus(k));return n;
 }
 function rate(p,m){if(!has(p))return 1;const a=f(),b=q(p);let n=1;
  if(m.kind==='melee'&&a.speedBoost)n*=1+Math.min(10,Math.floor(t()/(a.boostEvery||2)))*a.speedBoost;
  if(a.rainCD&&wx()==='rain')n/=a.rainCD;if(a.rainDashCD&&wx()==='rain'&&m.kind==='dash')n/=a.rainDashCD;
  if(a.toxicBoost&&m.kind==='melee'&&G.ActorStatus.active(p,'poison'))n*=1.5;
  if(a.ghostCD&&m.type==='ghost')n/=a.ghostCD;
  if(a.poorGold&&G.Expedition.run.gold<a.poorGold)n/=1.5;
  if(a.vigour&&t()%6<4)n*=1.6;
  if(zOn()&&root()===324&&m.type==='fire'&&a.smokeFireCD)n/=a.smokeFireCD;
  if(a.dna&&s().form==='speed')n*=2;
  return Math.min(n,Math.max(1,m.cd*p.cdMul/.15));
 }
 function move(p,m){if(!has(p)||m.leaderGenerated)return m;const a=f(),b=q(p),n={...m};
  if(a.weatherBall&&p===captain()&&p.isPrimaryMove(m)&&m.kind!=='buff'){n.dmg*=a.weatherBall;n.radius=(n.radius||30)*1.5;n.size=(n.size||5)*1.5;n.type=weatherType()||m.type;}
  if(a.fairySkin&&m.type==='normal'){n.type='fairy';n.dmg*=1.3;}
  if(a.meleeBurn&&m.kind==='melee')n.burn=Math.max(n.burn||0,a.meleeBurn);
  if(a.meleeKnock&&m.kind==='melee')n.knock=Math.max(n.knock||0,a.meleeKnock);
  if(a.meleeKnockFactor&&m.kind==='melee')n.knock=(n.knock||0)*a.meleeKnockFactor;
  if(a.leafRange&&['cone','melee'].includes(m.kind)){if(m.kind==='cone')n.life*=a.leafRange;else n.radius*=a.leafRange;}
  if(a.soundRange&&tag(m,'sound'))n.life*=a.soundRange;
  if(a.rockArea&&m.type==='rock')n.radius=(n.radius||30)*a.rockArea;
  if(a.area&&['aura','nova','meteor','trail','mine'].includes(m.kind))n.radius=(n.radius||30)*a.area;
  if(a.rangedSpeed&&['projectile','cone','beam'].includes(m.kind))n.speed=(n.speed||300)*a.rangedSpeed;
  if(a.heavyRange&&['melee','dash'].includes(m.kind))n.radius*=a.heavyRange;
  if(a.punchStep&&tag(m,'punch'))n.radius+=a.punchStep;
  if(a.shieldCut&&m.kind==='cone')n.hoennShieldCut=a.shieldCut;
  if(a.contrary&&m.kind==='buff')n.amount=-Math.abs(n.amount);
  if(a.bugBuffDuration&&m.kind==='buff')n.dur+=Math.min(6,actors().filter(p=>p.mon.types.some(t=>['bug','electric'].includes(t))).length*a.bugBuffDuration);
  if(a.instantBuff&&m.kind==='buff')n.delay=0;
  if(a.diveSpeed&&m.kind==='dash')n.speed=(n.speed||300)*a.diveSpeed;
  if(a.waterGround){if(m.hoennGround)n.dmg*=1.4;if(m.hoennWater){n.radius=(n.radius||30)*1.4;n.life=(n.life||1)*1.4;}}
  if(a.doubleChain&&m.kind==='chain')n.count*=2;
  if(a.circuit&&electricCount()>=2&&m.type==='electric'){if(n.kind==='chain')n.count+=2;n.dmg*=1.35;}
  if(zOn()&&root()===261&&m.kind==='melee')n.arc=Math.PI*2;
  if(zOn()&&root()===263&&m.kind==='dash'){n.phaseWalls=true;n.knock=Math.max(150,n.knock||0);}
  if(zOn()&&root()===283){n.radius=(n.radius||30)*1.5;n.size=(n.size||5)*1.5;}
  if(root()===339&&m.type==='water')n.hoennWaterCast=true;
  if(a.phase)n.phaseWalls=true;
  if(a.castPen&&m.kind!=='buff'&&Math.random()<.4)n.hoennPen=a.castPen;
  return n;
 }
 const electricCount=()=>actors().flatMap(p=>p.moves).filter(m=>m.type==='electric').length;
 function outgoing(p,e,m){if(!has(p))return 1;const a=f(),b=q(p),u=s();let n=1;
  if(a.lowGrass&&p.hp/p.maxHp<.35&&m.type==='grass'&&m.kind==='melee')n*=1+a.lowGrass;
  if(a.lowFire&&p.hp/p.maxHp<.3&&m.type==='fire'&&['melee','dash'].includes(m.kind))n*=a.lowFire;
  if(a.waterDamage&&m.type==='water')n*=a.waterDamage;
  if(a.fireDamage&&m.type==='fire')n*=a.fireDamage;
  if(a.sunDamage&&wx()==='sun')n*=a.sunDamage;

  if(a.openingDamage&&t()<3&&m.hoennOpening)n*=1+a.openingDamage;
  if(a.noBuffDamage&&!p.buffFraction('atk')&&!p.buffFraction('def')&&!p.buffFraction('spd'))n*=a.noBuffDamage;
  if(a.wealthBeam&&G.Expedition.run.gold>0&&m.kind==='beam')n*=1.5;
  if(a.waterDark&&['water','dark'].includes(m.type))n*=a.waterDark;
  if(a.rootDamage&&!captain().walking)n*=a.rootDamage;
  if(a.toxicKill&&m.type==='poison')n*=1+(u.toxicKills||0)*a.toxicKill;
  if(a.noLeech&&e.types.some(t=>t==='poison')||a.snakeDamage&&[23,24,95,208,336,350,384].includes(e.dex))n*=a.snakeDamage||1;
  if(a.marvel&&m.type==='water'&&u.beautyDone)n*=1.6;
  if(a.primalSea&&m.type==='water')n*=2/Math.max(.1,G.Weather.mult('water'));
  if(a.desolate&&['fire','ground'].includes(m.type))n*=1.8/Math.max(.1,G.Weather.mult(m.type));
  if(a.burnGround&&m.type==='ground'&&e.burn>0)n*=a.burnGround;
  if(a.banFire&&m.type==='fire'||a.banWater&&m.type==='water')return 0;
  if(a.rolling&&m.kind==='dash')n*=1+Math.min(5,b.roll||0)*a.rolling;

  if((e.hoennSoftUntil||0)>now())n/=1-(e.hoennSoft||0);
  if(a.enemyPhysicalArmor&&m.damageClass==='physical')n/=1-a.enemyPhysicalArmor;
  if(a.physicalPen&&m.damageClass==='physical')n/=1-a.physicalPen;
  if(e.hoennRendUntil>now())n*=2;
  if(m.hoennPen&&m.damageClass==='special')n/=1-m.hoennPen;
  if(e.hoennSpdefZero&&m.damageClass==='special')n*=Math.min(5,Math.max(1,e.spdef/.1));
  if(a.pearlBranch&&captain().dex===368&&m.damageClass==='special')n/=1-.4;

  if(u.bananaBuffUntil>now())n*=1.2;
  if(u.pearlRounds&&a.pearlDamage)n*=1+u.pearlRounds*a.pearlDamage;
  return n;
 }
 function crit(p,m,e){if(!has(p))return 0;const a=f(),b=q(p);let n=a.crit||0;
  if(a.critPenalty)n-=a.critPenalty;if(a.wealthCrit)n+=Math.min(20,Math.floor(Math.max(0,G.Expedition.run.gold)/10))*.02;
  if(a.stationaryCrit&&own(p).stationary>=.5)n+=a.stationaryCrit;
  if(a.fairyCrit&&['fairy','psychic'].includes(m?.type))n=Math.max(n,a.fairyCrit-(p.critChance||0));
  if(a.sweetCrit&&e?.hoennSoftUntil>now())n=Math.max(n,a.sweetCrit-(p.critChance||0));
  if(a.frozenCrit&&e&&frozen(e)||s().paydayCrit||zOn()&&a.zCritWindow||a.flyingTrapCrit&&e?.hoennTrappedUntil>now())return 1;
  if(a.openingCrit&&t()<2&&!b.firstHit&&m?.kind==='melee')return 1;
  if(a.serene)n+=(p.critChance||0)+(G.ExpeditionGrowth?.crit(p)||0)+(G.Specialization?.stats(m).crit||0);
  return n;
 }
 function beforeHurt(p,type,source){if(!has(p))return true;const a=f(),b=q(p),e=source.enemy;
  if(type==='electric'&&(a.electricStack||a.electricAtk)){s().electricStacks=Math.min(4,(s().electricStacks||0)+1);for(const ally of actors())q(ally).elementAtkUntil=now()+5;if(a.electricAtk)return false;}
  if(a.waterVeil&&source.status==='burn'||a.iceImmune&&source.status==='freeze')return false;
  if(a.poisonSecondaryImmune&&G.ActorStatus.active(p,'poison')){p.slowT=0;}
  if(a.halfFireAbsorb&&type==='fire')burst(p,p.maxHp*.025);
  if(a.emptyShell&&b.shells>0){b.shells--;event('absorb',1);return false;}
  if(a.weakDodge&&type&&G.Types.mult(type,p.mon.types)>1&&Math.random()<a.weakDodge)return false;
  if((a.sandDodge&&conditionSand(p)&&Math.random()<a.sandDodge)||(a.movingDodge&&p.walking&&Math.random()<a.movingDodge)||(a.warningDodge&&b.warningUntil>now()&&Math.random()<a.warningDodge)||(a.dna&&s().form==='speed'&&Math.random()<.5))return false;
  if(a.waterShield&&type==='water'){if(proc(p,'waterShield',4))for(const ally of actors())shield(ally,ally.maxHp*a.waterShield);return false;}
  if(a.damp&&['explosion','selfdestruct'].includes(source.kind))return false;
  return true;
 }
 function incoming(p,n,type,src){if(!has(p))return n;const a=f(),b=q(p);let k=1;
  if(a.lowReduction&&p.hp<p.maxHp*.35)k*=1-a.lowReduction;
  if(a.stationaryGuard&&own(p).stationary>=.5)k*=1-a.stationaryGuard;
  if(a.bankGuard)k*=1-Math.min(.3,Math.floor(Math.max(0,G.Expedition.run.gold)/20)*a.bankGuard);
  if(a.poorGold&&G.Expedition.run.gold<a.poorGold)k*=1.4;
  if(a.poorCat&&G.Expedition.run.gold<30)k*=1.3;
  if(a.debtDamage&&(G.Expedition.run.hoennMarket?.debt||0)>0)k*=a.debtDamage;
  if(a.dashReduction&&b.dashUntil>now())k*=1-a.dashReduction;
  if(a.noEnemyCrit&&src.critical)k/=src.critMultiplier||1.5;
  if(a.delta&&type){const mult=G.Types.mult(type,p.mon.types);if(mult>1)k/=mult;}
  if(a.halfFireAbsorb&&type==='fire')k*=.5;if(a.colorChange&&type&&q(p).nativeTypes&&p.mon.types.includes(type))k*=.7;
  if(a.metalModes)k*=.7;
  if(a.dna&&s().form==='attack')k*=1.4;
  if(zOn()&&root()===265)k*=.6;
  if(a.curseReflect&&zOn()&&s().curseTargets?.length){for(const e of enemies().filter(e=>s().curseTargets.includes(e.id)))direct(p,e,Math.min(n,budget(p)*.3),'ghost');return 0;}
  n*=k;if(a.lowHitCap&&p.hp<p.maxHp*.5)n=Math.min(n,p.maxHp*a.lowHitCap);if(a.hitCap)n=Math.min(n,p.maxHp*a.hitCap);
  if(a.lethalShield&&!b.lethalUsed&&n>=p.hp){b.lethalUsed=true;n=Math.max(0,n-p.maxHp*a.lethalShield);}
  if(a.repeatSturdy&&p.hp>1&&n>=p.hp&&proc(p,'sturdy',10))n=p.hp-1;
  return n;
 }
 function onCast(p,m){if(!has(p)||m.leaderGenerated)return;const a=f(),b=q(p),u=s();u.casts++;if(m.type==='water')u.waterCasts=(u.waterCasts||0)+1;b.cast=now();m.hoennOpening=!b.openingUsed;b.openingUsed=true;
  if(a.electricStack&&m.type==='electric')u.electricStacks=Math.min(4,(u.electricStacks||0)+1);
  if(a.tailGlow&&m.kind==='buff')for(const ally of actors())q(ally).glowUntil=now()+4;
  if(a.waterGround){m.hoennGround=m.type==='ground'&&b.nextGround;m.hoennWater=m.type==='water'&&b.nextWater;if(m.type==='ground'){b.nextGround=false;b.nextWater=true;}if(m.type==='water'){b.nextWater=false;b.nextGround=true;}}
  if(a.punchStep&&tag(m,'punch')){const dx=Math.cos(p.aim)*150,dy=Math.sin(p.aim)*150;if(G.World.isFree(p.x+dx,p.y+dy,p.r)){p.x+=dx;p.y+=dy;}}
  if(a.recoil&&tag(m,'recoil')){const lost=p.hp*a.recoil;p.hp=Math.max(1,p.hp-lost);}

  if(a.vigour&&u.slackPower)m.hoennSlackPower=true;
  if(a.dna)u.lastCast=now();
  if(m.kind==='dash'){b.dashUntil=now()+.5;if(a.dashGuard)p.invuln=Math.max(p.invuln,a.dashGuard);if(a.dashReflect)p.invuln=Math.max(p.invuln,.8);}
  if(a.helpEcho&&Math.random()<a.helpEcho&&proc(p,'help',.5))schedule(.15,()=>synthetic(p,m.kind,{...m,dmg:m.dmg*.5}));
  if(a.slack&&zOn()&&u.slackPower){u.slackPower=false;m.hoennSlackPower=true;}
  if(a.rolling&&m.kind==='dash')b.rollCast=(b.rollCast||0)+1;
 }
 function hit(p,e,m,dealt,critical){if(!has(p)||!(dealt>0))return;const a=f(),b=q(p),u=s();
  if(m.hoennZ&&e.dead&&proc(captain(),'zRefund',5)&&root()===341)state().charge=Math.min(1,state().charge+.2);
  if(m.hoennExecute&&!e.boss&&e.hp/e.maxHp<m.hoennExecute)direct(p,e,e.hp+e.shield+1,m.type,{hoennZ:true});if(m.hoennShieldCut)e.shield*=1-m.hoennShieldCut;if(m.hoennSoften){e.hoennSoft=m.hoennSoften;e.hoennSoftUntil=now()+5;}if(m.hoennSpdefZero)e.hoennSpdefZero=true;if(m.hoennTeamAttack)for(const ally of actors())q(ally).elementAtkUntil=now()+5;
  if(m.leaderGenerated)return;b.firstHit=true;
  if(m.hoennSlackPower)direct(p,e,dealt*1.5,m.type);
  if(a.shieldCut&&((root()===273&&m.kind==='cone')||(root()===303&&m.kind==='melee')||(root()===285&&tag(m,'punch')))&&enemyProc(e,'shield',.5))e.shield*=1-a.shieldCut;

  if(a.soundSlow&&tag(m,'sound'))e.applySlow(a.soundSlow,2);
  if(a.sound&&tag(m,'sound'))event('soundHit');
  if(a.physicalPen&&m.damageClass==='physical')event('meleeHit');
  if(a.critPP&&critical&&proc(p,'critPP',.5))G.MovePP.add(p,[p.moves.find(x=>x.id===m.id)].filter(Boolean),1);
  if(a.defenseDamage&&m.kind==='melee'){const sum=actors().reduce((n,ally)=>n+ally.defenseFor({kind:'contact'}),0);direct(p,e,Math.min(dealt*.4,sum*a.defenseDamage*20),'steel');}
  if(a.executeChance&&m.kind==='melee'&&!e.boss&&!e.elite&&Math.random()<a.executeChance)direct(p,e,e.hp+e.shield+1,'poison');
  if(a.venom&&['melee','cone','boomerang','projectile'].includes(m.kind)){e.hoennVenom=(e.hoennVenom||0)+1;e.hoennVenomOwner=p;event('poisonStack');}
  if(a.firstBossWeaken&&e.boss&&m.kind==='melee'&&!u.firstBoss){u.firstBoss=true;e.leaderDamage=1-a.firstBossWeaken;e.leaderDamageUntil=now()+5;}
  if(a.thornVulnerable&&m.kind==='melee'){e.leaderVulnerable=a.thornVulnerable;e.leaderVulnerableUntil=now()+3;}
  if(a.iceFreeze&&m.type==='ice'&&Math.random()<a.iceFreeze&&enemyProc(e,'freeze',1)){e.freezeT=Math.max(e.freezeT||0,.6*(e.boss?.5:1));event('freeze');}
  if(a.rolling&&m.kind==='dash'&&b.rollHit!==b.rollCast){b.rollHit=b.rollCast;b.roll=Math.min(5,(b.roll||0)+1);}
  if(a.critDance&&critical)u.danceStacks=Math.min(10,(u.danceStacks||0)+1);
  if(a.rend&&m.kind==='melee'&&Math.random()<a.rend&&enemyProc(e,'rend',1))e.hoennRendUntil=now()+3;
  if(a.criticalCooldown&&critical&&Math.random()<a.criticalCooldown){const real=p.moves.find(x=>x.id===m.id);if(real)real.t*=.5;}
  if(a.frozenCrit&&frozen(e))event('iceHit');
  if(a.recoilShield&&tag(m,'recoil'))shield(p,dealt*a.recoilShield);

  if(a.electricEncore&&m.type==='electric'&&critical&&proc(p,'electricEncore',1)){blast(p,e.x,e.y,65,dealt*.3,'electric');G.MovePP.add(p,[p.moves.find(x=>x.id===m.id)].filter(Boolean),1);}
  if(a.nightBurn&&m.id==='night-shade')e.applyBurn(1,p);
  if((a.arenaTrap||a.vortex)&&tag(m,'vortex')){e.applySlow(a.arenaTrap?.7:.4,2);e.hoennTrappedUntil=now()+2;if(proc(p,'vortexField',.5))field(p,'hoennVortex',e.x,e.y,(m.radius||60)*(a.vortex?1.8:1),2,budget(p)*.005,m.type,{pull:a.vortex?60:20,slow:a.arenaTrap?.7:.4});}
  if(zOn()&&root()===261&&m.kind==='melee')for(const ally of actors())heal(ally,dealt*.1/actors().length);
 }
 function enemyProc(e,id,cd){e.hoennAt||={};if((e.hoennAt[id]??-Infinity)>now())return false;e.hoennAt[id]=now()+cd;return true;}
 function hurt(p,n,type,src){if(!has(p)||!(n>0)||src.kind==='status')return;const a=f(),b=q(p),u=s();b.lastHurt=now();b.received+=n;b.lastEnemy=src.enemy?.id||0;
  if(a.selfPoison&&Math.random()<a.selfPoison)G.ActorStatus.apply(p,'poison',8);
  if(a.criticalAnger&&src.critical)for(const ally of actors())q(ally).angerUntil=now()+5;
  if(a.contactStun&&src.enemy&&src.kind==='contact')stun(src.enemy,a.contactStun);
  if(a.contactPowder&&src.kind==='contact'&&proc(p,'powder',1))blast(p,p.x,p.y,150,1,'grass',{stun:1});
  if(a.roughSkin&&src.enemy&&src.kind==='contact')direct(p,src.enemy,n*a.roughSkin,'normal');
  if(a.percentReflect&&src.enemy&&src.kind==='contact')direct(p,src.enemy,fraction(p,src.enemy,a.percentReflect),'grass');
  if(a.curseReflect){const target=enemies().sort((a,b)=>b.hp-a.hp)[0];if(target)direct(p,target,n*a.curseReflect,'ghost');}
  if(a.curseSeal&&src.enemy&&Math.random()<.3)src.enemy.leaderSilenceUntil=now()+3;
  if(a.marvel&&p===captain()){u.beauty=(u.beauty||0)+1;if(u.beauty>=10)beauty();}
  if(a.colorChange&&type){b.nativeTypes||=[...p.mon.types];p.mon={...p.mon,types:[type]};}
  if(a.dna&&s().form==='defense'&&src.enemy)direct(p,src.enemy,n*.5,'psychic');
  if(a.hurtGuard)p.invuln=Math.max(p.invuln,a.hurtGuard);
 }
 function killed(e){if(!active()||!Z.team(e.lastAttacker))return;const a=f(),u=s(),m=e.lastTypeBondAttack||{};u.kills++;if(e.elite)u.elite++;if(e.shield>0||e.hoennHadShield)u.shieldKills++;if(e.mon?.types?.includes('steel')||e.types?.includes('steel')||e.hoennHadShield)u.armored++;
  if(e.hoennRevenge)u.revengeCleared=(u.revengeCleared||0)+1;
  if(a.toxicKill&&e.poison>0)u.toxicKills=Math.min(40,(u.toxicKills||0)+1);
  if(m.hoennZ&&root()===341&&!u.zRefunded){u.zRefunded=true;state().charge=Math.min(1,state().charge+.2);}
  if(a.eliteShell&&e.elite&&u.shellRefills<2&&now()-(u.shellRefillAt??-99)>=10){u.shellRefills++;u.shellRefillAt=now();for(const p of actors())q(p).shells=3;}
  if(a.dashExecuteReset&&m.hoennZ){for(const move of e.lastAttacker.moves.filter(m=>m.kind==='dash'))move.t=0;e.lastAttacker.invuln=1;}
  if(a.zEliteReset&&e.elite&&m.hoennZ)for(const p of actors())for(const move of p.moves)move.t=0;
  if(a.soulHeal&&m.hoennZ)for(const p of actors())heal(p,a.soulHeal);
  if(a.lavaKills&&m.hoennZ)field(e.lastAttacker,'lava',e.x,e.y,60,8,budget(e.lastAttacker)*.012,'fire',{burn:1});
 }
 function beauty(){const u=s();if(u.beautyDone)return;u.beautyDone=true;cleanse();teamHeal(.5);for(const e of enemies())stun(e,2);if(captain().dex===349&&G.MonProgression?.evolve)G.MonProgression.evolve(captain(),G.MonProgression.evolutionOptions(captain()).find(c=>c.dex===350)||{});}
 function status(p,kind,src){if(!has(p))return true;const a=f(),b=q(p);if(a.contrary&&['slow','attack'].includes(kind)){b.contraryUntil=now()+5;if(kind==='slow')b.contrarySpeed=.5;else b.contraryAttack=.5;return false;}
  if(a.debuffImmune&&kind==='attack'||a.waterVeil&&kind==='burn'||a.iceImmune&&kind==='freeze'||a.healthyImmune&&p.hp/p.maxHp>.7||a.controlImmune&&['slow','stun','freeze'].includes(kind)||a.dna&&s().form==='defense'&&['slow','stun','freeze'].includes(kind))return false;
  if(a.synchronize&&kind==='slow')for(const e of enemies())e.applySlow(.5,3);
  if(a.competitive)for(const ally of actors())q(ally).competitiveUntil=now()+6;return true;
 }
 function poisonHeal(p){if(!has(p))return false;const a=f();if(a.poisonHeal){heal(p,p.maxHp*a.poisonHeal);return true;}return !!a.toxicBoost;}
 function canCast(p){return !has(p)||!f().slack||p!==captain()||t()%6<4;}
 function weatherType(){return {sun:'fire',rain:'water',snow:'ice'}[wx()]||null;}
 function conditionSand(p){return wx()==='sand'||G.World.propsInCircle(p.x,p.y,80).some(x=>x.solid);}
 function fraction(p,e,n,missing=false){return Math.min((missing?Math.max(0,e.maxHp-e.hp):e.maxHp)*n,e.boss||e.elite?budget(p)*.3:Infinity);}
 function start(){if(!active())return;const old=s(),a=f();state().hoenn={start:now(),kills:0,elite:0,armored:0,shieldKills:0,intercepts:0,gems:0,weatherKinds:[],casts:0,shellRefills:0,battle:(old.battle||0)+1,beautyDone:captain().dex===350,form:'normal',formAt:now(),pearlRounds:G.Expedition.run.hoennMarket?.pearlRounds||0};
  for(const p of actors()){p.hoennState={lastHurt:now(),received:0,shells:a.emptyShell||0,combo:0,boost:0,cast:0,roll:0};if(a.mudShield||a.primalShield)shield(p,p.maxHp*(a.mudShield||a.primalShield));}
  if(a.openingRain)G.Weather.force('rain',a.openingRain);if(a.randomWeather)G.Weather.force(['sun','rain','snow','sand'][Math.floor(Math.random()*4)],G.Expedition.run.wave.duration+2);if(a.delta)G.Weather.clear();
  if(a.beautyEvolve&&captain().dex===349)beauty();
  s().weatherLast=wx();if(wx())s().weatherKinds.push(wx());s().bananaBuffUntil=(G.Expedition.run.hoennMarket?.bananaReady?now()+5:0);if(G.Expedition.run.hoennMarket)G.Expedition.run.hoennMarket.bananaReady=false;
  if(G.HoennMarket?.revengePending()){s().revengeIds=[];for(let i=0;i<2;i++){const def={dex:352,name:G.DEX_BY[352].name,hp:24,spd:65,dmg:6,xp:0,behavior:'chase'},e=new G.Enemy(def,captain().x+(i?180:-180),captain().y,{hp:G.Expedition.run.wave.hp,spd:G.Expedition.run.wave.speed,dmg:G.Expedition.run.wave.dmg},false);G.Expedition.run.pendingSpawns||=[];G.Expedition.run.pendingSpawns.push({enemy:e,left:2});if(e){e.hp=e.maxHp*=2;e.hoennRevenge=true;s().revengeIds.push(e.id);}}G.Expedition.run.hoennMarket.revenge=false;}
  state().targetEvents=Math.max(state().targetEvents||60,10);
 }
 function tick(dt){if(!active()||G.Expedition.run.phase!=='combat'||!(dt>0))return;const a=f(),u=s();u.pulse=(u.pulse||0)+dt;G.HoennMarket?.applyHp();
  if(a.delta&&G.Weather.hasWeather?.())G.Weather.clear();
  for(const p of actors()){const b=q(p);if(p.dead)continue;if(a.pickup)p.leaderMagnet=a.pickup;if(a.largeBody&&!b.bodySet){p.r*=a.largeBody;b.bodySet=true;}
   {const wanted=factor(p,'hp'),old=p.hoennHpFactor||1;if(wanted!==old){const frac=p.hp/p.maxHp;p.maxHp=p.maxHp/old*wanted;p.hp=p.maxHp*frac;p.hoennHpFactor=wanted;}}
   if(a.phase){if(G.World.arenaContains?.(p.x,p.y,p.r)===false&&b.safe){p.x=b.safe.x;p.y=b.safe.y;}else b.safe={x:p.x,y:p.y};}
   if(a.rainHeal&&wx()==='rain')heal(p,p.maxHp*a.rainHeal*dt);if(a.snowHeal&&wx()==='snow')heal(p,p.maxHp*a.snowHeal*dt);
   if(a.rooting&&!captain().walking)heal(p,p.maxHp*.02*dt);if(a.stationaryHeal&&own(p).stationary>.2)heal(p,p.maxHp*a.stationaryHeal*dt);
   if(a.sunDrain&&wx()==='sun')p.hp=Math.max(1,p.hp-p.maxHp*a.sunDrain*dt);
   if(a.slack&&p===captain()&&t()%6>=4)heal(p,p.maxHp*.05*dt);
   if(a.shieldRegen&&proc(p,'shieldRegen',6))shield(p,p.maxHp*a.shieldRegen);
   if(a.latiosAssist&&p.hp<p.maxHp*.3&&!b.latiosUsed){b.latiosUsed=true;synthetic(p,'beam',{type:'dragon',dmg:2,phaseWalls:true});}
   if(a.forecast){const type=weatherType();if(type){b.nativeTypes||=[...p.mon.types];p.mon={...p.mon,types:[type]};}else if(b.nativeTypes)p.mon={...p.mon,types:[...b.nativeTypes]};}
   const newSlow=p.slowT>0&&!b.hadSlow,newAttack=p.attackDebuffT>0&&!b.hadAttack;b.hadSlow=p.slowT>0;b.hadAttack=p.attackDebuffT>0;
   if(newSlow||newAttack){status(p,newSlow?'slow':'attack',null);if(a.contrary||a.debuffImmune||a.controlImmune){p.slowT=0;p.attackDebuffT=0;p.attackDebuff=0;}}
   if(a.warningDodge||a.hazardWarning){const threat=G.Projectiles.all().some(shot=>!shot.friendly&&Math.hypot(shot.x+shot.vx*.5-p.x,shot.y+shot.vy*.5-p.y)<p.r+shot.r+15)||enemies().some(e=>Math.hypot(e.x-p.x,e.y-p.y)<200&&(e.phase==='aim'||e.ai?.cast));if(threat)b.warningUntil=now()+.5;}
  }
  if(a.dna){u.moveTime=captain().walking?(u.moveTime||0)+dt:0;const dx=captain().x-(u.lastX??captain().x),dy=captain().y-(u.lastY??captain().y);u.moveDistance=captain().walking?(u.moveDistance||0)+Math.hypot(dx,dy):0;u.lastX=captain().x;u.lastY=captain().y;const next=captain().hp<captain().maxHp*.4?'defense':u.moveTime>=1&&u.moveDistance>=120?'speed':now()-(u.lastCast??-100)<2?'attack':'normal';if(next!==u.form&&now()-u.formAt>=2){if(a.dnaCarry)for(const p of actors()){q(p).dnaCarry||={};q(p).dnaCarry[u.form]=now()+a.dnaCarry;}u.form=next;u.formAt=now();event('formChange');}}
  if(wx()!==u.weatherLast){u.weatherLast=wx();if(wx()&&!u.weatherKinds.includes(wx())){u.weatherKinds.push(wx());event('weatherChange');}}
  if(u.pulse>=.5){u.pulse-=.5;pulse(a);}
 }
 function pulse(a){const c=captain(),u=s();
  for(const e of enemies()){
   if(e.shield>0)e.hoennHadShield=true;
   if(a.intimidate||a.nearIntimidate&&Math.hypot(e.x-c.x,e.y-c.y)<200){e.leaderDamage=1-(a.intimidate||a.nearIntimidate);e.leaderDamageUntil=now()+1;}
   if(a.sweetAura&&Math.hypot(e.x-c.x,e.y-c.y)<=a.sweetAura){e.hoennSoft=a.soften;e.hoennSoftUntil=now()+.7;e.applySlow(.3,1);}
   if(a.magnet&&e.types.includes('steel')){e.applySlow(.5,1);e.hoennTrappedUntil=now()+1;}
   if(a.iceAura&&Math.hypot(e.x-c.x,e.y-c.y)<a.iceAura){e.applySlow(.5,1);direct(c,e,20,'ice');}
   if(a.desolate)e.applyBurn(1,c,true);
   if(e.hoennVenom>0){const amount=e.hoennVenom*7.5;direct(e.hoennVenomOwner||c,e,Math.min(amount,e.boss||e.elite?budget(c)*.15:Infinity),'poison',{hoennVenom:true});}
   if(a.dnaPressure){e.applySlow(a.dnaPressure,1);e.shotCd+=.125;e.skillCd+=.125;}
   if(zOn()&&a.zSilence){e.applySlow(.5,1);e.leaderSilenceUntil=now()+1;}
   if(zOn()&&root()===327){pull(e,c.x,c.y,-35);e.applySlow(.6,1);if(a.enemyCollision&&enemyProc(e,'collision',1))direct(c,e,budget(c)*.015,'normal');}
  }
  if(a.cleanseEvery&&t()>=(u.cleanseNext??a.cleanseEvery)){u.cleanseNext=t()+a.cleanseEvery;cleanse();if(a.endTickHeal)teamHeal(a.endTickHeal);}
  if(a.moodyEvery&&t()>=(u.moodyNext??a.moodyEvery)){u.moodyNext=t()+a.moodyEvery;for(const p of actors())q(p).moodyKey=allStats.filter(k=>k!=='hp')[Math.floor(Math.random()*7)];}
  if(a.forecast&&s().weatherKinds.length)event('weatherTime',.5);
  for(const shot of [...G.Projectiles.all()])if(!shot.friendly){
   const distance=Math.hypot(shot.x-c.x,shot.y-c.y);
   if(a.mineGems&&distance<120&&Math.random()<.5){G.Projectiles.remove(shot);u.intercepts++;if(u.intercepts%3===0)u.gems=Math.min(6,u.gems+1);event('intercept');}
   else if((a.satellites&&distance<120||a.absorbMouth&&zOn()&&distance<200||zOn()&&root()===324&&distance<220)&&proc(c,'intercept',.3)){G.Projectiles.remove(shot);u.intercepts++;event('intercept');if(a.mouthHeal&&u.intercepts%10===0)for(const p of actors())heal(p,(p.maxHp-p.hp)*a.mouthHeal);}
   else if(a.gravity&&distance<250){if(!shot.hoennGravity){shot.vx*=.5;shot.vy*=.5;shot.hoennGravity=true;}const speed=Math.hypot(shot.vx,shot.vy);const angle=Math.atan2(shot.vy,shot.vx)+.15;shot.vx=Math.cos(angle)*speed*(shot.hoennGravity?1:.5);shot.vy=Math.sin(angle)*speed*(shot.hoennGravity?1:.5);}
   if(zOn()&&root()===327){shot.vx=-shot.vx;shot.vy=-shot.vy;shot.friendly=true;shot.owner=c;shot.hits=new Set();shot.specMove={leaderGenerated:true,kind:'leader',type:'psychic'};}
  }
 }
 function rescue(p,old){if(!has(p))return old(p);const a=f(),b=q(p);if((a.solarRescue||a.curseRescue)&&p===captain()&&!b.rescued){b.rescued=true;p.hp=1;p.dead=false;p.invuln=2;for(const e of enemies()){if(!e.boss&&!e.elite){if(a.curseRescue){if(Math.hypot(e.x-p.x,e.y-p.y)<=300)e.hp=1;}else direct(p,e,e.hp+e.shield+1,'fire');}else direct(p,e,fraction(p,e,.2),'fire');}return true;}const saved=old(p);if(saved&&a.steelRescue)synthetic(p,'nova',{type:'steel',count:12,pierce:2,dmg:.4});return saved;}
 function finish(){if(!active())return;const a=f(),u=s();u.finishedAt=now();u.duration=t();for(const p of actors()){if(q(p).nativeTypes)p.mon={...p.mon,types:q(p).nativeTypes};if(a.endHeal)burst(p,p.maxHp*a.endHeal);if(a.largeBody&&q(p).bodySet){p.r/=a.largeBody;q(p).bodySet=false;}}G.HoennMarket?.captureBattle({...u});}
 function draw(ctx){if(!active())return;for(const p of actors())if(q(p).warningUntil>now()){ctx.save();ctx.strokeStyle='#ff595e';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(p.x,p.y-G.LIFT,p.r+14,(p.r+14)*.7,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}
 const wrap=(key,fn)=>{const old=L[key];L[key]=(...args)=>fn(old,...args);};
 wrap('factor',(old,p,k)=>old(p,k)*factor(p,k));wrap('rate',(old,p,m)=>old(p,m)*rate(p,m));wrap('move',(old,p,m)=>move(p,old(p,m)));wrap('outgoing',(old,p,e,m)=>old(p,e,m)*outgoing(p,e,m));wrap('crit',(old,p,m,e)=>old(p,m,e)+crit(p,m,e));
 wrap('beforeHurt',(old,p,type,src)=>beforeHurt(p,type,src)&&old(p,type,src));wrap('incoming',(old,p,n,type,src)=>incoming(p,old(p,n,type,src),type,src));wrap('onCast',(old,...args)=>{old(...args);onCast(...args);});wrap('hit',(old,...args)=>{old(...args);hit(...args);});wrap('hurt',(old,...args)=>{old(...args);hurt(...args);});wrap('killed',(old,e)=>{old(e);killed(e);});
 wrap('beginBattle',old=>{old();start();});wrap('tick',(old,dt)=>{old(dt);tick(dt);});wrap('finishBattle',old=>{finish();old();});wrap('rescue',(old,p)=>rescue(p,old));wrap('phase',(old,p)=>old(p)||has(p)&&!!f().phase);
 wrap('draw',(old,ctx)=>{old(ctx);draw(ctx);});
 const floating=p=>has(p)&&(root()===337||root()===355||L.profile().groundImmune),knockImmune=p=>has(p)&&!!(f().knockImmune||f().dna&&s().form==='defense'),guts=p=>has(p)&&!!(f().guts||f().toxicBoost);
 function typeFactor(p,type,e,k,m){if(!has(p))return k;if(f().tinted&&k>0&&k<1)return 1;if((f().sound&&tag(m,'sound')||f().scrappy)&&k===0&&e.types.includes('ghost')&&['normal','flying'].includes(type))return G.Types.mult(type,e.types.filter(t=>t!=='ghost'))||1;return k;}
 function xp(p){return !has(p)?1:(f().xpFactor||1)*((G.Expedition.run.hoennMarket?.debt||0)>0?(f().debtXp||1):1);}
 function weatherImmune(p){return has(p)&&!!(f().sandImmune||f().delta);}
 wrap('refreshCost',(old,n)=>{const v=old(n);return active()?Math.max(1,Math.ceil(v*(root()===352?.85:f().freightPremium?.5:1))):v;});
 wrap('xp',(old,p)=>old(p)*xp(p));
 wrap('critMultiplier',(old,p,m)=>old(p,m)+(has(p)&&f().pearlBranch&&captain().dex===367&&m?.kind==='melee'?.5:0));
 if(G.BossCombat){const oldLeech=G.BossCombat.leech;G.BossCombat.leech=(e,...args)=>{if(!active()||!f().ooze)return oldLeech(e,...args);const before=e.hp,result=oldLeech(e,...args),healed=Math.max(0,e.hp-before);e.hp=before;if(healed)direct(captain(),e,healed,'poison');return 0;};}
 wrap('enemyTick',(old,e,dt)=>{old(e,dt);if(!active())return;if(f().noEnemyWeather&&e.weatherAttackBuff)e.weatherAttackBuff=1;});
 const effectChance=(p,chance)=>has(p)?Math.min(1,chance*(f().serene||1)):chance;
 return {effectChance,typeFactor,xp,weatherImmune,active,has,root,f,s,q,now,t,zOn,proc,burst,teamHeal,cleanse,fraction,tag,status,poisonHeal,canCast,floating,knockImmune,guts,move,factor,wrap,weatherType,beauty};
})();
