G.ZMovesUI = (() => {
  const label = type => G.T(G.U.TYPE_NAME[type]) + ' Z';
  function renderEquipment(parent,dex) {
    const save=G.DB.save,types=G.ZMoves.TYPES.filter(t=>G.ZMoves.owns(save,t));if(!types.length)return;
    const section=document.createElement('section');section.className='ability-equipment z-equipment';
    const title=document.createElement('h4');title.textContent=G.T('Cristales Z');section.appendChild(title);
    const note=document.createElement('p');note.className='note';note.textContent=G.T('Comparte espacio con la megapiedra.');section.appendChild(note);
    const select=document.createElement('select');select.setAttribute('aria-label',G.T('Cristal Z'));
    for(const type of types){const o=document.createElement('option');o.value=type;o.textContent=label(type);select.appendChild(o);}
    const current=save.zEquipped?.[dex];if(current)select.value=current;
    const button=document.createElement('button');button.className='btn small';button.textContent=G.T('Equipar cristal Z');
    button.onclick=()=>{if(G.Game.state==='ui'&&G.ZMoves.equip(save,dex,select.value)){G.DB.commit(true);refresh(parent,dex);}};
    const off=document.createElement('button');off.className='btn small ghost';off.textContent=G.T('Quitar cristal Z');off.disabled=!current;
    off.onclick=()=>{if(G.Game.state==='ui'){G.ZMoves.equip(save,dex,null);G.DB.commit(true);refresh(parent,dex);}};
    const status=document.createElement('p');status.className='note';status.textContent=current?G.T('Equipada')+': '+label(current):G.T('Sin piedra');
    section.append(select,button,off,status);parent.appendChild(section);return section;
  }
  function refresh(parent,dex){parent.querySelectorAll('.z-equipment,.mega-equipment').forEach(e=>e.remove());G.MegaUI.renderEquipment(parent,dex);renderEquipment(parent,dex);}
  G.I18n.add({'Cristales Z':'Z Crystals','Cristal Z':'Z Crystal','Comparte espacio con la megapiedra.':'Shares its slot with the Mega Stone.',
    'No hay movimientos Z compatibles.':'No compatible Z moves are available.',
    'Equipar cristal Z':'Equip Z Crystal','Quitar cristal Z':'Unequip Z Crystal','Elegir Z':'Choose Z','Lanzando Z':'Casting Z'});
  G.I18n.addChinese({'Cristales Z':'Z 招式石','Cristal Z':'Z 招式石','Comparte espacio con la megapiedra.':'与 Mega 进化石共用装备槽位。',
    'No hay movimientos Z compatibles.':'当前没有匹配属性且已开放的 Z 招式。',
    'Equipar cristal Z':'装备 Z 招式石','Quitar cristal Z':'卸下 Z 招式石','Elegir Z':'选择 Z 招式','Lanzando Z':'Z 招式释放中'});
  return {renderEquipment,refresh,label};
})();
