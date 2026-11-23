/* Explicit Sinnoh manual bursts. Dual types divide total power; secondary hits cannot recharge Z. */
(()=>{const H=G.LeaderSinnoh,L=G.LeaderAbilities,Z=L._z,{actors,enemies,captain,state,shield,stun,clearShots,pull,field,schedule,synthetic,budget}=Z;
 const r=()=>Z.screenRadius(),power=(p,k=1)=>{const m=p.activeMove?.()||p.moves[0];return Math.max(1,(m?.dmg||20)*(m?p.attackFor(m):p.atk)*k);},crit=p=>G.Abilities.critMultiplier(p)+L.critMultiplier(p,p.activeMove?.()||p.moves[0]);
 function hit(p,e,k,types=['normal'],opts={}){let dealt=0;for(const type of types){if(e.dead)break;const mult=opts.neutral?1:G.Types.mult(type,e.types)*G.Weather.mult(type);dealt+=Z.direct(p,e,power(p,k/types.length)*mult,type,{sinnohZ:true,...opts});}return dealt;}
 function nova(p,k,types,opts={}){G.FX.ring(p.x,p.y,8,opts.radius||r(),G.U.TYPE_COLOR[types[0]]||'#e5d8ff',.5,5);let total=0;for(const e of enemies().filter(e=>Math.hypot(e.x-p.x,e.y-p.y)<(opts.radius||r())+e.r)){total+=hit(p,e,k,types,opts);if(opts.stun)stun(e,opts.stun);if(opts.slow)e.applySlow(opts.slow,3);if(opts.pull)pull(e,p.x,p.y,opts.pull);if(opts.break)e.shield=0;}return total;}
 function line(p,k,types,{kind='beam',angle=p.aim,...opts}={}){for(const type of types)synthetic(p,kind,{type,damageClass:'physical',leaderTrue:true,sinnohZ:true,dmg:power(p,k/types.length)/Math.max(.1,p.atk),radius:r()*2,width:100,count:1,speed:700,life:2,phaseWalls:true,...opts},angle);}
 const control=(n)=>{for(const e of enemies())stun(e,n);},reset=()=>{for(const p of actors())for(const m of p.moves)m.t=0;};
 function target(c){return c.target&&!c.target.dead?c.target:enemies().sort((a,b)=>b.hp-a.hp)[0];}
 function warp(c,e){if(!e)return;const x=e.x-Math.cos(c.aim)*60,y=e.y-Math.sin(c.aim)*60;if(G.World.arenaContains?.(x,y,c.r)!==false){c.x=x;c.y=y;}}
 const handlers={
 sinnoh387(c){nova(c,2.6,['grass','ground'],{slow:.5});H.teamHeal(.2);},
 sinnoh390(c){c.invuln=Math.max(c.invuln,.8);for(let i=0;i<8;i++)schedule(i*.08,()=>line(c,3.4/8,['fire','fighting'],{kind:'melee',radius:220,zCrit:true,arc:2,knock:i===7?200:0}));field(c,'blazingFists',c.x,c.y,180,4,power(c,.1),'fire',{burn:1});},
 sinnoh393(c){clearShots();line(c,2.8,['water','steel'],{width:300,knock:350});},
 sinnoh396(c){c.invuln=Math.max(c.invuln,H.f().zGuard||.6);line(c,3.8,['normal'],{kind:'dash',radius:r()*2,width:140,zCrit:true,sinnohVulnerable:.35,neutral:true});},
 sinnoh399(c){line(c,2.5,['water'],{width:140,knock:200});H.s().zGold=1;H.s().endHeal=.15;},
 sinnoh401(c){nova(c,2.4,['normal'],{neutral:true,stun:2});},
 sinnoh403(c){line(c,2.8,['electric'],{width:160,zCrit:true});schedule(.2,()=>nova(c,.7,['electric']));},
 sinnoh408(c){c.invuln=Math.max(c.invuln,.8);line(c,4.5,['rock'],{kind:'dash',radius:350,width:100,sinnohBreak:true,leaderStun:2.5,neutral:true});},
 sinnoh410(c){clearShots();nova(c,2.8,['steel'],{neutral:true});const kinetic=Math.min(budget(c),H.s().kinetic||0);H.s().kinetic=0;for(const e of enemies()){H.secondary(c,e,Math.min(kinetic,e.boss||e.elite?budget(c)*.3:Infinity),'steel',{sinnohZ:true});pull(e,c.x,c.y,-300);}},
 sinnoh412(c){nova(c,2.5,['grass','ground','steel']);for(const p of actors())shield(p,p.maxHp*.3,5);},
 sinnoh415(c){for(let i=0;i<18;i++)schedule(i*4/18,()=>{const list=enemies(),e=list[i%Math.max(1,list.length)];if(e)nova(c,3.2/18,['bug'],{neutral:true});});H.teamHeal(.3,true);},
 sinnoh417(c){nova(c,2.6,['electric'],{stun:2});for(const e of enemies()){e.leaderDamage=.7;e.leaderDamageUntil=H.now()+4;}},
 sinnoh418(c){nova(c,2.6,['water'],{slow:.5});for(const e of enemies())pull(e,c.x,c.y,-300);},
 sinnoh420(c){nova(c,3,['grass','fire']);H.cleanse();H.teamHeal(.4);},
 sinnoh422(c){for(const e of enemies().filter(e=>!e.flying)){hit(c,e,2.6,['water','ground']);H.armor(e,.4,5);stun(e,1.5);}},
 sinnoh425(c){nova(c,3.2,['ghost','fire'],{radius:300,stun:1});for(const e of enemies())if(Math.hypot(e.x-c.x,e.y-c.y)<300)pull(e,c.x,c.y,-180);},
 sinnoh427(c){const e=target(c);if(e){warp(c,e);nova(c,3.8*crit(c),['fighting'],{radius:200,leaderCrit:true,stun:1.5,break:true});}else c.hp=Math.max(1,c.hp-Math.min(c.hp*.2,power(c,3.8)*.1));},
 sinnoh431(c){line(c,3.2,['normal'],{kind:'dash',radius:350,width:200,leaderStun:2,neutral:true});H.s().teamSpeedUntil=H.now()+4;},
 sinnoh434(c){line(c,3/12,['poison','fire'],{kind:'cone',count:12,spread:Math.PI,speed:350,life:1});field(c,'toxicGas',c.x+Math.cos(c.aim)*160,c.y+Math.sin(c.aim)*160,200,5,power(c,.1),'poison',{burn:1,poison:1});},
 sinnoh436(c){clearShots();nova(c,2.4,['psychic','steel'],{stun:2});},
 sinnoh441(c){line(c,2.8/10,['normal'],{kind:'cone',count:10,spread:1.7,leaderStun:2,neutral:true});},
 sinnoh442(c){let total=0;for(const e of enemies()){pull(e,c.x,c.y,350);total+=hit(c,e,3,['ghost','dark']);stun(e,2);}for(const p of actors())shield(p,total*.2/Math.max(1,actors().length));},
 sinnoh443(c){c.invuln=Math.max(c.invuln,.6);line(c,3.8,['dragon','ground'],{kind:'dash',radius:300,width:120,zCrit:true,sinnohBreak:true});field(c,'dragonSand',c.x,c.y,180,4,power(c,.1),'ground',{pull:40,slow:.5});},
 sinnoh447(c){line(c,3.6,['fighting','steel'],{width:180,sinnohCut:.3});},
 sinnoh449(c){nova(c,2.8,['ground'],{stun:2,break:true});},
 sinnoh451(c){for(const angle of [c.aim-.3,c.aim+.3])line(c,1.8,['poison'],{angle,width:100,zCrit:true,sinnohExecute:.3});},
 sinnoh453(c){c.invuln=Math.max(c.invuln,.5);line(c,3.2,['poison','fighting'],{kind:'melee',radius:240,arc:2});for(const e of enemies().filter(e=>e.poison>0&&Math.hypot(e.x-c.x,e.y-c.y)<240))hit(c,e,Math.min(1.6,e.poison*.2),['poison']);},
 sinnoh455(c){for(const e of enemies().filter(e=>Math.hypot(e.x-c.x,e.y-c.y)<400)){pull(e,c.x,c.y,300);hit(c,e,2.8,['grass']);stun(e,2);}H.teamHeal(.25);},
 sinnoh456(c){nova(c,2.4,['water'],{stun:2});},
 sinnoh459(c){nova(c,3,['ice','grass']);for(const e of enemies())e.freezeT=Math.max(e.freezeT||0,2*(e.boss?.5:1));},
 sinnoh479(c){nova(c,3*crit(c),['electric',H.applianceType()||'ghost'],{leaderCrit:true,stun:2});},
 sinnoh480(c){nova(c,2.6,['psychic'],{stun:3});for(const e of enemies())e.leaderSilenceUntil=H.now()+3*(e.boss?.5:1);},
 sinnoh481(c){const total=nova(c,2.8,['psychic','fairy']);for(const p of actors())shield(p,total*.25/Math.max(1,actors().length));},
 sinnoh482(c){nova(c,4.2,['psychic']);c.invuln=Math.max(c.invuln,2);},
 sinnoh483(c){H.freeze(2.5);schedule(.15,()=>nova(c,4.5,['dragon','steel']));reset();H.s().zSlowUntil=H.now()+1;},
 sinnoh484(c){clearShots();nova(c,4.4*crit(c),['dragon','water'],{leaderCrit:true,break:true,stun:2});},
 sinnoh485(c){nova(c,3.6,['fire','steel'],{pull:350,stun:3.5});},
 sinnoh486(c){nova(c,4.8,['normal'],{neutral:true,stun:2});},
 sinnoh487(c){H.s().zRefunded=false;for(const p of actors()){p.invuln=Math.max(p.invuln,1.5);p.sinnohHiddenUntil=H.now()+1.5;}schedule(1.5,()=>{const e=enemies().sort((a,b)=>b.hp-a.hp)[0];if(e){warp(c,e);e.shield=0;hit(c,e,4.6*crit(c),['ghost'],{leaderCrit:true,sinnohBreak:true});}});},
 sinnoh488(){clearShots();H.cleanse();H.teamHeal(.5,true);control(2);},
 sinnoh489(c){let atk=0,speed=0,guard=0;for(const e of enemies().filter(e=>e.elite||e.boss)){if(e.skillAttackBuff>1){atk=Math.max(atk,Math.min(.5,e.skillAttackBuff-1));e.skillAttackBuff=1;}if(e.skillSpeedBuff>1){speed=Math.max(speed,Math.min(.5,e.skillSpeedBuff-1));e.skillSpeedBuff=1;}if(e.skillReduction>0){guard=Math.max(guard,Math.min(.4,e.skillReduction));e.skillReduction=0;}}Object.assign(H.s(),{stolenAttack:atk,stolenSpeed:speed,stolenGuard:guard,stolenUntil:H.now()+6});nova(c,2.5,['water']);},
 sinnoh491(c){nova(c,3.6,['dark'],{pull:350,stun:2.5,sinnohNightmare:true});},
 sinnoh492(c){nova(c,3.5,['grass','flying']);for(const e of enemies())e.sinnohSpdefUntil=H.now()+5;},
 sinnoh493(c){clearShots();nova(c,5*crit(c),['normal'],{leaderCrit:true,neutral:true,stun:2.5});if(H.f().creationGift){const pool=actors().flatMap(p=>p.moves).filter(m=>m.lvl<5&&!m.evolved);if(pool.length){const m=G.U.pick(pool);while(m.lvl<5)G.Moves.levelUp(m);}G.HoennMarket.addCoupon();}}
 };
 L.registerZ(handlers,Object.fromEntries(Object.keys(handlers).map(id=>[id,4])));
})();
