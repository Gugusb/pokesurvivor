G.MegaUI = (() => {
  function renderEquipment(parent, dex) {
    const forms = G.Mega.formsFor(dex), save = G.DB.save;
    if (!forms.length) return;
    const section = document.createElement('section'); section.className = 'ability-equipment mega-equipment';
    section.innerHTML = '<h4>' + G.Icons.html('megaStone', 22) + ' ' + G.T('Megapiedras') + '</h4><p class="note">' +
      G.T('Busca Mega Stones en las grietas.') + '</p>';
    for (const f of forms) {
      const owned = G.Mega.owns(save, f.id), equipped = save.megaEquipped && save.megaEquipped[dex] === f.id;
      const row = document.createElement('div'); row.className = 'ability-medal-row' + (owned ? '' : ' locked');
      row.innerHTML = '<div><b>' + G.Mega.label(f.id) + ' · ' + G.T('Megapiedra') + '</b><p class="note">' + G.UI.typeChips(G.MEGA_TYPES[f.id]) + '</p></div>';
      const btn = document.createElement('button'); btn.className = 'btn small' + (equipped ? ' gold' : '');
      btn.textContent = G.T(!owned ? 'Sin piedra' : equipped ? 'Equipada' : 'Equipar'); btn.disabled = !owned || equipped;
      btn.setAttribute('aria-label', G.T('Equipar') + ' ' + G.Mega.label(f.id) + ' ' + G.T('Megapiedra'));
      btn.onclick = () => {
        if (G.Game.state !== 'ui' || !G.Mega.equip(save, dex, f.id)) return;
        G.DB.commit(true); if(G.ZMovesUI)G.ZMovesUI.refresh(parent,dex);else{const next = renderEquipment(parent, dex); section.replaceWith(next);}
      };
      row.appendChild(btn); section.appendChild(row);
    }
    const off = document.createElement('button'); off.className = 'btn small ghost'; off.textContent = G.T('Quitar piedra');
    off.disabled = !(save.megaEquipped && save.megaEquipped[dex]);
    off.onclick = () => { if (G.Game.state !== 'ui') return; G.Mega.equip(save, dex, null); G.DB.commit(true); if(G.ZMovesUI)G.ZMovesUI.refresh(parent,dex);else{const next = renderEquipment(parent, dex); section.replaceWith(next);} };
    section.appendChild(off);
    const note = document.createElement('p'); note.className = 'note';
    note.textContent = G.T('Equipa una Mega Stone y activa Mega cuando esté listo.');
    section.appendChild(note); parent.appendChild(section); return section;
  }
  G.I18n.add({
    'Megapiedras':'Mega Stones', 'Megapiedra':'Mega Stone', 'Sin piedra':'No stone', 'Quitar piedra':'Unequip stone',
    'Megapiedra obtenida':'Mega Stone obtained', 'Megapiedra ya obtenida':'Mega Stone already owned', 'Lista':'Ready',
    'Objeto convertido en experiencia':'Item converted to experience',
    'Busca Mega Stones en las grietas.':'Find Mega Stones in rifts.',
    'Equipa una Mega Stone y activa Mega cuando esté listo.':'Equip a Mega Stone and activate Mega when ready.'
  });
  G.I18n.addChinese({
    'Megapiedras':'Mega 进化石', 'Megapiedra':'Mega 进化石', 'Sin piedra':'尚未获得', 'Quitar piedra':'卸下进化石',
    'Megapiedra obtenida':'获得 Mega 进化石', 'Megapiedra ya obtenida':'已拥有该 Mega 进化石', 'Lista':'就绪',
    'Objeto convertido en experiencia':'普通道具已转化为经验',
    'Busca Mega Stones en las grietas.':'在裂缝中寻找 Mega 进化石。',
    'Equipa una Mega Stone y activa Mega cuando esté listo.':'装备 Mega 进化石，准备好后即可发动 Mega。'
  });
  return { renderEquipment };
})();
