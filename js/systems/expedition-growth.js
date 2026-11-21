/* Run-wide companion rewards and level growth. */
G.ExpeditionGrowth=(()=>{
  const KEYS=['hp','atk','spa'];
  let berries={};
  function sync(p){
    if(!G.Squad?.active)return;
    const list=p?[p]:[...G.Squad.actors(),...G.Squad.reserves()];
    for(const a of list){
      const level=G.Game?.player?.level||G.Squad.actors()[0]?.level||a.level;
      const desired={...(a.isSquadMember?berries:{})};
      const levelsGained=Math.max(0,level-1);
      for(const key of KEYS){
        const perLevel=G.EconomyConfig.levelGrowth[key];
        desired[key]=(desired[key]||0)+levelsGained*perLevel;
      }
      const old=a.expeditionGrowth||{};
      for(const key of new Set([...Object.keys(old),...Object.keys(desired)])){
        const delta=(desired[key]||0)-(old[key]||0);if(!delta)continue;
        if(key==='maxpp')G.MovePP.increaseMax(a,delta);
        else if(key==='temppp')a.tempPP=Math.max(0,(a.tempPP||0)+delta);
        else a.growStat(key,delta);
      }
      if(a.dead)a.hp=0;
      a.expeditionGrowth=desired;
    }
  }
  function reset(){berries={};}
  function reward(stat,amount){const keys={hp:['hp'],attacks:['atk','spa'],defenses:['defense','spdef']}[stat];if(!G.Squad?.active||!keys||!Number.isFinite(amount)||amount<=0)return false;for(const key of keys)berries[key]=(berries[key]||0)+amount*.5;sync();return true;}
  return {restore:saved=>{berries={...saved};},KEYS,sync,reset,reward,get berries(){return {...berries};}};
})();
