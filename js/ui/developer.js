/* Herramientas explícitas de desarrollo. Desactivadas por defecto; sólo solo. */
G.Dev = (() => {
  let enabled = false;
  try { enabled = localStorage.getItem('ps.dev.enabled') === 'true'; } catch (e) { /* sin persistencia */ }
  let god = false, panel, launcher;
  const canUse = () => enabled && G.DB.loggedIn && !G.Coop.active;
  function setEnabled(on) {
    enabled = !!on;
    if (enabled && G.Game) G.Game.debugMark();
    if (!enabled) { god = false; if (G.AbilityGacha.clearDebug) G.AbilityGacha.clearDebug(); }
    try { localStorage.setItem('ps.dev.enabled', String(enabled)); } catch (e) { /* nada */ }
    refresh();
  }
  function init() {
    launcher = document.createElement('button');
    launcher.id = 'dev-launcher'; launcher.className = 'btn small'; launcher.textContent = '调试 · F2';
    launcher.onclick = () => { panel.classList.toggle('hidden'); if (!panel.classList.contains('hidden')) renderPanel(); };
    panel = document.createElement('aside'); panel.id = 'dev-panel'; panel.className = 'panel hidden';
    panel.setAttribute('aria-label', '开发者调试面板'); panel.setAttribute('translate', 'no');
    launcher.setAttribute('translate', 'no');
    document.body.append(launcher, panel);
    document.addEventListener('keydown', e => {
      if (enabled && e.code === 'F2') { e.preventDefault(); launcher.click(); }
    });
    refresh();
  }
  function refresh() {
    if (!launcher) return;
    launcher.classList.toggle('hidden', !enabled);
    if (!enabled) panel.classList.add('hidden');
  }
  function requireRun() {
    const p = G.Game.player;
    if (!p || G.Game.state === 'ui' || G.Game.state === 'over') { G.UI.toast('请先开始一局游戏'); return null; }
    return p;
  }
  function action(fn) {
    if (!canUse()) { G.UI.toast('请先登录或以游客进入单人游戏；联机时不可使用调试'); return; }
    G.Game.debugMark();
    fn();
    if (G.DB.loggedIn) { G.DB.commit(true); G.UI.refreshCoins(); }
    if (G.UI.isOpen('scr-menu') && !G.UI.isOpen('scr-gacha')) G.MenuUI.open();
    if (G.UI.isOpen('scr-gacha') && !G.GachaUI.open_) G.GachaUI.refresh();
    renderPanel();
  }
  function renderPanel() {
    const save = G.DB.save;
    panel.innerHTML = '<div class="row between"><h3>开发者调试</h3><button class="btn small" id="dev-close">收起</button></div>' +
      '<p class="note">调试会修改当前本地存档。调试局不提交排行榜；联机时不可使用。</p>' +
      '<p>特性宝石：' + ((save && save.abilityGems) || 0) + '　勋章：' + Object.keys(save && save.abilityMedals || {}).length + '/9</p>' +
      '<div class="row wrap"><button class="btn small" data-dev="gems">+10 特性宝石</button><button class="btn small" data-dev="medals">解锁全部勋章</button><button class="btn small" data-dev="legends">解锁关都传说</button></div>' +
      '<label>测试伙伴 <select id="dev-partner">' + [144,145,146,150,151].map(d => '<option value="' + d + '">' + G.T(G.DEX_BY[d].name) + '</option>').join('') + '</select></label>' +
      '<button class="btn small" data-dev="partner">选择伙伴（局外）</button>' +
      '<label>指定勋章 <select id="dev-medal">' + G.AbilityDefs.LIST.map(m => '<option value="' + m.id + '">' + G.T(G.DEX_BY[m.dex].name) + ' · ' + G.T(m.name) + '</option>').join('') + '</select></label>' +
      '<div class="row wrap"><button class="btn small" data-dev="force">下次抽出此勋章</button><button class="btn small" data-dev="equip">装备此勋章（局外）</button></div>' +
      '<div class="row wrap"><button class="btn small" data-dev="god">无敌：' + (god ? '开' : '关') + '</button><button class="btn small" data-dev="heal">回满生命</button><button class="btn small" data-dev="level">升一级</button><button class="btn small" data-dev="slow">自身减速 3.5s</button><button class="btn small" data-dev="time">时间 +60s</button><button class="btn small" data-dev="rift">开启裂隙战斗</button><button class="btn small" data-dev="boss">击败裂隙 Boss</button><button class="btn small" data-dev="quit">结束本局</button></div>';
    panel.querySelector('#dev-close').onclick = () => panel.classList.add('hidden');
    if (save && [144,145,146,150,151].includes(save.partner)) panel.querySelector('#dev-partner').value = save.partner;
    panel.querySelectorAll('[data-dev]').forEach(b => b.onclick = () => {
      const dex = +panel.querySelector('#dev-partner').value;
      const medalId = panel.querySelector('#dev-medal').value;
      action(() => {
        const s = G.DB.save;
        switch (b.dataset.dev) {
          case 'gems': s.abilityGems += 10; break;
          case 'medals': for (const m of G.AbilityDefs.LIST) s.abilityMedals[m.id] = s.abilityMedals[m.id] || { at: Date.now(), from: 'dev' }; break;
          case 'legends': for (const d of [144,145,146,150,151]) G.DB.grant(d, 'dev'); break;
          case 'force': G.AbilityGacha.debugMedal(medalId); G.UI.toast('下次抽卡将产出指定勋章，仍消耗宝石'); break;
          case 'partner':
            if (G.Game.state !== 'ui') { G.UI.toast('请先返回主菜单'); break; }
            G.DB.grant(dex, 'dev'); s.partner = dex; s.partnerShiny = false;
            if (!s.starter) s.starter = dex;
            G.Flow.goMenu(); break;
          case 'equip': {
            if (G.Game.state !== 'ui') { G.UI.toast('请先返回主菜单'); break; }
            const m = G.AbilityDefs.BY_ID[medalId];
            s.abilityMedals[m.id] = s.abilityMedals[m.id] || { at: Date.now(), from: 'dev' };
            G.Abilities.equip(s, m.dex, m.id); G.UI.toast('已装备：' + G.T(m.name)); break;
          }
          case 'god': god = !god; break;
          case 'heal': { const p = requireRun(); if (p) p.heal(p.maxHp); break; }
          case 'level': if (requireRun()) G.Game.debugLevelUp(); break;
          case 'slow': { const p = requireRun(); if (p) p.slowT = 3.5; break; }
          case 'time': if (requireRun()) G.Game.debugTime(G.Game.st.time + 60); break;
          case 'rift': if (requireRun()) G.Rift.debugStart(); break;
          case 'boss': { const a = G.Rift.arena, e = a && G.EnemyMgr.get(a.bossId); if (e && !e.dead) e.hurt(e.maxHp * 2); else G.UI.toast('当前没有裂隙 Boss'); break; }
          case 'quit': if (requireRun()) G.Game.quit(); break;
        }
      });
    });
  }
  function renderSettings(box) {
    box.setAttribute('translate', 'no');
    box.innerHTML = '<h3>开发者模式</h3><p class="note">开启后显示调试按钮，也可用 F2 收起或展开。只用于单人调试。</p>' +
      '<button class="btn ' + (enabled ? 'gold' : '') + '" id="dev-enable">开发者模式：' + (enabled ? '开' : '关') + '</button>';
    box.querySelector('#dev-enable').onclick = () => { setEnabled(!enabled); renderSettings(box); };
  }
  return { init, canUse, setEnabled, renderSettings, get enabled() { return enabled; }, get invincible() { return canUse() && god; } };
})();
