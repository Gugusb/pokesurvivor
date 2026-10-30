/* Mega Evolution: permanent stones, run-local energy and reversible battle state. */
G.Mega = (() => {
  const LIST = (G.MEGA_FORMS || []).filter(f => f.available && f.basicComplete && G.MEGA_TYPES[f.id]);
  const BY = Object.fromEntries(LIST.map(f => [f.id, f]));
  const CAP = 120, DURATION = 60, HP = 1.3;
  const active = p => !!(p && p.megaState && p.megaState.left > 0);
  const hasStone = p => !!(p && p.megaState && BY[p.megaState.id]);
  const currentDex = p => p.monStage || p.dex;
  const eligible = p => hasStone(p) && currentDex(p) === BY[p.megaState.id].dex;
  const itemXp = p => Math.max(1, Math.floor(p.xpNext * 0.25));
  const formsFor = dex => LIST.filter(f => f.dex === dex);
  const owns = (s, id) => !!(s && s.megaStones && s.megaStones[id] && BY[id]);
  const label = id => G.MegaPreview.label(BY[id]);
  function equip(s, dex, id) {
    if (id && (!owns(s, id) || BY[id].dex !== dex)) return false;
    s.megaEquipped ||= {}; s.megaEquipped[dex] = id || null;
    if (id) { s.zEquipped ||= {}; s.zEquipped[dex] = null; s.activeEquipped ||= {}; s.activeEquipped[dex]=null; }
    return true;
  }
  function grant(s, id) {
    if (!s || !BY[id]) return false;
    s.megaStones ||= {};
    if (s.megaStones[id]) return false;
    s.megaStones[id] = { at: Date.now() }; return true;
  }
  function init(p, save) {
    const finalDex=p.ivDex||p.dex, id=save?.megaEquipped?.[finalDex];
    p.megaState = { id: owns(save, id) && BY[id].dex === finalDex ? id : null, energy: 0, left: 0, bonus: 0, kills: new Set() };
    if(p.megaState.id)p.activeItem=null;
  }
  function setVisual(p, id) {
    const f = BY[id], dir = p.anim.dir;
    const dex = currentDex(p);
    p.megaForm = id || null; p.spriteDex = id || dex;
    p.mon = id ? Object.assign({}, G.DEX_BY[dex], { types: G.MEGA_TYPES[id].slice() }) : G.DEX_BY[dex];
    p.anim = new G.Sprites.Animator(p.spriteDex, 1, p.shiny && (!f || !!f.meta.sh)); p.anim.dir = dir;
    p.bodyH = G.Sprites.bodyHeight(p.spriteDex);
    G.Sprites.preload([p.spriteDex], 8000, p.anim.shiny);
    G.Projectiles.clearOrbs(p);
  }
  function finish(p) {
    if (!active(p)) return;
    p.maxHp /= HP; p.hp = Math.min(p.maxHp, p.hp / HP);
    p.megaState.left = 0; p.megaState.energy = 0; p.megaState.bonus = 0;
    setVisual(p, null);
    if (p.dead) p.anim.play('Faint', { hold: true });
  }
  function tick(p, dt) {
    const s = p.megaState;
    if (!s || p.remote) return;
    if (active(p)) {
      if (p.dead || dt >= s.left) { finish(p); return; }
      s.left -= dt; return;
    }
    if (p.dead || !eligible(p)) return;
    s.energy = Math.min(CAP, s.energy + dt);
    s.bonus = Math.min(0.25, s.bonus + dt * 0.25);
  }
  function onKill(p, id) {
    if (!p || p.dead) return;
    if (G.Coop.active && p !== G.Game.player) { if (G.Coop.megaKill) G.Coop.megaKill(p, id); return; }
    const s = p.megaState;
    if (!s || s.kills.has(id)) return;
    s.kills.add(id);
    if (!eligible(p) || active(p)) return;
    const bonus = Math.min(0.1, s.bonus); s.bonus -= bonus; s.energy = Math.min(CAP, s.energy + bonus);
  }
  function repel(p) {
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || G.U.dist2(e.x, e.y, p.x, p.y) > 180 * 180) continue;
      const [nx, ny] = G.U.norm(e.x - p.x || 1, e.y - p.y);
      // Only this transformation can push bosses; ordinary knockback keeps its existing rules.
      if (e.remote) continue;
      e.kx += nx * 480; e.ky += ny * 480;
    }
  }
  function activate(p) {
    const s = p && p.megaState;
    if (!s || !eligible(p) || p.dead || p.remote || active(p) || s.energy < CAP || !G.Game || G.Game.state !== 'playing') return false;
    if (G.MegaPreview && p.megaForm) G.MegaPreview.restore(p);
    s.energy = 0; s.left = DURATION; s.bonus = 0;
    p.maxHp *= HP; p.hp *= HP;
    setVisual(p, s.id); repel(p);
    G.FX.ring(p.x, p.y, 12, 180, '#d9a6ff', 0.65, 6);
    G.Audio.sfx('evolve');
    if (G.Coop.active && !G.Coop.isHost) G.Coop.toHost(['mx', s.id]);
    return true;
  }
  function sync(p, id, left, stone) {
    if (p.remote) {
      p.megaState ||= { energy: 0, left: 0, kills: new Set() };
    if(p.megaState.id)p.activeItem=null;
      p.megaState.id = BY[stone] && BY[stone].dex === p.dex ? stone : null;
    }
    const valid = BY[id] && BY[id].dex === p.dex && Number.isFinite(left) && left > 0 && left <= DURATION;
    if (valid) {
      p.megaState ||= { energy: 0, kills: new Set() };
    if(p.megaState.id)p.activeItem=null;
      p.megaState.id = id; p.megaState.left = left;
      if (p.spriteDex !== id) setVisual(p, id);
    } else if (active(p)) { p.megaState.left = 0; setVisual(p, null); }
  }
  function move(p, m) {
    if (!active(p)) return m;
    const v = Object.assign({}, m);
    v.megaFx = true;
    switch (m.kind) {
      case 'projectile': case 'boomerang': v.pierce = (m.pierce || 0) + 3; v.size = m.size * 1.3; break;
      case 'beam': v.width = m.width * 2; break;
      case 'meteor': case 'chain': v.count = Math.max(1, m.count | 0) * 2; break;
      case 'orbit': v.radius = m.radius * 1.3; v.speed = m.speed * 2; break;
      case 'nova': v.life = m.life * 1.3; break;
      case 'aura': case 'mine': v.radius = m.radius * 1.3; break;
      case 'turret': v.rate = (m.rate || 0.6) / 2; break;
      case 'trail': v.dmg = m.dmg * 1.4; break;
    }
    return v;
  }
  const cooldownRate = (p, m) => active(p) ? m.kind === 'melee' ? 1.5 : m.kind === 'cone' ? 1 / 0.75 : 1 : 1;
  const damage = p => active(p) ? 1.5 : 1;
  const buffStacks = (p, n) => n * (active(p) ? 2 : 1);
  const defense = p => (active(p) ? 1 / 1.3 : 1) * (p && p.megaDashGuard > 0 ? 0.3 : 1);
  function award(id) {
    if (!BY[id]) return;
    const fresh = grant(G.DB.save, id); G.DB.commit(true);
    G.UI.toast(G.T(fresh ? 'Megapiedra obtenida' : 'Megapiedra ya obtenida') + ': ' + label(id));
    const p = G.Game.player;
    if (p) { G.FX.dmgText(p.x, p.y - p.bodyH - 12, G.T('Megapiedra'), '#d9a6ff', true); G.FX.ring(p.x, p.y, 8, 90, '#d9a6ff', 0.8, 5); }
  }
  function particles(p) {
    if (!active(p) || performance.now() < (p.megaFxAt || 0)) return;
    p.megaFxAt = performance.now() + 180;
    for (let i = 0; i < 4; i++) G.FX.px(p.x + G.U.rand(-20, 20), p.y - G.U.rand(4, 35), i % 2 ? '#8beaff' : '#f7a8ff', { vy: -45, life: 0.35 });
  }
  function debugCharge(p) {
    if (!G.Dev || !G.Dev.canUse() || !eligible(p) || active(p)) return false;
    G.Game.debugMark(); p.megaState.energy = CAP; return true;
  }
  return { LIST, BY, CAP, DURATION, HP, formsFor, owns, label, equip, grant, init, active, hasStone, eligible, itemXp, activate, finish, tick, onKill,
           repel, sync, move, cooldownRate, damage, buffStacks, defense, award, particles, debugCharge };
})();
