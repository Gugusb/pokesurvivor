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

  const STATS = [
    { id: 'hp',   icon: 'heart', title: 'Vigor',        desc: '+20 de vida máxima (y la recupera).',
      apply: pl => pl.addMaxHp(20) },
    { id: 'atk',  icon: 'fist', title: 'Potencia',     desc: '+10% de daño con todos los movimientos.',
      apply: pl => pl.atkMul += 0.10, max: 40 },
    { id: 'spd',  icon: 'boot', title: 'Carrera',      desc: '+7% de velocidad de movimiento.',
      apply: pl => pl.spdMul *= 1.07, max: 8 },
    { id: 'cd',   icon: 'clock', title: 'Reflejos',     desc: '-8% de recarga en todos los movimientos.',
      apply: pl => pl.cdMul *= 0.92, max: 10 },
    { id: 'def',  icon: 'shield', title: 'Coraza',       desc: '+6% de reducción de daño recibido.',
      apply: pl => pl.dmgReduce = Math.min(0.7, pl.dmgReduce + 0.06), max: 12 },
    { id: 'rgn',  icon: 'sprout', title: 'Síntesis',     desc: '+0.9 de vida regenerada por segundo.',
      apply: pl => pl.regenFlat += 0.9 },
    { id: 'mag',  icon: 'magnet', title: 'Imán',         desc: '+30% de radio de recogida de experiencia.',
      apply: pl => pl.magnet *= 1.30, max: 6 },
    { id: 'xp',   icon: 'book', title: 'Aprendizaje',  desc: '+12% de experiencia ganada.',
      apply: pl => pl.xpMul *= 1.12, max: 8 },
    { id: 'heal', icon: 'berry', title: 'Baya Zidra',   desc: 'Recupera el 45% de tu vida ahora mismo.',
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
          tag: G.U.TYPE_NAME[d.type],
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
      if (!ev.ready) { waiting[ev.needs] = m; continue; }
      out.push({
        w: 0.75, category: family(m), type: 'evo', key: 'evo:' + m.id,
        icon: 'move:' + m.id, color: '#ffd23f', tag: 'EVOLUCIÓN',
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
        tag: 'Nv.' + m.lvl + ' > ' + (m.lvl + 1),
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
  function offer(pl, n = 3) {
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
    return picked;
  }

  return { offer, STATS };
})();
