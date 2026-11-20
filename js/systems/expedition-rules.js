/* Pure rules shared by the expedition UI, tests and account service. */
G.ExpeditionRules = (() => {
  const DAYS=20, COLS=7, MAX_SHOP=6, FINAL_CHASE=20;
  const days=()=>G.EconomyConfig?.cycleLengthDays||DAYS;
  const weights=[['battle',10],['elite',2],['shop',5],['rest',5],['training',3]];
  function roll(rng=Math.random){const table=G.EconomyConfig?Object.entries(G.EconomyConfig.eventWeights):weights;let n=rng()*table.reduce((n,[,w])=>n+w,0);for(const [id,w]of table){n-=w;if(n<0)return id;}return table[0][0];}
  function matrix(cycle=1,rng=Math.random){
    return Array.from({length:days()+1},(_,r)=>Array.from({length:COLS},(_,c)=>({kind:r===0?'start':r===days()?'boss':roll(rng),row:r,col:c,day:(cycle-1)*days()+r})));
  }
  const reachable=(row,col,r,c)=>r===row+1&&c>=0&&c<COLS&&Math.abs(c-col)<=1;
  const cycleOf=day=>Math.floor(Math.max(0,day-1)/days())+1;
  const capacity=level=>G.EconomyConfig?G.EconomyConfig.levels.find(row=>row.level===level).squadCap:3+Math.max(1,Math.min(MAX_SHOP,level));
  const upgradeCost=level=>60+level*45;
  const wave=(day,kind='battle')=>{
    const cycle=cycleOf(day),within=(day-1)%days()+1,boost=Math.pow(3,cycle-1);
    const standardDuration=Math.min(60,24+day*1.2),t=G.EconomyConfig.battleTiming;
    const duration=kind==='elite'?t.eliteSeconds:kind==='boss'?t.bossSeconds:standardDuration+FINAL_CHASE;
    const enrageAt=kind==='elite'?t.eliteEnrageAt:kind==='boss'?t.bossEnrageAt:standardDuration;
    return {count:2*Math.round(12+Math.min(72,day*2)),standardDuration,duration,enrageAt,
      hp:5*(1+.8*Math.pow(within/20,1.7))*boost,dmg:(1+.35*Math.pow(within/20,1.3))*Math.pow(1.8,cycle-1),
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
  function formForRank(dex,rank,rng=Math.random){
    if(!G.DEX_BY[dex]||!Number.isInteger(rank)||rank<1||rank>3)return dex;
    const root=G.MonProgression.rootFor(dex),hint=G.MonProgression.pathFor(dex),depth=hint.indexOf(dex);let current=root;
    for(let step=1;step<rank;step++){const children=next(current).filter(d=>G.DEX_BY[d]);if(!children.length)break;current=depth>=step&&children.includes(hint[step])?hint[step]:children[Math.min(children.length-1,Math.floor(rng()*children.length))];}
    return current;
  }
  const qualityRates=[[.70,.25,.05,0,0],[.50,.30,.17,.03,0],[.30,.35,.25,.09,.01],[.15,.30,.32,.20,.03],[.08,.20,.32,.32,.08],[.03,.10,.25,.40,.22]];
  const ratesAt=level=>G.EconomyConfig?G.EconomyConfig.levels[Math.max(0,Math.min(G.EconomyConfig.levels.length-1,Math.floor(level)-1))].odds.map(n=>n/100):qualityRates[Math.max(0,Math.min(MAX_SHOP-1,Math.floor(level)-1))];
  const quality=mon=>G.ExpeditionQuality?.quality(mon)||mon.rarity;
  function shopFamilies(pool){
    const roots=new Set(pool.map(mon=>formForRank(mon.dex,1)));
    return [...roots].map(dex=>G.DEX_BY[dex]);
  }
  function encounterCandidates(pool,day,boss){
    const maxRarity=Math.min(4,Math.ceil(((day-1)%DAYS+1)/4));
    return pool.filter(mon=>boss?mon.bst>=480:mon.rarity<=maxRarity&&mon.bst<700);
  }
  function shopMon(pool,level,rng=Math.random){
    const families=shopFamilies(pool),buckets=Array.from({length:5},(_,i)=>families.filter(p=>quality(p)===i+1)),rates=ratesAt(level);
    const sum=rates.reduce((n,w,i)=>n+(buckets[i].length?w:0),0);if(!sum)return families[Math.min(families.length-1,Math.floor(rng()*families.length))];
    let roll=rng()*sum;for(let i=0;i<5;i++)if(buckets[i].length){roll-=rates[i];if(roll<0){const a=buckets[i];return a[Math.min(a.length-1,Math.floor(rng()*a.length))];}}return families[0];
  }
  function lootCompanion(appeared,pool,level,rng=Math.random){
    const cap=ratesAt(level).reduce((max,chance,i)=>chance>0?i+1:max,1);
    const eligible=entries=>shopFamilies(entries).filter(mon=>G.SPRITE_META[mon.dex]&&quality(mon)<=cap);
    let candidates=eligible([...appeared].map(dex=>G.DEX_BY[dex]).filter(Boolean));
    if(!candidates.length)candidates=eligible(pool);
    if(!candidates.length)candidates=eligible(G.DEX);
    return candidates[Math.floor(rng()*candidates.length)]?.dex||null;
  }
  const monCost=p=>G.EconomyConfig?G.EconomyConfig.unitTiers[quality(p)].cost:18+quality(p)*12;
  const rankRates=Array.from({length:MAX_SHOP},()=>[1,0,0]);
  function shopRank(level,rng=Math.random){const rates=rankRates[Math.max(0,Math.min(MAX_SHOP-1,Math.floor(level)-1))];let n=rng();for(let i=0;i<3;i++){n-=rates[i];if(n<0)return i+1;}return 3;}
  function progress(input,old={}){
    const day=Math.max(0,Math.min(10000,Math.floor(Number(input?.day)||0))),arceus=!!(old.arceus||day>=60&&input?.arceus===true);
    return {day:Math.max(day,old.day||0),arceus,cashout:arceus&&day===60&&input?.cashout===true&&!(old.arceus&&old.cashout===false)};
  }
  return {DAYS,COLS,MAX_SHOP,FINAL_CHASE,weights,matrix,reachable,cycleOf,capacity,upgradeCost,wave,generations,pool,next,border,formForRank,shopFamilies,encounterCandidates,shopMon,lootCompanion,shopRank,rankRates,qualityRates,monCost,progress};
})();
