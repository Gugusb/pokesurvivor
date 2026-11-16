G.CardPacksUI=(()=>{
 const T=(es,en,zh)=>({es,en,zh}[G.I18n.lang]||en),L=v=>typeof v==='object'?G.CardPacks.local(v):G.T(v||'');
 let packId='beginner';
 let page='pack',tab='stats',busy=false,phase='',selected=-1,lastReward=null,preferenceDex=null;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n;};
 const motion=()=>!G.Settings?.get('calm')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,motion()?ms:50));
 const type=c=>({speed:T('Permiso de juego','Game permission','游戏权限'),skill:T('Dominio de movimientos','Move growth','技能成长'),z:T('Permiso Z','Z permission','Z使用权限'),stat:T('Entrenamiento','Training','属性成长'),item:T('Desbloqueo de objeto','Item unlock','道具解锁'),tickets:T('Recursos','Resources','资源补给'),gems:T('Recursos','Resources','资源补给'),theme:T('Diseño de tarjeta','Namecard style','名片装扮')})[c.kind];
 function detail(c){return c.kind==='speed'?T('Se conserva en tu cuenta','Saved to your account','永久解锁，可在操作设置选择'):c.kind==='z'?T('Para toda su familia evolutiva','For its whole evolution family','同一进化链的所有形态均可使用'):['stat','skill','speed'].includes(c.kind)?T('Para todos los Pokémon','For every Pokémon','对所有宝可梦生效'):c.kind==='item'?T('Desbloquea su aparición en aventuras','Unlocks this item for your loot pool','解锁使用权限，加入局内道具池'):c.kind==='theme'?T('Desbloquea un diseño de perfil','Unlocks a public namecard style','解锁名片主题，可在收藏管理中装扮'):T('Recompensa de un solo uso','One-time resource reward','一次性补给，收下后立即获得');}
 async function action(data){
  if(busy)return;busy=true;selected=data.index??-1;lastReward=null;
  const chosen=data.action==='choose'?G.CardPacks.BY[G.DB.save.cardPack.pending?.options[data.index]]:null;
  phase=data.action==='draw'?'opening':data.action==='choose'?'selecting':'';render();
  try{
   const request=(async()=>{if(G.DB.mode==='server')G.Server.packLocal(data);else{G.CardPacks.apply(G.DB.save,data);G.DB.commit(true);}})();
   await Promise.all([request,pause(data.action==='draw'?500:data.action==='choose'?600:0)]);
   G.UI.refreshCoins();
   if(data.action==='draw'){phase='revealing';render();await pause(1050);}
   if(data.action==='choose'){lastReward=chosen;G.Audio.sfx('confirm');if(G.DB.save.cardPack.pending){phase='revealing';render();await pause(1050);}else phase='claimed';}
  }catch(e){phase='';const message={'No pack owned':T('No tienes este paquete','No owned pack available','没有可打开的库存卡包'),'Pack empty':T('Paquete completado','Pack complete','卡包已集齐'),'Not enough coins':T('Faltan monedas','Not enough coins','金币不足'),'Wallet limit reached':T('Gasta recursos antes de recoger','Spend resources before claiming','资源达到上限，请先使用后再领取'),'Invalid pack choice':T('Las cartas han cambiado; elige de nuevo.','Cards updated; choose again.','卡牌已更新，请重新选择。')}[e.message]||e.message;G.UI.toast(message,5000);}
  finally{busy=false;if(phase!=='claimed')phase='';render();}
 }
 function button(text,fn,disabled=false){const n=el('button','btn',text);n.disabled=disabled||busy;n.onclick=fn;return n;}
 const families=new Map();
 function family(root){
  if(!families.has(root))families.set(root,G.DEX.filter(m=>G.ZAccess.root(m.dex)===root).sort((a,b)=>((G.EVOLUTION_PATHS?.[a.dex]||[a.dex]).indexOf(a.dex)-(G.EVOLUTION_PATHS?.[b.dex]||[b.dex]).indexOf(b.dex))||a.dex-b.dex));
  return families.get(root);
 }
 function portraits(c){
  const group=el('div','pack-family');group.setAttribute('role','list');group.setAttribute('aria-label',T('Pokémon compatibles','Compatible Pokémon','可使用的宝可梦'));
  for(const mon of family(c.key)){
   const name=G.T(mon.name),figure=el('figure','pack-family-mon');figure.dataset.familyDex=mon.dex;figure.title=name;figure.setAttribute('role','listitem');
   const cv=G.UI.spriteCanvas(mon.dex,96,80,{scale:2,hero:true,shadow:false});cv.setAttribute('aria-hidden','true');
   figure.append(cv,el('figcaption','',name));group.append(figure);
  }
  return group;
 }
 function card(c,tail){
  const n=el('div','pack-card pack-kind-'+c.kind);n.dataset.card=c.id;n.dataset.rewardType=c.kind;
  n.append(el('span','pack-type-badge',c.boss?T('Desbloqueo BOSS','Boss item unlock','BOSS道具解锁'):type(c)));
  const icon=el('div','pack-card-icon');icon.innerHTML=G.Icons.html(c.icon,32);n.append(icon,el('strong','',L(c.name)),el('small','pack-kind-hint',detail(c)));
  if(c.kind==='z')n.append(portraits(c));
  n.append(el('p','',L(c.desc)),el('small','pack-card-stock',tail));return n;
 }

 function catalog(parent,cards,p,s){
  const search=el('input','field');search.type='search';search.placeholder=T('Buscar una carta…','Search cards…','搜索卡牌或宝可梦…');search.setAttribute('aria-label',search.placeholder);
  const grid=el('div','pack-grid'),nav=el('div','row wrap');let offset=0;
  const paint=()=>{const query=search.value.trim().toLowerCase(),list=cards.filter(c=>L(c.name).toLowerCase().includes(query)||L(c.desc).toLowerCase().includes(query)||c.kind==='z'&&family(c.key).some(m=>G.T(m.name).toLowerCase().includes(query)));grid.replaceChildren();nav.replaceChildren();for(const c of list.slice(offset,offset+30))grid.append(card(c,(c.kind==='z'&&G.ZAccess.allowed(s,c.key)?0:c.max-p.taken[c.id])+' / '+c.max));nav.append(button(T('Anterior','Previous','上一页'),()=>{offset=Math.max(0,offset-30);paint();},offset===0),el('small','',`${Math.min(offset+1,list.length)}–${Math.min(offset+30,list.length)} / ${list.length}`),button(T('Siguiente','Next','下一页'),()=>{offset+=30;paint();},offset+30>=list.length));};
  search.oninput=()=>{offset=0;paint();};parent.append(search,grid,nav);paint();
 }
 function render(){
  const s=G.DB.save;if(!s)return;const p=G.CardPacks.resume(s);if(p.pending)packId=p.pending.pack;const pack=G.CardPacks.packBy[packId],box=document.getElementById('pack-body');box.replaceChildren();box.className=phase?'pack-'+phase:'';box.classList.toggle('pack-no-motion',!motion());box.dataset.phase=phase||'idle';box.dataset.page=page;
  document.querySelector('#scr-upgrades h2').textContent=page==='pack'?T('Paquetes de cartas','Card Packs','游戏卡包'):T('Mi colección','My Collection','收藏管理');
  const nav=el('div','pack-subnav');nav.append(el('span','pack-breadcrumb',page==='pack'?T('Paquetes / ','Packs / ','卡包 / ')+L(pack.name):T('Paquetes / Mi colección','Packs / My Collection','卡包 / 收藏管理')));
  if(page==='pack'){const manage=button(T('Mi colección →','My Collection →','收藏管理 →'),()=>{page='collection';tab='stats';phase='';render();});manage.dataset.packCollection='';nav.append(manage);}else{const back=button(T('← Volver al paquete','← Back to pack','← 返回卡包'),()=>{page='pack';phase='';render();});back.dataset.packBack='';nav.append(back);}box.append(nav);
  if(page==='collection'){
   box.append(el('p','sub',T('Administra lo que has conseguido.','Manage what you have collected.','在这里查看成长，管理已解锁的道具和名片。')));
   const tabs=el('div','row wrap pack-tabs');for(const [id,label]of [['stats',T('Entrenamiento','Training','全员成长')],['items',T('Objetos','Items','道具池')],['themes',T('Tarjetas','Namecards','名片装扮')]]){const b=button(label,()=>{tab=id;render();});b.dataset.collectionTab=id;b.classList.toggle('gold',tab===id);tabs.append(b);}box.append(tabs);
  }
  if(page==='pack'){
   const selectors=el('div','row wrap pack-selectors');for(const item of G.CardPacks.packs){const b=button(L(item.name),()=>{packId=item.id;phase='';lastReward=null;render();},!!p.pending);b.dataset.packSelect=item.id;b.classList.toggle('gold',packId===item.id);selectors.append(b);}box.append(selectors);
   const hero=el('div','pack-hero');hero.append(el('div','pack-seal',packId==='beginner'?'Ⅰ':'Ⅱ'),el('h3','',L(pack.name)),el('p','',T('Elige una carta y acompaña a todos tus Pokémon.','Choose a card to support every Pokémon.','从一张卡开始，陪伴每一位宝可梦成长。')),el('b','',G.CardPacks.remaining(s,packId)+' / '+pack.cards.reduce((a,c)=>a+c.max,0)+' '+T('cartas restantes','cards remaining','张剩余卡牌')));box.append(hero);
   const status=el('p','pack-status',phase==='opening'?T('Abriendo el paquete…','Opening the pack…','正在打开卡包…'):phase==='revealing'?T('Tus tres cartas…','Your three cards…','看看这次翻到了什么…'):phase==='selecting'?T('Guardando tu carta…','Collecting your card…','正在收下这张卡…'):p.pending?T('Elige una recompensa','Choose one reward','选择一份奖励'):lastReward?T('¡Añadido a tu colección!','Added to your collection!','已收入收藏！'):'');status.setAttribute('role','status');status.setAttribute('aria-live','polite');box.append(status);
   if(p.pending?.batch){const b=p.pending.batch,progress=el('p','pack-batch-progress',T('Elección','Choice','连续选卡')+' '+(b.total-b.left+1)+' / '+b.total);progress.dataset.packProgress='';box.append(progress);}
   box.append(el('p','sub',T(`${pack.price} monedas por elección. Las cartas no elegidas vuelven al paquete.`,`${pack.price} coins per choice. Unchosen cards return to the pack.`,`每次${pack.price}金币，三选一；未选中的卡退回卡包。`)));
   if(p.refund)box.append(el('p','pack-refund',T('Reembolso del entrenamiento anterior: ','Previous training refunded: ','原强化金币已返还：')+p.refund.toLocaleString()));
   if(p.pending){const list=el('div','pack-choices');p.pending.options.forEach((id,index)=>{const c=G.CardPacks.BY[id],n=card(c,T('Elegir','Choose','选择这张'));n.style.setProperty('--reveal-index',index);n.classList.toggle('pack-selected',index===selected);n.append(button(T('Recoger','Claim','收下'),()=>action({action:'choose',seq:p.pending.seq,index,offerId:p.pending.id}),busy));list.append(n);});box.append(list);}
   else{
    if(lastReward){const receipt=el('div','pack-receipt');receipt.append(card(lastReward,T('Guardado','Collected','已收下')));box.append(receipt);}
    const owned=button(T('Abrir guardado','Open owned pack','打开已获得卡包')+' · '+p.tokens[packId],()=>action({action:'draw',pack:packId,token:true}),!p.tokens[packId]||!G.CardPacks.remaining(s,packId));owned.dataset.packOwned='';box.append(owned);
    const draw=button(G.CardPacks.remaining(s,packId)?T(`Abrir · ${pack.price} monedas`,`Open · ${pack.price} coins`,`抽取 · ${pack.price}金币`):T('Paquete completado','Pack complete','卡包已集齐'),()=>action({action:'draw',pack:packId}),busy||s.coins<pack.price||!G.CardPacks.remaining(s,packId));draw.classList.add('gold');draw.dataset.packDraw='';box.append(draw);
    const rounds=Math.min(10,G.CardPacks.remaining(s,packId)),ten=button(T(`Abrir ×${rounds||10} · ${pack.price*rounds} monedas`,`Open ×${rounds||10} · ${pack.price*rounds} coins`,`${rounds===10?'十连抽':'连抽'+(rounds||10)+'次'} · ${pack.price*rounds}金币`),()=>action({action:'draw',pack:packId,count:10}),!rounds||s.coins<pack.price*rounds);ten.dataset.packTen='';ten.classList.add('gold');
    const ownedTen=button(T('Abrir guardados ×10','Open owned ×10','库存连开 ×10')+' · '+p.tokens[packId],()=>action({action:'draw',pack:packId,count:10,token:true}),!rounds||p.tokens[packId]<rounds);ownedTen.dataset.packOwnedTen='';const row=el('div','row wrap pack-multi-actions');row.append(ten,ownedTen);box.append(row);
   }
   const all=el('details','pack-catalog');all.append(el('summary','',T('Contenido del paquete','Pack contents','查看卡包内容')));all.addEventListener('toggle',()=>{if(all.open&&!all.dataset.loaded){all.dataset.loaded='1';catalog(all,pack.cards,p,s);}});box.append(all);
  }
  if(page!=='collection')return;
  if(tab==='stats'){
   box.append(el('p','sub',T('Las cartas de entrenamiento benefician a toda la colección.','Training cards benefit your entire collection.','成长卡对所有宝可梦生效，包括之后获得的伙伴。')));const grid=el('div','pack-grid');for(const c of G.CardPacks.cards.filter(c=>['stat','skill','speed'].includes(c.kind))){grid.append(card(c,c.kind==='speed'?(p.taken[c.id]?T('Desbloqueado','Unlocked','已解锁'):T('Bloqueado','Locked','未解锁')):'Lv. '+p.taken[c.id]+' / '+c.max));}box.append(grid);if(p.legacyAgility>1e-8)box.append(el('p','sub',T('Agilidad anterior conservada: ','Preserved agility remainder: ','保留的旧敏捷收益：')+'+'+(p.legacyAgility*100).toFixed(0)+'%'));
   const prefs=el('details','pack-catalog');prefs.append(el('summary','',T('Preferencias de movimientos','Move preferences','招式偏好')));const select=el('select','field');for(const d of Object.keys(s.owned))if(G.DEX_BY[d]){const o=el('option','',G.T(G.DEX_BY[d].name));o.value=d;o.selected=String(preferenceDex)===d;select.append(o);}const body=el('div');const show=()=>{preferenceDex=+select.value;body.replaceChildren();if(select.value)G.MenuUI.preferences(body,+select.value);};select.onchange=show;prefs.append(select,body);show();box.append(prefs);
  }
  if(tab==='items'){box.append(el('p','sub',T('Activa los objetos desbloqueados para encontrarlos durante la aventura.','Enable unlocked items to find them during runs.','解锁后可自由开关；开启的道具会加入之后的局内掉落和奖励箱道具池。')));const grid=el('div','pack-grid');for(const i of G.CardPacks.items){const c=G.CardPacks.BY['item:'+i.id],owned=!!p.taken[c.id],n=card(c,'');n.classList.toggle('pack-locked',!owned);n.append(button(!owned?T('Bloqueado','Locked','未解锁'):p.disabled[i.id]?T('Desactivado','Disabled','已关闭'):T('Activado','Enabled','已加入道具池'),()=>action({action:'toggle',id:i.id}),busy||!owned));grid.append(n);}box.append(grid);}
  if(tab==='themes'){const grid=el('div','pack-grid');box.append(button(T('Sin diseño','Default style','默认名片'),()=>action({action:'theme',id:''}),busy));for(const t of G.CardPacks.themes){const c=G.CardPacks.BY['theme:'+t.id],n=card(c,'');n.style.setProperty('--card-accent',t.color);n.classList.add('namecard-preview');n.append(el('span','pack-sticker','✦'),button(!p.taken[c.id]?T('Bloqueado','Locked','未解锁'):p.theme===t.id?T('Equipado','Equipped','已装扮'):T('Usar','Equip','装扮名片'),()=>action({action:'theme',id:t.id}),busy||!p.taken[c.id]));grid.append(n);}box.append(grid);}
 }
 function open(){page='pack';if(!busy){phase='';selected=-1;lastReward=null;}G.UI.show('scr-upgrades',true);render();}
 return {open,refresh:render};
})();
