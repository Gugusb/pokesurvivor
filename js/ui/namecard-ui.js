/* ============ namecard-ui.js — Custom Player Namecard Editor & Reusable Banner ============ */
G.NamecardUI = (() => {
  const L = (es, en, zh) => G.I18n?.lang === 'zh' ? zh : G.I18n?.lang === 'en' ? en : es;
  const local = v => G.Namecard.local(v);
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  let modal = null, draft = null, activeTab = 'avatar', subTab = 'trainer', query = '', typeFilter = 'all', ownFilter = 'owned';

  // Crisp vector portrait for trainer avatars (zero external asset dependencies)
  function trainerSvg(tr) {
    const hair = tr.hair || '#222', coat = tr.coat || '#3b82f6', acc = tr.accent || '#ffd24c';
    const hatSvg = tr.hat === 'cap_red'
      ? `<path d="M22 36 C24 18 76 18 78 36 Z" fill="#d9434e"/><path d="M20 35 h58 v6 c-18 4-40 4-58 0z" fill="#b72b36"/><circle cx="50" cy="27" r="5" fill="#fff"/>`
      : tr.hat === 'sunhat'
      ? `<ellipse cx="50" cy="34" rx="34" ry="8" fill="#f7e8d0"/><path d="M27 33 C30 16 70 16 73 33 Z" fill="#f7e8d0"/><rect x="27" y="29" width="46" height="4" fill="#eb5b72"/>`
      : tr.hat === 'crown'
      ? `<path d="M28 32 L34 14 L44 25 L50 11 L56 25 L66 14 L72 32 Z" fill="${acc}" stroke="#fff" stroke-width="1.5"/>`
      : tr.hat === 'halo'
      ? `<ellipse cx="50" cy="14" rx="22" ry="5" fill="none" stroke="${acc}" stroke-width="3"/>`
      : tr.hat === 'tiara'
      ? `<path d="M30 30 Q50 14 70 30" fill="none" stroke="${acc}" stroke-width="3"/><polygon points="50,14 54,23 50,27 46,23" fill="${acc}"/>`
      : tr.hat === 'glasses'
      ? `<rect x="34" y="44" width="13" height="9" rx="3" fill="none" stroke="#1e293b" stroke-width="2.2"/><rect x="53" y="44" width="13" height="9" rx="3" fill="none" stroke="#1e293b" stroke-width="2.2"/><line x1="47" y1="48" x2="53" y2="48" stroke="#1e293b" stroke-width="2"/>`
      : tr.hat === 'star'
      ? `<polygon points="50,10 53,19 63,19 55,24 58,33 50,28 42,33 45,24 37,19 47,19" fill="${acc}"/>`
      : `<path d="M24 34 Q50 16 76 34" fill="${acc}" opacity=".85"/>`;
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <defs><radialGradient id="g-${tr.id}" cx="50%" cy="30%" r="70%"><stop offset="0%" stop-color="${acc}" stop-opacity=".38"/><stop offset="100%" stop-color="#131a2c"/></radialGradient></defs>
      <rect width="100" height="100" fill="url(#g-${tr.id})"/>
      <path d="M16 100 C20 74 34 68 50 68 C66 68 80 74 84 100 Z" fill="${coat}"/>
      <path d="M40 69 L50 84 L60 69 Z" fill="${acc}"/>
      <circle cx="50" cy="46" r="22" fill="#f6d1b6"/>
      <path d="M27 46 C27 24 73 24 73 46 C68 35 58 31 50 31 C42 31 32 35 27 46 Z" fill="${hair}"/>
      <circle cx="42" cy="48" r="2.8" fill="#182032"/><circle cx="58" cy="48" r="2.8" fill="#182032"/>
      <path d="M44 58 Q50 63 56 58" fill="none" stroke="#9e5a46" stroke-width="2.4" stroke-linecap="round"/>
      ${hatSvg}
    </svg>`;
  }

  function badgeIconGlyph(id) {
    return { ruby: '💎', medal: '🎖', shiny: '✨', trophy: '🏆', star: '⭐', crown: '👑', dex: '👁', runs: '🎮', kills: '⚔' }[id] || '🏅';
  }

  function formatSince(ts) {
    const d = new Date(Number(ts) || Date.now());
    if (G.I18n?.lang === 'zh') return `自 ${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 起成为训练家`;
    if (G.I18n?.lang === 'en') return `Trainer since ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return `Entrenador desde el ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  function applyBgClass(node, bgId) {
    node.classList.remove('nc-bg-none', 'nc-bg-pack', 'nc-bg-amethyst_cave', 'nc-bg-night_glacier', 'nc-bg-crimson_citadel', 'nc-bg-circuit_city', 'nc-bg-champion_bonfire', 'nc-bg-celestial_hall');
    if (!bgId || bgId === 'none') {
      node.classList.add('nc-bg-none');
      node.style.removeProperty('--nc-bg-accent');
    } else if (bgId.startsWith('theme:')) {
      const tid = bgId.slice(6);
      const t = G.CardPacks?.themes?.find(x => x.id === tid);
      node.classList.add('nc-bg-pack');
      node.style.setProperty('--nc-bg-accent', t?.color || '#82d4ee');
    } else {
      node.classList.add('nc-bg-' + bgId);
    }
  }

  /** Renders the live player Namecard Banner (used in Editor, Public Profile & Goals). */
  function renderBanner(data, options = {}) {
    const N = G.Namecard;
    const banner = el('div', 'nc-banner');
    applyBgClass(banner, data.bg);

    // 1. Avatar + Avatar Frame
    const frameDef = N.FRAME_BY[data.avatarFrame] || N.FRAME_BY.none;
    const avatarWrap = el('div', 'nc-avatar-wrap nc-frame-' + (frameDef.ring || 'none'));
    const avatarCore = el('div', 'nc-avatar-core');
    if (data.avatarType === 'trainer' && N.TRAINER_BY[data.avatarId] && data.avatarId !== 'partner') {
      avatarCore.innerHTML = trainerSvg(N.TRAINER_BY[data.avatarId]);
    } else {
      const dex = data.avatarDex || data.partnerDex || 25;
      if (G.DEX_BY?.[dex]) avatarCore.append(G.UI.spriteCanvas(dex, 84, 84, { scale: 2.3, hero: true, shiny: !!data.avatarShiny, shadow: false }));
    }
    avatarWrap.append(avatarCore);
    banner.append(avatarWrap);

    // 2. Nameplate Box (Name + League Rank + Title + Showcase Capsule + Since Date)
    const plateDef = N.NAMEPLATE_BY[data.nameplate] || N.NAMEPLATE_BY.default;
    const edgeDef = N.EDGE_BY[data.nameplateEdge] || N.EDGE_BY.corner;
    const plateCls = ['nc-plate', 'nc-edge-' + edgeDef.id];
    if (plateDef.type) plateCls.push('nc-plate-type');
    else if (plateDef.id === 'gold_velvet' || plateDef.id === 'prism_aurora') plateCls.push('nc-plate-' + plateDef.id);
    const plate = el('div', plateCls.join(' '));
    plate.style.setProperty('--nc-plate-accent', plateDef.accent || '#57d66d');

    if (plateDef.id === 'partner_motif' && G.DEX_BY?.[data.partnerDex]) {
      const motif = G.UI.spriteCanvas(data.partnerDex, 96, 86, { scale: 2.5, shiny: !!data.partnerShiny, shadow: false });
      motif.className = 'nc-plate-motif-sprite';
      plate.append(motif);
    }

    const nameRow = el('div', 'nc-name-row');
    const h = el('h3', 'nc-player-name', data.name || L('Entrenador', 'Trainer', '训练家'));
    h.setAttribute('translate', 'no');
    nameRow.append(h);

    // Always display Player League Rank on the Namecard!
    const lr = data.leagueRank || { tier: 1, stars: 0, protocol: 0, color: '#708090', name: 'R1' };
    const rankPill = el('span', 'nc-rank-pill');
    rankPill.style.setProperty('--nc-rank-color', lr.color || '#708090');
    const code = lr.protocol ? `R8 · P${lr.protocol}` : `R${lr.tier}`;
    rankPill.innerHTML = `<span class="nc-rank-code">${esc(code)}</span><span>${esc(lr.name || '')}</span>`;
    nameRow.append(rankPill);
    plate.append(nameRow);

    if (data.title) {
      plate.append(el('span', 'nc-title-line', '✦ ' + data.title));
    }

    // Showcase Capsule with progress bar
    const sc = data.showcase;
    if (sc) {
      const pill = el('div', 'nc-showcase-pill');
      pill.style.setProperty('--nc-sc-color', sc.color || '#57d66d');
      const ico = el('span', 'nc-sc-icon');
      if (sc.icon && sc.icon.startsWith('type:')) {
        ico.innerHTML = G.Icons?.html ? G.Icons.html(sc.icon, 16) : '●';
      } else {
        ico.textContent = badgeIconGlyph(sc.icon);
      }
      const copy = el('div', 'nc-sc-copy');
      copy.append(el('strong', '', sc.display || '0'), el('small', '', sc.label || ''));
      const bar = el('div', 'nc-sc-bar');
      const fill = el('i');
      fill.style.width = Math.max(0, Math.min(100, Number(sc.pct) || 0)) + '%';
      bar.append(fill);
      copy.append(bar);
      pill.append(ico, copy);
      plate.append(pill);
    }

    plate.append(el('span', 'nc-since', formatSince(data.created)));
    banner.append(plate);

    // 3. Standing Partner Sprite
    const stage = el('div', 'nc-partner-stage');
    if (G.DEX_BY?.[data.partnerDex]) {
      stage.append(G.UI.spriteCanvas(data.partnerDex, 100, 96, { scale: 3, lively: !options.static, hero: true, shiny: !!data.partnerShiny, shadow: false }));
    }
    banner.append(stage);

    // 4. Right-Side 6-Slot Badge Bar with Badge Frame
    const bf = data.resolvedBadgeFrame || 'none';
    const bar = el('div', 'nc-badge-bar nc-bf-' + bf);
    for (const b of data.badges || []) {
      const item = el('div', 'nc-badge-item' + (b.count > 0 ? ' lit' : ''));
      item.title = local(b.label) + ': ' + b.count;
      item.append(el('span', 'nc-badge-ico', badgeIconGlyph(b.icon)), el('span', '', '×' + b.count));
      bar.append(item);
    }
    banner.append(bar);
    return banner;
  }

  // ---------------- Interactive Custom Namecard Editor Modal ----------------

  function selfName() {
    const s = G.DB?.save;
    return G.DB?.guest ? G.T('Invitado') : (G.DB?.user || s?.name || L('Entrenador', 'Trainer', '训练家'));
  }

  function previewDataFromDraft() {
    const s = G.DB.save;
    const tempSave = { ...s, profile: { ...s.profile, ...draft } };
    return G.Namecard.publicData(tempSave, { name: selfName() });
  }

  function close() {
    if (!modal) return;
    modal.remove();
    modal = null;
    draft = null;
  }

  function saveDraft() {
    const s = G.DB.save;
    if (!s || !draft) return;
    s.profile = { ...s.profile, ...draft };
    // Sync cardPack.theme if user selected a Card Pack background
    if (s.profile.bg && s.profile.bg.startsWith('theme:')) {
      const tid = s.profile.bg.slice(6);
      if (G.CardPacks?.normalize(s).taken['theme:' + tid]) s.cardPack.theme = tid;
    }
    G.Namecard.normalize(s);
    G.DB.commit(true);
    if (G.Social?.publishProfile) G.Social.publishProfile(true);
    G.Audio?.sfx?.('confirm');
    G.UI?.toast?.(L('¡Tarjeta guardada!', 'Namecard saved!', '自定义名片已保存！'));
    close();
    if (G.UI?.isOpen?.('scr-goals')) G.GoalsUI?.render?.();
  }

  function open(initialTab = 'avatar') {
    if (modal) close();
    const s = G.DB.save;
    if (!s) return;
    G.LeagueRank?.syncRewards?.(s);
    G.Namecard.normalize(s);
    draft = JSON.parse(JSON.stringify(s.profile));
    activeTab = initialTab;
    subTab = activeTab === 'avatar' ? (draft.avatarType === 'trainer' ? 'trainer' : 'pokemon') : 'style';
    query = '';
    typeFilter = 'all';
    ownFilter = 'owned';

    modal = el('div', 'nc-overlay');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    const box = el('div', 'nc-modal');
    modal.append(box);
    modal.onclick = e => { if (e.target === modal) close(); };
    document.body.append(modal);
    renderEditor();
  }

  function renderEditor() {
    if (!modal || !draft) return;
    const s = G.DB.save;
    const N = G.Namecard;
    const box = modal.firstChild;
    box.replaceChildren();

    // Header
    const head = el('header', 'nc-modal-head');
    const left = el('div');
    left.append(
      el('small', 'nc-modal-kicker', L('Tu imagen en el ranking y las fichas de perfil', 'Your look on rankings and player profile cards', '你在排行榜和资料卡上的形象')),
      el('h2', '', L('Personaliza tu tarjeta', 'Customize Your Namecard', '自定义你的名片'))
    );
    const tools = el('div', 'nc-modal-tools');
    const randBtn = el('button', 'nc-rand-btn', '↻ ' + L('Aleatorio', 'Random', '随机'));
    randBtn.type = 'button';
    randBtn.onclick = () => { draft = N.randomize(s, draft); G.Audio?.sfx?.('click'); renderEditor(); };
    const coins = el('span', 'nc-currency-pill', '🏅 ' + (s.leagueCoins || 0).toLocaleString());
    tools.append(randBtn, coins);
    head.append(left, tools);
    box.append(head);

    // Live Hero Preview
    const prevWrap = el('div', 'nc-preview-wrap');
    prevWrap.append(renderBanner(previewDataFromDraft()));
    box.append(prevWrap);

    // Editor Split Body
    const body = el('div', 'nc-editor-body');

    // Left Sidebar
    const side = el('aside', 'nc-sidebar');
    const navGroups = [
      { label: L('Tú', 'You', '你'), items: [
        ['avatar', '🧑‍🎨', L('Avatar', 'Avatar', '头像')],
        ['frame', '🖼', L('Marco de avatar', 'Avatar Frame', '头像框')],
        ['title', '🏷', L('Título', 'Title', '称号')]
      ]},
      { label: L('Tarjeta', 'Card', '卡片'), items: [
        ['bg', '🌌', L('Fondo', 'Background', '背景')],
        ['plate', '🎨', L('Placa', 'Nameplate', '名牌')],
        ['showcase', '🏆', L('Vitrina', 'Showcase', '陈列柜')],
        ['badgeFrame', '🛡', L('Borde de medallas', 'Badge Border', '徽章边框')]
      ]},
      { label: L('Compañero', 'Partner', '伙伴'), items: [
        ['partner', '🐾', L('Compañero', 'Partner', '伙伴')]
      ]}
    ];
    for (const grp of navGroups) {
      side.append(el('div', 'nc-side-group', grp.label));
      for (const [id, ico, label] of grp.items) {
        const b = el('button', 'nc-side-btn' + (activeTab === id ? ' on' : ''));
        b.type = 'button';
        b.dataset.ncTab = id;
        b.append(el('span', 'nc-side-ico', ico), el('span', '', label));
        b.onclick = () => {
          activeTab = id;
          if (id === 'avatar') subTab = draft.avatarType === 'trainer' ? 'trainer' : 'pokemon';
          else if (id === 'plate') subTab = 'style';
          query = '';
          typeFilter = 'all';
          renderEditor();
        };
        side.append(b);
      }
    }

    // Saved Presets (3 slots)
    const pBox = el('div', 'nc-presets-box');
    pBox.append(el('div', 'nc-side-group', L('Estilos guardados', 'Saved Looks', '已保存的造型')));
    const pRow = el('div', 'nc-presets-row');
    draft.presets ||= [null, null, null];
    for (let i = 0; i < 3; i++) {
      const pr = draft.presets[i];
      const slot = el('button', 'nc-preset-slot' + (pr ? ' filled' : ''));
      slot.type = 'button';
      slot.title = pr ? L('Cargar estilo #' + (i + 1), 'Load preset #' + (i + 1), '点击应用造型 #' + (i + 1)) : L('Guardar en ranura #' + (i + 1), 'Save into slot #' + (i + 1), '点击保存当前造型到 #' + (i + 1));
      if (pr) {
        const dex = pr.partnerDex || s.partner || 25;
        if (G.DEX_BY?.[dex]) slot.append(G.UI.spriteCanvas(dex, 52, 52, { scale: 1.5, shiny: !!pr.partnerShiny, shadow: false }));
      } else {
        slot.textContent = '+' + (i + 1);
      }
      slot.onclick = () => {
        if (pr) {
          draft = { ...draft, ...pr, presets: draft.presets };
          G.Audio?.sfx?.('click');
          renderEditor();
        } else {
          draft.presets[i] = N.sanitizePreset(s, draft);
          G.Audio?.sfx?.('confirm');
          renderEditor();
        }
      };
      pRow.append(slot);
    }
    const saveSlotBtn = el('button', 'nc-preset-save', L('Guardar en estilo actual', 'Save to next slot', '存为新造型'));
    saveSlotBtn.type = 'button';
    saveSlotBtn.onclick = () => {
      const empty = draft.presets.findIndex(x => !x);
      const idx = empty >= 0 ? empty : 2;
      draft.presets[idx] = N.sanitizePreset(s, draft);
      G.Audio?.sfx?.('confirm');
      renderEditor();
    };
    pBox.append(pRow, saveSlotBtn);
    side.append(pBox);

    // Right Content Panel
    const panel = el('section', 'nc-panel');
    if (activeTab === 'avatar') renderAvatarTab(panel, s);
    else if (activeTab === 'frame') renderFrameTab(panel, s);
    else if (activeTab === 'title') renderTitleTab(panel, s);
    else if (activeTab === 'bg') renderBgTab(panel, s);
    else if (activeTab === 'plate') renderPlateTab(panel, s);
    else if (activeTab === 'showcase') renderShowcaseTab(panel, s);
    else if (activeTab === 'badgeFrame') renderBadgeFrameTab(panel, s);
    else if (activeTab === 'partner') renderPartnerTab(panel, s);

    body.append(side, panel);
    box.append(body);

    // Bottom Footer
    const foot = el('footer', 'nc-modal-footer');
    const cancelBtn = el('button', 'nc-btn-cancel', L('Cancelar', 'Cancel', '取消'));
    cancelBtn.type = 'button';
    cancelBtn.onclick = close;
    const saveBtn = el('button', 'nc-btn-save', L('Guardar', 'Save', '保存'));
    saveBtn.type = 'button';
    saveBtn.onclick = saveDraft;
    foot.append(cancelBtn, saveBtn);
    box.append(foot);
  }

  function renderAvatarTab(panel, s) {
    const N = G.Namecard;
    const head = el('div', 'nc-panel-head');
    const copy = el('div');
    copy.append(
      el('h3', '', L('Avatar', 'Avatar', '头像')),
      el('p', '', L('Tu retrato en el ranking, tarjetas y menús: un entrenador o uno de tus Pokémon.', 'Your portrait on rankings, cards, and menus: a trainer or one of your Pokémon.', '你在排行榜、名片和资料卡中的头像：一位训练家或你的某只宝可梦。'))
    );
    const tabs = el('div', 'nc-subtabs');
    for (const [id, lbl] of [['trainer', L('Entrenador', 'Trainer', '训练家')], ['pokemon', L('Pokémon', 'Pokémon', '宝可梦')]]) {
      const b = el('button', 'nc-subtab' + (subTab === id ? ' on' : ''), lbl);
      b.type = 'button';
      b.onclick = () => { subTab = id; renderEditor(); };
      tabs.append(b);
    }
    head.append(copy, tabs);
    panel.append(head);

    if (subTab === 'trainer') {
      const grid = el('div', 'nc-grid-avatars');
      for (const tr of N.TRAINER_AVATARS) {
        const unlocked = tr.check(s);
        const selected = tr.id === 'partner'
          ? (draft.avatarType === 'pokemon' && draft.avatarId === 'partner')
          : (draft.avatarType === 'trainer' && draft.avatarId === tr.id);
        const tile = el('button', 'nc-tile' + (selected ? ' on' : '') + (!unlocked ? ' locked' : ''));
        tile.type = 'button';
        tile.title = local(tr.desc);
        const av = el('div', 'nc-avatar-core');
        av.style.width = '64px'; av.style.height = '64px';
        if (tr.id === 'partner') {
          const pDex = draft.partnerDex || s.partner || 25;
          if (G.DEX_BY?.[pDex]) av.append(G.UI.spriteCanvas(pDex, 64, 64, { scale: 1.8, shiny: !!draft.partnerShiny, shadow: false }));
        } else {
          av.innerHTML = trainerSvg(tr);
        }
        tile.append(av, el('b', '', local(tr.name)));
        if (!unlocked) tile.append(el('span', 'nc-lock', '🔒'), el('small', '', local(tr.desc)));
        tile.onclick = () => {
          if (!unlocked) return;
          if (tr.id === 'partner') { draft.avatarType = 'pokemon'; draft.avatarId = 'partner'; draft.avatarShiny = !!draft.partnerShiny; }
          else { draft.avatarType = 'trainer'; draft.avatarId = tr.id; draft.avatarShiny = false; }
          G.Audio?.sfx?.('click');
          renderEditor();
        };
        grid.append(tile);
      }
      panel.append(grid);
    } else {
      const filters = el('div', 'nc-filters');
      const inp = el('input'); inp.type = 'search'; inp.value = query; inp.placeholder = L('Buscar Pokémon…', 'Search Pokémon…', '搜索宝可梦…');
      inp.oninput = () => { query = inp.value; renderEditor(); };
      filters.append(inp);
      panel.append(filters);

      const dexSet = new Set([
        ...Object.keys(s.owned || {}).map(Number),
        ...Object.keys(s.invites || {}).filter(d => s.invites[d] > 0).map(Number),
        ...(s.avatars || []).map(Number)
      ]);
      const q = query.trim().toLowerCase();
      const list = [...dexSet].filter(d => G.DEX_BY?.[d] && (!q || G.DEX_BY[d].name.toLowerCase().includes(q) || (G.T?.(G.DEX_BY[d].name) || '').toLowerCase().includes(q) || String(d).includes(q))).sort((a, b) => a - b);
      const grid = el('div', 'nc-grid-avatars');
      for (const dex of list.slice(0, 120)) {
        const mon = G.DEX_BY[dex];
        const hasShiny = N.ownsShiny(s, dex);
        const variants = hasShiny ? [false, true] : [false];
        for (const shiny of variants) {
          const selected = draft.avatarType === 'pokemon' && draft.avatarId === String(dex) && !!draft.avatarShiny === shiny;
          const tile = el('button', 'nc-tile' + (selected ? ' on' : ''));
          tile.type = 'button';
          tile.append(G.UI.spriteCanvas(dex, 64, 58, { scale: 1.7, shiny, shadow: false }), el('b', '', (shiny ? '✨ ' : '') + (G.T ? G.T(mon.name) : mon.name)), el('small', '', '#' + dex));
          tile.onclick = () => { draft.avatarType = 'pokemon'; draft.avatarId = String(dex); draft.avatarShiny = shiny; G.Audio?.sfx?.('click'); renderEditor(); };
          grid.append(tile);
        }
      }
      panel.append(grid);
    }
  }

  function renderFrameTab(panel, s) {
    const N = G.Namecard;
    const head = el('div', 'nc-panel-head');
    const copy = el('div');
    copy.append(
      el('h3', '', L('Marco de avatar', 'Avatar Frame', '头像框')),
      el('p', '', L('Decora el borde de tu retrato. Alcanza R7 y R8 en la Liga para desbloquear los marcos exclusivos de Campeón y Salón de la Fama.', 'Frame your portrait. Reach League Ranks R7 and R8 to unlock exclusive Champion & Hall of Fame frames.', '装饰你的头像边框。联盟段位达到 R7 与 R8 可领取专属限定头像框。'))
    );
    head.append(copy);
    panel.append(head);

    const grid = el('div', 'nc-grid-cards');
    const pDex = draft.partnerDex || s.partner || 25;
    for (const f of N.AVATAR_FRAMES) {
      const unlocked = f.check(s);
      const selected = draft.avatarFrame === f.id;
      const tile = el('button', 'nc-tile' + (selected ? ' on' : '') + (!unlocked ? ' locked' : ''));
      tile.type = 'button';
      const wrap = el('div', 'nc-avatar-wrap nc-frame-' + f.ring);
      wrap.style.transform = 'scale(.72)';
      wrap.style.margin = '-10px 0';
      const core = el('div', 'nc-avatar-core');
      if (G.DEX_BY?.[pDex]) core.append(G.UI.spriteCanvas(pDex, 84, 84, { scale: 2, shadow: false }));
      wrap.append(core);
      tile.append(wrap, el('b', '', local(f.name)), el('small', '', local(f.desc)));
      if (!unlocked) tile.append(el('span', 'nc-lock', '🔒'));
      tile.onclick = () => { if (!unlocked) return; draft.avatarFrame = f.id; G.Audio?.sfx?.('click'); renderEditor(); };
      grid.append(tile);
    }
    panel.append(grid);
  }

  function renderTitleTab(panel, s) {
    const N = G.Namecard;
    const head = el('div', 'nc-panel-head');
    const copy = el('div');
    copy.append(
      el('h3', '', L('Título', 'Title', '称号')),
      el('p', '', L('Se muestra debajo de tu nombre en el ranking y tu tarjeta. Desbloquea títulos subiendo de rango desde R4, completando logros o tareas de investigación.', 'Shown beneath your name on rankings and your namecard. Unlock titles via League Ranks (R4+), Achievements, and Pokémon Research.', '会显示在排行榜和名片中你的名字下方。自 R4 起每提升一个段位均可获得专属段位称号，成就与宝可梦研究也会解锁称号。'))
    );
    head.append(copy);
    panel.append(head);

    const list = el('div', 'nc-title-list');
    // None option
    const noneRow = el('button', 'nc-title-row' + (!draft.title ? ' on' : ''));
    noneRow.type = 'button';
    noneRow.append(el('b', '', L('Sin título', 'No Title', '无称号')), el('span', 'nc-title-tag', L('Por defecto', 'Default', '默认')));
    noneRow.onclick = () => { draft.title = ''; G.Audio?.sfx?.('click'); renderEditor(); };
    list.append(noneRow);

    for (const t of N.allTitles(s)) {
      const selected = draft.title === t.id || draft.title === t.label;
      const row = el('button', 'nc-title-row' + (selected ? ' on' : '') + (!t.unlocked ? ' locked' : ''));
      row.type = 'button';
      const left = el('div');
      left.append(el('b', '', (t.unlocked ? '✦ ' : '🔒 ') + t.label), el('div', '', ''));
      left.lastChild.style.cssText = 'font-size:11.5px;color:#8f9fbe;margin-top:2px';
      left.lastChild.textContent = local(t.desc);
      const tag = el('span', 'nc-title-tag', t.source === 'rank' ? (t.tier === 9 ? 'R8 · P1' : 'R' + t.tier) : t.source === 'ach' ? L('Logro', 'Achievement', '成就') : L('Investigación', 'Research', '研究'));
      if (t.color) { tag.style.border = `1px solid ${t.color}`; tag.style.color = t.color; }
      row.append(left, tag);
      row.onclick = () => { if (!t.unlocked) return; draft.title = t.id; G.Audio?.sfx?.('click'); renderEditor(); };
      list.append(row);
    }
    panel.append(list);
  }

  function renderBgTab(panel, s) {
    const N = G.Namecard;
    const head = el('div', 'nc-panel-head');
    const copy = el('div');
    copy.append(
      el('h3', '', L('Fondo', 'Background', '背景')),
      el('p', '', L('Escena completa detrás de tu tarjeta. Obtén temas en los Paquetes de cartas o sube de rango en la Liga.', 'Full-banner backdrop behind your namecard. Unlock themes from Card Packs or League milestones.', '名片整体背后的场景。可通过游戏卡包、成就与联盟段位解锁。'))
    );
    head.append(copy);
    panel.append(head);

    const grid = el('div', 'nc-grid-cards');
    for (const bg of N.backgrounds(s)) {
      const selected = draft.bg === bg.id;
      const tile = el('button', 'nc-tile' + (selected ? ' on' : '') + (!bg.unlocked ? ' locked' : ''));
      tile.type = 'button';
      const sw = el('div', 'nc-bg-swatch');
      applyBgClass(sw, bg.id);
      tile.append(sw, el('b', '', local(bg.name)), el('small', '', local(bg.desc)));
      if (!bg.unlocked) tile.append(el('span', 'nc-lock', '🔒'));
      tile.onclick = () => { if (!bg.unlocked) return; draft.bg = bg.id; draft.bgExplicit = true; G.Audio?.sfx?.('click'); renderEditor(); };
      grid.append(tile);
    }
    panel.append(grid);
  }

  function renderPlateTab(panel, s) {
    const N = G.Namecard;
    const head = el('div', 'nc-panel-head');
    const copy = el('div');
    copy.append(
      el('h3', '', L('Placa de nombre', 'Nameplate', '名牌')),
      el('p', '', L('El estilo y borde interior de tu placa. Todas las placas elementales están disponibles desde el inicio.', 'Style and border of your inner nameplate. All 18 elemental styles are unlocked for everyone.', '名牌内部的样式与边缘装饰。18 种属性样式默认全部可用。'))
    );
    const tabs = el('div', 'nc-subtabs');
    for (const [id, lbl] of [['style', L('Estilo', 'Style', '样式')], ['edge', L('Borde', 'Edge', '边缘')]]) {
      const b = el('button', 'nc-subtab' + (subTab === id ? ' on' : ''), lbl);
      b.type = 'button';
      b.onclick = () => { subTab = id; renderEditor(); };
      tabs.append(b);
    }
    head.append(copy, tabs);
    panel.append(head);

    const grid = el('div', 'nc-grid-cards');
    if (subTab === 'style') {
      for (const np of N.NAMEPLATES) {
        const unlocked = np.check(s);
        const selected = draft.nameplate === np.id;
        const tile = el('button', 'nc-tile' + (selected ? ' on' : '') + (!unlocked ? ' locked' : ''));
        tile.type = 'button';
        const sw = el('div', 'nc-bg-swatch nc-plate nc-edge-corner' + (np.type ? ' nc-plate-type' : (np.id === 'gold_velvet' || np.id === 'prism_aurora' ? ' nc-plate-' + np.id : '')));
        sw.style.setProperty('--nc-plate-accent', np.accent);
        sw.style.padding = '8px 10px';
        sw.innerHTML = `<b style="font-size:12px;color:#fff;text-align:left">${esc(G.DB.user || 'Trainer')}</b>`;
        tile.append(sw, el('b', '', local(np.name)), el('small', '', local(np.desc)));
        if (!unlocked) tile.append(el('span', 'nc-lock', '🔒'));
        tile.onclick = () => { if (!unlocked) return; draft.nameplate = np.id; G.Audio?.sfx?.('click'); renderEditor(); };
        grid.append(tile);
      }
    } else {
      for (const ed of N.NAMEPLATE_EDGES) {
        const unlocked = ed.check(s);
        const selected = draft.nameplateEdge === ed.id;
        const tile = el('button', 'nc-tile' + (selected ? ' on' : '') + (!unlocked ? ' locked' : ''));
        tile.type = 'button';
        const sw = el('div', 'nc-bg-swatch nc-plate nc-edge-' + ed.id);
        sw.style.setProperty('--nc-plate-accent', N.NAMEPLATE_BY[draft.nameplate]?.accent || '#57d66d');
        sw.style.padding = '8px 10px';
        sw.innerHTML = `<b style="font-size:12px;color:#fff;text-align:left">${esc(G.DB.user || 'Trainer')}</b>`;
        tile.append(sw, el('b', '', local(ed.name)), el('small', '', local(ed.desc)));
        if (!unlocked) tile.append(el('span', 'nc-lock', '🔒'));
        tile.onclick = () => { if (!unlocked) return; draft.nameplateEdge = ed.id; G.Audio?.sfx?.('click'); renderEditor(); };
        grid.append(tile);
      }
    }
    panel.append(grid);
  }

  function renderShowcaseTab(panel, s) {
    const N = G.Namecard;
    const head = el('div', 'nc-panel-head');
    const copy = el('div');
    copy.append(
      el('h3', '', L('Vitrina con barra de progreso', 'Showcase (With Progress Bar)', '陈列柜 · 带进度条')),
      el('p', '', L('Elige qué marca de progreso quieres destacar en tu tarjeta.', 'Pick which live collection or milestone tracker is displayed on your namecard.', '选择一项展示在名片中央的实时进度徽章。'))
    );
    head.append(copy);
    panel.append(head);

    const grid = el('div', 'nc-grid-wide');
    for (const def of N.SHOWCASES) {
      const sc = N.showcaseValue(s, def.id);
      const selected = draft.showcase === def.id;
      const card = el('button', 'nc-sc-card' + (selected ? ' on' : ''));
      card.type = 'button';
      const pill = el('div', 'nc-showcase-pill');
      pill.style.setProperty('--nc-sc-color', sc.color);
      const ico = el('span', 'nc-sc-icon');
      if (sc.icon.startsWith('type:')) ico.innerHTML = G.Icons?.html ? G.Icons.html(sc.icon, 16) : '●';
      else ico.textContent = badgeIconGlyph(sc.icon);
      const cp = el('div', 'nc-sc-copy');
      cp.append(el('strong', '', sc.display), el('small', '', sc.label));
      const bar = el('div', 'nc-sc-bar');
      const fill = el('i'); fill.style.width = Math.max(0, Math.min(100, sc.pct)) + '%';
      bar.append(fill); cp.append(bar);
      pill.append(ico, cp);
      card.append(pill, el('small', '', sc.fullLabel));
      card.onclick = () => { draft.showcase = def.id; G.Audio?.sfx?.('click'); renderEditor(); };
      grid.append(card);
    }
    panel.append(grid);
  }

  function renderBadgeFrameTab(panel, s) {
    const N = G.Namecard;
    const head = el('div', 'nc-panel-head');
    const copy = el('div');
    copy.append(
      el('h3', '', L('Borde de medallas', 'Badge Border', '徽章边框')),
      el('p', '', L('Tu rango de la Liga desbloquea marcos para la barra de medallas de tu tarjeta.', 'Your League Rank unlocks prestigious borders for the badge strip on your namecard.', '你的联盟段位会为右侧徽章栏解锁对应边框。'))
    );
    head.append(copy);
    panel.append(head);

    const grid = el('div', 'nc-grid-wide');
    const badges = N.badgeCounts(s);
    for (const bf of N.BADGE_FRAMES) {
      const unlocked = bf.check(s);
      const selected = draft.badgeFrame === bf.id;
      const resolved = bf.id === 'auto' ? N.resolveBadgeFrame(s, 'auto') : bf.id;
      const tile = el('button', 'nc-tile' + (selected ? ' on' : '') + (!unlocked ? ' locked' : ''));
      tile.type = 'button';
      tile.style.alignItems = 'stretch';
      tile.style.textAlign = 'left';
      const bar = el('div', 'nc-badge-bar nc-bf-' + resolved);
      bar.style.justifyContent = 'space-between';
      bar.style.padding = '7px 10px';
      for (const b of badges) {
        const it = el('div', 'nc-badge-item' + (b.count > 0 ? ' lit' : ''));
        it.append(el('span', 'nc-badge-ico', badgeIconGlyph(b.icon)), el('span', '', '×' + b.count));
        bar.append(it);
      }
      tile.append(bar, el('b', '', local(bf.name)), el('small', '', local(bf.desc)));
      if (!unlocked) tile.append(el('span', 'nc-lock', '🔒'));
      tile.onclick = () => { if (!unlocked) return; draft.badgeFrame = bf.id; G.Audio?.sfx?.('click'); renderEditor(); };
      grid.append(tile);
    }
    panel.append(grid);
  }

  function renderPartnerTab(panel, s) {
    const N = G.Namecard;
    const curDex = draft.partnerDex || s.partner || 25;
    const curMon = G.DEX_BY?.[curDex];
    const head = el('div', 'nc-panel-head');
    const copy = el('div');
    copy.append(
      el('h3', '', L('Compañero', 'Partner', '伙伴')),
      el('p', '', L('El Pokémon que aparece junto a tu placa. Puedes elegir cualquiera de tus Pokémon registrados o invitados y cambiar a su forma shiny si la posees.', 'The Pokémon standing on your namecard. Choose any registered or invited Pokémon and switch to Shiny if unlocked.', '站在名片上的宝可梦。可从已登记或持邀请函的宝可梦中选择，并可切换异色外观。'))
    );
    head.append(copy);
    panel.append(head);

    // Appearance selector for current partner (Normal / Shiny)
    if (curMon) {
      const hasShiny = N.ownsShiny(s, curDex);
      const varGrid = el('div', 'nc-grid-avatars');
      for (const [isShiny, lbl, unlocked] of [[false, L('Normal', 'Normal', '普通'), true], [true, L('Shiny', 'Shiny', '异色'), hasShiny]]) {
        const tile = el('button', 'nc-tile' + (!!draft.partnerShiny === isShiny ? ' on' : '') + (!unlocked ? ' locked' : ''));
        tile.type = 'button';
        tile.append(G.UI.spriteCanvas(curDex, 68, 60, { scale: 2, shiny: isShiny, shadow: false }), el('b', '', lbl), el('small', '', unlocked ? (isShiny ? '✨ Shiny' : L('Disponible', 'Unlocked', '可用')) : L('Bloqueado', 'Locked', '未解锁')));
        if (!unlocked) tile.append(el('span', 'nc-lock', '🔒'));
        tile.onclick = () => {
          if (!unlocked) return;
          draft.partnerShiny = isShiny;
          if (draft.avatarType === 'pokemon' && draft.avatarId === 'partner') draft.avatarShiny = isShiny;
          G.Audio?.sfx?.('click');
          renderEditor();
        };
        varGrid.append(tile);
      }
      panel.append(varGrid);
    }

    // Search + filter bar
    const filters = el('div', 'nc-filters');
    const inp = el('input'); inp.type = 'search'; inp.value = query; inp.placeholder = L('Buscar Pokémon…', 'Search Pokémon…', '搜索宝可梦…');
    inp.oninput = () => { query = inp.value; renderEditor(); };
    const ownSel = el('select');
    ownSel.innerHTML = `<option value="owned" ${ownFilter==='owned'?'selected':''}>${L('Registrados','Registered','已登记')}</option><option value="all" ${ownFilter==='all'?'selected':''}>${L('Con invitaciones','Include Invites','含邀请函')}</option>`;
    ownSel.onchange = () => { ownFilter = ownSel.value; renderEditor(); };
    const typeSel = el('select');
    typeSel.innerHTML = `<option value="all">${L('Tipo: Todos','Type: All','属性：全部')}</option>` + N.TYPES.map(t => `<option value="${t}" ${typeFilter===t?'selected':''}>${esc(local(N.TYPE_LABEL[t]))}</option>`).join('');
    typeSel.onchange = () => { typeFilter = typeSel.value; renderEditor(); };
    filters.append(inp, ownSel, typeSel);
    panel.append(filters);

    const dexSet = new Set(Object.keys(s.owned || {}).map(Number));
    if (ownFilter === 'all') for (const d of Object.keys(s.invites || {})) if (s.invites[d] > 0) dexSet.add(+d);
    const q = query.trim().toLowerCase();
    const list = [...dexSet].filter(d => {
      const m = G.DEX_BY?.[d];
      if (!m) return false;
      if (typeFilter !== 'all' && !m.types.includes(typeFilter)) return false;
      if (q && !m.name.toLowerCase().includes(q) && !(G.T?.(m.name) || '').toLowerCase().includes(q) && !String(d).includes(q)) return false;
      return true;
    }).sort((a, b) => a - b);

    const grid = el('div', 'nc-grid-avatars');
    for (const dex of list.slice(0, 120)) {
      const mon = G.DEX_BY[dex];
      const selected = curDex === dex;
      const tile = el('button', 'nc-tile' + (selected ? ' on' : ''));
      tile.type = 'button';
      tile.append(G.UI.spriteCanvas(dex, 64, 58, { scale: 1.7, shiny: selected && !!draft.partnerShiny, shadow: false }), el('b', '', G.T ? G.T(mon.name) : mon.name), el('small', '', '#' + dex));
      tile.onclick = () => {
        draft.partnerDex = dex;
        if (!N.ownsShiny(s, dex)) draft.partnerShiny = false;
        if (draft.avatarType === 'pokemon' && draft.avatarId === 'partner') draft.avatarShiny = !!draft.partnerShiny;
        G.Audio?.sfx?.('click');
        renderEditor();
      };
      grid.append(tile);
    }
    panel.append(grid);
  }

  addEventListener('keydown', e => {
    if (!modal) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  }, true);

  return { open, close, renderBanner, trainerSvg };
})();
