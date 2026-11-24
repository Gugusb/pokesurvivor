/* Galar-only adaptations; shared heals, echoes, shields and Z budgets remain shared. */
G.LeaderGalar=(()=>{
 const L=G.LeaderAbilities,K=G.LeaderKalos,A=G.LeaderAlola,Z=L._z,wrap=G.LeaderSinnoh.wrap;
 const {actors,enemies,captain,own}=Z,now=K.now;
 const active=()=>L.active()&&L.definition(captain()?.dex)?.generation===8,has=p=>active()&&Z.team(p),f=()=>L.profile()?.galar||{};
 const ordinary=m=>m&&!m.leaderGenerated&&!m.typeBondSecondary&&!m.kalosSecondary;
 function factor(p,key){if(!has(p))return 1;const a=f();let n=1;
  if(key==='spd'){if(a.highHpSlow&&p.hp>p.maxHp*.5)n*=1-a.highHpSlow;if(a.captainSlow&&p===captain())n*=1-a.captainSlow;if(a.sandSpeed&&G.Weather.current?.kind==='sand')n*=1+a.sandSpeed;}
  if(a.agilityMissing&&key==='agility')n*=1+a.agilityMissing*(1-Math.max(0,p.hp/p.maxHp));
  if(a.lowMissing&&['atk','agility'].includes(key)&&p.hp<p.maxHp*.4)n*=1+a.lowMissing*(1-Math.max(0,p.hp/p.maxHp));
  if(a.captainStationaryDefense&&p===captain()&&['defense','spdef'].includes(key)&&own(p).stationary>=1)n*=1+a.captainStationaryDefense/(1+(L.profile().stats?.[key]||0));
  return n;
 }
 function outgoing(p,e,m){return has(p)&&!m.kalosSettled&&f().poisonShockDamage&&(e.poison>0||e.typeBondState?.shock>0)?f().poisonShockDamage:1;}
 function hit(p,e,m,n,crit){if(!has(p)||!ordinary(m)||!(n>0))return;if(crit&&m.kind==='melee'&&f().meleeCritArmor){e.leaderArmor=Math.max(e.leaderArmor||0,f().meleeCritArmor);e.leaderArmorUntil=now()+3;}}
 function tick(){if(!active())return;const a=f();if(a.linksNearCaptain)for(const p of actors())if(p!==captain()&&!p.dead&&Math.hypot(p.x-captain().x,p.y-captain().y)<=220&&K.proc(p,'galarLink',1)){const e=G.Projectiles.nearest(enemies(),p.x,p.y,200);if(e)A.typed(p,e,Z.budget(p)*.03,'electric');}}
 function weatherImmune(p){return has(p)&&!!(f().weatherImmune===true||f().weatherImmune===G.Weather.current?.kind);}
 function shieldBypass(p,m){return has(p)&&!!f().meleeShieldBypass&&m.kind==='melee'&&ordinary(m);}
 // Scoped pre-collision handling also catches arena edges and destructible obstacles.
 function obstacle(shot){if(!has(shot.owner)||!shot.specMove?.galarBounce||shot.orb||shot.ghost)return false;
  const outside=G.World.arenaContains?.(shot.x,shot.y,shot.r)===false,block=G.World.projectileBlock(shot.x,shot.y,shot.r);
  if(!outside&&!block)return false;if(!(shot.leaderBounce>0)){if(outside){G.Projectiles.remove(shot);return true;}return false;}
  shot.leaderBounce--;shot.leaderBounced=true;const px=shot.px??shot.x,py=shot.py??shot.y;
  const vertical=outside?G.World.arenaContains?.(px,shot.y,shot.r)===false:!!G.World.projectileBlock(px,shot.y,shot.r);
  if(vertical)shot.vy*=-1;else shot.vx*=-1;shot.x=px;shot.y=py;shot.vx*=1.5;shot.vy*=1.5;shot.homing=Math.max(shot.homing||0,1.2);return true;
 }
 wrap('factor',(old,p,key)=>old(p,key)*factor(p,key));wrap('outgoing',(old,p,e,m)=>old(p,e,m)*outgoing(p,e,m));
 wrap('move',(old,p,m)=>{const n=old(p,m);if(has(p)&&ordinary(m)){if(f().beamTerrain&&m.kind==='beam')n.phaseWalls=true;if(f().obstacleBounce&&m.kind==='projectile')n.galarBounce=true;}return n;});

 wrap('hit',(old,...args)=>{old(...args);hit(...args);});wrap('tick',(old,dt)=>{old(dt);if(dt>0&&G.Expedition.run?.phase==='combat')tick();});
 wrap('beforeHurt',(old,p,type,src)=>!(has(p)&&src.kind==='weather'&&weatherImmune(p))&&old(p,type,src));
 return {active,has,f,weatherImmune,shieldBypass,obstacle,allows:m=>!active()||!f().banPhysicalMelee||m?.kind!=='melee'||m.damageClass!=='physical'};
})();
