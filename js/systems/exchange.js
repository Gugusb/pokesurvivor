/* ============ exchange.js — 联盟币交易所（寄售商店） ============ */
G.Exchange = (() => {
  const L = (es, en, zh) => G.I18n?.lang === 'zh' ? zh : G.I18n?.lang === 'en' ? en : es;
  const LOCAL_KEY = 'ps.exchange.local';
  const MIN_PRICES = {
    abilityGem: 100,
    pokeball: 50,
    greatball: 200,
    ultraball: 1000,
    voucher: 2000
  };

  function parseItem(itemKey) {
    if (typeof itemKey !== 'string' || !itemKey) return null;
    if (itemKey === 'abilityGem') return { kind: 'abilityGem', minPrice: MIN_PRICES.abilityGem };
    if (['pokeball', 'greatball', 'ultraball'].includes(itemKey)) {
      return { kind: 'ball', ball: itemKey, minPrice: MIN_PRICES[itemKey] };
    }
    if (itemKey.startsWith('voucher:')) {
      const medalId = itemKey.slice(8);
      const def = G.AbilityDefs?.BY_ID?.[medalId];
      if (def && def.leader) return { kind: 'voucher', medalId, def, minPrice: MIN_PRICES.voucher };
    }
    return null;
  }

  function itemMeta(itemKey) {
    const p = parseItem(itemKey);
    if (!p) return null;
    if (p.kind === 'abilityGem') {
      return {
        key: itemKey, kind: p.kind, minPrice: p.minPrice,
        name: L('Gema de habilidad', 'Ability Gem', '特性宝石'),
        desc: L('Usada en el Gacha de habilidades.', 'Used for Ability Gacha pulls.', '用于抽取队长特性卡池。'),
        iconHtml: G.Icons ? G.Icons.html('gem', 24) : '💎'
      };
    }
    if (p.kind === 'ball') {
      const info = {
        pokeball: [L('Poké Ball', 'Poké Ball', '普通球'), 'ball'],
        greatball: [L('Super Ball', 'Great Ball', '超级球'), 'ball2'],
        ultraball: [L('Ultra Ball', 'Ultra Ball', '高级球'), 'ball3']
      }[p.ball];
      return {
        key: itemKey, kind: p.kind, ball: p.ball, minPrice: p.minPrice,
        name: info[0],
        desc: L('Usada para capturar Pokémon debilitados.', 'Used to capture fainted Pokémon in battle.', '用于战斗中捕捉倒下的宝可梦。'),
        iconHtml: G.Icons ? G.Icons.html(info[1], 24) : '⚪'
      };
    }
    const mon = G.DEX_BY?.[p.def.dex];
    const monName = mon ? G.T(mon.name) : ('#' + p.def.dex);
    const abName = G.T(p.def.name);
    return {
      key: itemKey, kind: 'voucher', medalId: p.medalId, dex: p.def.dex, def: p.def, minPrice: p.minPrice,
      name: L(`Vale · ${monName}`, `Voucher · ${monName}`, `特性勋章兑换券 · ${monName}`),
      sub: abName,
      desc: L(
        'Al comprar, desbloquea inmediatamente la medalla de capitán de esta familia y se consume.',
        'Buying immediately unlocks this family’s Captain Ability Medal and consumes the voucher.',
        `购买后立即解锁【${monName}】家族的队长特性勋章（${abName}）并消耗兑换券。`
      ),
      iconHtml: G.Icons ? G.Icons.html('medal3', 24) : '🏅'
    };
  }

  function consignable(save = G.DB?.save) {
    if (!save) return [];
    const list = [];
    if ((save.abilityGems || 0) > 0) list.push({ ...itemMeta('abilityGem'), owned: save.abilityGems });
    const balls = save.pokeballs || {};
    for (const k of ['pokeball', 'greatball', 'ultraball']) {
      if ((balls[k] || 0) > 0) list.push({ ...itemMeta(k), owned: balls[k] });
    }
    for (const [medalId, cnt] of Object.entries(save.abilityVouchers || {})) {
      if (cnt > 0) {
        const meta = itemMeta('voucher:' + medalId);
        if (meta) list.push({ ...meta, owned: cnt });
      }
    }
    return list;
  }

  function isServerMode() {
    return !!(G.DB?.online && !G.DB?.guest && G.Server?.user);
  }

  // ---- Local / Guest fallback store ----
  function readLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function writeLocal(arr) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(arr)); } catch {}
  }
  function localUid() { return G.DB?.guest ? 'guest' : ('local:' + (G.DB?.user || 'player')); }
  function localName() { return G.DB?.guest ? L('Invitado', 'Guest', '游客') : (G.DB?.user || L('Jugador', 'Player', '玩家')); }

  function buildLocalMarket() {
    const uid = localUid();
    const active = readLocal().filter(x => x.status === 'active').sort((a, b) => a.price - b.price || a.created - b.created);
    const catMap = new Map();
    const mine = [];
    for (const r of active) {
      if (r.sellerUid === uid) mine.push(r);
      const cur = catMap.get(r.itemKey);
      if (!cur) catMap.set(r.itemKey, { itemKey: r.itemKey, minPrice: r.price, count: 1 });
      else { cur.count++; if (r.price < cur.minPrice) cur.minPrice = r.price; }
    }
    return { ok: true, categories: [...catMap.values()], listings: active, mine, local: true };
  }

  async function fetchMarket() {
    if (isServerMode()) return G.Server.exchangeAction('/exchange');
    return buildLocalMarket();
  }

  async function listItem(itemKey, price) {
    const parsed = parseItem(itemKey);
    if (!parsed) throw new Error(L('Este objeto no puede consignarse.', 'Item cannot be consigned.', '该物品不可寄售。'));
    const p = Math.floor(Number(price));
    if (!Number.isSafeInteger(p) || p < parsed.minPrice || p > 1e8) {
      throw new Error(L(`Precio mínimo: ${parsed.minPrice}`, `Minimum price: ${parsed.minPrice}`, `最低寄售价格为 ${parsed.minPrice} 联盟币。`));
    }
    if (isServerMode()) return G.Server.exchangeAction('/exchange/list', { itemKey, price: p });
    const s = G.DB.save;
    s.pokeballs ||= { pokeball: 0, greatball: 0, ultraball: 0 };
    s.abilityVouchers ||= {};
    if (parsed.kind === 'abilityGem') {
      if ((s.abilityGems || 0) < 1) throw new Error(L('Gemas insuficientes.', 'Insufficient Ability Gems.', '特性宝石数量不足。'));
      s.abilityGems -= 1;
    } else if (parsed.kind === 'ball') {
      if ((s.pokeballs[parsed.ball] || 0) < 1) throw new Error(L('Poké Balls insuficientes.', 'Insufficient Poké Balls.', '精灵球数量不足。'));
      s.pokeballs[parsed.ball] -= 1;
    } else {
      if ((s.abilityVouchers[parsed.medalId] || 0) < 1) throw new Error(L('Vales insuficientes.', 'Insufficient Medal Vouchers.', '特性勋章兑换券数量不足。'));
      s.abilityVouchers[parsed.medalId] -= 1;
      if (s.abilityVouchers[parsed.medalId] <= 0) delete s.abilityVouchers[parsed.medalId];
    }
    const arr = readLocal();
    const listing = {
      id: 'loc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      itemKey, price: p, sellerUid: localUid(), sellerName: localName(), created: Date.now(), status: 'active'
    };
    arr.push(listing);
    writeLocal(arr);
    G.DB.commit(true);
    G.UI?.refreshCoins?.();
    return { ok: true, listing };
  }

  async function buyItem(id) {
    if (isServerMode()) return G.Server.exchangeAction('/exchange/buy', { id });
    const arr = readLocal();
    const row = arr.find(x => x.id === id && x.status === 'active');
    if (!row) throw new Error(L('Anuncio no encontrado.', 'Listing not found.', '该寄售商品不存在或已被买走。'));
    if (row.sellerUid === localUid()) throw new Error(L('No puedes comprar tu propio anuncio.', 'Cannot buy your own listing.', '不能购买自己寄售的商品。'));
    const parsed = parseItem(row.itemKey);
    const s = G.DB.save;
    if ((s.leagueCoins || 0) < row.price) throw new Error(L('Monedas de la Liga insuficientes.', 'Insufficient League Coins.', '联盟币余额不足。'));
    s.abilityMedals ||= {};
    s.pokeballs ||= { pokeball: 0, greatball: 0, ultraball: 0 };
    if (parsed.kind === 'voucher') {
      if (s.abilityMedals[parsed.medalId]) throw new Error(L('Ya posees esta medalla.', 'Ability medal already owned.', '你已拥有该家族的特性勋章，无需重复购买。'));
      s.abilityMedals[parsed.medalId] = { at: Date.now(), from: 'exchange' };
    } else if (parsed.kind === 'abilityGem') {
      s.abilityGems = Math.min(1e8, (s.abilityGems || 0) + 1);
    } else if (parsed.kind === 'ball') {
      s.pokeballs[parsed.ball] = Math.min(9999, (s.pokeballs[parsed.ball] || 0) + 1);
    }
    s.leagueCoins -= row.price;
    row.status = 'sold';
    writeLocal(arr);
    G.DB.commit(true);
    G.UI?.refreshCoins?.();
    return { ok: true, listing: row };
  }

  async function cancelListing(id) {
    if (isServerMode()) return G.Server.exchangeAction('/exchange/cancel', { id });
    const arr = readLocal();
    const row = arr.find(x => x.id === id && x.sellerUid === localUid() && x.status === 'active');
    if (!row) throw new Error(L('Anuncio no encontrado.', 'Listing not found.', '未找到该寄售商品。'));
    const parsed = parseItem(row.itemKey);
    const s = G.DB.save;
    s.pokeballs ||= { pokeball: 0, greatball: 0, ultraball: 0 };
    s.abilityVouchers ||= {};
    if (parsed?.kind === 'abilityGem') s.abilityGems = Math.min(1e8, (s.abilityGems || 0) + 1);
    else if (parsed?.kind === 'ball') s.pokeballs[parsed.ball] = Math.min(9999, (s.pokeballs[parsed.ball] || 0) + 1);
    else if (parsed?.kind === 'voucher') s.abilityVouchers[parsed.medalId] = Math.min(9999, (s.abilityVouchers[parsed.medalId] || 0) + 1);
    row.status = 'cancelled';
    writeLocal(arr);
    G.DB.commit(true);
    G.UI?.refreshCoins?.();
    return { ok: true };
  }

  return { MIN_PRICES, parseItem, itemMeta, consignable, fetchMarket, listItem, buyItem, cancelListing, isServerMode };
})();
