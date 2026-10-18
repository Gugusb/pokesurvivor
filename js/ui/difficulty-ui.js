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
    const heading = document.createElement('h4'); heading.textContent = G.T('Medallas de dificultad'); section.appendChild(heading);
    const medals = document.createElement('div'); medals.className = 'difficulty-medals';
    const rows = G.DB.save.difficultyRecords[dex] || {};
    for (let n = 1; n <= 8; n++) {
      const r = rows[n], badge = document.createElement('span');
      badge.className = 'difficulty-medal' + (r?.won ? ' won' : ''); badge.textContent = n + '★';
      badge.title = n + '★ · ' + G.T(r?.won ? 'Victoria' : 'Sin superar') + (r ? ' · ' + G.U.mmss(r.best) : '');
      badge.setAttribute('aria-label', badge.title); medals.appendChild(badge);
    }
    section.appendChild(medals);
    const best = G.Difficulty.highest(G.DB.save, dex), text = document.createElement('p'); text.className = 'note';
    text.textContent = best ? G.T('Récord en la dificultad más alta') + ': ' + best.stars + '★ · ' + G.U.mmss(best.best) : G.T('Sin récord de dificultad');
    section.appendChild(text);
    const hint = document.createElement('p'); hint.className = 'note';
    hint.textContent = G.T('Las victorias mejoran el marco de la Pokédex.');
    section.appendChild(hint); parent.appendChild(section);
  }
  G.I18n.add({
    'Dificultad': 'Difficulty', 'Bloqueada': 'Locked', 'Las estrellas más altas son más difíciles.': 'Higher stars are more difficult.',
    'Dificultad superada': 'Difficulty cleared', 'Victoria': 'Victory', 'Sin superar': 'Not cleared',
    'Medallas de dificultad': 'Difficulty medals', 'Récord en la dificultad más alta': 'Best time at highest attempted difficulty',
    'Sin récord de dificultad': 'No difficulty record yet', 'Limitada por el desbloqueo del equipo': 'Limited by the team’s shared unlocks',
    'Velocidad de juego': 'Game speed', 'Velocidad: 1×': 'Speed: 1×', 'En grupo, sólo el anfitrión cambia la velocidad.': 'In co-op, only the host changes speed.',
    'El ranking original sólo acepta partidas limpias de 4 estrellas a velocidad normal.': 'The original leaderboard only accepts clean 4-star runs played entirely at normal speed.',
    'Supera una dificultad para desbloquear la siguiente.': 'Clear a difficulty to unlock the next one.',
    'Las victorias mejoran el marco de la Pokédex.': 'Victories improve the Pokédex frame.'
  });
  G.I18n.addChinese({
    'Dificultad': '难度', 'Bloqueada': '未解锁', 'Las estrellas más altas son más difíciles.': '星级越高，挑战越难。',
    'Dificultad superada': '难度通关', 'Victoria': '胜利', 'Sin superar': '未通关',
    'Medallas de dificultad': '难度奖牌', 'Récord en la dificultad más alta': '挑战过的最高难度纪录',
    'Sin récord de dificultad': '暂无难度纪录', 'Limitada por el desbloqueo del equipo': '受全队共同解锁进度限制',
    'Velocidad de juego': '游戏速度', 'Velocidad: 1×': '游戏速度：1×', 'En grupo, sólo el anfitrión cambia la velocidad.': '联机速度由房主统一设置。',
    'El ranking original sólo acepta partidas limpias de 4 estrellas a velocidad normal.': '原版排行榜仅接收未使用调试、全程一倍速的四星难度成绩。',
    'Supera una dificultad para desbloquear la siguiente.': '通关一个难度后解锁下一个难度。',
    'Las victorias mejoran el marco de la Pokédex.': '胜利会提升图鉴边框。'
  });
  return { menu, detail, decorate };
})();
