/* Run-only companions. Their support talents remain active when knocked out. */
G.Squad = (() => {
  let captain=null,roster=[],trail=[],level=1,nextId=1,bonus={};
  const support={
    fire:['atk',.03,'Apoyo ardiente'],fighting:['atk',.03,'Espíritu de lucha'],dark:['atk',.03,'Emboscada'],dragon:['atk',.03,'Fuerza dracónica'],
    water:['regen',.001,'Marea vital'],grass:['regen',.001,'Brote vital'],fairy:['regen',.001,'Bendición'],
    normal:['hp',.04,'Compañerismo'],rock:['hp',.04,'Firmeza'],steel:['hp',.04,'Bastión'],ground:['hp',.04,'Arraigo'],
    bug:['stamina',.05,'Reserva natural'],poison:['stamina',.05,'Metabolismo'],psychic:['stamina',.05,'Concentración'],ghost:['stamina',.05,'Vigor espectral'],
    electric:['agility',.05,'Impulso eléctrico'],ice:['agility',.05,'Mente fría'],flying:['agility',.05,'Viento favorable']
  };
  const deployed=()=>roster.slice(0,Math.max(0,G.ExpeditionRules.capacity(level)-1));
  const actors=()=>captain?[captain,...deployed()]:[];
  function growth(p,key){return captain&&actors().includes(p)?bonus[key]||0:0;}
  function refresh(){
    bonus={};for(const p of deployed()){const [key,value]=support[p.mon.types[0]]||support.normal;bonus[key]=(bonus[key]||0)+value*p.rank;}
    for(const p of [captain,...roster].filter(Boolean)){
      const value=actors().includes(p)?(bonus.hp||0)*p.baseHp:0,delta=value-(p.squadHpBonus||0);
      p.maxHp=Math.max(1,p.maxHp+delta);if(!p.dead)p.hp=Math.min(p.maxHp,Math.max(1,p.hp+delta));p.squadHpBonus=value;
    }
  }
  class Member extends G.Player{
    constructor(dex,rank=1,moveId=null){
      const perks=G.Upgrades.perks(G.DB.upgradesOf(dex));super(G.DEX_BY[dex],perks,false,dex);
      this.isSquadMember=true;this.squadId=nextId++;this.rank=rank;this.ability=null;this.activeItem=null;
      this.megaState=null;this.zState=null;this.x=captain?.x||0;this.y=captain?.y||0;this.permanentGrowth={...(perks.statGrowth||{})};
      const ids=G.Moves.poolFor(this.mon);this.addMove(moveId&&ids.includes(moveId)?moveId:G.U.pick(ids));
      this.moveId=this.moves[0].id;this.invuln=1;
    }
    isPrimaryMove(){return false;}
    ppIntervalFor(){return G.MonProgression.ppInterval(this.stamina*.5);}
    update(dt){
      this.anim.update(dt);if(this.dead)return;
      this.level=captain.level;this.invuln=Math.max(0,this.invuln-dt);this.dashGuardT=Math.max(0,this.dashGuardT-dt);this.flash=Math.max(0,this.flash-dt);this.attackFace=Math.max(0,this.attackFace-dt);
      this.slowT=Math.max(0,this.slowT-dt);this.attackDebuffT=Math.max(0,this.attackDebuffT-dt);if(!this.attackDebuffT)this.attackDebuff=0;
      for(const b of Object.values(this.buffs))if(b.n>0){b.t-=dt;if(b.t<=0)b.n=0;}
      this.regenerate(dt);this.target=G.Projectiles.nearest(G.EnemyMgr.all(),this.x,this.y,520);
      if(this.target)this.aim=Math.atan2(this.target.y-this.y,this.target.x-this.x);
      this.anim.dir=G.Sprites.dirFromAngle(this.target?this.aim:this.moveAngle);this.anim.loop(this.walking?'Walk':'Idle',1);
    }
    gainXp(){} // Only the captain receives experience and upgrade choices.
    draw(ctx){
      ctx.save();if(this.dead){ctx.filter='grayscale(1)';ctx.globalAlpha=.55;}super.draw(ctx);ctx.restore();
      const w=28,x=this.x-w/2,y=this.y-this.bodyH-12;
      ctx.fillStyle='#10213c';ctx.fillRect(x,y,w,3);ctx.fillStyle=this.dead?'#8792a4':'#7addff';ctx.fillRect(x,y,w*Math.max(0,this.hp/this.maxHp),3);
      ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=this.dead?'#9ca3af':'#bfeeff';ctx.fillText('★'.repeat(this.rank),this.x,y-3);
    }
  }
  function begin(p){captain=p;roster=[];trail=[{x:p.x,y:p.y}];level=1;bonus={};nextId=1;p.squadCaptain=true;}
  function reset(){captain=null;roster=[];trail=[];bonus={};}
  function evolve(p){
    const choices=G.ExpeditionRules.next(p.dex);if(!choices.length)return;
    const dex=G.U.pick(choices),mon=G.DEX_BY[dex],fraction=p.hp/p.maxHp,iv=G.MonProgression.values(p.ivDex),s=G.MonProgression.stats(dex,iv);
    p.mon=mon;p.dex=p.spriteDex=dex;p.baseHp=s.hp;p.baseAtk=s.atk;p.baseSpa=s.spa;p.baseDefense=s.defense;p.baseSpDef=s.spdef;p.baseSpd=s.spd;p.baseAgility=s.agility;p.baseStamina=s.stamina;
    p.squadHpBonus=0;p.maxHp=s.hp*(1+p.statGrowth.hp);p.hp=p.dead?0:p.maxHp*fraction;p.anim=new G.Sprites.Animator(dex);p.r=G.Sprites.bodyRadius(dex);p.bodyH=G.Sprites.bodyHeight(dex);
    G.Sprites.preload([dex]);
  }
  function consolidate(){
    let merged=true;while(merged){merged=false;
      for(let i=0;i<roster.length&&!merged;i++)for(let j=i+1;j<roster.length;j++){
        const a=roster[i],b=roster[j];if(a.dex!==b.dex||a.rank!==b.rank||a.rank>=3)continue;
        a.rank++;a.dead=a.dead&&b.dead;a.hp=a.dead?0:Math.max(a.hp,b.hp,1);G.Projectiles.clearOrbs(b);roster.splice(j,1);evolve(a);merged=true;break;
      }
    }
    refresh();
  }
  function recruit(dex){
    if(!captain||!G.DEX_BY[dex]||!G.SPRITE_META[dex])return null;
    const p=new Member(dex);p.level=captain.level;roster.push(p);consolidate();G.Sprites.preload([dex]);return p;
  }
  function reorder(index,dir){const j=index+dir;if(j<0||j>=roster.length)return false;[roster[index],roster[j]]=[roster[j],roster[index]];refresh();return true;}
  function upgrade(){if(level>=G.ExpeditionRules.MAX_SHOP)return false;level++;refresh();return true;}
  function tick(dt){
    if(!captain)return;refresh();const last=trail[0],d=Math.hypot(captain.x-last.x,captain.y-last.y);
    if(d>500){trail=Array.from({length:120},()=>({x:captain.x,y:captain.y}));}
    else if(d>=3){const steps=Math.ceil(d/3);for(let n=1;n<=steps;n++)trail.unshift({x:last.x+(captain.x-last.x)*n/steps,y:last.y+(captain.y-last.y)*n/steps});trail.length=Math.min(trail.length,1200);}
    const front=deployed();for(let i=0;i<front.length;i++){
      const p=front[i];p.level=captain.level;
      const desired=(i+1)*34;let walked=0,point=trail[trail.length-1];
      for(let j=1;j<trail.length;j++){walked+=Math.hypot(trail[j].x-trail[j-1].x,trail[j].y-trail[j-1].y);if(walked>=desired){point=trail[j];break;}}
      const dx=point.x-p.x,dy=point.y-p.y,len=Math.hypot(dx,dy),step=Math.min(len,Math.max(100,captain.spd*1.35)*(p.slowT>0?.5:1)*dt);
      p.walking=len>3;if(len>0){p.x+=dx/len*step;p.y+=dy/len*step;p.moveAngle=Math.atan2(dy,dx);}G.World.collide(p);p.update(dt);
    }
    // Reserves share level, but contribute neither attacks nor support talents.
    for(const p of roster)p.level=captain.level;
  }
  function recover(){for(const p of roster){p.level=captain.level;p.dead=false;p.hp=p.maxHp;p.invuln=1;G.MovePP?.restore(p,p.moves);p.anim._start?.('Idle',false);G.Projectiles.clearOrbs(p);}trail=[{x:captain.x,y:captain.y}];for(const p of roster){p.x=captain.x;p.y=captain.y;}}
  function tags(p){return {types:p.mon.types,eggs:G.EGG_GROUPS[p.dex]||[15],skill:p.moves[0]?.kind};}
  function talent(p){const [key,value,name]=support[p.mon.types[0]]||support.normal;return {key,value:value*p.rank,name};}
  return {refresh,begin,reset,recruit,consolidate,reorder,upgrade,tick,recover,deployed,actors,growth,tags,talent,support,Member,
    get active(){return !!captain;},get roster(){return roster;},get shopLevel(){return level;},get capacity(){return G.ExpeditionRules.capacity(level);}};
})();
