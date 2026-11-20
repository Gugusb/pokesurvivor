/* Schedule-driven solo expedition. Arknights Tactical × Pokémon Vibrant UI. */
G.Expedition = (() => {
  const R = G.ExpeditionRules;
  let run = null, draft = null, offer = [], note = '', busy = false, lastHud = 0;
  const T = s => G.T(s), L = (es, en, zh) => G.I18n.lang === 'zh' ? zh : G.I18n.lang === 'en' ? en : es;
  const $ = id => document.getElementById(id);
  const node = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  const eventName = k => ({
    battle: L('常规作战', 'Combat', '常规作战'),
    elite: L('精英遭遇', 'Elite Encounter', '精英遭遇'),
    shop: L('物资补给', 'Supply Depot', '物资补给'),
    rest: L('战术休整', 'Rest Stop', '战术休整'),
    boss: L('领主决战', 'Boss Confrontation', '领主决战'),
    start: L('出征起点', 'Origin', '出征起点')
  })[k];

  const eventIcon = k => ({
    battle: '⚔',
    elite: '✦',
    shop: '▣',
    rest: '❧',
    boss: '♛',
    start: '⚑'
  })[k];

  const genNames = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'];
  const summary = () => run ? R.progress({ day: run.day, arceus: run.arceus, cashout: run.cashout }) : null;

  function header(title, sub, tacticalCode = 'EXPEDITION // TACTICAL') {
    const box = $('journey-content');
    box.replaceChildren();
    const head = node('header', 'journey-head');
    head.append(
      node('small', 'journey-eyebrow', tacticalCode),
      node('h2', '', title),
      node('p', '', sub)
    );
    box.append(head);
    return box;
  }

  function button(text, fn, cls = 'btn') {
    const b = node('button', cls, text);
    b.type = 'button';
    b.onclick = fn;
    return b;
  }

  function portrait(p, size = 80) {
    return G.UI.spriteCanvas(p.spriteDex || p.dex, size, size, {
      scale: 2.2,
      shiny: !!p.shiny,
      hero: true,
      lively: true
    });
  }

  /* --------------------------------------------------------------------------
     1. Setup Screen: Captain Briefing & Sector Generation
     -------------------------------------------------------------------------- */
  function setup() {
    draft = { dex: G.DB.save.partner, gens: null };

    const render = () => {
      const mon = G.DEX_BY[draft.dex];
      const box = header(
        L('选择小队队长', 'Designate Squad Captain', '选择小队队长'),
        L('规划路线、接入补给、邀请伙伴，在第60天直面阿尔宙斯。', 'Chart your route, gather allies, and confront Arceus on Day 60.', '规划路线、接入补给、邀请伙伴，在第60天直面阿尔宙斯。'),
        'PRTS // SQUAD EXPEDITION PROTOCOL'
      );

      const surface = node('div', 'journey-setup-surface');

      // Left Column: Captain Hologram & Identity Card
      const captainCard = node('div', 'journey-captain-card');
      const stage = node('div', 'journey-captain-stage');
      stage.append(portrait(mon, 136));
      captainCard.append(stage);

      const name = node('h3', 'journey-captain-name', T(mon.name));
      const meta = node('div', 'journey-captain-meta');
      for (const t of mon.types) {
        const typeChip = node('span', '', T(G.U.TYPE_NAME[t] || t));
        typeChip.style.borderColor = G.U.TYPE_COLOR[t] || '#67b9ec';
        typeChip.style.color = '#fff';
        typeChip.style.backgroundColor = (G.U.TYPE_COLOR[t] || '#67b9ec') + '33';
        meta.append(typeChip);
      }
      meta.append(node('span', '', '★'.repeat(mon.rarity || 1)));
      captainCard.append(name, meta);

      // Captain fixed skill & talent preview
      const fixedSkillId = G.FIXED_SKILLS?.[mon.dex] || G.startMoveOf(mon.dex);
      const moveDef = G.Moves?.BY_ID?.[fixedSkillId];
      if (moveDef) {
        const moveCard = node('div', 'journey-tags');
        const moveChip = node('span', '', L('天生招式: ', 'Innate Move: ', '初始招式: ') + T(moveDef.name));
        moveChip.style.borderColor = 'var(--pk-vibrant-gold)';
        moveChip.style.color = 'var(--pk-vibrant-gold)';
        moveCard.append(moveChip);
        captainCard.append(moveCard);
      }

      // Captain Dropdown Selector
      const selectWrap = node('div', 'journey-select-wrapper');
      const label = node('label', 'journey-select', L('调派其他伙伴担任队长', 'Assign another Pokémon as Captain', '调派其他伙伴担任队长'));
      const select = node('select');
      select.id = 'journey-captain';

      for (const p of G.DEX.filter(p => G.DB.owns(p.dex) && G.SPRITE_META[p.dex])) {
        const opt = node('option', '', `#${String(p.dex).padStart(3, '0')} ${T(p.name)}`);
        opt.value = p.dex;
        opt.selected = p.dex === draft.dex;
        select.append(opt);
      }
      select.onchange = () => {
        draft.dex = +select.value;
        draft.gens = null;
        render();
      };
      label.append(select);
      selectWrap.append(label);
      captainCard.append(selectWrap);

      surface.append(captainCard);

      // Right Column: Operation Briefing & Sectors
      const dispatchPanel = node('div', 'journey-dispatch-panel');
      const briefingTitle = node('div', 'journey-briefing-title', L('远征行动任务书', 'Expedition Mission Briefing', '远征行动任务书'));
      const briefingText = node('p', 'journey-briefing-text',
        L('小队将以长条队列蛇形前进，队员将沿队长走过的轨迹自主行动并释放技能。每波次结束后可接入战术物资补给站，调整队伍出战顺位，激活属性与职业羁绊。',
          'Your squad advances in snake formation. Allies trail the captain’s path, unleashing their moves automatically. Access supply depots between waves to recruit allies and trigger bonds.',
          '小队将以长条队列蛇形前进，队员将沿队长走过的轨迹自主行动并释放技能。每波次结束后可接入战术物资补给站，调整队伍出战顺位，激活属性与职业羁绊。')
      );

      const sectorTitle = node('div', 'journey-briefing-title', L('航线遭遇世代区域', 'Navigation Encounter Sectors', '航线遭遇世代区域'));
      dispatchPanel.append(briefingTitle, briefingText, sectorTitle);

      if (draft.gens) {
        const genContainer = node('div', 'journey-gens');
        for (const g of draft.gens) {
          const chip = node('div', 'journey-gen-chip');
          chip.append(node('span', '', `SECTOR 0${g} // ` + T(genNames[g - 1])));
          genContainer.append(chip);
        }
        dispatchPanel.append(genContainer);
        dispatchPanel.append(node('p', 'journey-briefing-text',
          L('本次远征已成功锚定以上3个世代。所有野生遭遇、精英强敌与补给站招募将优先从这些地区生成。',
            'Sectors locked. All field encounters, elite foes, and recruit offers will draw from these regions.',
            '本次远征已成功锚定以上3个世代。所有野生遭遇、精英强敌与补给站招募将优先从这些地区生成。')
        ));
      } else {
        const genNotice = node('p', 'journey-notice',
          L('尚未生成世代航线。点击下方「生成本局航线」，系统将根据队长特性为您匹配最相称的3个世代。',
            'Sectors not yet initialized. Click "Prepare Route" below to generate 3 compatible regions.',
            '尚未生成世代航线。点击下方「生成本局航线」，系统将根据队长特性为您匹配最相称的3个世代。')
        );
        dispatchPanel.append(genNotice);
      }

      surface.append(dispatchPanel);
      box.append(surface);

      // Bottom Actions
      const actions = node('div', 'journey-actions');
      actions.append(button(L('返回主界面', 'Return', '返回主界面'), () => {
        draft = null;
        G.MenuUI.open();
      }, 'btn ghost'));

      if (!draft.gens) {
        actions.append(button(L('生成本局航线', 'Prepare Route', '生成本局航线'), () => {
          draft.gens = R.generations(mon);
          G.Audio.sfx('confirm');
          render();
        }, 'btn gold'));
      } else {
        actions.append(button(L('立即出征！', 'Operation Start!', '立即出征！'), async () => {
          if (busy) return;
          busy = true;
          try {
            G.DB.save.partner = draft.dex;
            G.DB.commit();
            await G.Game.startRun(null, true);
          } finally {
            busy = false;
          }
        }, 'btn gold'));
      }

      box.append(actions);
      G.UI.show('scr-journey');
    };

    render();
  }

  function begin(captain) {
    const gens = draft?.gens || R.generations(captain.mon);
    run = {
      captain,
      gens,
      pool: R.pool(gens),
      day: 0,
      row: 0,
      col: 3,
      cycle: 1,
      map: R.matrix(1),
      gold: 80,
      phase: 'route',
      arceus: false,
      cashout: false,
      history: [],
      kills: 0
    };
    G.Squad.begin(captain);
    draft = null;
    note = '';
    showRoute();
  }

  function showRoute() {
    if (!run) return;
    run.phase = 'route';
    G.Game.expeditionPause();
    renderRoute();
  }

  /* --------------------------------------------------------------------------
     2. Route Screen: Tactical Schedule Map
     -------------------------------------------------------------------------- */
  function renderRoute() {
    const box = header(
      L('作战日程规划', 'Operation Route Schedule', '作战日程规划'),
      L('选择下一行相邻的事件节点，踏上新一天的未知冒险。', 'Select an adjacent event node in the next row to advance.', '选择下一行相邻的事件节点，踏上新一天的未知冒险。'),
      `STAGE // CYCLE 0${run.cycle} - DAY ${String(run.day).padStart(2, '0')}`
    );

    // Tactical Meta Topbar
    const info = node('div', 'journey-meta');
    info.append(
      node('b', 'journey-cycle-badge', `CYCLE 0${run.cycle}`),
      node('span', 'journey-day-badge', `DAY ${run.day} / 60`),
      node('b', 'journey-gold', `🪙 ${run.gold} ` + L('局内金币', 'Gold', '局内金币')),
      node('span', '', run.gens.map(g => T(genNames[g - 1])).join(' · '))
    );
    info.append(squadShortcut());
    box.append(info);

    if (note) box.append(node('p', 'journey-notice', note));

    const layout = node('div', 'journey-layout journey-layout-wide');
    const route = node('div', 'journey-route');
    const grid = node('div', 'journey-grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', L('日程节点', 'Schedule Grid', '日程节点'));

    for (const row of run.map) {
      for (const cell of row) {
        const allowed = R.reachable(run.row, run.col, cell.row, cell.col);
        const current = cell.row === run.row && cell.col === run.col;
        const visited = run.history.some(h => h.day === cell.day && h.col === cell.col);
        const title = cell.day === 60 && cell.kind === 'boss' ? 'Arceus' : eventName(cell.kind);

        const b = button('', () => choose(cell.row, cell.col),
          'journey-event ' + cell.kind + (allowed ? ' reachable' : '') + (current ? ' current' : '') + (visited ? ' visited' : '')
        );
        b.dataset.row = cell.row;
        b.dataset.col = cell.col;
        b.dataset.event = cell.kind;
        b.disabled = !allowed;

        b.append(
          node('small', '', cell.row ? `D${cell.day}` : 'START'),
          node('b', '', eventIcon(cell.kind)),
          node('span', '', T(title))
        );
        b.setAttribute('aria-label', L('第', 'Day ', '第') + cell.day + ' · ' + T(title));
        grid.append(b);
      }
    }

    route.append(grid);
    layout.append(route);
    box.append(layout);

    const actions = node('div', 'journey-actions');
    actions.append(button(L('结束远征并结算', 'End Expedition & Settle', '结束远征并结算'), () => {
      if (confirm(L('确定结束本次远征并结算已获奖励吗？', 'End this expedition and collect earned rewards?', '确定结束本次远征并结算已获奖励吗？'))) {
        G.Game.expeditionEnd();
      }
    }, 'btn ghost'));

    box.append(actions);
    G.UI.show('scr-journey');

    requestAnimationFrame(() => {
      grid.querySelector('.reachable')?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  }

  const skillNames = {
    projectile: 'Proyectil',
    melee: 'Cuerpo a cuerpo',
    beam: 'Rayo',
    orbit: 'Órbita',
    chain: 'Cadena',
    dash: 'Embestida',
    meteor: 'Meteoro',
    buff: 'Atributos',
    boomerang: 'Bumerán',
    nova: 'Onda',
    aura: 'Aura',
    mine: 'Mina',
    turret: 'Torreta',
    trail: 'Rastro',
    cone: 'Abanico'
  };

  function tags(p) {
    const t = G.Squad.tags(p), wrap = node('div', 'journey-tags');
    const groups = [
      [L('属性联结', 'Type Link', '属性联结'), t.types.map(x => T(G.U.TYPE_NAME[x] || x))],
      [L('种族天赋', 'Species Talent', '种族天赋'), t.eggs.map(x => G.ExpeditionTerms.egg(x))],
      [L('职业羁绊', 'Class Bond', '职业羁绊'), [G.ExpeditionTerms.skill(skillNames[t.skill])]]
    ];
    for (const [label, names] of groups) {
      const s = node('span', '', names.join(' / '));
      s.title = label;
      wrap.append(s);
    }
    return wrap;
  }

  function talentText(p) {
    const t = G.Squad.talent(p);
    const effect = {
      atk: L('双攻', 'attacks', '双攻'),
      hp: L('基础生命', 'base HP', '基础生命'),
      stamina: L('耐力', 'stamina', '耐力'),
      agility: L('敏捷', 'agility', '敏捷'),
      regen: L('基础生命/秒', 'base HP/s', '基础生命/秒')
    }[t.key];
    return G.ExpeditionTerms.talent(t.name) + ' · ' + L('全队', 'Whole squad', '全队') + ' ' + effect + ' +' + Number((t.value * 100).toFixed(1)) + '%';
  }

  function squadShortcut() {
    return button(
      `☵ ` + L('小队编队', 'View Squad', '小队编队') + ' [' + (G.Squad.deployed().length + 1) + '/' + G.Squad.capacity + ']',
      () => G.Game.toggleSquad(),
      'btn small journey-squad-link'
    );
  }

  function refreshScreen() {
    if (run?.phase === 'shop') renderShop();
    else if (run?.phase === 'route') renderRoute();
    else if (run?.phase === 'loot') renderLoot();
  }

  function choose(row, col) {
    if (!run || run.phase !== 'route' || !R.reachable(run.row, run.col, row, col)) return false;
    const cell = run.map[row][col];
    run.row = row;
    run.col = col;
    run.day = cell.day;
    run.history.push({ day: run.day, col, kind: cell.kind });
    note = '';

    if (cell.kind === 'shop') {
      run.phase = 'shop';
      rollShop();
      renderShop();
    } else if (cell.kind === 'rest') {
      run.gold += 15 + run.cycle * 5;
      run.captain.heal(run.captain.maxHp * 0.3);
      finishStage(L('队伍已充分休整，状态充沛！', 'The squad has rested and restored vitality.', '队伍已充分休整，状态充沛！'));
    } else {
      startBattle(cell.kind);
    }
    return true;
  }

  /* --------------------------------------------------------------------------
     3. Shop Screen: Tactical Supply Depot
     -------------------------------------------------------------------------- */
  function rollShop() {
    offer = [];
    const lv = G.Squad.shopLevel;
    const count = 3 + Math.floor((lv - 1) / 2);
    for (let i = 0; i < count; i++) {
      if (i === count - 1 || (i > 0 && Math.random() < 0.25)) {
        const items = G.Items.LIST.filter(it => G.Items.permitted(it) && (!it.boss || lv >= 4));
        const it = G.U.pick(items);
        offer.push({ kind: 'item', id: it.id, cost: it.boss ? 100 : 35 + lv * 4 });
      } else {
        let mon = R.shopMon(run.pool, lv);
        const rank = R.shopRank(lv);
        for (let n = 1; n < rank; n++) {
          const choices = R.next(mon.dex);
          if (choices.length) mon = G.DEX_BY[G.U.pick(choices)];
        }
        // Fixed skill assignment integration
        const preferredMove = G.FIXED_SKILLS?.[mon.dex] || G.U.pick(G.Moves.poolFor(mon));
        offer.push({
          kind: 'mon',
          dex: mon.dex,
          rank,
          moveId: preferredMove,
          cost: Math.round(R.monCost(mon) * [1, 1.8, 3][rank - 1])
        });
      }
    }
  }

  function buy(index) {
    if (run?.phase !== 'shop') return false;
    const o = offer[index];
    if (!o || o.sold || run.gold < o.cost) return false;

    if (o.kind === 'mon') {
      if (!G.Squad.recruit(o.dex, o.moveId, o.rank || 1)) {
        G.UI.toast(L('候补仓库已满，请先放生伙伴以腾出位置。', 'Reserves are full. Release a companion first.', '候补仓库已满，请先放生伙伴以腾出位置。'));
        return false;
      }
    } else if (!G.Items.gain(run.captain, o.id)) {
      return false;
    }

    run.gold -= o.cost;
    o.sold = true;
    G.Audio.sfx('confirm');
    renderShop();
    return true;
  }

  function upgrade() {
    const cost = R.upgradeCost(G.Squad.shopLevel);
    if (run?.phase !== 'shop' || run.gold < cost || G.Squad.shopLevel >= R.MAX_SHOP) return false;
    run.gold -= cost;
    G.Squad.upgrade();
    G.Audio.sfx('confirm');
    rollShop();
    renderShop();
    return true;
  }

  function renderShop() {
    const lv = G.Squad.shopLevel;
    const box = header(
      L('战术物资补给站', 'Tactical Supply Depot', '战术物资补给站'),
      L('招募强力队友、购置战术道具、升级编队容量上限。', 'Recruit companions, procure tactical items, and expand squad capacity.', '招募强力队友、购置战术道具、升级编队容量上限。'),
      `DEPOT // LEVEL ${lv} - ACCESS GRANTED`
    );

    const info = node('div', 'journey-meta');
    info.append(
      node('b', 'journey-gold', `🪙 ${run.gold} ` + L('局内金币', 'Gold', '局内金币')),
      node('b', '', `DEPOT LV.${lv} / ${R.MAX_SHOP}`),
      node('span', '', L('编队出战上限: ', 'Squad Limit: ', '编队出战上限: ') + G.Squad.capacity)
    );
    info.append(squadShortcut());
    box.append(info);

    const layout = node('div', 'journey-layout journey-layout-wide');
    const goods = node('div', 'journey-goods');

    offer.forEach((o, i) => {
      const card = node('article', 'journey-product ' + (o.kind === 'mon' ? 'iv-' + R.border(G.DB.save, o.dex) : 'item'));
      card.dataset.product = i;
      const content = node('div', 'journey-product-art');

      if (o.kind === 'mon') {
        const mon = G.DEX_BY[o.dex];
        const rank = o.rank || 1;
        const move = G.Moves.instance(o.moveId, rank === 1 ? 2 : 5);
        if (rank === 3) G.Moves.evolve(move);

        content.append(portrait(mon, 96));
        card.append(
          content,
          node('small', '', L('干员招募', 'Recruit', '干员招募') + ' · ' + '★'.repeat(rank)),
          node('h3', '', T(mon.name))
        );

        const dummy = { mon, dex: mon.dex, moves: [move] };
        card.append(
          tags(dummy),
          node('p', 'journey-shop-move', T(move.name) + ' · ' + (rank === 3 ? L('超武', 'Ultimate', '超武') : 'Lv.' + move.lvl))
        );
      } else {
        content.innerHTML = G.Icons.html(G.Items.icon(o.id), 56);
        card.append(
          content,
          node('small', '', L('战略物资', 'Tactical Item', '战略物资')),
          node('h3', '', T(G.Items.BY[o.id].name)),
          node('p', '', T(G.Items.BY[o.id].desc))
        );
      }

      const b = button(
        o.sold ? L('已调派／已购入', 'Recruited', '已调派／已购入') : `${o.cost} ` + L('金币', 'Gold', '金币'),
        () => buy(i),
        'btn ' + (o.sold ? 'ghost' : 'gold')
      );
      b.dataset.buy = i;
      b.disabled = o.sold || run.gold < o.cost;
      card.append(b);
      goods.append(card);
    });

    const controls = node('div', 'journey-shop-controls');
    const up = button(
      lv >= R.MAX_SHOP ? L('补给站已达顶级', 'Depot Max Level', '补给站已达顶级') : L('升级补给站', 'Upgrade Depot', '升级补给站') + ` (${R.upgradeCost(lv)} G)`,
      upgrade,
      'btn'
    );
    up.id = 'journey-upgrade';
    up.disabled = lv >= R.MAX_SHOP || run.gold < R.upgradeCost(lv);

    const refresh = button(L('刷新物资', 'Refresh Offers', '刷新物资') + ' (10 G)', () => {
      if (run.gold < 10 || run.phase !== 'shop') return;
      run.gold -= 10;
      rollShop();
      renderShop();
    }, 'btn');
    refresh.disabled = run.gold < 10;

    controls.append(
      up,
      refresh,
      button(L('离开补给站并推进', 'Leave Depot', '离开补给站并推进'), () => finishStage(), 'btn gold')
    );

    goods.append(
      controls,
      node('p', 'note', L('边框品质标识：白(未拥有) → 蓝 → 紫 → 橙 → 红(满个体值)', 'Border IV Quality: White (unregistered) → Blue → Purple → Orange → Red (Max IV)', '边框品质标识：白(未拥有) → 蓝 → 紫 → 橙 → 红(满个体值)'))
    );

    layout.append(goods);
    box.append(layout);
    G.UI.show('scr-journey');
  }

  /* --------------------------------------------------------------------------
     4. Combat Control & Loot Resolution
     -------------------------------------------------------------------------- */
  function startBattle(kind) {
    run.phase = 'combat';
    run.kind = kind;
    run.elapsed = 0;
    run.spawned = 0;
    run.acc = 0;
    run.kills = 0;
    run.wave = R.wave(run.day);
    run.bossDead = false;
    run.waveType = Math.random() < 0.5 ? G.U.pick([...new Set(run.pool.flatMap(p => p.types))]) : null;
    run.companion = null;
    run.companionResolved = false;
    run.loot = {};
    run.goldStart = run.gold;
    run.extraStart = JSON.parse(JSON.stringify(G.Game.loot || {}));

    G.EnemyMgr.clear();
    G.Projectiles.clear();
    G.Combat.clearFields();
    G.Pickups.clear();
    G.Hazards.clear();
    G.Path.clear();

    G.World.setBiome(Math.floor((run.day - 1) / 5));
    G.Squad.recover();
    G.TypeBonds?.beginStage();

    for (const p of G.Squad.actors()) G.Abilities.resetStage(p, run.day);

    if (kind === 'boss') {
      spawn(true);
      run.spawned = 1;
    }

    G.UI.hideAll();
    G.Touch.reset();
    G.Game.expeditionResume();
    G.Audio.sfx('confirm');
  }

  function spawn(boss = false) {
    const cap = run.captain;
    const wave = run.wave;
    const tier = Math.min(6, Math.ceil(((run.day - 1) % 20 + 1) / 4));
    const candidates = run.pool.filter(p => boss ? p.bst >= 480 : p.rarity <= Math.min(4, tier) && p.bst < 700);
    const same = Math.random() < 0.85;
    const typed = !boss && run.waveType ? candidates.filter(p => p.types.includes(run.waveType) === same) : null;
    const mon = boss && run.day === 60 ? G.DEX_BY[493] : G.U.pick(typed?.length ? typed : candidates.length ? candidates : run.pool);

    let x = cap.x, y = cap.y;
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.max(220, G.Camera.outerRadius() + 20);
      x = cap.x + Math.cos(a) * d;
      y = cap.y + Math.sin(a) * d;
      if (G.World.isFree(x, y, 20)) break;
    }

    const behavior = boss ? 'chase' : G.Enemies.behaviorOf(mon);
    const def = {
      dex: mon.dex,
      name: mon.name,
      hp: boss ? 350 + run.day * 24 : 12 + (mon.baseStats?.hp || 60) * 0.2,
      spd: boss ? 55 : 48 + (mon.baseStats?.spe || 60) * 0.15,
      dmg: boss ? 14 : 4 + Math.min(8, mon.rarity),
      xp: boss ? 80 : 10 + Math.floor(run.day / 2),
      behavior,
      shotDmg: boss ? 14 : 5,
      shotCd: 3.5,
      range: 200
    };

    const e = new G.Enemy(def, x, y, {
      hp: wave.hp * (boss ? 1.6 : 1),
      spd: wave.speed,
      dmg: wave.dmg
    }, boss);

    e.expedition = true;
    e.expeditionArceus = boss && run.day === 60;

    if (run.kind === 'elite' && !boss) e.makeElite();
    if (!boss && Math.random() < G.Difficulty.eliteChance()) e.makeElite();
    if (G.Sprites.hasShiny(mon.dex) && Math.random() < G.Spawner.SHINY_RATE) e.makeShiny();

    G.EnemyMgr.add(e);
    G.Sprites.preload([mon.dex]);
    return e;
  }

  function tick(dt) {
    if (!run || run.phase !== 'combat' || run.captain.dead) return;
    run.elapsed += dt;

    if (run.kind !== 'boss') {
      run.acc += dt * (run.wave.count / Math.max(8, run.wave.duration * 0.6));
      while (run.acc >= 1 && run.spawned < run.wave.count && G.EnemyMgr.count < 64) {
        run.acc--;
        spawn();
        run.spawned++;
      }
      const alive = G.EnemyMgr.all().filter(e => !e.dead).length;
      const cleared = run.spawned >= run.wave.count && alive === 0 && G.EnemyMgr.count === 0;
      if (cleared || run.elapsed >= run.wave.duration) finishBattle(cleared);
    } else if (run.bossDead && !G.EnemyMgr.all().some(e => e.boss)) {
      finishBattle(true);
    }
  }

  function killed(e) {
    if (!run || run.phase !== 'combat' || !e.expedition) return;
    run.kills++;
    run.gold += e.boss ? 25 : e.elite ? 5 : 1;
    if (e.boss) run.bossDead = true;

    // One run-only companion per battle, received exclusively on the loot screen
    if (!e.boss && !run.companion && Math.random() < 0.12) {
      run.companion = e.dex;
    }
  }

  function finishBattle(cleared) {
    if (run.phase !== 'combat') return;
    if (run.day === 60 && run.kind === 'boss' && cleared) {
      run.arceus = true;
      run.cashout = true;
    }
    run.phase = 'rewards';
    const amount = Math.round(run.wave.coins * (run.kind === 'elite' ? 1.8 : run.kind === 'boss' ? 3 : 1) * (cleared ? 1.5 : 1));
    run.gold += amount;

    G.EnemyMgr.update(0, G.Squad.actors());
    note = (cleared ? L('全歼强敌！战果斐然！', 'All foes defeated!', '全歼强敌！战果斐然！') : L('成功度过波次！', 'Stage survived!', '成功度过波次！')) + ` +${amount} ` + L('金币', 'Gold', '金币');
    G.EnemyMgr.clear();
    G.Projectiles.clear();
    G.Combat.clearFields();
    G.Hazards.clear();

    if (run.kind === 'elite') G.Pickups.drop('item', run.captain.x, run.captain.y, G.Items.roll());
  }

  function recordPickup(p) {
    if (!run || !['combat', 'rewards'].includes(run.phase)) return;
    const k = p.kind;
    const key = k === 'item' ? 'item:' + p.value : k;
    if (['xp', 'xpBig', 'coin', 'treasure'].includes(k)) run.loot[key] = (run.loot[key] || 0) + Number(p.value || 0);
    else if (['ticket', 'ticket10', 'item', 'bossChest'].includes(k)) run.loot[key] = (run.loot[key] || 0) + 1;
  }

  function showLoot(levels = 0) {
    if (run?.phase !== 'rewards') return;
    run.levels = levels;
    run.phase = 'loot';
    G.Game.expeditionPause();
    renderLoot();
  }

  function claimCompanion() {
    if (run?.phase !== 'loot' || !run.companion || run.companionResolved) return false;
    const preferredMove = G.FIXED_SKILLS?.[run.companion] || G.U.pick(G.Moves.poolFor(G.DEX_BY[run.companion]));
    if (!G.Squad.recruit(run.companion, preferredMove)) {
      G.UI.toast(L('候补仓库已满，请先放生伙伴以腾出空间。', 'Release a companion to make room.', '候补仓库已满，请先放生伙伴以腾出空间。'));
      return false;
    }
    run.companionResolved = true;
    G.Audio.sfx('confirm');
    renderLoot();
    return true;
  }

  function renderLoot() {
    const box = header(
      L('战斗战果报告', 'Mission Debriefing & Loot', '战斗战果报告'),
      L('整理战利品，为出战伙伴挑选成长强化方向。', 'Review today’s spoils before choosing skill upgrades.', '整理战利品，为出战伙伴挑选成长强化方向。'),
      `DEBRIEF // DAY ${String(run.day).padStart(2, '0')}`
    );

    box.append(node('p', 'journey-notice', note));
    const rows = node('div', 'journey-loot-grid');

    const add = (name, value) => {
      if (!value) return;
      const card = node('div', 'journey-loot-value');
      card.append(node('small', '', name), node('b', '', String(value)));
      rows.append(card);
    };

    add(L('局内金币', 'Expedition Gold', '局内金币'), run.gold - run.goldStart);
    add(L('经验值', 'Experience', '经验值'), (run.loot.xp || 0) + (run.loot.xpBig || 0));
    add(L('宝可梦币', 'Pokécoins', '宝可梦币'), (run.loot.coin || 0) + (run.loot.treasure || 0));
    add(L('抽奖券', 'Tickets', '抽奖券'), (run.loot.ticket || 0) + (run.loot.ticket10 || 0) * 10);
    add(L('Boss战利箱', 'Boss Chests', 'Boss战利箱'), run.loot.bossChest);

    for (const [key, n] of Object.entries(run.loot)) {
      if (key.startsWith('item:')) add(T(G.Items.BY[key.slice(5)]?.name || key.slice(5)), n);
    }

    const extras = G.Game.loot || {};
    const before = run.extraStart || {};
    add(T('Gemas de habilidad'), (extras.gems || 0) - (before.gems || 0));

    for (const kind of ['stones', 'duplicateStones', 'packs']) {
      for (const [id, n] of Object.entries(extras[kind] || {})) {
        const count = n - (before[kind]?.[id] || 0);
        if (count > 0) add(kind === 'packs' ? G.CardPacks.local(G.CardPacks.packBy[id]?.name || id) : T(G.Mega.BY[id]?.name || id), count);
      }
    }

    box.append(rows);

    if (run.companion) {
      const mon = G.DEX_BY[run.companion];
      const card = node('section', 'journey-loot-companion');
      card.append(
        portrait(mon, 100),
        node('h3', '', T(mon.name)),
        node('p', '', run.companionResolved ? L('已加入同行小队！', 'Companion recruited!', '已加入同行小队！') : L('一位野生伙伴被队伍吸引，请求加入同行！', 'A wild Pokémon wants to join your squad.', '一位野生伙伴被队伍吸引，请求加入同行！')),
        squadShortcut()
      );

      if (!run.companionResolved) {
        const actions = node('div', 'journey-actions');
        const claim = button(L('批准加入', 'Recruit Companion', '批准加入'), claimCompanion, 'btn gold');
        claim.id = 'journey-claim';
        claim.disabled = !G.Squad.canRecruit(run.companion);

        actions.append(claim, button(L('暂缓放生', 'Let Go', '暂缓放生'), () => {
          if (confirm(L('确定放生这位伙伴吗？本次远征中将无法召回。', 'Let this companion go?', '确定放生这位伙伴吗？本次远征中将无法召回。'))) {
            run.companionResolved = true;
            renderLoot();
          }
        }, 'btn ghost'));

        card.append(actions);
        if (claim.disabled) {
          card.append(node('p', 'journey-full', L('候补仓库已满。请先打开编队放生伙伴后再领取。', 'Reserves full. Release a companion first.', '候补仓库已满。请先打开编队放生伙伴后再领取。')));
        }
      }
      box.append(card);
    }

    const actions = node('div', 'journey-actions');
    if (!run.companion) actions.append(squadShortcut());

    const next = button(
      run.levels ? L('挑选进阶强化', 'Choose Upgrades', '挑选进阶强化') + ` · ${run.levels}` : L('继续前进', 'Continue Route', '继续前进'),
      () => {
        if (run.phase !== 'loot' || (run.companion && !run.companionResolved)) return;
        run.phase = 'upgrades';
        G.UI.hideAll();
        G.Game.expeditionResume();
      },
      'btn gold'
    );
    next.id = 'journey-loot-next';
    next.disabled = !!run.companion && !run.companionResolved;
    actions.append(next);

    box.append(actions);
    G.UI.show('scr-journey');
  }

  function depart() {
    if (run?.phase !== 'upgrades') return;
    finishStage(note);
  }

  function finishStage(message = '') {
    if (!run) return;
    G.Game.scoreEvent();
    G.TypeBonds?.beginStage();
    G.Squad.recover();
    run.captain.heal(run.captain.maxHp * 0.15);
    note = message;

    if (run.day % 20 === 0 && run.day > 0) {
      run.cycle++;
      run.map = R.matrix(run.cycle);
      run.row = 0;
      run.history = [{ day: run.day, col: run.col }];
      note += ' ' + L('进入了全新周期！强敌的属性大幅提升了。', 'A new cycle begins: foes grow stronger.', '进入了全新周期！强敌的属性大幅提升了。');
    }

    if (run.day === 60 && run.cashout) {
      G.Game.expeditionVictory();
      return;
    }
    showRoute();
  }

  function continueAfterVictory() {
    if (!run) return;
    run.cashout = false;
    G.Server?.heartbeat?.().catch(() => {});
    showRoute();
  }

  function reset() {
    run = null;
    G.Squad.reset();
    const el = $('journey-status');
    if (el) el.hidden = true;
  }

  function hud() {
    const el = $('journey-status');
    if (!el) return;
    el.hidden = !run || G.Game.state !== 'playing';
    if (el.hidden || performance.now() - lastHud < 150) return;
    lastHud = performance.now();

    el.textContent = `CYCLE 0${R.cycleOf(run.day)} // ` +
      L('第', 'Day ', '第') + run.day + (G.I18n.lang === 'zh' ? ' 天' : '') +
      ` · 🪙 ${run.gold} G · ` +
      (run.kind === 'boss' ? L('决战领主！', 'Defeat Boss', '决战领主！') : Math.max(0, Math.ceil(run.wave.duration - run.elapsed)) + 's') +
      ' · ' + (G.Squad.deployed().filter(p => !p.dead).length + 1) + '/' + G.Squad.capacity;
  }

  return {
    skillLabel: kind => G.ExpeditionTerms.skill(skillNames[kind]),
    tags,
    talentText,
    refreshScreen,
    recordPickup,
    showLoot,
    claimCompanion,
    setup,
    begin,
    reset,
    choose,
    buy,
    upgrade,
    tick,
    killed,
    depart,
    continueAfterVictory,
    hud,
    summary,
    showRoute,
    get active() { return !!run; },
    get inCombat() { return run?.phase === 'combat'; },
    get phase() { return run?.phase; },
    get run() { return run; },
    get offers() { return offer; }
  };
})();
