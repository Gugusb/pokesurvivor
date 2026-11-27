/* ============ exchange-ui.js — 交易所界面（按种类浏览 / 价格升序详情 / 寄售与下架） ============ */
G.ExchangeUI = (() => {
  const $ = G.UI.$;
  const L = (es, en, zh) => G.I18n?.lang === 'zh' ? zh : G.I18n?.lang === 'en' ? en : es;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let tab = 'browse'; // 'browse' | 'sell' | 'mine'
  let selectedKey = null;
  let market = { categories: [], listings: [], mine: [] };
  let busy = false;

  function open() {
    G.UI.show('scr-exchange', true);
    selectedKey = null;
    refresh();
  }

  async function refresh() {
    const body = $('exchange-body');
    const bal = $('exchange-balance');
    const s = G.DB.save;
    if (bal) bal.textContent = (s?.leagueCoins || 0).toLocaleString('es');
    document.querySelectorAll('#exchange-tabs .gen-tab').forEach(b => {
      b.classList.toggle('on', b.dataset.t === tab);
      b.onclick = () => { tab = b.dataset.t; selectedKey = null; render(); };
    });
    if (body) body.innerHTML = `<p class="note">${L('Cargando...', 'Loading...', '正在加载交易所...')}</p>`;
    try {
      market = await G.Exchange.fetchMarket();
    } catch (e) {
      if (body) body.innerHTML = `<p class="err">${esc(e.message || String(e))}</p>`;
      return;
    }
    render();
  }

  function render() {
    const body = $('exchange-body');
    const bal = $('exchange-balance');
    const s = G.DB.save;
    if (bal) bal.textContent = (s?.leagueCoins || 0).toLocaleString('es');
    if (!body) return;
    body.innerHTML = '';

    if (tab === 'browse') {
      if (selectedKey) renderCategoryDetail(body, selectedKey);
      else renderCategories(body);
    } else if (tab === 'sell') {
      renderSell(body);
    } else {
      renderMine(body);
    }
  }

  function renderCategories(body) {
    const baseKeys = ['abilityGem', 'pokeball', 'greatball', 'ultraball'];
    const catByKey = new Map((market.categories || []).map(c => [c.itemKey, c]));
    const voucherKeys = (market.categories || []).map(c => c.itemKey).filter(k => k.startsWith('voucher:')).sort();
    const allKeys = [...baseKeys, ...voucherKeys];

    const grid = document.createElement('div');
    grid.className = 'exchange-grid';
    for (const key of allKeys) {
      const meta = G.Exchange.itemMeta(key);
      if (!meta) continue;
      const stat = catByKey.get(key);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'exchange-cat-card' + (stat ? '' : ' empty');
      card.innerHTML = `
        <div class="ex-ico">${meta.iconHtml}</div>
        <div class="ex-info">
          <b>${esc(meta.name)}</b>
          ${meta.sub ? `<small>${esc(meta.sub)}</small>` : ''}
          <span class="ex-price">${stat
            ? `${L('Desde', 'From', '最低价')} <b>🏅 ${stat.minPrice.toLocaleString('es')}</b> · ${L(stat.count + ' disp.', stat.count + ' listed', '在售 ' + stat.count + ' 件')}`
            : L('Sin existencias · mín. ' + meta.minPrice, 'None listed · min ' + meta.minPrice, '暂无寄售 · 最低价 ' + meta.minPrice)}</span>
        </div>`;
      card.onclick = () => { selectedKey = key; render(); };
      grid.appendChild(card);
    }
    body.appendChild(grid);
  }

  function renderCategoryDetail(body, key) {
    const meta = G.Exchange.itemMeta(key);
    const s = G.DB.save;
    const myUid = G.Exchange.isServerMode() ? G.Server.user?.uid : (G.DB.guest ? 'guest' : 'local:' + (G.DB.user || 'player'));
    const list = (market.listings || []).filter(x => x.itemKey === key).sort((a, b) => a.price - b.price || a.created - b.created);

    const head = document.createElement('div');
    head.className = 'row between exchange-detail-head';
    head.innerHTML = `<div class="row" style="gap:10px;align-items:center">${meta.iconHtml}<div><b>${esc(meta.name)}</b><p class="note" style="margin:2px 0 0">${esc(meta.desc)}</p></div></div>`;
    const back = document.createElement('button');
    back.className = 'btn small ghost';
    back.textContent = L('Volver a categorías', 'Back to categories', '返回商品分类');
    back.onclick = () => { selectedKey = null; render(); };
    head.appendChild(back);
    body.appendChild(head);

    if (!list.length) {
      body.insertAdjacentHTML('beforeend', `<p class="note" style="margin-top:14px">${L('No hay anuncios activos para este artículo.', 'No active listings for this item.', '当前没有玩家寄售该商品。')}</p>`);
      return;
    }

    const ul = document.createElement('div');
    ul.className = 'exchange-list';
    for (const item of list) {
      const isMine = item.sellerUid === myUid;
      const alreadyOwnedMedal = meta.kind === 'voucher' && !!(s.abilityMedals && s.abilityMedals[meta.medalId]);
      const canAfford = (s.leagueCoins || 0) >= item.price;
      const row = document.createElement('div');
      row.className = 'exchange-row';
      row.innerHTML = `
        <div class="ex-row-main">
          <b class="ex-row-price">🏅 ${item.price.toLocaleString('es')}</b>
          <span class="ex-row-seller">${L('Vendedor', 'Seller', '寄售者')}：<span translate="no">${esc(item.sellerName)}</span></span>
        </div>`;
      const btn = document.createElement('button');
      btn.className = 'btn small gold';
      if (isMine) {
        btn.textContent = L('Tuyo', 'Yours', '我的寄售');
        btn.disabled = true;
      } else if (alreadyOwnedMedal) {
        btn.textContent = L('Ya desbloqueada', 'Already owned', '已拥有勋章');
        btn.disabled = true;
      } else {
        btn.textContent = L('Comprar', 'Buy', '购买');
        btn.disabled = !canAfford || busy;
        btn.onclick = async () => {
          if (busy) return;
          busy = true;
          try {
            await G.Exchange.buyItem(item.id);
            G.Audio.sfx('confirm');
            G.UI.toast(meta.kind === 'voucher'
              ? L('¡Medalla de capitán desbloqueada!', 'Captain Ability Medal unlocked!', '购买成功！已立即解锁该家族的队长特性勋章。')
              : L('¡Compra realizada!', 'Purchase complete!', '购买成功！物品已放入背包。'));
            await refresh();
          } catch (e) {
            G.Audio.sfx('error');
            G.UI.toast(e.message || String(e));
          } finally { busy = false; }
        };
      }
      row.appendChild(btn);
      ul.appendChild(row);
    }
    body.appendChild(ul);
  }

  function renderSell(body) {
    const items = G.Exchange.consignable(G.DB.save);
    if (!items.length) {
      body.innerHTML = `<p class="note">${L('No tienes objetos consignables ahora mismo.', 'You have no consignable items right now.', '你当前没有可寄售的物品（特性宝石、特性勋章兑换券、普通/超级/高级球）。')}</p>`;
      return;
    }
    const ul = document.createElement('div');
    ul.className = 'exchange-list';
    for (const meta of items) {
      const row = document.createElement('div');
      row.className = 'exchange-row sell-row';
      row.innerHTML = `
        <div class="ex-row-main">
          ${meta.iconHtml}
          <div>
            <b>${esc(meta.name)}</b> <small>×${meta.owned}</small>
            <div class="note" style="margin:2px 0 0">${L('Precio mínimo', 'Min price', '最低寄售价')}：🏅 ${meta.minPrice}</div>
          </div>
        </div>`;
      const ctrl = document.createElement('div');
      ctrl.className = 'row';
      ctrl.style.gap = '6px';
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'ex-price-input';
      input.min = meta.minPrice;
      input.max = 100000000;
      input.step = 10;
      input.value = meta.minPrice;
      const btn = document.createElement('button');
      btn.className = 'btn small gold';
      btn.textContent = L('Consignar', 'List', '寄售');
      btn.onclick = async () => {
        if (busy) return;
        const price = Math.floor(Number(input.value));
        if (!Number.isSafeInteger(price) || price < meta.minPrice) {
          G.Audio.sfx('error');
          G.UI.toast(L(`Mínimo ${meta.minPrice}`, `Minimum ${meta.minPrice}`, `最低寄售价格为 ${meta.minPrice} 联盟币`));
          return;
        }
        busy = true;
        try {
          await G.Exchange.listItem(meta.key, price);
          G.Audio.sfx('confirm');
          G.UI.toast(L('¡Publicado en la Bolsa!', 'Listed on Exchange!', '寄售上架成功！'));
          await refresh();
        } catch (e) {
          G.Audio.sfx('error');
          G.UI.toast(e.message || String(e));
        } finally { busy = false; }
      };
      ctrl.append(input, btn);
      row.appendChild(ctrl);
      ul.appendChild(row);
    }
    body.appendChild(ul);
  }

  function renderMine(body) {
    const list = market.mine || [];
    if (!list.length) {
      body.innerHTML = `<p class="note">${L('No tienes artículos en venta.', 'You have no active listings.', '你目前没有正在寄售的商品。')}</p>`;
      return;
    }
    const ul = document.createElement('div');
    ul.className = 'exchange-list';
    for (const item of list) {
      const meta = G.Exchange.itemMeta(item.itemKey);
      const row = document.createElement('div');
      row.className = 'exchange-row';
      row.innerHTML = `
        <div class="ex-row-main">
          ${meta ? meta.iconHtml : ''}
          <div>
            <b>${esc(meta ? meta.name : item.itemKey)}</b>
            <div class="note" style="margin:2px 0 0">🏅 ${item.price.toLocaleString('es')}</div>
          </div>
        </div>`;
      const btn = document.createElement('button');
      btn.className = 'btn small ghost';
      btn.textContent = L('Retirar', 'Cancel', '下架');
      btn.onclick = async () => {
        if (busy) return;
        busy = true;
        try {
          await G.Exchange.cancelListing(item.id);
          G.Audio.sfx('back');
          G.UI.toast(L('Artículo devuelto.', 'Listing cancelled; item returned.', '已下架，物品已退回背包。'));
          await refresh();
        } catch (e) {
          G.Audio.sfx('error');
          G.UI.toast(e.message || String(e));
        } finally { busy = false; }
      };
      row.appendChild(btn);
      ul.appendChild(row);
    }
    body.appendChild(ul);
  }

  return { open, refresh };
})();
