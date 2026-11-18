G.RunSetupUI=(()=>{
  G.I18n.add({'Prepara tu aventura':'Prepare your adventure','Preparar aventura':'Adventure preparation','Comenzar aventura':'Start adventure','Vetar movimientos':'Ban moves','Busca un Pokémon y prepara sus movimientos':'Search for a Pokémon and prepare its moves','PP máximo':'Maximum PP','Probabilidad de crítico':'Critical chance','Recuperación de vida':'HP recovery'});
  G.I18n.addChinese({'Prepara tu aventura':'确认准备，再出发','Preparar aventura':'冒险准备','Comenzar aventura':'确认出发','Vetar movimientos':'技能禁用','Busca un Pokémon y prepara sus movimientos':'搜索宝可梦，调整禁用技能','PP máximo':'PP 上限','Probabilidad de crítico':'暴击概率','Recuperación de vida':'生命回复'});
  const T=(es,en,zh)=>({es,en,zh}[G.I18n.lang]||en),$=id=>document.getElementById(id);
  const node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!=null)e.textContent=text;return e;};
  const button=(text,fn)=>{const e=node('button','btn',text);e.type='button';e.onclick=fn;return e;};
  const title=(parent,text)=>{const e=node('section','setup-section');e.append(node('h3','',text));parent.append(e);return e;};
  function preferences(parent,dex){
    const box=node('div','move-preferences'),head=node('p','setup-note'),search=node('input','field'),list=node('div','ban-moves');box.dataset.preferenceRoot=G.RunSetup.root(dex);
    const placeholder=T('Buscar movimiento','Search moves','搜索技能名称');search.type='search';search.placeholder=placeholder;search.setAttribute('aria-label',placeholder);
    const initial=G.startMoveOf(G.RunSetup.root(dex));
    box.append(head,node('p','sub',T('Los vetos se comparten con la familia evolutiva. El movimiento inicial siempre está disponible.','Bans apply to the evolution family. The starting move always stays available.','禁用设置对整条进化家族生效；初始技能始终保留。')),
      node('p','sub',T('Movimiento inicial: ','Starting move: ','初始技能：')+G.T(G.Moves.BY_ID[initial].name)),search,list);
    function refresh(){
      const s=G.DB.save,selected=G.RunSetup.bans(s,dex),max=G.RunSetup.limit(s),q=search.value.trim().toLocaleLowerCase();
      head.textContent=T('Movimientos vetados','Banned moves','已禁用技能')+' '+selected.length+' / '+max+(max?'':' · '+T('Desbloquea Veto en el paquete Principiante.','Unlock ban slots in the Beginner pack.','从初心者包解锁招式禁用名额。'));
      head.setAttribute('role','status');list.replaceChildren();
      for(const id of G.RunSetup.moves(dex).sort((a,b)=>G.T(G.Moves.BY_ID[a].name).localeCompare(G.T(G.Moves.BY_ID[b].name)))){
        const m=G.Moves.BY_ID[id];if(q&&!(m.name+' '+G.T(m.name)).toLocaleLowerCase().includes(q))continue;
        const on=selected.includes(id),b=button(G.T(m.name),()=>{if(G.Game.state!=='ui')return;if(G.RunSetup.toggle(G.DB.save,dex,id)){G.DB.commit();refresh();}});
        b.className='chip'+(on?' on ban':'');b.dataset.banMove=id;b.setAttribute('aria-pressed',String(on));b.disabled=!on&&selected.length>=max;
        b.insertAdjacentHTML('afterbegin',G.Icons.html('move:'+id,16)+' ');list.append(b);
      }
      if(!list.children.length)list.append(node('p','sub',T('Sin resultados','No results','没有匹配的技能')));
    }
    search.oninput=refresh;parent.append(box);refresh();return box;
  }
  function browser(parent,initial=G.DB.save.partner){
    const box=node('div','setup-browser'),search=node('input','field'),select=node('select','field'),body=node('div');let dex=initial;
    search.type='search';search.placeholder=T('Buscar Pokémon o número','Search Pokémon or Pokédex number','搜索宝可梦名称或图鉴编号');search.setAttribute('aria-label',search.placeholder);search.dataset.pokemonSearch='';
    select.setAttribute('aria-label',T('Pokémon de la colección','Owned Pokémon','已拥有的宝可梦'));select.dataset.preferencePokemon='';
    function show(){body.replaceChildren();if(select.value){dex=+select.value;G.MenuUI.preferences(body,dex);}else body.append(node('p','sub',T('Sin resultados','No results','没有匹配的宝可梦')));}
    function filter(){const mons=G.RunSetup.owned(G.DB.save,search.value);select.replaceChildren();for(const m of mons){const o=node('option','','#'+m.dex+' '+G.T(m.name));o.value=m.dex;select.append(o);}if(mons.some(m=>m.dex===dex))select.value=dex;show();}
    select.onchange=show;search.oninput=filter;box.append(search,select,body);parent.append(box);filter();return box;
  }
  function manage(){
    const box=$('move-manager-body');box.replaceChildren();browser(box);$('move-manager-back').onclick=()=>G.MenuUI.open();G.UI.chrome(false);G.UI.show('scr-move-manager');
  }
  function evolution(parent,data){
    const paths=new Map();for(const d of data.family){const p=G.MonProgression.pathFor(d);if(p[0]===data.root)paths.set(p.join(','),p);}
    // Keep complete branches; a partial path is already represented by its longer branch.
    const full=[...paths.values()].filter(p=>![...paths.values()].some(q=>q.length>p.length&&p.every((d,i)=>q[i]===d)));
    for(const path of full){const row=node('div','setup-evolution');for(const [i,d]of path.entries()){
      if(i)row.append(node('span','setup-arrow','→'));
      const mon=G.DEX_BY[d],figure=node('figure','');figure.dataset.evolutionDex=d;
      figure.append(G.UI.spriteCanvas(d,80,72,{scale:2,shiny:!!G.DB.save.partnerShiny&&G.DB.ownsShiny(data.dex)}),node('figcaption','',G.T(mon.name)),node('small','',G.T('Nivel')+' '+G.MonProgression.evolutionLevel(i)));row.append(figure);
    }parent.append(row);}
  }
  function open(){
    if(G.Game.state!=='ui')return;
    const s=G.DB.save,data=G.RunSetup.snapshot(s),box=$('run-setup-body');box.replaceChildren();
    const hero=node('div','setup-hero');hero.append(G.UI.spriteCanvas(data.root,112,96,{scale:2,shiny:!!s.partnerShiny&&G.DB.ownsShiny(data.dex)}));
    const intro=node('div');intro.append(node('h3','',G.T(G.DEX_BY[data.dex].name)),node('p','sub',T('Empiezas como ','Starting form: ','开局形态：')+G.T(G.DEX_BY[data.root].name)),node('p','',s.difficulty.selected+'★ · '+(G.CardPacks.speedAllowed(s,G.Settings.get('runSpeed'))?G.Settings.get('runSpeed'):1)+'×'));hero.append(intro);box.append(hero);
    const nav=node('nav','setup-nav');nav.setAttribute('aria-label',T('Preparación','Preparation','准备项目'));hero.after(nav);
    const held=title(box,T('Objeto equipado','Held item','携带道具'));
    const heldLabel=node('p','setup-held');held.append(heldLabel);const updateHeld=()=>{const h=G.RunSetup.snapshot(G.DB.save,data.dex).held;heldLabel.textContent=h.kind==='z'?G.ZMovesUI.label(h.id):h.kind==='mega'?G.Mega.label(h.id):h.id?G.T(G.Items.ACTIVE[h.id].name):G.T('Ninguno');};updateHeld();G.EquipmentUI.render(held,data.dex,updateHeld);
    const stats=title(box,T('Bonificaciones iniciales','Starting bonuses','初始属性加成')),grid=node('div','setup-stats');
    for(const [key,name]of [['hp','Vida'],['atk','Ataque físico'],['spa','Ataque especial'],['defense','Defensa física'],['spdef','Defensa especial'],['spd','Velocidad'],['agility','Agilidad base'],['stamina','Resistencia base']]){
      const row=node('div','setup-stat');row.dataset.setupStat=key;row.append(node('span','',G.T(name)),node('b','','+'+G.PlayerStats.fmt((data.perks.statGrowth[key]||0)*100)+'%'));grid.append(row);
    }
    stats.append(node('p','sub',T('Crecimiento permanente de las cartas, aplicado a los valores base de cada forma.','Permanent card bonuses applied to each form’s base stats.','成长卡提供的永久加成，按各形态的基础属性计算。')),grid);
    const p=data.perks,extra=[['Nivel',1+p.startLevels],['PP máximo','+'+p.maxPpBonus],['Probabilidad de crítico','+'+G.PlayerStats.fmt(p.crit*100)+'%'],['Recuperación de vida',G.PlayerStats.fmt(p.regenBase*100)+'% '+T('de vida base/s','base HP/s','基础生命/秒')],['Experiencia','+'+G.PlayerStats.fmt((p.xpMul-1)*100)+'%'],['Pokémonedas','+'+G.PlayerStats.fmt((p.coinMul-1)*100)+'%']];
    for(const [name,value]of extra)stats.append(node('p','setup-extra',G.T(name)+' · '+value));
    stats.append(node('p','setup-extra',T('Conservar PP','PP retention','PP 留存率')+' · +'+G.PlayerStats.fmt(p.ppRetention*100)+'%'),node('p','setup-extra',T('Radio de recogida','Pickup radius','拾取范围')+' · +'+G.PlayerStats.fmt((p.magnetMul-1)*100)+'%'),node('p','setup-extra',T('Cambios de cartas adicionales','Extra rerolls','额外重选次数')+' · +'+p.rerolls));
    const evo=title(box,T('Evoluciones posibles','Possible evolutions','进化路线'));evo.append(node('p','sub',T('Elige una rama al evolucionar durante la aventura.','Choose a branch when evolving during the run.','本局从初始形态出发，达到进化等级后可选择分支。')));evolution(evo,data);
    const bans=title(box,T('Movimientos y atajos','Moves and shortcuts','技能禁用与快捷槽'));G.MenuUI.preferences(bans,data.dex);
    const items=title(box,T('Objetos especiales de esta aventura','Special item pool','本局特殊道具池'));
    items.append(node('p','sub',T('Los activados pueden aparecer como botín; no empiezas con ellos.','Enabled items may drop during the run; they are not starting equipment.','已启用道具可在局内掉落或奖励箱中出现，并非开局直接获得。')));
    let itemBusy=false;
    for(const [state,heading]of [['enabled',T('Activados','Enabled','已启用')],['disabled',T('Desactivados','Disabled','已禁用')],['locked',T('Sin desbloquear','Locked','未解锁')]]){
      const group=node('details','setup-items');group.dataset.itemState=state;const rows=data.items.filter(i=>i.state===state);group.open=state!=='locked';group.append(node('summary','',heading+' · '+rows.length));
      if(!rows.length)group.append(node('p','sub',G.T('Ninguno')));
      for(const entry of rows){const it=G.Items.BY[entry.id],row=node('div','setup-item');row.dataset.setupItem=it.id;row.insertAdjacentHTML('afterbegin',G.Icons.html(G.Items.icon(it.id),22));row.append(node('b','',G.T(it.name)),node('small','',G.T(it.desc)));
        if(it.unlock&&state!=='locked'){const b=button(state==='enabled'?T('Desactivar','Disable','禁用'):T('Activar','Enable','启用'),async()=>{if(itemBusy||starting||G.Game.state!=='ui')return;itemBusy=true;b.disabled=true;const scroll=box.parentElement.scrollTop;try{if(G.DB.mode==='server')G.Server.packLocal({action:'toggle',id:it.id});else{G.CardPacks.toggle(G.DB.save,it.id);G.DB.commit(true);}open();box.parentElement.scrollTop=scroll;}catch(e){G.UI.toast(e.message);b.disabled=false;}finally{itemBusy=false;}});b.classList.add('small');b.dataset.toggleSetupItem=it.id;row.append(b);}group.append(row);}items.append(group);
    }
    for(const [section,label]of [[bans,T('Vetar movimientos','Ban moves','技能禁用')],[items,T('Objetos especiales','Special items','特殊道具')],[held,T('Objeto equipado','Held item','携带道具')],[stats,T('Bonificaciones','Bonuses','属性加成')],[evo,T('Evoluciones','Evolutions','进化路线')]]){const b=button(label,()=>section.scrollIntoView({block:'start',behavior:'smooth'}));b.classList.add('small');nav.append(b);}
    let starting=false;const start=$('run-setup-start');start.disabled=false;start.onclick=async()=>{if(starting||itemBusy||G.Game.state!=='ui')return;if(G.DB.save.partner!==data.dex){open();return;}starting=true;start.disabled=true;try{await G.Game.startRun(null,true);}finally{starting=false;start.disabled=false;}};
    $('run-setup-back').onclick=()=>{if(!starting)G.MenuUI.open();};G.UI.chrome(false);G.UI.show('scr-run-setup');
  }
  return {open,manage,preferences,browser};
})();
