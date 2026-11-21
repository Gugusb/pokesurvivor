/* Supply vendors share the expedition workshop shell; stock lives in the run. */
G.ExpeditionMarketUI=(()=>{
 const L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
 const S=()=>G.ExpeditionSupplies,U=()=>G.ExpeditionEventUI;
 const button=(text,fn,cls='btn')=>{const b=U().node('button',cls,text);b.type='button';b.onclick=fn;return b;};
 const services=[
  ['skill','book',()=>L('Afinidad técnica','Skill affinity','招式寻访'),()=>L('Más compañeros con oficios de tu equipo.','Favor your squad’s skill classes.','更容易遇到我方已有技能类型的伙伴。')],
  ['type','gem',()=>L('Afinidad elemental','Type affinity','属性寻访'),()=>L('Más compañeros de tus tipos actuales.','Favor your squad’s Pokémon types.','更容易遇到我方已有属性的伙伴。')],
  ['owned','ball',()=>L('Viejos conocidos','Familiar faces','旧友重逢'),()=>L('Al menos 2 Pokémon de familias que ya tienes.','At least 2 Pokémon from owned evolution families.','至少2只我方已有进化链的宝可梦。')],
  ['stars','star',()=>L('Compañeros veteranos','Veteran companions','高星招募'),()=>L('Al menos 2 compañeros de 2–3 estrellas.','At least 2 companions with 2–3 stars.','至少2只二至三星伙伴，按实际合成造价出售。')],
  ['quality','medal3',()=>L('Selección exquisita','Premium selection','品质优选'),()=>L('Más probabilidades de calidad alta.','Favor higher-quality Pokémon.','更容易遇到高品质宝可梦。')]
 ];
 function open(s,onLeave){
  const supplies=s.phase==='item-shop',scene=U().room(s,supplies?L('Tienda de objetos','Supply shop','道具商店'):L('Mercader errante','Wandering merchant','流浪商人'),supplies?'bag':'coin',supplies?L('Los precios de cada objeto aumentan con sus compras en esta expedición.','Each item’s price increases with purchases during this run.','四份常备补给，加一份限量珍藏。同一道具每次购买后价格上涨20%。'):L('Elige el servicio antes de ver las mercancías. No se puede renovar.','Choose a service before seeing goods. No refreshes.','先挑选一种招募服务，再查看货物。本次到访不能刷新。'));
  scene.root.classList.add('market-room');const n=U().node,notice=n('p','market-notice');scene.main.append(notice);
  const fail=()=>{notice.textContent=L('No hay suficientes existencias o espacio. Organiza tu equipo o elige otro servicio.','Not enough stock or space. Arrange your squad or try another service.','库存或仓库空间不足，请整理小队，或选择其他服务。');};
  const grid=n('div',supplies?'market-grid market-items':'market-grid');scene.main.append(grid);
  if(supplies){
   S().prepareItems(s);for(const [index,o]of s.itemShopOffers.entries()){
    const it=G.Items.BY[o.id],card=n('article','market-card market-item'),once=!S().unlimited(o.id);card.dataset.marketItem=o.id;card.dataset.sold=!!o.sold;
    card.append(n('small','market-eyebrow',once?L('Una vez por expedición','Once per run','本局限购一次'):L('Suministro acumulable','Stackable supply','常备 · 可叠加')),U().icon(G.Items.icon(o.id),64),n('h3','',G.T(it.name)),n('p','market-description',G.T(it.desc)));
    const price=S().itemPrice(s,o.id),buy=button(o.sold?L('Vendido','Sold','已售出'):price+' G',()=>{if(S().buyItem(s,index)){G.Audio.sfx('buy');open(s,onLeave);}else fail();},'btn gold');buy.dataset.marketBuy=index;buy.disabled=o.sold||s.gold<price||!G.Items.permitted(it);card.append(buy);grid.append(card);
   }
   if(!grid.childElementCount)grid.append(n('p','',L('No hay suministros disponibles.','No supplies available.','暂无可出售的道具。')));
  }else if(!s.merchantMode){
   grid.classList.add('market-services');for(const [mode,image,title,desc]of services){const b=button('',()=>{if(S().merchant(s,mode))open(s,onLeave);else fail();},'market-service');b.dataset.merchantService=mode;b.append(U().icon(image,42),n('h3','',title()),n('p','',desc()));grid.append(b);}
  }else{
   scene.nav.append(n('b','market-service-selected',services.find(d=>d[0]===s.merchantMode)[2]()));for(const [index,o]of s.merchantOffers.entries()){
    const mon=G.DEX_BY[o.dex],m=G.Moves.instance(o.moveId,[1,3,5][o.rank-1]),candidate={dex:o.dex,mon,rank:o.rank,moves:[m]},card=n('article','market-card market-mon');card.dataset.quality=G.ExpeditionQuality.quality(mon);card.dataset.sold=!!o.sold;card.style.setProperty('--market-quality',G.ExpeditionQuality.color(mon));
    card.append(n('strong','market-stars','★'.repeat(o.rank)),G.UI.spriteCanvas(o.dex,116,104,{scale:2,hero:true,lively:true}),n('h3','',G.T(mon.name)),n('small','',G.ExpeditionQuality.label(mon)),G.Expedition.tags(candidate),n('b','market-skill',G.T(m.def.name)+' · Lv.'+m.lvl));
    if(G.LeagueRank?.allows('traits')??true)card.append(n('p','market-description',G.Expedition.talentText(candidate)));
    const buy=button(o.sold?L('Reclutado','Recruited','已招募'):o.cost+' G',()=>{if(S().buyMon(s,index)){G.Audio.sfx('buy');open(s,onLeave);}else fail();},'btn gold');buy.dataset.merchantBuy=index;buy.disabled=o.sold||s.gold<o.cost;card.append(buy);grid.append(card);
   }
  }
  const footer=n('footer','market-footer');footer.append(button(L('Ver equipo','View squad','查看小队'),()=>G.Game.toggleSquad()),button(L('Continuar viaje','Continue journey','继续旅程'),onLeave,'btn gold'));scene.main.append(footer);G.UI.show('scr-journey');
 }
 return {open};
})();
