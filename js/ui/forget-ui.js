G.ForgetUI=(()=>{
  G.I18n.add({'Vida baja: velocidad 1×':'Low HP: 1× speed','Por debajo del 50% de vida, vuelve a 1× y permanece así hasta que la cambies.':'Below 50% HP, switch to 1× and stay there until you change it.','Vida baja: velocidad limitada a 1×':'Low HP: speed is limited to 1×','¡Todos los atributos del Pokémon han aumentado!':'All Pokémon stats increased!','Multiplicador final de nivel':'Final level multiplier','+2 Gemas de habilidad':'+2 Ability Gems','Olvidar movimiento':'Forget a move','Oportunidad de olvidar obtenida. Úsala desde la pausa.':'Move forgetting opportunity earned. Use it from the pause menu.','Elige un movimiento para olvidarlo. Debes conservar al menos uno.':'Choose a move to forget. You must keep at least one.','Volver sin gastar':'Return without spending','Oportunidades para olvidar':'Forgetting opportunities'});
  G.I18n.addChinese({'Vida baja: velocidad 1×':'低血量自动切换 1×','Por debajo del 50% de vida, vuelve a 1× y permanece así hasta que la cambies.':'生命低于 50% 时强制切换为 1 倍速，恢复后也保持 1 倍速，需手动调整。','Vida baja: velocidad limitada a 1×':'当前生命低于 50%，已限制为 1 倍速','¡Todos los atributos del Pokémon han aumentado!':'宝可梦全属性提升了！','Multiplicador final de nivel':'等级最终乘区','+2 Gemas de habilidad':'+2 特性宝石','Olvidar movimiento':'遗忘技能','Oportunidad de olvidar obtenida. Úsala desde la pausa.':'获得 1 次遗忘技能机会，可在暂停菜单中使用。','Elige un movimiento para olvidarlo. Debes conservar al menos uno.':'选择要遗忘的一个技能；至少保留一个已学技能。','Volver sin gastar':'返回，不消耗机会','Oportunidades para olvidar':'遗忘技能机会'});
  let close=null;
  function open(p,onClose){
    close=onClose;const box=document.getElementById('forget-choices');box.replaceChildren();
    for(const m of p.moves){const b=document.createElement('button');b.className='btn';b.textContent=G.T(m.name)+' · Lv.'+m.lvl;b.disabled=p.moves.length<=1;b.dataset.forgetMove=m.id;b.onclick=()=>{if(G.Game.state!=='forget')return;if(G.Forget.remove(p,m.id)){G.UI.hide('scr-forget');onClose();}};box.append(b);}
    document.getElementById('forget-back').onclick=()=>{G.UI.hide('scr-forget');onClose();};G.UI.show('scr-forget');
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&G.Game?.state==='forget'){e.preventDefault();e.stopPropagation();G.UI.hide('scr-forget');close?.();}},true);
  return {open};
})();
