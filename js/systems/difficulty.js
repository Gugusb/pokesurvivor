/* Eight-star rules and smooth, bounded in-run growth. */
G.Difficulty = (() => {
  const WIN = 20 * 60;
  let current = 4;
  const level = n => Number.isInteger(n) && n >= 1 && n <= 8 ? n : 1;
  const map = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  const seconds = x => Number.isFinite(x) && x > 0 ? x : 0;
  const receipt=r=>r&&Number.isSafeInteger(r.coins)&&r.coins>0&&r.coins<=1e9&&seconds(r.at);
  const factors = (n = current) => ({ hp: 0.7 * (level(n) === 1 ? 0.8 : 1), dmg: 0.8 * (level(n) <= 2 ? 0.5 : 1), spd: level(n) <= 3 ? 0.67 : 1 });
  const HP_CAP=[8,10,13,17,22,28,35,43], DMG_CAP=[1.6,2.1,2.8,3.6,4.5,5.6,6.9,8.4];
  const REWARD=[1,1.15,1.3,1.5,1.75,2,2.3,2.6];
  function growth(t, kind='normal', n=current){
    const i=level(n)-1,x=(Math.max(0,t-120)/(900-i*50))**3,p=x/(1+x);
    const h=kind==='boss'?.13:kind==='rift'?.3:1,d=kind==='boss'?.55:kind==='rift'?.7:1;
    return {hp:1+HP_CAP[i]*h*p,dmg:1+DMG_CAP[i]*d*p,spd:1+Math.min(.35,Math.max(0,t)/1400)};
  }
  const rewards=(n=current)=>REWARD[level(n)-1];
  const eliteChance=(n=current)=>level(n)>=6?.01:.005;
  const treasureChance=(n=current)=>.002*rewards(n);
  const corruptionChance=(n=current)=>level(n)>=8?.2:level(n)>=7?.15:0;
  const TRAITS=[
    [2,'Los Pokémon se vuelven más robustos.'],[3,'Los Pokémon se vuelven más feroces.'],
    [4,'Los Pokémon se vuelven más ágiles.'],[5,'Los Pokémon tienden a rodearte.'],
    [5,'Aparecen más variedades de Pokémon.'],[6,'Aparecen más Pokémon de élite.'],
    [7,'Pueden aparecer mejoras contaminadas.'],[8,'Recibir daño puede ralentizarte y eliminar tus beneficios.']
  ];
  const traits=(n=current)=>TRAITS.filter(([at])=>level(n)>=at).map(([,s])=>s);
  function onHurt(p){
    if(current<8||p.dead||G.Abilities?.debuffImmune(p)||p.difficultyCurseT>0||Math.random()>=.1)return false;
    p.difficultyCurseT=5;
    for(const b of Object.values(p.buffs||{})){b.n=0;b.t=0;}
    if(p.abilityState){p.abilityState.confidence=[];p.abilityState.haste=p.abilityState.hasteT=p.abilityState.justiceT=p.abilityState.kindleT=0;}
    if(p.power){p.power.def.off(p);p.power=null;}
    if(!G.Abilities?.slowImmune(p))p.slowT=Math.max(p.slowT||0,2.5);
    G.UI.toast(G.T('¡Tus beneficios se han disipado!'));return true;
  }
  function debugLevel(n){
    if(!G.Dev?.canUse())return false;current=level(n);G.Game.debugMark();
    if(G.Game.challenge){G.Game.challenge.stars=current;G.Game.challenge.eligible=false;}
    return true;
  }
  function unlocked(s) {
    let n = 1;
    while (n < 8 && s.difficulty?.cleared?.[n]) n++;
    return n;
  }
  function normalize(s) {
    const d = map(s.difficulty), cleared = {}, cashouts={};
    for (let n = 1; n <= 8; n++) if (d.cleared?.[n] === true) cleared[n] = true;
    for(let n=1;n<=8;n++){
      const r=d.cashouts?.[n];
      if(receipt(r))cashouts[n]={coins:r.coins,at:r.at};
    }
    s.difficulty = { selected: level(d.selected), cleared, cashouts };
    s.difficulty.selected = Math.min(s.difficulty.selected, unlocked(s));
    const records = {};
    for (const [dex, rows] of Object.entries(map(s.difficultyRecords))) {
      if (G.DEX_BY[dex]?.dex !== +dex) continue;
      const result = {};
      for (let n = 1; n <= 8; n++) {
        const r = map(rows?.[n]), best = seconds(r.best);
        if (best || r.inherited === true) result[n] = { best, won: r.won === true && (best > WIN || r.inherited === true), ...(r.inherited === true ? {inherited:true} : {}) };
      }
      if (Object.keys(result).length) records[dex] = result;
    }
    s.difficultyRecords = records;
  }
  function merge(a, b) {
    const out = { difficulty: { selected: a.difficulty?.selected ?? b.difficulty?.selected, cleared: {},cashouts:{} }, difficultyRecords: {} };
    for (const s of [a, b]) {
      for (let n = 1; n <= 8; n++) if (s.difficulty?.cleared?.[n] === true) out.difficulty.cleared[n] = true;
      for(let n=1;n<=8;n++){
        const r=s.difficulty?.cashouts?.[n],old=out.difficulty.cashouts[n];
        if(receipt(r)&&(!old||r.at<old.at||r.at===old.at&&r.coins<old.coins))out.difficulty.cashouts[n]=r;
      }
      for (const [dex, rows] of Object.entries(map(s.difficultyRecords))) {
        if (G.DEX_BY[dex]?.dex !== +dex) continue;
        const dest = out.difficultyRecords[dex] ||= {};
        for (let n = 1; n <= 8; n++) {
          const r = map(rows?.[n]); if (!seconds(r.best) && r.inherited !== true) continue;
          const old = dest[n] || {};
          dest[n] = { best: Math.max(seconds(old.best), seconds(r.best)), won: old.won === true || r.won === true, ...(old.inherited || r.inherited ? {inherited:true} : {}) };
        }
      }
    }
    normalize(out); return out;
  }
  function select(s, n) {
    if (level(n) !== n || n > unlocked(s)) return false;
    s.difficulty.selected = n; return true;
  }
  function partyLevel(s, members) {
    return Math.min(s.difficulty?.selected || 1, ...members.map(m => level(m.difficultyLimit)));
  }
  function begin(s, dex, requested) {
    current = requested == null ? Math.min(s.difficulty?.selected || 1, unlocked(s)) : level(requested);
    return { stars: current, dex, victory: false, eligible: current <= unlocked(s) };
  }
  function record(s, run, time, alive, clean) {
    if (!run || !run.eligible || !clean || !seconds(time) || !G.DEX_BY[run.dex]) return false;
    const rows = s.difficultyRecords[run.dex] ||= {};
    const old = rows[run.stars] || { best: 0, won: false };
    const win = alive && time > WIN;
    rows[run.stars] = { best: Math.max(old.best, time), won: old.won || win };
    if (win) {
      s.difficulty.cleared[run.stars] = true; run.victory = true;
      for (const dex of G.MonProgression?.familyFor?.(run.dex) || [run.dex]) {
        const familyRows = s.difficultyRecords[dex] ||= {}, previous = familyRows[run.stars];
        if (dex !== run.dex) familyRows[run.stars] = {best: previous?.best || 0, won:true, inherited:true};
      }
    }
    return win;
  }
  const cashoutTotal=s=>Object.values(s.difficulty?.cashouts||{}).reduce((n,r)=>n+(receipt(r)?r.coins:0),0);
  const bonusAvailable=(s,n)=>level(n)===n&&!receipt(s.difficulty?.cashouts?.[n]);
  function claimBonus(s,run,coins){
    if(!run?.eligible||!run.victory||!s.difficulty?.cleared?.[run.stars]||!bonusAvailable(s,run.stars)||!Number.isSafeInteger(coins)||coins<=0||coins>5e8)return 0;
    s.difficulty.cashouts||={};s.difficulty.cashouts[run.stars]={coins:coins*2,at:Date.now()};
    s.coins+=coins*2;s.stats.coinsEarned+=coins*2;return coins;
  }
  function highest(s, dex) {
    const rows = s.difficultyRecords?.[dex] || {};
    for (let n = 8; n >= 1; n--) if (rows[n]?.best > 0) return { stars: n, best: rows[n].best };
    return null;
  }
  function frame(s, dex) {
    const rows = s.difficultyRecords?.[dex] || {};
    if (Array.from({ length: 8 }, (_, i) => rows[i + 1]?.won).every(Boolean)) return 'ruby';
    if (rows[5]?.won) return 'emerald';
    return Object.values(rows).some(r => r.won) ? 'gold' : '';
  }
  const completedCount = s => Object.keys(s.difficultyRecords || {}).filter(d => G.DEX_BY[d] && frame(s,+d) === 'ruby').length;
  return { WIN, level, factors, growth, rewards, eliteChance, treasureChance, corruptionChance, traits, onHurt,debugLevel,
    normalize, merge, unlocked, select, partyLevel, begin, record, highest, frame,completedCount,cashoutTotal,bonusAvailable,claimBonus,
    get current() { return current; } };
})();
