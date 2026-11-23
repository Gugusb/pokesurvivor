/* Johto extensions reuse the captain engine, normal Combat geometry and the
 * player's real stat getters. No account state or strategic HP is healed here. */
G.LeaderJohto=(()=>{
 const L=G.LeaderAbilities,Z=L._z,{actors,enemies,captain,state,own,shield,stun,vulnerable,pull,clearShots,direct,blast,percent,budget,field,schedule,synthetic,event,withoutCharge}=Z;
 const active=()=>L.active()&&L.definition(captain()?.dex)?.generation===2;
 const has=p=>active()&&Z.team(p);
 const f=()=>L.profile().johto||{},now=()=>state().time;
 const root=()=>L.definition(captain().dex).root;
 const q=p=>p.johtoState||=( {lastHurt:0,tick:0,received:0,kills:0,combo:0,stacks:0,hitAt:0} );
 const battleTime=()=>Math.max(0,now()-(state().johtoStart||0));
 const zOn=()=>state().z?.startsWith('johto')&&state().zUntil>now();
 const weather=k=>G.Weather?.current?.kind===k;
 const near=(p,r)=>Math.hypot(p.x-captain().x,p.y-captain().y)<=r;
 const special=m=>m?.damageClass==='special';
 const ranged=m=>['projectile','beam','cone','boomerang'].includes(m?.kind);
 const bad=p=>Object.values(p.actorStatus||{}).some(s=>s.left>0)||p.slowT>0||p.attackDebuffT>0;
 const enemyBad=e=>e.poison>0||e.burn>0||e.slowT>0||e.freezeT>0||e.classStunT>0;
 function proc(p,id,cd){const s=q(p);s.procs||={};if((s.procs[id]??-Infinity)>now())return false;s.procs[id]=now()+cd;return true;}
 function burst(p,amount){if(p&&!p.dead&&amount>0)p.heal(Math.min(amount,p.maxHp-p.hp));}
 function healAll(n,missing=false){for(const p of actors())burst(p,(missing?p.maxHp-p.hp:p.maxHp)*n);}
 function cleanse(){for(const p of actors())G.ActorStatus.clear(p);}
 function attack(p,m){const s=q(p);return s.counterCasting||m?.leaderGenerated;}
 function factor(p,key){
  if(!has(p))return 1;const a=f(),s=q(p);let n=1;
  if(a.captainAllStats&&p===captain())n*=1+a.captainAllStats;
  if(['spd','agility'].includes(key)&&a.acceleration)n+=Math.min(10,Math.floor(battleTime()/2))*a.acceleration;
  if(key==='spa'){
   if(a.solarPower&&weather('sun'))n+=a.solarPower;
   if(a.hellSun&&weather('sun'))n+=a.hellSun;
   if(s.competitiveUntil>now())n+=.6;
   if(s.flashSpaUntil>now())n+=a.flashSpa||0;
  }
  if(key==='atk'){
   if(a.bearPower)n+=a.bearPower*(1-p.hp/p.maxHp);
   if(a.guts&&bad(p))n+=a.guts;
   n+=Math.min(.3,s.moxie||0)+Math.min(.6,state().eliteAttack||0)+Math.min(.6,s.defiant||0);
   if(s.flashAtkUntil>now())n+=a.flashAtk||0;
   if(root()===213&&zOn())n=Math.min(3,Math.max(1,p.baseDefense/(p.mon.defense||1)*2.2/.4));
  }
  if(['defense','spdef'].includes(key)){
   n+=Math.min(.3,(s.stacks||0)*(a.armorStack||0));
   if(a.mudDefense&&s.inMudUntil>now())n+=a.mudDefense;
   if(key==='spdef'&&a.sandArmor&&p.mon.types.includes('rock')&&weather('sand'))n+=a.sandArmor;
   if(root()===213&&zOn())n*=.2;
  }
  if(key==='spd'){
   if(a.quickFeet&&bad(p))n+=a.quickFeet;
   if(a.sunHaste&&weather('sun'))n+=a.sunHaste;
   if(a.sandSpeed&&weather('sand'))n+=a.sandSpeed;
   if(a.notSnowSlow&&!weather('snow'))n*=1-a.notSnowSlow;
   if(a.magmaHaste&&p.hp/p.maxHp<.4)n+=a.magmaHaste;
   if(s.speedUntil>now())n+=.4;if(s.iceHasteUntil>now())n+=.5;
   if(s.purePathUntil>now())n+=.4;
   if(s.rollingFatigue>now())n*=.7;
   if(p.actorStunT>0)n=0;
  }
  if(a.moody&&s.moodyKey===key)n+=.5;
  return Math.max(0,n);
 }
 function rate(p,m){
  if(!has(p))return 1;const a=f(),s=q(p);let n=1;
  if(a.lowHealthCD&&p.hp<p.maxHp*.5)n/=a.lowHealthCD;
  if(a.sunHaste&&weather('sun'))n/=1-a.sunHaste;
  if(a.rainCD&&weather('rain'))n/=a.rainCD;
  if(a.magmaHaste&&p.hp<p.maxHp*.4)n/=1-a.magmaHaste;
  if(a.sunFireCD&&weather('sun')&&m.type==='fire')n/=a.sunFireCD;
  if(a.quickFeet&&bad(p)&&m.kind==='melee')n*=1.5;
  if(s.runeHasteUntil>now())n*=2;
  if(root()===236&&s.combo%3===2&&m.kind==='melee')n*=1.5;
  if(zOn()&&root()===244&&a.sacredFury&&m.kind==='dash')n*=2;
  return n;
 }
 function move(p,m){
  if(!has(p)||m.leaderGenerated)return m;const a=f(),s=q(p),n={...m};
  if(a.solarBeam&&m.kind==='beam')n.radius=Math.max(m.radius,Z.screenRadius()*2);
  if(a.rangedSpeed&&ranged(m))n.speed=(m.speed||300)*a.rangedSpeed;
  if(a.turretMode&&own(p).stationary>=.5&&ranged(m)){if(m.kind==='beam')n.radius*=1.8;else n.life*=1.8;}
  if(a.phaseAttacks)n.phaseWalls=true;
  if(a.skillLink&&m.kind==='melee')n.knock=Math.max(n.knock||0,60);
  if(a.fistDefense&&m.kind==='melee')n.dmg*=1+Math.min(.5,Math.max(0,p.baseSpDef-1)*a.fistDefense);
  if(a.onlyBloom&&['nova','aura'].includes(m.kind))n.type=state().runeType||'psychic';
  if(a.tripleCombo&&m.kind==='melee'){
   if(s.combo%3===0){n.radius+=150;n.johtoKick=true;}
   if(s.combo%3===2)n.arc=Math.PI*2;
  }
  if(zOn()&&root()===236&&m.kind==='melee'){n.radius*=2;n.zCrit=true;n.johtoSmash=true;}
  return n;
 }
 function outgoing(p,e,m){
  if(!has(p))return 1;const a=f(),s=q(p);let n=1;
  if(a.eruption&&m.kind==='nova')n*=1+(p.hp>=p.maxHp*.5?Math.min(1,s.eruptionUntil>now()?1:p.hp/p.maxHp)*a.eruption:0);
  if(a.aromaPower&&near(p,180)&&(m.type==='grass'||special(m)))n*=1+a.aromaPower;
  if(a.glow&&['water','electric'].includes(m.type)&&Math.hypot(e.x-captain().x,e.y-captain().y)<a.glow)n*=1.35;
  if(a.web&&m.kind==='melee'&&e.johtoWebUntil>now())n*=1.5;
  if(a.jaws&&m.kind==='melee'&&e.shield>0)n*=2;
  if(a.movingDamage&&p.walking)n*=a.movingDamage;
  if(a.rollingPower&&m.kind==='dash')n*=1+Math.min(5,s.rolling||0)*a.rollingPower;
  if(a.nextFist&&s.fistReady&&m.kind==='melee'){n*=1+a.nextFist;}
  if(a.unaware&&e.johtoDefenseBuff>1)n*=e.johtoDefenseBuff;
  if(m.johtoBaton)n*=2;
  return n;
 }
 function typeFactor(p,type,e,k){
  if(!has(p))return k;const a=f();
  if(a.tinted&&k>0&&k<1)return 1;
  if(a.scrappy&&k===0&&e.types.includes('ghost')&&['normal','fighting'].includes(type))return G.Types.mult(type,e.types.filter(t=>t!=='ghost'))||1;
  return k;
 }
 function crit(p,m,e){
  if(!has(p))return 0;const a=f(),s=q(p);let n=a.teamCrit||0;
  if(a.critDouble)n+=(p.critChance||0)+(G.Items?.critBonus(p)||0)+(G.Specialization?.stats(m).crit||0)+(G.ExpeditionGrowth?.crit(p)||0)+(G.TrainerTalents?.crit(p)||0)+(G.SquadTraits?.crit(p)||0);
  if(a.rangedCrit&&ranged(m))n+=a.rangedCrit;
  if(a.scoutCrit&&own(p).stationary>=.3)n+=a.scoutCrit;
  if(a.turretMode&&own(p).stationary>=.5&&ranged(m))n+=.35;
  if(a.jawsCrit&&p.hp/p.maxHp<.35&&m.kind==='melee')n+=a.jawsCrit;
  if(a.webCrit&&e?.poison>0&&m.kind==='melee')n+=a.webCrit;
  if(a.burnMeleeCrit&&e?.burn>0&&m.kind==='melee')n+=a.burnMeleeCrit;
  if(a.armorCrit&&e?.leaderArmorUntil>now()&&m.kind==='melee')n+=a.armorCrit;
  if(a.playRoughCrit&&e?.leaderDamageUntil>now()&&m.kind==='melee')return 1;
  if(a.openingCrit&&battleTime()<=2&&m.kind==='melee'&&!s.openingHit)return 1;
  if(root()===163&&f().healthyPen&&e?.hp/e?.maxHp>.7&&!e.leaderFirstHit)return 1;
  if(a.bearGhostCrit&&e?.types.includes('ghost')&&m.kind==='melee')return 1;
  if(s.goldenUntil>now()||zOn()&&(a.sacredFury||a.timeFury))return 1;
  if(root()===213&&zOn()&&['melee','projectile'].includes(m.kind))return 1;
  return n;
 }
 function penetration(p,e,m){return has(p)&&f().healthyPen&&special(m)&&e.hp/e.maxHp>.7?f().healthyPen:0;}
 function status(p,kind,source){
  if(!has(p))return true;const a=f();
  if(!G.ActorStatus?.active(p,kind)){if(root()===174)for(const ally of actors())q(ally).competitiveUntil=now()+6;if(a.defiant)for(const ally of actors())q(ally).defiant=Math.min(.6,(q(ally).defiant||0)+a.defiant);}
  if(a.controlImmune&&['stun','freeze','slow'].includes(kind)||a.magicGuard&&['poison','burn'].includes(kind)||a.waterVeil&&kind==='burn'||a.iceImmune&&kind==='freeze')return false;
  if(a.iceHaste&&kind==='freeze'){q(p).iceHasteUntil=now()+3;return false;}
  if(a.magicBounce&&['slow','stun','freeze','attack'].includes(kind)){if(source&&!source.dead){if(kind==='slow')source.applySlow(.5,3);else if(kind==='stun')stun(source,1);else if(kind==='attack'){source.leaderDamage=.7;source.leaderDamageUntil=now()+3;}}event('meteorCast');return false;}
  return true;
 }
 function poisonHeal(p){if(!has(p)||!f().poisonHeal)return false;burst(p,p.maxHp*f().poisonHeal);return true;}
 function beforeHurt(p,type,source){
  if(!has(p))return true;const a=f(),s=q(p);
  if(a.magicGuard&&['status','weather','environment','recoil'].includes(source.kind))return false;
  if(a.weatherImmune&&source.kind==='weather')return false;
  if(a.float&&source.kind==='environment')return false;
  if(a.waterVeil&&source.status==='burn')return false;
  if(a.damp&&['explosion','selfdestruct'].includes(source.kind))return false;
  if(type==='fire'&&(a.flashSpa||a.flashAtk||a.eruptionFire)){for(const ally of actors()){q(ally).flashSpaUntil=now()+6;q(ally).flashAtkUntil=now()+6;q(ally).eruptionUntil=now()+5;}}
  if(type==='electric'&&a.electricHeal){const n=(source.enemy?.dmg||10)*a.electricHeal;for(const ally of actors())burst(ally,n/Math.max(1,actors().length));}
  if(type==='water'&&a.unaware)healAll(.03,true);
  if(a.dodgeHeal&&p.dashGuardT>0&&source.kind==='ranged'&&proc(p,'dodge',1))healAll(a.dodgeHeal,true);
  if(a.timeRewind&&near(p,a.timeAura)&&Math.random()<a.timeRewind&&proc(p,'rewind',.25)){const pos=s.positions?.[0];if(pos&&G.World.isFree(pos.x,pos.y,p.r)){p.x=pos.x;p.y=pos.y;}return false;}
  return true;
 }
 function incoming(p,n,type,source){
  if(!has(p))return n;const a=f(),s=q(p),old=n;
  if(a.aroma&&near(p,a.aroma)&&['contact','melee','ranged','projectile','beam'].includes(source.kind))n*=.8;
  if(a.tide&&near(p,a.tide)&&['ranged','projectile','beam'].includes(source.kind))n*=.6;
  if(a.movingIncoming&&p.walking)n*=a.movingIncoming;
  if(a.openingIncoming&&battleTime()<6)n*=a.openingIncoming;
  if(a.sandGuard&&weather('sand'))n*=1-a.sandGuard;
  if(a.snowGuard&&weather('snow'))n*=1-a.snowGuard;
  if(a.burnGuard&&source.enemy?.burn>0)n*=1-a.burnGuard;
  if(s.friendUntil>now())n*=.7;
  if(s.barrierUntil>now())n*=.5;
  if(a.unaware&&source.enemy){const e=source.enemy;n/=(e.johtoAttackBuff||1);}
  if(a.armorTail&&source.enemy){const angle=Math.atan2(source.enemy.y-p.y,source.enemy.x-p.x);if(Math.cos(angle-p.aim)<0)n*=.5;}
  if(a.lethalShield&&n>=p.hp&&!s.lethalShieldUsed){s.lethalShieldUsed=true;const amount=p.maxHp*a.lethalShield;n=Math.max(0,n-amount);shield(p,Math.max(0,amount-old),.5);}
  if(a.convertShield){const amount=n*a.convertShield;n-=amount;shield(p,amount,4);}
  if(a.blissShield&&n>p.hp*.4&&proc(p,'bliss',3))shield(p,p.maxHp*.2,3);
  if(a.aroma||a.tide)event('absorb',Math.max(0,old-n));
  return n;
 }
 function onCast(p,m){
  if(!has(p)||m.leaderGenerated)return;const a=f(),s=q(p);
  m.johtoBaton=false;
  s.castTypes||=[];if(!s.castTypes.includes(m.kind)){s.castTypes.push(m.kind);event('distinctKind');}
  if(m.kind==='projectile')event('projectileCast');
  if(a.doubleBeam&&m.kind==='beam')synthetic(p,'beam',{...m,dmg:m.dmg,leaderGenerated:true},p.aim+Math.PI);
  if(a.ruminate&&m.kind==='buff')schedule(.1,()=>synthetic(p,'buff',{...m}));
  if(a.tripleCombo&&m.kind==='melee'){const combo=s.combo++%3;if(combo===0){const x=p.x+Math.cos(p.aim)*150,y=p.y+Math.sin(p.aim)*150;if(G.World.isFree(x,y,p.r)){p.x=x;p.y=y;}}if(combo===2)clearShots(p.x,p.y,120);}
  if(a.tripleSlash&&m.kind==='melee'){for(let i=1;i<=2;i++)schedule(i*.12,()=>synthetic(p,'melee',{...m,dmg:m.dmg,zCrit:i===2,slow:i===2?.5:0}));}
  if(a.dashSpark&&m.kind==='dash')schedule(.1,()=>blast(p,p.x,p.y,80,budget(p)*.025,'fire'));
  if(a.rollout&&m.kind==='dash')clearShots(p.x,p.y,200);
  if(a.rollShield&&m.kind==='dash')for(const ally of actors())shield(ally,ally.maxHp*a.rollShield);
  if(state().batonReady&&p.isPrimaryMove?.(m)){m.johtoBaton=true;state().batonReady=false;G.MovePP.add(p,[m],1);}
  if(a.nextFist&&s.fistReady&&m.kind==='melee')schedule(.1,()=>{s.fistReady=false;});
 }
 function hit(p,e,m,dealt,critical){
  if(!has(p)||m.leaderGenerated||m.typeBondSecondary||!(dealt>0))return;const a=f(),s=q(p);
  if(['melee','dash'].includes(m.kind))event('meleeDashHit');if(['melee','cone'].includes(m.kind))event('meleeConeHit');if(['beam','dash'].includes(m.kind))event('beamDashHit');if(m.kind==='dash'||m.type==='ice')event('dashIceHit');if(['nova','aura'].includes(m.kind))event('bloomHit');if(enemyBad(e))event('statusHit');if(ranged(m)&&critical)event('rangedCrit');
  if(m.kind==='melee'){
   s.openingHit=true;if(a.armorStack){s.stacks=Math.min(15,s.stacks+1);event('armorStack');}
   if(a.steelSpikes&&proc(p,'steelspike',.5))for(const dx of [-14,14])field(p,'johtoSpikes',e.x+dx,e.y,35,5,budget(p)*.0075,'steel',{slow:.4});
   if(a.jawsHeal&&critical)for(const ally of actors())L._z.heal(ally,dealt*a.jawsHeal/actors().length);
   if(a.toxicClaw&&critical){e.applyPoison(2,p);stun(e,1);}
   if(a.openingCrit&&battleTime()<=2&&!s.openingStun){s.openingStun=true;stun(e,1.5);}
   if(a.gyroStun&&critical&&s.combo%3===0)stun(e,1);
   if(zOn()&&root()===236)e.shield=0;
  }
  if(a.web&&['mine','trail'].includes(m.kind)){e.johtoWebUntil=now()+3;e.applySlow(.6,a.webLong?6:3);event('webHit');if(a.webLong&&!e.boss)stun(e,1);}
  if(a.airStun&&['projectile','cone'].includes(m.kind)&&Math.random()<a.airStun&&enemyProc(e,'air',.8)){stun(e,.8);event('stun');}
  if(a.auraSphere&&critical&&['projectile','cone'].includes(m.kind)&&proc(p,'sphere',.4))synthetic(p,'projectile',{type:'fighting',dmg:m.dmg*.4,count:1,homing:8,pierce:0});
  if(a.ghostBurn&&critical&&m.kind==='projectile')e.applyBurn(1,p);
  if(a.sacredFire&&m.type==='fire'&&Math.random()<a.sacredFire)e.applyBurn(3,p);
  if(a.darkFire&&['fire','dark'].includes(m.type))e.applyBurn(2,p);
  if(a.allFireBurn&&m.type==='fire')e.applyBurn(a.allFireBurn,p);
  if(a.dashStun&&m.kind==='dash')stun(e,a.dashStun);
  if(a.rollout&&m.kind==='dash')pull(e,p.x,p.y,-100);
  if(a.rollArmor&&m.kind==='dash'&&e.boss){e.leaderArmor=a.rollArmor;e.leaderArmorUntil=now()+4;}
  if(a.rollingPower&&m.kind==='dash'){s.rolling=Math.min(5,(s.rolling||0)+1);s.hitAt=now();if(a.stompTrue&&enemyBad(e)&&proc(p,'stomp',.8))direct(p,e,dealt*2,m.type);}
  if(a.presents&&m.kind==='projectile'&&proc(p,'present',.25)){if(Math.random()<.7)direct(p,e,dealt,'ice');else gift(e.x,e.y);}
  if(a.onlyBloom&&['nova','aura'].includes(m.kind)&&G.Types.mult(state().runeType||'psychic',e.types)>1&&proc(p,'runehit',.3))direct(p,e,dealt,m.type);
  if(a.purifyingBeam&&m.kind==='beam')path(p,m.radius||500,m.width||50);
 }
 function enemyProc(e,id,cd){e.johtoProcs||={};if((e.johtoProcs[id]??-Infinity)>now())return false;e.johtoProcs[id]=now()+cd;return true;}
 function hurt(p,n,type,source){
  if(!has(p)||source.kind==='status'||!(n>0))return;const a=f(),s=q(p);s.lastHurt=now();s.received+=n;s.fistReady=true;s.lastEnemy=source.enemy?.id||0;
  if(a.counterCast&&p!==captain())event('hurtAmount',n);
  if(a.counterCast&&proc(p,'counter',a.counterCast)){const m=p.activeMove?.()||p.moves[0];if(m){s.counterCasting=true;try{G.Audio.sfx('shot',{kind:m.kind,type:m.type});withoutCharge(()=>synthetic(p,m.kind,{...m,leaderCounter:true}));}finally{s.counterCasting=false;}}}
  if(source.enemy){source.enemy.johtoTouched=true;if(a.bossEncore&&source.enemy.boss){source.enemy.leaderDamage=1-a.bossEncore;source.enemy.leaderDamageUntil=now()+3;}
   if(a.poisonNeedles&&source.kind==='contact'&&proc(p,'needles',.5))synthetic(p,'nova',{type:'poison',count:a.poisonNeedles,dmg:.35,homing:2,poison:2});
   const contact=L.profile().contactStun;if(contact&&source.kind==='contact'&&Math.random()<Math.min(1,contact))stun(source.enemy,1.5);
   if(a.steelReflect&&source.kind==='contact')direct(p,source.enemy,p.baseDefense*a.steelReflect,'steel');
   if(a.magmaKnock&&source.kind==='contact')pull(source.enemy,p.x,p.y,-100);
   if(a.balloonKnock)blast(p,p.x,p.y,100,1,'normal',{knock:90});
   if(a.explosionReflect&&zOn()&&source.kind==='contact')direct(p,source.enemy,n,'steel');
  }
  if(a.hurtGuard&&Math.random()<a.hurtGuard)p.invuln=Math.max(p.invuln,1);
  if(a.heavyFriend&&n>p.maxHp*.2)for(const ally of actors())q(ally).friendUntil=now()+4;
 }
 function killed(e){if(!active()||!Z.team(e.lastAttacker))return;const p=e.lastAttacker,a=f(),m=e.lastTypeBondAttack||{};if(m.kind==='nova')event('novaKill');if(a.meleeMoxie&&m.kind==='melee')for(const ally of actors())q(ally).moxie=Math.min(.3,(q(ally).moxie||0)+a.meleeMoxie);if(a.eliteAttack&&e.elite)state().eliteAttack=Math.min(.6,(state().eliteAttack||0)+a.eliteAttack);if(a.needlePuddle&&m.leaderGenerated)field(p,'poison',e.x,e.y,60,4,budget(p)*.015,'poison',{poison:1});}
 let gifts=[];
 function gift(x,y){if(gifts.length>=6||!proc(captain(),'giftSpawn',2))return;gifts.push({x,y,left:20});}
 function path(p,length,width,boost=true){
  const ca=Math.cos(p.aim),sa=Math.sin(p.aim);
  for(const shot of [...G.Projectiles.all()])if(!shot.friendly){const x=shot.x-p.x,y=shot.y-p.y,along=x*ca+y*sa;if(along>=0&&along<=length&&Math.abs(-x*sa+y*ca)<=width)G.Projectiles.remove(shot);}
  if(boost)for(const ally of actors()){const x=ally.x-p.x,y=ally.y-p.y;if(x*ca+y*sa>=0&&x*ca+y*sa<=length&&Math.abs(-x*sa+y*ca)<=width)q(ally).purePathUntil=now()+1;}
 }
 function start(){if(!active())return;state().johtoStart=now();state().johtoPulses=0;state().giftGold=0;state().phoenixUsed=false;state().eliteAttack=0;state().runeType='psychic';gifts=[];
  for(const p of actors()){p.johtoState={lastHurt:now(),tick:0,received:0,combo:0,stacks:0,hitAt:now(),highHp:p.hp,positions:[]};}
  const a=f();if(a.openingSun)G.Weather.force('sun',a.openingSun);
  state().runeBlocksUsed=0;
  const charge=L.definition(captain().dex).charge.event,expected={novaKill:1,cottonHit:2,songHit:2,webHit:1,swampTime:1,acceleration:1/2,meleeDashHit:2,meleeConeHit:2,dashIceHit:2,beamDashHit:2,bloomHit:2,rangedCrit:.5,statusHit:2,armorStack:1/2,distinctKind:1/15};
  if(expected[charge])state().targetEvents=expected[charge]*60;
  if(a.onlyBloom)for(const p of actors())for(let i=0;i<p.moves.length;i++)if(!allows(p.moves[i])){const old=p.moves[i],id=G.Moves.poolFor(p.mon).find(id=>['nova','aura'].includes(G.Moves.BY_ID[id].kind))||G.Moves.ALL.find(m=>['nova','aura'].includes(m.kind)).id;const next=G.Moves.instance(id,old.lvl);p.moves[i]=next;for(const group of p.slots){const pos=group.indexOf(old);if(pos>=0)group[pos]=next;}G.MovePP.restore(p,[next]);}
 }
 function tick(dt){
  if(!G.Expedition?.active||G.Expedition.run.phase!=='combat')return;for(const p of actors())G.ActorStatus.tick(p,dt);if(!active())return;const a=f(),s=state();s.johtoPulses=(s.johtoPulses||0)+dt;
  for(const p of actors()){
   const b=q(p);if(p.dead)continue;b.highHp=Math.max(b.highHp||0,p.hp);
   b.positionWait=(b.positionWait||0)-dt;if(b.positionWait<=0){b.positionWait=.1;b.positions||=[];b.positions.push({x:p.x,y:p.y,t:now()});while(b.positions.length>12)b.positions.shift();}
   if(a.aroma&&near(p,a.aroma))L._z.heal(p,p.maxHp*.015*(a.aromaRegen||1)*dt);
   if(a.bliss&&near(p,a.bliss))L._z.heal(p,p.maxHp*.015*dt);
   if(a.regenerator&&now()-b.lastHurt>=4&&proc(p,'regenerator',12))burst(p,p.maxHp*.15);
   if(a.lowHeal&&p.hp/p.maxHp<.3&&!b.lowHealed){b.lowHealed=true;burst(p,p.maxHp*a.lowHeal);}
   if(a.coralWall&&p.hp/p.maxHp<.3&&proc(p,'coral',6)){clearShots(p.x,p.y,100);shield(p,p.maxHp*.15,3);}
   if(a.mud&&p.walking&&proc(p,'mud',.7))field(p,'mud',p.x,p.y,55,4,budget(p)*.01,'ground',{slow:.5});
   if(a.mudHeal&&L.fields.some(v=>v.kind==='mud'&&Math.hypot(v.x-p.x,v.y-p.y)<v.r)){b.inMudUntil=now()+.6;L._z.heal(p,p.maxHp*a.mudHeal*dt);}
   if(a.sunDrain&&weather('sun'))p.hp=Math.max(1,p.hp-p.hp*a.sunDrain*dt);
   if(a.rollingDecay&&b.rolling>0&&now()-b.hitAt>a.rollingDecay){b.rolling=0;b.rollingFatigue=now()+1;}
   const newSlow=p.slowT>0&&!b.hadSlow,newDebuff=p.attackDebuffT>0&&!b.hadDebuff;b.hadSlow=p.slowT>0;b.hadDebuff=p.attackDebuffT>0;
   if(newSlow||newDebuff){if(root()===174)for(const ally of actors())q(ally).competitiveUntil=now()+6;if(a.defiant)for(const ally of actors())q(ally).defiant=Math.min(.6,(q(ally).defiant||0)+a.defiant);if(a.magicBounce||a.controlImmune){p.slowT=0;p.attackDebuffT=0;p.attackDebuff=0;}}
   if(a.controlImmune)p.actorStunT=0;
  }
  for(const g of [...gifts]){g.left-=dt;const picker=actors().find(p=>!p.dead&&Math.hypot(p.x-g.x,p.y-g.y)<p.r+20);if(picker){healAll(.1);if(s.giftGold<2){G.Expedition.run.gold++;s.giftGold++;}if(a.goldenGift)for(const p of actors())q(p).goldenUntil=now()+3;gifts.splice(gifts.indexOf(g),1);}else if(g.left<=0)gifts.splice(gifts.indexOf(g),1);}
  if(s.johtoPulses>=1){const times=Math.floor(s.johtoPulses);s.johtoPulses-=times;for(let i=0;i<times;i++)pulse(a);}
 }
 function pulse(a){
  const c=captain();
  const radius=a.aroma||a.cotton||a.song||a.glow||(a.shadowTag?180:0);
  if(radius)for(const e of G.EnemyMgr.queryCircle(c.x,c.y,typeof radius==='number'?radius:180)){
   const slow=a.cotton?.5:a.song?.4:a.shadowTag?.4:a.aromaSlow||0;if(slow){e.applySlow(slow,2);event(a.cotton?'cottonHit':a.song?'songHit':'webHit');}
   if(a.glowLure&&!e.boss){pull(e,c.x,c.y,30);e.applySlow(.25,1.2);}
   if(a.shadowTag){e.johtoAnchoredUntil=now()+1.2;if(e.jump){e.jump=null;e.jumpLift=0;}if(e.phase==='dash'){e.phase='walk';e.pt=1.2;}}
  }
  if(a.intimidate||a.globalSlow)for(const e of enemies()){if(a.intimidate){e.leaderDamage=1-a.intimidate;e.leaderDamageUntil=now()+2;}if(a.globalSlow)e.applySlow(a.globalSlow,2);}
  if(a.acceleration)event('acceleration',.5);
  if(a.mud&&L.fields.some(v=>v.kind==='mud'))event('swampTime');
  if(a.sandDamage&&weather('sand'))for(const e of enemies().filter(e=>!e.types.some(t=>['rock','ground','steel'].includes(t)))){direct(c,e,budget(c)*.012*(a.sandDouble?2:1),'rock');event('sandHit');}
  if(a.shedEvery&&Math.floor(battleTime())%a.shedEvery===0)cleanse();
  if(a.juice&&Math.floor(battleTime())%10===0){healAll(.15);for(const p of actors())G.MovePP.add(p,p.moves,2);}
  if(a.moody&&Math.floor(battleTime())%5===0){const keys=['atk','spa','defense','spdef','spd','agility','stamina'];for(const p of actors())q(p).moodyKey=keys[Math.floor(Math.random()*keys.length)];}
  if(a.runes){const types=Object.keys(G.U.TYPE_COLOR);if(Math.floor(battleTime())%3===0)state().runeType=types[Math.floor(Math.random()*types.length)];for(let i=0;i<4;i++){const angle=now()*1.5+i*Math.PI/2,x=c.x+Math.cos(angle)*85,y=c.y+Math.sin(angle)*65;for(const e of G.EnemyMgr.queryCircle(x,y,22)){direct(c,e,budget(c)*.015,state().runeType);event('bloomHit');}}}
  if(a.runeBlocks){state().runeBlocksUsed||=0;for(const shot of [...G.Projectiles.all()])if(!shot.friendly&&state().runeBlocksUsed<a.runeBlocks&&Math.hypot(shot.x-c.x,shot.y-c.y)<100){G.Projectiles.remove(shot);state().runeBlocksUsed++;}}
 }
 function rescue(p,source){
  if(!has(p)||p.hp>0)return false;const a=f(),s=state();
  if(a.teamPhoenix&&!s.phoenixUsed){s.phoenixUsed=true;for(const ally of actors()){ally.dead=false;ally.hp=Math.max(1,Math.min(ally.maxHp,ally.hp+ally.maxHp*.5));ally.invuln=3;}return true;}
  return false;
 }
 function finish(){if(!active())return;const a=f();if(L.profile().endCleanse)cleanse();for(const p of actors())if(!p.dead&&a.endMaxHeal)burst(p,p.maxHp*a.endMaxHeal);if(a.honey)healAll(a.honey);gifts=[];}
 function canCast(p){return !has(p)||(!f().counterOnly||q(p).counterCasting)&&!(p.actorStunT>0);}
 function allows(m){return !active()||!f().onlyBloom||m?.kind==='buff'||['nova','aura'].includes(m?.kind);}
 function draw(ctx){if(!active())return;for(const g of gifts){ctx.fillStyle='#ffbdd0';ctx.fillRect(g.x-8,g.y-G.LIFT-8,16,16);ctx.fillStyle='#fff1b9';ctx.fillRect(g.x-1,g.y-G.LIFT-9,3,18);}}
 // Wrappers preserve legacy behavior outside a Johto expedition.
 const wrap=(key,fn)=>{const prior=L[key];L[key]=(...args)=>fn(prior,...args);};
 wrap('factor',(old,p,k)=>old(p,k)*factor(p,k));wrap('rate',(old,p,m)=>old(p,m)*rate(p,m));wrap('move',(old,p,m)=>move(p,old(p,m)));
 wrap('outgoing',(old,p,e,m)=>old(p,e,m)*outgoing(p,e,m));wrap('crit',(old,p,m,e)=>old(p,m,e)+crit(p,m,e));wrap('penetration',(old,p,e,m)=>Math.min(.8,old(p,e,m)+penetration(p,e,m)));
 wrap('beforeHurt',(old,p,t,src)=>beforeHurt(p,t,src)&&old(p,t,src));wrap('incoming',(old,p,n,t,src)=>incoming(p,old(p,n,t,src),t,src));
 wrap('onCast',(old,p,m)=>{old(p,m);onCast(p,m);});wrap('hit',(old,...args)=>{old(...args);hit(...args);});wrap('hurt',(old,...args)=>{old(...args);hurt(...args);});wrap('killed',(old,e)=>{old(e);killed(e);});
 wrap('beginBattle',(old)=>{old();start();});wrap('tick',(old,dt)=>{old(dt);tick(dt);});wrap('finishBattle',(old)=>{finish();old();});wrap('rescue',(old,p)=>{const restricted=has(p)&&[202,204,227,231].includes(root())&&p!==captain();const saved=rescue(p)||(!restricted&&old(p));if(saved&&has(p)&&root()===202){const e=enemies().find(e=>e.id===q(p).lastEnemy);if(e)direct(p,e,percent(p,e,.3),'psychic');}if(saved&&has(p)&&f().sturdyReflect){const e=enemies().find(e=>e.id===q(p).lastEnemy);if(e)direct(p,e,((p.activeMove?.()||p.moves[0])?.dmg||20)*p.atk*f().sturdyReflect,'rock');}return saved;});wrap('allowed',(old,m)=>old(m)&&allows(m));wrap('draw',(old,ctx)=>{old(ctx);draw(ctx);});
 wrap('ppCost',(old,p,m,n)=>has(p)&&zOn()&&f().timeFury?0:old(p,m,n));
 wrap('enemyTick',(old,e,dt)=>{old(e,dt);if(active()&&f().burnRate&&weather('sun')&&e.burn>0)e.burnTick-=dt*(f().burnRate-1);});
 function dashed(p,m,x,y,cooldown){if(!has(p))return;const a=f();if(a.dashGuardExtra)p.dashGuardT=Math.min((p.dashGuardT||0)+a.dashGuardExtra,Math.max(0,cooldown*.9));if(a.iceFront||a.rollout)path({x,y,aim:p.aim},Math.hypot(p.x-x,p.y-y),m.width||80,false);}
 function effectChance(p,chance){return has(p)?Math.min(1,chance*(f().serene||(f().critDouble?2:1))):chance;}
 function knockImmune(p){return has(p)&&!!f().knockImmune;}
 function weatherImmune(p){return has(p)&&!!(f().weatherImmune||f().magicGuard);}
 function floating(p){return has(p)&&!!f().float;}
 function guts(p){return has(p)&&!!f().guts;}
 function guarded(p,source){if(has(p)&&f().dodgeHeal&&p.dashGuardT>0&&source.kind==='ranged'&&proc(p,'dodge',1))healAll(f().dodgeHeal,true);}
 function anchored(e){return active()&&e.johtoAnchoredUntil>now();}
 function damp(){return active()&&!!f().damp;}
 function extendStun(e,seconds){if(!e.dead)e.classStunT=Math.min(e.boss?2.5:5,(e.classStunT||0)+seconds*(e.boss?.5:1));}
 return {active,f,q,has,root,proc,burst,healAll,cleanse,poisonHeal,status,canCast,typeFactor,now,path,attack,wrap,allows,guarded,dashed,effectChance,knockImmune,weatherImmune,floating,guts,anchored,damp,extendStun};
})();
