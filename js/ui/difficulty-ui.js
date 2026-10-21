G.DifficultyUI = (() => {
  function decorate(el, dex) {
    for (const k of ['gold', 'emerald', 'ruby']) el.classList.toggle('victory-' + k, G.Difficulty.frame(G.DB.save, dex) === k);
  }
  function menu() {
    const s = G.DB.save, select = G.UI.$('menu-difficulty'), note = G.UI.$('difficulty-note');
    select.innerHTML = '';
    for (let n = 1; n <= 8; n++) {
      const option = document.createElement('option'); option.value = n;
      option.textContent = n + '★' + (n > G.Difficulty.unlocked(s) ? ' · ' + G.T('Bloqueada') : '');
      option.disabled = n > G.Difficulty.unlocked(s); select.appendChild(option);
    }
    select.value = s.difficulty.selected;
    const update = () => {
      const n=s.difficulty.selected;
      note.style.whiteSpace='pre-line';
      note.textContent=G.T('Recompensas')+' ×'+G.Difficulty.rewards(n).toFixed(2)+'\n'+G.Difficulty.traits(n).map(x=>'• '+G.T(x)).join('\n');
      note.title = G.T('Supera una dificultad para desbloquear la siguiente.');
    };
    select.onchange = () => { if (G.Difficulty.select(s, +select.value)) G.DB.commit(); update(); };
    update(); decorate(G.UI.$('menu-partner'), s.partner);
  }
  function detail(parent, dex) {
    const section = document.createElement('section'); section.className = 'difficulty-record';
    const rows = G.DB.save.difficultyRecords[dex] || {};
    const count = Array.from({length:8},(_,i)=>rows[i+1]?.won).filter(Boolean).length;
    section.classList.toggle('complete',count===8);
    const head = document.createElement('div'); head.className = 'difficulty-record-head';
    const heading = document.createElement('h4'); heading.textContent = G.T('Medallas de dificultad'); head.appendChild(heading);
    const total = document.createElement('span'); total.className = 'difficulty-medal-count'; total.textContent = count + ' / 8';
    total.title = G.T('Medallas conseguidas'); total.setAttribute('aria-label',G.T('Medallas conseguidas')+': '+count+' / 8');
    head.appendChild(total);section.appendChild(head);
    const medals = document.createElement('div'); medals.className = 'difficulty-medals';
    for (let n = 1; n <= 8; n++) {
      const r = rows[n], badge = document.createElement('span');
      badge.className = 'difficulty-medal tier-' + n + (r?.won ? ' won' : '');
      badge.innerHTML = medalArt(n) + '<span class="difficulty-medal-stars">'+n+'<span aria-hidden="true"> ★</span></span>' +
        '<small class="difficulty-medal-state">'+(r?.won?'<span aria-hidden="true">✓ </span>':'')+G.T(r?.won?'Conseguida':'Sin superar')+'</small>';
      badge.title = n + '★ · ' + G.T(r?.won ? 'Victoria' : 'Sin superar') + (r ? ' · ' + G.U.mmss(r.best) : '');
      badge.setAttribute('role','img');badge.setAttribute('aria-label', badge.title);badge.tabIndex=0;medals.appendChild(badge);
    }
    section.appendChild(medals);
    const best = G.Difficulty.highest(G.DB.save, dex), text = document.createElement('p'); text.className = 'note';
    text.textContent = best ? G.T('Récord en la dificultad más alta') + ': ' + best.stars + '★ · ' + G.U.mmss(best.best) : G.T('Sin récord de dificultad');
    section.appendChild(text);
    const hint = document.createElement('p'); hint.className = 'note';
    hint.textContent = G.T('Las victorias mejoran el marco de la Pokédex.');
    section.appendChild(hint); parent.appendChild(section);
  }
  function medalArt(n) {
    const numeral=['I','II','III','IV','V','VI','VII','VIII'][n-1];
    return '<svg class="difficulty-medal-art" viewBox="0 0 80 88" aria-hidden="true" focusable="false">'+
      '<path class="medal-ribbon-shadow" d="M18 3h16l11 26-16 9L14 11zm28 0h16l4 8-15 27-16-9z"/>'+
      '<path class="medal-ribbon" d="M22 4h10l11 26-11 5L18 10zm26 0h10l4 6-14 25-11-5z"/>'+
      '<path class="medal-ribbon-stripe" d="m25 4 13 29 4-2L29 4zm26 0L38 31l4 2L55 4z"/>'+
      '<path class="medal-edge" d="M29 21h22l16 16v23L51 76H29L13 60V37z"/>'+
      '<path class="medal-bevel-light" d="M29 21h22l16 16-6 3-13-13H32L19 40l-6-3z"/>'+
      '<path class="medal-bevel-dark" d="m13 60 6-3 13 13h16l13-13 6 3-16 16H29z"/>'+
      '<path class="medal-face" d="M32 28h16l12 12v17L48 69H32L20 57V40z"/>'+
      '<path class="medal-engraving" d="M32 31h16l9 10v15l-10 10H33L23 56V41z"/>'+
      '<g class="medal-laurel" fill="none" stroke-width="1.5" stroke-linecap="square">'+
      '<path d="M29 61q-11-11-3-23m-2 15-4-2m4-3-4-4m5 0-2-5m28 22q11-11 3-23m2 15 4-2m-4-3 4-4m-5 0 2-5"/></g>'+
      '<path class="medal-star" d="m40 32 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1z"/>'+
      '<text class="medal-numeral" x="40" y="59" text-anchor="middle">'+numeral+'</text>'+
      '<path class="medal-glint" d="m20 29 2-5 2 5 5 2-5 2-2 5-2-5-5-2z"/>'+
      '</svg>';
  }
  G.I18n.add({
    'Dificultad': 'Difficulty', 'Bloqueada': 'Locked', 'Las estrellas más altas son más difíciles.': 'Higher stars are more difficult.',
    'Dificultad superada': 'Difficulty cleared', 'Victoria': 'Victory', 'Sin superar': 'Not cleared',
    'Medallas de dificultad': 'Difficulty medals', 'Medallas conseguidas': 'Medals earned', 'Conseguida': 'Earned', 'Récord en la dificultad más alta': 'Best time at highest attempted difficulty',
    'Sin récord de dificultad': 'No difficulty record yet', 'Limitada por el desbloqueo del equipo': 'Limited by the team’s shared unlocks',
    'Velocidad de juego': 'Game speed', 'Velocidad: 1×': 'Speed: 1×', 'En grupo, sólo el anfitrión cambia la velocidad.': 'In co-op, only the host changes speed.',
    'Supera una dificultad para desbloquear la siguiente.': 'Clear a difficulty to unlock the next one.',
    'Las victorias mejoran el marco de la Pokédex.': 'Victories improve the Pokédex frame.'
  });
  G.I18n.addChinese({
    'Dificultad': '难度', 'Bloqueada': '未解锁', 'Las estrellas más altas son más difíciles.': '星级越高，挑战越难。',
    'Dificultad superada': '难度通关', 'Victoria': '胜利', 'Sin superar': '未通关',
    'Medallas de dificultad': '难度奖牌', 'Medallas conseguidas': '已获得奖牌', 'Conseguida': '已获得', 'Récord en la dificultad más alta': '挑战过的最高难度纪录',
    'Sin récord de dificultad': '暂无难度纪录', 'Limitada por el desbloqueo del equipo': '受全队共同解锁进度限制',
    'Velocidad de juego': '游戏速度', 'Velocidad: 1×': '游戏速度：1×', 'En grupo, sólo el anfitrión cambia la velocidad.': '联机速度由房主统一设置。',
    'Supera una dificultad para desbloquear la siguiente.': '通关一个难度后解锁下一个难度。',
    'Las victorias mejoran el marco de la Pokédex.': '胜利会提升图鉴边框。'
  });
  return { menu, detail, decorate };
})();
