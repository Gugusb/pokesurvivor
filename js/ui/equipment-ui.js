G.EquipmentUI=(()=>{
  function render(parent,dex){
    const s=G.DB.save,section=document.createElement('section');section.className='ability-equipment carried-equipment';
    const title=document.createElement('h4');title.textContent=G.T('Objeto equipado');
    const note=document.createElement('p');note.className='note';note.textContent=G.T('Elige un objeto para esta aventura. Las piedras Mega y Z ocupan el mismo espacio.');
    const select=document.createElement('select');select.id='dex-carried-item';select.setAttribute('aria-label',G.T('Objeto equipado'));
    function option(value,label,disabled=false){const o=document.createElement('option');o.value=value;o.textContent=label;o.disabled=disabled;select.append(o);}
    option('none',G.T('Ninguno'));for(const item of Object.values(G.Items.ACTIVE))option(item.id,G.T(item.name)+' · 0');
    const z=G.ZAccess.allowed(s,dex);
    for(const type of G.ZMoves.TYPES)option('z:'+type,G.ZMovesUI.label(type)+(z?'':' · '+G.T('Requiere permiso Z')), !z);
    for(const f of G.Mega.formsFor(dex))option('mega:'+f.id,G.Mega.label(f.id)+' · '+G.T('Megapiedra')+(G.Mega.owns(s,f.id)?'':' · '+G.T('Sin piedra')),!G.Mega.owns(s,f.id));
    select.value=s.zEquipped?.[dex]?'z:'+s.zEquipped[dex]:s.megaEquipped?.[dex]?'mega:'+s.megaEquipped[dex]:G.Equipment.active(s,dex)||'none';
    const button=document.createElement('button');button.className='btn small';button.textContent=G.T('Equipar');button.id='dex-equip-item';
    button.onclick=()=>{
      if(G.Game.state!=='ui')return;
      const value=select.value,ok=value.startsWith('z:')?G.ZMoves.equip(s,dex,value.slice(2)):value.startsWith('mega:')?G.Mega.equip(s,dex,value.slice(5)):G.Equipment.equip(s,dex,value==='none'?null:value);
      if(ok){G.DB.commit(true);section.remove();render(parent,dex);}
    };
    section.append(title,note,select,button);parent.append(section);return section;
  }
  G.I18n.add({'Objeto equipado':'Held item','Elige un objeto para esta aventura. Las piedras Mega y Z ocupan el mismo espacio.':'Choose a held item. Mega Stones and Z Crystals share this slot.','Requiere permiso Z':'Z permission required'});
  G.I18n.addChinese({'Objeto equipado':'携带道具','Elige un objeto para esta aventura. Las piedras Mega y Z ocupan el mismo espacio.':'挑选一件携带道具。好伤药、Mega 进化石与 Z 招式石共用这个位置。','Requiere permiso Z':'需要 Z 携带权限'});
  return {render};
})();
