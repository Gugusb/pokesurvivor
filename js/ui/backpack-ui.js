/* Inventory is read-only. Cooperative play never requests a team pause. */
G.BackpackUI=(()=>{
  const $=id=>document.getElementById(id),T=s=>G.T(s),fmt=n=>G.PlayerStats.fmt(n);
  let last=0;
  function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  function init(){
    $('backpack-open').innerHTML=G.Icons.html('bag',26)+'<kbd>E</kbd>';
    $('backpack-open').onclick=()=>G.Game.toggleBackpack();$('backpack-close').onclick=()=>G.Game.toggleBackpack();
  }
  function item(parent,id,n=1){const it=G.Items.BY[id];if(!it)return;const row=node('div','bag-item');row.innerHTML=G.Icons.html(G.Items.icon(id),26);row.append(node('strong','',T(it.name)+(n>1?' ×'+n:'')),node('small','',T(it.desc)));parent.append(row);}
  function refresh(p){
    if(!p)return;
    $('backpack-mode').textContent=T(G.Coop.active?'El combate continúa':'Partida en pausa');
    const portrait=$('backpack-portrait');if(portrait.dataset.dex!==String(p.mon.dex)||portrait.dataset.mega!==String(!!G.Mega?.active(p))){portrait.replaceChildren(G.UI.spriteCanvas(p.spriteDex||p.mon.dex,112,96,{scale:2,shiny:!!p.shiny}));portrait.dataset.dex=p.mon.dex;portrait.dataset.mega=!!G.Mega?.active(p);}
    $('backpack-name').textContent=T(p.mon.name)+' · '+T('Nivel')+' '+p.level;
    $('backpack-vital').textContent=T('Vida')+' '+fmt(p.hp)+' / '+fmt(p.maxHp)+' · '+T('PP de reserva')+' '+fmt(p.tempPP||0);
    const stats=$('backpack-stats');stats.replaceChildren();
    for(const r of G.PlayerStats.rows(p)){
      const row=node('div','bag-stat');row.dataset.stat=r.key;
      row.append(node('strong','',T(r.name)),node('b','bag-total',fmt(r.total)));
      const equation=node('div','bag-equation');equation.append(node('span','bag-base','= '+fmt(r.base)));
      for(const [key,title]of [['permanent','Mejoras permanentes'],['fruit','Bayas'],['skills','Movimientos'],['other','Otros efectos']]){const el=node('span','bag-'+key,'('+(r[key]>=0?'+':'')+fmt(r[key])+')');el.title=T(title);equation.append(el);}
      row.append(equation,node('small','bag-battle',r.battle));stats.append(row);
    }
    $('backpack-def-note').textContent=T('Reducción adicional')+' '+fmt(p.reduction*100)+'% · '+T('Recuperación al usar')+' '+fmt(.7/p.ppInterval)+' PP/s · '+T('Sin usar')+' '+fmt(1.5*(G.Abilities.has(p,'innerfocus')?1.2:1)/p.ppInterval)+' PP/s';
    const moves=$('backpack-moves'),existing=new Map([...moves.children].map(el=>[el.dataset.move,el]));
    p.slots.forEach((group,i)=>group.forEach(m=>{
      const info=G.PlayerStats.move(p,m),old=existing.get(m.id);if(old){old.querySelector('.bag-pp').textContent=fmt(info.pp.current)+' / '+info.pp.max+' PP';if(old.matches(':hover')||old.open)return;}const row=node('details','bag-move'),title=node('summary','');row.dataset.move=m.id;
      title.append(node('span','bag-slot',String(i+1)),node('strong','',T(m.name)),node('span','bag-pp',fmt(info.pp.current)+' / '+info.pp.max+' PP'));
      row.append(title);
      const lines=[T(m.def.desc),T('Recarga')+': '+fmt(info.cd)+' s'+(m.kind==='buff'?'':' · '+T('Multiplicador del movimiento')+': ×'+fmt(info.power)),T(m.damageClass==='special'?'Ataque especial':m.kind==='buff'?'Efecto de apoyo':'Ataque físico')];
      if(info.view.amount)lines.push(T(m.stat==='regen'?'Vida perdida recuperada por segundo':'Aumento del valor natural')+': '+fmt(info.view.amount*100)+'%'+(info.view.stacks?' ×'+info.view.stacks:''));
      if(info.view.dur)lines.push(T('Duración')+': '+fmt(info.view.dur)+' s');
      if(info.view.radius)lines.push(T('Alcance')+': '+fmt(info.view.radius));
      if(info.view.count&&m.kind!=='buff')lines.push(T('Cantidad')+': '+info.view.count);
      if(info.view.pierce)lines.push(T('Perforación')+': '+info.view.pierce);
      for(const id of G.Specialization.ids(m))lines.push(T(G.Specialization.BY[id].name)+' · '+T(G.Specialization.BY[id].desc));
      row.title=T(m.name)+'\n'+lines.join('\n');row.append(node('p','',lines.join('\n')));if(old)old.replaceWith(row);else moves.append(row);
    }));
    for(const [id,el]of existing)if(!p.moves.some(m=>m.id===id))el.remove();
    const active=$('backpack-active');active.replaceChildren();
    if(G.ZMoves?.hasStone(p)){active.append(node('div','bag-item',T('Cristal Z')+' · '+G.U.TYPE_NAME[p.zState.type]));}
    else if(G.Mega?.hasStone(p)){const form=G.MEGA_FORMS?.find(f=>f.id===p.megaState.id);active.append(node('div','bag-item',T('Megapiedra')+' · '+(form?G.Mega.label(form.id):p.megaState.id)));}
    else if(p.activeItem&&G.Items.ACTIVE[p.activeItem]){const a=G.Items.ACTIVE[p.activeItem];active.append(node('div','bag-item',T(a.name)+' · '+(p.activeItemCd>0?fmt(p.activeItemCd)+' s':T('Listo'))));}
    else active.append(node('p','muted',T('Sin objeto equipado')));
    const passive=$('backpack-passive');passive.replaceChildren();for(const [id,n]of Object.entries(p.specialItems||{}))if(n>0)item(passive,id,n);
    if(!passive.children.length)passive.append(node('p','muted',T('Aún no llevas objetos especiales')));
    $('backpack-tokens').textContent=p.specTokens?T('Especializaciones pendientes')+' · '+p.specTokens:'';
  }
  function show(p){$('backpack-moves').replaceChildren();G.UI.show('scr-backpack');refresh(p);last=performance.now();$('backpack-close').focus();G.Touch?.reset();}
  function tick(p,visible){$('backpack-open').classList.toggle('hidden',!visible);if(isOpen()&&performance.now()-last>350){last=performance.now();refresh(p);}}
  const isOpen=()=>G.UI.isOpen('scr-backpack');
  return {init,show,refresh,tick,isOpen};
})();
