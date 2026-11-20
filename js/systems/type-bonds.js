/* Attribute bonds are run-only. Their added damage is tagged to prevent recursive procs. */
G.TypeBonds=(()=>{
  let time=0,nextCast=1,fields=[],earth=0,earthTime=0,windTime=0,dragonKills=0,psychicUntil=0,rockUntil=0;
  let records=new WeakMap(),bug={stacks:0,ascended:false,bonus:{},inherited:{}},hpOwner=null,hpAdded=0;
  const active=()=>!!G.Squad?.active,team=()=>active()?G.Squad.actors():[],alive=()=>team().filter(p=>!p.dead);
  const captain=()=>team()[0],has=(p,type)=>!!p?.mon?.types.includes(type),belongs=(p,type)=>active()&&team().includes(p)&&has(p,type);
  function state(type){const count=G.SquadBonds?.count('types',type)||0,level=G.SquadBonds?.layer('types',type)||0;return {count,level,tier:count>=5?5:count>=2?2:0};}
  const value=(type,key)=>G.TypeBondDefs.interpolate(G.TypeBondDefs.BY[type].values[key],state(type).level);
  const ready=(p,type,tier=2)=>belongs(p,type)&&state(type).tier>=tier;
  const source=type=>alive().find(p=>has(p,type));
  const base=type=>alive().filter(p=>has(p,type)).reduce((n,p)=>n+p.atk+p.spa,0)*.3;
  const es=e=>e.typeBondState||(e.typeBondState={normal:false,wet:0,shock:0,frost:0,frozen:0,psychic:0,root:0,amp:1});
  const ps=p=>{let s=records.get(p);if(!s)records.set(p,s={hurt:[],refunds:new Set()});return s;};
  const near=(x,y,r)=>G.EnemyMgr.queryCircle(x,y,r).filter(e=>!e.dead);
  function deal(e,amount,p,type,options={}){
    if(!e||e.dead||!p||!(amount>0))return 0;
    const attack={id:'typebond-'+type,type,kind:'typebond',typeBondSecondary:true,...options};
    const k=options.typeBondFraction?1:G.Abilities.outgoingType(p,type,e.types)*G.Weather.mult(type),d=e.hurt(amount*k,G.U.TYPE_COLOR[type],e.x-p.x,e.y-p.y,options.knock||0,null,p,attack)||0;
    p.dmgDealt+=d;p.onDealt(d);return d;
  }
  function ring(x,y,r,type){G.FX.ring(x,y,6,r,G.U.TYPE_COLOR[type],.4,3);}
  function area(x,y,r,p,type,amount,options={}){ring(x,y,r,type);for(const e of near(x,y,r))deal(e,amount,p,type,options);}
  function dotPresent(e){const s=es(e);return !!(s.ignite?.left>0||s.poison?.left>0||s.fear?.left>0||e.burn>0||e.poison>0||e.abilityBurn?.remaining>0);}
  function rawBugStats(excludeCaptain=false){
    const sums={hp:0,atk:0,spa:0,defense:0,spdef:0,spd:0,agility:0,stamina:0};
    const keys={hp:'baseHp',atk:'baseAtk',spa:'baseSpa',defense:'baseDefense',spdef:'baseSpDef',spd:'baseSpd',agility:'baseAgility',stamina:'baseStamina'};
    for(const p of alive().filter(p=>has(p,'bug')&&(!excludeCaptain||p!==captain())))for(const [key,raw]of Object.entries(keys))sums[key]+=p[raw]||0;return sums;
  }
  function syncStats(){
    const cap=captain();if(!cap)return;
    const sums=bug.ascended?bug.inherited:rawBugStats(),factor=bug.ascended?value('bug','inherit'):bug.stacks*value('bug','cluster');
    bug.bonus=Object.fromEntries(Object.entries(sums).map(([k,v])=>[k,v*factor]));
    const amount=(bug.bonus.hp||0)*(1+(cap.statGrowth.hp||0)+(G.Squad.growth(cap,'hp')||0))*(G.Mega?.active(cap)?G.Mega.HP:1);
    if(hpOwner&&hpOwner!==cap){hpOwner.maxHp=Math.max(1,hpOwner.maxHp-hpAdded);hpOwner.hp=Math.min(hpOwner.hp,hpOwner.maxHp);hpAdded=0;}
    hpOwner=cap;const delta=amount-hpAdded;cap.maxHp=Math.max(1,cap.maxHp+delta);if(!cap.dead)cap.hp=Math.min(cap.maxHp,Math.max(1,cap.hp+delta));hpAdded=amount;
  }
  function reset(){
    if(hpOwner){hpOwner.maxHp=Math.max(1,hpOwner.maxHp-hpAdded);if(!hpOwner.dead)hpOwner.hp=Math.min(hpOwner.maxHp,Math.max(1,hpOwner.hp-hpAdded));}
    time=0;nextCast=1;fields=[];earth=earthTime=windTime=dragonKills=psychicUntil=rockUntil=0;records=new WeakMap();bug={stacks:0,ascended:false,bonus:{},inherited:{}};hpOwner=null;hpAdded=0;
  }
  function beginStage(){
    fields=[];earth=earthTime=windTime=dragonKills=psychicUntil=rockUntil=0;records=new WeakMap();bug={stacks:0,ascended:false,bonus:{},inherited:{}};syncStats();
    for(const e of G.EnemyMgr.all())delete e.typeBondState;
  }
  const baseBonus=(p,key)=>p===captain()?bug.bonus[key]||0:0;
  function agility(p){return active()&&team().includes(p)?1+(p.isSquadMember&&time<psychicUntil?1:0)+(has(p,'rock')&&time<rockUntil?1:0):1;}
  const speed=p=>active()&&team().includes(p)&&state('electric').tier===5?1+value('electric','speed'):1;
  const regen=p=>p===captain()&&bug.ascended?p.maxHp*.15:0;
  function damageMultiplier(p){
    if(!active()||!team().includes(p))return 1;let k=p.isSquadMember&&state('dragon').tier>=2?1+value('dragon','damage'):1;
    const t=team();if(state('steel').tier===5&&(p===t[0]||p===t[t.length-1]))k*=1+value('steel','damage')*t.length;return k;
  }
  function defense(p){const t=team();return active()&&state('steel').tier===5&&(p===t[0]||p===t[t.length-1])?Math.max(.05,1-value('steel','reduction')*t.length):1;}
  function move(p,m){
    if(!active()||!p?.isSquadMember||!team().includes(p)||state('dragon').tier<2||m.typeSizeApplied||m.kind==='buff')return m;
    const k=1+value('dragon','size'),v={...m,typeSizeApplied:true,typeReachFactor:k};for(const key of ['radius','width','size','range'])if(m[key]!=null)v[key]=m[key]*k;return v;
  }
  function cast(p,m){
    if(!active()||!team().includes(p))return 0;const id=nextCast++;
    if(ready(p,'bug')&&!bug.ascended){
      bug.stacks++;if(state('bug').tier===5&&bug.stacks>90){
        bug.inherited=rawBugStats(true);bug.ascended=true;
        for(const q of alive().filter(q=>q!==captain()&&has(q,'bug'))){q.dead=true;q.hp=0;q.anim.play('Faint',{hold:true});for(const shot of [...G.Projectiles.all()])if(shot.owner===q)G.Projectiles.remove(shot);G.Combat.clearFields(q);}
        ring(captain().x,captain().y,140,'bug');
      }syncStats();
    }
    return id;
  }
  function beforeHit(p,e,a={}){
    const s=es(e),direct=!a.typeBondSecondary,ctx={factor:damageMultiplier(p),execute:false,normal:false,wet:s.wet>0,shock:s.shock>0,dot:dotPresent(e),frozen:s.frozen>0};
    if(!active()||!p)return ctx;
    if(a.typeBondFraction){ctx.factor=a.typeBondDot?s.amp:1;return ctx;}
    if(direct&&ready(p,'normal')&&s.normal){ctx.factor*=1+value('normal','mark');ctx.normal=true;}
    if(ready(p,'psychic')&&a.type==='psychic')ctx.factor*=1+s.psychic*value('psychic','vulnerability');
    if(direct&&ready(p,'ice',5)&&ctx.frozen&&!a.typeBondCritApplied)ctx.factor*=G.Abilities.critMultiplier(p)+value('ice','crit');
    if(direct&&ready(p,'fairy',5)&&e.hp/e.maxHp<Math.min(.95,value('fairy','threshold'))){if(!e.boss&&!e.elite&&!e.legend)ctx.execute=true;else ctx.factor*=1+value('fairy','execute')*(e.elite?2:1);}
    if(a.typeBondDot)ctx.factor*=s.amp;
    return ctx;
  }
  const forceCrit=(p,e)=>ready(p,'ice',5)&&es(e).frozen>0;
  const critBonus=(p,e)=>forceCrit(p,e)?value('ice','crit'):0;
  const knock=(p,a)=>!a.typeBondSecondary&&ready(p,'fighting')?1+value('fighting','knock'):1;
  function addIgnite(e,p,type='fire'){
    const s=es(e);if(type==='fire'&&state('fire').tier===5&&s.ignite?.left>0){s.ignite=null;area(e.x,e.y,100,p,'fire',base('fire')*value('fire','blast'),{noIgnite:true});return;}
    s.ignite={left:3,tick:1,p,type};
  }
  function addPoison(e,p,n=1,type='poison'){
    const s=es(e),old=s.poison,cap=state('poison').tier===5?30:10;s.poison={n:Math.min(cap,(old?.left>0?old.n:0)+n),left:5,tick:old?.tick??1,p,type};
  }
  function addFear(e,p,type='ghost',duration=3){es(e).fear={left:duration,tick:1,p,type};}
  function refreshDots(e){
    const s=es(e);s.amp=Math.min(4,s.amp*2);if(s.ignite)s.ignite.left=3;if(s.poison)s.poison.left=5;if(s.fear)s.fear.left=3;
    if(e.burn>0)e.burnT=3;if(e.poison>0)e.poisonT=4;if(e.abilityBurn)e.abilityBurn.remaining=5;
  }
  function shock(e,a){
    const s=es(e),p=s.shockOwner;if(!p||a.noShock)return;const n=state('electric').tier===5?5:2,done=new Set([e.id]);let cur=e;
    for(let i=0;i<n;i++){
      const next=near(cur.x,cur.y,240).filter(q=>!done.has(q.id)).sort((x,y)=>G.U.dist2(cur.x,cur.y,x.x,x.y)-G.U.dist2(cur.x,cur.y,y.x,y.y))[0];if(!next)break;
      done.add(next.id);G.FX.beam(cur.x,cur.y-G.LIFT,Math.atan2(next.y-cur.y,next.x-cur.x),Math.hypot(next.x-cur.x,next.y-cur.y),8,G.U.TYPE_COLOR.electric,G.VFX.forType('electric'));
      deal(next,base('electric')*value('electric','chain'),p,'electric',{noShock:true,noDragonCount:a.noDragonCount});if(state('electric').tier===5&&Math.random()<.3)next.freezeT=Math.max(next.freezeT||0,1.5);cur=next;
    }
  }
  function afterHit(p,e,a,damage,ctx){
    if(!active()||!(damage>0))return;const s=es(e);if(ctx.shock&&!a.noShock)shock(e,a);
    if(a.typeBondSecondary){if(a.fearBurst&&e.hp>0&&Math.random()<.3)addFear(e,p);return;}
    if(!p||!team().includes(p))return;
    if(ready(p,'fighting',5)){const recent=ps(p).hurt.filter(h=>time-h.t<=3).reduce((n,h)=>n+h.n,0);if(recent)p.heal(recent*value('fighting','heal'));}
    if(ready(p,'water',5)&&ctx.wet&&a.typeCastId&&!ps(p).refunds.has(a.typeCastId)&&Math.random()<.05){const m=p.moves.find(m=>m.id===a.id);if(m){G.MovePP.add(p,[m],1);const set=ps(p).refunds;set.add(a.typeCastId);if(set.size>2048)set.delete(set.values().next().value);}}
    if(e.hp<=0)return;
    if(ready(p,'normal')){if(ctx.normal)s.normal=false;else if(Math.random()<(state('normal').tier===5?.55:.15))s.normal=true;}
    if(ready(p,'fire')&&!a.noIgnite&&Math.random()<.15)addIgnite(e,p);
    if(ready(p,'water')&&Math.random()<.4)s.wet=5;
    if(ready(p,'electric')&&Math.random()<.15){s.shock=5;s.shockOwner=p;}
    if(ready(p,'ice')&&Math.random()<.15){s.frost++;if(s.frost>=3){s.frost=0;s.frozen=Math.max(s.frozen,value('ice','freeze'));e.freezeT=Math.max(e.freezeT||0,s.frozen);}}
    if(ready(p,'poison')&&Math.random()<.2)addPoison(e,p);
    if(ready(p,'psychic')){const old=s.psychic;s.psychic+=state('psychic').tier===5?2:1;if(state('psychic').tier===5&&old>100)psychicUntil=time+2;}
    if(ready(p,'rock')&&Math.random()<.1){fields.push({kind:'rock',x:e.x,y:e.y,left:3,p,born:time});ring(e.x,e.y,24,'rock');}
    if(ready(p,'ghost')&&Math.random()<.15)addFear(e,p);
    if(ready(p,'dark')){if(state('dark').tier===5&&ctx.dot)refreshDots(e);if(Math.random()<Math.min(1,value('dark','chance'))){const r=Math.floor(Math.random()*3);if(r===0)addIgnite(e,p,'dark');else if(r===1)addPoison(e,p,1,'dark');else addFear(e,p,'dark');}}
  }
  function onDamage(p,n){if(active()&&n>0)ps(p).hurt.push({t:time,n});}
  function block(p,sourceInfo){
    if(!active()||!team().includes(p)||sourceInfo.kind!=='contact'||earth<1||state('ground').tier<2)return false;
    earth--;ring(p.x,p.y,50,'ground');if(state('ground').tier===5){const owner=source('ground')||p;for(const e of G.EnemyMgr.all().filter(e=>!e.dead)){deal(e,base('ground')*value('ground','quake'),owner,'ground');e.freezeT=Math.max(e.freezeT||0,2);}ring(p.x,p.y,380,'ground');}return true;
  }
  function contact(p,e){if(ready(p,'steel'))deal(e,(p.defenseFor({kind:'contact'})+p.defenseFor({kind:'ranged'}))*.5*value('steel','reflect'),p,'steel',{knock:260});}
  function enemySpeed(e){const s=es(e);return s.root>0||s.fear?.left>0?0:Math.max(0,1-.15*s.frost)*(s.wet>0?Math.max(0,1-value('water','slow')):1);}
  const enemyRate=e=>Math.max(.05,1-.15*es(e).frost);
  function enemyTick(e,dt){
    if(!active()||e.dead)return;const s=es(e);for(const k of ['wet','shock','frozen','root'])s[k]=Math.max(0,s[k]-dt);
    for(const key of ['ignite','poison','fear']){
      const d=s[key];if(!d||d.left<=0)continue;const step=Math.min(dt,d.left),remaining=Math.max(0,d.left-dt);d.tick-=step;
      while(d.tick<=1e-8&&!e.dead){d.tick+=1;let amount;
        if(d.type==='dark')amount=key==='fear'?e.hp*G.TypeBondDefs.interpolate([.02,.04,.05],state('dark').level)*((e.boss||e.legend)? .25:1):base('dark')*G.TypeBondDefs.interpolate(key==='poison'?[.1,.2,.3]:[.35,.8,1.5],state('dark').level)*(key==='poison'?d.n:1);
        else amount=key==='fear'?e.hp*value(d.type,'drain')*((e.boss||e.legend)? .25:1):base(d.type)*value(d.type,'dot')*(key==='poison'?d.n:1);
        deal(e,amount,d.p,d.type,{typeBondDot:true,typeBondFraction:key==='fear'});
      }
      d.left=remaining;
    }
    if(!dotPresent(e))s.amp=1;
  }
  function death(e){
    if(!active()||e.typeBondDeathDone)return;e.typeBondDeathDone=true;const s=es(e),p=e.lastAttacker,a=e.lastTypeBondAttack||{},flags={noDragonCount:!!a.noDragonCount};
    if(s.poison?.left>0&&state('poison').tier===5){const d=s.poison,targets=near(e.x,e.y,120);for(let i=0;i<targets.length;i++){const n=Math.floor(d.n/targets.length)+(i<d.n%targets.length?1:0);if(n)addPoison(targets[i],d.p,n,d.type);}area(e.x,e.y,120,d.p,'poison',base('poison')*value('poison','blast'),flags);}
    if(s.fear?.left>0&&state('ghost').tier===5&&has(s.fear.p,'ghost'))area(e.x,e.y,120,s.fear.p,'ghost',base('ghost')*value('ghost','blast'),{...flags,fearBurst:true});
    if(s.frozen>0&&state('ice').tier===5){const owner=source('ice');if(owner){const n=Math.max(1,Math.floor(value('ice','spikes'))),vis=G.VFX.forType('ice');for(let i=0;i<n;i++){const angle=i/n*Math.PI*2;G.Projectiles.spawn({x:e.x,y:e.y,vx:Math.cos(angle)*360,vy:Math.sin(angle)*360,dmg:base('ice'),r:7,life:1.5,pierce:999,hits:new Set(),owner,color:G.U.TYPE_COLOR.ice,vis,mtype:'ice',moveKind:'projectile',moveId:'typebond-ice',typeBondSecondary:true,noDragonCount:flags.noDragonCount});}}}
    if(p&&belongs(p,'fairy')&&state('fairy').tier>=2){const q=alive().sort((a,b)=>a.hp-b.hp)[0];if(q)q.heal(q.maxHp*value('fairy','heal'));}
    if(p&&team().includes(p)&&state('dragon').tier===5&&!a.noDragonCount){dragonKills++;if(dragonKills>=100){dragonKills-=100;const owner=source('dragon');if(owner){ring(captain().x,captain().y,500,'dragon');for(const foe of [...G.EnemyMgr.all()])if(!foe.dead)deal(foe,base('dragon')*value('dragon','meteor'),owner,'dragon',{noDragonCount:true});}}}
  }
  function tick(dt){
    if(!active()||!(dt>0))return;time+=dt;for(const p of team())ps(p).hurt=ps(p).hurt.filter(h=>time-h.t<=3);
    syncStats();const ground=state('ground');if(ground.tier>=2){earthTime+=dt;const interval=Math.max(.25,value('ground','interval')),limit=Math.max(1,Math.floor(value('ground','shields')));while(earthTime>=interval){earthTime-=interval;earth=Math.min(limit,earth+1);}earth=Math.min(earth,limit);}else{earth=earthTime=0;}
    const fly=state('flying');if(fly.tier>=2){windTime+=dt;const interval=fly.tier===5?.2:3;while(windTime>=interval){windTime-=interval;const p=source('flying')||captain();ring(captain().x,captain().y,240,'flying');for(const e of near(captain().x,captain().y,240)){deal(e,base('flying')*value('flying',fly.tier===5?'aura':'pulse'),p,'flying',{knock:fly.tier===5?0:260});if(fly.tier===5)e.applySlow(.55,.4);}}}else windTime=0;
    if(state('grass').tier>=2)for(const p of alive().filter(p=>has(p,'grass'))){const s=ps(p);s.grassTime=(s.grassTime||0)+dt;while(s.grassTime>=2){s.grassTime-=2;fields.push({kind:'grass',x:p.x,y:p.y,left:3,tick:1,p,born:time,r:state('grass').tier===5?175:70});ring(p.x,p.y,state('grass').tier===5?175:70,'grass');}}
    for(let i=fields.length-1;i>=0;i--){const f=fields[i],age=Math.max(0,time-Math.max(f.born,time-dt)),step=Math.min(age,f.left);f.left-=age;
      if(f.kind==='rock'&&f.left<=0){area(f.x,f.y,state('rock').tier===5?200:100,f.p,'rock',base('rock')*value('rock','impact'));if(state('rock').tier===5)rockUntil=time+2;fields.splice(i,1);}
      else if(f.kind==='grass'){f.tick-=step;while(f.tick<=1e-8){f.tick+=1;for(const e of near(f.x,f.y,f.r)){deal(e,base('grass')*value('grass','dot'),f.p,'grass');if(state('grass').tier===5)es(e).root=1;}
          if(state('grass').tier===5)for(const p of alive().filter(p=>has(p,'grass')&&G.U.dist2(p.x,p.y,f.x,f.y)<=f.r*f.r))if(Math.random()<.35)p.heal(p.maxHp*value('grass','heal'));}
        if(f.left<=0)fields.splice(i,1);
      }
    }
  }
  function drawGround(ctx){
    if(!active())return;ctx.save();for(const f of fields){if(!G.Camera.sees(f.x,f.y,f.r||120))continue;const r=f.kind==='grass'?f.r:24;ctx.globalAlpha=f.kind==='grass'?.22:.3;ctx.fillStyle=G.U.TYPE_COLOR[f.kind==='grass'?'grass':'rock'];ctx.beginPath();ctx.ellipse(f.x,f.y,r,r*.65,0,0,Math.PI*2);ctx.fill();
      if(f.kind==='grass'){ctx.globalAlpha=.6;ctx.strokeStyle='#a8e99b';ctx.lineWidth=2;for(let i=0;i<10;i++){const a=i/10*Math.PI*2;ctx.beginPath();ctx.moveTo(f.x+Math.cos(a)*r*.6,f.y+Math.sin(a)*r*.4);ctx.lineTo(f.x+Math.cos(a)*r*.75,f.y+Math.sin(a)*r*.5-7);ctx.stroke();}}
    }
    const cap=captain();if(cap&&earth>0){ctx.globalAlpha=.9;G.Icons.draw(ctx,'shield',cap.x-9,cap.y-cap.bodyH-42,18);ctx.fillStyle='#f8d4a1';ctx.font='bold 11px monospace';ctx.textAlign='left';ctx.fillText(String(earth),cap.x+12,cap.y-cap.bodyH-28);}ctx.restore();
  }
  function drawAir(ctx){if(!active())return;for(const f of fields)if(f.kind==='rock'&&G.Camera.sees(f.x,f.y,80)){const v=G.VFX.forType('rock');G.VFX.draw(ctx,v.proj,v.pal,f.x,f.y-G.LIFT-45-f.left*8,{scale:1.5,alpha:.85,frame:Math.floor(time*10)});}}
  function drawEnemy(ctx,e){
    if(!active()||!e.typeBondState||e.dead)return;const s=e.typeBondState,icons=[];
    if(s.normal)icons.push(['normal','']);if(s.ignite?.left>0)icons.push(['fire','']);if(s.wet>0)icons.push(['water','']);if(s.shock>0)icons.push(['electric','']);if(s.frost||s.frozen>0)icons.push(['ice',s.frost||'']);if(s.poison?.left>0)icons.push(['poison',s.poison.n]);if(s.fear?.left>0)icons.push(['ghost','']);if(s.psychic)icons.push(['psychic',s.psychic]);if(s.root>0)icons.push(['grass','']);
    ctx.save();ctx.font='bold 9px monospace';ctx.fillStyle='#fff';ctx.textAlign='left';icons.forEach(([type,n],i)=>{const x=e.x-icons.length*10+i*20,y=e.y-e.bodyH-43;G.Icons.draw(ctx,'type:'+type,x,y,12);if(n)ctx.fillText(String(n),x+10,y+12);});ctx.restore();
  }
  return {state,value,base,reset,beginStage,baseBonus,agility,speed,regen,defense,damageMultiplier,move,cast,beforeHit,afterHit,forceCrit,critBonus,knock,onDamage,block,contact,enemySpeed,enemyRate,enemyTick,death,tick,
    drawGround,drawAir,drawEnemy,immobile:e=>active()&&(es(e).root>0||es(e).fear?.left>0),get fields(){return fields;},get shields(){return earth;},get cluster(){return bug.stacks;},get ascended(){return bug.ascended;},get clock(){return time;}};
})();
