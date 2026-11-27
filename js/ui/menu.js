/* ============ menu.js — menú principal, colección y mejoras ============ */
G.MenuUI = (() => {
  G.I18n.add({'Modo invitado: colección y rango temporales; expedición guardada en este navegador.':'Guest mode: temporary collection and rank; expedition saved in this browser.'});G.I18n.addChinese({'Modo invitado: colección y rango temporales; expedición guardada en este navegador.':'游客模式：收藏和段位临时保存；远征存档保留在此浏览器。'});
  const $ = G.UI.$;
  const GEN_NAMES = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'];
  let dexFilter = 'all', dexGen = 1, dexSel;
  const megaDexes = new Set(G.Mega.LIST.map(f => f.dex));
  const inDexIndex = p => dexGen === 'mega' ? megaDexes.has(p.dex) : p.gen === dexGen;
  const inDexFilter = (p,s) => dexFilter === 'own' ? !!s.owned[p.dex] : dexFilter === 'miss' ? !s.owned[p.dex] :
    dexFilter === 'shiny' ? !!s.shiny?.[p.dex] : /^\d$/.test(dexFilter) ? p.rarity === +dexFilter : true;

  function init() {
    const ICON = { play: 'ball', dex: 'book', nursery:'ball', upgrades: 'up', gacha: 'ball4', 'ability-gacha': 'gem', exchange: 'coin', goals: 'medal3', offline: 'clock', friends: 'friends', rank: 'trophy', settings: 'gear' };
    document.querySelectorAll('#scr-menu [data-go]').forEach(b => {
      b.insertAdjacentHTML('afterbegin', `<span class="mi-ico">${G.Icons.html(ICON[b.dataset.go], 26)}</span>`);
      b.dataset.sfx = b.dataset.go === 'play' ? 'confirm' : 'click';
      b.onclick = () => {
        const go = b.dataset.go;
        if (go === 'play') { if (G.Social.room) G.LobbyUI.open(); else G.Flow.play(); }
        else if (go === 'dex') openDex();
        else if (go === 'upgrades') openUpgrades();
        else if (go === 'gacha') G.GachaUI.open();
        else if (go === 'ability-gacha') G.GachaUI.open('ability');
        else if (go === 'exchange') G.ExchangeUI.open();
        else if (go === 'goals') G.GoalsUI.open();
        else if (go === 'offline') G.OfflineUI.open();
        else if (go === 'nursery') G.NurseryUI.open();
        else if (go === 'friends') G.FriendsUI.open();
        else if (go === 'rank') G.RankingUI.open();
        else if (go === 'settings') G.SettingsUI.open();
      };
    });
    document.querySelectorAll('[data-back]').forEach(b => { b.onclick = open; });
    G.Social.on(() => { if (G.UI.isOpen('scr-menu')) socialLine(); });
    $('btn-logout').onclick = () => {
      if (G.DB.guest && !confirm('Eres invitado: se perderá todo el progreso. ¿Salir?')) return;
      G.Audio.music(null);
      G.DB.logout().then(() => G.Flow.toLogin());
    };
  }

  // ---------------- menú principal ----------------

  function open() {
    const s = G.DB.save;
    const mon = G.DEX_BY[s.partner];
    const shiny = !!s.partnerShiny && G.DB.ownsShiny(mon.dex);
    G.UI.chrome(true);
    G.UI.show('scr-menu');
    G.ExpeditionSave?.menu();G.LeagueRankUI?.menu();
    const lr = G.LeagueRank?.syncRewards(s);
    if (lr?.granted) { G.DB.commit(true); G.UI.refreshCoins(); }
    G.UI.sprite($('menu-partner'), mon.dex, { lively: true, scale: 4, hero: true, shiny });
    $('menu-partner').style.setProperty('--stage-c', shiny ? '#9ae6ff' : G.U.TYPE_COLOR[mon.types[0]]);
    $('menu-partner').classList.toggle('shiny', shiny);
    if (G.DifficultyUI) G.DifficultyUI.menu();
    $('menu-partner-name').innerHTML = mon.name + (shiny ? ' ' + G.Icons.html('shiny', 24) : '');
    $('menu-partner-info').innerHTML = G.UI.typeChips(mon.types) + ' ' + G.UI.stars(mon.rarity);
    const ability = G.Abilities.equipped(s, mon.dex);
    if (ability) $('menu-partner-info').insertAdjacentHTML('beforeend', '<br>' + G.Icons.html('medal3', 18) + ' ' + G.AbilityDefs.BY_ID[mon.dex + '-' + ability].name);
    const stone = s.megaEquipped && s.megaEquipped[mon.dex];
    if (G.Mega && G.Mega.owns(s, stone)) $('menu-partner-info').insertAdjacentHTML('beforeend', '<br>' + G.Icons.html('megaStone', 18) + ' ' + G.Mega.label(stone));
    // Normal / shiny a mano, aquí mismo (en el móvil no se encontraba en la ficha).
    const seg = $('menu-shiny');
    seg.classList.toggle('hidden', !G.DB.ownsShiny(mon.dex));
    seg.lastChild.innerHTML = G.Icons.html('shiny', 12) + ' Shiny';
    seg.querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', (b.dataset.v === '1') === shiny);
      b.onclick = () => {
        if ((b.dataset.v === '1') === shiny) return;
        s.partnerShiny = b.dataset.v === '1';
        G.DB.commit();
        G.Audio.sfx('confirm');
        open();
      };
    });

    const owned = Object.keys(s.owned).filter(d => G.DEX_BY[d]).length;
    const shinies = Object.keys(s.shiny || {}).length;
    $('menu-community-number').textContent = G.Community.groupId;
    $('menu-dex-count').textContent = `${owned} / ${G.DEX.length}` + (shinies ? ` · ${shinies} shiny` : '');

    const st = s.stats;
    if (G.OfflineUI) G.OfflineUI.menu();
    $('menu-stats').innerHTML =
      `Runs <b style="color:#fff">${st.runs}</b> · Mejor tiempo <b style="color:#fff">${G.U.mmss(st.bestTime)}</b><br>` +
      `Mejor nivel <b style="color:#fff">${st.bestLevel}</b> · Derrotados <b style="color:#fff">${st.totalKills.toLocaleString('es')}</b>` +
      (G.DB.guest ? '<br><span style="color:#ffb0b8">Modo invitado: colección y rango temporales; expedición guardada en este navegador.</span>' : '');

    socialLine();
    // Premios de misiones por recoger.
    G.Progress.checkAch();
    const pend = G.Progress.pending();
    $('menu-goals-sub').textContent = pend ? pend + (pend === 1 ? ' premio por recoger' : ' premios por recoger') : 'Misiones, logros y perfil';
    $('menu-goals-sub').classList.toggle('gold', pend > 0);
    // Con cuenta en la nube: amigos en línea, invitaciones y (una vez) el apodo.
    if (G.DB.online && !G.Social.started) {
      G.Social.start().then(r => {
        if (r === 'need-nick' && !G.NickUI.skipped && G.UI.isOpen('scr-menu')) G.NickUI.open();
        socialLine();
      });
    }
    G.InvitePop.refresh();
  }

  /** Texto bajo "Amigos" y "Jugar": quién está en línea, solicitudes, sala. */
  function socialLine() {
    const room = G.Social.room;
    const play = document.querySelector('#scr-menu [data-go=play] small');
    if (play) play.textContent = room ? 'Volver a tu sala (' + room.members.length + '/' + G.Social.MAX_PLAYERS + ')' : 'Entra en la mazmorra';
    const fr = G.Social.friends;
    const on = fr.filter(f => f.status === 'ok' && f.online).length;
    const req = fr.filter(f => f.status === 'in').length;
    const parts = [];
    $('menu-nursery-sub').textContent=G.Social.extras.nurseryReady?G.Server.text('¡Cría lista!','Offspring ready!','孵化已完成，可以收获！'):G.T('Huevos y crianza con amigos');
    if (on) parts.push(on + ' en línea');
    if (req) parts.push(req + (req === 1 ? ' solicitud' : ' solicitudes'));
    if(G.Social.extras.gifts.inbox.length)parts.push(G.Server.text('Regalos pendientes','Gifts waiting','有待领取礼物'));
    $('menu-friends-sub').textContent = parts.length ? parts.join(' · ') : G.Server.text('Guardería y regalos','Nursery and gifts','拜访孵蛋屋、赠送礼物');
    $('menu-friends-sub').classList.toggle('gold', req > 0);
  }

  // ---------------- colección ----------------

  function openDex() {
    G.UI.show('scr-dex', true);
    const s = G.DB.save;
    if (dexSel === undefined) { dexSel = s.partner; dexGen = G.DEX_BY[s.partner].gen; }
    const owned = Object.keys(s.owned).filter(d => G.DEX_BY[d]).length;
    $('dex-total').textContent = `${owned} / ${G.DEX.length}`;

    // Pestañas de generación, con cuántos tienes de cada una.
    const tabs = $('dex-gens');
    tabs.innerHTML = '';
    const mega = document.createElement('button');
    mega.className = 'gen-tab mega-index' + (dexGen === 'mega' ? ' on' : '');
    mega.dataset.dexIndex = 'mega';mega.setAttribute('aria-pressed',String(dexGen === 'mega'));
    // Preserve the Mega name across the Chinese translator's second pass.
    const megaLabel=G.I18n.lang==='zh'?'Mega 进化':G.T('Megaevolución');
    mega.innerHTML = '<b translate="no">'+G.Icons.html('megaStone',16)+' '+megaLabel+'</b><small>'+[...megaDexes].filter(d=>s.owned[d]).length+'/'+megaDexes.size+'</small>';
    mega.onclick = () => {dexGen='mega';openDex();};tabs.appendChild(mega);
    GEN_NAMES.forEach((name, i) => {
      const g = i + 1;
      const total = G.DEX.filter(p => p.gen === g).length;
      const have = G.DEX.filter(p => p.gen === g && s.owned[p.dex]).length;
      const b = document.createElement('button');
      b.className = 'gen-tab' + (g === dexGen ? ' on' : '');
      b.dataset.dexIndex = g;b.setAttribute('aria-pressed',String(g === dexGen));
      b.innerHTML = `<b>${name}</b><small>${have}/${total}</small>`;
      b.onclick = () => { dexGen = g; openDex(); };
      tabs.appendChild(b);
    });

    const F = [['all', 'Todos'], ['own', 'Tengo'], ['miss', 'Me faltan'], ['shiny', 'Shiny'],
               ['5', 5], ['4', 4], ['3', 3], ['2', 2], ['1', 1]];
    const fb = $('dex-filters');
    fb.innerHTML = '';
    for (const [k, label] of F) {
      const c = document.createElement('button');
      c.className = 'chip' + (k === dexFilter ? ' on' : '');
      c.innerHTML = k === 'shiny' ? G.Icons.html('shiny', 12) + ' Shiny'
                  : typeof label === 'number' ? G.Icons.rarity(label, 12) + ' ' + G.Gacha.RARITY_NAME[label] : label;
      c.onclick = () => { dexFilter = k; openDex(); };
      fb.appendChild(c);
    }
    const visible = G.DEX.filter(p=>inDexIndex(p)&&inDexFilter(p,s));
    if(!visible.some(p=>p.dex===dexSel))dexSel=visible[0]?.dex??null;
    renderGrid();
    if(dexSel!=null)showDetail(dexSel);
    else $('dex-detail').innerHTML='<p class="sub">'+G.T('Ninguno con este filtro.')+'</p>';
  }

  function renderGrid() {
    const s = G.DB.save;
    const grid = $('dex-grid');
    grid.innerHTML = '';
    for (const p of G.DEX) {
      if (!inDexIndex(p)||!inDexFilter(p,s)) continue;
      const own = !!s.owned[p.dex], inv = s.invites?.[p.dex] || 0, sh = !!(s.shiny && s.shiny[p.dex]);
      const reveal = own || inv > 0 || dexGen === 'mega';

      const cell = document.createElement('div');
      cell.className = 'cell' + (own || inv > 0 ? '' : ' locked') + (p.dex === dexSel ? ' on' : '');
      cell.dataset.dex = p.dex;
      if(dexGen==='mega'){cell.classList.add('mega-entry');cell.tabIndex=0;cell.setAttribute('role','button');cell.setAttribute('aria-label',G.T(p.name)+' · '+G.T(own?'Tengo':'Sin registrar'));}
      if (G.DifficultyUI && own) G.DifficultyUI.decorate(cell, p.dex);
      cell.insertAdjacentHTML('beforeend', `<span class="no">${String(p.dex).padStart(3, '0')}</span>`);
      if (p.dex === s.partner) cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="Compañero">${G.Icons.html('crown', 14)}</span>`);
      else if (sh) cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="Tienes su shiny">${G.Icons.html('shiny', 12)}</span>`);
      else if (!own && inv > 0) cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="Invitación">✉${inv}</span>`);
      const useShiny = sh && p.dex === s.partner && s.partnerShiny;
      cell.appendChild(G.UI.spriteCanvas(p.dex, 92, 80, { scale: 2, silhouette: !reveal, shadow: own, shiny: useShiny }));
      cell.insertAdjacentHTML('beforeend', `<b>${reveal ? p.name : '???'}</b>${G.UI.stars(p.rarity, 9)}`);
      if(dexGen==='mega')cell.insertAdjacentHTML('beforeend','<small class="mega-dex-status">'+G.T(own?'Tengo':'Sin registrar')+'</small>');
      cell.onclick = () => {
        dexSel = p.dex;
        grid.querySelectorAll('.cell').forEach(c => c.classList.remove('on'));
        cell.classList.add('on');
        showDetail(p.dex);
      };
      if(dexGen==='mega')cell.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cell.click();}};
      grid.appendChild(cell);
    }
    if (!grid.children.length) grid.innerHTML = '<p class="sub" style="grid-column:1/-1">Ninguno con este filtro.</p>';
  }

  // Variante que se está viendo en la ficha (normal o shiny).
  let viewShiny = false;

  function openExpandedDetail(dex) {
    const s = G.DB.save, p = G.DEX_BY[dex], own = !!s.owned[dex], inv = s.invites?.[dex] || 0;
    const L = (es, en, zh) => G.I18n?.lang === 'zh' ? zh : G.I18n?.lang === 'en' ? en : es;
    document.getElementById('dex-expanded-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'dex-expanded-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9200;display:flex;align-items:center;justify-content:center;background:rgba(8,12,24,.82);backdrop-filter:blur(6px);padding:16px;';
    const card = document.createElement('section');
    card.style.cssText = 'width:min(820px,100%);max-height:88vh;overflow:auto;background:linear-gradient(160deg,#162038,#0f172a);border:1px solid rgba(148,163,184,.3);border-radius:16px;padding:18px;color:#f1f5f9;';
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;';
    head.innerHTML = `<div style="display:flex;align-items:center;gap:10px;"><h3 style="margin:0;">Nº ${String(p.dex).padStart(3, '0')} · ${G.T(p.name)}</h3>${G.UI.typeChips(p.types)}</div>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn small ghost';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => modal.remove();
    head.appendChild(closeBtn);

    const tabs = document.createElement('div');
    tabs.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;';
    const body = document.createElement('div');
    body.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;';

    let activeTab = 'stats';
    const tabDefs = [
      ['stats', L('Estadísticas e IV', 'Stats & IVs', '基础与个体')],
      ['moves', L('Movimientos y equipo', 'Moves & Gear', '招式与装备')],
      ['research', L('Investigación', 'Research', '宝可梦研究')]
    ];

    const renderTab = () => {
      tabs.querySelectorAll('button').forEach(b => b.classList.toggle('gold', b.dataset.tab === activeTab));
      body.replaceChildren();
      if (activeTab === 'stats') {
        const col1 = document.createElement('div');
        const max = { hp: 183, atk: 2.3, spd: 137 };
        const iv = own ? G.MonProgression.normalizeIV(G.DB.ivOf(dex)) : (s.inviteIVs?.[dex] ? G.MonProgression.normalizeIV(s.inviteIVs[dex]) : Array(8).fill(1));
        const ivClass = value => value <= 10 ? 'iv-low' : value <= 20 ? 'iv-mid' : value <= 29 ? 'iv-high' : 'iv-perfect';
        const bar = (label, v, m, txt, value) =>
          `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.min(100, v / m * 100)}%"></i></div><span>${txt}</span><span class="iv-value ${ivClass(value)}">IV ${value}</span></div>`;
        col1.innerHTML =
          bar(G.T('Vida'), p.hp, max.hp, p.hp, iv[0]) +
          bar(G.T('At. físico'), p.atk, max.atk, '×' + p.atk.toFixed(2), iv[1]) +
          bar(G.T('At. especial'), p.spa, max.atk, '×' + p.spa.toFixed(2), iv[3]) +
          bar(G.T('Def. física'), p.defense, max.atk, '÷' + p.defense.toFixed(2), iv[4]) +
          bar(G.T('Def. especial'), p.spdef, max.atk, '÷' + p.spdef.toFixed(2), iv[5]) +
          bar(G.T('Velocidad'), p.spd, max.spd, p.spd, iv[2]) +
          bar(G.T('Agilidad base'), G.MonProgression.agilityBase(p), 200, Math.round(G.MonProgression.agilityBase(p)), iv[6]) +
          bar(G.T('Resistencia base'), G.MonProgression.staminaBase(p), 200, Math.round(G.MonProgression.staminaBase(p)), iv[7]) +
          `<p class="note">${G.T('Stats base originales')}: ${Object.values(p.baseStats).join(' / ')}</p>`;
        const col2 = document.createElement('div');
        if (G.DifficultyUI && own) G.DifficultyUI.detail(col2, dex);
        else col2.innerHTML = `<p class="note">${own ? '' : inv > 0 ? L('Tienes ' + inv + ' invitaciones. Los combates con invitación usan IV aleatorios.', 'You have ' + inv + ' invitations. Battles with invitations use random IVs.', '当前持有 ' + inv + ' 张邀请函；使用邀请函出战时个体值随机。') : L('Captura o consigue una bola dorada para desbloquearlo permanentemente.', 'Capture it in battle to unlock permanently.', '局内捕捉后可永久解锁该宝可梦。')}</p>`;
        body.append(col1, col2);
      } else if (activeTab === 'moves') {
        const col1 = document.createElement('div');
        col1.innerHTML = `<p style="font-size:14px;margin:0 0 8px">${G.T('Empieza con')} <b class="gold">${G.T(G.Moves.BY_ID[G.startMoveOf(dex)].name)}</b></p>
          <p class="move-icons">${G.Moves.poolFor(p).map(id => `<span title="${G.T(G.Moves.BY_ID[id].name)} · ${G.Moves.classLabel(G.Moves.BY_ID[id])}">${G.Icons.html('move:' + id, 18)}</span>`).join('')}</p>`;
        const col2 = document.createElement('div');
        if (G.AbilityDefs.medalsFor(dex).length) G.GachaUI.renderEquipment(col2, dex);
        if (G.EquipmentUI && own) G.EquipmentUI.render(col2, dex);
        body.append(col1, col2);
      } else {
        const wrap = document.createElement('div');
        wrap.style.gridColumn = '1 / -1';
        if (!own) {
          wrap.innerHTML = `<p class="note">${L('La investigación se desbloquea al poseer este Pokémon.', 'Research unlocks once you own this Pokémon.', '永久拥有该宝可梦后开启宝可梦研究任务。')}</p>`;
        } else if (G.Research) {
          for (const t of G.Research.tasksFor(dex, s)) {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);margin-bottom:8px;';
            row.innerHTML = `<div><b>${t.label}</b><div class="note">${t.rewardLabel} · ${t.value} / ${t.goal}</div></div>`;
            const b = document.createElement('button');
            b.className = 'btn small' + (t.done && !t.claimed ? ' gold' : '');
            if (t.claimed) {
              if (t.rewardType === 'title') {
                const eq = s.profile?.title === t.titleText;
                b.textContent = eq ? L('Equipado', 'Equipped', '已佩戴') : L('Equipar título', 'Equip Title', '佩戴称号');
                b.disabled = eq;
                b.onclick = () => { G.Research.equipTitle(t.titleText, s); renderTab(); };
              } else {
                const eq = s.profile?.avatar === t.rewardId;
                b.textContent = eq ? L('Equipado', 'Equipped', '使用中') : L('Usar avatar', 'Use Avatar', '使用头像');
                b.disabled = eq;
                b.onclick = () => { G.Research.equipAvatar(t.rewardId, s); renderTab(); };
              }
            } else {
              b.textContent = t.done ? L('Reclamar', 'Claim', '领取奖励') : L('En progreso', 'In progress', '未完成');
              b.disabled = !t.done;
              b.onclick = () => { G.Research.claim(dex, t.id, s); renderTab(); };
            }
            row.appendChild(b);
            wrap.appendChild(row);
          }
        }
        body.append(wrap);
      }
    };

    for (const [id, label] of tabDefs) {
      const b = document.createElement('button');
      b.className = 'btn small';
      b.dataset.tab = id;
      b.textContent = label;
      b.onclick = () => { activeTab = id; renderTab(); };
      tabs.appendChild(b);
    }

    card.append(head, tabs, body);
    modal.appendChild(card);
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
    renderTab();
  }

  function showDetail(dex) {
    const s = G.DB.save;
    const p = G.DEX_BY[dex];
    const own = !!s.owned[dex], inv = s.invites?.[dex] || 0;
    const canUse = own || inv > 0;
    const reveal = canUse || dexGen === 'mega' && megaDexes.has(dex);
    const hasSh = G.DB.ownsShiny(dex);
    const isPartner = dex === s.partner;
    if (!hasSh) viewShiny = false;
    else if (isPartner && dex !== showDetail.last) viewShiny = !!s.partnerShiny;
    showDetail.last = dex;
    const usingThis = isPartner && (!hasSh || !!s.partnerShiny === viewShiny);
    const L = (es, en, zh) => G.I18n?.lang === 'zh' ? zh : G.I18n?.lang === 'en' ? en : es;

    const box = $('dex-detail');
    box.innerHTML = `
      <canvas id="dex-big" class="stage" width="220" height="190"></canvas>
      ${hasSh ? `<div class="seg">
          <button class="${viewShiny ? '' : 'on'}" data-v="0">Normal</button>
          <button class="${viewShiny ? 'on' : ''}" data-v="1">${G.Icons.html('shiny', 12)} Shiny</button></div>` : ''}
      <div class="center">
        <div style="color:var(--muted);font-size:13px">Nº ${String(p.dex).padStart(3, '0')} · ${GEN_NAMES[p.gen - 1]}</div>
        <h3>${reveal ? p.name : '???'}</h3>
        <div style="color:${G.Gacha.RARITY_COLOR[p.rarity]}">${G.UI.stars(p.rarity, 24)} ${G.Gacha.RARITY_NAME[p.rarity]}</div>
        <div style="margin:6px 0">${reveal ? G.UI.typeChips(p.types) : ''}</div>
        <div class="note" style="margin:6px 0">${own ? L('Poseído permanentemente', 'Owned permanently', '已永久拥有') : inv > 0 ? L('Invitaciones: ', 'Invitations: ', '持有邀请函：') + inv : L('Sin registrar', 'Unregistered', '未拥有')}</div>
      </div>
      ${canUse ? `
        <p style="font-size:14px;margin:8px 0">Empieza con <b class="gold">${G.T(G.Moves.BY_ID[G.startMoveOf(dex)].name)}</b></p>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
          <button id="dex-expand" class="btn" style="width:100%">${L('Ver detalles completos', 'Expand Details', '展开详细信息')}</button>
          ${usingThis
            ? '<button class="btn grow" disabled style="width:100%">Es tu compañero</button>'
            : `<button id="dex-pick" class="btn gold" data-sfx="confirm" style="width:100%">Elegir de compañero${viewShiny ? ' (shiny)' : ''}</button>`}
        </div>
      ` : `<p class="center" style="color:var(--muted)">${L('Consigue su invitación en el gacha o captúralo en combate.', 'Get an invitation from Gacha or capture it in battle.', '可在扭蛋获取邀请函，或在局内晕倒捕捉永久解锁。')}</p>
           <button id="dex-expand" class="btn" style="width:100%;margin-top:8px;">${L('Ver detalles completos', 'Expand Details', '展开详细信息')}</button>`}
    `;
    $('dex-big').style.setProperty('--stage-c', !canUse ? '#5b83d6' : viewShiny ? '#9ae6ff' : G.U.TYPE_COLOR[p.types[0]]);
    $('dex-big').classList.toggle('shiny', own && viewShiny);
    if (G.DifficultyUI && own) G.DifficultyUI.decorate($('dex-big'), dex);
    G.UI.sprite($('dex-big'), dex, { lively: canUse, spin: own, silhouette: !reveal, scale: 3, hero: true, shiny: own && viewShiny });
    box.querySelectorAll('.seg button').forEach(b => {
      b.onclick = () => { viewShiny = b.dataset.v === '1'; showDetail(dex); };
    });
    $('dex-expand')?.addEventListener('click', () => openExpandedDetail(dex));
    const pick = $('dex-pick');
    if (pick) pick.onclick = () => {
      s.partner = dex;
      s.partnerShiny = hasSh && viewShiny;
      G.DB.commit();
      G.UI.toast(p.name + (s.partnerShiny ? ' shiny' : '') + ' es ahora tu compañero');
      renderGrid(); showDetail(dex);
    };
  }

  // ---------------- mejoras ----------------

  let upgDex = null;

  function openUpgrades() {
    G.CardPacksUI.open();
  }

  function renderUpgrades(){G.CardPacksUI.refresh();}
  function preferences(box,dex){upgDex=dex;box.appendChild(bindPanel());const max=G.DB.upgradesOf(dex).ban||0;if(max)box.appendChild(banPicker(max));}

  // ---------------- atajos: hueco fijo para cada movimiento ----------------
  // save.pbind[dex] = [movimiento del hueco 1, del 2, del 3, del 4] (o null).
  function bindPanel() {
    const s = G.DB.save;
    s.pbind = s.pbind || {};
    const list = s.pbind[upgDex] || [null, null, null, null];
    const mon = G.DEX_BY[upgDex];
    const ids = G.Moves.poolFor(mon).concat([G.startMoveOf(upgDex)]).filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => G.Moves.BY_ID[a].name.localeCompare(G.Moves.BY_ID[b].name, 'es'));
    const el = document.createElement('div');
    el.className = 'panel bind-panel';
    el.innerHTML = `<b>Atajos de movimientos</b>
      <p class="sub" style="margin:2px 0 8px">Elige qué movimiento va siempre en cada hueco (teclas 1-4 o los iconos de abajo), para la memoria muscular. Si aún no tienes tantos movimientos, va al hueco más cercano.</p>
      <div class="bind-slots">${[0, 1, 2, 3].map(i => `<label class="bind-slot"><span>${i + 1}</span>
        <select class="field" data-slot="${i}"><option value="">Libre</option>${ids.map(id =>
          `<option value="${id}" ${list[i] === id ? 'selected' : ''}>${G.Moves.BY_ID[id].name}</option>`).join('')}</select></label>`).join('')}</div>`;
    el.querySelectorAll('select[data-slot]').forEach(sel => {
      sel.onchange = () => {
        const l = (s.pbind[upgDex] || [null, null, null, null]).slice(0, 4);
        while (l.length < 4) l.push(null);
        const i = +sel.dataset.slot, id = sel.value || null;
        // Un movimiento sólo puede estar en un hueco.
        for (let j = 0; j < 4; j++) if (id && l[j] === id) l[j] = null;
        l[i] = id;
        s.pbind[upgDex] = l;
        G.DB.commit();
        G.Audio.sfx('select');
        renderUpgrades();
      };
    });
    return el;
  }

  // ---------------- veto: movimientos bloqueados ----------------
  // Lista por Pokémon en save.pban[dex]; con N niveles de Veto, N movimientos.
  let banOpen = false;
  function banList() {
    const s = G.DB.save;
    s.pban = s.pban || {};
    return s.pban[upgDex] || (s.pban[upgDex] = []);
  }
  function banPicker(max) {
    const mon = G.DEX_BY[upgDex];
    const start = G.startMoveOf(upgDex);
    const ids = G.Moves.poolFor(mon).filter(id => id !== start)
      .sort((a, b) => G.Moves.BY_ID[a].name.localeCompare(G.Moves.BY_ID[b].name, 'es'));
    const list = banList();
    const el = document.createElement('div');
    el.className = 'panel ban-picker';
    el.innerHTML = `<p class="sub" style="margin:0 0 8px">Toca los movimientos que no quieres que te salgan en las cartas (${list.length}/${max}). El movimiento de inicio no se puede vetar.</p>
      <div class="ban-moves">${ids.map(id => { const d = G.Moves.BY_ID[id]; const on = list.includes(id);
        return `<button class="chip ${on ? 'on ban' : ''}" data-id="${id}">${G.Icons.html('move:' + id, 16)} ${d.name}${on ? ' ' + G.Icons.html('ban', 14) : ''}</button>`; }).join('')}</div>`;
    el.querySelectorAll('[data-id]').forEach(b => {
      b.onclick = () => {
        const l = banList(), id = b.dataset.id, i = l.indexOf(id);
        if (i >= 0) l.splice(i, 1);
        else if (l.length >= max) { G.UI.toast('Ya tienes ' + max + ' vetados: quita uno primero'); return; }
        else l.push(id);
        G.DB.commit();
        G.Audio.sfx('select');
        renderUpgrades();
      };
    });
    return el;
  }

  return { init, open, GEN_NAMES,preferences };
})();
