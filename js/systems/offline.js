/* Registered-account offline rewards, measured in wall-clock time. */
G.Offline = (() => {
  const HOUR = 3600000;
  let timer = null, session = null, arrived = 0, ready = false, busy = false;
  const valid = (x, lo, hi) => Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : lo;
  function rates(s) {
    const total = G.DEX.length;
    const count = coll => Object.keys(coll || {}).filter(d => G.DEX_BY[d]?.dex === +d && coll[d]).length;
    const owned = count(s.owned), shiny = count(s.shiny), progress = Math.min(1, (owned + 10 * shiny) / (11 * total));
    return { coins: 100 + 4900 * Math.sqrt(progress), tickets: 1 + 4 * Math.sqrt(shiny / total),
      gems: 0.5 + 1.5 * Math.sqrt(shiny / total), owned, shiny, total };
  }
  function normalize(s) {
    const raw = s.offline && typeof s.offline === 'object' && !Array.isArray(s.offline) ? s.offline : {};
    const r = raw.rates;
    const total = Object.fromEntries(['coins','tickets','gems'].map(k => [k, Math.floor(valid(raw.total?.[k],0,Number.MAX_SAFE_INTEGER))]));
    s.offline = { seen: valid(raw.seen, 0, 8640000000000000), carry: valid(raw.carry, 0, 0.999999999), total,
      rates: r && typeof r === 'object' ? { coins: valid(r.coins,100,5000), tickets: valid(r.tickets,1,5), gems: valid(r.gems,.5,2) } : null };
  }
  function merge(a, b) {
    const aa = a.offline, bb = b.offline;
    const out = JSON.parse(JSON.stringify(!aa ? bb || {seen:0,carry:0,rates:null} : !bb || aa.seen >= bb.seen ? aa : bb));
    out.total = Object.fromEntries(['coins','tickets','gems'].map(k => [k, Math.max(aa?.total?.[k] || 0,bb?.total?.[k] || 0)]));
    return out;
  }
  function stamp(s, now = Date.now()) {
    normalize(s); s.offline.seen = Math.max(s.offline.seen, now); s.offline.rates = rates(s);
  }
  // Exponential inter-arrival times give a Poisson count at any elapsed duration.
  function poisson(mean) {
    if (mean <= 0) return 0;
    let at = 0, count = 0;
    while (true) { at += -Math.log(Math.max(Number.MIN_VALUE, Math.random())); if (at >= mean) return count; count++; }
  }
  function claim(s, now = Date.now()) {
    normalize(s);
    const old = s.offline, elapsed = old.seen > 0 ? Math.max(0, now - old.seen) : 0;
    const r = old.rates || rates(s), hours = elapsed / HOUR;
    const amount = r.coins * hours + old.carry, coins = Math.floor(amount);
    const tickets = poisson(r.tickets * hours), gems = poisson(r.gems * hours);
    s.coins += coins; s.tickets.t1 += tickets; s.abilityGems += gems;
    old.total.coins += coins; old.total.tickets += tickets; old.total.gems += gems;
    old.carry = amount - coins; stamp(s, now);
    return { elapsed, coins, tickets, gems };
  }
  function suspend() {
    if (!ready || !G.DB.save || G.DB.guest || session !== G.DB.user) return;
    stamp(G.DB.save); G.DB.commit();
  }
  async function settle() {
    if (busy || !G.DB.loggedIn || G.DB.guest || session !== G.DB.user) return;
    busy = true;
    try {
      const report = await G.DB.settleOffline(arrived);
      if (session !== G.DB.user || !G.DB.save) return;
      ready = true; stamp(G.DB.save); G.DB.commit();
      if (G.OfflineUI) G.OfflineUI.setReport(report);
      if (G.UI.refreshCoins) G.UI.refreshCoins();
    } catch (e) {
      if (G.OfflineUI) G.OfflineUI.pending();
      console.warn('[Offline] settlement pending:', e.code || e.message);
    } finally { busy = false; }
  }
  function start() {
    clearInterval(timer); session = G.DB.user; arrived = Date.now(); ready = false;
    if (G.OfflineUI) G.OfflineUI.setReport(null);
    if (!G.DB.loggedIn || G.DB.guest) return;
    settle();
    timer = setInterval(() => { if (document.hidden) return; if (ready) suspend(); else settle(); }, 30000);
  }
  function stop() { suspend(); clearInterval(timer); session = null; ready = false; }
  function init() {
    G.DB.onLeave(stop);
    addEventListener('pagehide', suspend, {capture:true});
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) suspend();
      else if (G.DB.loggedIn && !G.DB.guest) { if (ready) { arrived = Date.now(); ready = false; } settle(); }
    }, {capture:true});
  }
  return { rates, normalize, merge, stamp, claim, poisson, init, start, stop };
})();
