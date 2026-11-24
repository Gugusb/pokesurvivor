/* Alola adaptations use the shared captain APIs. All counters remain node-save data. */
G.LeaderAlola=(()=>{
 const L=G.LeaderAbilities,K=G.LeaderKalos,Z=L._z,wrap=G.LeaderSinnoh.wrap;
 const {actors,enemies,captain,own,state,budget,event,shield,synthetic,field,schedule,stun}=Z;
 const active=()=>L.active()&&L.definition(captain()?.dex)?.generation===7,has=p=>active()&&Z.team(p),f=()=>L.profile().alola||{},now=K.now;
 const s=()=>state().alola||={growth:0},q=p=>p.alolaState||={kills:0,engine:0},run=()=>G.Expedition.run;
 const ordinary=m=>!m.leaderGenerated&&!m.typeBondSecondary&&!m.kalosSecondary;
 const scope=p=>f().engineScope==='team'?actors():[p];
 const finalCrit=(p,n)=>has(p)&&f().critCap?Math.min(f().critCap,n):n;
 const primary=(p,m)=>Math.max(0,(m?.dmg||p.activeMove()?.dmg||1)*p.attackFor(m||p.activeMove()));
 function typed(p,e,n,type,damageClass='special'){const mult=K.clampType(p,type,e,G.Abilities.outgoingType(p,type,e.types));return Z.direct(p,e,n*mult*G.Weather.mult(type),type,{leaderGenerated:true,kalosSecondary:true,damageClass});}
 function extra(p,kind,m,n,opts={},angle=p.aim){synthetic(p,kind,{type:m.type||p.mon.types[0],damageClass:m.damageClass||'physical',dmg:primary(p,m)*n/Math.max(.01,p.attackFor(m)),...opts,kalosSecondary:true},angle);}
 function start(){if(!active())return;const growth=s().growth||0;state().alola={growth,fullTime:0,clinicEarned:false};for(const p of actors()){p.alolaState={kills:0,engine:0};if(f().openingShield)shield(p,p.maxHp*f().openingShield,run().wave?.duration||120);}if(f().openingRain)G.Weather.force('rain',f().openingRain);}
 function factor(p,key){if(!has(p))return 1;const a=f(),b=q(p),u=s();let n=1;
  if(key==='spa')n*=1+Math.min(a.killSpaCap||0,(a.killSpaScope==='team'?u.kills||0:b.kills||0)*(a.killSpa||0));
  if(key==='atk'&&p===captain())n*=1+(u.growth||0);
  if(key==='agility'&&a.engine)n*=1+Math.min(.3,b.engine*a.engine);
  if(['atk','agility'].includes(key)&&u.rodUntil>now())n*=1.25;
  if(a.download&&(key==='spa'&&u.download==='special'||key==='atk'&&u.download==='physical'))n*=1+a.download;
  if(a.missingPower&&['atk','spa','agility'].includes(key)&&(!a.lowPowerOnly||p.hp<p.maxHp*.4))n*=1+a.missingPower*(1-Math.max(0,p.hp/p.maxHp));
  if(key==='agility'&&K.s().buffUntil>now())n*=1+(K.s().agilityBuff||0);
  return n;
 }
 function rate(p,m){if(!has(p))return 1;const a=f(),b=q(p);let n=1;if(a.lowRangedCD&&p.hp<p.maxHp*.4&&!['melee','dash','buff'].includes(m.kind))n/=a.lowRangedCD;
  if(a.engineCD)n*=1+Math.min(.3,(b.engine||0)*(a.engine||0));if(a.killHaste)n*=1+Math.min(a.killHaste,(b.kills||0)*.01);return n;
 }
 function onCast(p,m){if(!has(p)||!ordinary(m))return;const a=f(),b=q(p);
  if(a.rockCannon&&m.kind==='dash'&&(b.dashes=(b.dashes||0)+1)%3===0)extra(p,'projectile',m,.6,{type:'rock',count:1,pierce:2,size:15});
  if(a.meleeStones&&m.kind==='melee')extra(p,'projectile',m,.1,{type:'rock',count:2,pierce:1,spread:.2});
  if(a.extraFists&&m.kind==='melee')schedule(.2,()=>{if(!p.dead)extra(p,'melee',m,a.extraFists,{radius:m.radius});});
  if(a.thunderFists&&m.kind==='melee'&&K.proc(p,'thunderFists',.5)){const list=G.EnemyMgr.queryCircle(p.x,p.y,250).slice(0,2);for(const e of list)typed(p,e,primary(p,m)*.4/Math.max(1,list.length),'electric');}
  if(a.buffShield&&m.kind==='buff'&&K.proc(p,'buffShield',.5))shield(p,p.maxHp*a.buffShield,5);
 }
 function hit(p,e,m,n,critical,shielded){if(!has(p)||!(n>0)||!ordinary(m))return;const a=f(),b=q(p);
  if(a.engine&&(m.type==='electric'||a.engineCrit&&critical))for(const ally of scope(p))q(ally).engine=Math.min(10,(q(ally).engine||0)+1);
  if(a.meleeCritBoost&&m.kind==='melee')b.critUntil=now()+3;
  if(a.echoHeal&&K.proc(p,'echoHeal',.5))schedule(.12,()=>{if(!e.dead)K.queue(p,p.maxHp*a.echoHeal);});
  if(a.shieldQuake&&shielded&&e.shield<=0&&K.proc(p,'shieldQuake',1))for(const foe of G.EnemyMgr.queryCircle(e.x,e.y,180))typed(p,foe,budget(p)*.1,'ground','physical');
  if(a.acidHits&&['cone','projectile','beam'].includes(m.kind)&&Math.random()<.1&&K.proc(p,'acid',.5)){
   field(p,'alolaAcid',e.x,e.y,90,3,budget(p)*.005,'poison',{poison:1,kalosSecondary:true});for(const foe of G.EnemyMgr.queryCircle(e.x,e.y,90)){foe.leaderArmor=.35;foe.leaderArmorUntil=now()+3;}}
 }
 function killed(e){if(!active()||!Z.team(e.lastAttacker))return;const a=f(),p=e.lastAttacker,b=q(p);b.kills++;s().kills=(s().kills||0)+1;
  if(a.download)s().download=e.defense>=e.spdef?'special':'physical';
  if(a.guzzlordGrowth&&p===captain()){s().growth=Math.min(.35,(s().growth||0)+a.guzzlordGrowth);if(Math.random()<a.devourPP)G.MovePP.add(p,p.moves,1);}
 }
 function hurt(p,n,type,src){if(!has(p)||!(n>0))return;const a=f();
  if(a.reflect&&['contact','melee'].includes(src.kind)&&src.enemy)typed(p,src.enemy,n*a.reflect,a.reflectType,'physical');
  if(a.contactLightning&&['contact','melee'].includes(src.kind)&&K.proc(p,'lightning',1)){const list=G.EnemyMgr.queryCircle(p.x,p.y,220).slice(0,a.contactLightning),m=p.activeMove();for(const e of list)typed(p,e,primary(p,m)*.3/Math.max(1,list.length),'electric');}
 }
 function tick(dt){if(!active()||run().phase!=='combat'||!(dt>0))return;const a=f(),u=s();
  if(a.clinic&&!u.clinicEarned){const all=actors();u.fullTime=all.length&&all.every(p=>!p.dead&&p.hp>=p.maxHp-1e-7)?(u.fullTime||0)+dt:0;if(u.fullTime>=10){u.clinicEarned=true;run().alolaClinic=(run().alolaClinic||0)+1;}}
  for(const p of actors()){if(p.dead)continue;const b=q(p);if(a.links&&b.engine>0&&K.proc(p,'link',1)){const e=G.Projectiles.nearest(enemies(),p.x,p.y,220);if(e)typed(p,e,budget(p)*.03,'electric');}
   if(a.statusShort?.includes('slow')&&p.slowT>(b.lastSlow||0)+1e-7)p.slowT*=a.statusFactor;b.lastSlow=p.slowT;
   if(a.statusShort?.includes('attack')&&p.attackDebuffT>(b.lastAttack||0)+1e-7)p.attackDebuffT*=a.statusFactor;b.lastAttack=p.attackDebuffT;
  }
 }
 function shards(p){const a=f().shieldShards;if(!a||!K.proc(p,'shards',2))return;const m=p.activeMove();extra(p,'nova',m,.1,{count:a.count,type:a.type});}
 wrap('beginBattle',old=>{old();start();});wrap('factor',(old,p,key)=>old(p,key)*factor(p,key));wrap('rate',(old,p,m)=>old(p,m)*rate(p,m));
 wrap('move',(old,p,m)=>{const n=old(p,m);if(has(p)&&f().waterRange&&['projectile','aura'].includes(m.kind)&&m.type==='water'&&p.hp>p.maxHp*.85){if(n.radius)n.radius*=f().waterRange;if(n.life)n.life*=f().waterRange;}if(has(p)&&f().waterSize&&m.kind==='projectile'&&m.type==='water')n.size=(n.size||8)*f().waterSize;return n;});
 wrap('crit',(old,p,m,e)=>{let n=old(p,m,e);if(!has(p))return n;const a=f();if(a.burnCrit&&e?.burn>0&&(!a.burnCritKinds||a.burnCritKinds.includes(m.kind)))n+=a.burnCrit;if(a.physicalCrit&&m.damageClass==='physical')n+=a.physicalCrit;if(a.movingCritPenalty&&own(p).stationary<.1)n-=a.movingCritPenalty;return n;});
 wrap('critMultiplier',(old,p,m,e)=>Math.max(old(p,m,e),has(p)?Math.max(0,(q(p).critUntil>now()?f().meleeCritBoost||1.5:1.5)-1.5,(['melee','dash'].includes(m?.kind)?f().meleeDashCritMul||1.5:1.5)-1.5):0));
 wrap('penetration',(old,p,e,m)=>Math.min(.6,old(p,e,m)+(has(p)&&ordinary(m)&&m.kind==='melee'?f().meleePenetration||0:0)));

 wrap('incoming',(old,p,n,type,src)=>{if(!has(p))return old(p,n,type,src);const a=f(),before=own(p).shield||0,raw=G.Types.mult(type,p.mon.types),extra=L.profile().incomingTypes?.[type]||1;
  if(type==='water'&&a.waterAbsorb&&n>0&&raw>0){const v=a.waterAbsorb,oldFactor=Math.max(.3,Math.min(2.4,raw*extra)),ratio=v.final? v.final/oldFactor:v.factor;const reduced=n*ratio;event('absorb',Math.max(0,n-reduced));K.queue(p,p.maxHp*v.heal);n=reduced;}
  if(a.lowWeak&&p.hp<p.maxHp*.4)n*=a.lowWeak[type]||1;
  if(a.highHpReduction&&p.hp>=p.maxHp*a.highHpThreshold)n*=1-a.highHpReduction;
  const result=old(p,n,type,src);if(before>0&&own(p).shield<=0)shards(p);return result;});
 wrap('beforeHurt',(old,p,type,src)=>{const at=has(p)?own(p).parryAt:0,result=old(p,type,src);if(has(p)){const a=f();if(a.rodTeam&&!result&&type==='electric')s().rodUntil=now()+4;if(a.parryRage&&own(p).parryAt!==at)own(p).hurtUntil=now()+3;}return result;});
 for(const [key,fn]of Object.entries({onCast,hit,killed,hurt,tick}))wrap(key,(old,...args)=>{old(...args);fn(...args);});
 wrap('enemyTick',(old,e,dt)=>{old(e,dt);if(active()&&f().sandWeaken&&Math.hypot(e.x-captain().x,e.y-captain().y)<250){e.leaderDamage=.8;e.leaderDamageUntil=now()+.2;}});
 const oldStatus=G.ActorStatus.apply;G.ActorStatus.apply=(p,kind,dur=3,...args)=>{const result=oldStatus(p,kind,has(p)&&f().statusShort?.includes(kind)?dur*f().statusFactor:dur,...args);if(has(p)){q(p).lastSlow=p.slowT;q(p).lastAttack=p.attackDebuffT;}return result;};
 const oldXp=G.Economy.buyXp;G.Economy.buyXp=r=>{const ok=oldXp(r);if(ok&&active()&&f().xpRebate&&r===run()&&r.alolaRebateVisit!==(r.alolaShopVisit||0)){r.alolaRebateVisit=r.alolaShopVisit||0;r.gold+=f().xpRebate;}return ok;};
 const oldShop=G.HoennMarket.enterShop;G.HoennMarket.enterShop=(r,offers)=>{oldShop(r,offers);if(!active()||r!==run())return;r.alolaShopVisit=(r.alolaShopVisit||0)+1;if(r.alolaClinic){r.shopFreeRefreshes=(r.shopFreeRefreshes||0)+r.alolaClinic;r.alolaClinic=0;}};
 return {active,has,f,s,q,now,finalCrit,primary,typed,extra,trapImmune:p=>has(p)&&!!f().trapImmune};
})();
