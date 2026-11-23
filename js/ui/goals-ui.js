/* ============ goals-ui.js — misiones, logros y perfil ============
 * Una pantalla con tres pestañas:
 *   Misiones  3 diarias + 2 semanales, con barra, premio y botón de recoger
 *   Logros    medallas por categoría; los legendarios, uno a uno con su sprite
 *   Perfil    tus 3 favoritos y tu título; vista previa del perfil público
 * y la ventana del perfil público de cualquier jugador (G.ProfileUI.show).
 */
(() => {
  const $ = G.UI.$;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = t => (t >= 3600 ? Math.floor(t / 3600) + ':' + G.U.mmss(t % 3600).padStart(5, '0') : G.U.mmss(t));

  // ======================= PANTALLA =======================

  G.GoalsUI = (() => {
    let tab = 'missions', cat = 'coleccion';

    function init() {
      document.querySelectorAll('#goals-tabs .tab').forEach(t => {
        t.onclick = () => { tab = t.dataset.tab; render(); };
      });
    }

    function open(t) {
      if (t) tab = t;
      G.UI.show('scr-goals', true);
      G.Progress.ensure(G.DB.save);
      G.Progress.checkAch();
      render();
    }

    function render() {
      document.querySelectorAll('#goals-tabs .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
      const box = $('goals-body');
      box.innerHTML = '';
      if (tab === 'missions') missions(box);
      else if (tab === 'ach') achievements(box);
      else profile(box);
    }

    // ---------------- misiones ----------------

    function untilText(kind) {
      const now = new Date();
      // Medianoche (diarias) o lunes (semanales), hora de España aproximada por la del navegador.
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      if (kind === 'w') { const add = (8 - (now.getDay() || 7)) % 7; end.setDate(end.getDate() + add); }
      const mins = Math.max(1, Math.round((end - now) / 60000));
      return mins >= 1440 ? Math.floor(mins / 1440) + ' d ' + Math.floor(mins % 1440 / 60) + ' h'
                          : Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min';
    }

    function missions(box) {
      const M = G.DB.save.missions;
      const section = (title, list, weekly) => {
        box.insertAdjacentHTML('beforeend', `<div class="row between goals-h"><h3>${title}</h3>
          <span class="sub">Se renuevan en ${untilText(weekly ? 'w' : 'd')}</span></div>`);
        list.forEach((m, i) => {
          const d = G.MissionDefs.BY[m.id];
          const done = G.Progress.done(m);
          const el = document.createElement('div');
          el.className = 'mission' + (m.claimed ? ' claimed' : done ? ' ready' : '');
          const pct = Math.min(100, m.prog / m.goal * 100);
          el.innerHTML = `
            <div class="m-txt"><b>${esc(G.Progress.text(m))}</b>
              <div class="bar"><i style="width:${pct}%"></i></div>
              <small>${Math.min(m.prog, m.goal).toLocaleString('es')} / ${m.goal.toLocaleString('es')}</small></div>
            <div class="m-rw">${G.Progress.rewardText(d.reward)}</div>`;
          const btn = document.createElement('button');
          if (m.claimed) { btn.className = 'btn small'; btn.disabled = true; btn.textContent = 'Recogido'; }
          else if (done) {
            btn.className = 'btn small gold'; btn.textContent = 'Recoger'; btn.dataset.sfx = 'none';
            btn.onclick = () => { if (G.Progress.claim(m, weekly)) { G.Audio.sfx('buy'); G.UI.toast('¡Premio recogido!'); render(); } };
          } else if (!weekly && !M.rerolled) {
            btn.className = 'btn small ghost'; btn.textContent = 'Cambiar';
            btn.title = 'Cambia esta misión por otra (una vez al día)';
            btn.onclick = () => { if (G.Progress.reroll(i)) render(); };
          } else { btn.className = 'btn small ghost'; btn.disabled = true; btn.textContent = 'En curso'; }
          el.appendChild(btn);
          box.appendChild(el);
        });
      };
      section('Diarias', M.daily, false);
      section('Semanales', M.weekly, true);
    }

    // ---------------- logros ----------------

    function achievements(box) {
      const s = G.DB.save;
      const all = G.AchDefs.LIST;
      const got = all.filter(a => s.ach && s.ach[a.id]).length;
      const chips = document.createElement('div');
      chips.className = 'filters';
      for (const [k, label] of G.AchDefs.CATS) {
        const list = all.filter(a => a.cat === k);
        const n = list.filter(a => s.ach && s.ach[a.id]).length;
        const b = document.createElement('button');
        b.className = 'chip' + (k === cat ? ' on' : '');
        b.textContent = `${label} ${n}/${list.length}`;
        b.onclick = () => { cat = k; render(); };
        chips.appendChild(b);
      }
      box.insertAdjacentHTML('beforeend', `<p class="sub">${got} de ${all.length} logros · títulos: ${G.Progress.titles().length}</p>`);
      box.appendChild(chips);

      const list = all.filter(a => a.cat === cat && !a.dex);
      const grid = document.createElement('div');
      grid.className = 'ach-grid';
      for (const a of list) grid.appendChild(achCard(a, s));
      box.appendChild(grid);

      // Legendarios: uno a uno, con su sprite (en sombra si aún no le has vencido).
      if (cat === 'legendarios') {
        const legs = all.filter(a => a.dex);
        const beaten = legs.filter(a => s.legends && s.legends[a.dex]).length;
        box.insertAdjacentHTML('beforeend', `<h3 style="margin:14px 0 6px">Legendarios vencidos ${beaten} / ${legs.length}</h3>`);
        const lg = document.createElement('div');
        lg.className = 'leg-grid';
        for (const a of legs) {
          const ok = !!(s.legends && s.legends[a.dex]);
          const c = document.createElement('div');
          c.className = 'leg-cell' + (ok ? ' ok' : '');
          c.title = a.name + (ok ? ' · ¡vencido!' : '');
          c.appendChild(G.UI.spriteCanvas(a.dex, 64, 56, { scale: 1, silhouette: !ok, shadow: ok }));
          c.insertAdjacentHTML('beforeend', `<small>${ok ? esc(G.DEX_BY[a.dex].name) : '???'}</small>`);
          lg.appendChild(c);
        }
        box.appendChild(lg);
      }
    }

    function achCard(a, s) {
      const ok = !!(s.ach && s.ach[a.id]);
      const v = Math.min(a.goal, a.value(s));
      const el = document.createElement('div');
      el.className = 'ach' + (ok ? ' ok' : '');
      el.innerHTML = `${G.Icons.html(ok ? 'medal' + a.tier : 'medalOff', 36)}
        <div class="a-txt"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>
          ${ok ? '' : `<div class="bar"><i style="width:${v / a.goal * 100}%"></i></div>`}
          <div class="a-rw">${ok ? '¡Conseguido!' : v.toLocaleString('es') + ' / ' + a.goal.toLocaleString('es')} · ${G.Progress.rewardText(a.reward)}
          ${a.title ? ` · <span class="gold">Título: ${esc(a.title)}</span>` : ''}</div></div>`;
      return el;
    }

    // ---------------- perfil (editar y personalizar) ----------------

    const PROFILE_BORDERS = [
      { id: 'sanctuary', name: ['Santuario de la Liga', 'League Sanctuary', '联盟圣殿'], accent: '#53c8ff' },
      { id: 'royal', name: ['Oro de Campeón', 'Champion Gold', '冠军金辉'], accent: '#ffd447' },
      { id: 'sakura', name: ['Brisa de Cerezos', 'Sakura Breeze', '春日樱庭'], accent: '#ff96c5' },
      { id: 'emerald', name: ['Bosque Esmeralda', 'Emerald Grove', '翡翠森境'], accent: '#48e29a' },
      { id: 'astral', name: ['Grieta Astral', 'Astral Rift', '星界裂隙'], accent: '#b88cff' },
      { id: 'crimson', name: ['Llama Escarlata', 'Crimson Blaze', '绯红烈焰'], accent: '#ff6678' }
    ];

    const AVATAR_FRAMES = [
      { id: 'gold', name: ['Anillo de la Liga', 'League Crest', '联盟金环'], color: '#ffd447', badge: '✦' },
      { id: 'crystal', name: ['Cristal Celeste', 'Celeste Crystal', '湛蓝晶冠'], color: '#5ce1ff', badge: '❖' },
      { id: 'blossom', name: ['Guirnalda Floral', 'Blossom Wreath', '落樱花环'], color: '#ff96c8', badge: '❀' },
      { id: 'flame', name: ['Corona Ígnea', 'Blazing Crown', '炽焰冠冕'], color: '#ff784f', badge: '🔥' },
      { id: 'starlight', name: ['Halo Estelar', 'Starlight Halo', '星辉光轮'], color: '#c49bff', badge: '★' },
      { id: 'master', name: ['Emblema Maestro', 'Master Emblem', '大师徽记'], color: '#52f2b8', badge: '👑' }
    ];

    const TITLE_PREFIXES = [
      { id: 'starlight', text: ['de la Luz Estelar', 'Starlight', '星辉下的'] },
      { id: 'breeze', text: ['de la Brisa Marina', 'Sea-Breeze', '海风中的'] },
      { id: 'evergreen', text: ['del Bosque Eterno', 'Evergreen', '常青林的'] },
      { id: 'blazing', text: ['del Corazón Ardiente', 'Blazing-Heart', '炽热之心的'] },
      { id: 'rift', text: ['del Más Allá', 'Rift-Striding', '穿越裂隙的'] },
      { id: 'shiny', text: ['del Destello Irisado', 'Prismatic', '追逐闪光的'] },
      { id: 'unyielding', text: ['de Voluntad Férrea', 'Unyielding', '百折不挠的'] },
      { id: 'dawn', text: ['del Alba Dorada', 'Golden-Dawn', '破晓时分的'] },
      { id: 'sanctuary', text: ['del Santuario', 'Sanctuary', '联盟庭院的'] },
      { id: 'dreaming', text: ['de la Siesta Feliz', 'Daydreaming', '爱睡午觉的'] }
    ];

    const TITLE_SUFFIXES = [
      { id: 'trainer', text: ['Entrenador', 'Trainer', '训练家'] },
      { id: 'pioneer', text: ['Pionero', 'Pioneer', '远征先驱'] },
      { id: 'captain', text: ['Capitán', 'Captain', '小队队长'] },
      { id: 'collector', text: ['Coleccionista', 'Collector', '图鉴学者'] },
      { id: 'guardian', text: ['Guardián', 'Guardian', '守护者'] },
      { id: 'tactician', text: ['Estratega', 'Tactician', '战术大师'] },
      { id: 'champion', text: ['Campeón', 'Champion', '殿堂冠军'] },
      { id: 'companion', text: ['Compañero Fiel', 'True Partner', '羁绊旅人'] },
      { id: 'conqueror', text: ['Conquistador', 'Conqueror', '首领克星'] },
      { id: 'legend', text: ['Leyenda Viva', 'Living Legend', '传奇名宿'] }
    ];

    function loc(arr) {
      return arr[G.I18n.lang === 'zh' ? 2 : G.I18n.lang === 'en' ? 1 : 0];
    }

    function formatTwoPartTitle(prefixId, suffixId, legacyTitle, unlockedTitles = []) {
      const pObj = TITLE_PREFIXES.find(x => x.id === prefixId) || TITLE_PREFIXES[0];
      let sText = '';
      if (suffixId && suffixId.startsWith('ach:')) {
        const raw = suffixId.slice(4);
        sText = G.T(raw);
      } else {
        const sObj = TITLE_SUFFIXES.find(x => x.id === suffixId) || TITLE_SUFFIXES[0];
        sText = loc(sObj.text);
      }
      if (!prefixId && !suffixId && legacyTitle) return legacyTitle;
      const pText = loc(pObj.text);
      if (G.I18n.lang === 'zh') {
        const cleanP = pText.endsWith('的') ? pText.slice(0, -1) : pText;
        return `${cleanP}的${sText}`;
      }
      if (G.I18n.lang === 'en') return `${pText} ${sText}`;
      return `${sText} ${pText}`;
    }

    function ensureProfileDefaults(s) {
      s.profile = s.profile || {};
      const P = s.profile;
      if (!Array.isArray(P.favs)) P.favs = [];
      if (!P.titlePrefix) P.titlePrefix = 'starlight';
      if (!P.titleSuffix) P.titleSuffix = 'trainer';
      if (!P.avatarFrame || !AVATAR_FRAMES.some(f => f.id === P.avatarFrame)) P.avatarFrame = 'gold';
      if (!P.cardBorder || !PROFILE_BORDERS.some(b => b.id === P.cardBorder)) P.cardBorder = 'sanctuary';
      if (!P.avatarDex || !G.DEX_BY[P.avatarDex] || !s.owned?.[P.avatarDex]) {
        P.avatarDex = s.partner && G.DEX_BY[s.partner] ? s.partner : Number(Object.keys(s.owned || {})[0]) || 25;
        P.avatarShiny = !!(P.avatarDex === s.partner && s.partnerShiny && G.DB.ownsShiny(P.avatarDex));
      }
      P.title = formatTwoPartTitle(P.titlePrefix, P.titleSuffix, P.title);
      return P;
    }

    function profile(box) {
      const s = G.DB.save;
      const P = ensureProfileDefaults(s);
      const T = (es, en, zh) => G.Server.text(es, en, zh);
      const unlockedTitles = G.Progress.titles();
      const borderDef = PROFILE_BORDERS.find(b => b.id === P.cardBorder) || PROFILE_BORDERS[0];
      const frameDef = AVATAR_FRAMES.find(f => f.id === P.avatarFrame) || AVATAR_FRAMES[0];
      const lv = G.LeagueRank ? G.LeagueRank.view(s) : { tier: 1, stars: 0, points: 0, protocol: 0 };
      const fullMedals = G.Difficulty ? G.Difficulty.completedCount(s) : 0;
      const abilityMedals = Object.keys(s.abilityMedals || {}).length;
      const achMedals = Object.keys(s.ach || {}).length;
      const legendMedals = Object.keys(s.legends || {}).length;
      const totalMedals = fullMedals + abilityMedals + achMedals;
      const fullTitle = formatTwoPartTitle(P.titlePrefix, P.titleSuffix, P.title, unlockedTitles);

      box.innerHTML = `
        <div class="prof-editor-layout" translate="no">
          <div class="prof-live-card border-${esc(borderDef.id)}" style="--prof-accent:${borderDef.accent};--frame-accent:${frameDef.color}">
            <div class="prof-card-watermark">POKÉSURVIVOR LEAGUE</div>
            <div class="prof-card-top">
              <button type="button" class="prof-avatar-shell frame-${esc(frameDef.id)}" id="prof-edit-avatar" title="${T('Cambiar avatar Pokémon', 'Change Pokémon avatar', '点击更换头像宝可梦')}">
                <span class="prof-avatar-ring"></span>
                <canvas id="prof-editor-avatar-cv" width="96" height="96"></canvas>
                <span class="prof-avatar-crest">${frameDef.badge}</span>
                <small class="prof-avatar-edit-tag">${T('Avatar', 'Avatar', '更换头像')}</small>
              </button>
              <div class="prof-identity">
                <div class="prof-kicker-row">
                  <span class="prof-kicker-badge">${T('TARJETA DE ENTRENADOR', 'TRAINER PASSPORT', '联盟训练家档案卡')}</span>
                  <span class="prof-rank-pill">R${lv.tier} · ★${lv.points ?? lv.stars ?? 0}${lv.protocol ? ` · 🏆${lv.protocol}` : ''}</span>
                </div>
                <h2 class="prof-player-name">${esc(G.DB.user || T('Entrenador', 'Trainer', '旅行训练家'))}</h2>
                <div class="prof-twopart-title">
                  <span class="prof-title-icon">✦</span>
                  <b>${esc(fullTitle)}</b>
                </div>
              </div>
              <button type="button" class="btn small gold prof-preview-btn" id="prof-open-public">${T('Vista pública', 'Public card', '查看完整名片')}</button>
            </div>

            <div class="prof-medal-ribbon">
              <div class="prof-medal-stat total">
                <span class="pms-ico">${G.Icons.html('trophy', 22)}</span>
                <div><small>${T('Medallas totales', 'Total medals', '勋章总计')}</small><b>${totalMedals}</b></div>
              </div>
              <div class="prof-medal-stat">
                <span class="pms-ico">${G.Icons.html('medal3', 22)}</span>
                <div><small>${T('Logros de Liga', 'Achievements', '成就勋章')}</small><b>${achMedals}</b></div>
              </div>
              <div class="prof-medal-stat">
                <span class="pms-ico">${G.Icons.html('gem', 22)}</span>
                <div><small>${T('Medallas de habilidad', 'Ability medals', '特性勋章')}</small><b>${abilityMedals}</b></div>
              </div>
              <div class="prof-medal-stat">
                <span class="pms-ico">${G.Icons.html('crown', 22)}</span>
                <div><small>${T('8★ / Mitos vencidos', '8★ / Myths beaten', '满星伙伴 / 传说击败')}</small><b>${fullMedals} / ${legendMedals}</b></div>
              </div>
            </div>
          </div>

          <div class="prof-custom-grid">
            <section class="prof-custom-panel">
              <h3>${T('Título de dos partes («xx的xx»)', 'Two-part title', '二段式称号定制（xx的xx）')}</h3>
              <div class="prof-title-builder">
                <label class="prof-title-part">
                  <small>${T('Prefijo (Estilo / Origen)', 'Prefix (Style / Origin)', '前段词缀（风格 / 归属）')}</small>
                  <select class="field" id="prof-title-prefix"></select>
                </label>
                <span class="prof-title-joiner">${G.I18n.lang === 'zh' ? '的' : '·'}</span>
                <label class="prof-title-part">
                  <small>${T('Sufijo (Rango / Logro)', 'Suffix (Role / Achievement)', '后段头衔（身份 / 成就解锁）')}</small>
                  <select class="field" id="prof-title-suffix"></select>
                </label>
              </div>
            </section>

            <section class="prof-custom-panel">
              <h3>${T('Marco de avatar', 'Avatar frame', '头像框选择')}</h3>
              <div class="prof-swatch-grid" id="prof-frame-swatches"></div>
            </section>

            <section class="prof-custom-panel">
              <h3>${T('Borde de tarjeta de perfil', 'Profile card border', '资料界面边框主题')}</h3>
              <div class="prof-swatch-grid" id="prof-border-swatches"></div>
            </section>

            <section class="prof-custom-panel prof-favs-panel">
              <h3>${T('Tus 3 Pokémon favoritos', 'Your 3 favorite Pokémon', '展示的 3 位代表伙伴')}</h3>
              <div class="fav-slots" id="prof-editor-favs"></div>
            </section>
          </div>
        </div>
      `;

      const avCv = $('prof-editor-avatar-cv');
      if (avCv) G.UI.sprite(avCv, P.avatarDex, { portrait: true, hero: true, shiny: !!P.avatarShiny, shadow: false });
      $('prof-edit-avatar').onclick = () => pickAvatar();
      $('prof-open-public').onclick = () => G.DB.mode === 'server' && G.DB.online ? G.ProfileUI.show(G.Server.user?.uid) : G.ProfileUI.showData(G.Social.profileData());

      // Populate prefix & suffix selectors
      const prefSel = $('prof-title-prefix');
      for (const p of TITLE_PREFIXES) {
        const opt = new Option(loc(p.text), p.id, p.id === P.titlePrefix, p.id === P.titlePrefix);
        prefSel.add(opt);
      }
      const sufSel = $('prof-title-suffix');
      for (const sItem of TITLE_SUFFIXES) {
        const opt = new Option(loc(sItem.text), sItem.id, sItem.id === P.titleSuffix, sItem.id === P.titleSuffix);
        sufSel.add(opt);
      }
      for (const achTitle of unlockedTitles) {
        const val = 'ach:' + achTitle;
        const opt = new Option('★ ' + G.T(achTitle), val, val === P.titleSuffix, val === P.titleSuffix);
        sufSel.add(opt);
      }
      const updateTitle = () => {
        P.titlePrefix = prefSel.value;
        P.titleSuffix = sufSel.value;
        P.title = formatTwoPartTitle(P.titlePrefix, P.titleSuffix, P.title, unlockedTitles);
        save();
        render();
      };
      prefSel.onchange = updateTitle;
      sufSel.onchange = updateTitle;

      // Populate Avatar Frame swatches
      const frameGrid = $('prof-frame-swatches');
      for (const f of AVATAR_FRAMES) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'prof-swatch' + (P.avatarFrame === f.id ? ' on' : '');
        btn.style.setProperty('--sw-color', f.color);
        btn.innerHTML = `<span class="sw-dot">${f.badge}</span><b>${esc(loc(f.name))}</b>`;
        btn.onclick = () => { P.avatarFrame = f.id; save(); render(); };
        frameGrid.append(btn);
      }

      // Populate Card Border swatches
      const borderGrid = $('prof-border-swatches');
      for (const b of PROFILE_BORDERS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'prof-swatch' + (P.cardBorder === b.id ? ' on' : '');
        btn.style.setProperty('--sw-color', b.accent);
        btn.innerHTML = `<span class="sw-bar"></span><b>${esc(loc(b.name))}</b>`;
        btn.onclick = () => { P.cardBorder = b.id; save(); render(); };
        borderGrid.append(btn);
      }

      // Populate 3 favorite slots
      const favs = $('prof-editor-favs');
      for (let i = 0; i < 3; i++) {
        const f = P.favs[i];
        const slot = document.createElement('div');
        slot.className = 'fav-slot';
        if (f && G.DEX_BY[f.dex]) {
          slot.appendChild(G.UI.spriteCanvas(f.dex, 112, 92, { scale: 2, lively: true, shiny: !!f.shiny }));
          slot.insertAdjacentHTML('beforeend', `<b>${f.shiny ? G.Icons.html('shiny', 12) + ' ' : ''}${esc(G.T(G.DEX_BY[f.dex].name))}</b>`);
        } else {
          slot.innerHTML = `<span>+ ${T('Elegir', 'Choose', '选择伙伴')}</span>`;
        }
        slot.onclick = () => pickFav(i);
        favs.appendChild(slot);
      }
    }

    function pickAvatar() {
      const s = G.DB.save;
      const T = (es, en, zh) => G.Server.text(es, en, zh);
      const box = $('goals-body');
      box.innerHTML = `<div class="row between"><h3>${T('Elige tu avatar Pokémon', 'Choose your Pokémon avatar', '选择个人头像宝可梦')}</h3>
        <button class="btn small ghost" id="fav-back">${T('Volver', 'Back', '返回')}</button></div>
        <input class="field" id="fav-q" placeholder="${T('Buscar por nombre', 'Search by name', '搜索已拥有的宝可梦')}" style="max-width:320px;margin:6px 0 10px">
        <div class="grid" id="fav-grid"></div>`;
      $('fav-back').onclick = () => { tab = 'profile'; render(); };
      const fill = q => {
        const g = $('fav-grid');
        g.innerHTML = '';
        const mons = Object.keys(s.owned).map(Number).filter(d => G.DEX_BY[d] && (!q || G.DEX_BY[d].name.toLowerCase().includes(q) || G.T(G.DEX_BY[d].name).toLowerCase().includes(q)));
        for (const d of mons.slice(0, 120)) {
          for (const shiny of G.DB.ownsShiny(d) ? [false, true] : [false]) {
            const c = document.createElement('div');
            c.className = 'cell' + (s.profile.avatarDex === d && !!s.profile.avatarShiny === shiny ? ' sel' : '');
            c.appendChild(G.UI.spriteCanvas(d, 88, 78, { portrait: true, hero: true, shiny, shadow: false }));
            c.insertAdjacentHTML('beforeend', `<b>${shiny ? G.Icons.html('shiny', 12) + ' ' : ''}${esc(G.T(G.DEX_BY[d].name))}</b>`);
            c.onclick = () => {
              s.profile.avatarDex = d;
              s.profile.avatarShiny = shiny;
              save(); tab = 'profile'; render();
            };
            g.appendChild(c);
          }
        }
      };
      $('fav-q').oninput = () => fill($('fav-q').value.trim().toLowerCase());
      fill('');
    }

    function pickFav(i) {
      const s = G.DB.save;
      const box = $('goals-body');
      box.innerHTML = `<div class="row between"><h3>Elige el favorito ${i + 1}</h3>
        <button class="btn small ghost" id="fav-back">Volver</button></div>
        <input class="field" id="fav-q" placeholder="Buscar por nombre" style="max-width:320px;margin:6px 0 10px">
        <div class="grid" id="fav-grid"></div>`;
      $('fav-back').onclick = () => { tab = 'profile'; render(); };
      const fill = q => {
        const g = $('fav-grid');
        g.innerHTML = '';
        const mons = Object.keys(s.owned).map(Number).filter(d => G.DEX_BY[d] && (!q || G.DEX_BY[d].name.toLowerCase().includes(q)));
        for (const d of mons.slice(0, 120)) {
          for (const shiny of G.DB.ownsShiny(d) ? [false, true] : [false]) {
            const c = document.createElement('div');
            c.className = 'cell';
            c.appendChild(G.UI.spriteCanvas(d, 92, 80, { scale: 2, shiny }));
            c.insertAdjacentHTML('beforeend', `<b>${shiny ? G.Icons.html('shiny', 12) + ' ' : ''}${esc(G.DEX_BY[d].name)}</b>`);
            c.onclick = () => {
              s.profile.favs = (s.profile.favs || []).slice();
              s.profile.favs[i] = { dex: d, shiny };
              s.profile.favs = s.profile.favs.filter(Boolean).slice(0, 3);
              save(); tab = 'profile'; render();
            };
            g.appendChild(c);
          }
        }
      };
      $('fav-q').oninput = () => fill($('fav-q').value.trim().toLowerCase());
      fill('');
    }

    function save() {
      G.DB.commit();
      if (G.Social.me) G.Social.publishProfile(true);
      G.Audio.sfx('confirm');
    }

    return { init, open, render };
  })();

  // ======================= PERFIL PÚBLICO =======================

  G.ProfileUI = (() => {
    const T=(es,en,zh)=>G.Server.text(es,en,zh),local=v=>typeof v==='object'&&v?(v[G.I18n.lang]||v.en||''):v||'';
    let request=0;
    function init() {
      $('prof-close').onclick = close;
      $('scr-profile').onclick = e => { if (e.target.id === 'scr-profile') close(); };
    }
    function close() { request++; $('scr-profile').classList.add('hidden'); }

    /** Abre el perfil de otro jugador por su uid. */
    async function show(uid) {
      if (!uid) return;
      if (uid === G.Social.uid && G.DB.mode!=='server') { showData(G.Social.profileData()); return; }
      const current=++request;
      $('prof-body').innerHTML = '<p class="sub">Cargando…</p>';
      $('scr-profile').classList.remove('hidden');
      try {
        const d = await G.Social.getProfile(uid);
        if(current!==request)return;
        if (!d) { $('prof-body').textContent=T('Perfil no disponible.','Profile unavailable.','暂时无法查看这份资料。'); return; }
        showData(d);
      } catch(e) { if(current===request)$('prof-body').textContent=e.message; }
    }

    function showData(d) {
      const b = d.best || {};
      const body = $('prof-body');
      const character = d.character?.preset ? d.character : null;
      const theme = G.CardPacks?.themes.find(t => t.id === d.cardTheme);
      body.classList.toggle('profile-themed', !!theme);
      body.style.setProperty('--card-accent', theme?.color || '#ffd23f');

      const BORDER_MAP = {
        sanctuary: '#53c8ff',
        royal: '#ffd447',
        sakura: '#ff96c5',
        emerald: '#48e29a',
        astral: '#b88cff',
        crimson: '#ff6678'
      };
      const FRAME_MAP = {
        gold: { color: '#ffd447', badge: '✦' },
        crystal: { color: '#5ce1ff', badge: '❖' },
        blossom: { color: '#ff96c8', badge: '❀' },
        flame: { color: '#ff784f', badge: '🔥' },
        starlight: { color: '#c49bff', badge: '★' },
        master: { color: '#52f2b8', badge: '👑' }
      };
      const borderId = BORDER_MAP[d.cardBorder] ? d.cardBorder : 'sanctuary';
      const frameId = FRAME_MAP[d.avatarFrame] ? d.avatarFrame : 'gold';
      const accentColor = /^#[0-9a-f]{6}$/i.test(character?.color || '') ? character.color : (BORDER_MAP[borderId] || '#53c8ff');
      const frameInfo = FRAME_MAP[frameId];
      body.style.setProperty('--prof-accent', accentColor);
      body.style.setProperty('--frame-accent', frameInfo.color);

      const pBox = body.closest('.profile-box');
      if (pBox) {
        pBox.className = 'box profile-box border-' + borderId;
        pBox.style.setProperty('--prof-accent', accentColor);
        pBox.style.setProperty('--frame-accent', frameInfo.color);
      }

      const number = v => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString(G.I18n.lang === 'zh' ? 'zh-CN' : G.I18n.lang === 'en' ? 'en' : 'es');
      const completed = (d.completedDex || []).filter(dex => G.DEX_BY[dex]);
      const avDex = G.DEX_BY[d.avatarDex] ? d.avatarDex : (G.DEX_BY[d.partner] ? d.partner : (d.favs?.[0]?.dex || 25));
      const avShiny = !!d.avatarShiny;
      const fullMedals = Number(b.medals) || 0;
      const abilityMedals = Number(b.abilityMedals) || 0;
      const achCount = Number(b.achCount) || (d.medals?.length || 0);
      const legendCount = Number(b.legends) || 0;
      const totalMedals = fullMedals + abilityMedals + achCount;
      const leagueTier = d.leagueTier || 1;
      const leagueStars = d.leagueStars || 0;
      const displayTitle = character ? local(character.title) : (d.title || (G.I18n.lang === 'zh' ? '星辉下的训练家' : G.I18n.lang === 'en' ? 'Starlight Trainer' : 'Entrenador de la Luz Estelar'));

      body.innerHTML = `
        <div class="prof-hero border-${esc(borderId)}">
          <div class="prof-hero-top">
            <div class="prof-avatar-shell frame-${esc(frameId)}">
              <span class="prof-avatar-ring"></span>
              <canvas id="prof-public-avatar-cv" width="100" height="100"></canvas>
              <span class="prof-avatar-crest">${frameInfo.badge}</span>
            </div>
            <div class="prof-hero-main">
              <div class="prof-kicker-row">
                <span class="prof-kicker">${T('CUADERNO DE AVENTURAS', 'ADVENTURE PASSPORT', '联盟冒险者档案')}</span>
                <span class="prof-rank-pill">R${leagueTier} · ★${leagueStars}${d.championStage ? ` · 🏆${d.championStage}` : ''}</span>
              </div>
              <div class="prof-head">
                <h2 translate="no">${esc(d.name || '???')}</h2>
                ${displayTitle ? `<span class="prof-title"><i>✦</i> ${esc(displayTitle)}</span>` : ''}
              </div>
              <p class="prof-bio">${esc(character ? local(character.bio) : T('Cada compañero guarda una historia. Aquí continúa la aventura.', 'Every partner has a story. The adventure continues here.', '每一位伙伴都珍藏着故事，下一段冒险从这里继续。'))}</p>
              ${character ? `<p class="prof-preset">${T('Ficha de personaje · datos y marcas predefinidos.', 'Preset character profile · curated records and information.', '预设角色档案 · 资料与成绩为预置展示内容。')}</p>` : ''}
            </div>
          </div>

          <div class="prof-medal-ribbon">
            <div class="prof-medal-stat total">
              <span class="pms-ico">${G.Icons.html('trophy', 22)}</span>
              <div><small>${T('Medallas totales', 'Total medals', '勋章总计')}</small><b>${number(totalMedals)}</b></div>
            </div>
            <div class="prof-medal-stat">
              <span class="pms-ico">${G.Icons.html('crown', 22)}</span>
              <div><small>${T('Pokémon 8★', 'Full-medal 8★', '满星通关勋章')}</small><b>${number(fullMedals)}</b></div>
            </div>
            <div class="prof-medal-stat">
              <span class="pms-ico">${G.Icons.html('gem', 22)}</span>
              <div><small>${T('Medallas habilidad', 'Ability medals', '家族特性勋章')}</small><b>${number(abilityMedals)}</b></div>
            </div>
            <div class="prof-medal-stat">
              <span class="pms-ico">${G.Icons.html('medal3', 22)}</span>
              <div><small>${T('Logros / Mitos', 'Achievements / Myths', '成就 / 传说击败')}</small><b>${number(achCount)} / ${number(legendCount)}</b></div>
            </div>
          </div>
        </div>
        <div class="prof-marks">
          <div><span>${T('Colección completa', 'Full-medal Pokémon', '满勋章宝可梦')}</span><b>${number(b.medals)}</b></div>
          <div><span>${T('Puntuación de aventura', 'Adventure score', '冒险最高得分')}</span><b>${b.score ? number(b.score) : '—'}</b></div>
          <div><span>${T('Nivel máximo', 'Highest level', '最高等级')}</span><b>${number(b.level)}</b></div>
          <div><span>${T('Derrotados', 'Pokémon defeated', '累计击败')}</span><b>${number(b.kills)}</b></div>
        </div>
        <h3 class="prof-section-title">${T('Compañeros de aventura', 'Adventure partners', '旅途代表搭档')}</h3>
        <div class="prof-team" id="prof-favs"></div>
        <h3 class="prof-section-title">${T('Galería de victorias', 'Hall of victories', '八星通关伙伴墙')} <small>${number(b.medals)}</small></h3>
        <div class="prof-victories" id="prof-victories"></div>
        <h3 class="prof-ach-title hidden" id="prof-ach-title">${T('Insignias de logro', 'Achievement badges', '荣誉成就勋章陈列')}</h3><div class="prof-medals" id="prof-medals"></div>`;
      const pubAv = $('prof-public-avatar-cv');
      if (pubAv && G.DEX_BY[avDex]) G.UI.sprite(pubAv, avDex, { portrait: true, hero: true, shiny: avShiny, shadow: false });
      if(theme){const badge=document.createElement('span');badge.className='pack-theme-badge';badge.textContent='✦ '+G.CardPacks.local(theme.name);body.querySelector('.prof-hero').append(badge);}
      const favs = $('prof-favs');
      for (const f of (d.favs || []).slice(0, 3)) {
        if (!G.DEX_BY[f.dex]) continue;
        const slot = document.createElement('div');
        slot.className = 'prof-partner';slot.dataset.profDex=f.dex;
        slot.appendChild(G.UI.spriteCanvas(f.dex, 140, 110, { scale: 2, lively: true, shiny: !!f.shiny }));
        slot.insertAdjacentHTML('beforeend', `<b>${f.shiny ? G.Icons.html('shiny', 12) + ' ' : ''}${esc(G.DEX_BY[f.dex].name)}</b><span class="prof-types">${G.UI.typeChips(G.DEX_BY[f.dex].types)}</span>`);
        favs.appendChild(slot);
      }
      favs.style.gridTemplateColumns=`repeat(${Math.max(1,Math.min(3,favs.children.length))},minmax(0,1fr))`;
      if (!favs.children.length) favs.textContent=T('Elige tus favoritos para presentarlos aquí.','Choose favorite Pokémon to feature them here.','选择喜欢的宝可梦，让伙伴们在这里登场。');
      const gallery=$('prof-victories');
      for(const dex of completed.slice(0,12)){
        const tile=document.createElement('div');tile.className='prof-victory';tile.title=G.DEX_BY[dex].name;
        tile.appendChild(G.UI.spriteCanvas(dex,64,54,{scale:1}));
        tile.insertAdjacentHTML('beforeend',`<span>${esc(G.DEX_BY[dex].name)}</span><small>★ VIII</small>`);gallery.appendChild(tile);
      }
      if(!completed.length)gallery.textContent=T('Tu próximo compañero puede ser el primero en reunir las ocho medallas.','Your next partner could be the first to collect all eight medals.','下一位伙伴，也许就是首位集齐八枚勋章的主角。');
      if((b.medals||0)>completed.length){const note=document.createElement('p');note.className='prof-more';note.textContent=T('Más compañeros completados: ','More full-medal partners: ','另有满勋章伙伴：')+number(b.medals-completed.length);gallery.after(note);}
      const med = $('prof-medals');
      for (const id of d.medals || []) {
        const a = G.AchDefs.BY[id];
        if (!a) continue;
        const m = document.createElement('div');
        m.className = 'pm';
        m.title = a.name;
        if (a.dex) m.appendChild(G.UI.spriteCanvas(a.dex, 48, 40, { scale: 1 }));
        else m.innerHTML = G.Icons.html('medal' + a.tier, 36);
        m.insertAdjacentHTML('beforeend', `<small>${esc(a.name)}</small>`);
        med.appendChild(m);
      }
      $('prof-ach-title').classList.toggle('hidden',!med.children.length);
      $('scr-profile').classList.remove('hidden');
    }

    return { init, show, showData };
  })();
})();
