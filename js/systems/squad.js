/* Run-only companions. Expedition traits replace legacy primary-type support. */
G.Squad = (() => {
  let captain=null,roster=[],trail=[],formation=[],level=1,nextId=1,bonus={},still=0,leaderPos=null,gathering=false;
  const RESERVE_LIMIT=4;
  const starSnapshot=p=>({dex:p.dex,spriteDex:p.spriteDex,shiny:!!p.shiny,rank:p.isSquadMember?p.rank:p.trainerRank||1,name:p.mon.name});
  const showRankUp=(before,p)=>G.SquadUI?.rankUp?.(before,starSnapshot(p));
  const support={
    fire:['atk',.03,'Apoyo ardiente'],fighting:['atk',.03,'Espíritu de lucha'],dark:['atk',.03,'Emboscada'],dragon:['atk',.03,'Fuerza dracónica'],
    water:['regen',.001,'Marea vital'],grass:['regen',.001,'Brote vital'],fairy:['regen',.001,'Bendición'],
    normal:['hp',.04,'Compañerismo'],rock:['hp',.04,'Firmeza'],steel:['hp',.04,'Bastión'],ground:['hp',.04,'Arraigo'],
    bug:['stamina',.05,'Reserva natural'],poison:['stamina',.05,'Metabolismo'],psychic:['stamina',.05,'Concentración'],ghost:['stamina',.05,'Vigor espectral'],
    electric:['agility',.05,'Impulso eléctrico'],ice:['agility',.05,'Mente fría'],flying:['agility',.05,'Viento favorable']
  };
  const deployed=()=>formation.filter(p=>p&&roster.includes(p));
  const reserves=()=>roster.filter(p=>!deployed().includes(p));
  const actors=()=>captain?[captain,...deployed()]:[];
  const capacity=()=>G.Expedition?.run?.trainerLevel?G.Economy.capacity(G.Expedition.run):G.ExpeditionRules.capacity(level);
  function buffTargets(p){const team=actors(),i=team.indexOf(p);return i<0?[p]:team.slice(Math.max(0,i-1),i+2).filter(q=>!q.dead);}
  function growth(p,key){return captain&&actors().includes(p)?bonus[key]||0:0;}
  function refresh(){
    G.SquadBonds?.refresh();
    bonus={};for(const p of (G.SquadTraits?[]:deployed())){const [key,value]=support[p.mon.types[0]]||support.normal;bonus[key]=(bonus[key]||0)+value*p.rank;}
    for(const p of [captain,...roster].filter(Boolean)){
      G.ExpeditionQuality?.sync(p);
      const value=actors().includes(p)?(bonus.hp||0)*p.baseHp:0,delta=value-(p.squadHpBonus||0);
      p.maxHp=Math.max(1,p.maxHp+delta);if(!p.dead)p.hp=Math.min(p.maxHp,Math.max(1,p.hp+delta));p.squadHpBonus=value;
    }
    G.TrainerTalents?.sync();
  }
  class Member extends G.Player{
    constructor(dex,rank=1,moveId=null){
      dex=G.ExpeditionRules.formForRank(dex,rank);
      const perks=G.Upgrades.perks(G.DB.upgradesOf(dex)),iv=G.MonProgression.normalizeIV(G.DB.save?.owned?.[dex]?.iv);super(G.DEX_BY[dex],perks,false,dex,iv);
      this.isSquadMember=true;this.squadId=nextId++;this.rank=rank;this.ability=null;this.activeItem=null;
      this.poolCopies=(G.EconomyConfig?.compatibility.mergeCopies||2)**(rank-1);
      this.megaState=null;this.zState=null;this.x=captain?.x||0;this.y=captain?.y||0;this.permanentGrowth={...(perks.statGrowth||{})};
      const ids=G.Moves.poolFor(this.mon);this.addMove(moveId&&ids.includes(moveId)?moveId:(G.FIXED_SKILLS?.[dex]||G.Moves.startFor(this.mon)));
      this.moveId=this.moves[0].id;G.SquadTraits?.assign(this);rankMove(this);G.ExpeditionQuality?.sync(this);this.invuln=1;
    }
    get atk(){return super.atk*(G.ExpeditionQuality?.factors(this).ad||1);}
    get spa(){return super.spa*(G.ExpeditionQuality?.factors(this).ad||1);}
    addMaxHp(amount){super.addMaxHp(amount*(G.ExpeditionQuality?.factors(this).hp||1));}
    isPrimaryMove(){return false;}
    agilityFor(m){return super.agilityFor(m)*(G.SquadBonds?.agility(this,m)||1);}
    staminaFor(m){return super.staminaFor(m)*(G.SquadBonds?.stamina(this,m)||1);}
    ppIntervalFor(m){return G.MonProgression.ppInterval(this.staminaFor(m));}
    update(dt){
      this.anim.update(dt);if(this.dead)return;
      this.level=captain.level;this.invuln=Math.max(0,this.invuln-dt);this.dashGuardT=Math.max(0,this.dashGuardT-dt);this.flash=Math.max(0,this.flash-dt);this.attackFace=Math.max(0,this.attackFace-dt);
      this.slowT=Math.max(0,this.slowT-dt);this.attackDebuffT=Math.max(0,this.attackDebuffT-dt);if(!this.attackDebuffT)this.attackDebuff=0;
      for(const b of Object.values(this.buffs))if(b.n>0){b.t-=dt;if(b.t<=0)b.n=0;}
      this.regenerate(dt);if(!G.SquadAssault?.controls(this))this.target=G.Projectiles.nearest(G.EnemyMgr.all(),this.x,this.y,520);
      if(this.target)this.aim=Math.atan2(this.target.y-this.y,this.target.x-this.x);
      const face=this.attackFace>0||!this.walking?this.aim:this.moveAngle;
      this.anim.dir=G.Sprites.dirFromAngle(face);this.anim.loop(this.walking?'Walk':'Idle',this.walking?Math.max(.6,Math.min(1.8,(this.followSpeed||110)/110)):1);
    }
    gainXp(){} // Only the captain receives experience and upgrade choices.
    draw(ctx){
      ctx.save();if(this.dead){ctx.filter='grayscale(1)';ctx.globalAlpha=.55;}super.draw(ctx);ctx.restore();
      const w=28,x=this.x-w/2,y=this.y-this.bodyH-12;
      ctx.strokeStyle=G.ExpeditionQuality?.color(this)||'#7addff';ctx.lineWidth=1.5;ctx.strokeRect(x-1,y-1,w+2,5);ctx.fillStyle='#10213c';ctx.fillRect(x,y,w,3);ctx.fillStyle=this.dead?'#8792a4':'#7addff';ctx.fillRect(x,y,w*Math.max(0,this.hp/this.maxHp),3);
      ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=this.dead?'#9ca3af':'#bfeeff';ctx.fillText('★'.repeat(this.rank),this.x,y-3);
    }
  }
  function resetFollow(){still=0;gathering=false;leaderPos=captain?{x:captain.x,y:captain.y}:null;for(const p of roster)p.idleTarget=null;}
  function begin(p){G.TypeBonds?.reset();captain=p;roster=[];trail=[{x:p.x,y:p.y}];level=1;formation=Array(G.ExpeditionRules.capacity(level)-1).fill(null);bonus={};nextId=1;p.squadCaptain=true;resetFollow();G.SquadBonds?.reset();G.ExpeditionGrowth?.reset();G.ExpeditionDamage?.reset();G.SquadTraits?.reset();G.ExpeditionGrowth?.sync();refresh();}
  function reset(){G.SquadUI?.clearRankUps?.();G.TypeBonds?.reset();captain=null;roster=[];trail=[];formation=[];bonus={};resetFollow();G.SquadBonds?.reset();G.SquadTraits?.reset();}
  function rankMove(p){
    G.Projectiles.clearOrbs(p);
    const m=p.moves[0],target=p.rank===1?2:p.rank===2?5:m.def.maxLvl;
    while(m.lvl<Math.min(target,m.def.maxLvl))G.Moves.levelUp(m);
    if(p.rank===3&&!m.evolved){
      // Attribute moves have no original superweapon: their squad ultimate doubles stacks.
      if(!G.Moves.evolve(m)&&m.kind==='buff'){m.stacks=(m.stacks||1)*2;m.evolved=true;m.squadUltimate=true;}
    }
    G.MovePP?.restore(p,[m]);
  }
  function evolve(p){
    const choices=G.ExpeditionRules.next(p.dex);if(!choices.length)return;
    if(!p.isSquadMember&&G.Mega?.active(p))G.Mega.finish(p);
    const dex=G.U.pick(choices),mon=G.DEX_BY[dex],fraction=p.hp/p.maxHp,iv=G.MonProgression.normalizeIV(G.DB.save?.owned?.[dex]?.iv),s=G.MonProgression.stats(dex,iv);
    p.mon=mon;p.dex=p.spriteDex=p.ivDex=dex;p.baseHp=s.hp;p.baseAtk=s.atk;p.baseSpa=s.spa;p.baseDefense=s.defense;p.baseSpDef=s.spdef;p.baseSpd=s.spd;p.baseAgility=s.agility;p.baseStamina=s.stamina;
    p.squadHpBonus=0;p.talentHpBonus=0;p.qualityHpFactor=p.isSquadMember?(G.ExpeditionQuality?.factors(p).hp||1):1;p.maxHp=s.hp*(1+p.statGrowth.hp)*p.qualityHpFactor;p.hp=p.dead?0:p.maxHp*fraction;p.anim=new G.Sprites.Animator(dex);p.r=G.Sprites.bodyRadius(dex);p.bodyH=G.Sprites.bodyHeight(dex);
    if(!p.isSquadMember){p.monStage=dex;p.evolutionPath=G.MonProgression.pathFor(dex);p.ability=G.Abilities.equipped(G.DB.save,dex)||null;G.Mega?.init(p,G.DB.save);}
    G.Sprites.preload([dex]);
  }
  function consolidate(){
    let merged=true;while(merged){merged=false;
      for(let i=0;i<roster.length&&!merged;i++)for(let j=i+1;j<roster.length;j++){
        const a=roster[i],b=roster[j];if(G.MonProgression.rootFor(a.dex)!==G.MonProgression.rootFor(b.dex)||a.rank!==b.rank||a.rank>=3)continue;
        const before=starSnapshot(a),ai=formation.indexOf(a),bi=formation.indexOf(b);if(bi>=0){formation[bi]=ai<0?a:null;if(ai<0){a.x=b.x;a.y=b.y;}}
        a.poolCopies=(a.poolCopies??2**(a.rank-1))+(b.poolCopies??2**(b.rank-1));a.rank++;a.dead=a.dead&&b.dead;a.hp=a.dead?0:Math.max(a.hp,b.hp,1);G.Projectiles.clearOrbs(b);roster.splice(j,1);evolve(a);rankMove(a);refresh();G.SquadTraits?.merge(a,b);showRankUp(before,a);merged=true;break;
      }
    }
    refresh();
  }
  function recruit(dex,moveId=null,rank=1,options={}){
    dex=G.ExpeditionRules.formForRank(dex,rank);if(!canRecruit(dex,rank))return null;
    const p=new Member(dex,rank,moveId);if(options.poolCopies!=null)p.poolCopies=options.poolCopies;p.level=captain.level;roster.push(p);G.ExpeditionGrowth?.sync(p);const slot=formation.indexOf(null);if(slot>=0)formation[slot]=p;consolidate();G.Sprites.preload([dex]);return p;
  }
  function canRecruit(dex,rank=1){dex=G.ExpeditionRules.formForRank(dex,rank);return !!captain&&Number.isInteger(rank)&&rank>=1&&rank<=3&&!!G.DEX_BY[dex]&&!!G.SPRITE_META[dex]&&(formation.includes(null)||reserves().length<RESERVE_LIMIT||rank<3&&roster.some(p=>G.MonProgression.rootFor(p.dex)===G.MonProgression.rootFor(dex)&&p.rank===rank));}
  function remove(p,sell){const i=roster.indexOf(p);if(i<0)return false;const r=G.Expedition?.run;if(r?.unitPool){if(sell)r.gold+=r.unitPool.sellValue(p);r.unitPool.returnCopies(p.dex,p.poolCopies??r.unitPool.copies(p.rank));}if(sell)G.SquadTraits?.release(p);const slot=formation.indexOf(p);if(slot>=0)formation[slot]=null;for(const shot of [...G.Projectiles.all()])if(shot.owner===p)G.Projectiles.remove(shot);G.Combat?.clearFields(p);roster.splice(i,1);refresh();return true;}
  const release=p=>remove(p,true);
  const consume=p=>remove(p,false);
  function promote(p,material){if(!roster.includes(p)||p.rank>=G.EconomyConfig.compatibility.maxRank)return false;const before=starSnapshot(p);p.rank++;evolve(p);rankMove(p);refresh();G.SquadTraits?.merge(p,material);showRankUp(before,p);consolidate();return true;}
  function reorder(index,dir){const j=index+dir;if(j<0||j>=roster.length)return false;[roster[index],roster[j]]=[roster[j],roster[index]];formation=Array.from({length:capacity()-1},(_,i)=>roster[i]||null);refresh();return true;}
  function syncTrainer(){
    const r=G.Expedition?.run;if(r?.trainerLevel)level=r.trainerLevel;
    while(formation.length<capacity()-1)formation.push(reserves()[0]||null);
    if(r?.trainerLevel&&captain){const target=G.EconomyConfig.captainEvolutionLevels.filter(l=>level>=l).length;captain.trainerRank||=1;while(captain.trainerRank<target){const before=starSnapshot(captain);captain.trainerRank++;evolve(captain);showRankUp(before,captain);}}
    refresh();
  }
  function upgrade(){const r=G.Expedition?.run;if(r?.trainerLevel){if(!G.Economy.buyXp(r))return false;syncTrainer();return true;}if(level>=G.ExpeditionRules.MAX_SHOP)return false;level++;formation.push(reserves()[0]||null);refresh();return true;}
  function place(p,slot){
    if(!roster.includes(p)||!Number.isInteger(slot)||slot<0||slot>=formation.length)return false;
    const old=formation.indexOf(p),other=formation[slot];if(old===slot)return false;
    if(old>=0)formation[old]=other;formation[slot]=p;refresh();return true;
  }
  function bench(p){const i=formation.indexOf(p);if(i<0||reserves().length>=RESERVE_LIMIT)return false;formation[i]=null;refresh();return true;}
  function swap(p,q){
    if(!roster.includes(p)||!roster.includes(q)||p===q)return false;
    const qi=formation.indexOf(q),pi=formation.indexOf(p);if(qi>=0)return place(p,qi);if(pi>=0)return place(q,pi);
    const a=roster.indexOf(p),b=roster.indexOf(q);[roster[a],roster[b]]=[roster[b],roster[a]];return true;
  }
  function tick(dt){
    if(!captain)return;G.ExpeditionGrowth?.sync();refresh();const delta=leaderPos?Math.hypot(captain.x-leaderPos.x,captain.y-leaderPos.y):0,moving=delta>.01;
    leaderPos={x:captain.x,y:captain.y};still=moving?0:still+dt;
    if(moving&&gathering){trail=[{...leaderPos}];gathering=false;for(const p of roster)p.idleTarget=null;}
    if(still>(G.TrainerTalents?.gatherDelay()??.22))gathering=true;
    const last=trail[0],d=Math.hypot(captain.x-last.x,captain.y-last.y);
    if(d>500){trail=Array.from({length:120},()=>({x:captain.x,y:captain.y}));}
    else if(d>=3){const steps=Math.ceil(d/3);for(let n=1;n<=steps;n++)trail.unshift({x:last.x+(captain.x-last.x)*n/steps,y:last.y+(captain.y-last.y)*n/steps});trail.length=Math.min(trail.length,1200);}
    const front=deployed();for(let i=0;i<front.length;i++){
      const p=front[i];p.level=captain.level;
      if(p.dead){p.walking=false;p.update(dt);continue;}
      const desired=(i+1)*34;let walked=0,point=trail[trail.length-1];
      for(let j=1;j<trail.length;j++){walked+=Math.hypot(trail[j].x-trail[j-1].x,trail[j].y-trail[j-1].y);if(walked>=desired){point=trail[j];break;}}
      let pace=Math.max(100,captain.spd*1.35);
      if(gathering){
        p.idleT=(p.idleT||0)-dt;
        if(!p.idleTarget||p.idleT<=0||Math.hypot(p.x-p.idleTarget.x,p.y-p.idleTarget.y)<5){
          p.idleT=.55+Math.random()*.65;p.idleTarget=null;
          const base=i/front.length*Math.PI*2,radius=Math.max(54,captain.r+p.r+25,front.length*13);
          for(let attempt=0;attempt<16;attempt++){
            const a=base+(Math.random()-.5)*.65+(attempt>7?attempt*.6:0),r=radius+(Math.random()-.5)*22;
            const q={x:captain.x+Math.cos(a)*r,y:captain.y+Math.sin(a)*r};
            if((!G.World.isFree||G.World.isFree(q.x,q.y,p.r,true))&&(!G.World.arenaContains||G.World.arenaContains(q.x,q.y,p.r))){p.idleTarget=q;break;}
          }
        }
        point=p.idleTarget||{x:captain.x,y:captain.y};
        if(Math.hypot(p.x-captain.x,p.y-captain.y)<Math.max(100,front.length*13+30))pace=30+i%3*5;
      }
      const sortie=G.SquadAssault?.plan(p,captain,point);if(sortie){point=sortie.point;pace=sortie.pace;}
      let dx=point.x-p.x,dy=point.y-p.y,len=Math.hypot(dx,dy);
      if(gathering&&len>120&&!sortie){const dir=G.Path.dirFor(p,captain);if(dir){dx=dir[0];dy=dir[1];}}
      const angle=Math.atan2(dy,dx),step=Math.min(len,pace*(p.slowT>0?.5:1)*dt),ox=p.x,oy=p.y;
      for(const turn of [0,.7,-.7,1.3,-1.3]){
        const x=ox+Math.cos(angle+turn)*step,y=oy+Math.sin(angle+turn)*step;
        if(G.World.isFree&&!G.World.isFree(x,y,p.r,true)||G.World.arenaContains&&!G.World.arenaContains(x,y,p.r))continue;
        p.x=x;p.y=y;G.World.collide(p);break;
      }
      let moved=Math.hypot(p.x-ox,p.y-oy);
      p.stuckTime=len>8&&moved<.1?(p.stuckTime||0)+dt:0;
      if(p.stuckTime>2){
        const candidates=[{x:captain.x,y:captain.y}];for(let a=0;a<16;a++)candidates.push({x:captain.x+Math.cos(a*Math.PI/8)*42,y:captain.y+Math.sin(a*Math.PI/8)*42});
        const free=candidates.find(q=>(!G.World.isFree||G.World.isFree(q.x,q.y,p.r,true))&&(!G.World.arenaContains||G.World.arenaContains(q.x,q.y,p.r)));
        if(free){p.x=free.x;p.y=free.y;p.stuckTime=0;p.idleTarget=null;moved=0;G.SquadAssault?.recalled(p);G.Projectiles.clearOrbs(p);}
      }
      // Sampled path targets can be reached between samples. Keep walking through these tiny gaps.
      p.walkGrace=moved>.01?.18:Math.max(0,(p.walkGrace||0)-dt);
      p.walking=!p.dead&&(p.walkGrace>0||gathering);p.followSpeed=G.U.damp(p.followSpeed||0,dt>0?moved/dt:0,10,dt);
      if(moved>.01)p.moveAngle=Math.atan2(p.y-oy,p.x-ox);p.update(dt);
    }
    // Reserves share level, but contribute neither attacks nor support talents.
    for(const p of roster)p.level=captain.level;
  }
  function recover(){for(const p of roster){p.level=captain.level;G.SquadAssault?.reset(p);p.dead=false;p.walking=false;p.walkGrace=0;p.followSpeed=0;p.hp=p.maxHp;p.invuln=1;G.MovePP?.restore(p,p.moves);p.anim._start?.('Idle',false);G.Projectiles.clearOrbs(p);}trail=[{x:captain.x,y:captain.y}];resetFollow();for(const p of roster){p.x=captain.x;p.y=captain.y;}}
  function tags(p){return {types:p.mon.types,eggs:G.EGG_GROUPS[p.dex]||[15],skill:G.SquadBonds.group(p.moves[0]?.kind)};}
  function talent(p){if(G.SquadTraits){const d=G.SquadTraits.def(p);return {...d,name:G.SquadTraits.local(d.name),description:G.SquadTraits.description(p)};}const [key,value,name]=support[p.mon.types[0]]||support.normal;return {key,value:value*p.rank,name};}
  return {refresh,begin,reset,recruit,canRecruit,release,consume,promote,RESERVE_LIMIT,buffTargets,consolidate,reorder,place,bench,swap,reserves,upgrade,syncTrainer,tick,recover,deployed,actors,growth,tags,talent,support,Member,rankMove,
    get gathering(){return gathering;},get active(){return !!captain;},get roster(){return roster;},get formation(){return formation.slice();},get shopLevel(){return level;},get capacity(){return capacity();}};
})();
