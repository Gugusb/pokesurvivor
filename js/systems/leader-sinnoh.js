/* Sinnoh family mechanics. Battle forms and counters never change evolution or squad HP. */
G.LeaderSinnoh=(()=>{
 const L=G.LeaderAbilities,Z=L._z,{actors,enemies,captain,state,own,shield,heal,direct,blast,budget,field,schedule,synthetic,stun,pull,clearShots,event}=Z;
 const active=()=>L.active()&&L.definition(captain()?.dex)?.generation===4,has=p=>active()&&Z.team(p),root=()=>L.definition(captain()?.dex)?.root,f=()=>L.profile()?.sinnoh||{},now=()=>state()?.time||0;
 const s=()=>state().sinnoh||={start:now(),kills:0,casts:0,honey:0,propKills:0},q=p=>p.sinnohState||={lastHurt:now(),received:0,skillDamage:0};
 const t=()=>now()-(s().start||0),wx=()=>G.Weather?.current?.kind,zOn=()=>active()&&state().z==='sinnoh'+root()&&state().zUntil>now();
 function action(n=1){const before=state().charge;event('sinnohAction',n);const gain=Math.max(0,state().charge-before);if(gain)state().charge=Math.min(1,state().charge+gain*((f().zChargeFactor||1)-1));}
 const allStats=['hp','atk','spa','defense','spdef','spd','agility','stamina'],bad=p=>p.slowT>0||p.attackDebuffT>0||Object.values(p.actorStatus||{}).some(v=>v.left>0),wet=p=>wx()==='rain'||p.inLiquid;
 const tag=(m,k)=>k==='whip'?['vine-whip','absorb','mega-drain','giga-drain'].includes(m?.id):k==='aura'?m?.id==='aura-sphere'||m?.kind==='beam'&&['fighting','steel'].includes(m?.type):k==='space'?['water','dragon'].includes(m?.type)&&['beam','boomerang','dash'].includes(m?.kind):k==='blizzard'?m?.type==='ice'&&['meteor','cone','nova','aura'].includes(m?.kind):k==='air'?m?.type==='flying'&&['projectile','cone','boomerang'].includes(m?.kind):G.LeaderHoenn.tag(m,k);
 const frozen=e=>e.freezeT>0||e.classStunT>0,typed=m=>(f().types||[]).includes(m?.type),skillCount=()=>actors().reduce((n,p)=>n+p.moves.filter(m=>typed(m)).length,0),fusion=()=>actors().reduce((n,p)=>n+(p.slots||[]).filter(g=>g.length>1).length,0),awake=()=>t()>=(f().startupSeconds||15);
 const wrap=(key,fn)=>{const old=L[key];L[key]=(...args)=>fn(old,...args);};
 function proc(p,id,cd){const b=q(p);b.at||={};if((b.at[id]??-Infinity)>now())return false;b.at[id]=now()+cd;return true;}
 function eproc(e,id,cd){e.sinnohAt||={};if((e.sinnohAt[id]??-Infinity)>now())return false;e.sinnohAt[id]=now()+cd;return true;}
 function burst(p,n){if(!p.dead&&n>0)p.heal(Math.min(n,p.maxHp-p.hp));}
 function teamHeal(n,missing=false){for(const p of actors())burst(p,(missing?p.maxHp-p.hp:p.maxHp)*n);}
 function cleanse(){for(const p of actors())G.ActorStatus.clear(p);}
 const fraction=(p,e,n)=>Math.min(e.maxHp*n,e.boss||e.elite?budget(p)*.3:Infinity);
 function secondary(p,e,n,type,opts={}){return direct(p,e,n,type,{sinnohSecondary:true,...opts});}
 function armor(e,n,dur=0,kind='both'){if(kind!=='both'){const key=kind==='physical'?'sinnohPhysicalArmor':'sinnohSpecialArmor';e[key]=Math.max(e[key]||0,n);e[key+'Until']=dur?now()+dur:0;return;}if(dur){e.sinnohSoft=Math.max(e.sinnohSoft||0,n);e.sinnohSoftUntil=now()+dur;}else e.sinnohArmor=Math.max(e.sinnohArmor||0,n);}
 function formPick(options,previous){const counts=options.map(o=>actors().reduce((n,p)=>n+p.moves.filter(m=>o.types.includes(m.type)).length,0)),max=Math.max(...counts),ties=options.filter((o,i)=>counts[i]===max);return (ties.find(o=>o.id===previous)||ties[0]).id;}
 const cloaks=[{id:'plant',types:['grass']},{id:'sand',types:['ground','rock']},{id:'trash',types:['steel','poison']},{id:'moth',types:['flying','bug']}],appliances=[{id:'heat',types:['fire']},{id:'wash',types:['water']},{id:'frost',types:['ice']},{id:'fan',types:['flying']},{id:'mow',types:['grass']}];
 const applianceType=()=>({heat:'fire',wash:'water',frost:'ice',fan:'flying',mow:'grass'})[s().form];
 function factor(p,key){if(!has(p))return 1;const a=f(),b=q(p),u=s(),isAtk=['atk','spa'].includes(key);let n=1;
  if(allStats.includes(key)){
   n*=1+(G.HoennMarket?.statBonus(key)||0);
   if(p===captain()&&a.captainAll)n*=a.captainAll;
   if(a.souls&&u.kills>=108)n*=1.432;
   if(a.slowStart){if(awake()){if(key==='atk')n*=2.2;if(key==='hp')n*=2;}else if(p===captain()&&['atk','spd'].includes(key))n*=.5;}
   if(b.moodyUntil>now()){if(b.moodyUp===key)n*=3;if(b.moodyDown===key)n*=.9;}
  }
  if(isAtk){
   if(p===captain()&&a.captainAttack)n*=a.captainAttack;
   if(a.skillAttack)n*=1+Math.min(.6,skillCount()*a.skillAttack);
   if(a.killAttack&&key==='atk')n*=1+Math.min(.4,u.kills*a.killAttack);
   if(a.waterStack&&key==='spa')n*=1+(u.waterStacks||0)*a.waterStack;
   if(a.flower&&key==='atk'&&wx()==='sun')n*=1+(a.flowerAdvance||a.flower);
   if(a.noSunAttack&&wx()!=='sun')n*=a.noSunAttack;
   if(a.dryAttack&&!wet(p))n*=a.dryAttack;
   if(a.guts&&actors().some(bad)||a.defiant&&u.defiantUntil>now())n*=1+(a.guts||a.defiant);
   if(a.wetAttack&&(wet(p)||G.ActorStatus.active(p,'poison')))n*=1+a.wetAttack;
   if(a.emotions&&u.emotionUntil>now())n*=1+Math.min(3,u.emotions||0)*a.emotions;
   if(b.competitiveUntil>now()&&key==='spa')n*=1+a.competitive;
   if(a.lastHpAttack&&p.hp<=1)n*=1+a.lastHpAttack;
   if(a.defenseAttack&&key==='atk')n*=1+Math.min(.4,Math.max(p.baseDefense,p.baseSpDef)*a.defenseAttack*.1);
   if(a.tailGlow&&key==='spa'&&b.glowUntil>now())n*=1+a.tailGlow;
   if(a.nightmareGrowth&&key==='spa')n*=1+(G.Expedition.run.sinnohGrowth||0);
   if(a.cloak&&u.form==='moth'&&key==='spa')n*=1.4;
   if(a.shayminForms&&u.form==='sky'&&key==='spa')n*=1.4;
   if(u.stolenUntil>now())n*=1+(u.stolenAttack||0);
  }
  if(['defense','spdef'].includes(key)){
   if(a.rootDefense&&key==='defense'&&!captain().walking)n*=1+a.rootDefense;
   if(a.dryDefense&&!wet(p))n*=a.dryDefense;
   if(a.snowDefense&&key==='defense'&&wx()==='snow')n*=1+a.snowDefense;
   if(a.sandSpdef&&wx()==='sand'&&key==='spdef')n*=1+a.sandSpdef;
   if(a.flower&&key==='spdef'&&wx()==='sun')n*=1+(a.flowerAdvance||a.flower);
   if(a.cloak&&u.form==='sand'&&key==='defense')n*=1.4;
   if(a.shayminForms&&u.form!=='sky')n*=1.4;
  }
  if(key==='spd'){
   if(a.statusSlow&&bad(p))n*=1-a.statusSlow;
   if(a.unburden&&b.unburdenUntil>now())n*=1+a.unburden;
   if(a.healthyJoy&&healthy())n*=1.3;
   if(a.wetSpeed&&wet(p))n*=1+a.wetSpeed;
   if(a.notSandSlow&&wx()!=='sand')n*=1-a.notSandSlow;
   if(a.cloak&&u.form==='moth')n*=1.35;
   if(root()===492&&u.form==='sky')n*=1.4;
   if(a.appliance&&u.form==='fan')n*=1.4;
   if(a.lowHaste&&p.hp<p.maxHp*.5)n*=1+a.lowHaste;
   if(a.electricGuard&&b.electricUntil>now()||a.steadfast&&b.rescueUntil>now())n*=1.4;
   if(b.rescueUntil>now())n*=1+(a.rescueSpeed||0);
   if(a.phaseGuard&&b.phaseUntil>now())n*=1.5;
   if(u.zSlowUntil>now())n*=.7;
   if(u.teamSpeedUntil>now())n*=1.4;
   if(u.stolenUntil>now())n*=1+(u.stolenSpeed||0);
   if(a.ghostTrail&&u.trails?.some(v=>Math.hypot(p.x-v.x,p.y-v.y)<80))n*=1.4;
  }
  return Math.max(.05,n);
 }
 const healthy=()=>actors().filter(p=>!p.dead).every(p=>p.hp>=p.maxHp*.8);
 function rate(p,m){if(!has(p))return 1;const a=f();let n=1;
  if(a.bugCD)n/=1-Math.min(.4,actors().reduce((n,p)=>n+p.moves.filter(m=>m.type==='bug').length,0)*a.bugCD);
  if(a.lowHaste&&p.hp<p.maxHp*.5)n*=1+a.lowHaste;
  if(a.skillHaste&&m.kind==='melee')n*=1+Math.min(.6,skillCount()*a.skillHaste);
  if(a.rainCD&&wx()==='rain')n/=a.rainCD;if(a.wetCD&&wet(p))n/=a.wetCD;
  if(a.healthyJoy&&healthy())n/=.75;if(a.lastStandHaste&&q(p).rescueUntil>now())n*=2;
  if(a.earlyCD&&G.Expedition.run.trainerLevel<5)n/=a.earlyCD;
  if(a.appliance&&q(p).formStallUntil>now())return 0;
  return Math.min(n,Math.max(1,m.cd*p.cdMul/.15));
 }
 function adaptiveType(p,m){if(!has(p)||!f().adaptive||m.kind==='buff')return m.type;const e=p.target;if(!e||e.dead)return m.type;let best=m.type,k=G.Types.mult(best,e.types);for(const type of Object.keys(G.U.TYPE_COLOR)){const value=G.Types.mult(type,e.types);if(value>k){best=type;k=value;}}return best;}
 function move(p,m){if(!has(p)||m.leaderGenerated)return m;const a=f(),n={...m},u=s();
  if(a.adaptive)n.type=m.sinnohCastType||adaptiveType(p,m);
  if(a.allRange){for(const k of ['radius','life','width'])if(n[k])n[k]*=a.allRange;}
  if(a.bondArea&&n.radius)n.radius*=1+Math.min(.45,fusion()*a.bondArea);
  if(a.groundArea&&m.type==='ground')n.radius=(n.radius||40)*a.groundArea;
  if(a.soundRange&&tag(m,'sound')){n.life=(n.life||1)*a.soundRange;n.radius=(n.radius||40)*a.soundRange;}
  if(a.soundArea&&['sound','aura'].some(k=>k==='sound'?tag(m,k):m.kind===k))n.radius=(n.radius||40)*a.soundArea;
  if(a.whipRange&&tag(m,'whip')){n.radius=(n.radius||40)*a.whipRange;n.life=(n.life||1)*a.whipRange;}
  if(a.blizzardRange&&tag(m,'blizzard'))n.radius=(n.radius||40)*a.blizzardRange;
  if(a.xray&&m.kind==='beam'){n.radius=(n.radius||500)*a.xray;n.phaseWalls=true;}
  if(a.auraSight&&tag(m,'aura')){n.phaseWalls=true;n.homing=Math.max(n.homing||0,4);}
  if(a.dashSpeed&&m.kind==='dash')n.speed=(n.speed||500)*a.dashSpeed;
  if(a.rainDashRange&&m.kind==='dash'&&wx()==='rain')n.radius=(n.radius||300)*a.rainDashRange;
  if(a.beamWidth&&m.kind==='beam')n.width=(n.width||40)*a.beamWidth;
  if(a.space){n.phaseWalls=true;n.radius=Math.min(3200,Z.screenRadius()*2);if(n.range)n.range=n.radius;n.life=Math.min(5,Math.max(n.life||1,n.radius/(n.speed||500)));if(m.kind==='dash')n.sinnohTeleport=true;}
  if(a.summonRate&&m.kind==='turret')n.rate=(n.rate||.5)/a.summonRate;
  if(a.meleePoison&&m.kind==='melee')n.poison=Math.max(n.poison||0,a.meleePoison);
  if(a.meleeSlow&&m.kind==='melee')n.slow=Math.max(n.slow||0,a.meleeSlow);
  if(a.slowStart&&awake())n.knock=(n.knock||0)*2.5;
  if(a.appliance){if(m.type===applianceType())n.dmg*=1.4;if(u.form==='heat'&&m.type==='fire')n.burn=Math.max(n.burn||0,1);if(u.form==='frost'&&m.type==='ice')n.freeze=Math.max(n.freeze||0,.35);}
  if(a.lastHpAttack&&p.hp<=1&&['melee','beam'].includes(m.kind))n.phaseWalls=true;
  return n;
 }
 function outgoing(p,e,m){if(!has(p))return 1;const a=f(),u=s(),b=q(p);let n=1;
  if(m.sinnohSecondary)return 1;
  if(a.technician){const base=G.Moves.instance(m.id,1);if(base&&(base.dmg<=20||(base.count||0)>=3))n*=a.technician;}
  if(typed(m))n*=1+(a.typeDamage||0);
  if(a.typePair?.includes(m.type))n*=1+a.pairDamage;
  if(a.rainTypeDamage&&m.type==='water'&&wx()==='rain')n*=1+a.rainTypeDamage;
  if(a.soil&&m.type==='grass'&&e.sinnohSoilUntil>now())n*=1+a.soil;
  if(a.bondDamage&&typed(m))n*=1+Math.min(.45,fusion()*a.bondDamage);
  if(a.punch&&tag(m,'punch'))n*=1+a.punch;
  if(a.reckless&&tag(m,'recoil'))n*=a.reckless;
  if(a.lowWater&&m.type==='water'&&p.hp<p.maxHp*.4)n*=a.lowWater;
  if(a.speedWater&&m.type==='water')n*=1+Math.min(.5,Math.max(0,p.spd/Math.max(1,p.baseSpd)-1)*a.speedWater);
  if(a.eliteDamage&&(e.boss||e.elite))n*=1+a.eliteDamage;
  if(a.captainDamage&&p===captain())n*=a.captainDamage;
  if(a.wealthDamage)n*=1+Math.min(.3,Math.floor(G.Expedition.run.gold/50)*a.wealthDamage);
  if(a.souls)n*=1+Math.min(108,u.kills)*.004;
  if(a.darkPoison&&m.type==='poison'&&e.sinnohDarkUntil>now())n*=a.darkPoison;
  if(a.gyroPower&&['melee','orbit'].includes(m.kind))n*=1+Math.min(.6,Math.max(0,1-p.spd/Math.max(1,p.baseSpd))*2);
  if(a.sandForce&&wx()==='sand'&&['rock','ground','steel'].includes(m.type))n*=1+a.sandForce;
  if(a.nonCrit&&!m.leaderCrit)n*=a.nonCrit;
  if(a.frozenGrass&&m.type==='grass'&&frozen(e))n*=a.frozenGrass;
  if(a.cloak&&({plant:'grass',sand:'ground',trash:'steel'})[u.form]===m.type)n*=1.4;
  if(a.spacePower&&u.spaceUntil>now())n*=1+a.spacePower;
  if(a.superDamage&&m.type&&G.Types.mult(m.type,e.types)>1)n*=a.superDamage;
  if(a.revealDamage&&(e.hidden||e.flying||e.sinnohRevealed))n*=1+a.revealDamage;
  if(a.flashFire&&m.type==='fire'&&u.flashFire)n*=1+a.flashFire;
  if(e.sinnohSandUntil>now())n*=1+(a.sandMark||0);
  if(m.type==='grass'&&e.sinnohWhipUntil>now())n*=1+(a.whipGrass||0);
  if(m.kind==='melee'&&a.fakeOut&&(e.sinnohFakeOut||0)<2)n*=1;
  // Convert an armor reduction into its correct denominator, leaving boss budgets intact.
  if(m.damageClass&&!m.leaderTrue){const specific=m.damageClass==='physical'?'sinnohPhysicalArmor':'sinnohSpecialArmor';let cut=Math.max((!e[specific+'Until']||e[specific+'Until']>now())?e[specific]||0:0,e.sinnohArmor||0,e.sinnohSoftUntil>now()?e.sinnohSoft||0:0,m.damageClass==='special'&&e.sinnohSpdefUntil>now()?.5:0);
   if(a.fightingArmor&&m.damageClass==='physical'&&m.type==='fighting')cut=Math.max(cut,a.fightingArmor);
   if(a.whipArmor&&m.damageClass==='physical'&&tag(m,'whip'))cut=Math.max(cut,a.whipArmor);
   if(a.beamArmor&&m.damageClass==='special'&&m.kind==='beam')cut=Math.max(cut,a.beamArmor);
   if(a.eliteArmor&&(e.elite||e.boss))cut=Math.max(cut,a.eliteArmor);
   n/=1-Math.min(.8,cut);
  }
  return n;
 }
 function crit(p,m,e){if(!has(p))return 0;const a=f();let n=0;
  if(a.skillCrit)n+=Math.min(.4,skillCount()*a.skillCrit);
  if(a.meleeCrit&&m?.kind==='melee')n+=a.meleeCrit;if(a.rockCrit&&m?.type==='rock')n+=a.rockCrit;
  if(a.typeCrit&&typed(m))n+=a.typeCrit;if(a.soundCrit&&tag(m,'sound'))n+=a.soundCrit;if(a.sandDodge&&m?.type==='dragon'&&wx()==='sand')n+=.25;if(a.appliance&&s().form==='mow'&&m?.kind==='melee')n+=.25;if(q(p).moodyUntil>now()){if(q(p).moodyUp==='crit')n+=.4;if(q(p).moodyDown==='crit')n-=.1;}if(a.spaceCrit&&tag(m,'space'))n+=a.spaceCrit;
  if(a.slowedCrit&&e&&(e.slowT>0||frozen(e)))return 1;if(a.fakeOut&&e&&m?.kind==='melee'&&(e.sinnohFakeOut||0)<2)return 1;return n;
 }
 function typeFactor(p,type,e,k,m){if(!has(p))return k;const a=f();if(a.scrappy&&k===0&&e.types.includes('ghost')&&['normal','fighting'].includes(type))k=G.Types.mult(type,e.types.filter(t=>t!=='ghost'))||1;
  if(a.insight){if(k>1)k=Math.min(3,k*1.5);else if(k>0&&k<1)k=Math.min(k,.4);}return k;
 }
 function beforeHurt(p,type,src){if(!has(p))return true;const a=f(),b=q(p);if(type==='water'&&(a.waterStack||a.waterHeal)){if(a.waterStack)s().waterStacks=Math.min(5,(s().waterStacks||0)+1);if(a.waterHeal)burst(p,src.rawAmount||src.enemy?.dmg||0);}
  if(type==='electric'&&a.electricHeal)burst(p,src.rawAmount||src.enemy?.dmg||0);if(type==='electric'&&a.electricGuard){b.electricUntil=now()+3;p.invuln=Math.max(p.invuln,1);}
  if(type==='fire'&&a.flashFire)s().flashFire=true;if(a.float&&type==='ground')return false;
  if(a.normalizeWeak&&type!=='fairy'&&G.Types.mult(type,p.mon.types)>1)src.sinnohNormalize=G.Types.mult(type,p.mon.types);
  if(a.sandDodge&&wx()==='sand'&&Math.random()<a.sandDodge||a.movingDodge&&p.walking&&Math.random()<a.movingDodge||a.flyingDodge&&p.walking&&Math.random()<a.flyingDodge||a.shadowDodge&&p.walking&&Math.random()<a.shadowDodge)return false;
  if(a.glow&&src.enemy&&Math.hypot(src.enemy.x-p.x,src.enemy.y-p.y)<a.glow&&Math.random()<.3)return false;
  if(a.weakWarning&&b.warningUntil>now()&&type&&G.Types.mult(type,p.mon.types)>1&&Math.random()<a.weakWarning)return false;
  if(a.phaseGuard&&b.phaseUntil>now())return false;
  return true;
 }
 function preIncoming(p,n,type,src){if(!has(p))return n;const a=f(),b=q(p),u=s();
  if(a.directReduction&&!['status','weather','environment'].includes(src.kind))n*=1-a.directReduction;
  if(a.allTypeGuard&&type)n*=1-a.allTypeGuard;
  if(a.noEnemyCrit&&src.critical)n/=src.critMultiplier||1.5;
  if(src.sinnohNormalize)n/=src.sinnohNormalize;
  if(a.rainGuard&&wx()==='rain')n*=1-a.rainGuard;
  if(a.lowIncoming&&p.hp<p.maxHp*.3)n*=a.lowIncoming;
  if(a.startupGuard&&a.slowStart&&!awake())n*=1-a.startupGuard;
  if(a.hurtGuard&&b.hurtGuardUntil>now())n*=1-a.hurtGuard;
  if(a.waterGuard&&b.waterGuardUntil>now())n*=1-a.waterGuard;
  if(a.cloak&&u.form==='trash'&&['ranged','projectile','beam'].includes(src.kind))n*=.7;
  if(a.appliance&&u.form==='wash')n*=.75;
  if(u.stolenUntil>now())n*=1-(u.stolenGuard||0);
  return n;
 }
 function postIncoming(p,n,type,src){if(!has(p)||!(n>0))return n;const a=f(),b=q(p);
  if(a.hitCap&&!['status','weather','environment'].includes(src.kind))n=Math.min(n,p.maxHp*a.hitCap);
  if(a.sturdy&&p.hp>1&&n>=p.hp&&proc(p,'sturdy',10))n=p.hp-1;
  if(a.emotions&&n>p.maxHp*.2&&src.kind!=='shared'){
   const others=actors().filter(v=>v!==p&&!v.dead&&v.hp>0);if(others.length){const part=n*.15/others.length;n*=.85;for(const ally of others){const white=own(ally),absorb=Math.min(white.shield||0,part);white.shield-=absorb;ally.hp=Math.max(0,ally.hp-(part-absorb));ally.flash=.14;if(ally.hp<=0){L.rescue(ally);G.Abilities.saveLethal(ally);if(ally.hp<=0){ally.dead=true;ally.anim?.play('Faint',{hold:true});G.Projectiles.clearOrbs(ally);}}}}
  }
  return n;
 }
 function onCast(p,m){if(!has(p)||m.leaderGenerated)return;const a=f(),b=q(p),u=s();u.casts++;
  if(a.adaptive)m.sinnohCastType=adaptiveType(p,m);else delete m.sinnohCastType;
  if(a.unburden)for(const ally of actors())q(ally).unburdenUntil=now()+2.5;
  if(a.recoil&&m.kind==='dash')p.hp=Math.max(1,p.hp-p.hp*a.recoil*(a.recoilHalf?.5:1));
  if(a.space&&m.kind==='dash'){const e=p.target,dist=e?Math.min(300,Math.hypot(e.x-p.x,e.y-p.y)):200,angle=e?Math.atan2(e.y-p.y,e.x-p.x):p.aim;b.dashStartX=p.x;b.dashStartY=p.y;const x=p.x+Math.cos(angle)*dist,y=p.y+Math.sin(angle)*dist;if(G.World.arenaContains?.(x,y,p.r)!==false){p.x=x;p.y=y;}p.invuln=Math.max(p.invuln,.5);u.spaceUntil=now()+2;}
  if(a.lowFireEcho&&m.type==='fire'&&p.hp<p.maxHp*.5&&proc(p,'fireEcho',.3))schedule(.15,()=>synthetic(p,m.kind,{...m}));
  if(a.waterGuard&&m.type==='water')for(const ally of actors())q(ally).waterGuardUntil=now()+3;
  if(a.appliance&&u.form==='heat'&&m.type==='fire'&&proc(p,'heatRadiation',.5))for(const e of enemies())e.applyBurn(1,p,true);
  if(a.bugSlow&&m.type==='bug')for(const e of G.EnemyMgr.queryCircle(p.x,p.y,160))e.applySlow(a.bugSlow,2);
  if(a.tailGlow&&m.kind==='buff')for(const ally of actors())q(ally).glowUntil=now()+4;
  if(a.ghostTrail&&m.type==='ghost'){u.trails||=[];u.trails.push({x:p.x,y:p.y,left:3});if(u.trails.length>24)u.trails.shift();}
  if([387,393,418,420,422,436,447,456,459,479,480,481,483,485,489,491,492].includes(root())){if(typed(m)||root()===418&&m.kind==='dash'||root()===479&&m.type===applianceType())action();}else if([412,415,425,442,482,487,493].includes(root()))action();else if(root()===401&&(tag(m,'sound')||m.type==='bug'))action();
 }
 function hit(p,e,m,dealt,critical){if(!has(p)||!(dealt>0))return;const a=f(),u=s(),b=q(p);
  if(m.sinnohZ){if(m.sinnohVulnerable){e.leaderVulnerable=m.sinnohVulnerable;e.leaderVulnerableUntil=now()+4;}if(a.timeExecute&&!e.boss&&e.hp/e.maxHp<a.timeExecute)secondary(p,e,Math.min(e.hp+(e.shield||0)+1,e.elite?budget(p)*.3:Infinity),m.type,{sinnohZ:true});if(m.sinnohCut)armor(e,m.sinnohCut,m.sinnohTemporary?5:0);if(m.sinnohBreak)e.shield=0;if(m.sinnohNightmare)e.sinnohNightmareUntil=now()+3;if(m.sinnohExecute&&!e.boss&&e.hp/e.maxHp<m.sinnohExecute)secondary(p,e,Math.min(e.hp+(e.shield||0)+1,e.elite?budget(p)*.3:Infinity),m.type,{sinnohZ:true});}
  if(m.leaderGenerated||m.typeBondSecondary)return;b.skillDamage+=dealt;
  const chargeRoot=root();if([390,408,427,431,443,453].includes(chargeRoot)&&['melee','dash'].includes(m.kind)||chargeRoot===396&&m.kind==='dash'||chargeRoot===441&&tag(m,'sound')||chargeRoot===449&&m.type==='ground'||chargeRoot===451&&critical||chargeRoot===434&&m.type==='poison'||chargeRoot===403&&m.type==='electric'&&['chain','beam'].includes(m.kind)||chargeRoot===484&&typed(m)&&critical||chargeRoot===486&&awake()&&m.kind==='melee')action();
  if(m.type==='ground'&&(m.slow||e.slowT>0))e.sinnohSoilUntil=now()+3;
  if(a.bugSlow&&m.type==='bug')e.applySlow(a.bugSlow,2);
  if(a.steelShield&&m.type==='steel')for(const ally of actors())shield(ally,dealt*a.steelShield);
  if(a.fightingArmor&&m.type==='fighting')armor(e,a.fightingArmor,3,'physical');
  if(a.fireTrue&&m.type==='fire'&&(e.sinnohArmor>0||e.sinnohPhysicalArmor>0&&(!e.sinnohPhysicalArmorUntil||e.sinnohPhysicalArmorUntil>now())||e.sinnohSoftUntil>now())&&eproc(e,'fireTrue',.3)){e.applyBurn(1,p,true);}
  if(a.dashReset&&m.kind==='melee'&&proc(p,'dashReset',1)&&Math.random()<a.dashReset)for(const real of p.moves.filter(x=>x.kind==='dash'))real.t=0;
  if(a.electricStun&&m.type==='electric'&&Math.random()<a.electricStun&&eproc(e,'electricStun',.75))stun(e,1);
  if(a.ghostBurn&&m.type==='ghost'&&Math.random()<a.ghostBurn)e.applyBurn(1,p);
  if(a.critStun&&critical&&eproc(e,'critStun',1))stun(e,a.critStun);
  if(a.fakeOut&&m.kind==='melee'&&(e.sinnohFakeOut||0)<2){e.sinnohFakeOut=(e.sinnohFakeOut||0)+1;stun(e,1);}
  if(a.bleed&&m.kind==='melee'&&critical){e.sinnohBleedUntil=now()+4;e.sinnohBleedOwner=p;}
  if(a.hitSlow)e.applySlow(a.hitSlow,2);
  if(a.breakAllShields)e.shield=0;
  if(a.superFang&&m.kind==='melee'&&eproc(e,'fang',1))secondary(p,e,Math.min(e.hp*a.superFang,e.boss||e.elite?budget(p)*.3:Infinity),'normal');
  if(a.darkPoison&&m.type==='dark')e.sinnohDarkUntil=now()+5;
  if(a.soundEcho&&tag(m,'sound')&&proc(p,'soundEcho',.3))secondary(p,e,dealt*a.soundEcho,'normal');
  if(a.soundDeflect&&tag(m,'sound'))e.sinnohSoundUntil=now()+3;
  if(a.soundReset&&tag(m,'sound')&&critical&&Math.random()<a.soundReset&&proc(p,'soundReset',.5)){const real=p.moves.find(x=>x.id===m.id);if(real)real.t=0;}
  if(a.jetReset&&m.id==='aqua-jet'&&proc(p,'jet',1)){for(const move of p.moves.filter(x=>x.kind==='dash'))move.t=0;p.invuln=Math.max(p.invuln,.5);}
  if(a.whipArmor&&tag(m,'whip')){armor(e,a.whipArmor,3,'physical');e.sinnohWhipUntil=now()+3;}
  if(a.sandMark&&m.type==='ground')e.sinnohSandUntil=now()+3;
  if(a.critArmor&&critical)armor(e,a.critArmor,0,'physical');
  if(a.beamArmor&&m.kind==='beam')armor(e,a.beamArmor,0,'special');
  if(a.appliance&&u.form==='frost'&&m.type==='ice'&&Math.random()<.35&&eproc(e,'applianceFreeze',1))e.freezeT=Math.max(e.freezeT||0,1*(e.boss?.5:1));
  if(a.iceBreak&&frozen(e)&&eproc(e,'iceBreak',1))for(const other of G.EnemyMgr.queryCircle(e.x,e.y,90))secondary(p,other,fraction(p,other,a.iceBreak),'ice');
  if(a.holyWater&&m.type==='water'&&!e.types.includes('water')&&eproc(e,'holyWater',.3))secondary(p,e,dealt*a.holyWater,'water');
  if(a.airFlinch&&tag(m,'air')&&Math.random()<a.airFlinch&&eproc(e,'airFlinch',1))stun(e,.8);
  if(a.magmaEcho&&zOn()&&m.type==='fire'&&proc(p,'magmaEcho',.5))blast(p,e.x,e.y,80,dealt*a.magmaEcho,'fire',{sinnohSecondary:true});
  if(a.spaceShield&&tag(m,'space')&&proc(p,'spaceShield',.5)){let count=0;for(const shot of [...G.Projectiles.all()])if(!shot.friendly&&Math.hypot(shot.x-e.x,shot.y-e.y)<=200){G.Projectiles.remove(shot);count++;}if(count)shield(p,p.maxHp*Math.min(.2,count*.02));}


  if(typed(m))event('sinnohTypedHit');
 }
 function hurt(p,n,type,src){if(!has(p)||!(n>0)||src.kind==='shared')return;const a=f(),b=q(p),u=s();b.lastHurt=now();b.received+=n;b.healedSafe=false;if([410,415,417,442,481,487].includes(root()))action();if(root()===488)action(n/Math.max(1,p.maxHp)*5);
  if(a.kinetic)u.kinetic=Math.min(budget(captain()),(u.kinetic||0)+n*a.kinetic);
  if(a.emotions){u.emotions=u.emotionUntil>now()?Math.min(3,(u.emotions||0)+1):1;u.emotionUntil=now()+5;}
  if(a.hurtGuard)b.hurtGuardUntil=now()+2;
  if(a.contactSlow&&!['weather','environment','status'].includes(src.kind)&&src.enemy)src.enemy.applySlow(a.contactSlow,2);
  if(a.contactSeal&&src.kind==='contact'&&src.enemy&&Math.random()<a.contactSeal){stun(src.enemy,2);src.enemy.leaderSilenceUntil=now()+2;}
  if((a.roughSkin||a.quakeReflect)&&src.enemy&&src.kind==='contact'&&proc(p,'reflect',.75))secondary(p,src.enemy,a.quakeReflect?n:fraction(p,src.enemy,a.roughSkinAdvance||a.roughSkin),'ground');
  if(a.toxicExplosion&&n>p.maxHp*.2&&proc(p,'heavyPoison',1.5))for(const e of G.EnemyMgr.queryCircle(p.x,p.y,160))secondary(p,e,fraction(p,e,a.toxicExplosion),'poison');
  if(a.aftermath&&src.kind==='contact'&&proc(p,'aftermath',.75))for(const e of G.EnemyMgr.queryCircle(p.x,p.y,160))secondary(p,e,fraction(p,e,a.aftermath),'ghost');
  if(a.darkHeal&&type==='dark')burst(p,n*a.darkHeal);
  if(a.electricGuard&&src.kind==='contact'&&src.enemy&&proc(p,'contactElectric',.75)){stun(src.enemy,1);secondary(p,src.enemy,n*.5,'electric');}
 }
 function status(p,kind,src){if(!has(p))return true;const a=f(),b=q(p);if(a.statusImmune||a.nightmareImmune&&(src?.nightmare||src?.fear)||a.hydration&&wx()==='rain'||a.poisonImmune&&kind==='poison'||a.controlImmune&&['stun','freeze','slow'].includes(kind)||a.mindImmune&&['stun','attack'].includes(kind)||a.slowStart&&awake()&&['stun','freeze','slow'].includes(kind))return false;
  if(a.defiant&&['slow','attack'].includes(kind))s().defiantUntil=now()+6;
  if(a.competitive&&['slow','attack'].includes(kind))for(const ally of actors())q(ally).competitiveUntil=now()+6;
  if(a.steadfast&&['slow','stun'].includes(kind)){b.rescueUntil=now()+4;p.invuln=Math.max(p.invuln,1);}
  return true;
 }
 function killed(e){if(!active()||!Z.team(e.lastAttacker))return;const a=f(),u=s(),m=e.lastTypeBondAttack||{};u.kills++;if([399,442].includes(root())&&!m.leaderGenerated)action();
  if(a.eliteGuard&&(e.elite||e.boss)&&proc(captain(),'eliteGuard',10))for(const p of actors())p.invuln=Math.max(p.invuln,a.eliteGuard);
  if(a.gratitudeHeal&&m.sinnohZ){u.flowers||=[];u.flowers.push({x:e.x,y:e.y,left:6});if(u.flowers.length>24)u.flowers.shift();}
  if(a.economy==='honey')u.honey=Math.min(10,Math.floor(u.kills/10));
  if(a.eliteReset&&(e.elite||e.boss))for(const p of actors())for(const m of p.moves)m.t=0;
  if(a.toxicExplosion&&Math.hypot(e.x-captain().x,e.y-captain().y)<200&&!m.leaderGenerated){for(const target of G.EnemyMgr.queryCircle(e.x,e.y,100))if(target!==e)secondary(e.lastAttacker,target,fraction(e.lastAttacker,target,a.toxicExplosion),'poison');}
  if(a.devourHp&&tag(m,'whip')&&(u.devourHp||0)<5){u.devourHp=(u.devourHp||0)+1;G.HoennMarket.addFlatHp(1,50);}
  if(a.nightmareHeal&&m.sinnohNightmare){for(const p of actors())heal(p,p.maxHp*a.nightmareHeal);const remaining=Math.max(0,.03-(u.nightmareGrowth||0)),gain=Math.min(a.nightmareGrowth,remaining,Math.max(0,.2-(G.Expedition.run.sinnohGrowth||0)));u.nightmareGrowth=(u.nightmareGrowth||0)+gain;G.Expedition.run.sinnohGrowth=(G.Expedition.run.sinnohGrowth||0)+gain;}
  if(a.zKillRefund&&m.sinnohZ&&!u.zRefunded){u.zRefunded=true;state().charge=Math.min(1,state().charge+a.zKillRefund);}
 }
 function rescue(p,old){if(!has(p))return old(p);const a=f(),b=q(p),u=s();if(a.lifeline&&p!==captain()&&!u.lifelineUsed){u.lifelineUsed=true;p.hp=p.maxHp*.5;p.dead=false;p.invuln=2;return true;}
  if(a.lunarRescue&&p===captain()&&!b.lunarUsed){b.lunarUsed=true;p.hp=p.maxHp*.5;p.dead=false;p.invuln=2;for(const e of enemies())if(!e.boss&&!e.elite)secondary(captain(),e,e.hp+(e.shield||0)+1,'psychic');else secondary(captain(),e,fraction(captain(),e,.1),'psychic');return true;}
  const saved=old(p);if(saved)b.rescueUntil=now()+(a.lastStandHaste?2:3);return saved;
 }
 function start(){if(!active())return;const previous=s().form,a=f();state().sinnoh={start:now(),kills:0,casts:0,honey:0,propKills:0,beeBlocks:a.beeBlocks||0,form:previous||(root()===492?'sky':'land')};const u=s();
  if(a.cloak)u.form=formPick(cloaks,previous);
  if(a.appliance)u.form=formPick(appliances,previous);
  for(const p of actors()){p.sinnohState={lastHurt:now(),received:0,skillDamage:0,at:{periodHeal:now()+(a.healEvery||4),periodGuard:now()+10},formStallUntil:a.appliance&&previous&&previous!==u.form?now()+1:0};if(a.openingShield)shield(p,p.maxHp*a.openingShield);}
  if(a.openingRain)G.Weather.force('rain',G.Expedition.run.wave.duration+2);
  state().targetEvents=Math.max(12,actors().reduce((n,p)=>n+p.moves.filter(m=>m.kind!=='buff').reduce((v,m)=>v+60/Math.max(1,m.cd*p.cdMul)*.5,0),0));
 }
 function tick(dt){if(!active()||G.Expedition.run.phase!=='combat'||!(dt>0))return;const a=f(),u=s();u.pulse=(u.pulse||0)+dt;G.HoennMarket?.applyHp();
  for(const p of actors()){
   const b=q(p);if(p.dead)continue;const newSlow=p.slowT>0&&!b.hadSlow,newAttack=p.attackDebuffT>0&&!b.hadAttack;b.hadSlow=p.slowT>0;b.hadAttack=p.attackDebuffT>0;if(newSlow||newAttack){if(status(p,newSlow?'slow':'attack',null)===false){p.slowT=0;p.attackDebuffT=0;p.attackDebuff=0;}}
   if(a.ghostTrail&&p.walking&&proc(p,'movingTrail',.3)){u.trails||=[];u.trails.push({x:p.x,y:p.y,left:3});if(u.trails.length>24)u.trails.shift();}
   const wanted=factor(p,'hp'),before=p.sinnohHpFactor||1;if(wanted!==before){const ratio=p.hp/p.maxHp;p.maxHp=p.maxHp/before*wanted;p.hp=p.maxHp*ratio;p.sinnohHpFactor=wanted;}
   if(a.pickup)p.leaderMagnet=a.pickup;
   if(a.rootRegen&&!captain().walking)heal(p,p.maxHp*a.rootRegen*dt);
   if(a.rainRegen&&wx()==='rain')heal(p,p.maxHp*a.rainRegen*dt);if(a.snowRegen&&wx()==='snow')heal(p,p.maxHp*a.snowRegen*dt);
   if(a.cloak&&u.form==='plant')heal(p,p.maxHp*.015*dt);
   if(a.sunDrain&&wx()==='sun')p.hp=Math.max(1,p.hp-p.maxHp*a.sunDrain*dt);
   if(a.safeHeal&&now()-b.lastHurt>=4&&!b.healedSafe){b.healedSafe=true;burst(p,p.maxHp*a.safeHeal);}
   if(a.periodHeal&&proc(p,'periodHeal',a.healEvery))burst(p,p.maxHp*a.periodHeal);
   if(a.periodInvuln&&proc(p,'periodGuard',10))p.invuln=Math.max(p.invuln,2);
   if(a.lowShield&&!b.lowShieldUsed&&p.hp<p.maxHp*.3){b.lowShieldUsed=true;shield(p,p.maxHp*a.lowShield);}
   if(a.hydration&&wx()==='rain')G.ActorStatus.clear(p);
   if(a.moody&&t()>=10&&proc(p,'moody',10)){const pool=['atk','spd','defense','crit'],i=Math.floor(Math.random()*pool.length);b.moodyUp=pool[i];b.moodyDown=pool[(i+1+Math.floor(Math.random()*(pool.length-1)))%pool.length];b.moodyUntil=now()+10;}

   if(a.phaseGuard||a.shadowDodge){b.inWall=!!G.World.isWall?.(p.x,p.y);if(b.inWall&&a.phaseGuard&&!b.wasWall)b.phaseUntil=now()+1.5;b.wasWall=b.inWall;}
   if(a.weakWarning){const danger=G.Projectiles.all().some(v=>!v.friendly&&Math.hypot(v.x+v.vx*.5-p.x,v.y+v.vy*.5-p.y)<p.r+v.r+20);if(danger)b.warningUntil=now()+.5;}
   if(a.mimic&&t()>=10&&proc(p,'mimic',10)){const source=actors().filter(v=>v!==p&&!v.dead).sort((a,b)=>q(b).skillDamage-q(a).skillDamage)[0],m=source?.activeMove?.()||source?.moves[0];if(m&&m.kind!=='buff')synthetic(p,m.kind,{...m,dmg:m.dmg*.7});}
   if(a.soulsMissiles&&u.kills>=108&&p.hp<p.maxHp*.3&&!u.soulMissiles){u.soulMissiles=true;synthetic(p,'nova',{type:'ghost',count:18,dmg:240/Math.max(.1,p.atk),homing:4,homingTarget:enemies().sort((a,b)=>b.hp-a.hp)[0],sinnohSoul:true,pierce:0,size:8,life:3,speed:260});}
   if(a.gratitudeHeal&&u.flowers?.some(v=>Math.hypot(v.x-p.x,v.y-p.y)<=100))heal(p,p.maxHp*a.gratitudeHeal*dt);
  }
  for(const key of ['trails','flowers'])if(u[key])u[key]=u[key].filter(v=>(v.left-=dt)>0);
  if(u.pulse>=.5){u.pulse-=.5;pulse();}
 }
 function pulse(){const a=f(),u=s(),c=captain();
  for(const e of enemies()){
   const dist=Math.hypot(e.x-c.x,e.y-c.y);
   if(a.openingIntimidate&&t()<8){e.leaderDamage=1-a.openingIntimidate;e.leaderDamageUntil=now()+.6;if(a.openingSlow)e.applySlow(a.openingSlow,.6);}
   if(a.intimidate&&dist<250){e.leaderDamage=1-a.intimidate;e.leaderDamageUntil=now()+.6;}
   if(a.stench&&dist<a.stench){e.sinnohStench=Math.min(.4,(e.sinnohStench||0)+.025);armor(e,e.sinnohStench,3);e.applySlow(.3,1);if(Math.random()<.2&&eproc(e,'stench',1))stun(e,.4);}
   if(a.glow&&dist<a.glow)e.applySlow(.25,1);
   if(a.sandDamage&&wx()==='sand'&&!e.types.some(t=>['rock','steel','ground'].includes(t)))secondary(c,e,a.sandDamage*.5,'ground');
   if(a.magmaAura&&dist<a.magmaAura)secondary(c,e,20,'fire');
   if(a.ghostTrail&&u.trails?.some(v=>Math.hypot(v.x-e.x,v.y-e.y)<80))e.applySlow(.4,.6);
   if(a.revealDamage&&(e.flying||e.hidden)){e.sinnohRevealed=true;e.hidden=false;}
   if(a.shadowAnchor&&dist<250){pull(e,c.x,c.y,20);e.leaderSilenceUntil=now()+.7;}
  }
  for(const shot of [...G.Projectiles.all()])if(!shot.friendly){
   const dist=Math.hypot(shot.x-c.x,shot.y-c.y),from=shot.owner||shot.source||enemies().find(e=>e.id===shot.sourceId);
   if(from?.sinnohSoundUntil>now()&&!shot.sinnohDeflectChecked){shot.sinnohDeflectChecked=true;if(Math.random()<a.soundDeflect){const vx=shot.vx;shot.vx=-shot.vy;shot.vy=vx;shot.sinnohHarmless=true;}}
   if(a.followMe&&dist<350){const speed=Math.hypot(shot.vx,shot.vy),angle=Math.atan2(c.y-shot.y,c.x-shot.x);shot.vx=Math.cos(angle)*speed;shot.vy=Math.sin(angle)*speed;}
   const angle=Math.abs(Math.atan2(Math.sin(Math.atan2(shot.y-c.y,shot.x-c.x)-c.aim),Math.cos(Math.atan2(shot.y-c.y,shot.x-c.x)-c.aim)));
   if(a.frontWall&&dist<160&&angle<=Math.PI/3||u.beeBlocks>0&&dist<140){G.Projectiles.remove(shot);if(!a.frontWall)u.beeBlocks--;event('intercept');continue;}
   const scale=1-(a.chronoSlow||a.bulletSlow||0),previous=shot.sinnohSpeedScale||1;shot.vx*=scale/previous;shot.vy*=scale/previous;shot.sinnohSpeedScale=scale;
  }
 }
 function enemyTick(e,dt){if(!active()||e.dead)return;const a=f();
  if(a.chronoSlow)e.applySlow(a.chronoSlow,.2);if(frozenSource({enemy:e}))e.classStunT=Math.max(e.classStunT||0,s().freezeStart+s().freezeDuration*(e.boss?.5:1)-now()+dt);
  if(a.pressure){e.shotCd+=dt*a.pressure;e.skillCd+=dt*a.pressure;}
  if(a.nightmare&&(frozen(e)||e.slowT>0||e.sinnohNightmareUntil>now())&&eproc(e,'nightmare',1)){e.sinnohNightmareUntil=now()+1.1;secondary(captain(),e,Math.min(e.maxHp*a.nightmare,e.boss||e.elite?budget(captain())*.1:Infinity),'dark',{sinnohNightmare:true});}
  if(e.sinnohBleedUntil>now()&&eproc(e,'bleed',1))secondary(e.sinnohBleedOwner||captain(),e,a.bleed||30,'normal');
 }
 function freeze(seconds){const u=s();u.freezeStart=now();u.freezeDuration=seconds;for(const e of enemies())stun(e,seconds);}
 function frozenSource(source){if(!active()||!s().freezeDuration)return false;const e=source?.enemy||source?.owner||enemies().find(e=>e.id===(source?.sourceId||source?.ownerId));return now()<s().freezeStart+s().freezeDuration*(e?.boss?.5:1);}
 function finish(){if(!active())return;const u=s();G.HoennMarket?.captureBattle({...u,duration:t(),weatherKinds:[]});u.freezeDuration=0;u.trails=[];u.flowers=[];if(root()===492||f().hydration)cleanse();}
 function toggleForm(){if(!active()||!f().shayminForms||G.Expedition.run.phase!=='combat'||now()-(s().formAt??-10)<2)return false;s().form=s().form==='sky'?'land':'sky';s().formAt=now();event('formChange');return true;}
 function itemBought(id){if(!active()||!f().applianceUpgrade||!['choicescarf','assaultvest','quickclaw','leftovers'].includes(id))return;const pool=actors().flatMap(p=>p.moves).filter(m=>m.type===applianceType()&&m.lvl<5&&!m.evolved);if(pool.length)G.Moves.levelUp(G.U.pick(pool));}
 function leech(p,amount){if(!has(p))return amount;const a=f(),boost=a.leechFactor&&(root()!==420||wx()==='sun')?a.leechFactor:1,healed=heal(p,amount*boost);if(a.leechShield&&healed)for(const ally of actors())shield(ally,healed*a.leechShield);return 0;}
 function draw(ctx){if(!active())return;const u=s(),c=captain();if(f().frontWall){ctx.save();ctx.strokeStyle='#eccd7b';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(c.x,c.y,150,105,0,c.aim-Math.PI/3,c.aim+Math.PI/3);ctx.stroke();ctx.restore();}if(u.beeBlocks>0)for(let i=0;i<u.beeBlocks;i++){const a=now()*2+i*Math.PI*2/3;G.FX.ring(c.x+Math.cos(a)*80,c.y+Math.sin(a)*56,4,7,'#ffd976',.1,2);}for(const [key,color,r] of [['trails','#a879d9',80],['flowers','#ef9fcd',100]])for(const v of u[key]||[]){ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=.5;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(v.x,v.y,r,r*.7,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}
 wrap('factor',(old,p,k)=>old(p,k)*factor(p,k));wrap('rate',(old,p,m)=>old(p,m)*rate(p,m));wrap('move',(old,p,m)=>move(p,old(p,m)));wrap('outgoing',(old,p,e,m)=>old(p,e,m)*outgoing(p,e,m));wrap('crit',(old,p,m,e)=>old(p,m,e)+crit(p,m,e));
 wrap('critMultiplier',(old,p,m)=>Math.max(old(p,m),has(p)?Math.max(0,(m?.kind==='melee'?f().meleeCritMul||1.5:1.5)-1.5,tag(m,'space')?(f().spaceCritMul||1.5)-1.5:0, f().slowStart&&awake()?(f().awakeCritMul||1.5)-1.5:0):0));
 wrap('beforeHurt',(old,p,type,src)=>beforeHurt(p,type,src)&&old(p,type,src));wrap('incoming',(old,p,n,type,src)=>postIncoming(p,old(p,preIncoming(p,n,type,src),type,src),type,src));
 for(const [key,fn]of Object.entries({onCast,hit,hurt,killed,enemyTick}))wrap(key,(old,...args)=>{old(...args);fn(...args);});
 wrap('beginBattle',old=>{old();start();});wrap('tick',(old,dt)=>{old(dt);tick(dt);});wrap('finishBattle',old=>{finish();old();});wrap('rescue',(old,p)=>rescue(p,old));wrap('draw',(old,ctx)=>{old(ctx);draw(ctx);});
 wrap('phase',(old,p)=>old(p)||has(p)&&!!(f().space||f().phaseGuard));
 wrap('slowImmune',(old,p)=>old(p)||has(p)&&!!(f().controlImmune||f().slowStart&&awake()));
 wrap('xp',(old,p)=>old(p)*(has(p)?f().xpFactor||1:1));wrap('refreshCost',(old,n)=>Math.ceil(old(n)*(active()&&f().stench?1.15:1)));
 const originalActivate=L.activate;L.activate=(...args)=>active()&&f().slowStart&&!awake()?false:originalActivate(...args);
 const originalDraw=G.Player.prototype.draw;G.Player.prototype.draw=function(ctx,...args){if(has(this)&&this.sinnohHiddenUntil>now()){ctx.save();ctx.globalAlpha*=.18;try{return originalDraw.call(this,ctx,...args);}finally{ctx.restore();}}return originalDraw.call(this,ctx,...args);};
 const originalBuff=G.Player.prototype.addBuff;G.Player.prototype.addBuff=function(stat,amount,dur,count){return originalBuff.call(this,stat,amount*(has(this)&&f().simple&&amount>0?2:1),dur*(has(this)?f().buffDuration||1:1),count);};
 const originalProp=G.World.damageProp;G.World.damageProp=function(prop,...args){const alive=prop.hp>0,result=originalProp.call(this,prop,...args);if(active()&&f().economy==='worker'&&alive&&prop.hp<=0){s().propKills++;action();}return result;};
 wrap('healEvent',(old,p,n)=>{old(p,n);if(has(p)&&n>0&&[420,455].includes(root()))action(n/Math.max(1,p.maxHp)*5);});
 return {active,has,root,f,s,q,now,t,zOn,proc,eproc,burst,teamHeal,cleanse,fraction,tag,move,factor,wrap,typeFactor,fusion,adaptiveType,armor,secondary,freeze,frozenSource,toggleForm,applianceType,status,itemBought,leech,
  floating:p=>has(p)&&!!(L.profile().groundImmune||f().float),knockImmune:p=>has(p)&&!!(f().knockImmune||f().slowStart&&awake()),guts:p=>has(p)&&!!(f().guts||f().defiant),weatherImmune:p=>has(p)&&!!(f().weatherImmune||f().slowStart&&awake()),
  poisonHeal:()=>false,canCast:p=>!has(p)||!(p.sinnohHiddenUntil>now()),effectChance:(p,chance)=>has(p)?Math.min(1,chance*(f().serene||1)):chance};
})();
