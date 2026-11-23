/* ============ gacha-ui.js — banners por generación y animación de tirada ============
 * La lógica (probabilidades, pity, shiny, repetidos) está en systems/gacha.js.
 */
G.GachaUI = (() => {
  const $ = G.UI.$;
  let busy = false;
  let gen = 1;
  let mode = 'pokemon';

  function init() {
    $('pull-1').onclick = () => pull(1);
    $('pull-10').onclick = () => pull(10, 't1');
    $('pull-100').onclick=()=>pull(100,'auto');
    $('pull-10b').onclick = () => pull(10, 't10');
    $('pull-close').onclick = close;
    $('gacha-pokemon-mode').onclick = () => open('pokemon');
    $('gacha-ability-mode').onclick = () => open('ability');

    const tabs = $('gacha-gens');
    G.Gacha.BANNERS.forEach(b => {
      const t = document.createElement('button');
      t.className = 'gen-tab';
      t.dataset.gen = b.gen;
      t.innerHTML = `<b>${b.name}</b><small>Gen ${b.gen}</small>`;
      t.onclick = () => { gen = b.gen; refresh(); };
      tabs.appendChild(t);
    });
  }

  function open(nextMode = 'pokemon') {
    if (busy || !$('pull-fx').classList.contains('hidden')) return;
    mode = nextMode;
    if (mode === 'ability' && !G.AbilityGacha.GENS.includes(gen)) gen = 1;
    G.UI.show('scr-gacha', true);
    refresh();
  }

  function refresh() {
    const ability = mode === 'ability';
    $('gacha-heading').textContent = ability ? 'Gacha de habilidades' : 'Gacha';
    $('gacha-pokemon-mode').classList.toggle('on', !ability);
    $('gacha-ability-mode').classList.toggle('on', ability);
    $('ability-medals').classList.toggle('hidden', !ability);
    $('pull-10b').classList.toggle('hidden', ability);
    document.querySelectorAll('#gacha-gens .gen-tab').forEach(t => t.classList.toggle('hidden', ability && !G.AbilityGacha.GENS.includes(+t.dataset.gen)));
    if (ability) { refreshAbilities(); return; }
    const s = G.DB.save;
    const banner = G.Gacha.BANNERS[gen - 1];
    document.querySelectorAll('#gacha-gens .gen-tab').forEach(t => t.classList.toggle('on', +t.dataset.gen === gen));

    const all = G.DEX.filter(p => p.gen === gen);
    const owned = all.filter(p => s.owned[p.dex]).length;
    const shinies = all.filter(p => s.shiny && s.shiny[p.dex]).length;
    const [c1, c2, c3] = banner.color;
    $('banner').style.background =
      `radial-gradient(circle at 80% 30%, rgba(255,210,63,.3), transparent 45%),
       radial-gradient(circle at 15% 80%, rgba(196,123,255,.3), transparent 50%),
       linear-gradient(135deg, ${c1}, ${c2} 55%, ${c3})`;
    $('banner-title').textContent = banner.name + ' Misterioso';
    $('banner-desc').textContent = `Los ${all.length} Pokémon de la generación ${gen}. ¡Los legendarios esperan!`;
    $('gacha-owned').innerHTML = `Tienes ${owned} de ${all.length}` +
      (shinies ? ` · ${G.Icons.html('shiny', 12)} ${shinies} shiny` : '');

    const feat = $('gacha-feat');
    feat.innerHTML = '';
    for (const dex of G.Gacha.featured(gen)) {
      feat.appendChild(G.UI.spriteCanvas(dex, 170, 190, { lively: true, scale: 2, dir: 1 }));
    }

    const pity = (s.pity && s.pity[gen]) || 0;
    $('gacha-pity').textContent = `Tiradas sin legendaria en ${banner.name}: ${pity} / ${G.Gacha.PITY_5}`;

    $('gacha-rates').innerHTML = '<h3>Probabilidades</h3>' + G.Gacha.RATES.slice().reverse().map(([r, w]) => `
      <div><span style="color:${G.Gacha.RARITY_COLOR[r]}">${G.UI.stars(r, 10)} ${G.Gacha.RARITY_NAME[r]}</span>
      <span>${w}% · ${G.Gacha.pool(r, gen).length}</span></div>`).join('') +
      `<p class="note">${G.T('Las tiradas entregan invitaciones para usar al Pokémon como capitán; si ya lo tienes, se convierten en monedas.')}</p>`;

    const t = s.tickets;
    $('cost-1').innerHTML = `${G.Icons.html('ticket', 18)} 1`;
    $('cost-10').innerHTML = `${G.Icons.html('ticket', 18)} 10`;
    $('cost-10b').innerHTML = `${G.Icons.html('ticket10', 18)} 1`;
    $('gacha-tickets').innerHTML = `Tienes ${G.Icons.html('ticket', 18)} <b>${t.t1}</b> tickets y ${G.Icons.html('ticket10', 18)} <b>${t.t10}</b> tickets ×10`;
    $('pull-1').disabled = !G.Gacha.costOf(s, 1);
    $('pull-10').disabled = !G.Gacha.costOf(s, 10, 't1');
    $('pull-10b').disabled = !G.Gacha.costOf(s, 10, 't10');$('pull-100').disabled=!G.Gacha.costOf(s,100);const tens=Math.min(10,t.t10),singles=100-tens*10;$('cost-100').innerHTML=[tens?G.Icons.html('ticket10',18)+' '+tens:'',singles?G.Icons.html('ticket',18)+' '+singles:''].filter(Boolean).join(' + ');
    G.UI.refreshCoins();
  }

  G.I18n.add({
    'Las tiradas entregan invitaciones para usar al Pokémon como capitán; si ya lo tienes, se convierten en monedas.': 'Pulls grant invitations to deploy that Pokémon as captain; duplicates convert into PokéCoins.',
    '¡BOLA DORADA!': 'GOLDEN BALL!', 'Invitación': 'Invitation', '¡NUEVA INVITACIÓN!': 'NEW INVITATION!'
  });
  G.I18n.addChinese({
    'Las tiradas entregan invitaciones para usar al Pokémon como capitán; si ya lo tienes, se convierten en monedas.': '抽卡获得对应宝可梦的“邀请函”（可作为队长出战）；若已拥有该宝可梦，则自动转化为宝可梦币。',
    '¡BOLA DORADA!': '金色精灵球！', 'Invitación': '邀请函', '¡NUEVA INVITACIÓN!': '新邀请函！'
  });

  const wait = ms => new Promise(r => setTimeout(r, ms));

  function medalArt(dex, size = 120) {
    const art = document.createElement('div');
    art.className = 'ability-medal-art';
    art.style.width = size + 'px';
    art.style.height = size + 'px';
    art.appendChild(G.UI.spriteCanvas(dex, size, size, { scale: 2 }));
    art.insertAdjacentHTML('beforeend', '<span>' + G.Icons.html('medal3', 36) + '</span>');
    return art;
  }

  function renderEquipment(parent, dex) {
    const save = G.DB.save, mon = G.DEX_BY[dex];
    const section = document.createElement('div');
    section.className = 'ability-equipment';
    section.innerHTML = '<h3>' + mon.name + ' · Habilidades</h3><p class="note">Sólo una medalla equipada por Pokémon.</p>';
    for (const medal of G.AbilityDefs.medalsFor(dex)) {
      const owned = !!save.abilityMedals[medal.id];
      const equipped = medal.leader?owned:save.abilityEquipped[dex] === medal.id;
      const row = document.createElement('div');
      row.className = 'ability-medal-row' + (owned ? '' : ' locked');
      row.innerHTML = '<div><b>' + G.Icons.html('medal3', 18) + ' ' + medal.name + '</b><p class="note">' + medal.desc + '</p></div>';
      const btn = document.createElement('button');
      btn.className = 'btn small' + (equipped ? ' gold' : '');
      btn.textContent = medal.leader?(owned?G.T('Disponible'):G.T('Sin medalla')):!owned ? 'Sin medalla' : equipped ? 'Equipada' : 'Equipar';
      btn.disabled = !owned || equipped;
      btn.setAttribute('aria-label', G.T('Equipar') + ' ' + mon.name + ' ' + G.T(medal.name));
      btn.onclick = () => {
        if (!G.Abilities.equip(save, dex, medal.id)) return;
        G.DB.commit(true);
        const replacement = renderEquipment(parent, dex);
        section.replaceWith(replacement);
      };
      row.appendChild(btn); section.appendChild(row);
    }
    const off = document.createElement('button');
    off.className = 'btn small ghost'; off.textContent = 'Sin habilidad';
    off.disabled = !save.abilityEquipped[dex];
    off.onclick = () => {
      G.Abilities.equip(save, dex, null); G.DB.commit(true);
      const replacement = renderEquipment(parent, dex); section.replaceWith(replacement);
    };
    section.appendChild(off);const leaderCard=G.LeaderAbilitiesUI?.card(dex,1);if(leaderCard)section.append(leaderCard);parent.appendChild(section);
    return section;
  }

  function refreshAbilities() {
    const s = G.DB.save;
    const banner = G.Gacha.BANNERS[gen - 1], species = G.AbilityDefs.SPECIES.filter(d => G.DEX_BY[d].gen === gen);
    document.querySelectorAll('#gacha-gens .gen-tab').forEach(t => t.classList.toggle('on', +t.dataset.gen === gen));
    $('banner').style.background = 'linear-gradient(135deg, #3a1d6e, #1b2f78 55%, #0f4d6e)';
    $('banner-title').textContent = banner.name + ' · Medallas de habilidad';
    const complete = G.AbilityGacha.pool(5, gen).every(p => G.AbilityDefs.medalsFor(p.dex).length);
    $('banner-desc').textContent = complete ? 'Las especies de cinco estrellas dan medallas de habilidad. El resto da Pokémon.' : 'Sólo las especies con habilidades disponibles dan medallas; las demás dan Pokémon.';
    const medals = G.AbilityDefs.LIST.filter(m => G.DEX_BY[m.dex].gen === gen);
    $('gacha-owned').textContent = 'Medallas: ' + medals.filter(m => s.abilityMedals[m.id]).length + ' / ' + medals.length;
    const feat = $('gacha-feat'); feat.innerHTML = '';
    for (const dex of species.slice(-3)) feat.appendChild(medalArt(dex));
    $('gacha-pity').textContent = 'Tiradas sin legendaria en ' + banner.name + ': ' + (s.abilityPity[gen] || 0) + ' / ' + G.Gacha.PITY_5;
    $('gacha-rates').innerHTML = '<h3>Probabilidades</h3>' + G.Gacha.RATES.slice().reverse().map(([r, w]) =>
      '<div><span style="color:' + G.Gacha.RARITY_COLOR[r] + '">' + G.UI.stars(r, 10) + ' ' + G.Gacha.RARITY_NAME[r] + '</span><span>' + w + '%</span></div>').join('') +
      '<p class="note">' + G.T('Cada especie conserva su probabilidad. Sus medallas se reparten por igual.') + '<br>· ' + G.T('La tirada ×10 y la garantía siguen activas.') + '<br>· ' + G.T('Las medallas repetidas se convierten en Pokémonedas.') + '<br>· ' + G.T('Los premios Pokémon pueden ser shiny; las medallas no.') + '<br>· ' + G.T('Las gemas de habilidad se consiguen en las grietas.') + '</p>';
    $('cost-1').innerHTML = G.Icons.html('gem', 18) + ' 1';
    $('cost-10').innerHTML = G.Icons.html('gem', 18) + ' 10';
    $('gacha-tickets').innerHTML = G.Icons.html('gem', 18) + ' <b>' + s.abilityGems + '</b> Gemas de habilidad';
    $('pull-1').disabled = !G.AbilityGacha.costOf(s, 1);
    $('pull-10').disabled = !G.AbilityGacha.costOf(s, 10);$('pull-100').disabled=!G.AbilityGacha.costOf(s,100);$('cost-100').textContent='100 '+G.T('Gemas de habilidad');
    const inventory = $('ability-medals'); inventory.innerHTML = '';
    for (const dex of species) renderEquipment(inventory, dex);
    G.UI.refreshCoins();
  }

  async function playGoldenEvolution(r) {
    const mon = G.DEX_BY[r.dex];
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(255,215,0,.35),rgba(10,12,24,.95));color:#fff;text-align:center;animation:fadeIn .25s ease';
    const ball = document.createElement('div');
    ball.style.cssText = 'width:96px;height:96px;border-radius:50%;border:4px solid #ffe066;background:linear-gradient(180deg,#ffd700 48%,#222 48%,#222 54%,#fff7cc 54%);box-shadow:0 0 40px #ffd700;transition:transform .5s ease,box-shadow .5s ease';
    const label = document.createElement('div');
    label.style.cssText = 'margin-top:20px;font-size:20px;font-weight:700;letter-spacing:1px;color:#ffe680';
    label.textContent = G.T('Invitación') + '…';
    overlay.append(ball, label);
    document.body.appendChild(overlay);
    G.Audio.sfx('legend');
    await wait(350);
    ball.style.transform = 'scale(1.25) rotate(12deg)';
    ball.style.boxShadow = '0 0 70px #fff4a3';
    label.textContent = G.T('¡BOLA DORADA!');
    await wait(550);
    ball.style.transform = 'scale(0.1)';
    ball.style.opacity = '0';
    await wait(250);
    ball.replaceWith(G.UI.spriteCanvas(r.dex, 160, 160, { lively: true, scale: 3, shiny: !!r.shiny }));
    label.textContent = (r.shiny ? '★ ' : '') + mon.name;
    G.Audio.sfx(r.shiny ? 'shinyGet' : 'reveal', { rarity: 5 });
    await wait(1100);
    overlay.remove();
  }

  async function pull(n, use = 't1') {
    if (busy) return;
    const res = mode === 'ability' ? G.AbilityGacha.pull(G.DB.save, n, gen) : G.Gacha.pull(G.DB.save, n, gen, use);
    if (!res) { G.Audio.sfx('error'); G.UI.toast(mode === 'ability' ? 'No tienes gemas suficientes: derrota jefes de grietas' : 'No tienes tickets suficientes: consíguelos jugando'); return; }
    G.Progress.checkAch();
    G.DB.commit(true);
    busy = true;

    const best = Math.max(...res.map(r => r.rarity));
    const fx = $('pull-fx'), slot = $('slot'), out = $('pull-results');
    out.innerHTML = '';
    $('pull-close').classList.add('hidden');
    slot.style.display = '';
    fx.classList.remove('hidden');

    // La tragaperras (ui/slots.js) y luego las cartas.
    await G.Slots.play(slot, res);
    G.Audio.sfx('burst', { rarity: best });
    slot.style.display = 'none';

    for (const r of res) {
      if (r.goldenBall) await playGoldenEvolution(r);
      const mon = G.DEX_BY[r.dex];
      const c = document.createElement('div');
      c.className = 'pcard r' + r.rarity + (r.shiny ? ' shiny' : '') + (r.goldenBall ? ' golden-ball' : '');
      c.style.setProperty('--rc', r.goldenBall ? '#ffd700' : r.shiny ? '#9ae6ff' : G.Gacha.RARITY_COLOR[r.rarity]);
      c.innerHTML = `<div class="stars">${G.UI.stars(r.rarity, 24)}</div>`;
      if (r.medal) c.appendChild(medalArt(r.dex));
      else {
        const art = document.createElement('div'); art.className = 'iv-improved-art';
        art.appendChild(G.UI.spriteCanvas(r.dex, 132, 120, { lively: r.rarity >= 4 || r.shiny || r.goldenBall, scale: 2, shiny: r.shiny }));
        if (r.ivUp) art.insertAdjacentHTML('beforeend', '<span class="iv-up" title="' + G.T('IV mejorados') + '" aria-label="' + G.T('IV mejorados') + '">↑</span>');
        c.appendChild(art);
      }
      const tag = r.goldenBall
        ? `<span class="new">${r.shiny ? '¡SHINY NUEVO!' : G.T('¡BOLA DORADA!')}</span>`
        : r.invitation
          ? `<span class="new">${r.isNew ? G.T('¡NUEVA INVITACIÓN!') : G.T('Invitación') + ' ×' + (r.invites || 1)}</span>`
          : r.isNew
            ? `<span class="new">¡NUEVO!</span>`
            : `Repetido · <span class="coin"></span> +${r.refund}`;
      const medal = r.medal && G.AbilityDefs.BY_ID[r.medal];
      c.insertAdjacentHTML('beforeend', `<b>${r.shiny ? G.Icons.html('shiny', 12) + ' ' : ''}${mon.name}${medal ? ' · ' + medal.name : ''}</b>${medal ? '<small>Medalla de habilidad</small>' : ''}<div class="tag">${tag}</div>`);
      out.appendChild(c);
      G.Audio.sfx('reveal', { rarity: r.rarity });
      await wait(n === 10 ? 150 : 0);
    }
    $('pull-close').classList.remove('hidden');
    busy = false;
  }

  function close() {
    $('pull-fx').classList.add('hidden');
    refresh();
  }

  return { init, open, refresh, renderEquipment, get open_() { return !$('pull-fx').classList.contains('hidden'); } };
})();
