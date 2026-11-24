/* Explicit authored Kalos bursts use the existing Z scheduler and damage APIs. */
(()=>{
 const K=G.LeaderKalos,L=G.LeaderAbilities,Z=L._z,{actors,enemies,captain,budget,shield,stun,schedule,synthetic,field,pull}=Z;
 const uReset=()=>K.s().executeReset===K.s().token;
 const typesFor=d=>d.active.types,main=p=>p.activeMove()||p.moves[0];
 function strike(p,e,power,types,a){if(e.dead)return 0;let total=0;for(const type of types){if(e.dead)break;const m={leaderGenerated:true,kalosZ:true,kind:a.shape==='beam'?'beam':'leader',type,damageClass:main(p).damageClass,leaderTrue:!!a.trueDamage,typeBondCritApplied:!!a.critical};let n=budget(p)*power/types.length*K.clampType(p,type,e,G.Abilities.outgoingType(p,type,e.types))*G.Weather.mult(type);if(a.critical)n*=G.LeaderAlola?.finalCrit(p,G.Abilities.critMultiplier(p)+L.critMultiplier(p,m,e))??(G.Abilities.critMultiplier(p)+L.critMultiplier(p,m,e));if(a.execute&&!e.boss&&!e.elite&&e.hp/e.maxHp<a.execute)n=Math.max(n,e.hp+(e.shield||0)+1);if(a.breakShield)e.shield=0;const before=e.dead;total+=Z.direct(p,e,n,type,m);if(a.resetOnExecute&&!before&&e.hp<=0&&!e.boss&&!e.elite&&!uReset()){K.s().executeReset=K.s().token;for(const move of p.moves)move.t=0;}}
  if(a.stun)stun(e,a.stun);if(a.nonBossStun&&!e.boss)stun(e,a.nonBossStun);if(a.freeze)e.freezeT=Math.max(e.freezeT||0,a.freeze*(e.boss?.5:1));if(a.slow)e.applySlow(a.slow,3);if(a.burn)e.applyBurn(a.burn,p,true);if(a.poison)e.applyPoison(a.poison,p,true);if(a.armor){e.leaderArmor=Math.max(e.leaderArmor||0,a.armor);e.leaderArmorUntil=K.now()+3;}if(a.vulnerable){e.leaderVulnerable=Math.max(e.leaderVulnerable||0,a.vulnerable);e.leaderVulnerableUntil=K.now()+4;}if(a.attackDown){e.leaderDamage=1-a.attackDown;e.leaderDamageUntil=K.now()+3;}return total;
 }
 const ring=(p,types,r=250)=>G.FX.ring(p.x,p.y,10,r,G.U.TYPE_COLOR[types[0]]||'#d7edff',.45,4);
 function execute(p,d){const a=d.active,u=K.s(),types=typesFor(d),start={x:p.x,y:p.y},angle=p.aim;if(!a.continuation)u.token++;u.zUntil=K.now()+(a.duration||4);
  if(a.shield)for(const ally of actors())shield(ally,ally.maxHp*a.shield,a.duration||5);
  if(a.heal)K.healTeam(a.heal);if(a.healMissing)K.healTeam(a.healMissing,true);
  if(a.attackBuff||a.speedBuff||a.haste||a.defenseBuff){u.buffUntil=K.now()+(a.duration||5);u.attackBuff=a.attackBuff||0;u.speedBuff=a.speedBuff||0;u.haste=a.haste||0;u.defenseBuff=a.defenseBuff||0;}
  if(a.selfCost)for(const ally of actors())if(!ally.dead)ally.hp=Math.max(1,ally.hp*(1-a.selfCost));if(a.physicalGuard){u.physicalGuard=a.physicalGuard;u.guardUntil=K.now()+(a.duration||5);}
  if(a.rain)G.Weather.force('rain',a.rain);if(a.guard)p.invuln=Math.max(p.invuln,a.guard);
  if(a.pp)for(const ally of actors())G.MovePP.add(ally,ally.activeGroup(),a.pp);
  if(a.reduceCd)for(const ally of actors())for(const m of ally.moves)m.t*=1-a.reduceCd;
  if(a.clear||a.reflect){const shots=[...G.Projectiles.all()].filter(q=>!q.friendly);Z.clearShots(p.x,p.y,a.clear===true||a.reflect?Z.screenRadius():a.clear,!!a.reflect);if(a.reflect)for(const shot of shots)if(shot.friendly&&shot.owner===p){shot.dmg=Math.min(shot.dmg,budget(p)*.03);shot.specMove={...shot.specMove,kalosZ:true,leaderGenerated:true};}}
  for(const e of enemies()){if(a.globalDebuff){e.leaderDamage=1-a.globalDebuff;e.leaderDamageUntil=K.now()+3;}if(a.silence)e.leaderSilenceUntil=K.now()+a.silence*(e.boss?.5:1);if(a.shape==='support'&&a.slow)e.applySlow(a.slow,3);if(a.shape==='support'&&a.stun)stun(e,a.stun);}
  const area=(x,y,r,power,extra={})=>{let total=0;for(const e of G.EnemyMgr.queryCircle(x,y,r)){total+=strike(p,e,power,types,{...a,...extra});if(a.knock&&!e.boss)pull(e,x,y,-a.knock);}return total;};
  if(a.shape==='projectile'||a.shape==='boomerang'){const n=a.count||1;for(let i=0;i<n;i++){const aim=a.shape==='boomerang'?angle+i*Math.PI*2/n:angle+(i-(n-1)/2)*.22;synthetic(p,a.shape,{type:types[0],damageClass:'special',dmg:budget(p)*a.power/n/(a.shape==='boomerang'?2:1)/Math.max(.01,p.attackFor({damageClass:'special'})),count:1,size:16,life:2,radius:500,speed:400,homing:a.shape==='projectile'?1.8:0,phaseWalls:true,kalosZ:true,kalosReturnStun:a.returnStun||0,kalosBurnBlast:!!a.fullBurnBlast,burn:a.burn||0,knock:a.knock||0},aim);}return;}
  let damage=0;
  if(a.shape==='support'){ring(p,types,180);if(a.radius)for(const e of G.EnemyMgr.queryCircle(p.x,p.y,a.radius)){if(a.vulnerable){e.leaderVulnerable=a.vulnerable;e.leaderVulnerableUntil=K.now()+4;}if(a.slow)e.applySlow(a.slow,4);}}
  else if(a.shape==='delayedNova'){ring(p,types,a.radius);schedule(a.delay||1,()=>area(start.x,start.y,a.radius||260,a.power));}
  else if(a.shape==='field'){const steps=Math.ceil(a.duration/.5);ring(p,types,a.radius);for(let i=0;i<steps;i++)schedule(i*.5,()=>area(start.x,start.y,a.radius,a.power/steps));}
  else if(a.shape==='targets'){const list=enemies().slice().sort(()=>Math.random()-.5).slice(0,a.count||8);for(const [i,e]of list.entries())schedule(i*.07,()=>{G.FX.beam(p.x,p.y-G.LIFT,Math.atan2(e.y-p.y,e.x-p.x),Math.hypot(e.x-p.x,e.y-p.y),8,G.U.TYPE_COLOR[types[0]],G.VFX.forType(types[0]));strike(p,e,a.power/Math.max(1,list.length),types,a);});}
  else if(a.shape==='targetNova'){const e=enemies().sort((a,b)=>b.hp-a.hp)[0];if(e){const x=e.x-Math.cos(angle)*50,y=e.y-Math.sin(angle)*50;if(G.World.isFree(x,y,p.r)&&G.World.arenaContains?.(x,y,p.r)!==false){p.x=x;p.y=y;}}ring(p,types,a.radius);damage=area(p.x,p.y,a.radius,a.power);}
  else if(a.shape==='nova'){ring(p,types,a.radius||Z.screenRadius());damage=area(p.x,p.y,a.radius||Z.screenRadius(),a.power);}
  else{
   const shots=a.count||1;for(let i=0;i<shots;i++){const ray=angle+(i-(shots-1)/2)*.18;G.FX.beam(start.x,start.y-G.LIFT,ray,a.range||Z.screenRadius(),a.width||80,G.U.TYPE_COLOR[types[0]],G.VFX.forType(types[0]));
    for(const e of enemies()){const dx=e.x-start.x,dy=e.y-start.y,along=dx*Math.cos(ray)+dy*Math.sin(ray),side=Math.abs(-dx*Math.sin(ray)+dy*Math.cos(ray)),inRange=Math.hypot(dx,dy)<(a.range||Z.screenRadius())+e.r,hit=a.shape==='cone'||a.shape==='melee'?inRange&&Math.cos(Math.atan2(dy,dx)-ray)>0:inRange&&along>=-e.r&&side<(a.width||150)/2+e.r;if(hit){damage+=strike(p,e,a.power/shots*(a.trail?.8:1)*(a.shape==='beamNova'?.75:1),types,a);if(a.knock&&!e.boss)pull(e,start.x,start.y,-a.knock);if(a.pull&&!e.boss)pull(e,start.x+Math.cos(ray)*along,start.y+Math.sin(ray)*along,a.pull);}}
   }
   if(a.shape==='rush'){let last=0;for(let n=8;n<=(a.range||650);n+=8){const x=start.x+Math.cos(angle)*n,y=start.y+Math.sin(angle)*n;if(!G.World.isFree(x,y,p.r)||G.World.arenaContains?.(x,y,p.r)===false)break;last=n;}p.x=start.x+Math.cos(angle)*last;p.y=start.y+Math.sin(angle)*last;p.invuln=Math.max(p.invuln,.4);
    if(a.trail)for(let i=0;i<5;i++)field(p,'kalosFireTrail',start.x+(p.x-start.x)*i/4,start.y+(p.y-start.y)*i/4,70,3,budget(p)*a.power*.2/5/6,types[1]||types[0],{kalosZ:true,burn:1});
    if(a.healingTrail){for(const ally of actors())K.queue(ally,ally.maxHp*Math.min(.06,enemies().length*(a.healPerTarget||.005)));for(let i=0;i<5;i++)G.FX.ring(start.x+(p.x-start.x)*i/4,start.y+(p.y-start.y)*i/4,8,60,'#86e79d',.7,3);}
   }
   if(a.shape==='beamNova')area(start.x,start.y,230,a.power*.25);
  }
  if(a.damageHeal&&damage)for(const ally of actors())K.queue(ally,damage*a.damageHeal/Math.max(1,actors().length));
  if(a.acid)field(p,'kalosAcid',start.x,start.y,180,4,budget(p)*.005,'poison',{kalosZ:true,slow:.5,poison:1});
  if(a.count>1){const v=G.VFX.forType(types[0]);for(let i=0;i<Math.min(24,a.count);i++)G.FX.sp(v.proj||'orb',v.pal,p.x,p.y-G.LIFT,{vx:Math.cos(i*Math.PI*2/a.count)*240,vy:Math.sin(i*Math.PI*2/a.count)*180,life:.5});}
 }
 let installed=false;function install(){if(installed)return;const handlers={},timings={};for(const d of G.LeaderAbilitiesConfig.families.filter(v=>v.generation===6)){if(!['projectile','boomerang','nova','delayedNova','support','rush','melee','beam','cone','targets','field','targetNova','beamNova'].includes(d.active.shape))throw Error('Unreviewed Kalos Z '+d.root);handlers[d.active.kind]=p=>execute(p,d);timings[d.active.kind]=Math.max(4,d.active.duration||0,d.active.delay||0);}if(Object.keys(handlers).length!==37)throw Error('Expected 37 Kalos Z configurations');L.registerZ(handlers,timings);installed=true;}
 G.LeaderKalosZ={install,execute,strike};if(G.LeaderAbilitiesConfig)install();else G.LeaderAbilitiesReady=G.LeaderAbilitiesReady.then(config=>{install();return config;});
})();
