/* ============ league-ui.js — 3D League Sanctuary Hub for PokéSurvivor-Next ============
 * Bridges the procedural 3D League Sanctuary diorama (outputs/pokemon-league.html?embed=1)
 * with Next-edition Expedition preparation and all native hub sub-UIs.
 */
G.LeagueUI = (() => {
  const $ = id => document.getElementById(id);
  const CHANNEL = 'pokesurvivor-league';
  const ROUTES = {
    'scr-menu': null,
    'scr-journey': 'expedition',
    'scr-dex': 'pokemon',
    'scr-upgrades': 'draw',
    'scr-gacha': 'draw',
    'scr-nursery': 'eggs',
    'scr-goals': 'trophy',
    'scr-achievements': 'trophy',
    'scr-friends': 'mail',
    'scr-league-mail': 'mail',
    'scr-lobby': 'expedition',
    'scr-rank': 'trophy',
    'scr-mod': 'tasks',
    'scr-offline': 'trophy',
    'scr-profile': 'pokemon',
    'scr-nick': 'mail',
    'scr-settings': 'settings',
    'scr-news': 'tasks',
    'scr-support': 'tasks',
    'scr-legal': 'settings'
  };

  const TEXT = {
    title: ['Sede de la Liga', 'League Sanctuary', '宝可梦联盟总部'],
    subTitle: ['Centro de mando de expedición', 'Expedition Command Hub', '小队远征集结地'],
    consoleKicker: ['CONSOLA DE MANDO', 'COMMAND CONSOLE', 'EXPEDITION COMMAND · 远征战术终端'],
    captainKicker: ['CAPITÁN TITULAR', 'LEAD CAPTAIN', 'ACTIVE CAPTAIN · 出战队长'],
    play: ['Comenzar expedición', 'Begin expedition', '开始远征'],
    playSub: ['60 días · Jefes, talentos y vínculos', '60 days · Bosses, talents & bonds', '60天赛程 · 羁绊构筑与首领挑战'],
    dex: ['Pokédex y capitán', 'Pokédex & captain', '宝可梦图鉴'],
    dexSub: ['Colección y habilidades de 5 partes', 'Collection & 5-part captain abilities', '图鉴收集 · 个体值与五段队长特性'],
    upgrades: ['Paquetes de cartas', 'Card packs', '游戏卡包'],
    upgradesSub: ['La Larga Marcha y suministros', 'Long March pack & supply pool', '长征卡包 · 道具池与永久起手特权'],
    gacha: ['Cápsulas Pokémon', 'Pokémon capsules', '宝可梦扭蛋'],
    gachaSub: ['9 regiones · Pokémon y shinies', '9 regions · Pokémon & shinies', '9大世代 · 宝可梦与异色伙伴抽取'],
    'ability-gacha': ['Cápsulas de habilidad', 'Ability capsules', '特性扭蛋'],
    'ability-gachaSub': ['Medallas familiares y Z manual', 'Family medals & manual Z unlock', '进化链特性勋章 · 解锁主动家族Z'],
    nursery: ['Guardería', 'Egg nursery', '联盟孵蛋屋'],
    nurserySub: ['Crianza y huevos con amigos', 'Breeding & co-op egg care', '亲本配对 · 好友共育与孵化加速'],
    goals: ['Misiones', 'Quests', '联盟任务'],
    goalsSub: ['Encargos diarios y progreso', 'Daily commissions & milestones', '远征委托 · 阶段目标与奖励领取'],
    achievements: ['Logros de la Liga', 'League achievements', '荣誉成就'],
    achievementsSub: ['Trofeos, medallas y títulos', 'Trophies, medals & titles', '荣耀陈列 · 勋章收集与训练家称号'],
    mail: ['Buzón', 'Mailbox', '联盟邮箱'],
    mailSub: ['Regalos e invitaciones', 'Friend gifts & nursery invites', '好友赠礼 · 孵蛋协助与联盟信件'],
    friends: ['Amigos', 'Friends', '同行好友'],
    friendsSub: ['Visitas, regalos y salas', 'Visits, gifts & co-op rooms', '好友名录 · 拜访孵蛋屋与互赠礼物'],
    rank: ['Clasificación', 'Rankings', '荣耀排行榜'],
    rankSub: ['Medallas y supervivencia 8★', 'Medal mastery & 8★ survival', '全勋章榜 · 八星生存与角色档案'],
    offline: ['Ingresos pasivos', 'Offline earnings', '挂机收益'],
    offlineSub: ['Recompensas acumuladas', 'Accumulated reserve coins', '园区巡逻 · 离线宝可梦币与抽奖券'],
    news: ['Novedades', 'Patch notes', '更新公告'],
    newsSub: ['Crónicas y notas del taller', 'Workshop updates & notes', '版本日志 · 最新玩法与大肥鱼碎碎念'],
    settings: ['Ajustes', 'Settings', '系统设置'],
    settingsSub: ['Sonido, gráficos, parque y cuenta', 'Audio, graphics, park & account', '音画触控 · 远征存档与园区环境'],
    environment: ['Parque de la Liga', 'League park', '联盟园区'],
    season: ['Estación', 'Season', '季节'],
    time: ['Hora del día', 'Time of day', '时段'],
    seasonAuto: ['Estaciones por hora local', 'Local-time seasons', '跟随本地时间换季'],
    timeAuto: ['Día y noche por hora local', 'Local-time daylight', '跟随本地时间昼夜'],
    autoShort: ['Reloj auto', 'Auto clock', '自动时序'],
    blur: ['Profundidad de campo', 'Depth of field', '景深虚化强度'],
    spring: ['Primavera', 'Spring', '春'],
    summer: ['Verano', 'Summer', '夏'],
    autumn: ['Otoño', 'Autumn', '秋'],
    winter: ['Invierno', 'Winter', '冬'],
    dawn: ['Amanecer', 'Dawn', '清晨'],
    day: ['Día', 'Day', '白天'],
    dusk: ['Atardecer', 'Dusk', '黄昏'],
    night: ['Noche', 'Night', '夜晚'],
    help: ['Guía de cámara', 'Camera guide', '3D 视角指南'],
    helpText: [
      'Arrastra el parque para girar la cámara; usa la rueda para acercar. Toca cualquier Pokémon para saludarlo. 1–4 cambia estación, 5–8 cambia hora, Esc vuelve.',
      'Drag the 3D park to orbit; scroll to zoom. Tap any roaming Pokémon to greet it. Keys 1–4 switch seasons, 5–8 switch time of day, Esc returns.',
      '按住 3D 园区拖动可旋转视角，滚轮缩放，点击漫步的宝可梦可互动打招呼。按 1–4 切换春夏秋冬，5–8 切换昼夜时段，Esc 返回总部。'
    ],
    clockHelp: [
      'Medianoche local: primavera y día. La estación cambia cada 10 minutos; día y noche alternan cada 2. La selección manual pausa solo ese reloj.',
      'Local midnight starts in spring and daylight. Seasons change every 10 minutes; day and night alternate every 2. Manual selection pauses only that clock.',
      '本地午夜起始为春季与白天；每 10 分钟自动轮换四季，每 2 分钟交替昼夜。手动点击左上角季节或时段按钮可随时定格心仪的园区风景。'
    ],
    empty: ['No hay regalos ni invitaciones pendientes', 'No new gifts or invitations', '当前暂无未领取的好友礼物或孵蛋邀请'],
    login: ['Inicia sesión en línea para recibir regalos de amigos', 'Sign in online to receive friend gifts', '登录在线账号后可在此收取好友礼物与孵蛋邀请'],
    back: ['Volver a la sede', 'Back to Sanctuary', '返回联盟总部'],
    rotate: ['Gira el dispositivo para explorar la Sede de la Liga', 'Rotate your device to explore the League Sanctuary', '请横放设备探索 3D 宝可梦联盟总部'],
    full: ['Pantalla completa', 'Fullscreen', '全屏横屏浏览'],
    focus_home: ['Vista general del santuario · Arrastra para orbitar', 'Sanctuary overview · Drag to orbit', '联盟园区全景 · 可自由拖拽旋转或点击宝可梦互动'],
    focus_expedition: ['Portal de expedición · Preparación del escuadrón', 'Expedition Portal · Squad preparation', '远征传送门 · 整备出战队长、五段特性与道具池'],
    focus_pokemon: ['Terraza Pokémon · Colección y linajes', 'Pokémon Terrace · Collection & lineages', '宝可梦档案阁 · 查阅种族值、个体值与队长特性'],
    focus_draw: ['Pabellón de cápsulas · Invocación y cartas', 'Capsule Pavilion · Summons & card packs', '星愿扭蛋与卡包台 · 招募各世代伙伴与特性勋章'],
    focus_eggs: ['Invernadero de crianza · Huevos Pokémon', 'Nursery Greenhouse · Pokémon eggs', '联盟孵蛋温室 · 温暖照料精灵蛋与好友合育'],
    focus_trophy: ['Salón del Honor · Trofeos y clasificación', 'Hall of Honor · Trophies & rankings', '荣耀陈列室 · 铭刻联盟成就、排行榜与巡逻收益'],
    focus_tasks: ['Tablón de la Liga · Misiones y crónicas', 'League Bulletin · Quests & chronicles', '联盟布告栏 · 今日远征委托与开发室公告'],
    focus_mail: ['Buzón de la ribera · Amigos y regalos', 'Riverside Mailbox · Friends & gifts', '河畔红邮筒 · 查收远方好友的礼物与信件'],
    focus_settings: ['Reloj del parque · Estaciones, luz y sistema', 'Park Clockwork · Seasons, light & system', '园区时序与系统 · 调节四季昼夜、音画与远征存档']
  };

  const SEASON_ICONS = ['🌸', '🌿', '🍁', '❄️'];
  const TIME_ICONS = ['🌅', '☀️', '🌇', '🌙'];
  const FOCUS_ICONS = {
    home: '🏛️',
    expedition: '🌀',
    pokemon: '📖',
    draw: '🎰',
    eggs: '🥚',
    trophy: '🏆',
    tasks: '📋',
    mail: '📮',
    settings: '⚙️'
  };

  const tr = key => (TEXT[key] || [key, key, key])[G.I18n.lang === 'zh' ? 2 : G.I18n.lang === 'en' ? 1 : 0];
  G.I18n.add({ 'Buzón': 'Mailbox', 'Logros de la Liga': 'League achievements', 'Parque de la Liga': 'League park' });
  G.I18n.addChinese({ 'Buzón': '联盟邮箱', 'Logros de la Liga': '荣誉成就', 'Parque de la Liga': '联盟园区' });

  let initialized = false, frame = null, ready = false, active = false, current = null, lastFocus = null, failed = false, timeout;
  const order = [], environment = { season: 0, time: 1, seasonAuto: true, timeAuto: true, blur: 1, night: false };
  let inboxHome, envBar, focusCard;

  const visible = id => $(id) && !$(id).classList.contains('hidden');

  /** In Next-edition, #scr-journey is a hub screen ONLY during pre-run preparation (.journey-prep). */
  function isHubScreen(id) {
    if (!id || !(id in ROUTES) || !visible(id)) return false;
    if (id === 'scr-journey') {
      const box = $('journey-content');
      if (!box) return false;
      if (box.classList.contains('route-room') || box.classList.contains('training-room') ||
          box.classList.contains('event-room') || box.classList.contains('battle-loot-box')) return false;
      return !!box.querySelector('.journey-prep') || !G.Expedition?.active || G.Expedition?.phase === 'prep';
    }
    return true;
  }

  function send(type, data = {}) {
    if (ready && frame?.contentWindow) {
      frame.contentWindow.postMessage({ channel: CHANNEL, type, ...data }, location.origin === 'null' ? '*' : location.origin);
    }
  }

  function focusFor(id) {
    if (id === 'scr-goals') {
      const tabs = $('goals-tabs');
      if (tabs?.querySelector('[data-tab="missions"].on')) return 'tasks';
      if (tabs?.querySelector('[data-tab="profile"].on')) return 'pokemon';
      return 'trophy';
    }
    return ROUTES[id];
  }

  function back() {
    if (!active || !current || current === 'scr-menu') return;
    if ($('pull-fx') && !$('pull-fx').classList.contains('hidden')) return;
    if (current === 'scr-journey') {
      const backBtn = $('journey-content')?.querySelector('.journey-actions .btn:not(.gold)');
      if (backBtn && !backBtn.disabled) { backBtn.click(); return; }
    }
    const button = $(current).querySelector('[data-back],#set-close,#news-close,#nursery-back,#prof-close,#nick-later,#offline-close,#mod-back,#sup-close,#legal-close,#lobby-menu');
    if (button && !button.disabled) button.click();
    else G.MenuUI.open();
  }

  function ensureFrame() {
    if (frame) return;
    const world = document.createElement('div');
    world.id = 'league-world';
    frame = document.createElement('iframe');
    frame.id = 'league-scene';
    frame.title = tr('title');
    frame.allow = 'fullscreen';
    const css = document.querySelector('link[href*="css/style.css"]');
    const root = new URL('../', css.href);
    frame.src = new URL('outputs/pokemon-league.html?embed=1&v=0.43.0-alpha.57', root).href;
    world.append(frame);
    document.body.insertBefore(world, document.body.firstChild);
    timeout = setTimeout(() => {
      if (!ready) {
        failed = true;
        document.body.classList.add('league-unavailable');
        document.body.style.setProperty('--league-share', '0%');
        $(current)?.removeAttribute('inert');
      }
    }, 12000);
  }

  function updateHudChrome() {
    if (!envBar || !focusCard) return;
    const fk = lastFocus || 'home';
    const seasonKeys = ['spring', 'summer', 'autumn', 'winter'];
    const timeKeys = ['dawn', 'day', 'dusk', 'night'];
    const sIdx = environment.season || 0;
    const tIdx = environment.time ?? 1;

    const titleEl = envBar.querySelector('.league-env-title');
    const subEl = envBar.querySelector('.league-env-sub');
    if (titleEl) titleEl.textContent = tr('title');
    if (subEl) subEl.textContent = FOCUS_ICONS[fk] + ' ' + tr('focus_' + fk);

    const sBtn = envBar.querySelector('[data-env="season"]');
    if (sBtn) sBtn.innerHTML = `<i>${SEASON_ICONS[sIdx]}</i><span>${tr(seasonKeys[sIdx])}</span>`;

    const tBtn = envBar.querySelector('[data-env="time"]');
    if (tBtn) tBtn.innerHTML = `<i>${TIME_ICONS[tIdx]}</i><span>${tr(timeKeys[tIdx])}</span>`;

    const aBtn = envBar.querySelector('[data-env="auto"]');
    const autoOn = !!(environment.seasonAuto && environment.timeAuto);
    if (aBtn) {
      aBtn.classList.toggle('on', autoOn);
      aBtn.setAttribute('aria-pressed', String(autoOn));
      aBtn.innerHTML = `<i>🕒</i><span>${tr('autoShort')}</span>`;
    }

    const fIcon = focusCard.querySelector('.league-focus-ico');
    const fTitle = focusCard.querySelector('.league-focus-text b');
    const fSub = focusCard.querySelector('.league-focus-text small');
    const fBack = focusCard.querySelector('.league-focus-back span');
    const parts = tr('focus_' + fk).split(' · ');
    if (fIcon) fIcon.textContent = FOCUS_ICONS[fk] || '🏛️';
    if (fTitle) fTitle.textContent = parts[0] || tr('title');
    if (fSub) fSub.textContent = parts[1] || tr('subTitle');
    if (fBack) fBack.textContent = tr('back');
  }

  function setCurrent(id) {
    const key = focusFor(id);
    if (current === id) {
      if (key !== lastFocus) {
        lastFocus = key;
        send('focus', { key });
        updateHudChrome();
      }
      return;
    }
    current = id;
    lastFocus = key;
    document.body.dataset.leagueView = id === 'scr-menu' ? 'home' : 'detail';
    document.body.dataset.leagueScreen = id;
    document.body.dataset.leagueFocus = key || 'home';
    for (const name of Object.keys(ROUTES)) {
      const el = $(name);
      if (!el) continue;
      const on = name === id;
      el.classList.toggle('league-current', on);
      el.inert = !on;
      if (on) el.style.opacity = '1';
    }
    const inbox = $('fr-inbox');
    if (inbox && inboxHome) {
      if (id === 'scr-league-mail') $('league-mail-body')?.append(inbox);
      else inboxHome.after(inbox);
    }
    if (!ready || failed) {
      document.body.style.setProperty('--league-share', failed ? '0%' : (id === 'scr-menu' ? 62 : 35) + '%');
    }
    send('focus', { key: lastFocus });
    refreshNotices();
    updateHudChrome();
    $(id).scrollTop = 0;
  }

  function sync() {
    const candidates = order.filter(isHubScreen);
    const id = candidates.at(-1) || Object.keys(ROUTES).find(isHubScreen);
    const nextActive = !!G.DB.loggedIn && G.Game.state === 'ui' && !!id;
    if (!nextActive) {
      if (active) {
        active = false;
        document.body.classList.remove('league-active');
        delete document.body.dataset.leagueView;
        delete document.body.dataset.leagueScreen;
        send('active', { active: false });
        for (const k of Object.keys(ROUTES)) {
          const el = $(k);
          if (el) {
            el.inert = false;
            el.classList.remove('league-current');
            el.style.opacity = '';
          }
        }
      }
      return;
    }
    if (!active) {
      active = true;
      document.body.classList.add('league-active');
      ensureFrame();
      send('active', { active: true });
      current = null;
    }
    setCurrent(id);
  }

  function refreshNotices() {
    if (!G.DB.loggedIn) return;
    applyLabels();
    const count = {
      goals: G.Progress.pending(),
      achievements: G.Progress.pending(),
      mail: (G.Social.extras?.gifts.inbox.length || 0) + (G.Social.extras?.nurseryInvites.length || 0),
      friends: G.Social.friends.filter(f => f.status === 'in').length
    };
    for (const [key, n] of Object.entries(count)) {
      const b = document.querySelector('#scr-menu [data-go="' + key + '"]');
      if (b) {
        if (n) b.dataset.notice = String(n);
        else delete b.dataset.notice;
        b.setAttribute('aria-label', tr(key) + (n ? ' · ' + n : ''));
      }
    }
  }

  function renderMail() {
    if (!visible('scr-league-mail')) return;
    const box = $('league-mail-body');
    if (!box) return;
    box.querySelector('.league-empty')?.remove();
    if (G.DB.mode === 'server' && G.DB.online) {
      G.NurseryUI.renderInbox();
      if (!G.Social.extras.gifts.inbox.length && !G.Social.extras.nurseryInvites.length) {
        const p = document.createElement('p');
        p.className = 'league-empty';
        p.textContent = tr('empty');
        box.append(p);
      }
    } else {
      const p = document.createElement('p');
      p.className = 'league-empty';
      p.textContent = tr('login');
      box.append(p);
    }
  }

  function openMail() {
    G.UI.show('scr-league-mail', true);
    sync();
    renderMail();
    if (G.DB.mode === 'server' && G.DB.online) {
      G.Social.refreshPresence().then(renderMail).catch(() => {});
    }
  }

  function renderSettings(box) {
    box.replaceChildren();
    box.setAttribute('translate', 'no');
    for (const [key, choices] of [['season', ['spring', 'summer', 'autumn', 'winter']], ['time', ['dawn', 'day', 'dusk', 'night']]]) {
      const row = document.createElement('label');
      row.className = 'set-row';
      row.textContent = tr(key);
      const select = document.createElement('select');
      select.className = 'field';
      select.id = 'league-' + key;
      choices.forEach((name, i) => select.add(new Option(tr(name), i)));
      select.value = environment[key];
      select.onchange = () => send('environment', { [key]: Number(select.value) });
      row.append(select);
      box.append(row);
    }
    for (const key of ['seasonAuto', 'timeAuto']) {
      const row = document.createElement('label');
      row.className = 'set-row';
      row.textContent = tr(key);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = 'league-' + key;
      input.checked = environment[key];
      input.onchange = () => send('environment', { [key]: input.checked });
      row.append(input);
      box.append(row);
    }
    const row = document.createElement('label');
    row.className = 'set-row';
    row.textContent = tr('blur');
    const slider = document.createElement('input');
    slider.id = 'league-blur';
    slider.type = 'range';
    slider.min = 0;
    slider.max = 100;
    slider.value = environment.blur * 100;
    slider.oninput = () => send('environment', { blur: Number(slider.value) / 100 });
    row.append(slider);
    box.append(row);

    const help = document.createElement('details');
    help.className = 'league-help';
    const summary = document.createElement('summary');
    summary.textContent = tr('help');
    const text = document.createElement('p');
    text.textContent = tr('clockHelp');
    help.append(summary, text);
    box.append(help);
  }

  function applyLabels() {
    document.querySelectorAll('#scr-menu [data-go]').forEach(b => {
      const key = b.dataset.go;
      if (!TEXT[key]) return;
      b.setAttribute('translate', 'no');
      for (const node of b.childNodes) {
        if (node.nodeType === 3 && node.textContent.trim()) node.textContent = tr(key);
      }
      const sub = b.querySelector('small');
      if (sub) {
        sub.setAttribute('translate', 'no');
        if (!sub.id && TEXT[key + 'Sub']) sub.textContent = tr(key + 'Sub');
        else if (sub.id === 'menu-goals-sub') {
          const pend = G.Progress?.pending?.() || 0;
          sub.textContent = pend
            ? (G.I18n.lang === 'zh' ? `${pend} 项奖励待领取` : G.I18n.lang === 'en' ? `${pend} reward(s) to claim` : `${pend} premio(s) por recoger`)
            : tr('goalsSub');
        } else if (sub.id === 'menu-dex-count' && G.I18n.lang === 'zh') {
          sub.textContent = sub.textContent.replace(/\bshiny\b/gi, '异色');
        }
      }
      b.title = sub?.textContent || tr(key);
    });
    const capKicker = document.querySelector('.league-captain-kicker');
    if (capKicker) capKicker.textContent = tr('captainKicker');
    const conKicker = document.querySelector('.league-console-kicker');
    if (conKicker) conKicker.textContent = tr('consoleKicker');
    updateHudChrome();
  }

  function mountChrome() {
    // 1. Top-Left Floating 3D Sanctuary & Environment Bar
    envBar = document.createElement('aside');
    envBar.id = 'league-env-bar';
    envBar.className = 'league-env-bar';
    envBar.setAttribute('translate', 'no');
    envBar.innerHTML = `
      <div class="league-env-brand">
        <span class="league-env-seal" aria-hidden="true">✦</span>
        <div class="league-env-copy">
          <small class="league-env-kicker">POKÉMON LEAGUE · SANCTUARY</small>
          <strong class="league-env-title"></strong>
          <span class="league-env-sub"></span>
        </div>
      </div>
      <div class="league-env-controls">
        <button type="button" class="league-env-pill" data-env="season" title="1–4"></button>
        <button type="button" class="league-env-pill" data-env="time" title="5–8"></button>
        <button type="button" class="league-env-pill" data-env="auto" title="A / D"></button>
        <button type="button" class="league-env-pill icon-only" data-env="help" aria-label="Help">?</button>
      </div>
    `;
    envBar.addEventListener('click', e => {
      const btn = e.target.closest('[data-env]');
      if (!btn) return;
      const act = btn.dataset.env;
      if (act === 'season') {
        const next = ((environment.season || 0) + 1) % 4;
        environment.season = next;
        environment.seasonAuto = false;
        send('environment', { season: next, seasonAuto: false });
        updateHudChrome();
      } else if (act === 'time') {
        const next = ((environment.time ?? 1) + 1) % 4;
        environment.time = next;
        environment.timeAuto = false;
        send('environment', { time: next, timeAuto: false });
        updateHudChrome();
      } else if (act === 'auto') {
        const next = !(environment.seasonAuto && environment.timeAuto);
        environment.seasonAuto = next;
        environment.timeAuto = next;
        send('environment', { seasonAuto: next, timeAuto: next });
        updateHudChrome();
      } else if (act === 'help') {
        G.UI.toast(tr('helpText'), 6500);
      }
    });
    document.body.append(envBar);

    // 2. Bottom-Left Floating 3D Landmark Showcase Card (when in detail view)
    focusCard = document.createElement('aside');
    focusCard.id = 'league-focus-card';
    focusCard.className = 'league-focus-card';
    focusCard.setAttribute('translate', 'no');
    focusCard.innerHTML = `
      <button type="button" class="league-focus-back">
        <i>‹</i><span></span><kbd>Esc</kbd>
      </button>
      <div class="league-focus-body">
        <span class="league-focus-ico" aria-hidden="true">🌀</span>
        <div class="league-focus-text">
          <b></b>
          <small></small>
        </div>
      </div>
    `;
    focusCard.querySelector('.league-focus-back').onclick = () => back();
    document.body.append(focusCard);

    // 3. Kickers inside #scr-menu
    const partnerCard = document.querySelector('#scr-menu .partner-card');
    if (partnerCard && !partnerCard.querySelector('.league-captain-kicker')) {
      const k = document.createElement('div');
      k.className = 'league-captain-kicker';
      k.setAttribute('translate', 'no');
      partnerCard.prepend(k);
    }
    const rightBox = document.querySelector('#scr-menu .menu-right > .box:first-child');
    if (rightBox && !rightBox.querySelector('.league-console-kicker')) {
      const k = document.createElement('div');
      k.className = 'league-console-kicker';
      k.setAttribute('translate', 'no');
      rightBox.prepend(k);
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    const inbox = $('fr-inbox');
    if (inbox) {
      inboxHome = document.createComment('Native friends inbox');
      inbox.before(inboxHome);
    }
    for (const id of Object.keys(ROUTES)) {
      const el = $(id);
      if (el) {
        el.classList.add('league-panel');
        if (visible(id)) order.push(id);
      }
    }
    mountChrome();
    applyLabels();

    const observer = new MutationObserver(records => {
      let changed = false;
      for (const r of records) {
        const wasHidden = (r.oldValue || '').split(/\s+/).includes('hidden');
        const isHidden = r.target.classList.contains('hidden');
        if (wasHidden === isHidden && r.target.id !== 'journey-content') continue;
        changed = true;
        const id = r.target.id;
        if (id in ROUTES && !isHidden) {
          const at = order.indexOf(id);
          if (at >= 0) order.splice(at, 1);
          order.push(id);
        }
      }
      if (changed) sync();
    });
    for (const id of [...Object.keys(ROUTES), 'topbar', 'journey-content']) {
      if ($(id)) observer.observe($(id), { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    }
    const goalsTabs = $('goals-tabs');
    if (goalsTabs) {
      const goalsObserver = new MutationObserver(() => {
        if (current === 'scr-goals') setCurrent(current);
      });
      goalsObserver.observe(goalsTabs, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    G.Social.on(() => {
      refreshNotices();
      if (current === 'scr-league-mail') renderMail();
    });

    addEventListener('message', e => {
      const m = e.data;
      if (!frame || e.source !== frame.contentWindow || e.origin !== location.origin || m?.channel !== CHANNEL) return;
      if (m.type === 'ready') {
        ready = true;
        failed = false;
        clearTimeout(timeout);
        document.body.classList.remove('league-unavailable');
        send('language', { lang: G.I18n.lang });
        send('active', { active });
        send('focus', { key: lastFocus });
      }
      if (m.type === 'layout' && Number.isFinite(m.mix) && m.mix >= 0 && m.mix <= 1) {
        document.body.style.setProperty('--league-share', (62 - 27 * m.mix) + '%');
        if (current) {
          $(current).inert = !!m.transition;
          $(current).style.opacity = m.transition ? String(Math.max(0, (m.progress - 0.22) / 0.78)) : '1';
        }
      }
      if (m.type === 'environment' && m.state) {
        Object.assign(environment, m.state);
        document.body.classList.toggle('league-night', !!environment.night);
        for (const key of ['season', 'time', 'seasonAuto', 'timeAuto']) {
          const el = $('league-' + key);
          if (el && el !== document.activeElement) {
            if (el.type === 'checkbox') el.checked = environment[key];
            else el.value = environment[key];
          }
        }
        updateHudChrome();
      }
      if (m.type === 'back') back();
    });

    addEventListener('keydown', e => {
      if (!active || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,select,textarea')) return;
      if (e.key === 'Escape') {
        if (document.querySelector('.league-overlay')) return;
        if (current && current !== 'scr-menu') {
          e.preventDefault();
          back();
        }
      } else if (/^[1-8aAdDnN]$/.test(e.key)) {
        e.preventDefault();
        send('key', { key: e.key });
      }
    });

    sync();
  }

  return {
    init,
    sync,
    openMail,
    renderSettings,
    refreshNotices,
    applyLabels,
    get active() { return active; }
  };
})();
