/* Expedition captain engine. Runtime state is plain data for node checkpoints.
 * Generated hits carry leaderGenerated; only ordinary actions earn Z charge.
 * This module never changes account stats or the squad's strategic HP. */
G.LeaderAbilities=(()=>{
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),TAU=Math.PI*2;
 let cachedRun=null,cachedKey='',effective=null,fields=[],jobs=[],depth=0,chargeSuppressed=0;
 function withoutCharge(fn){chargeSuppressed++;try{return fn();}finally{chargeSuppressed--;}}
 const run=()=>G.Expedition?.run;
 const captain=()=>run()?.captain;
 const definition=dex=>G.LeaderMedals?.family(dex);
 const active=()=>!!(G.Expedition?.active&&definition(captain()?.dex));
 const actors=()=>G.Squad?.actors?.()||[captain()].filter(Boolean);
 const enemies=()=>G.EnemyMgr?.all?.().filter(e=>!e.dead)||[];
 const team=p=>active()&&!!p&&!p.remote&&actors().includes(p);
 const state=()=>{const r=run();return r&&(r.leaderAbility||=( {charge:0,time:0,events:{},battle:0}));};
 const own=p=>p.leaderState||=( {shield:0,shieldUntil:0,hurt:0,kills:0,stationary:0,lastX:p.x,lastY:p.y,healBudget:0} );
 function merge(out,part){
  for(const [k,v]of Object.entries(part||{})){
   if(v&&typeof v==='object'&&!Array.isArray(v)){out[k]||={};merge(out[k],v);}
   else if(Array.isArray(v))out[k]=[...new Set([...(out[k]||[]),...v])];
   else if(typeof v==='number'&&typeof out[k]==='number')out[k]=k==='stats'?out[k]+v:out[k]+v;
   else out[k]=v;
  }return out;
 }
 // Stats add; move multipliers compose; additive counts add. Other numeric
 // advances deliberately add increments (e.g. the second leech/rage bonus).
 function profile(){
  if(!active())return null;
  const r=run(),d=definition(r.captain.dex),level=r.trainerLevel||1,key=d.id+':'+level;
  if(r===cachedRun&&key===cachedKey)return effective;
  const out={};for(const part of [d.base,d.cost,level>=5?d.five:null,level>=8?d.eight:null].filter(Boolean)){
   const moves=out.moves||={};
   for(const [kind,mods]of Object.entries(part.moves||{})){
    const dest=moves[kind]||={};for(const[k,v]of Object.entries(mods))dest[k]=dest[k]==null?v:['count','crit','poison','burn'].includes(k)?dest[k]+v:['arc','critMul'].includes(k)?Math.max(dest[k],v):dest[k]*v;
   }
   const copy={...part};delete copy.moves;merge(out,copy);
  }
  cachedRun=r;cachedKey=key;effective=out;return out;
 }
 const zOn=kind=>active()&&state().z===kind&&state().zUntil>state().time;
 const inZ=()=>active()&&state().zUntil>state().time;
 const wx=()=>G.Weather?.current?.kind;
 const isRain=()=>wx()==='rain',isSun=()=>wx()==='sun';
 const status=e=>e.poison>0||e.burn>0||e.slowT>0||e.classStunT>0||e.freezeT>0;
 const buffCount=p=>Object.values(p.buffs||{}).reduce((n,b)=>n+(b.t>0?b.n:0),0);
 function factor(p,key){
  if(!team(p))return 1;const f=profile(),s=own(p),c=captain();let n=1+(f.stats?.[key]||0);
  if(['atk','agility'].includes(key)&&f.missingHealthPower)n+=f.missingHealthPower*(1-clamp(p.hp/p.maxHp,0,1));
  if(['spd','agility'].includes(key)&&isSun())n+=f.sunStats||0;
  if(key==='spa'&&f.burnSpa)n+=Math.min(.25,enemies().filter(e=>e.burn>0).length*f.burnSpa);
  if(key==='defense'||key==='spdef'){
   if(f.stationaryDefense&&s.stationary>=1)n+=f.stationaryDefense;
   if(f.poorDefense&&run().gold<30)n*=f.poorDefense;
   if(f.lowDefense&&p.hp<p.maxHp*.4)n+=f.lowDefense;
   if(f.safeDefense&&state().time-(s.lastHurt||0)>=5)n+=f.safeDefense;
   if(f.painDefense&&s.pain>0)n+=f.painDefense;
   if(f.beamDefense&&s.beamUntil>state().time)n+=f.beamDefense;
   if(f.butterflyDefense&&zOn('butterflyBeam')&&key==='spdef')n/=f.butterflyDefense;
   if(zOn('shellSmash')&&key==='defense')n*=.65;
   if(f.gyaradosSpdef&&p===c&&p.dex!==129&&key==='spdef')n*=f.gyaradosSpdef;
  }
  if(key==='atk'){
   if(f.killAttack)n+=Math.min(.35,(s.kills||0)*f.killAttack);
   if(f.hurtAttack&&s.hurtUntil>state().time)n+=f.hurtAttack;
   if(f.gyaradosAttack&&p.dex!==129&&p===c)n+=f.gyaradosAttack;
   if(f.lightningRodAttack&&s.rodUntil>state().time)n+=f.lightningRodAttack;
   if(zOn('bellyDrum'))n+=.8;
  }
  if(key==='spa'&&f.download&&s.download==='special'||key==='atk'&&f.download&&s.download==='physical')n+=f.download;
  if(key==='agility'){
   if(f.rodAgility&&s.rodUntil>state().time)n+=f.rodAgility;
   if(f.electricEngine)n+=Math.min(.3,(s.engine||0)*f.electricEngine);
  }
  if(key==='spd'){
   if(f.flyingSpeed&&G.Projectiles.all().some(q=>q.owner===p&&q.boom))n+=f.flyingSpeed;
   if(f.meleeSpeed&&s.meleeUntil>state().time)n+=f.meleeSpeed;
   if(f.hurtSpeed&&s.hurtUntil>state().time)n+=f.hurtSpeed;
   if(f.rageSpeed&&p.hp<p.maxHp*.4)n+=f.rageSpeed;
   if(f.sunSlow&&isSun())n*=1-f.sunSlow;
   if(f.rainSpeed&&isRain())n+=f.rainSpeed;
   if(f.snowSpeed&&wx()==='snow')n+=f.snowSpeed;
   if(f.fruitSpeed&&s.fruitUntil>state().time)n+=f.fruitSpeed;
   if(f.dashEndSpeed&&s.dashEnd>state().time)n+=f.dashEndSpeed;
   if(s.trailSpeedUntil>state().time)n+=f.trailTeamSpeed||0;
   if(zOn('flameGallop'))n+=.5;
   if(zOn('parentFury')||zOn('tripleVolley'))n+=.3;
   if(zOn('shellSmash'))n+=.3;
   if(zOn('dragonRoar')||zOn('outrage'))n+=.4;
  }
  if((key==='atk'||key==='spa')&&(zOn('shellSmash')||zOn('outrage')))n+=.5;
  if(key==='atk'&&zOn('dragonRoar'))n+=.4;
  if(key==='hp'&&p===c&&f.captainHp)n*=f.captainHp;
  return Math.max(.1,n);
 }
 function sync(p){
  if(!p)return;const wanted=factor(p,'hp'),old=p.leaderHpFactor||1;
  if(Math.abs(wanted-old)>1e-8){const fraction=p.maxHp>0?clamp(p.hp/p.maxHp,0,1):1;p.maxHp=Math.max(1,p.maxHp/old*wanted);p.hp=p.dead?0:p.maxHp*fraction;p.leaderHpFactor=wanted;}
  if(active()&&p===captain())p.ability=null;
 }
 function move(p,m){
  if(!team(p)||m.leaderApplied||m.leaderGenerated)return m;
  const f=profile(),s=own(p),mods=f.moves?.[m.kind]||{},a={...m,leaderApplied:true};
  const map={damage:'dmg',range:['cone','projectile','nova'].includes(m.kind)?'life':'radius',radius:'radius',width:'width',life:['buff','mine','turret','trail'].includes(m.kind)?'dur':'life',speed:'speed',cd:'cd',knock:'knock',amount:'amount',windup:'delay'};
  for(const[k,v]of Object.entries(mods)){
   if(map[k])a[map[k]]=(a[map[k]]||(['knock'].includes(k)?0:1))*v;
   if(['count','poison','burn'].includes(k))a[k]=(a[k]||0)+v;
   if(k==='slow')a.slow=Math.max(a.slow||0,v);
   if(k==='arc')a.arc=v;if(k==='arcFactor')a.arc*=v;
   if(k==='countFactor')a.count=Math.max(1,Math.round((a.count||1)*v));
   if(k==='tickRate'){if(a.rate)a.rate/=v;else a.cd/=v;}
  }
  if(f.sheerForce){a.burn=0;a.poison=0;a.slow=0;a.stun=0;}
  if(f.projectileTerrain&&m.kind==='projectile')a.phaseWalls=true;
  if(f.beamRamp&&m.kind==='beam')a.leaderBeamRamp=f.beamRamp;
  if(f.chainRamp&&m.kind==='chain')a.leaderChainRamp=f.chainRamp;
  if(f.returnPull&&m.kind==='boomerang')a.leaderReturnPull=true;
  if(f.returnCrit&&m.kind==='boomerang')a.leaderReturnCrit=true;
  if(f.rainOrbits&&m.kind==='orbit'&&isRain()){a.count++;a.speed*=1.2;}
  if(f.gasDouble&&m.kind==='aura'){a.radius*=1.5;a.poison=Math.max(a.poison||0,1);}
  if(f.meteorCover&&m.kind==='meteor')a.count++;
  if(f.fireFormation&&['meteor','projectile'].includes(m.kind)&&m.type==='fire')a.radius=(a.radius||25)*1.15;
  if(f.sunHarvest&&m.kind==='meteor'&&isSun())a.count++;
  if(f.mushroomUses&&m.kind==='mine')a.leaderMineUses=f.mushroomUses;
  if(f.parasiticMines&&m.kind==='mine')a.leaderParasite=true;
  if(f.noItems&&p===captain())p.activeItem=null;
  if(f.returnDamage&&m.kind==='boomerang'){a.leaderReturn=f.returnDamage;a.radius*=1.5;}
  if(f.ricochet&&m.kind==='projectile')a.leaderBounce=f.ricochet;
  if(f.buffBeam&&m.kind==='beam'){const b=Math.min(5,buffCount(p))*f.buffBeam;a.dmg*=1+b;a.width*=1+b;}
  if(f.spdefOrbit&&m.kind==='orbit')a.dmg*=1+Math.min(.4,p.baseSpDef*f.spdefOrbit);
  if(f.orbitRadiusDamage&&m.kind==='orbit')a.dmg*=1+Math.min(.35,a.radius/50*f.orbitRadiusDamage);
  if(f.defMelee&&m.kind==='melee')a.dmg*=1+Math.min(.4,p.baseDefense*f.defMelee);
  if(f.speedDash&&m.kind==='dash')a.dmg*=1+Math.min(.4,p.baseSpd/10*f.speedDash);
  if(f.speedProjectile&&m.kind==='projectile')a.dmg*=1+Math.min(.4,p.baseSpd/10*f.speedProjectile);
  if(f.hurtMelee&&m.kind==='melee')a.dmg*=1+Math.min(1,s.hurt*f.hurtMelee);
  if(f.technician&&(m.lvl||1)<=3)a.dmg*=f.technician;
  if(f.mineDamage&&m.kind==='mine')a.dmg*=f.mineDamage;
  if(f.fireDamage&&m.type==='fire')a.dmg*=f.fireDamage;
  if(f.castGuard&&m.kind==='melee')a.arc=TAU;
  if(f.shieldOrbit&&m.kind==='orbit'&&s.shield>0)a.dmg*=f.shieldOrbit;
  if(f.homingTurns&&m.kind==='projectile')a.homing=Math.max(a.homing||0,1.2);
  if(zOn('petalDance')&&m.kind==='orbit'){a.radius=Math.max(a.radius,screenRadius());a.dmg*=1.6;}
  if(zOn('rageFists')&&m.kind==='melee'){a.arc=TAU;a.zCrit=true;}
  if(zOn('tyrantBarrage')&&m.kind==='projectile'){a.count=Math.min(48,a.count*2);a.pierce=999;a.phaseWalls=true;}
  if(zOn('harvest')&&m.kind==='meteor'){a.radius*=1.5;a.leaderStun=1;}
  if(zOn('butterflyBeam')&&m.kind==='beam'){a.radius=screenRadius()*2;a.phaseWalls=true;a.leaderStun=1;}
  if(inZ())a.leaderZKind=state().z;
  if(f.noItems&&p===captain())a.leaderNoItems=true;
  return a;
 }
 function rate(p,m){
  if(!team(p))return 1;const f=profile(),mods=f.moves?.[m.kind]||{};let r=1/(f.cooldown||1)/(mods.cd||1);
  if(f.smallMoveRate&&((m.lvl||1)===1||!p.isPrimaryMove(m)))r*=f.smallMoveRate;
  if(f.wetCooldown&&['rain','snow'].includes(wx()))r/=f.wetCooldown;
  if(f.sunCooldown&&isSun())r/=f.sunCooldown;
  if(f.fullHpNovaCooldown&&captain().hp>=captain().maxHp&&m.kind==='nova')r/=f.fullHpNovaCooldown;
  if(f.specialCooldown&&m.damageClass==='special')r/=f.specialCooldown;
  if(f.nonStabCooldown&&!p.mon.types.includes(m.type))r/=f.nonStabCooldown;
  if(f.dryCooldown&&!isRain())r/=f.dryCooldown;
  if(f.weather==='sun'&&m.type==='fire'&&(run().trainerLevel||1)>=8)r*=1.25;
  if(zOn('shellSmash')&&m.kind==='projectile')r*=1.5;
  if(zOn('harvest')&&m.kind==='meteor'||zOn('genesis'))r=Math.max(r,m.cd*p.cdMul/.15);
  return clamp(r,.1,Math.max(1,m.cd*p.cdMul/.15));
 }
 function agility(p,m){if(!team(p))return 1;return profile().moves?.[m.kind]?.agility||1;}
 function ppCost(p,m,n){if(!team(p))return n;if(zOn('genesis'))return 0;const f=profile();return Math.max(0,n+(f.extraPP?.[m.kind]||0)-(f.ppDiscount||0));}
 function regen(p){if(!team(p))return 1;const f=profile();if(f.noRegen)return 0;let n=f.regenRate||1;if(f.sunRegen&&isSun())n*=f.sunRegen;if(f.safeRegen&&state().time-(own(p).lastHurt||0)>5)n*=f.safeRegen;if(own(p).pollenUntil>state().time)n*=2;return n;}
 function xp(p){return team(p)&&p===captain()&&p.dex===129?(profile().magikarpGrowth||1):1;}
 function allowed(m){const f=profile();return (!G.LeaderGalar||G.LeaderGalar.allows(m))&&(!G.LeaderJohto||G.LeaderJohto.allows(m))&&(!f||!!m&&!(f.ban||[]).includes(m.kind)&&!(f.banSpecial&&m.damageClass==='special'));}
 function learnPool(mon,ids){if(!active())return ids;const f=profile();return (f.allMoves&&(!f.johto?.sketch||G.LeaderMedals.family(mon.dex)?.root===235)?G.Moves.ALL.map(m=>m.id):ids).filter(id=>allowed(G.Moves.BY_ID[id]));}
 function legalFixed(mon,id){if(!active()||allowed(G.Moves.BY_ID[id]))return id;return learnPool(mon,G.Moves.poolFor(mon)).find(x=>allowed(G.Moves.BY_ID[x]))||null;}
 function screenRadius(){return Math.max(500,Math.min(1600,G.Camera?.outerRadius?.()||700));}
 function shield(p,amount,duration=5){if(G.LeaderUnova?.blocksShield(p))return;if(!team(p)||p.dead||!(amount>0))return;const s=own(p);s.shield=Math.min(p.maxHp*.4,s.shield+amount);s.shieldUntil=Math.max(s.shieldUntil,state().time+duration);}
 function heal(p,amount){
  if(!p||p.dead||!(amount>0))return 0;const s=own(p),budget=Math.max(0,p.maxHp*.03-s.healBudget),n=Math.min(amount,budget),before=p.hp;
  if(n>0){s.healBudget+=n;p.heal(n);}return Math.max(0,p.hp-before);
 }
 function healTeam(amount,missing=false){for(const p of actors())heal(p,missing?(p.maxHp-p.hp)*amount:p.maxHp*amount);}
 function stun(e,seconds){if(e.dead)return;const t=seconds*(e.boss?.5:1);e.classStunT=Math.max(e.classStunT||0,t);}
 function vulnerable(e,value,duration=3){e.leaderVulnerable=Math.max(e.leaderVulnerable||0,value);e.leaderVulnerableUntil=state().time+duration;}
 function pull(e,x,y,distance){if(e.boss||e.dead)return;const d=Math.hypot(x-e.x,y-e.y)||1;e.kx=(e.kx||0)+(x-e.x)/d*distance;e.ky=(e.ky||0)+(y-e.y)/d*distance;}
 function clearShots(x=captain().x,y=captain().y,r=screenRadius(),reflect=false){
  let n=0;for(const p of [...G.Projectiles.all()])if(p.friendly===false&&Math.hypot(p.x-x,p.y-y)<=r){
   if(reflect){const c=captain(),e=G.Projectiles.nearest(enemies(),p.x,p.y,Infinity);if(e){const a=Math.atan2(e.y-p.y,e.x-p.x),speed=Math.max(180,Math.hypot(p.vx,p.vy));Object.assign(p,{friendly:true,owner:c,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,homing:2,life:p.t+3,hits:new Set(),leaderGenerated:true,damageClass:'special',mtype:'psychic',moveKind:'leader',specMove:{leaderGenerated:true,kind:'leader',type:'psychic'}});}else G.Projectiles.remove(p);
   }else G.Projectiles.remove(p);n++;
  }return n;
 }
 function direct(p,e,amount,type='normal',extra={}){
  if(!p||!e||e.dead||!(amount>0)||depth>1)return 0;
  depth++;try{const m={id:'leader-'+definition(captain().dex).id,kind:'leader',type,leaderGenerated:true,...extra};
   const got=e.hurt(amount,G.U.TYPE_COLOR[type]||'#c9edff',e.x-p.x,e.y-p.y,extra.knock||0,null,p,m)||0;p.dmgDealt=(p.dmgDealt||0)+got;p.onDealt?.(got);return got;
  }finally{depth--;}
 }
 function blast(p,x,y,r,damage,type='normal',opts={}){
  G.FX.ring(x,y,8,r,G.U.TYPE_COLOR[type]||'#dcf4ff',.45,4);
  for(const e of G.EnemyMgr.queryCircle(x,y,r)){if(e.dead)continue;direct(p,e,damage,type,opts);if(opts.stun)stun(e,opts.stun);if(opts.slow)e.applySlow(opts.slow,2);if(opts.poison)e.applyPoison(opts.poison,p);if(opts.burn)e.applyBurn(opts.burn,p);if(opts.pull)pull(e,x,y,opts.pull);if(opts.vulnerable)vulnerable(e,opts.vulnerable);if(opts.breakShield)e.shield=0;}
 }
 function percent(p,e,part,missing=false){return Math.min((missing?Math.max(0,e.maxHp-e.hp):e.hp)*part,(e.boss||e.elite)?budget(p)*.3:Infinity);}
 function budget(p){const m=p.activeMove?.()||p.moves?.[0];return Math.max(1,(m?.dmg||1)*(m?p.attackFor(m):p.atk)*10/Math.max(.8,m?.cd||2));}
 function field(p,kind,x,y,r,seconds,power,type,opts={}){if(fields.length>=64)return;fields.push({p,kind,x,y,r,left:seconds,wait:0,power,type,opts,suppressed:chargeSuppressed>0});}
 function schedule(delay,fn){if(jobs.length<240){const suppressed=chargeSuppressed;jobs.push({at:state().time+delay,fn:suppressed?()=>withoutCharge(fn):fn});}}
 function synthetic(p,kind,mods={},angle=p.aim){
  const def=G.Moves.ALL.find(m=>m.kind===kind);if(!def)return;
  const m={...G.Moves.instance(def.id,1),...mods,leaderGenerated:true,leaderApplied:true,phaseWalls:mods.phaseWalls??true};
  if(G.Projectiles.all().filter(q=>q.specMove?.leaderGenerated).length>=240)return;
  const aim=p.aim;p.aim=angle;try{G.Combat.leaderCast(p,m);}finally{p.aim=aim;}
 }
 function event(name,n=1){
  if(!active()||run().phase!=='combat'||depth||chargeSuppressed||!(n>0))return;
  const s=state(),d=definition(captain().dex);s.events[name]=(s.events[name]||0)+n;
  if(d.charge.event===name&&G.LeaderMedals.unlocked(captain().dex)){
   s.matchingTotal=(s.matchingTotal||0)+n;
   let stacks=1;
   if(name==='distance'){s.distanceAcc=(s.distanceAcc||0)+n;stacks=Math.floor(s.distanceAcc/80);s.distanceAcc-=stacks*80;}
   else if(name==='hurtAmount'||name==='heal'||name==='absorb'){const step=Math.max(1,captain().maxHp*.05);s.hpAcc=(s.hpAcc||0)+n;stacks=Math.floor(s.hpAcc/step);s.hpAcc-=stacks*step;}
   if(stacks>0)s.chargeBoost=Math.min(120,(s.chargeBoost||0)+stacks);
  }
 }
 function estimateTarget(){
  const d=definition(captain().dex),key=d.charge.event,all=actors(),kind=key.replace(/(Cast|Hit|Crit)$/,'').toLowerCase();
  let rate=all.flatMap(p=>p.moves.filter(m=>m.kind===kind||['hit','crit','cast','distinctType','kill','debuffKill'].includes(key)).map(m=>({p,m}))).reduce((n,{p,m})=>n+Math.min(1/Math.max(.15,m.cd*p.cdMul*(p.agilityCooldownFor?.(m)||1)),.7/(p.ppIntervalFor?.(m)||1)/Math.max(1,ppCost(p,m,1))),0);
  if(/Hit$/.test(key)||key==='hit')rate*=2;
  if(/Crit$/.test(key)||key==='crit')rate*=.2;
  const explicit={kill:1.5,debuffKill:.8,distance:120,heavyHurt:1/12,hurtAmount:captain().maxHp/30,hurtCount:1/5,painTick:1/2,pickup:1.5,fruitPickup:1/10,heal:captain().maxHp/25,shieldBreak:1/8,intercept:1/2,absorb:captain().maxHp/20,burnStack:1.2,poisonStack:1.2,spore:1/4,freeze:1/4,stun:1/2,boomerangReturn:1/2,bounceHit:1/2,echoHit:1,repeatMelee:1/2,poisonHit:1,burnHit:1,electricHit:1,iceHit:1,rangedHit:1,areaHit:1,stabHit:1,distinctType:1/10,knock:.8};
  return Math.max(1,60*(explicit[key]??Math.max(.05,rate)));
 }
 function begin(r){
  cachedRun=null;cachedKey='';fields=[];jobs=[];
  r.captain.zState=null;G.Mega?.init(r.captain,G.DB.save);r.captain.activeItem=G.Equipment?.active(G.DB.save,r.captain.ivDex)||null;
  if(!definition(r.captain.dex))return;state();
  for(const p of actors())sync(p);
 }
 function beginBattle(){
  fields=[];jobs=[];food=[];if(!active())return;const s=state();s.battle++;s.z=null;s.zUntil=0;s.teamKills=0;s.fruitSpawn=0;s.riceSpawn=0;s.fruitCooldown=0;s.types=[];s.targetEvents=120;s.sampleStart=s.time;s.matchingTotal=0;s.calibrated=false;s.chargeBoost=0;s.distanceAcc=0;s.hpAcc=0;
  for(const p of actors()){p.leaderState={shield:0,shieldUntil:0,hurt:0,kills:0,stationary:0,lastX:p.x,lastY:p.y,healBudget:0};sync(p);}
  const f=profile();if(f.weather||f.openingWeather)G.Weather.force(f.weather||f.openingWeather,Math.max(60,run().duration||120));
  if(f.bankShield&&run().gold>=150)for(const p of actors())shield(p,run().gold,run().duration||120);
  if(f.dittoCopy){const donor=actors().slice(1).sort((a,b)=>b.atk+b.spa-a.atk-a.spa)[0];if(donor){s.dittoId=donor.squadId;const old=captain().moves[0],m=G.Moves.instance(donor.moves[0].id,old?.lvl||1);captain().moves=[m];captain().slots=[[m]];captain().active=0;}}
 }
 function tick(dt){
  if(!active()||run().phase!=='combat'||!(dt>0))return;const s=state(),f=profile(),c=captain();s.time+=dt;
  if(G.LeaderMedals.unlocked(c.dex)&&s.charge<1){
   const boost=Math.min(dt,s.chargeBoost||0);
   if(boost>0)s.chargeBoost=Math.max(0,(s.chargeBoost||0)-dt);
   s.charge=clamp(s.charge+(dt+boost)/120,0,1);
  }
  for(const p of actors()){
   const q=own(p),distance=Math.hypot(p.x-q.lastX,p.y-q.lastY);q.lastX=p.x;q.lastY=p.y;q.stationary=distance>.01?0:q.stationary+dt;q.healBudget=Math.max(0,q.healBudget-p.maxHp*.03*dt);
   if(p===c&&distance>0)event('distance',distance);
   if(q.shieldUntil<=s.time)q.shield=0;
   if(q.pain>0){const amount=Math.min(q.pain,q.painRate*dt);q.pain-=amount;if(!p.dead){p.hp-=amount;if(p.hp<=0&&!rescue(p)){p.hp=0;p.dead=true;p.anim.play('Faint',{hold:true});}}q.painTick=(q.painTick||0)+dt;while(q.painTick>=1){q.painTick--;event('painTick');}}
   if(f.burrowCycle&&p===c){q.burrowClock=distance>0?(q.burrowClock||0)+dt:0;if(q.burrowClock>=6){q.burrowClock=0;q.burrowUntil=s.time+1.1;}}
   if(f.stationaryDrain&&q.stationary>1&&!p.dead)p.hp=Math.max(1,p.hp-p.maxHp*f.stationaryDrain*dt);
   if(f.rageGuard&&p.hp<p.maxHp*.3&&!q.rageUsed){q.rageUsed=true;q.guardUntil=s.time+f.rageGuard;}
   if(f.puddleBuff&&fields.some(v=>v.type==='poison'&&Math.hypot(v.x-p.x,v.y-p.y)<v.r))q.puddleUntil=s.time+.6;
   if(f.magnetLinks&&p!==c&&Math.hypot(p.x-c.x,p.y-c.y)<220){q.linkWait=(q.linkWait||0)-dt;if(q.linkWait<=0){q.linkWait=1;const e=G.Projectiles.nearest(enemies(),p.x,p.y,200);if(e)direct(p,e,budget(p)*.03,'electric');}}
   if(f.movingTrail&&distance>1&&!p.dead){q.trailWait=(q.trailWait||0)-dt;if(q.trailWait<=0){q.trailWait=.5;field(p,'trail',p.x,p.y,zOn('flameGallop')?100:50,2,budget(p)*.025,'fire',{burn:1,slow:f.fireTrailSlow||0});}}
   if(f.orbitPetals&&!p.dead&&p.moves.some(m=>m.kind==='orbit')){q.petalWait=(q.petalWait||0)-dt;if(q.petalWait<=0){q.petalWait=.5;synthetic(p,'projectile',{type:'grass',count:1,dmg:.25,pierce:1},s.time*2);}}
   if(f.magnet)p.leaderMagnet=f.magnet;else p.leaderMagnet=1;
   if(f.statusPenalty){if(p.slowT>(q.previousSlow||0)+1e-5)p.slowT*=f.statusPenalty;q.previousSlow=p.slowT;if(p.attackDebuffT>(q.previousDebuff||0)+1e-5)p.attackDebuffT*=f.statusPenalty;q.previousDebuff=p.attackDebuffT;}
   if(f.petalHeal&&zOn('petalDance'))heal(p,p.maxHp*f.petalHeal*dt);
   if(f.blizzardHeal&&zOn('blizzard'))heal(p,p.maxHp*f.blizzardHeal*dt);
   if(f.screenShieldRegen&&q.shield>0)shield(p,p.maxHp*f.screenShieldRegen*dt,2);
  }
  for(const j of [...jobs])if(j.at<=s.time){jobs.splice(jobs.indexOf(j),1);j.fn();}
  for(const v of [...fields]){
   v.left-=dt;v.wait-=dt;
   while(v.wait<=0&&v.left>-.5){v.wait+=.5;const apply=()=>{blast(v.p,v.x,v.y,v.r,v.power,v.type,v.opts);if(v.kind==='spore')for(const e of G.EnemyMgr.queryCircle(v.x,v.y,v.r))if(!e.leaderParasite){e.leaderParasite=4;e.leaderParasiteOwner=v.p;event('spore');}};if(v.suppressed)withoutCharge(apply);else apply();}
   if(v.left<=0)fields.splice(fields.indexOf(v),1);
  }
  s.auraWait=(s.auraWait||0)-dt;if(s.auraWait<=0){s.auraWait=.5;ambient(f,c);}
  intercept(f,c,dt);
 }
 function ambient(f,c){
  if(f.toxicAura)for(const e of G.EnemyMgr.queryCircle(c.x,c.y,f.toxicAura))e.applyPoison(1,c);
  if(f.iceAura)for(const e of G.EnemyMgr.queryCircle(c.x,c.y,f.iceAura)){e.applySlow(.3,1);direct(c,e,budget(c)*.01,'ice');event('iceHit');}
  if(f.gasAura)for(const e of G.EnemyMgr.queryCircle(c.x,c.y,f.gasAura*(f.gasDouble?1.5:1))){e.applyPoison(1,c);if(!e.boss){e.shotCd=Math.max(e.shotCd,1);e.skillCd=Math.max(e.skillCd,1);}}
  if(f.sweetAura)for(const e of G.EnemyMgr.queryCircle(c.x,c.y,160)){e.applySlow(.2,1);vulnerable(e,.15,1);}
  if(f.dreamAura)for(const p of actors().filter(p=>p.moves.some(m=>m.kind==='aura')))for(const e of G.EnemyMgr.queryCircle(p.x,p.y,150))if(Math.random()<.15){stun(e,.5);event('stun');}
 }
 function intercept(f,c,dt){
  const s=state();for(const q of [...G.Projectiles.all()])if(!q.friendly){
   if(zOn('psychicStop')){q.leaderFrozen||={vx:q.vx,vy:q.vy};q.vx=q.vy=0;q.t-=dt;continue;}
   if(q.leaderFrozen){q.vx=q.leaderFrozen.vx;q.vy=q.leaderFrozen.vy;delete q.leaderFrozen;}
   if(zOn('dataOverflow')){q.x-=q.vx*dt*.6;q.y-=q.vy*dt*.6;}
   const d=Math.hypot(q.x-c.x,q.y-c.y);
   if(f.screenAura&&d<=f.screenAura){if(!q.leaderScreen){q.leaderScreen=true;q.vx*=.65;q.vy*=.65;event('intercept');}if(d<50){G.Projectiles.remove(q);event('intercept');}}
   if(f.waterCurtain&&d<=f.waterCurtain&&!q.leaderCurtain){q.leaderCurtain=true;q.dmg*=.75;event('absorb',q.dmg/3);}
   if(f.orbitIntercept||f.meleeIntercept&&s.time-(s.lastMelee||0)<.3||f.dashIntercept&&actors().some(p=>own(p).dashUntil>s.time)){
    const orb=G.Projectiles.all().find(p=>p.orb&&p.friendly&&Math.hypot(p.x-q.x,p.y-q.y)<p.r+q.r+8);
    if(orb||f.meleeIntercept&&d<120||f.dashIntercept&&d<80){G.Projectiles.remove(q);event('intercept');if(f.magnetGuard)for(const p of actors())shield(p,2,3);}
   }
  }
 }
 function onCast(p,m){
  if(!team(p)||m.leaderGenerated||depth)return;const f=profile(),s=state(),q=own(p);q.lastCast=s.time;event('cast');event(m.kind+'Cast');
  if(!s.types.includes(m.type)){s.types.push(m.type);event('distinctType');}
  if(m.kind==='melee'){q.meleeUntil=s.time+1;s.lastMelee=s.time;}
  if(m.kind==='beam')q.beamUntil=s.time+.4;
  if(m.kind==='dash'){q.dashUntil=s.time+.3;q.dashEnd=s.time+.8;if(f.dashInvuln||f.dashArmor)p.invuln=Math.max(p.invuln,.25);if(f.dashLightning)synthetic(p,'chain',{type:'electric',dmg:.3,count:3});if(f.dashFlames||f.longDashTrail)field(p,'trail',p.x,p.y,65,f.longDashTrail?5:3,budget(p)*.03,'fire',{burn:1});if(f.dashIntimidate)for(const e of G.EnemyMgr.queryCircle(p.x,p.y,180)){e.leaderDamage=.75;e.leaderDamageUntil=s.time+2;}if(f.rockCannon){q.rockCasts=(q.rockCasts||0)+1;if(q.rockCasts%f.rockCannon===0)synthetic(p,'projectile',{type:'rock',dmg:.6,count:1,size:15,pierce:2});}}
  if(f.selfCostPP)p.hp=Math.max(1,p.hp-p.maxHp*f.selfCostPP*ppCost(p,m,1));
  if(f.meleeStones&&m.kind==='melee')synthetic(p,'projectile',{type:'rock',count:f.meleeStones,dmg:.18,pierce:1,spread:.15});
  if(f.extraFists&&m.kind==='melee')schedule(.2,()=>synthetic(p,'melee',{dmg:m.dmg*.2,radius:m.radius}));
  if(f.bladeWaves&&m.kind==='melee')synthetic(p,'projectile',{type:'bug',count:2,dmg:.15,pierce:1,spread:.25});
  if(f.rainMelee&&m.kind==='melee'&&isRain())schedule(.15,()=>synthetic(p,'melee',{...m,dmg:m.dmg*.2}));
  if(f.synchronize&&buffCount(p)>0&&m.kind==='buff')for(const ally of actors().filter(a=>a!==p))for(const [key,b]of Object.entries(p.buffs))if(b.n&&ally.buffs[key])Object.assign(ally.buffs[key],{n:Math.min(3,b.n),t:Math.min(5,b.t),amount:b.amount*.3});
  if(f.thunderFistsGlobal&&m.kind==='melee')synthetic(p,'chain',{type:'electric',dmg:.2,count:2,radius:250});
  if(f.dataFreeBeam&&m.kind==='beam'&&q.download){q.freeBeams=(q.freeBeams||0)+1;if(q.freeBeams%4===0)synthetic(p,'beam',{...m,dmg:m.dmg*.3});}
  if(zOn('quantumEcho')&&p.squadId===s.dittoId)synthetic(captain(),m.kind,{...m,dmg:m.dmg*.7},p.aim);
 }
 function outgoing(p,e,m){
  if(!team(p))return 1;const f=profile(),q=own(p);let n=f.damage||1;
  if(p!==captain())n*=f.allyDamage||1;
  if(f.bankDamage)n*=1+Math.min(.3,Math.floor(run().gold/20)*f.bankDamage);
  if(f.healthyDamage&&p.hp>p.maxHp*.85)n*=f.healthyDamage;
  if(f.farDamage&&p!==captain()&&Math.hypot(p.x-captain().x,p.y-captain().y)>350)n*=f.farDamage;
  if(f.freshEnemyDamage&&!status(e))n*=f.freshEnemyDamage;
  if(f.unbuffedDamage&&!buffCount(p))n*=f.unbuffedDamage;
  if(f.statusDamage&&status(e))n*=f.statusDamage;
  if(f.stabDamage&&p.mon.types.includes(m.type))n*=f.stabDamage;
  if(f.nonStabDamage&&!p.mon.types.includes(m.type))n*=f.nonStabDamage;
  if(f.singleTypeDamage&&new Set(p.moves.map(a=>a.type)).size===1)n*=f.singleTypeDamage;
  if(f.rainDamage&&isRain())n*=f.rainDamage;
  if(f.castingDamage&&p.attackFace>0)n*=f.castingDamage;
  if(f.nonCritDamage&&!m.leaderCrit)n*=f.nonCritDamage;
  if(f.firstDamage&&!m.leaderGenerated)n*=f.firstDamage;
  if(f.healthyProjectile&&m.kind==='projectile'&&e.hp/e.maxHp>.7)n*=f.healthyProjectile;
  if(f.statusDuration&&status(e))n*=1.05;
  if(f.puddleBuff&&q.puddleUntil>state().time)n*=1+f.puddleBuff;
  if(f.postZWeakness&&q.postZUntil>state().time)n*=1.2;
  if(f.heavyFury&&q.heavyUntil>state().time)n*=1.25;
  if(e.leaderVulnerableUntil>state().time)n*=1+(e.leaderVulnerable||0);
  if(f.stunVulnerable&&e.classStunT>0)n*=1+f.stunVulnerable;
  if(f.frozenVulnerable&&(e.freezeT>0||e.classStunT>0))n*=1+f.frozenVulnerable;
  if(f.frozenBeam&&m.kind==='beam'&&(e.freezeT>0||e.classStunT>0))n*=f.frozenBeam;
  if(f.shieldDamage&&e.shield>0)n*=f.shieldDamage;
  if(f.burnDamage&&e.burn>0&&m.type==='fire')n*=f.burnDamage;
  if(q.guardUntil>state().time)n*=1.5;
  return n;
 }
 function penetration(p,e,m){if(!team(p)||m.leaderGenerated)return 0;const f=profile();return clamp((f.psychicPenetration||0)+(f.ignoreDefenseBuffs&&e.shield>0?.1:0)+(e.leaderArmorUntil>state().time?e.leaderArmor||0:0),0,.6);}
 function crit(p,m,e){
  if(!team(p))return 0;const f=profile(),q=own(p);let n=f.moves?.[m?.kind]?.crit||0;
  if(f.sunCritPenalty&&isSun())n-=f.sunCritPenalty;
  if(f.electricCrit&&m?.type==='electric')n+=f.electricCrit;
  if(f.rainCrit&&isRain())n+=f.rainCrit;
  if(f.burnCrit&&m?.kind==='cone'&&e?.burn>0)n+=f.burnCrit;
  if(f.beamCritRamp&&m?.kind==='beam')n+=Math.min(.3,(q.beamHits||0)*f.beamCritRamp);
  if(f.stationaryCritOff&&q.stationary>1)return -1;
  if(e&&f.firstHealthyCrit&&e.hp/e.maxHp>.8&&!e.leaderFirstHit)return 1;
  if(e&&f.knockCrit&&Math.abs(e.kx)+Math.abs(e.ky)>20)return 1;
  if(zOn('dataOverflow')||zOn('blizzard')||zOn('rageFists')&&m?.kind==='melee'||zOn('butterflyBeam')&&f.butterflyCrit)return 1;
  if(f.lastHitCrit&&q.combo%5===4)return 1;
  if(inZ()&&(f.eightBeamsCrit||f.throwCrit||f.quantumCrit||f.stormFury||f.phoenixCrit||f.psychicStopCrit))n+=.25;
  return n;
 }
 function critMultiplier(p,m){if(!team(p))return 0;const f=profile();return Math.max(0,(Math.max(f.critMultiplier||1.5,f.moves?.[m?.kind]?.critMul||1.5)-1.5))+(m?.kind==='melee'?Math.min(.5,p.baseDefense*(f.defCritConversion||0)):0);}
 function hit(p,e,m,dealt,critical=false,shielded=false){
  if(!team(p)||!dealt||m.leaderGenerated||m.typeBondSecondary||depth)return;const f=profile(),s=state(),q=own(p);e.leaderFirstHit=true;q.combo=(q.combo||0)+1;
  event('hit');event(m.kind+'Hit');if(critical){event('crit');event(m.kind+'Crit');}if(m.type==='electric')event('electricHit');if(m.type==='ice')event('iceHit');if(p.mon.types.includes(m.type))event('stabHit');if(['projectile','mine'].includes(m.kind))event('rangedHit');if(['meteor','dash'].includes(m.kind))event('areaHit');
  if(shielded&&e.shield<=0){event('shieldBreak');if(f.shieldQuake)blast(p,e.x,e.y,180,budget(p)*.1,'ground',{knock:100});if(f.shieldShards)synthetic(p,'nova',{count:8,type:'poison',dmg:.2});}
  if(m.kind==='melee'){if(q.lastTarget===e.id)event('repeatMelee');q.lastTarget=e.id;if(f.meleeShieldGain)shield(p,p.maxHp*f.meleeShieldGain,4);if(f.tongueStun&&Math.random()<f.tongueStun)stun(e,.5);}
  if(m.kind==='beam')q.beamHits=(q.beamHits||0)+1;
  if(zOn('furyFang')&&['melee','projectile'].includes(m.kind)&&s.time>(e.leaderFangAt||0)){e.leaderFangAt=s.time+.25;direct(p,e,percent(p,e,.05),m.type);if(m.kind==='melee')heal(p,dealt*.1);}
  if(f.spikesShieldBreak&&shielded)e.shield=Math.max(0,e.shield-dealt*.2);
  if(f.dashExecute&&m.kind==='dash'&&!e.boss&&!e.elite&&e.hp/e.maxHp<f.dashExecute)direct(p,e,e.hp+e.shield+1,m.type);
  if(f.frozenExecute&&(e.classStunT>0||e.freezeT>0)&&!e.boss&&!e.elite&&e.hp/e.maxHp<f.frozenExecute)direct(p,e,e.hp+e.shield+1,'ice');
  if(f.gyaradosCritWave&&critical&&m.kind==='melee'&&s.time>(q.waveAt||0)){q.waveAt=s.time+1;blast(p,e.x,e.y,100,budget(p)*.05,'water',{knock:80});}
  if(f.dreamPP&&e.classStunT>0&&s.time>(q.dreamAt||0)){q.dreamAt=s.time+2;G.MovePP.add(p,p.moves,f.dreamPP);}
  if(f.thrustVulnerable&&m.kind==='melee'&&critical)vulnerable(e,f.thrustVulnerable,2);
  if(f.burnCrit&&m.kind==='cone'&&critical)e.applyBurn(1,p);
  if(m.knock>0)event('knock');if(m.kind==='mine')event('mineTrigger');
  if(m.leaderReturning)event('boomerangReturn');if(m.leaderBounced)event('bounceHit');
  if(m.kind==='aura'&&f.auraSlow)e.applySlow(f.auraSlow,1);
  if(m.kind==='beam'&&f.beamFreeze){e.applySlow(f.beamFreeze,1);if(Math.random()<.15){stun(e,.7);event('freeze');}}
  if(m.kind==='cone'&&f.acidDefense){e.leaderArmor=f.acidDefense;e.leaderArmorUntil=s.time+3;}
  if(f.trapSilence&&['mine','trail'].includes(m.kind)){e.applySlow(.7,f.trapSilence);e.leaderSilenceUntil=s.time+f.trapSilence;}
  if(f.parasiticMines&&m.kind==='mine'){e.leaderParasite=4;e.leaderParasiteOwner=p;event('spore');if(f.parasiteVulnerable)vulnerable(e,f.parasiteVulnerable,4);}
  if(f.moves?.orbit?.poisonChance&&m.kind==='orbit'&&Math.random()<f.moves.orbit.poisonChance)e.applyPoison(1,p);
  if(f.critVenom&&critical&&m.kind==='melee'){e.leaderVenom=(e.leaderVenom||0)+dealt*f.critVenom;e.leaderVenomOwner=p;e.leaderVenomLeft=4;}
  const leech=m.kind==='melee'?(f.meleeLeech||0)+(isRain()?f.rainLeech||0:0):m.kind==='projectile'?f.projectileLeech||0:0;
  if(leech){heal(p,dealt*leech);if(f.overhealShield&&p.hp>=p.maxHp)shield(p,Math.min(p.maxHp*.005,dealt*leech*f.overhealShield));}
  if(f.orbitHeal&&m.kind==='orbit')heal(p,p.maxHp*f.orbitHeal);
  if(f.critPP&&critical)G.MovePP.add(p,p.moves,Math.random()<f.critPP?1:0);
  if(f.critPP&&critical&&f.moves?.chain&&m.kind==='chain')G.MovePP.add(p,[p.moves.find(a=>a.id===m.id)].filter(Boolean),1);
  if(f.echo&&!m.extraCast){const amount=dealt*(zOn('parentFury')?.7:f.echo);schedule(.12,()=>{direct(p,e,amount,m.type);event('echoHit');if(f.echoHeal)heal(p,p.maxHp*f.echoHeal);if(f.echoStun&&Math.random()<.2)stun(e,f.echoStun);});}
  if(f.thirdHitTrue&&q.combo%3===0)direct(p,e,dealt*.2,m.type);
  if(f.meleeEcho&&m.kind==='melee')schedule(.15,()=>direct(p,e,dealt*f.meleeEcho,m.type));
  if(f.acidPuddle&&m.kind==='cone'&&Math.random()<.1)field(p,'acid',e.x,e.y,50,2,budget(p)*.01,'poison',{poison:1});
  if(f.devourPP&&e.hp/e.maxHp<.3&&m.kind==='cone'&&Math.random()<.1)G.MovePP.add(p,p.moves,1);
  if(m.leaderStun)stun(e,m.leaderStun);
 }
 function statusApplied(e,kind,owner,added,generated=false){
  if(!active()||!team(owner)||depth)return;const f=profile();if(!generated)event(kind==='burn'?'burnStack':'poisonStack',Math.max(0,added));
  if(f.statusDuration){if(kind==='burn')e.burnT*=f.statusDuration;else e.poisonT*=f.statusDuration;}
 }
 function enemyTick(e,dt){
  if(!active()||e.dead)return;const f=profile(),s=state();
  if(zOn('dataOverflow'))e.applySlow(.6,.15);
  if(e.leaderSilenceUntil>s.time){e.shotCd=Math.max(e.shotCd,.2);e.skillCd=Math.max(e.skillCd,.2);}
  if(e.poison>0){event('poisonHit',dt/.6);if(f.poisonRate&&G.EnemyMgr.queryCircle(captain().x,captain().y,180).includes(e))e.poisonTick-=dt*(f.poisonRate-1);}
  if(e.burn>0)event('burnHit',dt/.5);
  if((f.pressure||f.globalPressure)&&(!f.pressure||Math.hypot(e.x-captain().x,e.y-captain().y)<250)){e.shotCd+=dt*(f.pressure||f.globalPressure);e.skillCd+=dt*(f.pressure||f.globalPressure);}
  if(e.leaderParasite>0){e.leaderParasite-=dt;direct(e.leaderParasiteOwner||captain(),e,Math.min(e.maxHp*.015,budget(captain())*.025)*dt,'poison');}
  if(e.leaderVenomLeft>0){const d=Math.min(e.leaderVenom,e.leaderVenom/Math.max(dt,e.leaderVenomLeft)*dt);e.leaderVenom-=d;e.leaderVenomLeft-=dt;direct(e.leaderVenomOwner||captain(),e,d,'poison');}
 }
 function beforeHurt(p,type,source){
  if(!team(p))return true;const f=profile(),q=own(p),s=state();
  if(q.guardUntil>s.time||q.burrowUntil>s.time||zOn('outrage')&&f.outrageInvuln&&s.time<s.zUntil-4)return false;
  if(f.soundImmune&&source.kind==='sound'||f.recoilImmune&&source.kind==='recoil')return false;
  if((f.immune||[]).includes(type)||f.groundImmune&&type==='ground'){
   q.rodUntil=s.time+4;if(f.absorbedHeal)heal(p,p.maxHp*f.absorbedHeal);if(f.waterHeal&&type==='water')heal(p,source.enemy?.dmg*f.waterHeal||p.maxHp*.01);event('absorb',source.enemy?.dmg||10);return false;
  }
  if(f.frontParry&&source.kind==='contact'&&source.enemy){const angle=Math.atan2(source.enemy.y-p.y,source.enemy.x-p.x);if(Math.abs(Math.atan2(Math.sin(angle-p.aim),Math.cos(angle-p.aim)))<.6&&s.time>(q.parryAt||0)){q.parryAt=s.time+3;return false;}}
  if(f.attackDebuffImmune)p.attackDebuff=0;
  return true;
 }
 function incoming(p,damage,type,source){
  if(!team(p))return damage;const f=profile(),q=own(p),s=state(),mult=type?G.Types.mult(type,p.mon.types):1;let n=f.incoming||1;
  n*=f.incomingTypes?.[type]||1;if(p===captain())n*=f.captainIncomingTypes?.[type]||1;
  if(mult>1){n*=f.weakDamage||1;n*=1-(f.weakReduction||0);}
  if(mult===1)n*=1-(f.neutralReduction||0);
  if(f.typeResist&&p.mon.types.includes(type))n*=1-f.typeResist;
  if(source.kind==='contact'||source.kind==='melee')n*=f.physicalIncoming||1;else if(['ranged','projectile','beam'].includes(source.kind))n*=f.specialIncoming||f.rangedIncoming||1;
  if(f.dotIncoming&&['weather','environment'].includes(source.kind))n*=f.dotIncoming;
  if(f.stationaryIncoming&&q.stationary>1)n*=f.stationaryIncoming;
  if(f.sunIncoming&&isSun())n*=f.sunIncoming;
  if(f.fullHpReduction&&p.hp>=p.maxHp*.99)n*=1-f.fullHpReduction;
  if(f.statusDefense&&(p.slowT>0||p.attackDebuffT>0))n*=1-f.statusDefense;
  if(f.poisonIncoming&&source.enemy?.poison>0)n*=f.poisonIncoming;
  if(f.castGuard&&s.time-(q.lastCast||0)<.3)n*=1-f.castGuard;
  if(f.dashGuard&&q.dashUntil>s.time)n*=1-f.dashGuard;
  if(f.dashAfterIncoming&&q.dashEnd>s.time&&q.dashUntil<=s.time)n*=f.dashAfterIncoming;
  if(f.dryGrassIncoming&&type==='grass'&&!isRain())n*=f.dryGrassIncoming;
  if(f.postZWeakness&&q.postZUntil>s.time)n*=f.postZWeakness;
  if(f.dashRecovery&&q.dashEnd>s.time&&q.dashUntil<=s.time)n*=1+f.dashRecovery;
  if(source.enemy?.leaderDamageUntil>s.time)n*=source.enemy.leaderDamage||1;
  let d=damage*n;d=G.LeaderUnova?.capIncoming(p,d,source)??d;if(f.hitCap)d=Math.min(d,p.maxHp*f.hitCap);
  if(f.heavyShield&&d>p.maxHp*.2)shield(p,p.maxHp*f.heavyShield);
  if(f.delayedDamage){const part=d*f.delayedDamage;q.pain=(q.pain||0)+part;q.painRate=q.pain/4;d-=part;}
  if(q.shield>0){const absorbed=Math.min(d,q.shield);q.shield-=absorbed;d-=absorbed;event('absorb',absorbed);if(!q.shield&&f.shieldShards)synthetic(p,'nova',{type:'poison',dmg:.3,count:f.shieldShards});}
  return Math.max(0,d);
 }
 function hurt(p,amount,type,source){
  if(!team(p)||!(amount>0))return;const f=profile(),s=state(),q=own(p);q.hurt++;q.hurtUntil=s.time+3;q.lastHurt=s.time;
  event('hurtCount');if(amount>=p.maxHp*.2)q.heavyUntil=s.time+4;if(p===captain()){event('hurtAmount',amount);if(amount>=p.maxHp*.2)event('heavyHurt');}
  if(f.hurtMelee)G.MovePP.add(p,p.activeGroup(),1);
  if(f.contactReflect&&source.kind==='contact'&&source.enemy)direct(p,source.enemy,amount*f.contactReflect,p.mon.types[0]);
  if(source.enemy&&source.kind==='contact'){
   const e=source.enemy;if(f.contactFear)stun(e,f.contactFear);if(f.contactSlow)e.applySlow(f.contactSlow,2);if(f.contactStun&&Math.random()<f.contactStun)stun(e,.75);if(f.contactPoison)e.applyPoison(f.contactPoison,p);if(f.contactBurn)e.applyBurn(f.contactBurn,p);if(f.contactLightning)synthetic(p,'chain',{type:'electric',dmg:.3,count:3});if(f.contactSlime)field(p,'slime',p.x,p.y,60,3,budget(p)*.02,'poison',{slow:.3,poison:1});
  }
  if(f.iceCounter&&s.time>(q.counterAt||0)){q.counterAt=s.time+2;synthetic(p,'nova',{type:'ice',count:f.iceCounter,dmg:.2});}
  if(f.counterSpikes&&s.time>(q.counterAt||0)){q.counterAt=s.time+2;synthetic(p,'nova',{type:'rock',count:f.counterSpikes,dmg:.2});}
 }
 function rescue(p){
  if(!team(p)||p.hp>0)return false;const f=profile(),s=state(),q=own(p);if(q.rescued)return false;
  if(!(f.deathGuard||f.deathHeal||f.phoenixRescue||f.deathNova||f.boneGuard||f.gasGuard||f.emergencyWarp))return false;
  q.rescued=true;p.dead=false;p.hp=f.deathHeal?p.maxHp*f.deathHeal:1;q.guardUntil=s.time+(f.deathGuard||f.gasGuard||f.emergencyWarp||1.5);p.invuln=Math.max(p.invuln,q.guardUntil-s.time);
  if(f.deathNova||f.shedNova)blast(p,p.x,p.y,screenRadius(),budget(p)*.3,p.mon.types[0],{stun:1,poison:f.shedNova?3:0});
  if(f.phoenixRescue){for(const ally of actors()){ally.hp=Math.min(ally.maxHp,Math.max(ally.hp,1)+ally.maxHp*.25);ally.dead=false;ally.invuln=Math.max(ally.invuln,2);}blast(p,p.x,p.y,screenRadius(),budget(p)*.25,'fire',{burn:3});}
  return true;
 }
 function killed(e){
  if(!active())return;const s=state(),f=profile(),p=e.lastAttacker;if(!team(p))return;
  own(p).kills++;s.teamKills++;if(!e.lastTypeBondAttack?.leaderGenerated){event('kill');if(e.leaderArmorUntil>s.time||e.leaderVulnerableUntil>s.time)event('debuffKill');}
  if(f.download)own(p).download=e.defense>=e.spdef?'special':'physical';
  if(f.dashKillReset&&e.lastTypeBondAttack?.kind==='dash')for(const m of p.moves.filter(m=>m.kind==='dash'))m.t*=1-f.dashKillReset;
  if(f.eliteReset&&(e.elite||e.boss))for(const m of p.moves)m.t=0;
  if(f.killGuard)p.invuln=Math.max(p.invuln,Math.min(.5,f.killGuard));
  if(f.rice&&s.teamKills%20===0&&s.riceSpawn<2){s.riceSpawn++;dropFood('rice',e.x,e.y);}
  if(f.fruitChance&&Math.random()<f.fruitChance&&s.time>=s.fruitCooldown&&food.filter(q=>q.kind==='fruit').length<6){s.fruitCooldown=s.time+2;dropFood('fruit',e.x,e.y);}
  if(f.parasiticMines&&e.leaderParasite>0){for(const off of [-20,20])field(p,'spore',e.x+off,e.y,40,5,0,'poison',{poison:1,slow:.3});if(f.parasiteHeal)healTeam(f.parasiteHeal,true);}
  if(f.statusDeathPollen&&status(e)&&!e.lastTypeBondAttack?.leaderGenerated)blast(p,e.x,e.y,70,budget(p)*.02,'bug',{poison:1});
 }
 let food=[];
 function dropFood(kind,x,y){food.push({kind,x,y,left:30});}
 function tickFood(dt){if(!active())return;for(const q of [...food]){q.left-=dt;const p=actors().find(p=>!p.dead&&Math.hypot(p.x-q.x,p.y-q.y)<p.r+18);if(p){if(q.kind==='fruit'){p.heal((p.maxHp-p.hp)*.08);G.MovePP.add(p,p.moves,1);own(p).fruitUntil=state().time+3;event('fruitPickup');}else p.heal(p.maxHp*.1);food.splice(food.indexOf(q),1);}else if(q.left<=0)food.splice(food.indexOf(q),1);}}
 function draw(ctx){if(!active())return;for(const q of food){ctx.save();ctx.fillStyle=q.kind==='rice'?'#fff4d0':'#ef8ca1';ctx.strokeStyle='#304b43';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y-G.LIFT,8,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#77cf72';ctx.fillRect(q.x-1,q.y-G.LIFT-11,4,5);ctx.restore();}for(const f of fields){ctx.save();ctx.strokeStyle=G.U.TYPE_COLOR[f.type]||'#e4f6ff';ctx.globalAlpha=.3;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(f.x,f.y,f.r,f.r*.7,0,0,TAU);ctx.stroke();ctx.restore();}}
 function finishBattle(){
  if(!active())return;const f=profile(),s=state();
  if(f.bankDamage){run().leaderGold=(run().leaderGold||0)+Math.min(2,Math.floor((s.teamKills||0)/20));run().gold+=Math.min(2,Math.floor((s.teamKills||0)/20));}
  if(f.endHeal)for(const p of actors())if(!p.dead)p.heal((p.maxHp-p.hp)*f.endHeal);
  if(f.endCleanse)for(const p of actors()){p.slowT=0;p.attackDebuffT=0;p.attackDebuff=0;}
  fields=[];jobs=[];food=[];s.z=null;s.zUntil=0;for(const p of actors())own(p).shield=0;
 }
 function refreshCost(value){return active()?Math.ceil(value*(profile().shopRefreshFactor||1)):value;}
 function healEvent(p,n){if(team(p)&&n>0){event('heal',n);if(profile().overhealShield&&p.hp>=p.maxHp)shield(p,n*profile().overhealShield);}}
 function pickup(){if(active())event('pickup');}
 function slowImmune(p){return team(p)&&(profile().slowImmune||zOn('outrage'));}
 function phase(p){return team(p)&&!!profile().phaseTerrain;}
 function extraEliteItems(){return active()&&run().kind==='elite'?(profile().eliteItem||0):0;}
  function description(dex){const d=definition(dex);return d?{definition:d,profile:active()&&dex===captain().dex?profile():d.base,unlocked:G.LeaderMedals.unlocked(dex)}:null;}
 function activate(){return false;} // Filled by the explicit Z dispatch below.
 return {definition,profile,active,state,begin,beginBattle,tick(dt){tick(dt);tickFood(dt);},sync,move,rate,agility,ppCost,regen,xp,allowed,learnPool,legalFixed,
  factor,onCast,outgoing,penetration,crit,critMultiplier,hit,statusApplied,enemyTick,beforeHurt,incoming,hurt,rescue,killed,finishBattle,refreshCost,healEvent,pickup,slowImmune,phase,extraEliteItems,description,draw,
  restore(){cachedRun=null;cachedKey='';fields=[];jobs=[];food=[];},
  activate, get fields(){return fields;},
  _z:{actors,enemies,captain,state,profile,definition,team,own,zOn,inZ,screenRadius,shield,heal,healTeam,stun,vulnerable,pull,clearShots,direct,blast,percent,budget,field,schedule,synthetic,event,clamp,withoutCharge}
 };
})();
