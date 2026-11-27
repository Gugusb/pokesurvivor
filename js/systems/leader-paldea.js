/* Paldea-only adaptations; shared heals, echoes, shields and Z budgets remain shared. */
G.LeaderPaldea=(()=>{
 const L=G.LeaderAbilities,K=G.LeaderKalos,A=G.LeaderAlola,Z=L._z,wrap=G.LeaderSinnoh.wrap;
 const {actors,enemies,captain,own,budget,field}=Z,now=K.now;
 const active=()=>L.active()&&L.definition(captain()?.dex)?.generation===9,has=p=>active()&&Z.team(p),f=()=>L.profile()?.paldea||{};
 const ordinary=m=>m&&!m.leaderGenerated&&!m.typeBondSecondary&&!m.kalosSecondary;
 const ps=p=>p.paldeaState||={lx:p.x,ly:p.y,trailWait:0,wasBurrow:false};
 function factor(p,key){
  if(!has(p))return 1;const a=f();let n=1;
  if(key==='spa'){
   if(a.hurtSpa&&own(p).hurtUntil>now())n*=1+a.hurtSpa/(1+(L.profile().stats?.spa||0));
   if(K.s().spaBuffUntil>now())n*=1+(K.s().spaBuff||0);
  }
  if(key==='spd'&&L.profile().flyingSpeed&&own(p).dashUntil>now())n*=1+L.profile().flyingSpeed;
  return n;
 }
 function outgoing(p,e,m){
  if(!has(p)||m.kalosSettled)return 1;const a=f();
  if(a.sunWaterSafe&&G.Weather.current?.kind==='sun'&&m.type==='water')return 1/Math.max(.1,G.Weather.mult('water'));
  return 1;
 }
 function rate(p,m){
  if(!has(p))return 1;const a=f();
  if(a.weatherHaste&&a.weatherHaste.kinds.includes(G.Weather.current?.kind))return 1+a.weatherHaste.rate;
  return 1;
 }
 function crit(p,m){
  if(!has(p))return 0;const a=f();
  return a.specialCrit&&(m?.damageClass==='special'||m?.kind==='beam')?a.specialCrit:0;
 }
 function penetration(p,e,m){
  return has(p)&&ordinary(m)&&m.kind==='dash'?f().dashPenetration||0:0;
 }
 function hit(p,e,m,n){
  if(!has(p)||!ordinary(m)||!(n>0))return;const a=f();
  if(a.iceSlow&&m.type==='ice')e.applySlow(a.iceSlow,1.5);
 }
 function tick(dt){
  if(!active()||!(dt>0))return;const a=f(),cp=captain();
  if(a.linksNearCaptain)for(const p of actors())if(p!==cp&&!p.dead&&Math.hypot(p.x-cp.x,p.y-cp.y)<=220&&K.proc(p,'paldeaLink',1)){const e=G.Projectiles.nearest(enemies(),p.x,p.y,200);if(e)A.typed(p,e,budget(p)*.03,'electric');}
  if(a.snowHeal&&G.Weather.current?.kind==='snow')for(const p of actors())if(!p.dead)K.queue(p,p.maxHp*a.snowHeal*dt);
  for(const p of actors()){
   const b=ps(p),dist=Math.hypot(p.x-b.lx,p.y-b.ly);b.lx=p.x;b.ly=p.y;
   if(a.poisonTrail&&!p.dead&&dist>1){b.trailWait-=dt;if(b.trailWait<=0){b.trailWait=.5;field(p,'paldeaPoisonTrail',p.x,p.y,50,2,budget(p)*.025,'poison',{poison:1,slow:a.poisonTrailSlow||0,kalosSecondary:true});}}
   if(a.burrowDebuff&&p===cp){const burrowing=own(p).burrowUntil>now();if(b.wasBurrow&&!burrowing)for(const e of G.EnemyMgr.queryCircle(p.x,p.y,220)){e.leaderDamage=Math.min(e.leaderDamage||1,1-a.burrowDebuff);e.leaderDamageUntil=now()+3;}b.wasBurrow=burrowing;}
  }
 }
 function weatherImmune(p){return has(p)&&!!(f().weatherImmune===true||f().weatherImmune===G.Weather.current?.kind);}
 function shieldBypass(p,m){return has(p)&&!!f().meleeShieldBypass&&m.kind==='melee'&&ordinary(m);}
 wrap('beginBattle',old=>{old();if(active())for(const p of actors())p.paldeaState={lx:p.x,ly:p.y,trailWait:0,wasBurrow:false};});
 wrap('factor',(old,p,key)=>old(p,key)*factor(p,key));
 wrap('outgoing',(old,p,e,m)=>old(p,e,m)*outgoing(p,e,m));
 wrap('rate',(old,p,m)=>old(p,m)*rate(p,m));
 wrap('crit',(old,p,m,e)=>old(p,m,e)+crit(p,m));
 wrap('penetration',(old,p,e,m)=>Math.min(.6,old(p,e,m)+penetration(p,e,m)));
 wrap('ppCost',(old,p,m,n)=>{const v=old(p,m,n);return has(p)&&f().minPPCost&&n>0?Math.max(f().minPPCost,v):v;});
 wrap('hit',(old,...args)=>{old(...args);hit(...args);});
 wrap('tick',(old,dt)=>{old(dt);if(dt>0&&G.Expedition.run?.phase==='combat')tick(dt);});
 wrap('rescue',(old,p)=>{const ok=old(p);if(ok&&has(p)&&f().rescueDashReset)for(const m of p.moves)if(m.kind==='dash')m.t=0;return ok;});
 wrap('beforeHurt',(old,p,type,src)=>!(has(p)&&src.kind==='weather'&&weatherImmune(p))&&old(p,type,src));
 return {active,has,f,weatherImmune,shieldBypass};
})();
