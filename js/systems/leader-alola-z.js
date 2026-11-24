/* Reviewed Alola bursts compose the existing scheduler, typed strikes and projectiles. */
(()=>{
 const A=G.LeaderAlola,K=G.LeaderKalos,L=G.LeaderAbilities,Z=L._z;
 const {actors,enemies,captain,budget,shield,schedule,pull,stun}=Z;
 const basic=new Set(['projectile','boomerang','nova','delayedNova','support','rush','melee','beam','cone','targets','field','targetNova','beamNova']);
 const special=new Set(['meteor','poisonNova','teamBoomerang','painPurge','rushNova','anchor','percentNova','astralRush','devourNova','meleeChain']);
 function execute(p,d){const a=d.active,types=a.types,start={x:p.x,y:p.y},t=K.now();
  if(a.captainCost)p.hp=Math.max(1,p.hp*(1-a.captainCost));if(a.sun)G.Weather.force('sun',a.sun);
  if(a.supplies)for(let i=0;i<Math.min(3,a.supplies);i++)K.supply(p,'fruit',true);
  if(basic.has(a.shape)){
   G.LeaderKalosZ.execute(p,d);
   if(a.agilityBuff){K.s().agilityBuff=a.agilityBuff;K.s().buffUntil=t+(a.duration||5);}
   return;
  }
  // Apply utility once; custom geometry below owns the one damage allocation.
  G.LeaderKalosZ.execute(p,{active:{...a,shape:'support',power:0,stun:0,slow:0,radius:0}});
  const strike=(owner,e,power=a.power,more={})=>{if(a.detonateStatuses){const both=e.burn>0&&e.poison>0;power*=both?1:.8;if(both){e.burn=0;e.poison=0;G.FX.ring(e.x,e.y,10,80,'#d48acf',.3,4);}}return G.LeaderKalosZ.strike(owner,e,power,types,{...a,...more});};
  const list=(x,y,r)=>G.EnemyMgr.queryCircle(x,y,r).filter(e=>!e.dead);
  const area=(x,y,r,power,more={})=>{G.FX.ring(x,y,8,r,G.U.TYPE_COLOR[types[0]],.45,4);let n=0;for(const e of list(x,y,r)){n+=strike(p,e,power,more);if(a.pull&&!e.boss)pull(e,x,y,a.pull);}return n;};
  if(a.shape==='meteor'){
   const targets=enemies(),count=a.count||8;
   for(let i=0;i<count;i++){const e=targets[i%Math.max(1,targets.length)],x=e?.x??start.x+Math.cos(i*2.4)*150,y=e?.y??start.y+Math.sin(i*2.4)*150;
    G.FX.ring(x,y,4,a.radius,'#f7c879',.8,2);schedule(.6+i*.06,()=>{G.FX.beam(x,y-260,Math.PI/2,260,35,G.U.TYPE_COLOR[types[i%types.length]],G.VFX.forType(types[0]));area(x,y,a.radius,a.power/count);});}
  }else if(['poisonNova','percentNova','devourNova'].includes(a.shape)){
   G.FX.ring(p.x,p.y,8,a.radius||Z.screenRadius(),G.U.TYPE_COLOR[types[0]],.5,5);let damage=0;
   for(const e of list(p.x,p.y,a.radius||Z.screenRadius())){if(a.poisonOnly&&!(e.poison>0))continue;
    const hpPart=a.missingPercent?(e.maxHp-e.hp)*a.missingPercent:e.hp*(a.percent||0);
    damage+=strike(p,e,a.power+hpPart/Math.max(1,budget(p)));if(a.pull&&!e.boss)pull(e,p.x,p.y,a.pull);}
   if(a.damageHeal)for(const ally of actors())K.queue(ally,damage*a.damageHeal/Math.max(1,actors().length));
  }else if(a.shape==='painPurge'){
   let pain=0;for(const ally of actors()){const b=Z.own(ally),n=Math.max(0,b.pain||0);pain+=n;b.pain=0;b.painRate=0;if(n)K.queue(ally,n*a.painHeal);}
   area(p.x,p.y,Z.screenRadius(),a.power+Math.min(budget(p),pain)/Math.max(1,budget(p)),{trueDamage:true});
  }else if(a.shape==='teamBoomerang'){
   const team=actors().filter(v=>!v.dead);for(const ally of team)G.LeaderKalosZ.execute(ally,{active:{...a,shape:'boomerang',continuation:true,power:a.power/Math.max(1,team.length),returnStun:a.stun,stun:0}});
  }else if(a.shape==='anchor'){
   const e=enemies().sort((a,b)=>b.hp-a.hp)[0],x=e?.x??p.x,y=e?.y??p.y;area(x,y,a.radius,a.power);
  }else if(a.shape==='astralRush'||a.shape==='rushNova'){
   G.LeaderKalosZ.execute(p,{active:{...a,shape:a.shape==='astralRush'?'beam':'rush',continuation:true,power:a.power*.65,shield:0,heal:0}});
   area(p.x,p.y,a.radius||220,a.power*.35);
  }else if(a.shape==='meleeChain'){
   const targets=enemies().slice(0,a.count);for(const [i,e]of targets.entries())schedule(i*.08,()=>{if(e.dead)return;G.FX.beam(p.x,p.y,Math.atan2(e.y-p.y,e.x-p.x),Math.hypot(e.x-p.x,e.y-p.y),12,'#fce67b',G.VFX.forType('electric'));strike(p,e,a.power/Math.max(1,targets.length));});
  }
 }
 let installed=false;function install(){if(installed)return;const handlers={},timings={};for(const d of G.LeaderAbilitiesConfig.families.filter(v=>v.generation===7)){
  if(!basic.has(d.active.shape)&&!special.has(d.active.shape))throw Error('Unreviewed Alola Z '+d.root);
  handlers[d.active.kind]=p=>execute(p,d);timings[d.active.kind]=Math.max(4,d.active.duration||0,d.active.delay||0);
 }if(Object.keys(handlers).length!==54)throw Error('Expected 54 Alola Z configurations');L.registerZ(handlers,timings);installed=true;}
 G.LeaderAlolaZ={install,execute};if(G.LeaderAbilitiesConfig)install();else G.LeaderAbilitiesReady=G.LeaderAbilitiesReady.then(config=>{install();return config;});
})();
