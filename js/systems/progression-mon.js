/* Individual values, evolution chains and deferred wild captures. */
G.MonProgression = (() => {
  /* Generated from all available PokeAPI evolution chains. PATHS keeps one
     deterministic route per species so branching families can follow the
     selected Pokédex target while every run starts at the chain root. */
  const CHAINS = G.EVOLUTION_CHAINS || {
    1: [1, 2, 3], 4: [4, 5, 6], 7: [7, 8, 9], 25: [25, 26]
  };
  const PATHS = G.EVOLUTION_PATHS || CHAINS;
  const chainBy = {};
  for (const [key, chain] of Object.entries(PATHS)) {
    for (const dex of chain) chainBy[dex] = chain;
    chainBy[+key] = chain;
  }
  const pathFor = dex => PATHS[dex] || chainBy[dex] || [dex];
  const rootFor = dex => pathFor(dex)[0];
  // Include every branch, not just the deterministic in-run evolution route.
  function familyFor(dex) {
    const root = rootFor(dex), family = new Set([dex]);
    for (const path of Object.values(PATHS)) if (path[0] === root) for (const d of path) if (G.DEX_BY[d]) family.add(d);
    return [...family].filter(d => G.DEX_BY[d]).sort((a,b) => a-b);
  }
  const ivMod = iv => 0.75 + 0.65 * Math.pow(Math.max(0, Math.min(30, iv - 1)) / 30, 2);
  // Preserve HP/Attack/Speed/SpAtk/Defense/SpDef; append Agility and Stamina.
  const AGILITY_STANDARD=80;
  const agilityBase=p=>Math.max(1,p.baseStats?.spe??(((p.spd-78)/.42)||80));
  const staminaBase=p=>Math.max(1,p.baseStats?(p.baseStats.def+p.baseStats.spd)/2:80);
  // Monotone cubic interpolation through the requested gameplay anchors.
  const agilityX=[0,80,160,200,1280],agilityY=[2.2,1,.6,.5,.25];
  const agilitySlope=[-.015,-.0075,-.0033333333333333335,-.0003846153846153846,0];
  function cooldownFactor(value){
    const a=Math.max(0,Number(value)||0);if(a>=1280)return .25;
    let i=0;while(a>agilityX[i+1])i++;
    const h=agilityX[i+1]-agilityX[i],t=(a-agilityX[i])/h,t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*agilityY[i]+(t3-2*t2+t)*h*agilitySlope[i]+(-2*t3+3*t2)*agilityY[i+1]+(t3-t2)*h*agilitySlope[i+1];
  }
  function ppInterval(value){
    const stamina=Math.max(0,Number(value)||0);
    // 1 PP/s at zero, 4 at 200, smoothly approaching 7.
    return 1/(7-1200/(stamina+200));
  }
  function normalizeIV(iv) {
    if (!Array.isArray(iv) || iv.length < 3) return Array(8).fill(1);
    const old=iv.slice(0,3),six=iv.length>=6?iv.slice(0,6):[...old,old[1],old[1],old[1]];
    const expanded=iv.length>=8?iv.slice(0,8):[...six,six[2],Math.floor((+six[4]+ +six[5])/2)];
    return expanded.map(v=>Math.max(1,Math.min(31,Number.isFinite(+v)?Math.floor(+v):1)));
  }
  // Each form has its own Pokédex IV record; an unregistered form is 1/1/1.
  const values = dex => {
    const iv = G.DB.ivOf(dex);
    return normalizeIV(iv);
  };
  const stats = (dex, ivs = values(dex)) => {
    const p = G.DEX_BY[dex], v = normalizeIV(ivs).map(ivMod);
    return { hp: p.hp * v[0], atk: p.atk * v[1], spd: p.spd * v[2], agility:agilityBase(p)*v[6],stamina:staminaBase(p)*v[7],
      spa: (p.spa??p.atk)*v[3], defense: p.defense ? p.defense*v[4] : 1, spdef: p.spdef ? p.spdef*v[5] : 1 };
  };
  function stageFor(dex, level, selectedPath) {
    const chain = selectedPath || pathFor(dex); if (!chain) return dex;
    const i = Math.min(chain.length - 1, level >= evolutionLevel(2) ? chain.length - 1 : level >= evolutionLevel(1) ? Math.min(1, chain.length - 1) : 0);
    return chain[i];
  }
  const evolutionLevel = index => index === 0 ? 1 : index === 1 ? 8 : 25;
  function validPath(path, root) {
    return Array.isArray(path) && path.length <= 4 && path[0] === root &&
      Object.values(PATHS).some(p => p.length === path.length && p.every((d,i) => d === path[i]));
  }
  function evolutionOptions(p) {
    const current=p.monStage || p.dex, route=p.evolutionPath || pathFor(p.ivDex || current), root=route[0], choices=new Map();
    for(const path of Object.values(PATHS)){
      const i=path.indexOf(current), next=path[i+1];
      if(path[0]!==root||i<0||!G.DEX_BY[next]||p.level<evolutionLevel(i+1)||!path.slice(0,i+1).every((d,j)=>route[j]===d))continue;
      if(!choices.has(next)||path.every((d,j)=>route[j]===d))choices.set(next,{dex:next,path:path.slice()});
    }
    return [...choices.values()].sort((a,b)=>a.dex-b.dex);
  }
  function evolve(p, choice) {
    const allowed=evolutionOptions(p).find(c=>c.dex===choice.dex);
    if(!allowed)return false;
    const oldDex=p.monStage || p.dex, oldBase=stats(oldDex).hp, fraction=p.maxHp>0?p.hp/p.maxHp:1;
    if(G.Mega?.active(p))G.Mega.finish(p);
    const growthHp=p.statGrowth?.hp||0,bonus=p.maxHp-oldBase*(1+growthHp), next=choice.dex, ivs=values(next), mon=G.DEX_BY[next], dir=p.anim?.dir || 0;
    p.evolutionPath=allowed.path.slice();p.monStage=p.dex=next;
    p.mon={...mon,types:mon.types.slice()};p.spriteDex=next;
    const nextStats=stats(next,ivs);
    p.baseAtk=nextStats.atk;p.baseSpa=nextStats.spa;p.baseDefense=nextStats.defense;p.baseSpDef=nextStats.spdef;p.baseSpd=nextStats.spd;
    p.baseHp=nextStats.hp;p.baseAgility=nextStats.agility;p.baseStamina=nextStats.stamina;
    p.maxHp=Math.max(1,nextStats.hp*(1+growthHp)+bonus);p.hp=Math.min(p.maxHp,p.maxHp*fraction);
    p.anim=new G.Sprites.Animator(next,1,p.shiny);p.anim.dir=dir;
    p.r=G.Sprites.bodyRadius(next);p.bodyH=G.Sprites.bodyHeight(next);G.Sprites.preload([next],8000,p.shiny);
    p.ability=G.Abilities?.equipped(G.DB.save,next) || null;
    if(G.Mega){G.Mega.init(p,G.DB.save);if(G.ZMoves?.hasStone(p))p.megaState.id=null;}
    G.Projectiles?.clearOrbs(p);G.FX?.ring(p.x,p.y,8,120,'#ffd23f',.8,6);G.Audio?.sfx('legend');
    return true;
  }
  function captureChance(enemy) { const p=enemy?.lastAttacker||G.Game?.player;return .0002*(G.Items?.count(p,'bugnet')||0)+(enemy && (enemy.boss || enemy.legend) ? 0.05 : 0.002)*(G.Difficulty?G.Difficulty.rewards():1); }
  function tryCapture(enemy, run) {
    if (!enemy || enemy.judge || enemy.remote || Math.random() >= captureChance(enemy)) return false;
    run.pendingCaptures ||= [];
    if (!run.pendingCaptures.some(c => c.dex === enemy.dex)) run.pendingCaptures.push({ dex: enemy.dex });
    return true;
  }
  function commitCaptures(save, run) {
    const out = [];
    for (const c of run?.pendingCaptures || []) {
      const result = G.DB.grant(c.dex, 'capture');
      out.push({ dex: c.dex, isNew: result.isNew, ivUp: result.ivUp, ivRaised: result.ivRaised });
    }
    if (out.length) G.DB.commit(true);
    return out;
  }
  return { CHAINS, PATHS, chainBy, pathFor, rootFor, familyFor, ivMod, normalizeIV, AGILITY_STANDARD,agilityBase,staminaBase,cooldownFactor,ppInterval,values, stats, stageFor, evolutionLevel, validPath, evolutionOptions, evolve, captureChance, tryCapture, commitCaptures };
})();
