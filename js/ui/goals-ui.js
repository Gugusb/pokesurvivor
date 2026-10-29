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

    // ---------------- perfil (editar) ----------------

    function profile(box) {
      const s = G.DB.save;
      s.profile = s.profile || { favs: [], title: '' };
      const P = s.profile;
      box.insertAdjacentHTML('beforeend', `<p class="sub">${G.DB.online ? 'Así te ven los demás jugadores (desde el ranking y la lista de amigos).'
        : 'Tu perfil se publica cuando juegas con una cuenta online.'}</p>
        <h3>Tus 3 Pokémon favoritos</h3>`);
      const favs = document.createElement('div');
      favs.className = 'fav-slots';
      for (let i = 0; i < 3; i++) {
        const f = P.favs[i];
        const slot = document.createElement('div');
        slot.className = 'fav-slot';
        if (f && G.DEX_BY[f.dex]) {
          slot.appendChild(G.UI.spriteCanvas(f.dex, 120, 100, { scale: 2, lively: true, shiny: !!f.shiny }));
          slot.insertAdjacentHTML('beforeend', `<b>${f.shiny ? G.Icons.html('shiny', 12) + ' ' : ''}${esc(G.DEX_BY[f.dex].name)}</b>`);
        } else slot.innerHTML = '<span>Elegir</span>';
        slot.onclick = () => pickFav(i);
        favs.appendChild(slot);
      }
      box.appendChild(favs);

      const titles = G.Progress.titles();
      box.insertAdjacentHTML('beforeend', `<h3 style="margin-top:14px">Título</h3>`);
      const sel = document.createElement('select');
      sel.className = 'field';
      sel.style.maxWidth = '320px';
      sel.innerHTML = `<option value="">(sin título)</option>` + titles.map(t => `<option ${t === P.title ? 'selected' : ''}>${esc(t)}</option>`).join('');
      sel.onchange = () => { P.title = sel.value; save(); };
      box.appendChild(sel);
      if (!titles.length) box.insertAdjacentHTML('beforeend', '<p class="note">Consigue logros para desbloquear títulos.</p>');

      const prev = document.createElement('button');
      prev.className = 'btn gold'; prev.style.marginTop = '16px';
      prev.textContent = 'Ver mi perfil público';
      prev.onclick = () => G.DB.mode==='server' ? G.ProfileUI.show(G.Server.user?.uid) : G.ProfileUI.showData(G.Social.profileData());
      box.appendChild(prev);
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
      const character=d.character?.preset?d.character:null;
      body.style.setProperty('--prof-accent',/^#[0-9a-f]{6}$/i.test(character?.color||'')?character.color:'#ffd23f');
      const number=v=>Math.max(0,Math.floor(Number(v)||0)).toLocaleString(G.I18n.lang==='zh'?'zh-CN':G.I18n.lang==='en'?'en':'es');
      const completed=(d.completedDex||[]).filter(dex=>G.DEX_BY[dex]);
      body.innerHTML = `
        <div class="prof-hero">
          <div class="prof-kicker">${T('CUADERNO DE AVENTURAS','ADVENTURE JOURNAL','冒险档案')}</div>
          <div class="prof-head"><h2 translate="no">${esc(d.name || '???')}</h2>${character||d.title ? `<span class="prof-title">${esc(character?local(character.title):d.title)}</span>` : ''}</div>
          <p class="prof-bio">${esc(character?local(character.bio):T('Cada compañero guarda una historia. Aquí continúa la aventura.','Every partner has a story. The adventure continues here.','每一位伙伴都珍藏着故事，下一段冒险从这里继续。'))}</p>
          ${character?`<p class="prof-preset">${T('Ficha de personaje · datos y marcas predefinidos.','Preset character profile · curated records and information.','预设角色档案 · 资料与成绩为预置展示内容。')}</p>`:''}
        </div>
        <div class="prof-marks">
          <div><span>${T('Colección completa','Full-medal Pokémon','满勋章宝可梦')}</span><b>${number(b.medals)}</b></div>
          <div><span>${T('Puntuación de aventura','Adventure score','冒险最高得分')}</span><b>${b.score?number(b.score):'—'}</b></div>
          <div><span>${T('Nivel máximo','Highest level','最高等级')}</span><b>${number(b.level)}</b></div>
          <div><span>${T('Derrotados','Pokémon defeated','累计击败')}</span><b>${number(b.kills)}</b></div>
        </div>
        <h3 class="prof-section-title">${T('Compañeros de aventura','Adventure partners','旅途搭档')}</h3>
        <div class="prof-team" id="prof-favs"></div>
        <h3 class="prof-section-title">${T('Galería de victorias','Hall of victories','通关伙伴墙')} <small>${number(b.medals)}</small></h3>
        <div class="prof-victories" id="prof-victories"></div>
        <h3 class="prof-ach-title hidden" id="prof-ach-title">${T('Logros','Achievements','成就收藏')}</h3><div class="prof-medals" id="prof-medals"></div>`;
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
