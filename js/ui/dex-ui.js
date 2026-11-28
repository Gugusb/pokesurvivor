/* ============ dex-ui.js — 新版双栏图鉴界面（斜切英雄横幅 · 六维雷达 · 分页详情 · 右侧卡片池） ============ */
G.DexUI = (() => {
  const $ = id => document.getElementById(id);
  const L = (es, en, zh) => G.I18n?.lang === 'zh' ? zh : G.I18n?.lang === 'en' ? en : es;

  const GEN_NAMES = [
    ['Kanto', 'Kanto', '关都'],
    ['Johto', 'Johto', '城都'],
    ['Hoenn', 'Hoenn', '丰缘'],
    ['Sinnoh', 'Sinnoh', '神奥'],
    ['Teselia', 'Unova', '合众'],
    ['Kalos', 'Kalos', '卡洛斯'],
    ['Alola', 'Alola', '阿罗拉'],
    ['Galar', 'Galar', '伽勒尔'],
    ['Paldea', 'Paldea', '帕底亚']
  ];

  const ALL_TYPES = [
    'normal', 'fire', 'water', 'electric', 'grass', 'ice',
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
    'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
  ];

  const KIND_FALLBACK = {
    projectile: ['Proyectil', 'Projectile', '投射物'],
    melee: ['Cuerpo a cuerpo', 'Melee', '近战'],
    beam: ['Rayo', 'Beam', '能量柱'],
    orbit: ['Órbita', 'Orbit', '环绕'],
    nova: ['Onda', 'Nova', '冲击波'],
    aura: ['Aura', 'Aura', '光环'],
    buff: ['Mejora', 'Buff', '增益'],
    boomerang: ['Bumerán', 'Boomerang', '回旋'],
    chain: ['Cadena', 'Chain', '连锁'],
    mine: ['Mina', 'Mine', '地雷'],
    meteor: ['Meteoro', 'Meteor', '陨石'],
    turret: ['Torreta', 'Turret', '炮台'],
    dash: ['Embestida', 'Dash', '冲刺'],
    trail: ['Rastro', 'Trail', '轨迹'],
    cone: ['Abanico', 'Cone', '扇形']
  };

  let dexGen = 1;       // 'all' | 'mega' | 1..9
  let dexCat = 'all';   // 'all' | 'own' | 'miss' | 'shiny'
  let dexRarity = 'all'; // 'all' | '1'..'5'
  let dexSearch = '';
  let dexSel = null;
  let activeTab = 'overview'; // overview | moves | stats | types | abilities | research
  let viewShiny = false;
  let filterOpen = false;
  let lastRenderedDex = null;
  let keysBound = false;

  const megaDexes = () => new Set((G.Mega?.LIST || []).map(f => f.dex));
  const genLabel = g => {
    const row = GEN_NAMES[g - 1];
    return row ? L(row[0], row[1], row[2]) : `Gen ${g}`;
  };
  const kindText = kind => {
    if (G.LeaderAbilitiesUI?.kindLabel) return G.LeaderAbilitiesUI.kindLabel(kind);
    const k = KIND_FALLBACK[kind];
    return k ? L(k[0], k[1], k[2]) : kind;
  };
  const typeText = t => G.T(G.U.TYPE_NAME[t] || t);
  const monName = p => G.T(p.name);

  function shadeHex(hex, factor) {
    if (!hex || hex[0] !== '#' || hex.length !== 7) return '#4b5c8a';
    const r = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * factor)));
    const g = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * factor)));
    const b = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * factor)));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function inScope(p, s) {
    const q = dexSearch.trim().toLowerCase();
    const mSet = megaDexes();
    if (dexGen === 'mega') {
      if (!mSet.has(p.dex)) return false;
    } else if (!q && dexGen !== 'all') {
      if (p.gen !== dexGen) return false;
    }
    if (dexCat === 'own' && !s.owned[p.dex]) return false;
    if (dexCat === 'miss' && s.owned[p.dex]) return false;
    if (dexCat === 'shiny' && !s.shiny?.[p.dex]) return false;
    if (/^\d$/.test(dexRarity) && p.rarity !== +dexRarity) return false;
    if (q) {
      const num = String(p.dex);
      const pad = num.padStart(3, '0');
      const en = (p.name || '').toLowerCase();
      const loc = (monName(p) || '').toLowerCase();
      if (!en.includes(q) && !loc.includes(q) && !num.includes(q) && !pad.includes(q)) return false;
    }
    return true;
  }

  function visibleList(s = G.DB.save) {
    return G.DEX.filter(p => inScope(p, s));
  }

  function researchSummary(dex, s) {
    if (!G.Research) return { tasks: [], done: 0, claimed: 0, claimable: 0 };
    const tasks = G.Research.tasksFor(dex, s);
    let done = 0, claimed = 0, claimable = 0;
    for (const t of tasks) {
      if (t.done) done++;
      if (t.claimed) claimed++;
      if (t.done && !t.claimed) claimable++;
    }
    return { tasks, done, claimed, claimable };
  }

  function appendFormattedText(el, text) {
    const parts = String(text || '').replace(/^\s*\*\s+/gm, '').split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        const b = document.createElement('strong');
        b.textContent = part.slice(2, -2);
        el.appendChild(b);
      } else if (part.startsWith('`') && part.endsWith('`')) {
        const c = document.createElement('code');
        c.textContent = part.slice(1, -1);
        el.appendChild(c);
      } else if (part) {
        el.appendChild(document.createTextNode(part));
      }
    }
  }

  function leaderText(def, key) {
    if (!def) return [];
    const lang = G.I18n?.lang || 'es';
    const authored = def.display?.[lang]?.[key]
      || (lang !== 'zh' ? def.display?.en?.[key] : null)
      || def.description?.[lang]?.[key]
      || (lang !== 'zh' ? def.description?.en?.[key] : null)
      || (def.generation >= 5 ? def.description?.zh?.[key] : null);
    if (authored) return Array.isArray(authored) ? authored : [authored];
    if (key === 'active') {
      const zt = G.LeaderAbilitiesUI?.zText?.[def.active?.kind] || '';
      return zt ? [zt] : [def.active?.kind || ''];
    }
    return G.LeaderAbilitiesUI?.lines ? G.LeaderAbilitiesUI.lines(def[key]) : [];
  }

  function buildRadarSvg(p) {
    const bs = p.baseStats || { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 };
    const axes = [
      { lbl: L('PS', 'HP', 'HP'), val: bs.hp },
      { lbl: L('Atq', 'Atk', '攻击'), val: bs.atk },
      { lbl: L('Def', 'Def', '防御'), val: bs.def },
      { lbl: L('Vel', 'Spe', '速度'), val: bs.spe },
      { lbl: L('Def.E', 'SpD', '特防'), val: bs.spd },
      { lbl: L('At.E', 'SpA', '特攻'), val: bs.spa }
    ];
    const cx = 110, cy = 96, R = 60, MAX_STAT = 155;
    const pt = (i, r) => {
      const ang = (-90 + i * 60) * Math.PI / 180;
      return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
    };
    const ring = frac => axes.map((_, i) => pt(i, R * frac).map(n => n.toFixed(1)).join(',')).join(' ');
    const dataPoly = axes.map((a, i) => {
      const frac = Math.min(1, Math.max(0.16, a.val / MAX_STAT));
      return pt(i, R * frac).map(n => n.toFixed(1)).join(',');
    }).join(' ');

    const spokes = axes.map((_, i) => {
      const [x, y] = pt(i, R);
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,.32)" stroke-width="1"/>`;
    }).join('');

    const labels = axes.map((a, i) => {
      const [x, y] = pt(i, R + 21);
      const anchor = i === 0 || i === 3 ? 'middle' : i < 3 ? 'start' : 'end';
      const dx = i === 0 || i === 3 ? 0 : i < 3 ? -6 : 6;
      const dy = i === 0 ? -2 : i === 3 ? 8 : 3;
      return `<text class="dex-radar-lbl" x="${(x + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}" translate="no">${a.lbl} ${a.val}</text>`;
    }).join('');

    return `<svg class="dex-radar-svg" viewBox="0 0 220 192" aria-label="Base Stats Radar">
      <polygon points="${ring(1)}" fill="rgba(16,22,42,.26)" stroke="rgba(255,255,255,.58)" stroke-width="1.4"/>
      <polygon points="${ring(0.66)}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1"/>
      <polygon points="${ring(0.33)}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1"/>
      ${spokes}
      <polygon points="${dataPoly}" fill="rgba(255,212,86,.56)" stroke="#ffe58f" stroke-width="2.2" stroke-linejoin="round"/>
      ${labels}
    </svg>`;
  }

  function selectDex(dex, opts = {}) {
    const p = G.DEX_BY[dex];
    if (!p) return;
    dexSel = p.dex;
    if (opts.syncGen && dexGen !== 'all' && dexGen !== 'mega' && p.gen !== dexGen) {
      dexGen = p.gen;
      renderGenTabs();
    }
    if (opts.tab) activeTab = opts.tab;
    const grid = $('dex-grid');
    if (grid) {
      const cards = grid.querySelectorAll('.cell');
      let found = null;
      cards.forEach(c => {
        const hit = +c.dataset.dex === dexSel;
        c.classList.toggle('on', hit);
        if (hit) found = c;
      });
      if (!found && opts.rerenderIfMissing) {
        renderGrid();
        found = grid.querySelector(`.cell[data-dex="${dexSel}"]`);
      }
      if (found && opts.scroll) found.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    showDetail(dexSel);
  }

  function stepSelection(delta) {
    const vis = visibleList();
    if (!vis.length) return;
    const idx = vis.findIndex(p => p.dex === dexSel);
    const next = idx < 0 ? 0 : (idx + delta + vis.length) % vis.length;
    selectDex(vis[next].dex, { scroll: true });
  }

  function bindKeys() {
    if (keysBound) return;
    keysBound = true;
    document.addEventListener('keydown', e => {
      if (!G.UI.isOpen('scr-dex')) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') { document.activeElement.blur(); }
        return;
      }
      if (e.key === 'Escape') {
        G.MenuUI.open();
      } else if (e.key === 'Enter') {
        const pick = $('dex-pick');
        if (pick && !pick.disabled) { e.preventDefault(); pick.click(); }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault(); stepSelection(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault(); stepSelection(-1);
      }
    });
  }

  function open() {
    bindKeys();
    G.UI.show('scr-dex', true);
    const s = G.DB.save;
    if (dexSel === null || !G.DEX_BY[dexSel]) {
      dexSel = s.partner;
      dexGen = G.DEX_BY[s.partner]?.gen || 1;
    }
    wireStaticControls();
    renderAll();
  }

  function wireStaticControls() {
    const search = $('dex-search');
    if (search && !search.dataset.wired) {
      search.dataset.wired = '1';
      search.oninput = () => {
        dexSearch = search.value;
        $('dex-search-clear')?.classList.toggle('hidden', !dexSearch);
        renderAll(false);
      };
    }
    const clr = $('dex-search-clear');
    if (clr && !clr.dataset.wired) {
      clr.dataset.wired = '1';
      clr.onclick = () => {
        dexSearch = '';
        if (search) search.value = '';
        clr.classList.add('hidden');
        renderAll(false);
      };
    }
    const fBtn = $('dex-filter-toggle');
    if (fBtn && !fBtn.dataset.wired) {
      fBtn.dataset.wired = '1';
      fBtn.onclick = () => {
        filterOpen = !filterOpen;
        fBtn.classList.toggle('on', filterOpen || dexRarity !== 'all');
        $('dex-filters')?.classList.toggle('collapsed', !filterOpen);
      };
    }
    const rnd = $('dex-random');
    if (rnd && !rnd.dataset.wired) {
      rnd.dataset.wired = '1';
      rnd.onclick = () => {
        const vis = visibleList();
        if (!vis.length) return;
        const pick = vis[Math.floor(Math.random() * vis.length)];
        G.Audio?.sfx?.('select');
        selectDex(pick.dex, { scroll: true });
      };
    }
  }

  function renderAll(updateSearchPlaceholder = true) {
    const s = G.DB.save;
    if (updateSearchPlaceholder) {
      const search = $('dex-search');
      if (search) {
        search.placeholder = L('Buscar por nombre o nº...', 'Search name or #...', '按名称或编号搜索...');
        search.value = dexSearch;
      }
      $('dex-search-clear')?.classList.toggle('hidden', !dexSearch);
      const fBtn = $('dex-filter-toggle');
      if (fBtn) {
        fBtn.innerHTML = L('Filtrar ▾', 'Filter ▾', '筛选 ▾');
        fBtn.classList.toggle('on', filterOpen || dexRarity !== 'all');
      }
      const rnd = $('dex-random');
      if (rnd) rnd.innerHTML = '↻ ' + L('Aleatorio', 'Random', '随机');
    }

    renderCategoryBar();
    renderGenTabs();
    renderRarityFilters();

    const vis = visibleList(s);
    if (!vis.some(p => p.dex === dexSel)) dexSel = vis[0]?.dex ?? null;
    renderGrid(vis);
    renderRosterFooter();
    if (dexSel != null) showDetail(dexSel);
    else renderEmptyDetail();
  }

  function renderCategoryBar() {
    const bar = $('dex-cat-bar');
    if (!bar) return;
    bar.innerHTML = '';
    const items = [
      { k: 'all', label: L('Todos', 'All', '全部'), isMega: false },
      { k: 'own', label: L('Tengo', 'Owned', '已拥有'), isMega: false },
      { k: 'miss', label: L('Faltan', 'Missing', '未拥有'), isMega: false },
      { k: 'shiny', label: G.Icons.html('shiny', 11) + ' ' + L('Shiny', 'Shiny', '异色'), isMega: false },
      { k: 'mega', label: G.Icons.html('megaStone', 11) + ' <span translate="no">Mega</span>', isMega: true }
    ];
    for (const it of items) {
      const b = document.createElement('button');
      const isOn = it.isMega ? dexGen === 'mega' : (dexGen !== 'mega' && dexCat === it.k);
      b.className = 'dex-cat-btn' + (isOn ? ' on' : '');
      b.innerHTML = it.label;
      b.onclick = () => {
        if (it.isMega) {
          dexGen = dexGen === 'mega' ? 1 : 'mega';
        } else {
          if (dexGen === 'mega') dexGen = 'all';
          dexCat = it.k;
        }
        renderAll(false);
      };
      bar.appendChild(b);
    }
  }

  function renderGenTabs() {
    const tabs = $('dex-gens');
    if (!tabs) return;
    const s = G.DB.save;
    const mSet = megaDexes();
    tabs.innerHTML = '';

    const mkTab = (idx, html, isMega = false) => {
      const b = document.createElement('button');
      const on = dexGen === idx;
      b.className = 'gen-tab' + (isMega ? ' mega-index' : '') + (on ? ' on' : '');
      b.dataset.dexIndex = String(idx);
      b.setAttribute('aria-pressed', String(on));
      b.innerHTML = html;
      b.onclick = () => { dexGen = idx; renderAll(false); };
      tabs.appendChild(b);
    };

    const ownedAll = Object.keys(s.owned).filter(d => G.DEX_BY[d]).length;
    mkTab('all', `<b>${L('Todas', 'All', '全世代')}</b><small>${ownedAll}/${G.DEX.length}</small>`);

    const megaLabel = G.I18n?.lang === 'zh' ? 'Mega 进化' : G.T('Megaevolución');
    const megaHave = [...mSet].filter(d => s.owned[d]).length;
    mkTab('mega', `<b translate="no">${G.Icons.html('megaStone', 13)} ${megaLabel}</b><small>${megaHave}/${mSet.size}</small>`, true);

    GEN_NAMES.forEach((_, i) => {
      const g = i + 1;
      const total = G.DEX.filter(p => p.gen === g).length;
      const have = G.DEX.filter(p => p.gen === g && s.owned[p.dex]).length;
      mkTab(g, `<b>${genLabel(g)}</b><small>${have}/${total}</small>`);
    });
  }

  function renderRarityFilters() {
    const fb = $('dex-filters');
    if (!fb) return;
    fb.classList.toggle('collapsed', !filterOpen);
    fb.innerHTML = '';
    const chips = [
      ['all', L('Todas las rarezas', 'All Rarities', '全部稀有度')],
      ['5', 5], ['4', 4], ['3', 3], ['2', 2], ['1', 1]
    ];
    for (const [k, label] of chips) {
      const c = document.createElement('button');
      c.className = 'chip' + (k === dexRarity ? ' on' : '');
      c.innerHTML = typeof label === 'number'
        ? G.Icons.rarity(label, 12) + ' ' + G.T(G.Gacha.RARITY_NAME[label])
        : label;
      c.onclick = () => {
        dexRarity = k;
        $('dex-filter-toggle')?.classList.toggle('on', filterOpen || dexRarity !== 'all');
        renderAll(false);
      };
      fb.appendChild(c);
    }
  }

  function renderGrid(vis) {
    const s = G.DB.save;
    const grid = $('dex-grid');
    if (!grid) return;
    const list = vis || visibleList(s);
    grid.innerHTML = '';
    const mSet = megaDexes();

    for (const p of list) {
      const own = !!s.owned[p.dex];
      const inv = s.invites?.[p.dex] || 0;
      const sh = !!s.shiny?.[p.dex];
      const usable = own || inv > 0;
      const reveal = usable || (dexGen === 'mega' && mSet.has(p.dex));

      const cell = document.createElement('div');
      cell.className = 'cell'
        + (usable ? '' : ' locked')
        + (!own && inv > 0 ? ' is-invite' : '')
        + (p.dex === dexSel ? ' on' : '');
      cell.dataset.dex = p.dex;
      cell.style.setProperty('--card-c', G.U.TYPE_COLOR[p.types[0]] || '#5fcb6a');

      if (dexGen === 'mega') {
        cell.classList.add('mega-entry');
        cell.tabIndex = 0;
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-label', monName(p) + ' · ' + G.T(own ? 'Tengo' : 'Sin registrar'));
      }
      if (G.DifficultyUI && own) G.DifficultyUI.decorate(cell, p.dex);

      cell.insertAdjacentHTML('beforeend', `<span class="no" translate="no">${String(p.dex).padStart(3, '0')}</span>`);
      if (p.dex === s.partner) {
        cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="${L('Compañero', 'Partner', '当前出战伙伴')}">${G.Icons.html('crown', 13)}</span>`);
      } else if (sh) {
        cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="Shiny">${G.Icons.html('shiny', 12)}</span>`);
      } else if (!own && inv > 0) {
        cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="${L('Invitación', 'Invitation', '邀请函')}" translate="no">✉${inv}</span>`);
      } else if (!usable) {
        cell.insertAdjacentHTML('beforeend', `<span class="dex-lock-ico" aria-hidden="true">🔒</span>`);
      }

      const useShiny = sh && p.dex === s.partner && s.partnerShiny;
      cell.appendChild(G.UI.spriteCanvas(p.dex, 74, 62, {
        scale: 2,
        silhouette: !reveal,
        shadow: own,
        shiny: useShiny
      }));

      cell.insertAdjacentHTML('beforeend', `<b>${reveal ? monName(p) : '???'}</b>`);
      if (!usable) {
        const pct = Math.min(100, p.rarity * 20);
        cell.insertAdjacentHTML('beforeend', `<div class="dex-cell-bar"><i style="width:${pct}%;background:${G.Gacha.RARITY_COLOR[p.rarity]}"></i></div>`);
      } else {
        const rs = researchSummary(p.dex, s);
        const pct = Math.round((rs.claimed / Math.max(1, rs.tasks.length)) * 100);
        if (pct > 0) {
          cell.insertAdjacentHTML('beforeend', `<div class="dex-cell-bar"><i style="width:${pct}%;background:#ffe066"></i></div>`);
        }
      }

      cell.onclick = () => selectDex(p.dex);
      if (dexGen === 'mega') {
        cell.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cell.click(); } };
      }
      grid.appendChild(cell);
    }

    if (!grid.children.length) {
      grid.innerHTML = `<p class="sub" style="grid-column:1/-1;text-align:center;padding:24px 8px;">${L('Ningún Pokémon coincide con este filtro.', 'No Pokémon match this filter.', '没有符合当前筛选条件的宝可梦。')}</p>`;
    }
  }

  function renderRosterFooter() {
    const s = G.DB.save;
    const owned = Object.keys(s.owned).filter(d => G.DEX_BY[d]).length;
    const total = G.DEX.length;
    const pct = total ? Math.round((owned / total) * 100) : 0;

    const totalEl = $('dex-total');
    if (totalEl) totalEl.textContent = `${owned} / ${total}`;
    const barFill = $('dex-prog-fill');
    if (barFill) barFill.style.width = `${pct}%`;
    const progLbl = $('dex-prog-label');
    if (progLbl) progLbl.textContent = L('Progreso', 'Progress', '进度');

    const strip = $('dex-quick-strip');
    if (!strip) return;
    strip.innerHTML = '';

    // 快捷项 1：当前出战伙伴
    const partner = G.DEX_BY[s.partner];
    if (partner) {
      const btn = document.createElement('button');
      btn.className = 'dex-quick-card is-ready';
      btn.appendChild(G.UI.spriteCanvas(partner.dex, 30, 30, { portrait: true, shiny: !!s.partnerShiny && G.DB.ownsShiny(partner.dex) }));
      btn.insertAdjacentHTML('beforeend', `<div class="dex-quick-meta"><small>${L('En equipo', 'Partner', '出战中')}</small><b>${monName(partner)}</b></div>`);
      btn.onclick = () => selectDex(partner.dex, { syncGen: true, rerenderIfMissing: true, scroll: true });
      strip.appendChild(btn);
    }

    // 快捷项 2：有可领取研究奖励的宝可梦（或已解锁异色）
    let claimMon = null;
    for (const dStr of Object.keys(s.owned)) {
      const d = +dStr;
      if (!G.DEX_BY[d]) continue;
      if (researchSummary(d, s).claimable > 0) { claimMon = G.DEX_BY[d]; break; }
    }
    if (claimMon) {
      const btn = document.createElement('button');
      btn.className = 'dex-quick-card is-ready';
      btn.appendChild(G.UI.spriteCanvas(claimMon.dex, 30, 30, { portrait: true }));
      btn.insertAdjacentHTML('beforeend', `<div class="dex-quick-meta"><small>✦ ${L('Premio listo', 'Claimable', '研究可领')}</small><b>${monName(claimMon)}</b></div>`);
      btn.onclick = () => selectDex(claimMon.dex, { syncGen: true, rerenderIfMissing: true, scroll: true, tab: 'research' });
      strip.appendChild(btn);
    } else {
      const shinyDex = Object.keys(s.shiny || {}).map(Number).find(d => G.DEX_BY[d]);
      const fallback = shinyDex ? G.DEX_BY[shinyDex] : G.DEX_BY[25] || G.DEX[0];
      const btn = document.createElement('button');
      btn.className = 'dex-quick-card';
      btn.appendChild(G.UI.spriteCanvas(fallback.dex, 30, 30, { portrait: true, shiny: !!shinyDex }));
      btn.insertAdjacentHTML('beforeend', `<div class="dex-quick-meta"><small>${shinyDex ? '✦ Shiny' : L('Destacado', 'Featured', '推荐查看')}</small><b>${monName(fallback)}</b></div>`);
      btn.onclick = () => selectDex(fallback.dex, { syncGen: true, rerenderIfMissing: true, scroll: true });
      strip.appendChild(btn);
    }

    // 快捷项 3：已解锁 Mega 形态或当前世代统计
    const megaMon = [...megaDexes()].find(d => s.owned[d]) || [...megaDexes()][0];
    if (megaMon && G.DEX_BY[megaMon]) {
      const mp = G.DEX_BY[megaMon];
      const btn = document.createElement('button');
      btn.className = 'dex-quick-card';
      btn.appendChild(G.UI.spriteCanvas(mp.dex, 30, 30, { portrait: true }));
      btn.insertAdjacentHTML('beforeend', `<div class="dex-quick-meta"><small><span translate="no">Mega</span> ${L('Índice', 'Index', '图鉴')}</small><b>${monName(mp)}</b></div>`);
      btn.onclick = () => { dexGen = 'mega'; dexSel = mp.dex; renderAll(false); };
      strip.appendChild(btn);
    }
  }

  function renderEmptyDetail() {
    const box = $('dex-detail');
    if (!box) return;
    box.innerHTML = `<div style="flex:1;display:grid;place-items:center;padding:30px;text-align:center;">
      <div>
        <p class="sub" style="font-size:15px;">${L('Ningún Pokémon coincide con este filtro.', 'No Pokémon match this filter.', '没有符合当前筛选条件的宝可梦。')}</p>
        <button class="btn small ghost" data-back style="margin-top:12px;">${L('Volver', 'Back', '返回主菜单')}</button>
      </div>
    </div>`;
    box.querySelector('[data-back]')?.addEventListener('click', () => G.MenuUI.open());
  }

  function showDetail(dex) {
    const s = G.DB.save;
    const p = G.DEX_BY[dex];
    if (!p) return;
    const own = !!s.owned[dex];
    const inv = s.invites?.[dex] || 0;
    const canUse = own || inv > 0;
    const mSet = megaDexes();
    const reveal = canUse || (dexGen === 'mega' && mSet.has(dex));
    const hasSh = G.DB.ownsShiny(dex);
    const isPartner = dex === s.partner;

    if (!hasSh) viewShiny = false;
    else if (isPartner && dex !== lastRenderedDex) viewShiny = !!s.partnerShiny;
    lastRenderedDex = dex;
    const usingThis = isPartner && (!hasSh || !!s.partnerShiny === viewShiny);

    const t1Color = G.U.TYPE_COLOR[p.types[0]] || '#5fcb6a';
    const t2Color = p.types[1] ? (G.U.TYPE_COLOR[p.types[1]] || shadeHex(t1Color, 0.72)) : shadeHex(t1Color, 0.74);

    const rs = researchSummary(dex, s);
    const diffRows = s.difficultyRecords?.[dex] || {};
    const diffWon = Array.from({ length: 8 }, (_, i) => diffRows[i + 1]?.won).filter(Boolean).length;

    const box = $('dex-detail');
    box.innerHTML = '';

    // 1. 顶部斜切双属性 Hero 横幅
    const hero = document.createElement('div');
    hero.className = 'dex-hero' + (reveal ? '' : ' is-locked');
    hero.style.setProperty('--t1', t1Color);
    hero.style.setProperty('--t2', t2Color);

    const ownBadgeText = own
      ? L('Poseído', 'Owned', '已永久拥有')
      : inv > 0
        ? L(`Invitación ×${inv}`, `Invite ×${inv}`, `邀请函 ×${inv}`)
        : L('Sin registrar', 'Locked', '未拥有');
    const ownBadgeCls = own ? ' is-owned' : inv > 0 ? ' is-invite' : '';

    const heroLeft = document.createElement('div');
    heroLeft.className = 'dex-hero-left';
    heroLeft.innerHTML = `
      <div class="dex-meta-row">
        <span class="dex-no" translate="no">#${String(p.dex).padStart(3, '0')}</span>
        <span class="dex-gen-pill">${L(`Gen ${p.gen}`, `Gen ${p.gen}`, `第${p.gen}世代`)} · ${genLabel(p.gen)}</span>
        <span class="dex-rar-pill">${G.Icons.rarity(p.rarity, 12)} ${G.T(G.Gacha.RARITY_NAME[p.rarity])}</span>
      </div>
      <div class="dex-name-row">
        <h3 class="dex-name">${reveal ? monName(p) : '???'}</h3>
        <span class="dex-own-pill${ownBadgeCls}">${own ? '✓ ' : inv > 0 ? '✉ ' : '🔒 '}${ownBadgeText}</span>
      </div>
      <div class="dex-types-row">
        ${reveal ? p.types.map(t => `<span class="dex-type-badge" style="background:${G.U.TYPE_COLOR[t]}">${G.Icons.html('type:' + t, 13)} ${typeText(t)}</span>`).join('') : ''}
        <button type="button" class="dex-hero-meter" id="dex-hero-research-jump" title="${L('Ver investigación', 'View Research', '点击查看宝可梦研究')}">
          <span>${G.Icons.html('heart', 12)} ${L('Inv.', 'Research', '研究')} ${rs.claimed}/${rs.tasks.length || 4}</span>
          <span class="dex-hero-meter-bar"><i style="width:${Math.round((rs.claimed / Math.max(1, rs.tasks.length)) * 100)}%"></i></span>
        </button>
      </div>
    `;

    // 进化路线条
    const chain = G.MonProgression?.pathFor?.(dex) || [dex];
    const evoBlock = document.createElement('div');
    evoBlock.className = 'dex-evo-block';
    evoBlock.innerHTML = `<div class="dex-evo-label">${chain.length > 1 ? L('Evolución en partida', 'In-run evolution', '局内进化路线') : L('Sin evolución', 'Single stage', '独立形态')}</div>`;
    const evoRow = document.createElement('div');
    evoRow.className = 'dex-evo-chain';
    chain.forEach((stageDex, idx) => {
      if (idx > 0) {
        const lv = G.MonProgression?.evolutionLevel?.(idx) || (idx === 1 ? 8 : 25);
        evoRow.insertAdjacentHTML('beforeend', `<div class="dex-evo-arrow" translate="no">Lv.${lv}<span>›</span></div>`);
      }
      const sp = G.DEX_BY[stageDex];
      if (!sp) return;
      const stageReveal = !!s.owned[stageDex] || (s.invites?.[stageDex] || 0) > 0 || reveal;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dex-evo-node' + (stageDex === dex ? ' is-current' : '') + (stageReveal ? '' : ' dex-is-sil');
      btn.title = stageReveal ? monName(sp) : '???';
      btn.appendChild(G.UI.spriteCanvas(stageDex, 34, 34, {
        portrait: true,
        shiny: stageDex === dex && own && viewShiny
      }));
      btn.onclick = () => selectDex(stageDex, { syncGen: true, rerenderIfMissing: true, scroll: true });
      evoRow.appendChild(btn);
    });
    evoBlock.appendChild(evoRow);
    heroLeft.appendChild(evoBlock);

    // Hero 右半：立绘展台 + 六维雷达
    const heroRight = document.createElement('div');
    heroRight.className = 'dex-hero-right';

    const spriteWrap = document.createElement('div');
    spriteWrap.className = 'dex-sprite-wrap';
    spriteWrap.innerHTML = `<div class="dex-pedestal"><canvas id="dex-big" class="dex-hero-canvas" width="160" height="142"></canvas></div>`;

    if (hasSh) {
      const seg = document.createElement('div');
      seg.className = 'dex-shiny-seg seg';
      seg.innerHTML = `
        <button type="button" class="${viewShiny ? '' : 'on'}" data-v="0">${L('Normal', 'Normal', '普通')}</button>
        <button type="button" class="${viewShiny ? 'on' : ''}" data-v="1">${G.Icons.html('shiny', 11)} ${L('Shiny', 'Shiny', '异色')}</button>
      `;
      seg.querySelectorAll('button').forEach(b => {
        b.onclick = () => { viewShiny = b.dataset.v === '1'; showDetail(dex); };
      });
      spriteWrap.appendChild(seg);
    } else {
      const megaCnt = G.Mega?.formsFor?.(dex)?.length || 0;
      const pBar = document.createElement('div');
      pBar.className = 'dex-pedestal-bar';
      pBar.innerHTML = `${G.Icons.html('trophy', 12)} <span translate="no">${diffWon}/8</span>`
        + (megaCnt ? ` · ${G.Icons.html('megaStone', 12)} <span translate="no">Mega ×${megaCnt}</span>` : '');
      spriteWrap.appendChild(pBar);
    }

    const radarWrap = document.createElement('div');
    radarWrap.className = 'dex-radar-wrap';
    radarWrap.innerHTML = buildRadarSvg(p);

    heroRight.append(spriteWrap, radarWrap);
    hero.append(heroLeft, heroRight);
    box.appendChild(hero);

    // 绑定 Hero 精灵动画
    const bigCv = $('dex-big');
    if (bigCv) {
      bigCv.classList.toggle('shiny', own && viewShiny);
      if (G.DifficultyUI && own) G.DifficultyUI.decorate(bigCv, dex);
      G.UI.sprite(bigCv, dex, {
        lively: canUse,
        spin: own,
        silhouette: !reveal,
        shadow: false,
        scale: 3,
        hero: true,
        shiny: own && viewShiny
      });
    }
    hero.querySelector('#dex-hero-research-jump')?.addEventListener('click', () => {
      activeTab = 'research';
      showDetail(dex);
    });

    // 2. 悬浮胶囊标签栏
    const tabWrap = document.createElement('div');
    tabWrap.className = 'dex-tabbar-wrap';
    const tabBar = document.createElement('div');
    tabBar.className = 'dex-tabbar';
    const tabDefs = [
      { id: 'overview', ico: 'ball', label: L('Resumen', 'Overview', '概览') },
      { id: 'moves', ico: 'fist', label: L('Movimientos', 'Moves', '招式') },
      { id: 'stats', ico: 'up', label: L('Estadísticas', 'Stats', '数值') },
      { id: 'types', ico: 'sprout', label: L('Tipos', 'Types', '属性') },
      { id: 'abilities', ico: 'megaStone', label: L('Habilidades', 'Abilities & Gear', '特性装备') },
      { id: 'research', ico: 'heart', label: L('Investigación', 'Research', '研究'), dot: rs.claimable > 0 }
    ];
    for (const td of tabDefs) {
      const tb = document.createElement('button');
      tb.type = 'button';
      tb.className = 'dex-tab' + (activeTab === td.id ? ' on' : '');
      tb.dataset.dexTab = td.id;
      tb.innerHTML = `<span class="dex-tab-ico">${G.Icons.html(td.ico, 13)}</span><span>${td.label}</span>${td.dot ? '<i class="dex-tab-dot"></i>' : ''}`;
      tb.onclick = () => { activeTab = td.id; showDetail(dex); };
      tabBar.appendChild(tb);
    }
    tabWrap.appendChild(tabBar);
    box.appendChild(tabWrap);

    // 3. 标签页主体
    const body = document.createElement('div');
    body.className = 'dex-body';
    if (activeTab === 'overview') renderTabOverview(body, p, s, own, inv, rs, diffRows, diffWon);
    else if (activeTab === 'moves') renderTabMoves(body, p);
    else if (activeTab === 'stats') renderTabStats(body, p, s, own, inv);
    else if (activeTab === 'types') renderTabTypes(body, p, s);
    else if (activeTab === 'abilities') renderTabAbilities(body, p, s, own);
    else renderTabResearch(body, p, s, own, rs);
    box.appendChild(body);

    // 4. 底部固定操作栏
    const footer = document.createElement('div');
    footer.className = 'dex-footer';
    const fLeft = document.createElement('div');
    fLeft.className = 'dex-footer-left';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'dex-pill-btn';
    backBtn.setAttribute('data-back', '');
    backBtn.innerHTML = '← ' + L('Volver', 'Back', '返回');
    backBtn.onclick = () => G.MenuUI.open();

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'dex-pill-btn';
    prevBtn.title = L('Anterior', 'Previous', '上一个 (←)');
    prevBtn.textContent = '◀';
    prevBtn.onclick = () => stepSelection(-1);

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'dex-pill-btn';
    nextBtn.title = L('Siguiente', 'Next', '下一个 (→)');
    nextBtn.textContent = '▶';
    nextBtn.onclick = () => stepSelection(1);

    const gearBtn = document.createElement('button');
    gearBtn.type = 'button';
    gearBtn.className = 'dex-pill-btn';
    gearBtn.innerHTML = G.Icons.html('medal3', 14) + ' ' + L('Equipo', 'Gear', '特性与道具');
    gearBtn.onclick = () => { activeTab = 'abilities'; showDetail(dex); };

    fLeft.append(backBtn, prevBtn, nextBtn, gearBtn);

    const fRight = document.createElement('div');
    fRight.className = 'dex-footer-right';

    if (canUse) {
      if (usingThis) {
        const cur = document.createElement('button');
        cur.type = 'button';
        cur.className = 'dex-cta-btn';
        cur.disabled = true;
        cur.innerHTML = G.Icons.html('crown', 17) + ' ' + L('Es tu compañero', 'Active Partner', '当前出战伙伴');
        fRight.appendChild(cur);
      } else {
        const pick = document.createElement('button');
        pick.type = 'button';
        pick.id = 'dex-pick';
        pick.className = 'dex-cta-btn';
        pick.dataset.sfx = 'confirm';
        pick.innerHTML = G.Icons.html('ball', 18) + ' ' + L('¡Te elijo a ti!', 'I Choose You!', '就决定是你了！')
          + (viewShiny ? ' ✦' : '')
          + ' <kbd translate="no">' + L('Enter', 'Enter', '回车') + '</kbd>';
        pick.onclick = () => {
          s.partner = dex;
          s.partnerShiny = hasSh && viewShiny;
          G.DB.commit();
          G.UI.toast(monName(p) + (s.partnerShiny ? ' shiny' : '') + ' ' + L('es ahora tu compañero', 'is now your partner', '已成为你的出战伙伴'));
          renderGrid();
          renderRosterFooter();
          showDetail(dex);
        };
        fRight.appendChild(pick);
      }
    } else {
      const goGacha = document.createElement('button');
      goGacha.type = 'button';
      goGacha.className = 'dex-cta-btn is-locked';
      goGacha.innerHTML = G.Icons.html('ball4', 17) + ' ' + L('Conseguir en Gacha', 'Get in Gacha', '未拥有 · 前往抽卡');
      goGacha.onclick = () => G.GachaUI?.open?.();
      fRight.appendChild(goGacha);
    }

    footer.append(fLeft, fRight);
    box.appendChild(footer);
  }

  /* ---------------- Tab 1: 概览 ---------------- */
  function renderTabOverview(body, p, s, own, inv, rs, diffRows, diffWon) {
    const dex = p.dex;
    const def = G.LeaderAbilities?.definition?.(dex);
    const zUnlocked = def && G.LeaderMedals?.unlocked?.(dex);

    // 顶部双卡：队长特性被动 + 主动 Z / 进阶
    const topGrid = document.createElement('div');
    topGrid.className = 'dex-two-col';

    const leftCard = document.createElement('div');
    leftCard.className = 'dex-card';
    if (def) {
      const titleName = def.name?.[G.I18n?.lang] || def.name?.zh || def.name?.en || '';
      const baseLines = leaderText(def, 'base');
      const costLines = leaderText(def, 'cost');
      leftCard.innerHTML = `
        <div class="dex-card-title">
          <span>${L('Habilidad de capitán · Pasiva', 'Captain Ability · Passive', '队长特性 · 基础被动')}</span>
          <span class="dex-status-tag ${zUnlocked ? 'ok' : 'warn'}">${zUnlocked ? L('Medalla desbloqueada', 'Medal unlocked', '勋章已解锁') : L('Medalla familiar', 'Family medal', '进化链共享')}</span>
        </div>
        <div class="dex-ability-headline"><h4>${titleName}</h4></div>
      `;
      const desc = document.createElement('p');
      desc.className = 'dex-ability-desc';
      appendFormattedText(desc, baseLines.join(' '));
      leftCard.appendChild(desc);

      if (costLines.length) {
        const chips = document.createElement('div');
        chips.className = 'dex-chip-row';
        for (const c of costLines.slice(0, 2)) {
          const pill = document.createElement('span');
          pill.className = 'dex-mini-pill cost';
          appendFormattedText(pill, L('Coste: ', 'Trade-off: ', '代价：') + c);
          chips.appendChild(pill);
        }
        leftCard.appendChild(chips);
      }
    } else {
      leftCard.innerHTML = `
        <div class="dex-card-title"><span>${L('Perfil de combate', 'Combat Profile', '伙伴定位')}</span></div>
        <div class="dex-ability-headline"><h4>${monName(p)}</h4></div>
        <p class="dex-ability-desc">${L('Empieza cada combate con su movimiento característico y evoluciona al subir de nivel.', 'Starts every run with its signature move and evolves as it levels up.', '开局携带专属初始招式，对局中随等级提升自动解锁进化路线。')}</p>
      `;
    }

    const rightCard = document.createElement('div');
    rightCard.className = 'dex-card';
    if (def) {
      const actLines = leaderText(def, 'active');
      const fiveLines = leaderText(def, 'five');
      const eightLines = leaderText(def, 'eight');
      rightCard.innerHTML = `
        <div class="dex-card-title">
          <span>${L('Movimiento Z y avances', 'Active Z & Advances', '主动 Z 招式与进阶')}</span>
          <button type="button" class="dex-status-tag" style="cursor:pointer;border:0;" id="dex-ov-more-ab">${L('Detalles →', 'Full card →', '完整特性 →')}</button>
        </div>
      `;
      const zList = document.createElement('div');
      zList.className = 'dex-z-list';

      const rows = [
        { badge: 'Z', cls: '', title: L('Z Activo', 'Manual Z', '主动 Z 招式') + (zUnlocked ? '' : ' · ' + L('Requiere medalla', 'Medal unlocks', '需家族勋章')), text: actLines[0] || '' },
        { badge: 'Lv5', cls: 'lv', title: L('Avance I (Nv.5)', 'Advance I (Lv.5)', '进阶 I（训练家 5 级）'), text: fiveLines[0] || '' },
        { badge: 'Lv8', cls: 'lv', title: L('Avance II (Nv.8)', 'Advance II (Lv.8)', '进阶 II（训练家 8 级）'), text: eightLines[0] || '' }
      ];
      for (const r of rows) {
        if (!r.text) continue;
        const item = document.createElement('div');
        item.className = 'dex-z-item';
        item.innerHTML = `<span class="dex-z-badge ${r.cls}" translate="no">${r.badge}</span><div><b>${r.title}</b><p></p></div>`;
        appendFormattedText(item.querySelector('p'), r.text);
        zList.appendChild(item);
      }
      rightCard.appendChild(zList);
      rightCard.querySelector('#dex-ov-more-ab')?.addEventListener('click', () => {
        activeTab = 'abilities';
        showDetail(dex);
      });
    } else {
      const megaForms = G.Mega?.formsFor?.(dex) || [];
      rightCard.innerHTML = `
        <div class="dex-card-title"><span>${L('Equipo y Mega', 'Gear & Mega', '装备与形态')}</span></div>
        <p class="dex-ability-desc">${megaForms.length
          ? L(`Tiene ${megaForms.length} forma(s) Mega disponibles.`, `Has ${megaForms.length} Mega form(s) available.`, `拥有 ${megaForms.length} 种可解锁的 Mega 进化形态，可在「特性装备」中配置进化石。`)
          : L('Configura objetos equipados y piedras Z en la pestaña de Habilidades.', 'Configure held items and Z-Crystals in the Abilities & Gear tab.', '可在「特性装备」页签中配置携带道具、Z 结晶或特性勋章。')}</p>
      `;
    }

    topGrid.append(leftCard, rightCard);
    body.appendChild(topGrid);

    // 中间 4 张彩色斜纹招式卡（初始招式 + 3 个代表池招式）
    const startId = G.startMoveOf(dex);
    const pool = G.Moves.poolFor(p).filter(id => id !== startId);
    const stabPool = pool.filter(id => p.types.includes(G.Moves.BY_ID[id]?.type));
    const otherPool = pool.filter(id => !p.types.includes(G.Moves.BY_ID[id]?.type));
    const featured = [startId, ...stabPool, ...otherPool].slice(0, 4);

    const movesRow = document.createElement('div');
    movesRow.className = 'dex-ov-moves';
    featured.forEach((id, idx) => {
      const m = G.Moves.BY_ID[id];
      if (!m) return;
      const mc = G.U.TYPE_COLOR[m.type] || '#4ec25c';
      const card = document.createElement('div');
      card.className = 'dex-move-strip-card';
      card.style.setProperty('--mc', mc);
      const evo = G.Moves.EVO?.[id];
      const tag = idx === 0
        ? `${kindText(m.kind)} · ${L('Inicial', 'Start', '初始')}`
        : `${kindText(m.kind)} · ${G.Moves.classLabel(m)}`;
      const snippet = [
        m.dmg ? `${L('Daño', 'DMG', '伤害')} ${m.dmg}` : '',
        m.cd ? `${L('Recarga', 'CD', '冷却')} ${m.cd}s` : '',
        evo ? `✦ ${L('Evol.', 'Super', '可超武')}` : ''
      ].filter(Boolean).join(' · ');
      card.innerHTML = `
        <div class="dex-move-strip-head">
          <span class="dex-move-ico-ring">${G.Icons.html('move:' + id, 19)}</span>
          <div style="min-width:0">
            <b>${G.T(m.name)}</b>
            <small>${tag}</small>
          </div>
        </div>
        <p class="dex-move-strip-desc">${snippet || G.T(m.desc || '')}</p>
      `;
      card.onclick = () => { activeTab = 'moves'; showDetail(dex); };
      movesRow.appendChild(card);
    });
    body.appendChild(movesRow);

    // 底部汇总条（参考“你的对局”）
    const iv = own
      ? G.MonProgression.normalizeIV(G.DB.ivOf(dex))
      : (s.inviteIVs?.[dex] ? G.MonProgression.normalizeIV(s.inviteIVs[dex]) : Array(8).fill(1));
    const ivSum = iv.reduce((a, b) => a + b, 0);
    const best = G.Difficulty?.highest?.(s, dex);

    const strip = document.createElement('div');
    strip.className = 'dex-record-strip';
    strip.innerHTML = `
      <div class="dex-record-pills">
        <span style="font-weight:800;color:#dce6fa;">${L('Tu progreso', 'Your Record', '你的记录')}</span>
        <span class="dex-record-pill"><b>${p.bst || Object.values(p.baseStats || {}).reduce((a, b) => a + b, 0)}</b> ${L('BST', 'BST', '种族值')}</span>
        <span class="dex-record-pill"><b>${own ? ivSum : '—'}</b> / 248 IV</span>
        <span class="dex-record-pill"><b>${rs.claimed}</b> / ${rs.tasks.length || 4} ${L('Investigación', 'Research', '研究')}</span>
        <span class="dex-record-pill"><b>${best ? `${best.stars}★ · ${G.U.mmss(best.best)}` : '—'}</b> ${L('Mejor marca', 'Best Clear', '最高纪录')}</span>
      </div>
      <div class="dex-diff-dots">
        <span>${L('Dificultad', 'Clears', '难度')}</span>
        ${Array.from({ length: 8 }, (_, i) => `<span class="dex-diff-star ${diffRows[i + 1]?.won ? 'won' : ''}" translate="no">${i + 1}★</span>`).join('')}
      </div>
    `;
    body.appendChild(strip);
  }

  /* ---------------- Tab 2: 招式 ---------------- */
  function renderTabMoves(body, p) {
    const startId = G.startMoveOf(p.dex);
    const pool = G.Moves.poolFor(p).filter(id => id !== startId);
    const ordered = [
      startId,
      ...pool.filter(id => p.types.includes(G.Moves.BY_ID[id]?.type)),
      ...pool.filter(id => !p.types.includes(G.Moves.BY_ID[id]?.type))
    ].filter((id, i, arr) => id && G.Moves.BY_ID[id] && arr.indexOf(id) === i);

    const header = document.createElement('div');
    header.className = 'dex-record-strip';
    header.innerHTML = `
      <div class="dex-record-pills">
        <span style="font-weight:800;color:#fff;">${L('Movimiento inicial', 'Starting Move', '初始招式')}：<b style="color:#7df0a5">${G.T(G.Moves.BY_ID[startId]?.name || '')}</b></span>
        <span class="dex-record-pill"><b>${ordered.length}</b> ${L('movimientos disponibles', 'learnable moves', '个可学招式')}</span>
      </div>
      <span style="font-size:11.5px;color:#8fa2c7;">${L('Sube al nivel máximo con el stat requerido para evolucionar a Súper.', 'Max level + matching stat unlocks Super Move evolution.', '满级且携带对应属性加成即可进化为超武')}</span>
    `;
    body.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'dex-moves-grid';

    for (const id of ordered) {
      const m = G.Moves.BY_ID[id];
      const isStart = id === startId;
      const evo = G.Moves.EVO?.[id];
      const needName = evo ? G.T(G.Moves.NEED_NAME?.[evo[1]] || evo[1]) : '';
      const mc = G.U.TYPE_COLOR[m.type] || '#4ec25c';

      const card = document.createElement('div');
      card.className = 'dex-move-card' + (isStart ? ' is-start' : '');
      card.style.setProperty('--mc', mc);

      const metrics = [];
      if (m.dmg) metrics.push([L('Daño', 'Damage', '伤害'), m.count && m.count > 1 ? `${m.dmg}×${m.count}` : String(m.dmg)]);
      if (m.cd) metrics.push([L('Recarga', 'CD', '冷却'), `${m.cd}s`]);
      if (m.radius) metrics.push([L('Alcance', 'Radius', '范围'), String(m.radius)]);
      if (m.pierce) metrics.push([L('Perf.', 'Pierce', '穿透'), String(m.pierce)]);
      if (m.dur) metrics.push([L('Dur.', 'Dur.', '持续'), `${m.dur}s`]);
      if (m.burn) metrics.push([L('Quemar', 'Burn', '灼伤'), `+${m.burn}`]);
      if (m.poison) metrics.push([L('Veneno', 'Poison', '中毒'), `+${m.poison}`]);
      if (m.slow) metrics.push([L('Lento', 'Slow', '减速'), `${Math.round(m.slow * 100)}%`]);

      card.innerHTML = `
        <span class="dex-move-ico-ring" style="background:${mc}22;border:1px solid ${mc}88;">${G.Icons.html('move:' + id, 22)}</span>
        <div class="dex-move-card-body">
          <div class="dex-move-card-top">
            <b>${G.T(m.name)}</b>
            <span class="dex-move-tag ${isStart ? 'start' : evo ? 'evo' : ''}">${isStart ? L('Inicial', 'Start', '初始') : evo ? L('Evol. Súper', 'Super Evo', '可超武') : typeText(m.type)}</span>
          </div>
          <div class="dex-move-sub">${kindText(m.kind)} · ${G.Moves.classLabel(m)} · ${typeText(m.type)}</div>
          <p class="dex-move-desc">${evo ? L(`Evolución Súper: requiere ${needName}`, `Super Evolution: needs ${needName}`, `超武进化条件：满级 + ${needName}`) : (m.desc ? G.T(m.desc) : L('Movimiento de combate del repertorio.', 'Learnable move from this Pokémon’s pool.', '对局升级卡片中可习得的招式。'))}</p>
          <div class="dex-move-metrics">
            ${metrics.map(([k, v]) => `<span class="dex-metric-pill">${k}<b translate="no">${v}</b></span>`).join('')}
          </div>
        </div>
      `;
      grid.appendChild(card);
    }

    body.appendChild(grid);
  }

  /* ---------------- Tab 3: 数值与个体 ---------------- */
  function renderTabStats(body, p, s, own, inv) {
    const dex = p.dex;
    const max = { hp: 183, atk: 2.3, spd: 137 };
    const iv = own
      ? G.MonProgression.normalizeIV(G.DB.ivOf(dex))
      : (s.inviteIVs?.[dex] ? G.MonProgression.normalizeIV(s.inviteIVs[dex]) : Array(8).fill(1));
    const eff = G.MonProgression.stats(dex, iv);
    const cdFac = G.MonProgression.cooldownFactor(eff.agility);
    const ppRate = 1 / G.MonProgression.ppInterval(eff.stamina);
    const ivSum = iv.reduce((a, b) => a + b, 0);
    const ivClass = v => v <= 10 ? 'iv-low' : v <= 20 ? 'iv-mid' : v <= 29 ? 'iv-high' : 'iv-perfect';

    const bar = (label, v, m, txt, ivVal) =>
      `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.min(100, (v / m) * 100)}%"></i></div><span translate="no">${txt}</span><span class="iv-value ${ivClass(ivVal)}" translate="no">IV ${ivVal}</span></div>`;

    const split = document.createElement('div');
    split.className = 'dex-two-col';

    const left = document.createElement('div');
    left.className = 'dex-card dex-stats-list';
    left.innerHTML = `
      <div class="dex-card-title">
        <span>${L('Estadísticas base e IV', 'Base Stats & IVs', '基础属性与个体值')}</span>
        <span class="dex-status-tag" translate="no">IV ${ivSum} / 248</span>
      </div>
      ${bar(G.T('Vida'), p.hp, max.hp, p.hp, iv[0])}
      ${bar(G.T('At. físico'), p.atk, max.atk, '×' + p.atk.toFixed(2), iv[1])}
      ${bar(G.T('At. especial'), p.spa, max.atk, '×' + p.spa.toFixed(2), iv[3])}
      ${bar(G.T('Def. física'), p.defense, max.atk, '÷' + p.defense.toFixed(2), iv[4])}
      ${bar(G.T('Def. especial'), p.spdef, max.atk, '÷' + p.spdef.toFixed(2), iv[5])}
      ${bar(G.T('Velocidad'), p.spd, max.spd, p.spd, iv[2])}
      ${bar(G.T('Agilidad base'), G.MonProgression.agilityBase(p), 200, Math.round(G.MonProgression.agilityBase(p)), iv[6])}
      ${bar(G.T('Resistencia base'), G.MonProgression.staminaBase(p), 200, Math.round(G.MonProgression.staminaBase(p)), iv[7])}
      <p class="note" style="margin:10px 0 0;">${G.T('Stats base originales')}: <span translate="no">${Object.values(p.baseStats || {}).join(' / ')}</span> (BST ${p.bst || ''})</p>
    `;

    const right = document.createElement('div');
    right.className = 'dex-card';
    const kvRows = [
      [L('PS máximos efectivos', 'Effective Max HP', '实战最大 HP'), Math.round(eff.hp)],
      [L('Daño físico', 'Physical Damage', '物理伤害倍率'), '×' + eff.atk.toFixed(2)],
      [L('Daño especial', 'Special Damage', '特殊伤害倍率'), '×' + eff.spa.toFixed(2)],
      [L('Defensa física', 'Physical Defense', '物理减伤系数'), '÷' + eff.defense.toFixed(2)],
      [L('Defensa especial', 'Special Defense', '特殊减伤系数'), '÷' + eff.spdef.toFixed(2)],
      [L('Velocidad de movimiento', 'Move Speed', '移动速度'), Math.round(eff.spd)],
      [L('Factor de recarga (Agilidad)', 'Cooldown Scale (Agility)', '技能冷却倍率（敏捷）'), '×' + cdFac.toFixed(2)],
      [L('Regeneración PP (Resistencia)', 'PP Regen (Stamina)', 'PP 回复速度（耐力）'), ppRate.toFixed(2) + ' /s']
    ];
    right.innerHTML = `
      <div class="dex-card-title">
        <span>${L('En combate (con IV)', 'In Battle (with IVs)', '对局中（含个体加成）')}</span>
        <span class="dex-status-tag ${own ? 'ok' : 'warn'}">${own ? L('IV guardados', 'Saved IVs', '已生效') : inv > 0 ? L('IV aleatorios', 'Random IVs', '邀请函随机') : L('Sin capturar', 'Base IV 1', '未捕获基础')}</span>
      </div>
      <div class="dex-kv-table">
        ${kvRows.map(([k, v]) => `<div class="dex-kv-row"><span>${k}</span><b translate="no">${v}</b></div>`).join('')}
      </div>
      ${!own ? `<p class="note" style="margin:10px 0 0;">${inv > 0
        ? L(`Tienes ${inv} invitaciones. Cada partida con invitación genera IV aleatorios.`, `You have ${inv} invitations. Runs using an invitation roll random IVs.`, `当前持有 ${inv} 张邀请函；凭邀请函出战时每次随机个体值，局内捕捉后将永久保留高个体值。`)
        : L('Captura este Pokémon en combate o consigue una Bola Dorada para desbloquearlo permanentemente.', 'Capture this Pokémon in battle or pull a Golden Ball to unlock permanently.', '局内捕捉或在抽卡触发金色精灵球可永久解锁并保留个体值。')}</p>` : ''}
    `;

    split.append(left, right);
    body.appendChild(split);
  }

  /* ---------------- Tab 4: 属性相克与同属性 ---------------- */
  function renderTabTypes(body, p, s) {
    const weak = [], res = [], sup = [];
    for (const atk of ALL_TYPES) {
      const m = G.Types.mult(atk, p.types);
      if (m > 1.02) weak.push({ t: atk, m });
      else if (m < 0.98) res.push({ t: atk, m });
    }
    weak.sort((a, b) => b.m - a.m);
    res.sort((a, b) => a.m - b.m);

    for (const def of ALL_TYPES) {
      let best = 1;
      for (const myT of p.types) best = Math.max(best, G.Types.mult(myT, [def]));
      if (best > 1.02) sup.push({ t: def, m: best });
    }

    const fmtMult = m => '×' + Number(m.toFixed(2));
    const renderEffChips = (list, showMult = true) => list.length
      ? list.map(x => `<div class="dex-eff-item"><span class="dex-eff-dot" style="background:${G.U.TYPE_COLOR[x.t]}">${G.Icons.html('type:' + x.t, 12)} ${typeText(x.t)}</span>${showMult ? `<span class="dex-eff-mult" translate="no">${fmtMult(x.m)}</span>` : ''}</div>`).join('')
      : `<span class="note">${L('Ninguno', 'None', '无')}</span>`;

    const split = document.createElement('div');
    split.className = 'dex-two-col';

    const left = document.createElement('div');
    left.className = 'dex-card';
    left.innerHTML = `
      <div class="dex-card-title"><span>${L('Afinidad de tipos', 'Type Effectiveness', '属性相克')}</span></div>
      <div class="dex-eff-group">
        <span class="dex-eff-lbl weak">${L('Débil', 'Weak', '弱点')}</span>
        <div class="dex-eff-chips">${renderEffChips(weak, true)}</div>
      </div>
      <div class="dex-eff-group">
        <span class="dex-eff-lbl res">${L('Resiste', 'Resist', '抵抗')}</span>
        <div class="dex-eff-chips">${renderEffChips(res, true)}</div>
      </div>
      <div class="dex-eff-group">
        <span class="dex-eff-lbl sup">${L('Eficaz', 'Strong', '克制')}</span>
        <div class="dex-eff-chips">${renderEffChips(sup, false)}</div>
      </div>
    `;

    // 右侧：进化家族 + 同属性图鉴一览
    const right = document.createElement('div');
    right.className = 'dex-card';
    const family = G.MonProgression?.familyFor?.(p.dex) || [p.dex];
    const sameTypeAll = G.DEX.filter(o => o.dex !== p.dex && o.types.some(t => p.types.includes(t)));
    const sameTypeOwned = sameTypeAll.filter(o => s.owned[o.dex]);

    right.innerHTML = `
      <div class="dex-card-title"><span>${L('Familia evolutiva y tipos compartidos', 'Evolution Family & Shared Types', '进化家族与同属性伙伴')}</span></div>
      <div style="font-size:12.5px;color:#b8c7e6;margin-bottom:4px;">${L('Miembros de la familia:', 'Evolution family:', '进化家族成员：')}</div>
      <div class="dex-family-grid" id="dex-family-grid"></div>
      <div style="font-size:12.5px;color:#b8c7e6;margin-top:12px;">
        ${L('Comparten tipo', 'Share type with', '共享属性')} ${p.types.map(t => `<span class="dex-type-badge" style="background:${G.U.TYPE_COLOR[t]};padding:1px 7px;font-size:11px;">${typeText(t)}</span>`).join(' ')}
        · <b style="color:#fff" translate="no">${sameTypeOwned.length} / ${sameTypeAll.length}</b> ${L('poseídos', 'owned', '已拥有')}
      </div>
      <div class="dex-shared-strip" id="dex-shared-strip"></div>
    `;

    const famBox = right.querySelector('#dex-family-grid');
    for (const fd of family) {
      const fp = G.DEX_BY[fd];
      if (!fp) continue;
      const fOwn = !!s.owned[fd] || (s.invites?.[fd] || 0) > 0;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dex-mini-mon' + (fd === p.dex ? ' is-current' : '') + (!fOwn ? ' is-locked' : '') + (!fOwn && fd !== p.dex ? ' dex-is-sil' : '');
      b.appendChild(G.UI.spriteCanvas(fd, 28, 28, { portrait: true }));
      b.insertAdjacentHTML('beforeend', `<span>${fOwn || fd === p.dex ? monName(fp) : '???'}</span>`);
      b.onclick = () => selectDex(fd, { syncGen: true, rerenderIfMissing: true, scroll: true });
      famBox.appendChild(b);
    }

    const sharedBox = right.querySelector('#dex-shared-strip');
    const previewList = [...sameTypeOwned.slice(0, 14), ...sameTypeAll.filter(o => !s.owned[o.dex]).slice(0, 10)].slice(0, 22);
    for (const sp of previewList) {
      const spOwn = !!s.owned[sp.dex] || (s.invites?.[sp.dex] || 0) > 0;
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'dex-shared-dot' + (spOwn ? '' : ' dex-is-sil');
      dot.title = spOwn ? monName(sp) : `#${String(sp.dex).padStart(3, '0')} ???`;
      dot.appendChild(G.UI.spriteCanvas(sp.dex, 28, 28, { portrait: true }));
      dot.onclick = () => selectDex(sp.dex, { syncGen: true, rerenderIfMissing: true, scroll: true });
      sharedBox.appendChild(dot);
    }

    split.append(left, right);
    body.appendChild(split);
  }

  /* ---------------- Tab 5: 特性、Mega 与携带装备 ---------------- */
  function renderTabAbilities(body, p, s, own) {
    const dex = p.dex;

    // 1. 携带道具 + Mega 形态预览
    const topSplit = document.createElement('div');
    topSplit.className = 'dex-two-col';

    const gearCard = document.createElement('div');
    gearCard.className = 'dex-card';
    if (own && G.EquipmentUI) {
      G.EquipmentUI.render(gearCard, dex);
    } else {
      gearCard.innerHTML = `
        <div class="dex-card-title"><span>${L('Objeto equipado', 'Held Item', '携带道具')}</span></div>
        <p class="note">${L('Captura este Pokémon para equiparle objetos activos, piedras Mega o cristales Z.', 'Own this Pokémon permanently to equip held items, Mega Stones, or Z-Crystals.', '永久拥有该宝可梦后，即可在此配置携带道具、Mega 进化石或 Z 招式石。')}</p>
      `;
    }

    const megaCard = document.createElement('div');
    megaCard.className = 'dex-card';
    const megaForms = G.Mega?.formsFor?.(dex) || [];
    megaCard.innerHTML = `<div class="dex-card-title"><span>${G.Icons.html('megaStone', 14)} <span translate="no">${L('Megaevolución', 'Mega Evolution', 'Mega 进化形态')}</span></span><span class="dex-status-tag" translate="no">${megaForms.length ? megaForms.length + ' ' + L('formas', 'forms', '种形态') : L('Sin forma Mega', 'None', '无 Mega 形态')}</span></div>`;
    if (megaForms.length) {
      const mRow = document.createElement('div');
      mRow.className = 'dex-mega-row';
      for (const f of megaForms) {
        const hasStone = G.Mega.owns(s, f.id);
        const mTypes = G.MEGA_TYPES?.[f.id] || p.types;
        const item = document.createElement('div');
        item.className = 'dex-mega-card';
        item.appendChild(G.UI.spriteCanvas(f.id, 66, 60, { scale: 2, hero: true, shiny: own && viewShiny && !!f.meta?.sh }));
        const info = document.createElement('div');
        info.innerHTML = `
          <h5 translate="no">${G.Mega.label(f.id)}</h5>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px;">${mTypes.map(t => `<span class="dex-type-badge" style="background:${G.U.TYPE_COLOR[t]};font-size:10.5px;padding:1px 7px;">${typeText(t)}</span>`).join('')}</div>
          <div class="note" style="margin:0;">${hasStone ? '✓ ' + L('Megapiedra obtenida · +30% PS (60s)', 'Mega Stone owned · +30% HP (60s)', '已获得进化石 · 战斗中 +30% 生命，持续 60 秒') : '🔒 ' + L('Sin megapiedra', 'Stone not owned', '未获得对应进化石')}</div>
        `;
        item.appendChild(info);
        mRow.appendChild(item);
      }
      megaCard.appendChild(mRow);
    } else {
      megaCard.insertAdjacentHTML('beforeend', `<p class="note" translate="no">${L('Esta especie no tiene Megaevolución registrada.', 'This species has no registered Mega Evolution.', '该宝可梦暂无对应的 Mega 进化形态。')}</p>`);
    }

    topSplit.append(gearCard, megaCard);
    body.appendChild(topSplit);

    // 2. 完整特性勋章 & 队长特性五段卡片
    const abCard = document.createElement('div');
    abCard.className = 'dex-card';
    if (G.AbilityDefs?.medalsFor?.(dex)?.length && G.GachaUI?.renderEquipment) {
      G.GachaUI.renderEquipment(abCard, dex);
    } else if (G.LeaderAbilitiesUI?.card) {
      const card = G.LeaderAbilitiesUI.card(dex, 8);
      if (card) abCard.appendChild(card);
      else abCard.innerHTML = `<p class="note">${L('Sin medallas de habilidad específicas.', 'No special ability medals.', '暂无专属特性勋章。')}</p>`;
    }
    body.appendChild(abCard);
  }

  /* ---------------- Tab 6: 研究任务与难度奖牌 ---------------- */
  function renderTabResearch(body, p, s, own, rs) {
    const dex = p.dex;
    const total = Math.max(1, rs.tasks.length);
    const pct = Math.round((rs.claimed / total) * 100);
    const nextTask = rs.tasks.find(t => !t.claimed);

    // 顶部柔和亮色总结卡（呼应参考图“亲密度”顶栏）
    const banner = document.createElement('div');
    banner.className = 'dex-research-banner';
    banner.innerHTML = `
      <div class="dex-research-left">
        <div class="dex-research-badge" translate="no">${rs.claimed}/${total}</div>
        <div class="dex-research-meta">
          <small>${L(`Investigación con ${monName(p)}`, `Research with ${monName(p)}`, `与 ${monName(p)} 的宝可梦研究`)}</small>
          <h4>${rs.claimed} / ${total} ${L('Completados', 'Completed', '项已完成')}</h4>
          <div class="dex-research-prog"><i style="width:${pct}%"></i></div>
        </div>
      </div>
      <div class="dex-research-next">
        <small>${nextTask ? L('Siguiente recompensa', 'Next reward', '下一项奖励') : L('¡Todo completado!', 'All claimed!', '全部研究已完成')}</small>
        <b>${nextTask ? nextTask.rewardLabel : '+800 ' + L('Monedas Liga', 'League Coins', '联盟币')}</b>
      </div>
    `;
    body.appendChild(banner);

    // 中部说明双卡
    const infoSplit = document.createElement('div');
    infoSplit.className = 'dex-two-col';
    const claimedList = rs.tasks.filter(t => t.claimed);
    infoSplit.innerHTML = `
      <div class="dex-card">
        <div class="dex-card-title"><span>${L('Recompensas desbloqueadas', 'Unlocked Rewards', '已解锁研究奖励')} (${claimedList.length}/${total})</span></div>
        <p class="dex-ability-desc">${claimedList.length
          ? claimedList.map(t => '✓ ' + t.rewardLabel).join('<br>')
          : L('Completa tareas de investigación como capitán para desbloquear avatares, títulos y Monedas de Liga.', 'Complete research tasks as captain to unlock exclusive avatars, titles, and League Coins.', '完成各项研究即可解锁专属头像、称号，以及每项 +200 联盟币奖励。')}</p>
      </div>
      <div class="dex-card">
        <div class="dex-card-title"><span>${L('Cómo avanzar', 'How to Progress', '如何推进研究')}</span></div>
        <p class="dex-ability-desc">${own
          ? L('Usa este Pokémon o cualquiera de su cadena evolutiva como capitán: cada combate, bajas, jefes y victorias de expedición suman progreso.', 'Lead your run with this Pokémon or any stage of its evolution family: battles, defeats, bosses, and expedition clears all count.', '使用该宝可梦或其进化链任意形态担任队长出战，累计对局数、击败敌人、击败 BOSS 与远征通关均可推进研究进度。')
          : L('La investigación se activa en cuanto poseas este Pokémon permanentemente.', 'Research activates as soon as you permanently own this Pokémon.', '永久拥有该宝可梦后即可自动累计研究任务进度。')}</p>
      </div>
    `;
    body.appendChild(infoSplit);

    // 4 项研究里程碑卡片网格
    const grid = document.createElement('div');
    grid.className = 'dex-research-grid';
    rs.tasks.forEach((t, idx) => {
      const card = document.createElement('div');
      card.className = 'dex-task-card' + (t.done && !t.claimed ? ' is-ready' : '') + (t.claimed ? ' is-claimed' : '');
      const tPct = Math.min(100, Math.round((t.value / Math.max(1, t.goal)) * 100));
      card.innerHTML = `
        <div class="dex-task-top">
          <span>${L(`Fase ${idx + 1}`, `Stage ${idx + 1}`, `研究 ${idx + 1}`)}</span>
          <span translate="no">${t.value} / ${t.goal}</span>
        </div>
        <b>${t.label}</b>
        <div class="dex-task-bar"><i style="width:${tPct}%"></i></div>
        <div class="dex-task-reward">${t.rewardLabel}</div>
      `;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn small' + (t.done && !t.claimed ? ' gold' : '');
      if (!own) {
        btn.textContent = L('Requiere captura', 'Need capture', '需永久拥有');
        btn.disabled = true;
      } else if (t.claimed) {
        if (t.rewardType === 'title') {
          const eq = s.profile?.title === t.titleText;
          btn.textContent = eq ? L('Equipado', 'Equipped', '已佩戴') : L('Equipar título', 'Equip Title', '佩戴称号');
          btn.disabled = eq;
          btn.onclick = () => { G.Research.equipTitle(t.titleText, s); showDetail(dex); };
        } else {
          const eq = s.profile?.avatar === t.rewardId;
          btn.textContent = eq ? L('En uso', 'In Use', '使用中') : L('Usar avatar', 'Use Avatar', '使用头像');
          btn.disabled = eq;
          btn.onclick = () => { G.Research.equipAvatar(t.rewardId, s); showDetail(dex); };
        }
      } else {
        btn.textContent = t.done ? L('Reclamar', 'Claim', '领取奖励') : L('En progreso', 'In progress', '未完成');
        btn.disabled = !t.done;
        btn.onclick = () => {
          if (G.Research.claim(dex, t.id, s)) {
            G.Audio?.sfx?.('confirm');
            G.UI.toast(L('¡Recompensa reclamada! +200 Monedas Liga', 'Reward claimed! +200 League Coins', '已领取研究奖励！+200 联盟币'));
            renderGrid();
            renderRosterFooter();
            showDetail(dex);
          }
        };
      }
      card.appendChild(btn);
      grid.appendChild(card);
    });
    body.appendChild(grid);

    // 底部：难度奖牌 1★-8★
    if (G.DifficultyUI) {
      const diffWrap = document.createElement('div');
      diffWrap.className = 'dex-card';
      if (own) G.DifficultyUI.detail(diffWrap, dex);
      else diffWrap.innerHTML = `<div class="dex-card-title"><span>${G.T('Medallas de dificultad')}</span></div><p class="note">${L('Posee este Pokémon para registrar medallas de dificultad 1★–8★.', 'Own this Pokémon to record 1★–8★ difficulty medals.', '永久拥有后可记录 1★–8★ 难度奖牌并升级图鉴边框。')}</p>`;
      body.appendChild(diffWrap);
    }
  }

  return { open, selectDex };
})();
