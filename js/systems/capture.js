/* ============ capture.js — 晕倒宝可梦与捕捉系统 ============ */
G.Capture = (() => {
  const MAX_PER_BATTLE = { normal: 1, elite: 3, boss: 1 };
  const CHANCE = { normal: 0.0002, elite: 0.002, boss: 1 };
  const TTL = 20;
  const DWELL_NEED = 5;
  const RADIUS = 38;

  const BALLS = [
    { id: 'pokeball', name: { es: 'Poké Ball', en: 'Poké Ball', zh: '精灵球' }, rate: 0.45, color: '#ef5350', top: '#e53935' },
    { id: 'greatball', name: { es: 'Super Ball', en: 'Great Ball', zh: '超级球' }, rate: 0.70, color: '#42a5f5', top: '#1e88e5' },
    { id: 'ultraball', name: { es: 'Ultra Ball', en: 'Ultra Ball', zh: '高级球' }, rate: 0.90, color: '#fdd835', top: '#263238' }
  ];

  let list = [];
  let counts = { normal: 0, elite: 0, boss: 0 };
  let activeModal = false;

  function reset() {
    list = [];
    counts = { normal: 0, elite: 0, boss: 0 };
    activeModal = false;
  }

  function categoryOf(enemy) {
    if (enemy.boss || enemy.legend) return 'boss';
    if (enemy.elite) return 'elite';
    return 'normal';
  }

  function trySpawn(enemy) {
    if (!enemy || enemy.remote || enemy.judge || enemy.expeditionArceus) return false;
    if (!G.DEX_BY?.[enemy.dex] || !G.SPRITE_META?.[enemy.dex]) return false;
    const cat = categoryOf(enemy);
    if (counts[cat] >= MAX_PER_BATTLE[cat]) return false;
    if (Math.random() >= CHANCE[cat]) return false;
    counts[cat]++;
    const anim = new G.Sprites.Animator(enemy.dex, 1, !!enemy.shiny);
    if (G.Sprites.animMeta(enemy.dex, 'Faint', !!enemy.shiny)) anim.play('Faint', { hold: true });
    list.push({
      id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      dex: enemy.dex,
      name: G.DEX_BY[enemy.dex].name,
      shiny: !!enemy.shiny,
      cat,
      x: enemy.x,
      y: enemy.y,
      ttl: TTL,
      dwell: 0,
      anim
    });
    G.FX?.ring(enemy.x, enemy.y, 6, 48, enemy.shiny ? '#9ae6ff' : '#ffd23f', 0.6, 3);
    const L = (es, en, zh) => G.I18n?.lang === 'zh' ? zh : G.I18n?.lang === 'en' ? en : es;
    G.UI?.toast(L(
      `¡${enemy.name} se ha debilitado! Acércate 5 s para capturarlo.`,
      `${enemy.name} fainted! Stand near it for 5 s to catch it.`,
      `${enemy.name} 晕倒了！在其位置停留 5 秒即可尝试捕捉。`
    ), 3500);
    return true;
  }

  function update(dt, pl) {
    if (!list.length || activeModal || !pl || pl.dead) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const f = list[i];
      f.anim.tick(dt);
      f.ttl -= dt;
      if (f.ttl <= 0) {
        list.splice(i, 1);
        continue;
      }
      const d2 = G.U.dist2(pl.x, pl.y, f.x, f.y);
      if (d2 <= RADIUS * RADIUS) {
        f.dwell += dt;
        if (f.dwell >= DWELL_NEED) {
          list.splice(i, 1);
          activeModal = true;
          if (G.CaptureUI) {
            G.CaptureUI.open(f, () => { activeModal = false; });
          } else {
            activeModal = false;
          }
          return;
        }
      } else {
        f.dwell = Math.max(0, f.dwell - dt * 0.5);
      }
    }
  }

  function draw(ctx) {
    if (!list.length) return;
    for (const f of list) {
      if (G.Camera?.sees && !G.Camera.sees(f.x, f.y, 80)) continue;
      ctx.save();
      G.Sprites.drawShadow(ctx, f.dex, f.x, f.y);
      ctx.globalAlpha = f.ttl < 3 ? 0.5 + 0.5 * Math.sin(f.ttl * 12) : 1;
      f.anim.draw(ctx, f.x, f.y);

      // Capture zone ring
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = f.shiny ? '#80e5ff' : '#ffd23f';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(f.x, f.y, RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dwell progress arc
      if (f.dwell > 0) {
        ctx.strokeStyle = '#7dffb0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(f.x, f.y, RADIUS + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, f.dwell / DWELL_NEED));
        ctx.stroke();
      }

      // Countdown badge
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(Math.ceil(f.ttl) + 's', f.x + 1, f.y - 34);
      ctx.fillStyle = f.ttl < 5 ? '#ff7a7a' : '#fff';
      ctx.fillText(Math.ceil(f.ttl) + 's', f.x, f.y - 35);
      ctx.restore();
    }
  }

  function catchChance(ballId, fainted) {
    const ball = BALLS.find(b => b.id === ballId) || BALLS[0];
    const mon = G.DEX_BY?.[fainted?.dex];
    const rarityPenalty = mon ? Math.max(0, (mon.rarity - 1) * 0.05) : 0;
    const bossPenalty = fainted?.cat === 'boss' ? 0.12 : 0;
    return Math.max(0.15, Math.min(0.98, ball.rate - rarityPenalty - bossPenalty));
  }

  function attempt(ballId, fainted, save = G.DB?.save) {
    if (!save?.pokeballs || !(save.pokeballs[ballId] > 0)) return null;
    save.pokeballs[ballId]--;
    const rate = catchChance(ballId, fainted);
    const caught = Math.random() < rate;
    let grant = null;
    if (caught) {
      grant = fainted.shiny
        ? G.DB.grantShiny(fainted.dex, 'capture', save)
        : G.DB.grantFamily(fainted.dex, 'capture', save);
      if (fainted.shiny) save.stats.shinies = (save.stats.shinies || 0) + 1;
      G.DB.commit(true);
    } else {
      G.DB.commit(true);
    }
    return { caught, rate, grant, shakes: caught ? 3 : 1 + Math.floor(Math.random() * 2) };
  }

  return {
    BALLS,
    reset,
    trySpawn,
    update,
    draw,
    catchChance,
    attempt,
    hasActive: () => list.length > 0 || activeModal,
    isModalOpen: () => activeModal,
    list: () => list
  };
})();
