/* Pure rules shared by the expedition UI, tests and account service. */
G.ExpeditionRules = (() => {
  const DAYS=20, COLS=7, MAX_SHOP=6;
  const weights=[['battle',10],['elite',2],['shop',5],['rest',5]];
  function roll(rng=Math.random){let n=rng()*22;for(const [id,w]of weights){n-=w;if(n<0)return id;}return 'rest';}
  function matrix(cycle=1,rng=Math.random){
    return Array.from({length:DAYS+1},(_,r)=>Array.from({length:COLS},(_,c)=>({kind:r===0?'start':r===DAYS?'boss':roll(rng),row:r,col:c,day:(cycle-1)*DAYS+r})));
  }
  const reachable=(row,col,r,c)=>r===row+1&&c>=0&&c<COLS&&Math.abs(c-col)<=1;
  const cycleOf=day=>Math.floor(Math.max(0,day-1)/DAYS)+1;
  const capacity=level=>3+Math.max(1,Math.min(MAX_SHOP,level));
  const upgradeCost=level=>60+level*45;
  const wave=day=>{
    const cycle=cycleOf(day),within=(day-1)%DAYS+1,boost=Math.pow(3,cycle-1);
    return {count:Math.round(12+Math.min(72,day*2)),duration:Math.min(60,24+day*1.2),
      hp:(1+.8*Math.pow(within/20,1.7))*boost,dmg:(1+.35*Math.pow(within/20,1.3))*Math.pow(1.8,cycle-1),
      speed:Math.min(1.8,1+within*.005+(cycle-1)*.12),coins:Math.round(35+day*4)};
  };
  function generations(captain,rng=Math.random){
    const available=[...new Set(G.DEX.filter(p=>G.SPRITE_META[p.dex]).map(p=>p.gen))],out=[captain.gen];
    while(out.length<Math.min(3,available.length)){const candidates=available.filter(g=>!out.includes(g));out.push(candidates[Math.min(candidates.length-1,Math.floor(rng()*candidates.length))]);}
    return out.sort((a,b)=>a-b);
  }
  function pool(gens){return G.DEX.filter(p=>gens.includes(p.gen)&&G.SPRITE_META[p.dex]);}
  function next(dex){
    const found=new Set();for(const path of Object.values(G.EVOLUTION_PATHS||{})){const i=path.indexOf(dex);if(i>=0&&path[i+1]&&G.SPRITE_META[path[i+1]])found.add(path[i+1]);}
    return [...found];
  }
  function border(save,dex){
    if(!save?.owned?.[dex])return 'white';const raw=save.owned[dex]?.iv||[],iv=G.MonProgression.normalizeIV(raw),sum=iv.reduce((a,b)=>a+b,0);
    return sum===248?'red':sum>=192?'orange':sum>=120?'purple':'blue';
  }
  function shopMon(pool,level,rng=Math.random){
    const cap=Math.min(5,1+Math.floor(level*.75)),candidates=pool.filter(p=>p.rarity<=cap);
    if(!candidates.length)return pool[0];
    const weighted=candidates.flatMap(p=>Array(Math.max(1,6-Math.abs(p.rarity-Math.ceil(level*.7))*2)).fill(p));
    return weighted[Math.min(weighted.length-1,Math.floor(rng()*weighted.length))];
  }
  const monCost=p=>18+p.rarity*12;
  function progress(input,old={}){
    const day=Math.max(0,Math.min(10000,Math.floor(Number(input?.day)||0))),arceus=!!(old.arceus||day>=60&&input?.arceus===true);
    return {day:Math.max(day,old.day||0),arceus,cashout:arceus&&day===60&&input?.cashout===true&&!(old.arceus&&old.cashout===false)};
  }
  return {DAYS,COLS,MAX_SHOP,weights,matrix,reachable,cycleOf,capacity,upgradeCost,wave,generations,pool,next,border,shopMon,monCost,progress};
})();
