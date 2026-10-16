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
      p(G.T('Ingresos por tiempo real sin conexión, sin límite de horas. Los vales y gemas son aleatorios, no garantizados.'));
      p(G.T('La colección aumenta las monedas con crecimiento decreciente; un Shiny pesa diez veces más. Más Shinies aumentan los vales y gemas.'));
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
    'Ingresos por tiempo real sin conexión, sin límite de horas. Los vales y gemas son aleatorios, no garantizados.':'Income uses real offline time with no hourly cap. Tickets and gems are random, not guaranteed.',
    'La colección aumenta las monedas con crecimiento decreciente; un Shiny pesa diez veces más. Más Shinies aumentan los vales y gemas.':'Collection increases coin income with diminishing gains; a Shiny has ten times the weight. More Shinies increase ticket and gem drops.'
  });
  G.I18n.addChinese({
    'Ingresos sin conexión':'挂机收益', 'Sólo cuentas registradas':'仅已注册玩家可获得挂机收益', 'Tasa actual':'当前产出',
    'Monedas/hora':'宝可梦币／小时', 'Vales de una tirada/hora (media)':'单抽券／小时（期望）',
    'Gemas de habilidad/hora (media)':'特性宝石／小时（期望）', 'Última liquidación':'本次离线结算', 'Vales':'单抽券',
    'Recompensas pendientes de sincronizar. Se reintentará al conectar.':'收益等待同步，联网后会自动重试。',
    'El contador comienza en tu primera entrada. Vuelve después de salir para recibir ingresos.':'首次进入开始计时，退出或切到后台后，返回即可自动结算。',
    'Ingresos por tiempo real sin conexión, sin límite de horas. Los vales y gemas son aleatorios, no garantizados.':'按现实离线时间产生收益，不设时长上限。抽奖券和宝石随机掉落，期望不代表每小时必得。',
    'La colección aumenta las monedas con crecimiento decreciente; un Shiny pesa diez veces más. Más Shinies aumentan los vales y gemas.':'图鉴越全金币越多，前期增长快、后期趋缓；普通图鉴权重 1，闪光权重 10。闪光越多，抽奖券和特性宝石产出概率越高。'
  });
  return { init, open, menu, setReport, pending() { waiting = true; } };
})();
