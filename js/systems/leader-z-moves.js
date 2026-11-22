/* One explicit dispatch per design. All attacks use the existing hit/collision
 * pipeline; battlefield controls use the same boss-half-duration rule. */
(()=>{
 const L=G.LeaderAbilities,Z=L._z;
 const {actors,enemies,captain,state,profile,definition,own,screenRadius,shield,healTeam,stun,vulnerable,pull,clearShots,direct,blast,percent,budget,field,schedule,synthetic}=Z;
 const durations={furyFang:4,tyrantBarrage:3,petalDance:5,butterflyBeam:4,rageFists:4,flameGallop:3,shellSmash:5,harvest:4,parentFury:4,quantumEcho:4,dataOverflow:3,scytheDance:2,bellyDrum:6,outrage:5,genesis:4,psychicStop:2,blizzard:2.5};
 const mPower=(p,n)=>n/Math.max(1,Math.max(p.atk,p.spa));
 function aimAt(p,e){return e?Math.atan2(e.y-p.y,e.x-p.x):p.aim;}
 function line(p,kind,n,{angle=p.aim,...mods}={}){synthetic(p,kind,{dmg:mPower(p,n),radius:screenRadius()*2,width:55,count:1,speed:600,life:2.5,phaseWalls:true,...mods},angle);}
 function allControl(seconds,opts={}){for(const e of enemies()){if(!opts.noBoss||!e.boss)stun(e,seconds);if(opts.slow)e.applySlow(opts.slow,3);if(opts.weak){e.leaderDamage=.7;e.leaderDamageUntil=state().time+3;}if(opts.pull)pull(e,captain().x,captain().y,opts.pull);}}
 const handlers={
  toxicBloom(c,f){let count=0;for(const p of actors().filter(p=>p.moves.some(m=>m.kind==='aura'))){const r=L.move(p,p.moves.find(m=>m.kind==='aura')).radius||180;for(const e of G.EnemyMgr.queryCircle(p.x,p.y,r)){e.applyPoison(3,c);direct(c,e,budget(c)*.15,'poison');count++;}}healTeam(Math.min(.3,count*.03),true);if(f.pollen){field(c,'pollen',c.x,c.y,180,10,budget(c)*.01,'grass',{poison:1});for(const p of actors())own(p).pollenUntil=state().time+10;}},
  giantCone(c,f){for(const p of actors())line(p,'cone',budget(p)*.65,{count:12,speed:700,life:1.7,spread:.12,size:10,knock:200});if(f.wallExplosion)for(const e of enemies())if(!e.boss&&Math.hypot(e.x-c.x,e.y-c.y)>screenRadius()*.7)blast(c,e.x,e.y,85,budget(c)*.15,'fire',{knock:150});},
  tripleBeam(c,f){for(const p of actors())for(const a of [-.13,0,.13])line(p,'beam',budget(p)*.24,{angle:p.aim+a,width:50,zCrit:true,type:'water',leaderStun:1.5});if(f.beamVulnerable)for(const e of enemies().filter(e=>e.boss||e.elite)){vulnerable(e,f.beamVulnerable,3);stun(e,3);}},
  overcharge(c,f){const e=enemies().sort((a,b)=>b.hp-a.hp)[0],x=e?.x??c.x,y=e?.y??c.y;blast(c,x,y,screenRadius(),budget(c)*.65*(f.overchargeFocus?1.3:1),'electric',{slow:.6});},
  sleepPollen(c){field(c,'pollen',c.x,c.y,250,3,budget(c)*.045,'bug',{stun:2,poison:1,vulnerable:.2});},
  twinSting(c,f){for(const p of actors())for(let i=0;i<2;i++)schedule(i*.15,()=>line(p,'melee',budget(p)*.3,{radius:240,arc:1.5,type:'bug',zCrit:true}));let executed=false;for(const e of enemies())if(Math.hypot(e.x-c.x,e.y-c.y)<=240){if(!e.boss&&!e.elite&&e.hp/e.maxHp<(f.executeThreshold||.3)){direct(c,e,e.hp+e.shield+1,'bug');executed=true;}else if(e.boss||e.elite)direct(c,e,budget(c)*.3,'bug');}if(executed)for(const p of actors())for(const m of p.moves)m.t=0;},
  stormBlades(c){for(const p of actors())for(const off of [-.2,.2])line(p,'boomerang',budget(p)*.18,{angle:p.aim+off,speed:500,radius:600,width:40,size:18,count:1});field(c,'vortex',c.x+Math.cos(c.aim)*250,c.y+Math.sin(c.aim)*250,180,3,budget(c)*.025,'flying',{pull:100});clearShots();},
  furyFang(){},
  drillWind(c,f){for(const p of actors()){line(p,'dash',budget(p)*.55,{radius:650,width:70,speed:900,type:'flying',knock:200});field(p,'wind',p.x,p.y,180,3,budget(p)*.04,'flying',{slow:.5});}if(f.drillBreak)for(const e of enemies().filter(e=>Math.hypot(e.x-c.x,e.y-c.y)<450)){e.shield=0;if(e.boss)direct(c,e,budget(c)*.2,'flying');}},
  acidSerpents(c){clearShots();for(const e of enemies()){vulnerable(e,.25,4);e.applyPoison(2,c);}for(const p of actors())line(p,'nova',budget(p)*.12,{type:'poison',count:16,pierce:3,speed:360,size:9});},
  earthSplit(c){line(c,'beam',budget(c)*.6,{type:'ground',width:100,knock:150,leaderStun:1.5});for(const e of enemies())if(Math.hypot(e.x-c.x,e.y-c.y)<650){e.leaderArmor=.4;e.leaderArmorUntil=state().time+3;pull(e,c.x+Math.cos(c.aim)*240,c.y+Math.sin(c.aim)*240,150);}},
  motherBarrier(c){for(const p of actors())shield(p,p.maxHp*.2,5);G.FX.ring(c.x,c.y,40,screenRadius(),'#cb9bed',.7,8);},
  tyrantBarrage(){},
  foxFire(c,f){for(let i=0;i<3;i++)line(c,'projectile',budget(c)*.25,{angle:c.aim+(i-1)*.6,type:'fire',speed:240*(f.foxSpeed||1),homing:4,size:18,life:5,pierce:0,count:1,burn:3});for(const e of enemies())if(e.burn>=8){e.burn=0;blast(c,e.x,e.y,90,budget(c)*.1,'fire',{burn:2});}},
  ultrasound(c){clearShots();allControl(3);G.FX.ring(c.x,c.y,10,screenRadius(),'#bb8ef5',.8,6);},
  petalDance(){},
  sleepSpores(c){allControl(2.5,{noBoss:true});field(c,'spore',c.x,c.y,screenRadius(),2.5,0,'grass',{slow:.6});},
  butterflyBeam(c){clearShots();for(const p of actors())for(let i=0;i<5;i++)schedule(i*.2,()=>line(p,'beam',budget(p)*.12,{angle:p.aim+(i-2)*Math.PI/16,type:'psychic',width:45,leaderStun:1}));},
  burrow(c,f){c.invuln=Math.max(c.invuln,1.1);for(let i=0;i<(f.burrowTriple?3:1);i++)schedule(i*.25,()=>blast(c,c.x,c.y,250,budget(c)*(f.burrowTriple?.2:.6),'ground',{pull:150,stun:.6}));if(f.quicksand)field(c,'sand',c.x,c.y,220,3,budget(c)*.015,'ground',{slow:.6});},
  payDay(c){const gold=Math.min(3,Math.max(1,Math.floor(runGold()*.03)));G.Expedition.run.gold+=gold;G.Expedition.run.leaderGold=(G.Expedition.run.leaderGold||0)+gold;for(const p of actors())shield(p,Math.min(p.maxHp*.1,runGold()*.1),5);},
  headache(c,f){blast(c,c.x,c.y,screenRadius(),budget(c)*.6,'psychic',{stun:1.5});if(f.headacheHeal)healTeam(f.headacheHeal,true);if(f.headacheBoss)for(const e of enemies().filter(e=>e.boss))direct(c,e,budget(c)*.2,'psychic');},
  rageFists(){},
  roarRush(c){allControl(2,{slow:.5,weak:true});for(const p of actors())line(p,'dash',budget(p)*.4,{type:'fire',radius:600,width:70,speed:700});},
  hypnosisRain(c){G.Weather.force('rain',12);for(const e of G.EnemyMgr.queryCircle(c.x,c.y,250)){stun(e,2);e.shield*=.7;direct(c,e,budget(c)*.35,'water');}},
  warpBeam(c){for(const p of actors()){line(p,'beam',budget(p)*.3,{type:'psychic',leaderStun:1.5});const x=p.x+Math.cos(p.aim)*200,y=p.y+Math.sin(p.aim)*200;if(G.World.isFree(x,y,p.r)){p.x=x;p.y=y;}p.invuln=Math.max(p.invuln,.5);line(p,'beam',budget(p)*.3,{type:'psychic',leaderStun:1.5});}},
  fourFists(c){for(const p of actors())for(let i=0;i<4;i++)schedule(i*.2,()=>{line(p,'melee',budget(p)*.18,{type:'fighting',radius:200,arc:2,knock:i<3?130:0,zCrit:i===3});for(const e of G.EnemyMgr.queryCircle(p.x,p.y,200))e.shield*=.8;});},
  devour(c){let total=0;for(const e of G.EnemyMgr.queryCircle(c.x,c.y,200))if(!e.boss)total+=direct(c,e,percent(c,e,.3,true)+budget(c)*.12,'grass');for(const p of actors())Z.heal(p,total*.1/Math.max(1,actors().length));},
  toxicCurtain(c){for(const p of actors())shield(p,Math.max(p.maxHp*.15,p.baseSpDef*10),5);blast(c,c.x,c.y,250,budget(c)*.3,'poison',{knock:150,poison:3});},
  rockDetonation(c){for(const e of enemies())e.shield=0;blast(c,c.x,c.y,screenRadius(),budget(c)*.65,'rock',{knock:180});},
  flameGallop(){},
  painRelease(c,f){let total=0;for(const p of actors()){const q=own(p);total+=q.pain||0;q.pain=0;if(f.painReleaseHeal)Z.heal(p,total*f.painReleaseHeal/Math.max(1,actors().length));}blast(c,c.x,c.y,screenRadius(),Math.min(budget(c),total)+budget(c)*.25,'psychic',{stun:1.5});},
  magnetStorm(c){blast(c,c.x,c.y,screenRadius(),budget(c)*.4,'electric',{pull:250,slow:.5});},
  meteorThrust(c,f){line(c,'melee',budget(c)*.65,{type:'fighting',radius:screenRadius()*2,arc:.8,zCrit:true});for(const e of enemies()){const a=Math.atan2(e.y-c.y,e.x-c.x);if(Math.abs(Math.atan2(Math.sin(a-c.aim),Math.cos(a-c.aim)))<.5){e.shield=0;if(f.thrustVulnerable)vulnerable(e,f.thrustVulnerable);}}},
  tripleVolley(c){for(const p of actors())for(let i=0;i<3;i++)schedule(i*.2,()=>line(p,'projectile',budget(p)*.1,{count:3,pierce:1,spread:.1,speed:600,size:9}));},
  polarBeam(c){line(c,'beam',budget(c)*.55,{type:'ice',width:100,leaderStun:1});for(let i=1;i<=5;i++)field(c,'ice',c.x+Math.cos(c.aim)*i*100,c.y+Math.sin(c.aim)*i*100,75,4,budget(c)*.02,'ice',{slow:.6});},
  toxicEruption(c){for(const e of enemies().filter(e=>e.poison>0)){e.poison--;direct(c,e,percent(c,e,.08)+budget(c)*.1,'poison');stun(e,1.5);G.FX.ring(e.x,e.y,5,70,'#c76bef',.35,3);}},
  shellSmash(){},
  shadowBall(c){line(c,'projectile',budget(c)*.6,{type:'ghost',count:1,size:28,speed:130,life:6,pierce:6});field(c,'shadow',c.x+Math.cos(c.aim)*350,c.y+Math.sin(c.aim)*350,180,3,budget(c)*.04,'ghost',{pull:120,stun:.5});},
  titanTail(c){line(c,'melee',budget(c)*.65,{type:'rock',radius:screenRadius(),arc:Math.PI,knock:450});for(const e of enemies().filter(e=>!e.boss))if(Math.hypot(e.x-c.x,e.y-c.y)>screenRadius()*.7)direct(c,e,budget(c)*.15,'rock');},
  dreamFeast(c){let total=0;for(const e of enemies().filter(e=>e.classStunT>0||e.freezeT>0))total+=direct(c,e,percent(c,e,.3,true)+budget(c)*.15,'psychic');for(const p of actors())Z.heal(p,total*.15/Math.max(1,actors().length));},
  guillotine(c){line(c,'melee',budget(c)*.6,{type:'water',radius:230,arc:2,zCrit:true});let killed=false;for(const e of G.EnemyMgr.queryCircle(c.x,c.y,230))if(!e.boss&&!e.elite&&e.hp/e.maxHp<.35){direct(c,e,e.hp+e.shield+1,'water');killed=true;}else if(e.boss)direct(c,e,budget(c)*.25,'water');if(killed&&profile().executionFury)for(const p of actors())own(p).meleeUntil=state().time+4;},
  overload(c,f){clearShots();line(c,'dash',budget(c)*.35,{type:'electric',radius:600,width:60,speed:800});schedule(.3,()=>blast(c,c.x,c.y,280,budget(c)*.4,'electric',{knock:200,slow:.5}));if(f.overloadShield)for(const p of actors())shield(p,p.maxHp*.15);},
  harvest(c){for(const p of actors())for(const m of p.moves.filter(m=>m.kind==='meteor'))m.t=0;},
  boneCyclone(c){line(c,'boomerang',budget(c)*.45,{type:'ground',count:1,size:24,speed:550,radius:screenRadius(),phaseWalls:true});clearShots();for(const e of enemies().filter(e=>e.boss))vulnerable(e,.25,3);},
  tongueSweep(c){line(c,'melee',budget(c)*.6,{type:'normal',radius:screenRadius(),arc:Math.PI*2/3,leaderStun:2});for(const e of enemies())pull(e,c.x+Math.cos(c.aim)*100,c.y+Math.sin(c.aim)*100,180);},
  gasDetonation(c){clearShots();for(const e of enemies().filter(e=>e.poison>0))direct(c,e,percent(c,e,.12)+budget(c)*.15,'poison');},
  rockRush(c){clearShots();line(c,'dash',budget(c)*.7,{type:'rock',radius:750,width:100,speed:700,knock:450});},
  thornField(c){allControl(2,{pull:150});field(c,'thorns',c.x,c.y,screenRadius(),2,budget(c)*.08,'grass',{pull:100});},
  parentFury(){},
  dragonVortex(c){const e=enemies().sort((a,b)=>b.hp-a.hp)[0],x=e?.x??c.x,y=e?.y??c.y;field(c,'vortex',x,y,screenRadius()*.8,3,budget(c)*.07,'dragon',{pull:220});schedule(3,()=>blast(c,x,y,300,budget(c)*.35,'dragon',{stun:1}));},
  goldenDrill(c){clearShots();line(c,'dash',budget(c)*.7,{type:'water',radius:750,width:80,speed:850,leaderStun:2});},
  eightBeams(c){for(const p of actors())for(let i=0;i<8;i++)line(p,'beam',budget(p)*.1,{type:i%2?'psychic':'water',angle:i*Math.PI/4,width:45,slow:.5});},
  mirrorWave(c){const n=clearShots(c.x,c.y,screenRadius(),true);blast(c,c.x,c.y,240,budget(c)*.15,'psychic',{knock:200});if(!n)for(let i=0;i<6;i++)line(c,'projectile',budget(c)*.06,{type:'psychic',angle:i*Math.PI/3,homing:2,count:1});},
  crossSlash(c){for(let i=0;i<3;i++)schedule(i*.12,()=>line(c,'melee',budget(c)*.25,{type:'bug',radius:280,arc:2,zCrit:true,leaderStun:1}));for(const e of G.EnemyMgr.queryCircle(c.x,c.y,280)){e.leaderArmor=.35;e.leaderArmorUntil=state().time+3;}},
  frostKiss(c){line(c,'cone',budget(c)*.5,{type:'ice',count:12,size:12,speed:600,life:1.6,spread:.13});for(const e of enemies()){const a=Math.atan2(e.y-c.y,e.x-c.x);if(Math.abs(Math.atan2(Math.sin(a-c.aim),Math.cos(a-c.aim)))<Math.PI/3){stun(e,2.5);schedule(e.boss?1.25:2.5,()=>direct(c,e,percent(c,e,.15),'ice'));}}},
  thunderFists(c){for(let i=0;i<8;i++)schedule(i*.15,()=>{line(c,'melee',budget(c)*.06,{type:'electric',radius:200,arc:2});line(c,'chain',budget(c)*.045,{type:'electric',count:4,radius:300,leaderStun:.4});});},
  fireCannon(c){const e=c.target&&!c.target.dead?c.target:enemies()[0],x=e?.x??c.x+Math.cos(c.aim)*200,y=e?.y??c.y+Math.sin(c.aim)*200;for(const [dx,dy]of [[0,0],[-100,0],[100,0],[0,-100],[0,100]])field(c,'firecross',x+dx,y+dy,85,5,budget(c)*.025,'fire',{knock:50,burn:1});},
  titanThrow(c){const e=G.Projectiles.nearest(enemies().filter(e=>!e.boss),c.x,c.y,400);if(e){e.x=c.x+Math.cos(c.aim)*220;e.y=c.y+Math.sin(c.aim)*220;blast(c,e.x,e.y,250,budget(c)*.65,'bug',{stun:2});}else blast(c,c.x,c.y,200,budget(c)*.35,'bug',{stun:1});},
  stampede(c,f){clearShots();for(const a of [-.2,0,.2])line(c,'beam',budget(c)*.24,{angle:c.aim+a,type:'normal',width:80,knock:300,leaderStun:1.5});if(f.stampedeBoss)for(const e of enemies().filter(e=>e.boss))direct(c,e,budget(c)*.2,'normal');},
  dragonRoar(){allControl(1,{slow:.5,weak:true});},
  seaHymn(){clearShots();allControl(2,{noBoss:true});healTeam(.08,true);},
  quantumEcho(){},
  prismNova(c,f){clearShots();const type=c.mon.types[0]||'normal';blast(c,c.x,c.y,screenRadius(),budget(c)*.6,type,{burn:type==='fire'?3:0,slow:['water','ice'].includes(type)?.6:0,stun:['electric','psychic','fairy'].includes(type)?1.5:0});if(f.prismFury)for(const p of actors())own(p).rodUntil=state().time+4;},
  dataOverflow(){allControl(.5,{slow:.6});},
  ancientSpikes(c){line(c,'nova',budget(c)*.065,{type:'rock',count:24,pierce:999,phaseWalls:true,slow:.5,speed:550,size:9});},
  scytheDance(c){c.invuln=Math.max(c.invuln,2);field(c,'scythe',c.x,c.y,240,2,budget(c)*.12,'water',{knock:100});},
  ancientMeteors(c){const list=enemies();for(let i=0;i<8;i++){const e=list[i%Math.max(1,list.length)],a=Math.random()*Math.PI*2,r=Math.random()*screenRadius(),x=e?.x??c.x+Math.cos(a)*r,y=e?.y??c.y+Math.sin(a)*r;G.FX.ring(x,y,10,110,'#bba188',.45,4);schedule(.45+i*.08,()=>blast(c,x,y,145,budget(c)*.13,'rock',{stun:1.5}));}},
  bellyDrum(c){for(const p of actors())p.hp=Math.max(1,p.hp*.8);blast(c,c.x,c.y,screenRadius(),budget(c)*.35,'normal',{stun:2});},
  blizzard(c){clearShots();blast(c,c.x,c.y,screenRadius(),budget(c)*.65,'ice',{stun:2.5});},
  thunderstorm(c){const list=enemies();for(let i=0;i<12;i++)schedule(i*.08,()=>{const e=list[i%Math.max(1,list.length)];if(e&&!e.dead){e.shield=0;blast(c,e.x,e.y,100,budget(c)*.08,'electric',{stun:2});}});},
  phoenixStorm(c){clearShots();let found=false;for(const e of enemies().filter(e=>e.burn>0)){found=true;blast(c,e.x,e.y,100,budget(c)*.15,'fire',{burn:2});}if(!found)blast(c,c.x,c.y,screenRadius(),budget(c)*.4,'fire',{burn:3});},
  outrage(){for(const p of actors()){p.slowT=0;p.attackDebuff=0;}},
  psychicStop(c){allControl(2,{noBoss:true});schedule(2,()=>{const n=clearShots(c.x,c.y,screenRadius(),true);blast(c,c.x,c.y,screenRadius(),budget(c)*(.3+Math.min(.3,n*.015)),'psychic');});},
  genesis(c,f){for(const p of actors())for(const m of p.moves)m.t=0;if(f.genesisNova)for(let i=0;i<6;i++)schedule(i*.5,()=>line(c,'nova',budget(c)*.025,{count:8,type:Object.keys(G.U.TYPE_COLOR)[i%18],pierce:2,speed:400}));}
 };
 function runGold(){return Math.max(0,G.Expedition.run.gold);}
 function activate(p=captain()){
  if(!L.active()||p!==captain()||p.dead||G.Game.state!=='playing'||G.Expedition.run.phase!=='combat'||!G.LeaderMedals.unlocked(p.dex))return false;
  const s=state(),d=definition(p.dex);if(s.charge<1-1e-9||s.zUntil>s.time)return false;
  const fn=handlers[d.active.kind];if(!fn)throw Error('Missing leader Z '+d.active.kind);
  s.charge=0;s.types=[];s.z=d.active.kind;s.zUntil=s.time+(durations[s.z]||.4);s.zCasts=(s.zCasts||0)+1;
  G.Audio.sfx('shot',{kind:'beam',type:p.mon.types[0]});G.Camera.kick(.14);G.FX.ring(p.x,p.y,10,130,'#fff2a3',.45,5);
  if(profile().postZWeakness)for(const ally of actors())own(ally).postZUntil=s.time+7;
  Z.withoutCharge(()=>fn(p,profile()));return true;
 }
 L.activate=activate;L.zKinds=Object.freeze(Object.keys(handlers));
})();
