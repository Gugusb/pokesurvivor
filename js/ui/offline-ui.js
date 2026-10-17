G.OfflineUI = (() => {
  let report = null, waiting = false;
  const number = n => n.toFixed(2).replace(/\.00$/, '');
  function menu() {
    const el = G.UI.$('menu-offline-rate'); if (!el || !G.DB.save) return;
    el.textContent = G.DB.guest ? G.T('Sólo cuentas registradas') :
      Math.floor(G.Offline.rates(G.DB.save).coins) + ' ' + G.T('Monedas/hora');
  }
  function init() { G.UI.$('offline-close').onclick = () => G.UI.hide('scr-offline'); }
  function open() {
    const box = G.UI.$('offline-body'); box.innerHTML = '';
    const p = text => { const el = document.createElement('p'); el.textContent = text; box.appendChild(el); };
    if (G.DB.guest) p(G.T('Sólo cuentas registradas'));
    else {
      const r = G.Offline.rates(G.DB.save);
      p(G.T('Tasa actual') + ' · ' + r.owned + '/' + r.total + ' ' + G.T('Pokédex') + ' · ' + r.shiny + ' Shiny');
      const stats = document.createElement('div'); stats.className = 'stats';
      for (const [label, value] of [['Monedas/hora',r.coins],['Vales de una tirada/hora (media)',r.tickets],['Gemas de habilidad/hora (media)',r.gems]]) {
        const row = document.createElement('div'), title = document.createElement('span'), b = document.createElement('b');
        title.textContent = G.T(label); b.textContent = number(value); row.append(title,b); stats.appendChild(row);
      }
      box.appendChild(stats);
      if (waiting) p(G.T('Recompensas pendientes de sincronizar. Se reintentará al conectar.'));
      else if (report?.elapsed > 0) p(G.T('Última liquidación') + ' · ' + number(report.elapsed/3600000) + ' h · ' +
        '+' + report.coins + ' ' + G.T('Monedas') + ' · +' + report.tickets + ' ' + G.T('Vales') + ' · +' + report.gems + ' ' + G.T('Gemas de habilidad'));
      else p(G.T('El contador comienza en tu primera entrada. Vuelve después de salir para recibir ingresos.'));
       p(G.T('Los ingresos se acumulan mientras estás fuera. Los vales y gemas aparecen de forma aleatoria.'));
       p(G.T('Una colección más completa mejora los ingresos; los Pokémon Shiny aumentan las recompensas especiales.'));
    }
    G.UI.show('scr-offline', true);
  }
  function setReport(r) {
    report = r; waiting = false; menu();
    if (r?.elapsed >= 60000 && (r.coins || r.tickets || r.gems)) G.UI.toast(G.T('Ingresos sin conexión') + ': +' + r.coins + ' ' + G.T('Monedas') + ' · +' + r.tickets + ' ' + G.T('Vales') + ' · +' + r.gems + ' ' + G.T('Gemas de habilidad'), 6000);
  }
  G.I18n.add({
    'Ingresos sin conexión':'Offline income', 'Sólo cuentas registradas':'Registered accounts only', 'Tasa actual':'Current rate',
    'Monedas/hora':'Coins/hour', 'Vales de una tirada/hora (media)':'Single-pull tickets/hour (expected)',
    'Gemas de habilidad/hora (media)':'Ability Gems/hour (expected)', 'Última liquidación':'Latest settlement', 'Vales':'Tickets',
    'Recompensas pendientes de sincronizar. Se reintentará al conectar.':'Rewards pending sync. We will retry when connected.',
    'El contador comienza en tu primera entrada. Vuelve después de salir para recibir ingresos.':'The timer starts on your first visit. Return after leaving to receive income.',
    'Los ingresos se acumulan mientras estás fuera. Los vales y gemas aparecen de forma aleatoria.':'Income accumulates while you are away. Tickets and gems appear at random.',
    'Una colección más completa mejora los ingresos; los Pokémon Shiny aumentan las recompensas especiales.':'A fuller collection improves income; Shiny Pokémon increase special rewards.'
  });
  G.I18n.addChinese({
    'Ingresos sin conexión':'挂机收益', 'Sólo cuentas registradas':'仅已注册玩家可获得挂机收益', 'Tasa actual':'当前产出',
    'Monedas/hora':'宝可梦币／小时', 'Vales de una tirada/hora (media)':'单抽券／小时（期望）',
    'Gemas de habilidad/hora (media)':'特性宝石／小时（期望）', 'Última liquidación':'本次离线结算', 'Vales':'单抽券',
    'Recompensas pendientes de sincronizar. Se reintentará al conectar.':'收益等待同步，联网后会自动重试。',
    'El contador comienza en tu primera entrada. Vuelve después de salir para recibir ingresos.':'首次进入开始计时，退出或切到后台后，返回即可自动结算。',
    'Los ingresos se acumulan mientras estás fuera. Los vales y gemas aparecen de forma aleatoria.':'离线期间会累积收益，抽奖券和特性宝石随机获得。',
    'Una colección más completa mejora los ingresos; los Pokémon Shiny aumentan las recompensas especiales.':'图鉴越丰富，挂机收益越高；闪光宝可梦会提高特殊奖励。'
  });
  return { init, open, menu, setReport, pending() { waiting = true; } };
})();
