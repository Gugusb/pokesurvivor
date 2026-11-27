/* Reviewed Paldea manual Z geometry, sharing the established scheduling and target budgets. */
(()=>{
 const L=G.LeaderAbilities,K=G.LeaderKalos,Z=L._z,{actors,enemies,captain,own,budget,synthetic,schedule,pull,stun}=Z;
 const custom=new Set(['multiMissile','torchSong','beamMelee','fireCross','tripleDive','poisonDetonate','screenWard','quadMask','teraStarstorm']);
 const galarShapes=new Set(['multiMelee','scatter','fireLash']);
 const alolaShapes=new Set(['nova','rush','rushNova','beam','melee','cone','field','targets','meleeChain','support','beamNova']);
 const strike=(p,e,power,a,types=a.types)=>G.LeaderKalosZ.strike(p,e,power,types,a);
 function area(p,x,y,r,power,a,types=a.types){G.FX.ring(x,y,8,r,G.U.TYPE_COLOR[types[0]]||'#d8f4ff',.45,4);let total=0;for(const e of G.EnemyMgr.queryCircle(x,y,r)){total+=strike(p,e,power,a,types);if(a.pull&&!e.boss)pull(e,x,y,a.pull);if(a.knock&&!e.boss)pull(e,x,y,-a.knock);}return total;}
 function utility(p,a){G.LeaderAlolaZ.execute(p,{active:{...a,shape:'support',power:0,stun:0,slow:0,radius:0}});}
 function emit(p,a,power,angle,type,extra={}){const cls=a.damageClass||p.activeMove()?.damageClass||'special';synthetic(p,'projectile',{type,damageClass:cls,dmg:budget(captain())*power/Math.max(.01,p.attackFor({damageClass:cls})),count:1,size:20,speed:620,life:2.2,homing:2.2,phaseWalls:true,pierce:0,kalosZ:true,zCrit:!!a.critical,leaderStun:a.stun||0,...extra},angle);}
 function projectileHit(p,e,m){
  const payload=m?.paldeaPayload;if(!G.LeaderPaldea.has(p)||!payload||m.paldeaImpacted)return;m.paldeaImpacted=true;
  for(const type of payload.impactTypes||[])strike(p,e,payload.impactPower,payload,[type]);
  area(p,e.x,e.y,payload.radius,payload.power,payload);
 }
 function execute(p,d){
  const a=d.active,start={x:p.x,y:p.y},angle=p.aim;
  if(a.snow)G.Weather.force('snow',a.snow);
  if(a.spaBuff){K.s().spaBuff=a.spaBuff;K.s().spaBuffUntil=K.now()+(a.buffDuration||a.duration||5);}
  if(a.postExposure){own(p).dashUntil=0;own(p).dashEnd=K.now()+a.postExposure;}
  if(galarShapes.has(a.shape)){G.LeaderGalarZ.execute(p,d);return;}
  if(alolaShapes.has(a.shape)){
   if(G.LeaderPaldea.f().sunWaterSafe&&G.Weather.current?.kind==='sun'&&a.types.includes('water')){
    const mult=Math.max(.1,G.Weather.mult('water')),waterShare=a.types.filter(t=>t==='water').length/a.types.length,scale=1/(1-waterShare+waterShare*mult);
    G.LeaderAlolaZ.execute(p,{...d,active:{...a,power:a.power*scale}});
    return;
   }
   G.LeaderAlolaZ.execute(p,d);return;
  }
  utility(p,a);
  if(a.shape==='multiMissile'){
   const list=enemies().sort((x,y)=>y.hp-x.hp),count=a.count||3,each=a.power/count;
   for(let i=0;i<count;i++){
    const e=list[i%Math.max(1,list.length)],aim=e?Math.atan2(e.y-p.y,e.x-p.x):angle+(i-(count-1)/2)*.35;
    const impactPower=each*.2/a.types.length;
    schedule(i*.08,()=>emit(p,a,impactPower,aim,a.types[i%a.types.length],{size:24,paldeaPayload:{...a,power:each*.8,impactPower,impactTypes:a.types.slice(1)}}));
   }
  }else if(a.shape==='torchSong'){
   const waves=a.count||3;
   for(let i=0;i<waves;i++)schedule(i*.2,()=>{
    G.LeaderKalosZ.execute(p,{active:{...a,shape:'cone',continuation:true,count:1,power:a.power*.6/waves,range:a.range||420,shield:0,heal:0}});
    area(p,p.x,p.y,a.radius||220,a.power*.4/waves,a);
   });
  }else if(a.shape==='beamMelee'){
   let total=0;
   G.LeaderKalosZ.execute(p,{active:{...a,shape:'beam',continuation:true,count:1,width:65,range:a.range||500,power:a.power*.4,shield:0,heal:0,damageHeal:a.damageHeal||0}});
   for(let i=0;i<3;i++)schedule(.12+i*.14,()=>{
    total+=area(p,p.x,p.y,a.meleeRange||260,a.power*.2,a);
    if(i===2&&a.damageHeal&&total)for(const ally of actors())K.queue(ally,total*a.damageHeal/Math.max(1,actors().length));
   });
  }else if(a.shape==='fireCross'){
   const hasLead=!!(a.coneRange||a.beamWidth),fieldPower=a.power*(hasLead?.6:1);
   if(a.coneRange)G.LeaderKalosZ.execute(p,{active:{...a,shape:'cone',continuation:true,count:1,range:a.coneRange,power:a.power*.4,shield:0,heal:0}});
   else if(a.beamWidth)G.LeaderKalosZ.execute(p,{active:{...a,shape:'beam',continuation:true,count:1,width:a.beamWidth,power:a.power*.4,shield:0,heal:0}});
   const e=enemies().sort((x,y)=>y.hp-x.hp)[0],cx=e?.x??(start.x+Math.cos(angle)*180),cy=e?.y??(start.y+Math.sin(angle)*180);
   const steps=Math.max(1,Math.ceil((a.duration||4)/.5)),spots=[[0,0],[-100,0],[100,0],[0,-100],[0,100]];
   for(let tick=0;tick<steps;tick++)schedule(tick*.5,()=>{for(const [dx,dy]of spots)area(p,cx+dx,cy+dy,a.radius||90,fieldPower/spots.length/steps,a);});
  }else if(a.shape==='tripleDive'){
   const waves=a.waves||3;
   for(let i=0;i<waves;i++)schedule(i*.25,()=>G.LeaderKalosZ.execute(p,{active:{...a,shape:'cone',continuation:true,count:3,range:a.range||440,power:a.power/waves,guard:0,shield:0,heal:0}}));
  }else if(a.shape==='poisonDetonate'){
   const baseShape=a.baseShape||'nova';
   G.LeaderAlolaZ.execute(p,{...d,active:{...a,shape:baseShape,continuation:true,power:a.power*.75,clear:false,shield:0,heal:0}});
   schedule(.15,()=>{for(const e of enemies())if(e.poison>0){G.FX.ring(e.x,e.y,6,85,'#b96cf0',.35,3);strike(p,e,a.power*.25,a);}});
  }else if(a.shape==='screenWard'){
   G.FX.ring(p.x,p.y,12,Z.screenRadius(),'#f7b8e6',.6,5);
   for(const e of enemies())if(a.nonBossStun&&!e.boss)stun(e,a.nonBossStun);
  }else if(a.shape==='quadMask'){
   const masks=['grass','fire','water','rock'];
   for(let i=0;i<4;i++)schedule(i*.14,()=>area(p,p.x,p.y,a.range||260,a.power/4,a,[masks[i]]));
  }else if(a.shape==='teraStarstorm'){
   const waves=a.waves||6;
   for(let i=0;i<waves;i++)schedule(i*.13,()=>{
    if(i%2===0)G.LeaderKalosZ.execute(p,{active:{...a,shape:'beam',continuation:true,count:3,width:a.width||50,power:a.power/waves,shield:0,heal:0}});
    else area(p,p.x,p.y,a.radius||280,a.power/waves,a);
   });
  }
 }
 let installed=false;
 function install(){
  if(installed)return;
  const handlers={},timings={};
  for(const d of G.LeaderAbilitiesConfig.families.filter(v=>v.generation===9)){
   if(!custom.has(d.active.shape)&&!galarShapes.has(d.active.shape)&&!alolaShapes.has(d.active.shape))throw Error('Unreviewed Paldea Z '+d.root+' '+d.active.shape);
   handlers[d.active.kind]=p=>execute(p,d);
   timings[d.active.kind]=Math.max(4,d.active.duration||0);
  }
  if(Object.keys(handlers).length!==52)throw Error('Expected 52 Paldea Z configurations, got '+Object.keys(handlers).length);
  L.registerZ(handlers,timings);installed=true;
 }
 G.LeaderPaldeaZ={install,execute,projectileHit};
 if(G.LeaderAbilitiesConfig)install();else G.LeaderAbilitiesReady=G.LeaderAbilitiesReady.then(config=>{install();return config;});
})();
