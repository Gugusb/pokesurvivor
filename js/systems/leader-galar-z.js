/* Reviewed manual Z geometry, sharing the established scheduling and target budgets. */
(()=>{
 const L=G.LeaderAbilities,K=G.LeaderKalos,Z=L._z,{actors,enemies,captain,budget,synthetic,schedule,pull,stun}=Z;
 const custom=new Set(['missile','targetBlast','doubleRush','multiMelee','scatter','teamFetch','fireLash','targetField','darts']);
 const reused=new Set(['nova','rush','rushNova','beam','melee','field','meteor','support']);
 const strike=(p,e,power,a)=>G.LeaderKalosZ.strike(p,e,power,a.types,a);
 function area(p,x,y,r,power,a){G.FX.ring(x,y,8,r,G.U.TYPE_COLOR[a.types[0]]||'#d8f4ff',.45,4);for(const e of G.EnemyMgr.queryCircle(x,y,r)){strike(p,e,power,a);if(a.pull&&!e.boss)pull(e,x,y,a.pull);}}
 function utility(p,a){G.LeaderAlolaZ.execute(p,{active:{...a,shape:'support',power:0,stun:0,slow:0,radius:0}});}
 function projectileHit(p,e,m){const payload=m?.galarPayload;if(!G.LeaderGalar.has(p)||!payload||m.galarImpacted)return;m.galarImpacted=true;for(const type of payload.impactTypes||[])strike(p,e,payload.impactPower,{...payload,types:[type]});area(p,e.x,e.y,payload.radius,payload.power,payload);}
 function emit(p,a,power,angle,type,extra={}){const cls=a.damageClass||p.activeMove()?.damageClass||'special';synthetic(p,'projectile',{type,damageClass:cls,dmg:budget(captain())*power/Math.max(.01,p.attackFor({damageClass:cls})),count:1,size:18,speed:650,life:2,homing:2,phaseWalls:true,pierce:0,kalosZ:true,zCrit:!!a.critical,leaderStun:a.stun||0,...extra},angle);}
 function execute(p,d){const a=d.active,start={x:p.x,y:p.y},angle=p.aim;
  if(a.snow)G.Weather.force('snow',a.snow);
  if(reused.has(a.shape)){G.LeaderAlolaZ.execute(p,d);return;}
  utility(p,a);
  if(a.shape==='missile'){
   const e=enemies().sort((a,b)=>b.hp-a.hp)[0],aim=e?Math.atan2(e.y-p.y,e.x-p.x):angle;
   const impactPower=a.power*.2/a.types.length;emit(p,a,impactPower,aim,a.types[0],{size:27,galarPayload:{...a,power:a.power*.8,impactPower,impactTypes:a.types.slice(1)}});
  }else if(a.shape==='darts'){
   for(let i=0;i<a.count;i++)emit(p,a,a.power/a.count,angle+(i-(a.count-1)/2)*.15,a.types[i%a.types.length]);
  }else if(a.shape==='targetBlast'){
   const e=enemies().sort((a,b)=>b.hp-a.hp)[0],x=e?.x??p.x,y=e?.y??p.y;
   G.FX.beam(x,y-220,Math.PI/2,220,40,G.U.TYPE_COLOR[a.types[0]],G.VFX.forType(a.types[0]));area(p,x,y,a.radius,a.power,a);
  }else if(a.shape==='doubleRush'){
   G.LeaderKalosZ.execute(p,{active:{...a,shape:'rush',power:a.power/2,continuation:true}});
   schedule(.18,()=>{const aim=p.aim;p.aim=angle+Math.PI;try{G.LeaderKalosZ.execute(p,{active:{...a,shape:'rush',power:a.power/2,continuation:true}});}finally{p.aim=aim;}});
  }else if(a.shape==='multiMelee'){
   for(let i=0;i<a.count;i++)schedule(i*.15,()=>{G.FX.ring(start.x,start.y,15,a.range,G.U.TYPE_COLOR[a.types[i%a.types.length]],.25,3);for(const e of enemies()){const dx=e.x-start.x,dy=e.y-start.y,off=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)));if(Math.hypot(dx,dy)<=a.range+e.r&&off<=(a.arc||Math.PI)/2)strike(p,e,a.power/a.count,{...a,damageClass:'physical'});}});
  }else if(a.shape==='scatter'){
   for(let i=0;i<a.count;i++){const angle=i*Math.PI*2/a.count,x=p.x+Math.cos(angle)*a.spreadRadius,y=p.y+Math.sin(angle)*a.spreadRadius;schedule(i*.04,()=>area(p,x,y,a.radius,a.power/a.count,a));}
  }else if(a.shape==='teamFetch'){
   const team=actors().filter(p=>!p.dead),targets=enemies().slice(0,4);
   for(const ally of team)G.LeaderKalosZ.execute(ally,{active:{...a,shape:'boomerang',continuation:true,power:a.power*.7/Math.max(1,team.length),returnStun:a.stun,stun:0}});
   for(const e of targets)strike(p,e,a.power*.3/Math.max(1,targets.length),a);
  }else if(a.shape==='fireLash'){
   area(p,p.x,p.y,a.range,a.power*.7,a);
   for(let i=0;i<5;i++){const angle=i*Math.PI*2/5,x=p.x+Math.cos(angle)*150,y=p.y+Math.sin(angle)*150;for(let tick=0;tick<6;tick++)schedule(tick*.5,()=>area(p,x,y,90,a.power*.3/5/6,a));}
  }else if(a.shape==='targetField'){
   const e=enemies().sort((a,b)=>b.hp-a.hp)[0],x=e?.x??p.x,y=e?.y??p.y,steps=Math.ceil(a.duration/.5);
   for(let i=0;i<steps;i++)schedule(i*.5,()=>area(p,x,y,a.radius,a.power/steps,a));
  }
 }
 let installed=false;function install(){if(installed)return;const handlers={},timings={};for(const d of G.LeaderAbilitiesConfig.families.filter(d=>d.generation===8)){if(!custom.has(d.active.shape)&&!reused.has(d.active.shape))throw Error('Unreviewed Galar Z '+d.root);handlers[d.active.kind]=p=>execute(p,d);timings[d.active.kind]=Math.max(4,d.active.duration||0);}if(Object.keys(handlers).length!==44)throw Error('Expected 44 Galar Z configurations');L.registerZ(handlers,timings);installed=true;}
 G.LeaderGalarZ={install,execute,projectileHit};if(G.LeaderAbilitiesConfig)install();else G.LeaderAbilitiesReady=G.LeaderAbilitiesReady.then(config=>{install();return config;});
})();
