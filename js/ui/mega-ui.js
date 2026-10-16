G.MegaUI = (() => {
  function renderEquipment(parent, dex) {
    const forms = G.Mega.formsFor(dex), save = G.DB.save;
    if (!forms.length) return;
    const section = document.createElement('section'); section.className = 'ability-equipment';
    section.innerHTML = '<h4>' + G.Icons.html('megaStone', 22) + ' ' + G.T('Megapiedras') + '</h4><p class="note">' +
      G.T('Un 20% de las grietas contienen un jefe Mega. Al vencerlo, hay un 5% de obtener su piedra permanente. Sustituye el objeto equipado: los objetos recogidos se convierten en experiencia.') + '</p>';
    for (const f of forms) {
      const owned = G.Mega.owns(save, f.id), equipped = save.megaEquipped && save.megaEquipped[dex] === f.id;
      const row = document.createElement('div'); row.className = 'ability-medal-row' + (owned ? '' : ' locked');
      row.innerHTML = '<div><b>' + G.Mega.label(f.id) + ' · ' + G.T('Megapiedra') + '</b><p class="note">' + G.UI.typeChips(G.MEGA_TYPES[f.id]) + '</p></div>';
      const btn = document.createElement('button'); btn.className = 'btn small' + (equipped ? ' gold' : '');
      btn.textContent = G.T(!owned ? 'Sin piedra' : equipped ? 'Equipada' : 'Equipar'); btn.disabled = !owned || equipped;
      btn.setAttribute('aria-label', G.T('Equipar') + ' ' + G.Mega.label(f.id) + ' ' + G.T('Megapiedra'));
      btn.onclick = () => {
        if (G.Game.state !== 'ui' || !G.Mega.equip(save, dex, f.id)) return;
        G.DB.commit(true); const next = renderEquipment(parent, dex); section.replaceWith(next);
      };
      row.appendChild(btn); section.appendChild(row);
    }
    const off = document.createElement('button'); off.className = 'btn small ghost'; off.textContent = G.T('Quitar piedra');
    off.disabled = !(save.megaEquipped && save.megaEquipped[dex]);
    off.onclick = () => { if (G.Game.state !== 'ui') return; G.Mega.equip(save, dex, null); G.DB.commit(true); const next = renderEquipment(parent, dex); section.replaceWith(next); };
    section.appendChild(off);
    const note = document.createElement('p'); note.className = 'note';
    note.textContent = G.T('Pulsa F o el botón Mega al cargar 120 de energía. +1/s y bonus por derrotas. Dura 60s sin recargar; al cambiar conserva el porcentaje de vida.');
    section.appendChild(note); parent.appendChild(section); return section;
  }
  G.I18n.add({
    'Megapiedras':'Mega Stones', 'Megapiedra':'Mega Stone', 'Sin piedra':'No stone', 'Quitar piedra':'Unequip stone',
    'Megapiedra obtenida':'Mega Stone obtained', 'Megapiedra ya obtenida':'Mega Stone already owned', 'Lista':'Ready',
    'Objeto convertido en experiencia':'Item converted to experience',
    'Un 20% de las grietas contienen un jefe Mega. Al vencerlo, hay un 5% de obtener su piedra permanente. Sustituye el objeto equipado: los objetos recogidos se convierten en experiencia.':'20% of rifts contain a Mega boss with a 5% stone drop chance. The permanent stone replaces the held item: collected items become experience.',
    'Pulsa F o el botón Mega al cargar 120 de energía. +1/s y bonus por derrotas. Dura 60s sin recargar; al cambiar conserva el porcentaje de vida.':'Press F or the Mega button at 120 energy. +1/s plus kill bonuses. Lasts 60s with no recharge; changing form preserves HP percentage.'
  });
  G.I18n.addChinese({
    'Megapiedras':'Mega 进化石', 'Megapiedra':'Mega 进化石', 'Sin piedra':'尚未获得', 'Quitar piedra':'卸下进化石',
    'Megapiedra obtenida':'获得 Mega 进化石', 'Megapiedra ya obtenida':'已拥有该 Mega 进化石', 'Lista':'就绪',
    'Objeto convertido en experiencia':'普通道具已转化为经验',
    'Un 20% de las grietas contienen un jefe Mega. Al vencerlo, hay un 5% de obtener su piedra permanente. Sustituye el objeto equipado: los objetos recogidos se convierten en experiencia.':'裂缝有 20% 概率遇到 Mega 首领；击败后有 5% 概率获得永久进化石。携带后替代普通道具栏；拾取普通道具转为当前等级所需基础经验的 25%，适用经验倍率。',
    'Pulsa F o el botón Mega al cargar 120 de energía. +1/s y bonus por derrotas. Dura 60s sin recargar; al cambiar conserva el porcentaje de vida.':'能量达到 120 后按 F 或点击 Mega 按钮。每秒 +1，击杀额外充能。变身持续 60 秒，期间停止充能；变身与还原均保持当前生命比例。'
  });
  return { renderEquipment };
})();
