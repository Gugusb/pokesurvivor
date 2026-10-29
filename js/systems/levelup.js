/* ============ levelup.js — las tres cartas de subida de nivel ============
 * Tipos de carta:
 *   new   aprender un movimiento nuevo (sólo si quedan huecos de los 4; un vínculo libera huecos)
 *   up    mejorar un movimiento que ya tienes
 *   stat  mejora permanente de la run
 */
G.LevelUp = (() => {
  // Run-local history, shared by initial offers, rerolls and extra choices.
  const missed = new WeakMap();
  const CATEGORY = { attack: 5, buff: 2, stat: 3 };
  const family = m => m.kind === 'buff' ? 'buff' : 'attack';

  // Berries add a fraction of the species/IV base, in a separate stat layer.
  const berry=(id,title,desc,stat,amount,max)=>({id,icon:'berry:'+id,title,desc,max,
    apply:p=>p.growStat(stat,amount),triple:p=>p.growStat(stat,amount*3)});
  const STATS = [
    berry('hp','Baya Vital','Refuerza la vida natural y recupera esa energía.','hp',.12),
    berry('atk','Baya Fiera','Refuerza el ataque físico natural.','atk',.10,40),
    berry('spa','Baya Mental','Refuerza el ataque especial natural.','spa',.10,40),
    berry('def','Baya Firme','Refuerza la defensa física natural.','defense',.08,30),
    berry('spdef','Baya Serena','Refuerza la defensa especial natural.','spdef',.08,30),
    berry('spd','Baya Veloz','Refuerza la velocidad natural.','spd',.07,8),
    berry('cd','Baya Ágil','Refuerza la agilidad natural: tus movimientos se recargan antes.','agility',.12,10),
    berry('stamina','Baya Tenaz','Refuerza la resistencia natural: tus PP se recuperan antes.','stamina',.12,10),
    {id:'ppmax',icon:'berry:ppmax',title:'Baya Plena',desc:'Todos los movimientos ganan 1 PP máximo.',max:20,
      apply:p=>G.MovePP.increaseMax(p,1),triple:p=>G.MovePP.increaseMax(p,3)},
    {id:'temppp',icon:'berry:temppp',title:'Baya Reserva',desc:'Guarda 20 PP de reserva para cuando un movimiento se quede sin PP.',
      apply:p=>p.tempPP=(p.tempPP||0)+20},
    { id: 'rgn', icon: 'sprout', title: 'Síntesis', desc: '+0.9 de vida regenerada por segundo.',
      apply: pl => pl.regenFlat += 0.9, triple:p=>p.regenFlat+=2.7 },
    { id: 'mag', icon: 'magnet', title: 'Imán', desc: '+30% de radio de recogida de experiencia.',
      apply: pl => pl.magnet *= 1.30, triple:p=>p.magnet*=1.9, max: 6 },
    { id: 'xp', icon: 'book', title: 'Aprendizaje', desc: '+12% de experiencia ganada.',
      apply: pl => pl.xpMul *= 1.12, triple:p=>p.xpMul*=1.36, max: 8 },
    { id: 'heal', icon: 'potion', title: 'Poción', desc: 'Recupera el 45% de tu vida ahora mismo.',
      apply: pl => pl.heal(pl.maxHp * 0.45) }
  ];

  /** Construye el conjunto de cartas candidatas, con pesos. */
  function candidates(pl) {
    const out = [];

    // --- movimientos nuevos ---
    if (pl.slots.length < pl.maxMoves) {
      // Con 2 potenciadores ya no se ofrecen más: los buff no hacen daño y
      // llenar los 4 huecos con ellos deja la run sin salida.
      const buffs = pl.moves.filter(m => m.kind === 'buff').length;
      const pool = G.Moves.poolFor(pl.mon).filter(id =>
        !pl.hasMove(id) && !(pl.banned && pl.banned.has(id)) && !(buffs >= 2 && G.Moves.BY_ID[id].kind === 'buff'));
      for (const id of pool) {
        const d = G.Moves.BY_ID[id];
        out.push({
          w: 1, category: family(d), type: 'new', key: 'new:' + id,
          icon: 'move:' + id, color: G.U.TYPE_COLOR[d.type],
          tag: G.U.TYPE_NAME[d.type] + ' · ' + G.Moves.classLabel(d),
          title: d.name, desc: d.desc,
          apply: p => p.addMove(id)
        });
      }
    }

    // --- evoluciones: movimiento al máximo + su condición cumplida ---
    const waiting = {};                   // stat -> movimiento que la espera para evolucionar
    for (const m of pl.moves) {
      const ev = G.Moves.evoInfo(m, pl.statsTaken);
      if (!ev) continue;
      if (!ev.ready) { waiting[ev.needs]=m;if(ev.needs==='atk')waiting.spa=m;if(ev.needs==='def')waiting.spdef=m;continue; }
      out.push({
        w: 0.75, category: family(m), type: 'evo', key: 'evo:' + m.id,
        icon: 'move:' + m.id, color: '#ffd23f', tag: (G.T ? G.T('EVOLUCIÓN') : 'EVOLUCIÓN') + ' · ' + G.Moves.classLabel(ev),
        title: m.name + ' → ' + ev.name, desc: ev.text,
        apply: p => {
          G.Moves.evolve(m);
          G.FX.ring(p.x, p.y, 8, 120, '#ffd23f', 0.8, 6);
          G.FX.burst(p.x, p.y - p.bodyH * 0.5, '#ffe14d', 40, 240);
          G.Audio.sfx('legend');
          G.Progress.event('evolve', { move: m.id });
        }
      });
    }

    // --- mejoras de movimientos que ya tienes ---
    for (const m of pl.moves) {
      const txt = G.Moves.nextUpText(m);
      if (!txt) continue;
      out.push({
        w: 2 + 0.75 * (m.lvl - 1), category: family(m), type: 'up', key: 'up:' + m.id,
        icon: 'move:' + m.id, color: G.U.TYPE_COLOR[m.type],
        tag: 'Nv.' + m.lvl + ' > ' + (m.lvl + 1) + ' · ' + G.Moves.classLabel(m),
        title: m.name, desc: txt,
        apply: () => G.Moves.levelUp(m)
      });
    }

    // --- stats ---
    // Keep evolution prerequisites available, with a modest relative bonus.
    // Cada mejora tiene un tope de veces (`max`): en partidas muy largas se
    // acumulaban sin fin (velocidad, recarga y experiencia por las nubes) y el
    // juego acababa colgándose. Las condiciones de evolución siguen disponibles.
    const room = s => !s.max || (pl.statsTaken[s.id] || 0) < s.max;
    const pickStats = STATS.filter(s => waiting[s.id] || room(s));
    for (const s of pickStats) {
      const evoFor = waiting[s.id];
      out.push({
        w: evoFor ? 2 : 1, category: 'stat',
        type: 'stat', key: 'stat:' + s.id,
        icon: s.icon, color: evoFor ? '#ffd23f' : '#8fa3c4', tag: evoFor ? 'Evoluciona ' + evoFor.name : 'Mejora',
        title: s.title, desc: s.desc,
        apply: p => { s.apply(p); p.statsTaken[s.id] = (p.statsTaken[s.id] || 0) + 1; }
      });
    }

    return out;
  }

  // First choose a category, then a card within it: pool size cannot dilute 5:3:2.
  function draw(pool) {
    const groups = Object.keys(CATEGORY).filter(k => pool.some(c => c.category === k));
    // Do not normalize away the ultimate penalty when it is the only attack left.
    const weight = k => {
      const cards = pool.filter(c => c.category === k);
      return CATEGORY[k] * cards.reduce((sum, c) => sum + c.w, 0) /
        cards.reduce((sum, c) => sum + (c.type === 'evo' ? 4.25 : c.w), 0);
    };
    let r = Math.random() * groups.reduce((sum, k) => sum + weight(k), 0);
    let group = groups[groups.length - 1];
    for (const k of groups) { r -= weight(k); if (r < 0) { group = k; break; } }
    const cards = pool.filter(c => c.category === group);
    r = Math.random() * cards.reduce((sum, c) => sum + c.w, 0);
    for (const c of cards) { r -= c.w; if (r < 0) return c; }
    return cards[cards.length - 1];
  }

  /** Three distinct cards; never two consecutive displays without an available upgrade. */
  function offer(pl, n = 3+(G.Items?.count(pl,'luckymedal')||0)) {
    const pool = candidates(pl);
    const picked = [];
    const eligible = pool.some(c => c.type === 'up');
    const guarantee = eligible && missed.get(pl);
    while (picked.length < n && pool.length) {
      const force = guarantee && picked.length === n - 1 && !picked.some(c => c.type === 'up');
      const c = draw(force ? pool.filter(c => c.type === 'up') : pool);
      pool.splice(pool.indexOf(c), 1);
      picked.push(c);
    }
    if (picked.length) missed.set(pl, eligible && !picked.some(c => c.type === 'up'));
    return picked.map(c=>{
      if(!G.Difficulty||Math.random()>=G.Difficulty.corruptionChance())return c;
      return {...c,corrupted:true,desc:c.desc+' '+G.T('Contaminada: -10 de vida máxima.'),apply:p=>{
        c.apply(p);const k=G.Mega?.active(p)?G.Mega.HP:1;p.maxHp=Math.max(k,p.maxHp-10*k);p.hp=Math.min(p.hp,p.maxHp);
      }};
    });
  }
  function shuffled(a){const out=a.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
  function evolutionOffer(pl){
    const options=G.MonProgression.evolutionOptions(pl);
    if(!options.length)return [];
    const directions=shuffled(options).slice(0,3), count=options.length===1?3:directions.length;
    const pool=shuffled(STATS.filter(s=>s.triple&&(!s.max||(pl.statsTaken[s.id]||0)+3<=s.max)));
    return Array.from({length:count},(_,i)=>{
      const direction=directions[options.length===1?0:i],s=pool[i%pool.length],bonus=s.triple;
      return {type:'evolution',key:'direction:'+direction.dex+':'+s.id,category:'stat',evolutionDex:direction.dex,evolutionPath:direction.path,
        statId:s.id,icon:s.icon,color:'#ffd23f',tag:G.T('Dirección evolutiva')+' · ×3',title:s.title,
        desc:s.desc+' '+G.T('Efecto triple.'),apply:p=>{if(!G.MonProgression.evolve(p,direction))return false;bonus(p);p.statsTaken[s.id]=(p.statsTaken[s.id]||0)+3;return true;}};
    });
  }

  return { offer, STATS, evolutionOffer };
})();
