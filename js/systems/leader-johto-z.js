/* Explicit manual Z dispatch for all 55 Johto designs. */
(()=>{
 const L=G.LeaderAbilities,J=G.LeaderJohto,Z=L._z;
 const {actors,enemies,captain,state,own,stun,vulnerable,pull,clearShots,direct,blast,percent,field,schedule,synthetic,shield}=Z;
 const f=()=>J.f(),r=()=>Z.screenRadius(),power=(p,k=1)=>{const m=p.activeMove?.()||p.moves[0];return Math.max(1,(m?.dmg||20)*(m?p.attackFor(m):p.atk)*k);};
 const fraction=(p,e,n,missing=false)=>Math.min((missing?Math.max(0,e.maxHp-e.hp):e.maxHp)*n,e.boss||e.elite?Z.budget(p)*.3:Infinity);
 const all=(fn)=>{for(const e of enemies())fn(e);};
 function emit(p,kind,m={},angle=p.aim){synthetic(p,kind,{phaseWalls:true,leaderJohtoZ:true,damageClass:'special',radius:r()*2,width:75,speed:650,life:2,count:1,...m},angle);}
 function control(t,onlyMobs=false){all(e=>{if(!onlyMobs||!e.boss)stun(e,t);});}
 function armor(e,n,seconds=4){e.leaderArmor=n;e.leaderArmorUntil=J.now()+seconds;}
 function beam(c,type,mult,opts={}){emit(c,'beam',{type,dmg:power(c,mult)/Math.max(1,c.spa),...opts});}
 function cleanseHeal(n,missing=false){J.cleanse();J.healAll(n,missing);}
 function explode(c,type,mult,opts={}){blast(c,c.x,c.y,r(),power(c,mult),type,opts);}
 function dash(c,type,mult,opts={}){emit(c,'dash',{type,damageClass:'physical',dmg:power(c,mult)/Math.max(1,c.atk),radius:r()*1.5,width:90,...opts});}
 const handlers={
 johto152(c){J.cleanse();for(const p of actors())shield(p,p.maxHp*.25,5);},
 johto155(c){all(e=>{const healthy=actors().filter(p=>!p.dead).every(p=>p.hp/p.maxHp>.8);direct(c,e,power(c,healthy?3:2),'fire');e.applyBurn(2,c,true);});},
 johto158(c){dash(c,'water',1,{radius:150});explode(c,'water',2.5,{stun:1.5});},
 johto161(){state().batonReady=true;},
 johto163(){all(e=>{e.staticT=0;e.fearT=0;e.slowT=0;e.johtoRevealed=true;e.applySlow(.5,2);});},
 johto165(c){for(const p of actors())for(let i=0;i<5;i++)schedule(i*.18,()=>{emit(p,'melee',{type:'fighting',damageClass:'physical',radius:200,arc:1.7,dmg:power(p,.6)/Math.max(1,p.atk),knock:80,leaderStun:i===4?1:0});if(i===4){for(const e of G.EnemyMgr.queryCircle(p.x,p.y,200)){e.shield=0;if(e.boss&&f().cometShield)for(const ally of actors())shield(ally,ally.maxHp*f().cometShield);}}});},
 johto167(c){all(e=>{if(e.johtoWebUntil>J.now()){e.applyPoison(2,c,true);direct(c,e,fraction(c,e,.2,true),'poison');}});},
 johto170(c){clearShots(c.x,c.y,200);for(const e of G.EnemyMgr.queryCircle(c.x,c.y,160))stun(e,2);if(f().glowChains)for(let i=0;i<3;i++)emit(c,'chain',{type:'electric',dmg:power(c,.5)/Math.max(1,c.spa),count:6,radius:r()},c.aim+(i-1)*.4);},
 johto173(c){clearShots();const kinds=['fire','ice','rock'],type=kinds[Math.floor(Math.random()*3)];explode(c,type,2,{stun:type==='ice'?2:0,burn:type==='fire'?2:0});if(f().wishHeal)J.healAll(f().wishHeal,true);},
 johto174(c){clearShots();explode(c,'normal',2,{knock:150,stun:2});},
 johto175(c){clearShots();for(let i=0;i<6;i++)schedule(i*.12,()=>emit(c,'cone',{type:'flying',dmg:power(c,.4)/Math.max(1,c.spa),count:8,spread:.12,johtoExtendStun:.5}));},
 johto177(c){const targets=enemies().sort((a,b)=>b.hp-a.hp).slice(0,3);for(const e of targets){G.FX.ring(e.x,e.y,5,90,'#eac1ff',3,3);schedule(3,()=>{if(!e.dead){e.shield=0;direct(c,e,power(c,3),'psychic');}});}if(f().futureStun)schedule(3,()=>control(2,true));},
 johto179(c){beam(c,'electric',2,{johtoCritOnStun:true});J.path(c,r()*2,100);for(let i=0;i<(f().beaconBalls||0);i++)emit(c,'projectile',{type:'electric',homing:6,size:12,count:1,dmg:power(c,.5)/Math.max(1,c.spa)},c.aim+i*Math.PI*2/3);},
 johto183(c){dash(c,'fairy',2,{knock:200,zCrit:true});if(f().dragonSlayer)all(e=>{if(e.types.some(t=>['dark','dragon','fighting'].includes(t)))direct(c,e,power(c,1),'fairy');});},
 johto185(c){for(const e of G.EnemyMgr.queryCircle(c.x,c.y,250)){e.shield=0;direct(c,e,power(c,2.2),'rock');}G.FX.ring(c.x,c.y,5,250,'#ccb090',.5,6);},
 johto187(c){clearShots();G.FX.ring(c.x,c.y,5,r(),'#d7e8b2',.6,4);for(const e of enemies()){const dealt=direct(c,e,power(c),'flying',{knock:350});stun(e,2);if(f().cottonLeech)for(const p of actors())Z.heal(p,dealt*f().cottonLeech/actors().length);}},
 johto190(c){for(const p of actors())for(let i=0;i<6;i++)schedule(i*.15,()=>{emit(p,'melee',{type:'normal',damageClass:'physical',dmg:power(p,.5)/Math.max(1,p.atk),radius:230,arc:2,knock:60,zCrit:i===5});if(i===5)for(const e of G.EnemyMgr.queryCircle(p.x,p.y,230))e.shield*=.6;});},
 johto191(c){for(let i=0;i<10;i++)schedule(i*.1,()=>{beam(c,i%2?'fire':'grass',.35,{width:125,zCrit:!!f().solarCrit});J.path(c,r()*2,125);});},
 johto193(c){clearShots();explode(c,'flying',2,{stun:2});if(f().sonicTrue)all(e=>{if(e.classStunT>0)direct(c,e,power(c),'flying');});},
 johto194(c){explode(c,'ground',2,{stun:2,knock:100});},
 johto198(c){for(let i=0;i<6;i++)schedule(i*.12,()=>{emit(c,'beam',{type:'dark',damageClass:'physical',dmg:power(c,.6)/Math.max(1,c.atk),width:90,leaderStun:1.5},i*Math.PI/3);});},
 johto200(c){clearShots();explode(c,'ghost',2,{knock:150,slow:.5});},
 johto201(c){explode(c,state().runeType||'psychic',2.5,{stun:2});if(f().runeArmor){for(const e of enemies().filter(e=>e.boss))armor(e,f().runeArmor);for(const p of actors())J.q(p).runeHasteUntil=J.now()+4;}},
 johto202(c){const received=actors().reduce((n,p)=>n+J.q(p).received,0),mult=f().counterPower||2;for(const p of actors())J.q(p).received=0;blast(c,c.x,c.y,r(),received*mult,'psychic',{stun:2});if(f().counterGuard)c.invuln=Math.max(c.invuln,f().counterGuard);},
 johto203(c){for(const angle of [c.aim,c.aim+Math.PI])emit(c,'beam',{type:'psychic',dmg:power(c,1.5)/Math.max(1,c.spa),width:150,knock:250,slow:.5},angle);},
 johto204(c){clearShots();explode(c,'steel',3);},
 johto206(c){const sx=c.x,sy=c.y;dash(c,'ground',2,{johtoSmash:true});schedule(.2,()=>{explode(c,'ground',1,{breakShield:true});if(f().drillReturn){const a=c.aim;c.aim+=Math.PI;dash(c,'ground',1,{johtoSmash:true});c.aim=a;}});},
 johto207(c){const target=c.target&&!c.target.dead?c.target:G.Projectiles.nearest(enemies(),c.x,c.y,r());if(target){if(!target.boss&&target.hp/target.maxHp<.35)direct(c,target,target.hp+target.shield+1,'poison');else{armor(target,.4);direct(c,target,power(c,2),'poison');stun(target,1);}}},
 johto209(c){clearShots();explode(c,'fairy',2,{knock:200,stun:2});},
 johto211(c){clearShots();emit(c,'nova',{type:'poison',count:32,pierce:999,dmg:power(c,.3)/Math.max(1,c.spa),speed:600,size:9,leaderStun:1.5});},
 johto213(){},
 johto214(c){dash(c,'bug',1.5,{knock:200});schedule(.2,()=>explode(c,'bug',2,{breakShield:true,stun:1.5}));},
 johto215(c){all(e=>{if(!e.boss&&e.hp/e.maxHp<.3)direct(c,e,e.hp+e.shield+1,'dark');else if(e.boss){armor(e,.4);direct(c,e,power(c,2.5),'ice');}});},
 johto216(c){explode(c,'ground',2.5*(1+(1-c.hp/c.maxHp)),{knock:180,stun:1.5});},
 johto218(c){clearShots();all(e=>{if(e.burn>0)blast(c,e.x,e.y,110,power(c,1.5),'fire',{knock:50});});},
 johto220(c){dash(c,'ice',2,{johtoSmash:true,knock:250});schedule(.2,()=>explode(c,'ice',1,{stun:2}));if(f().mammothArmor)for(const e of enemies().filter(e=>e.boss))armor(e,.6);},
 johto222(c){clearShots(c.x,c.y,250);all(e=>{if(e.johtoTouched){stun(e,2);schedule(e.boss?1:2,()=>direct(c,e,fraction(c,e,.15),'ghost'));}});},
 johto223(c){const e=c.target,x=e?.x??c.x,y=e?.y??c.y,types=['fire','ice','grass','electric'],type=f().inkAmmo?types[Math.floor(Math.random()*4)]:'water';clearShots(x,y,250);blast(c,x,y,250,power(c,f().inkAmmo?2:1.5),type,{slow:.6});},
 johto225(c){for(let i=0;i<6;i++){const list=enemies(),e=list[i%Math.max(1,list.length)],x=e?.x??c.x+(Math.random()-.5)*500,y=e?.y??c.y+(Math.random()-.5)*500;G.FX.ring(x,y,5,100,'#ffafcb',.4,4);schedule(.4+i*.1,()=>blast(c,x,y,130,power(c,.8),'ice',{stun:1.5}));}G.Expedition.run.traitFreeRefresh=(G.Expedition.run.traitFreeRefresh||0)+2;},
 johto226(c){dash(c,'water',2);clearShots();for(const p of actors())shield(p,p.maxHp*.15+p.defenseFor({kind:'ranged'}),5);if(f().remoraid)for(let i=0;i<4;i++)schedule(i*.2,()=>{for(const side of [-1,1])emit(c,'projectile',{type:'water',count:3,pierce:1,dmg:power(c,.25)/Math.max(1,c.spa),spread:.1},c.aim+side*Math.PI/2);});},
 johto227(c){emit(c,'nova',{type:'steel',damageClass:'physical',count:24,pierce:999,dmg:power(c,.4)/Math.max(1,c.atk),johtoSmash:true});},
 johto228(c){all(e=>{if(e.burn>0){direct(c,e,fraction(c,e,.25,true),'fire');stun(e,2);}});},
 johto231(c){explode(c,'ground',2,{knock:180,stun:1.5});},
 johto234(c){const total=actors().reduce((n,p)=>n+p.baseDefense*L.factor(p,'defense')+p.baseSpDef*L.factor(p,'spdef'),0);blast(c,c.x,c.y,r(),total*20,'psychic',{breakShield:true,stun:2});if(f().barrierGuard)for(const p of actors())J.q(p).barrierUntil=J.now()+4;},
 johto235(c){clearShots();control(2);J.healAll(.15);},
 johto236(){},
 johto241(c){cleanseHeal(.3,true);explode(c,'normal',.5,{knock:200});},
 johto440(c){clearShots();control(2,true);},
 johto243(c){clearShots();const list=enemies();for(let i=0;i<8;i++)schedule(i*.1,()=>{const e=list[i%Math.max(1,list.length)];if(!e||e.dead)return;e.shield=0;blast(c,e.x,e.y,110,power(c,.7),'electric',{stun:2});if(f().thunderBoss&&e.boss){armor(e,.4);direct(c,e,power(c,1.5),'electric');}});},
 johto244(c){clearShots();all(e=>{if(e.burn>0)direct(c,e,fraction(c,e,.15),'fire');});},
 johto245(c){control(2.5,true);for(const p of actors())shield(p,p.maxHp*.25);},
 johto246(c){all(e=>{e.shield=0;blast(c,e.x,e.y,80,power(c,f().quakeBoss&&e.boss?3:1.5),'rock',{stun:2});});},
 johto249(c){beam(c,'flying',3,{width:150,zCrit:true,knock:220});J.path(c,r()*2,150);if(f().aeroblastGuard)c.invuln=Math.max(c.invuln,2);},
 johto250(c){clearShots();explode(c,'fire',2,{burn:2});},
 johto251(){control(2.5,true);for(const p of actors()){J.burst(p,Math.max(0,(J.q(p).highHp||p.hp)-p.hp));for(const m of p.moves)m.t=0;}}
 };
 L.registerZ(handlers,Object.fromEntries(Object.keys(handlers).map(id=>[id,id==='johto244'?5:id==='johto204'?3:['johto213','johto236','johto251'].includes(id)?4:2])));
})();
