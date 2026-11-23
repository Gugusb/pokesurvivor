/* Every family supplies a reviewed burst specification, not an unnamed fallback. */
(()=>{
 const U=G.LeaderUnova,L=G.LeaderAbilities,Z=L._z,{actors,enemies,captain,state,own,shield,stun,schedule,pull,clearShots,budget,direct,field}=Z;
 const byRoot=()=>new Map((G.LeaderAbilitiesConfig?.families||[]).filter(d=>d.generation===5).map(d=>[d.root,d]));
 function attack(p,spec){const m=p.activeMove?.()||p.moves[0],basis=spec.basis==='spa'?p.attackFor({damageClass:'special'}):spec.basis==='max'?Math.max(p.attackFor({damageClass:'physical'}),p.attackFor({damageClass:'special'})):p.attackFor(m);return Math.max(1,(m?.dmg||20)*basis);}
 function hit(p,e,power,types,spec){if(e.dead)return 0;if(spec.stealShield){const stolen=e.shield||0;e.shield=0;for(const ally of actors())shield(ally,stolen/Math.max(1,actors().length));}let total=0;for(const type of types){if(e.dead)break;const m={type,kind:['rush','target','cone'].includes(spec.shape)?'melee':spec.shape==='line'?'beam':'nova',damageClass:spec.basis==='spa'?'special':spec.basis==='max'?(p.spa>=p.atk?'special':'physical'):(p.activeMove()?.damageClass||'physical'),leaderGenerated:true,sinnohZ:true,unovaZ:true,unovaPhysicalDefense:spec.defense==='physical',unovaArmor:spec.armor||0,leaderTrue:!!spec.trueDamage,leaderCrit:!!spec.critical};
   const kyuremPart=U.f().kyuremModes&&R().unovaConfig?.kyurem&&R().unovaConfig.kyurem!=='normal'?.8:1;let amount=attack(p,spec)*power/types.length*kyuremPart*U.typeFactor(p,type,e,G.Abilities.outgoingType(p,type,e.types),m)*G.Weather.mult(type);
   if(spec.basis==='defense-enemy')amount=(p.defenseFor({kind:'contact'})*100*2.5+Math.min(budget(p)*.2,Math.max(...enemies().map(e=>e.dmg||0),0)*1.5))/types.length;
   if(spec.critical)amount*=Math.max(G.Abilities.critMultiplier(p)+(L.critMultiplier(p,m)||0),U.critMultiplier(p,m,e));
   if(spec.lowDouble&&e.hp<e.maxHp*spec.lowDouble)amount*=2;
   if(spec.execute&&!e.boss&&e.hp<e.maxHp*spec.execute)amount=Math.max(amount,e.hp+(e.shield||0)+1);
   if(spec.kinetic)amount+=Math.min(U.s().kinetic||0,budget(p)*.3)/types.length;
   if(spec.breakShield)e.shield=0;
   total+=direct(p,e,amount,type,m);
  }
  const u=U.s(),a=U.f();
  if(spec.stun)stun(e,spec.stun);if(spec.freeze){if(!spec.freezeChance||Math.random()<spec.freezeChance){e.freezeT=Math.max(e.freezeT||0,spec.freeze*(e.boss?.5:1));u.freezeAt=U.now();}}
  if(spec.slow)e.applySlow(spec.slow,3);if(spec.poison)e.applyPoison(spec.poison,p,true);if(spec.pull)pull(e,p.x,p.y,spec.pull);
    if(spec.armor)G.LeaderSinnoh.armor(e,spec.armor,5);
  if(spec.conduct){e.unovaConduct=spec.conduct;e.unovaConductUntil=U.now()+3;e.unovaParalyzedUntil=U.now()+3;}
  if(spec.attackDown){e.leaderDamage=1-spec.attackDown;e.leaderDamageUntil=U.now()+5;}
  if(spec.customDot){e.unovaDotUntil=U.now()+spec.duration;e.unovaDotPower=attack(p,spec)*spec.customDot;e.unovaDotType=types[0];e.applyBurn(1,p,true);}
  if(spec.moveShock){e.unovaMoveShockUntil=U.now()+2.5;e.unovaParalyzedUntil=U.now()+2.5;}
  if(a.mindWipe){if(e.boss||e.elite)e.leaderSilenceUntil=U.now()+3*(e.boss?.5:1);else stun(e,2.5);}
  if(a.antPhysicalVulnerable&&(e.elite||e.boss)){e.unovaPhysicalVulnerable=.35;e.unovaPhysicalUntil=U.now()+5;}
  if(a.fireResonance&&actors().some(p=>p.moves.some(m=>m.type==='fire'))){e.unovaConduct=.5;e.unovaConductUntil=U.now()+5;}
  if(a.thunderWeb){e.unovaWebUntil=U.now()+4;}
  if(a.kyuremModes&&R().unovaConfig?.kyurem&&R().unovaConfig.kyurem!=='normal'&&U.eproc(e,'kyuremElement',10)){const type=R().unovaConfig.kyurem==='black'?'electric':'fire';U.echo(p,e,total*.25,type,{unovaZ:true,sinnohZ:true});}
    if(a.kickFrenzy)u.kickUntil=U.now()+4;
  if(a.leafDodge)for(const ally of actors())U.q(ally).leafDodgeUntil=U.now()+5;
  return total;
 }
 const R=()=>G.Expedition.run;
 function inShape(p,e,spec,start,angle){const dx=e.x-start.x,dy=e.y-start.y,dist=Math.hypot(dx,dy),range=spec.radius||Z.screenRadius();if(spec.shape==='all'||spec.shape==='field'||spec.shape==='ward'||spec.shape==='nova')return dist<=range+e.r;
  if(spec.shape==='cone')return dist<=Math.max(350,range)&&Math.cos(Math.atan2(dy,dx)-angle)>=0;
  if(spec.shape==='line'||spec.shape==='rush'){const along=dx*Math.cos(angle)+dy*Math.sin(angle),side=Math.abs(-dx*Math.sin(angle)+dy*Math.cos(angle));return along>=-e.r&&along<=range+e.r&&side<=(spec.width||140)/2+e.r;}return true;}
 function execute(p,d){const spec=d.active,u=U.s(),a=U.f(),types=spec.drive?[R().unovaConfig?.drive||'water']:spec.types?.length?spec.types:d.base.sinnoh.types.length?d.base.sinnoh.types:['normal'];
  u.zToken=(u.zToken||0)+1;u.zHits=[];u.refunded=false;u.kowtowShield=false;u.zWindowIncoming=spec.windowIncoming||0;
  if(rootIs(494))u.postDefUntil=U.now()+2;
  if(spec.postSpa){u.postSpa=spec.postSpa;u.postSpaUntil=U.now()+3;}if(spec.postSpeed){u.postSpeed=spec.postSpeed;u.postSpeedUntil=U.now()+2;}
  if(spec.shellSmash)u.shellUntil=U.now()+(spec.window||6);
  if(spec.dance){u.danceUntil=U.now()+7;u.danceMax=U.now()+15;}
  if(a.coil)u.coilUntil=U.now()+6;
  if(a.braveTailwind){u.tailwindUntil=U.now()+6;u.tailwindSpeed=.3;u.tailwindHaste=.25;}
  if(a.aquaDash)u.aquaUntil=U.now()+5;
  if(a.otherFightCD)for(const ally of actors())for(const m of ally.moves)if(m.type==='fighting')m.t=Math.max(0,m.t-a.otherFightCD);
  if(a.dragonDance){u.dragonDance=Math.min(3,(u.dragonDance||0)+1);u.dragonDanceUntil=U.now()+6;}
  if(spec.toggleMeloetta){R().unovaConfig.meloetta=R().unovaConfig.meloetta==='dance'?'song':'dance';}
  if(spec.haste){u.gearUntil=U.now()+(spec.duration||5);u.tailwindUntil=U.now()+(spec.duration||5);u.tailwindSpeed=spec.teamSpeed||0;u.tailwindHaste=0;}
  if(spec.teamSpeed&&!spec.haste){u.tailwindUntil=U.now()+(spec.duration||4);u.tailwindSpeed=spec.teamSpeed;u.tailwindHaste=0;}
  if(spec.gold)u.zGold=Math.min(2,(u.zGold||0)+(rootIs(631)?1:1));
  if(spec.silver)u.silver=(u.silver||0)+3;
  if(spec.clearShots)clearShots();if(spec.heal)U.teamHeal(spec.heal);if(spec.healMissing)U.teamHeal(spec.healMissing,true);if(spec.fullHeal)U.teamHeal(1);if(spec.healDying)for(const ally of actors())if(!ally.dead&&ally.hp<=ally.maxHp*.3)U.burst(ally,ally.maxHp);
  if(a.ironWillShield)for(const ally of actors())shield(ally,ally.maxHp*Math.min(.4,.2*p.defenseFor({kind:'contact'})/Math.max(.1,p.baseDefense)),5);
  if(a.gearCrush){for(const e of enemies().slice().sort(()=>Math.random()-.5).slice(0,3)){U.echo(p,e,p.atk*3.5,'steel',{sinnohZ:true,unovaZ:true});stun(e,1.5);}}
  const start={x:p.x,y:p.y},angle=p.aim,castTargets=enemies(),target=castTargets.sort((a,b)=>b.hp-a.hp)[0];
  if(spec.needsTarget&&!target){p.hp=Math.max(1,p.hp-p.maxHp*.04);return;}
  let total=0;
  const strike=(list,power,extra={})=>{for(const e of list)if(!e.dead)total+=hit(p,e,power,types,{...spec,...extra});};
  if(spec.count>1){const v=G.VFX.forType(types[0]);for(let i=0;i<Math.min(30,spec.count);i++){const angle=i*Math.PI*2/Math.min(30,spec.count);G.FX.sp(v.proj||'orb',v.pal,p.x,p.y-G.LIFT,{vx:Math.cos(angle)*220,vy:Math.sin(angle)*160,life:.5,scale:1});}}
  const visual=(x=start.x,y=start.y,r=spec.radius||Z.screenRadius())=>G.FX.ring(x,y,10,r,G.U.TYPE_COLOR[types[0]]||'#eff8ff',.5,5);
  if(spec.shape==='targets'){const list=castTargets.slice(0,spec.count||3);for(const [i,e]of list.entries())schedule(i*.12,()=>{visual(e.x,e.y,100);strike([e],spec.perTarget?spec.power:spec.power/Math.max(1,list.length));});}
  else if(spec.shape==='target'){if(target){const x=target.x-Math.cos(angle)*60,y=target.y-Math.sin(angle)*60;if(G.World.isFree(x,y,p.r)){p.x=x;p.y=y;}visual(target.x,target.y,180);strike(castTargets.filter(e=>Math.hypot(e.x-target.x,e.y-target.y)<200),spec.power);}}
  else if(spec.shape==='meteor'){const n=spec.count||1;for(let i=0;i<n;i++){const e=castTargets[i%Math.max(1,castTargets.length)],x=e?.x??p.x+Math.cos(angle+i)*200,y=e?.y??p.y+Math.sin(angle+i)*200;visual(x,y,spec.radius||120);schedule(.35+i*.12,()=>strike(enemies().filter(v=>Math.hypot(v.x-x,v.y-y)<(spec.radius||120)+v.r),spec.power/n));}}
  else if(spec.shape==='field'){const duration=spec.duration||4,steps=Math.ceil(duration/.5);visual();for(let i=0;i<steps;i++)schedule(i*.5,()=>{const list=enemies().filter(e=>Math.hypot(e.x-start.x,e.y-start.y)<(spec.radius||Z.screenRadius()));strike(list,spec.power/steps,{stun:i===0?spec.stun:0});for(const e of list)if(spec.pull)pull(e,start.x,start.y,spec.pull*.5);});}
  else if(spec.shape==='ward'){visual(p.x,p.y,180);}
  else{
   if(spec.shape==='rush'){let distance=Math.min(spec.radius||400,Z.screenRadius()),last=0;for(let n=8;n<=distance;n+=8){if(G.World.arenaContains?.(start.x+Math.cos(angle)*n,start.y+Math.sin(angle)*n,p.r)===false)break;last=n;}p.x=start.x+Math.cos(angle)*last;p.y=start.y+Math.sin(angle)*last;p.invuln=Math.max(p.invuln,.6);}
   const list=castTargets.filter(e=>inShape(p,e,spec,start,angle));if(spec.shape==='line'||spec.shape==='rush')G.FX.beam(start.x,start.y-G.LIFT,angle,spec.radius||Z.screenRadius(),spec.width||120,G.U.TYPE_COLOR[types[0]],G.VFX.forType(types[0]));else visual();
   strike(list,spec.power);
   if(spec.knock||spec.pullEnd)for(const e of list)pull(e,spec.pullEnd?p.x:start.x,spec.pullEnd?p.y:start.y,spec.pullEnd?150:-(spec.knock||150));
  }
  if(spec.kinetic)u.kinetic=0;
  if(spec.damageHeal&&total)for(const ally of actors())Z.heal(ally,total*spec.damageHeal/Math.max(1,actors().length));
  if(spec.damageShield&&total)for(const ally of actors())shield(ally,total*spec.damageShield/Math.max(1,actors().length));
  if(spec.recoilMax&&!a.recoilImmune)p.hp=Math.max(1,p.hp-p.maxHp*spec.recoilMax);
  if(spec.duration&&spec.fieldDps||spec.fieldFlat){field(p,'unovaAftermath',p.x,p.y,spec.radius||180,spec.duration||4,spec.fieldFlat?spec.fieldFlat*.5:attack(p,spec)*(spec.fieldDps||.1)*.5,types[0],{sinnohZ:true,unovaZ:true,slow:spec.slow||0});}
  if(a.gravityField)field(p,'unovaGravity',target?.x??p.x,target?.y??p.y,220,4,0,'ground',{slow:.5});
  if(a.rockField)field(p,'unovaRocks',p.x,p.y,300,4,attack(p,spec)*.175,'rock',{sinnohZ:true,unovaZ:true,slow:.4});
  if(a.rockTrap)for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;field(p,'unovaSpike',p.x+Math.cos(angle)*90,p.y+Math.sin(angle)*90,45,3,attack(p,spec)*.05,'rock',{sinnohZ:true,unovaZ:true,slow:.2});}
 }
 function rootIs(id){return U.root()===id;}
 let installed=false;function install(){if(installed)return;const handlers={},timing={};for(const d of byRoot().values()){if(!['rush','all','line','cone','field','meteor','nova','target','targets','ward'].includes(d.active.shape))throw Error('Unreviewed burst shape '+d.root);handlers[d.active.kind]=p=>{const wait=d.active.windup||0;if(wait){U.s().chargeUntil=U.now()+wait;schedule(wait,()=>execute(p,d));}else execute(p,d);};timing[d.active.kind]=Math.max(4,d.active.duration||0,d.active.windup||0);}
 if(Object.keys(handlers).length!==76)throw Error('Expected 76 explicit Unova Z configurations');L.registerZ(handlers,timing);installed=true;}
 G.LeaderUnovaZ={install};if(G.LeaderAbilitiesConfig)install();else G.LeaderAbilitiesReady=G.LeaderAbilitiesReady.then(config=>{install();return config;});
})();
