/* Schedule-driven solo expedition. Account resources and expedition gold are separate. */
G.Expedition = (() => {
  const R=G.ExpeditionRules;
  let run=null,draft=null,offer=[],note='',busy=false,lastHud=0,battleResult=null;
  const BATTLE_RESULT_MS=1500;
  const T=s=>G.T(s),L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
  const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  const eventName=k=>({battle:L('Combate','Battle','战斗'),elite:L('Combate de élite','Elite battle','精英战斗'),shop:L('Tienda Pokémon','Pokémon shop','宝可梦商店'),'item-shop':L('Tienda de objetos','Supply shop','道具商店'),peddler:L('Mercader errante','Wandering merchant','流浪商人'),training:L('Dojo de movimientos','Skill training','技能修炼'),'pokemon-training':L('Sala Pokémon','Pokémon training room','宝可梦训练室'),wild:L('Exploración silvestre','Wild expedition','野外探险'),rest:L('Descanso','Rest stop','休整'),boss:L('Combate de jefe','Boss battle','BOSS战'),start:L('Partida','Start','出发')})[k];
  const eventIcon=k=>({battle:'⚔',elite:'✦',shop:'▣','item-shop':'▧',peddler:'♧',training:'✎','pokemon-training':'★',wild:'❧',rest:'❧',boss:'♛',start:'⚑'})[k];
  const genNames=['Kanto','Johto','Hoenn','Sinnoh','Teselia','Kalos','Alola','Galar','Paldea'];
  const summary=()=>run?{...R.progress({day:run.day,arceus:run.arceus,cashout:run.cashout}),squadHp:run.squadHp,leagueTier:run.leagueTier??1}:null;
  function header(title,sub){
    const box=$('journey-content');box.replaceChildren();box.classList.remove('battle-loot-box','training-room','event-room','route-room');const head=node('header','journey-head');head.append(node('small','journey-eyebrow',L('EXPEDICIÓN','EXPEDITION','小队远征')),node('h2','',title),node('p','',sub));box.append(head);if(run&&run.phase!=='shop')box.append(progressPanel());return box;
  }
  function progressPanel(){
    const panel=node('section','expedition-progress');panel.setAttribute('translate','no');if(!run)return panel;
    const p=run.captain,row=G.Economy.levelRow(run.trainerLevel),cap=run.trainerLevel>=G.Economy.maxLevel(run),fmt=n=>Number(Math.max(0,n||0).toFixed(1)).toLocaleString();
    for(const [key,label,level,current,max,color] of [
      ['trainer',L('Entrenador','Trainer','训练家经验'),run.trainerLevel,run.trainerXp,row.xpToNext,'#ffd166'],
      ['pokemon',L('Pokémon','Pokémon','宝可梦经验'),p.level,p.xp,p.xpNext,'#78d9ff']]){
      const block=node('div','expedition-xp-row');block.dataset.xp=key;
      const head=node('div','expedition-xp-label');head.append(node('b','',label+' · Lv.'+level),node('span','',max?fmt(current)+' / '+fmt(max):'MAX'));
      const track=node('div','expedition-xp-track');track.setAttribute('role','progressbar');track.setAttribute('aria-label',label);track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(max||1));track.setAttribute('aria-valuenow',String(Math.min(max||1,max?current:1)));
      const fill=node('span');fill.style.width=(max?Math.min(1,current/max):1)*100+'%';fill.style.background=color;track.append(fill);block.append(head,track);
      if(key==='trainer'&&cap)block.append(node('small','',L('Límite del ciclo','Cycle level cap','已达当前周期等级上限')));
      panel.append(block);
    }
    const hp=node('div','expedition-squad-hp');hp.dataset.squadHp=run.squadHp;hp.textContent=L('Vida del equipo','Squad HP','小队生命')+' '+Number(run.squadHp.toFixed(1))+' / '+(G.TrainerTalents?.maxHp(run)||G.EconomyConfig.initial.squadHp);if(run.squadShield>0)hp.append(node('span','squad-shield',' ◈ '+run.squadShield));panel.append(hp);if(run.phase!=='combat'){const capHp=node('div','expedition-captain-hp'),track=node('span'),fill=node('i');fill.style.width=Math.max(0,p.hp/p.maxHp)*100+'%';track.append(fill);capHp.append(node('b','',L('Capitán','Captain','队长生命')+' '+Math.ceil(p.hp)+' / '+Math.ceil(p.maxHp)),track);panel.append(capHp);}if(G.TrainerTalentsUI)panel.append(G.TrainerTalentsUI.hud(run));return panel;
  }
  function button(text,fn,cls='btn'){const b=node('button',cls,text);b.type='button';b.onclick=fn;return b;}
  function portrait(p,size=72){return G.UI.spriteCanvas(p.spriteDex||p.dex,size,size,{scale:2,shiny:!!p.shiny,hero:true,lively:true});}
  function prepCard(title){
    const section=node('section','journey-prep-card');
    section.append(node('h3','',title));
    return section;
  }
  function prepCaptain(mon){
    const save=G.DB.save,perks=G.Upgrades.perks(G.DB.upgradesOf(mon.dex));
    const section=prepCard(L('Capitán','Captain','队长资料'));
    const label=node('label','journey-select',L('Cambiar capitán','Change captain','更换队长'));
    const select=node('select');select.id='journey-captain';
    for(const p of G.DEX.filter(p=>G.DB.owns(p.dex)&&G.SPRITE_META[p.dex])){
      const option=node('option','',T(p.name));
      option.value=p.dex;option.selected=p.dex===mon.dex;select.append(option);
    }
    label.append(select);
    const move=G.Moves.instance(G.startMoveOf(mon.dex));
    const shiny=mon.dex===save.partner&&!!save.partnerShiny&&G.DB.ownsShiny(mon.dex);
    const identity=node('div'),hero=node('div','journey-prep-hero');
    identity.append(node('h4','',T(mon.name)),tags({mon,dex:mon.dex,moves:[move]}));
    hero.append(portrait({...mon,shiny},92),identity);
    const facts=node('dl','journey-prep-facts');
    const add=(name,value)=>facts.append(node('dt','',name),node('dd','',value));
    add(L('Movimiento inicial','Starting move','起始招式'),T(move.name)+' · '+G.Moves.classLabel(move));
    const ability=G.Abilities.equipped(save,mon.dex);
    const medal=G.AbilityDefs.BY_ID[save.abilityEquipped?.[mon.dex]];
    add(L('Habilidad equipada','Equipped ability','已装备特性'),ability&&medal?T(medal.name):L('Ninguna','None','未装备'));
    const leaderDef=G.LeaderAbilities?.definition(mon.dex);if(leaderDef){const dd=facts.lastElementChild;if(dd)dd.textContent=leaderDef.name[G.I18n.lang]||leaderDef.name.en;}
    const z=null,mega=save.megaEquipped?.[mon.dex];
    const active=G.Items.ACTIVE[G.Equipment.active(save,mon.dex)];
    const carried=z?T(G.U.TYPE_NAME[z])+' · '+L('Cristal Z','Z-Crystal','Z纯晶'):G.Mega.owns(save,mega)?G.Mega.label(mega):active?T(active.name):L('Ninguno','None','未携带');
    add(L('Equipo inicial','Starting equipment','起始携带'),carried);
    const bans=(save.pban?.[mon.dex]||[]).slice(0,perks.bans).map(id=>G.Moves.BY_ID[id]).filter(Boolean);
    if(bans.length)add(L('Movimientos vetados','Banned moves','禁学招式'),bans.map(m=>T(m.name)).join(' / '));
    const stats=G.MonProgression.stats(mon.dex),numbers=node('dl','journey-prep-stats');
    const labels={
      hp:L('PS','HP','生命'),atk:L('Ataque','Attack','物攻'),spa:L('At. esp.','Sp. Atk','特攻'),
      defense:L('Defensa','Defense','物防'),spdef:L('Def. esp.','Sp. Def','特防'),spd:L('Velocidad','Speed','移速'),
      agility:L('Agilidad','Agility','敏捷'),stamina:L('Aguante','Stamina','耐力')
    };
    for(const [key,name] of Object.entries(labels)){
      const cell=node('div');cell.append(node('dt','',name),node('dd','',G.PlayerStats.fmt(stats[key])));
      numbers.append(cell);
    }
    const abilityCard=G.LeaderAbilitiesUI?.card(mon.dex,1);section.append(label,hero,facts,node('p','note',L('Atributos base con valores individuales','Base stats with individual values','含个体修正的基础属性')),numbers);if(abilityCard){const details=node('details','leader-prep-details');details.append(node('summary','',L('Ver habilidad del capitán','View captain ability','查看队长五段特性')));details.append(abilityCard);section.append(details);}
    return {section,select};
  }
  function prepItems(){
    const section=prepCard(L('Objetos de la expedición','Expedition items','道具池与禁用'));
    const pack=G.CardPacks.normalize(G.DB.save);
    const available=[],disabled=[],locked=[];
    for(const item of G.Items.LIST){
      if(G.Items.permitted(item))available.push(item);
      else if(pack.taken['item:'+item.id]&&pack.disabled[item.id])disabled.push(item);
      else locked.push(item);
    }
    for(const [entries,title,kind] of [
      [disabled,L('Desactivados','Disabled','已禁用'),'disabled'],
      [locked,L('Sin desbloquear','Locked','未解锁'),'locked'],
      [available,L('Disponibles','Available','已加入道具池'),'available']
    ]){
      const group=node('details','journey-prep-items');group.open=kind==='disabled';group.dataset.itemStatus=kind;
      group.append(node('summary','',title+' · '+entries.length));
      if(!entries.length)group.append(node('p','note',L('Ninguno','None','无')));
      else{
        const list=node('ul','journey-prep-item-list');
        for(const item of entries){
          const row=node('li','',T(item.name));row.dataset.itemId=item.id;row.title=T(item.desc);
          if(kind==='available'&&item.boss)row.append(node('small','',L('Recompensas BOSS','Boss rewards','BOSS奖励')));
          list.append(row);
        }
        group.append(list);
      }
      section.append(group);
    }
    section.append(node('p','note',L('La selección de objetos se ajusta en la colección de paquetes.','Item availability is managed in the pack collection.','可在卡包收藏中调整已解锁道具的启用状态。')));
    return section;
  }
  function prepCandidates(gens){
    const section=prepCard(L('Pokémon de esta expedición','Pokémon in this expedition','本局宝可梦候选'));
    if(!gens){
      section.append(node('p','note',L('Prepara la ruta para consultar sus regiones y Pokémon.','Prepare the route to review its regions and Pokémon.','生成本局路线后可查看地区和宝可梦候选。')));
      return section;
    }
    const regions=node('div','journey-prep-regions');
    for(const g of gens)regions.append(node('span','',T(genNames[g-1])));
    section.append(regions);
    const pool=R.pool(gens);
    const fallback=entries=>entries.length?entries:pool;
    const foes=new Map();
    for(const day of [1,5,9,13])for(const mon of fallback(R.encounterCandidates(pool,day,false)))foes.set(mon.dex,mon);
    const bosses=fallback(R.encounterCandidates(pool,20,true));
    const bossDex=new Set(bosses.map(mon=>mon.dex));
    const recruitByLoot=new Set(R.shopFamilies([...foes.values()]).map(mon=>mon.dex));
    const encounters=new Map([...foes,...bosses.map(mon=>[mon.dex,mon])]);
    encounters.set(493,G.DEX_BY[493]);
    const sources={recruit:R.shopFamilies(pool),enemy:[...encounters.values()]};
    for(const entries of Object.values(sources))entries.sort((a,b)=>a.dex-b.dex);
    const switches={recruit:L('Reclutables','Recruitable','可招募'),enemy:L('Encuentros','Encounters','战斗遭遇')};
    let mode='recruit',page=0;
    const picker=node('select');picker.setAttribute('aria-label',L('Origen','Source','来源'));
    for(const [id,name] of Object.entries(switches)){
      const option=node('option','',name+' · '+sources[id].length);
      option.value=id;picker.append(option);
    }
    const search=node('input');search.type='search';
    search.placeholder=L('Nombre, tipo o movimiento','Name, type or move','搜索名称、属性或招式');
    search.setAttribute('aria-label',search.placeholder);
    const toolbar=node('div','journey-prep-filter');toolbar.append(picker,search);
    const results=node('div','journey-prep-candidates');
    const nav=node('div','journey-prep-pagination'),counter=node('span');
    const previous=button(L('Anterior','Previous','上一页'),()=>{page--;render();},'btn small');
    const nextPage=button(L('Siguiente','Next','下一页'),()=>{page++;render();},'btn small');
    nav.append(previous,counter,nextPage);
    function render(){
      const query=search.value.trim().toLowerCase();
      const found=sources[mode].map(mon=>{
        const move=mode==='recruit'?G.Moves.BY_ID[G.FIXED_SKILLS?.[mon.dex]||G.Moves.startFor(mon)]:null;
        const types=mon.types.map(type=>T(G.U.TYPE_NAME[type]||type));
        return {mon,types,name:T(mon.name),skill:move?T(move.name):'',move};
      }).filter(({mon,types,name,skill})=>[name,mon.name,'#'+mon.dex,...types,skill].some(v=>v.toLowerCase().includes(query)));
      const perPage=12,pages=Math.max(1,Math.ceil(found.length/perPage));
      page=Math.max(0,Math.min(page,pages-1));previous.disabled=page===0;nextPage.disabled=page+1===pages;
      counter.textContent=found.length?page+1+' / '+pages:L('Sin resultados','No results','没有匹配结果');
      results.replaceChildren();
      for(const {mon,types,name,skill,move} of found.slice(page*perPage,(page+1)*perPage)){
        const card=node('article','journey-prep-mon');card.dataset.candidate=mon.dex;
        const text=node('div');text.append(node('h4','',name),node('p','',types.join(' / ')));
        if(mode==='recruit'){
          card.style.borderColor=G.ExpeditionQuality.color(mon);
          text.append(node('p','',G.ExpeditionQuality.label(mon)+' · ★'),node('p','',skill+' · '+G.SquadBonds.label(move?.kind)));
          text.append(node('small','',recruitByLoot.has(mon.dex)?L('Tienda / botín','Shop / loot','商店／战后邀请'):L('Tienda','Shop','商店')));
        }else{
          const labels=[];
          if(foes.has(mon.dex))labels.push(L('Oleadas','Waves','战斗波次'));
          if(bossDex.has(mon.dex))labels.push('BOSS');
          if(mon.dex===493)labels.push(L('Jefe del día 60','Day 60 boss','第 60 天首领'));
          text.append(node('small','',labels.join(' · ')));
        }
        const glyph=G.UI.spriteCanvas(mon.dex,44,44,{portrait:true,hero:true,shadow:false});
        glyph.setAttribute('aria-hidden','true');card.append(glyph,text);results.append(card);
      }
    }
    picker.onchange=()=>{
      mode=picker.value;page=0;
      search.placeholder=mode==='recruit'?L('Nombre, tipo o movimiento','Name, type or move','搜索名称、属性或招式'):L('Nombre o tipo','Name or type','搜索名称或属性');
      search.setAttribute('aria-label',search.placeholder);render();
    };
    search.oninput=()=>{page=0;render();};
    section.append(toolbar,results,nav);render();return section;
  }
  async function setup(){
    if(!await G.EconomyReady||G.TrainerTalentsReady&&!await G.TrainerTalentsReady){G.UI.toast(L('No se pudo cargar la economía. Recarga la página.','Economy configuration failed to load. Reload the page.','经济配置加载失败，请刷新页面。'));return;}
    draft={dex:G.DB.save.partner,gens:null};
    const render=()=>{
      const mon=G.DEX_BY[draft.dex],tier=G.LeagueRank?.view(G.DB.save)?.tier||1,stars=G.DB.save.difficulty?.selected||1;
      const warn=tier>=4&&stars<tier?L(' ⚠ Dificultad N'+stars+' inferior a R'+tier+': no sumará estrellas al finalizar.',' ⚠ Difficulty N'+stars+' is below R'+tier+': no stars will be awarded.',' ⚠ 当前所选难度 N'+stars+' 低于段位 R'+tier+'，通关结算不会加分。'):tier<stars&&tier<8?L(' ★ Dificultad N'+stars+' superior a R'+tier+': +1 ★ extra al completar.',' ★ Difficulty N'+stars+' is above R'+tier+': +1 extra ★ on clear.',' ★ 当前所选难度 N'+stars+' 高于段位 R'+tier+'，通关后额外 +1 ★。'):'';
      const box=header(L('Preparar expedición','Expedition preparation','远征战前准备'),L('Revisa al capitán y los recursos de la ruta antes de partir.','Review your captain and route resources before setting out.','出发前查看队长、本局宝可梦候选和道具池。')+warn);
      G.LeagueRankUI?.mountHeader(box.querySelector('.journey-head'));
      const prep=node('div','journey-prep'),{section,select}=prepCaptain(mon);
      select.onchange=()=>{draft.dex=+select.value;draft.gens=null;render();$('journey-captain').focus();};
      prep.append(section,prepItems(),prepCandidates(draft.gens));
      const actions=node('div','journey-actions');actions.append(button(L('Volver','Back','返回'),()=>{draft=null;G.MenuUI.open();}));
      if(!draft.gens)actions.append(button(L('Preparar ruta','Prepare route','生成本局世代'),()=>{draft.gens=R.generations(mon);render();},'btn gold'));
      else actions.append(button(L('¡En marcha!','Set out!','出发'),async()=>{if(busy)return;if(G.ExpeditionSave?.hasSave&&!confirm(L('La nueva expedición reemplazará el archivo local. ¿Continuar?','A new expedition will replace the local checkpoint. Continue?','开始新远征会替换本机存档，是否继续？')))return;busy=true;try{if(G.DB.save.partner!==draft.dex)G.DB.save.partnerShiny=false;G.DB.save.partner=draft.dex;G.DB.commit();await G.Game.startRun(null,true);}finally{busy=false;}},'btn gold'));
      actions.classList.add('journey-prep-actions');box.append(actions,prep);G.UI.show('scr-journey');
    };render();
  }
  function begin(captain){
    clearBattleResult();
    const gens=draft?.gens||R.generations(captain.mon),leagueTier=G.LeagueRank?.view(G.DB.save).tier||1;run={...G.Economy.create(),captain,gens,pool:R.pool(gens),day:0,row:0,col:3,cycle:1,map:R.matrix(1,Math.random,leagueTier),leagueTier,phase:'route',xpJar:0,xpJarStored:0,xpJarSpent:0,arceus:false,cashout:false,history:[],kills:0,battlesCompleted:0};
    G.ExpeditionSupplies?.begin(run);run.map=R.matrix(1,Math.random,leagueTier,run.permanentPerks?.events);offer=[];run.shopLocked=false;run.emblems={};G.Squad.begin(captain);G.TrainerTalents?.begin(run);run.unitPool=new G.UnitPool(run.pool);G.Squad.syncTrainer();G.LeaderAbilities?.begin(run);G.ExpeditionRecorder?.beginRun();draft=null;note='';showRoute();G.ExpeditionSave?.begin();
  }
  function showRoute(){
    if(!run)return;run.phase='route';G.Game.expeditionPause();renderRoute();if(run.pendingTalentPicks?.length)G.TrainerTalentsUI?.showPickModal(renderRoute);
  }
  function renderRoute(){
    const box=header(L('Tu itinerario','Your itinerary','日程表'),L('Elige una carta adyacente de la siguiente fila.','Choose an adjacent card in the next row.','选择下一行相邻的事件，踏上新一天的旅程。'));
    G.LeagueRank?.filterMap(run);box.classList.add('route-room');G.LeagueRankUI?.mountHeader(box.querySelector('.journey-head'));
    const dashboard=node('div','route-dashboard'),left=node('aside','route-sidebar route-resources'),main=node('main','route-main'),right=node('aside','route-sidebar route-status');
    left.setAttribute('aria-label',L('Recursos y equipo','Resources and squad','资源与小队'));right.setAttribute('aria-label',L('Progreso de la expedición','Expedition progress','远征进度'));
    const wallet=node('section','route-wallet'),walletTitle=node('span','',L('Oro disponible','Available gold','可用金币'));wallet.append(G.ExpeditionEventUI.icon('coin',30),walletTitle,node('b','journey-gold',G.Economy.formatGold(run.gold)),node('small','','G'));left.append(wallet,squadShortcut(),box.querySelector('.expedition-progress'),xpJarPanel());
    const info=node('section','route-overview'),day=node('div','route-day-number');day.append(node('small','',L('Día','Day','远征天数')),node('b','',String(run.day)),node('span','',L('Ciclo ','Cycle ','第 ')+run.cycle+(G.I18n.lang==='zh'?' 周期':'')));info.append(day,node('div','route-boss-countdown',L('BOSS en ','BOSS in ','距BOSS ')+(G.EconomyConfig.cycleLengthDays-run.row)+L(' días',' days',' 天')),node('small','route-generations',run.gens.map(g=>T(genNames[g-1])).join(' · ')));const scout=G.ExpeditionSupplies?.scoutPanel(run);if(scout)info.append(scout);right.append(info);
    const report=node('section','route-recent');report.append(node('h3','',L('Último combate','Last battle','上场战况')));
    if(run.battlesCompleted){report.append(node('b',run.battleCleared?'route-clear':'',run.battleCleared?L('Todos derrotados','All enemies defeated','全歼敌人'):L('Supervivencia lograda','Survived successfully','成功生存')));const stats=node('div','route-battle-stats');stats.append(node('span','',L('Bajas ','Defeated ','击败 ')+(run.kills||0)),node('span','',Math.ceil(run.elapsed||0)+'s'),node('span',(run.squadDamage?.applied||0)?'route-hp-loss':'',L('Vida perdida ','HP lost ','小队损失 ')+(run.squadDamage?.applied||0)));report.append(stats);}else report.append(node('p','route-empty',L('La aventura acaba de empezar.','Your adventure has just begun.','旅途刚刚开始，伙伴们准备就绪。')));
    if(note)report.append(node('p','journey-notice',note));right.append(report);
    if(G.LeagueRank?.allows('pokemon-training')??true){const eggs=G.PokemonTraining?.eggPanel(run,renderRoute);if(eggs)right.append(eggs);else{const empty=node('section','journey-eggs route-eggs-empty');empty.append(node('h3','',L('Incubación','Incubation','孵蛋进度')),G.ExpeditionEventUI.icon('luckyegg',30),node('p','route-empty',L('No hay huevos en incubación.','No eggs incubating.','暂无孵化中的蛋')));right.append(empty);}}
    const today=node('section','route-day-focus'),todayTitle=node('div','route-day-heading');todayTitle.append(node('h3','',L('Elige el próximo día','Choose the next day','下一天，去哪里？')),node('small','',L('Una visita, una decisión','One stop, one choice','选择一张卡牌，推进一天行程')));today.append(todayTitle);const choices=node('div','route-day-options');
    for(const row of run.map)for(const cell of row)if(R.reachable(run.row,run.col,cell.row,cell.col)){const c=button('',()=>choose(cell.row,cell.col),'route-choice '+cell.kind);c.dataset.dayChoice=cell.kind;c.style.setProperty('--event-color',({battle:'#8ed6ed',elite:'#bda4ff',boss:'#ff8b9b',shop:'#f4d38e','item-shop':'#e6b3ee',peddler:'#f4b38e',rest:'#88dfb0',wild:'#80dce0',training:'#a8baff','pokemon-training':'#eeb8e3'})[cell.kind]);const image=({battle:'star',elite:'gem',boss:'bossChest',shop:'coin','item-shop':'bag',peddler:'coin',rest:'heart',wild:'ball',training:'book','pokemon-training':'cards'})[cell.kind];c.append(node('small','route-day-stamp',L('Día ','Day ','第')+cell.day+(G.I18n.lang==='zh'?'天':'')),G.ExpeditionEventUI.icon(image,42),node('b','',eventName(cell.kind)),node('p','',({battle:L('Sobrevive o derrota a todos','Survive or defeat all foes','坚持生存，或全歼敌人'),elite:L('Desafío élite · EXP 2+2','Elite challenge · XP 2+2','精英挑战 · 经验2+2'),boss:L('Decisión del ciclo','End-of-cycle showdown','周期决战 · 坚守或击败'),shop:L('Recluta y prepara el equipo','Recruit and prepare','招募伙伴，调整阵容'),'item-shop':L('Suministros para el viaje','Supplies for the journey','选购道具，为远征补给'),peddler:L('Elige un servicio de reclutamiento','Choose a recruitment service','先选服务，再查看伙伴'),rest:L('Duerme o ejercítate','Sleep or exercise','睡觉回血，或锻炼升级'),wild:L('Invita nuevos compañeros','Invite new companions','免费邀请野生伙伴'),training:L('Entrena tus movimientos','Train your moves','强化、换招、专精与突破'),'pokemon-training':L('Entrena, incuba o asciende','Train, hatch or rank up','特训、孵蛋与伙伴升星')})[cell.kind]),node('span','route-card-go',L('Elegir →','Choose →','选择行程 →')));choices.append(c);}today.append(choices);main.append(today);
    const layout=node('section','journey-layout journey-layout-wide'),route=node('div','journey-route'),grid=node('div','journey-grid');const mapHeading=node('div','route-map-heading');mapHeading.append(node('h3','',L('Mapa de ruta','Route map','日程地图')),node('small','',L('Desplázate para explorar','Scroll to explore','滚动查看完整路线')));route.tabIndex=0;route.setAttribute('aria-label',L('Mapa de ruta desplazable','Scrollable route map','可滚动日程地图'));layout.append(mapHeading);grid.setAttribute('role','group');grid.setAttribute('aria-label',L('Itinerario','Schedule','事件日程'));
    for(const row of run.map)for(const cell of row){
      const allowed=R.reachable(run.row,run.col,cell.row,cell.col),current=cell.row===run.row&&cell.col===run.col,visited=run.history.some(h=>h.day===cell.day&&h.col===cell.col);
      const title=cell.day===60&&cell.kind==='boss'?'Arceus':eventName(cell.kind),b=button('',()=>choose(cell.row,cell.col),'journey-event '+cell.kind+(allowed?' reachable':'')+(current?' current':'')+(visited?' visited':''));
      b.dataset.row=cell.row;b.dataset.col=cell.col;b.dataset.event=cell.kind;b.disabled=!allowed;
      b.append(node('small','',cell.row?String(cell.day):'⚑'),node('b','',eventIcon(cell.kind)),node('span','',T(title)));
      b.setAttribute('aria-label',L('Día','Day','第')+' '+cell.day+' · '+T(title)+' · '+(cell.col+1));grid.append(b);
    }
    route.append(grid);layout.append(route);main.append(layout);dashboard.append(left,main,right);box.append(dashboard);
    const actions=node('div','journey-actions');actions.append(button(L('Retirarse','End expedition','结束远征'),()=>{if(confirm(L('¿Terminar y recoger las recompensas?','End the expedition and collect rewards?','结束本次远征并领取奖励？')))G.Game.expeditionEnd();}));box.append(actions);
    G.UI.show('scr-journey');requestAnimationFrame(()=>{const c=grid.querySelector('.reachable');if(c)route.scrollTop=Math.max(0,c.offsetTop-grid.offsetTop-route.clientHeight/2+c.clientHeight/2);box.scrollTop=0;});
  }
  const skillNames={projectile:'Proyectil',melee:'Cuerpo a cuerpo',beam:'Rayo',orbit:'Órbita',chain:'Cadena',dash:'Embestida',meteor:'Meteoro',buff:'Atributos',boomerang:'Bumerán',nova:'Onda',aura:'Aura',mine:'Mina',turret:'Torreta',trail:'Rastro',cone:'Abanico'};
  function tags(p){
    const t=G.Squad.tags(p),wrap=node('div','journey-tags');
    const groups=[[L('Tipo','Type','属性'),t.types.map(x=>T(G.U.TYPE_NAME[x]||x))], [L('Talento de especie','Species talent','种族天赋'),t.eggs.map(x=>G.ExpeditionTerms.egg(x))], [L('Vínculo de oficio','Class bond','职业羁绊'),[G.SquadBonds.label(t.skill)]]];
    for(const [label,names]of groups.filter((_,i)=>i!==1||(G.LeagueRank?.allows('eggTags')??true))){const s=node('span','',names.join(' / '));s.title=label;wrap.append(s);}return wrap;
  }
  function talentText(p){
    if(G.LeagueRank&&!G.LeagueRank.allows('traits'))return '';
    if(G.SquadTraits)return G.SquadTraits.description(p);
    const t=G.Squad.talent(p),effect={atk:L('ataques','attacks','双攻'),hp:L('vida base','base HP','基础生命'),stamina:L('aguante','stamina','耐力'),agility:L('agilidad','agility','敏捷'),regen:L('vida base/s','base HP/s','基础生命/秒')}[t.key];
    return G.ExpeditionTerms.talent(t.name)+' · '+L('Todo el equipo','Whole squad','全队')+' '+effect+' +'+Number((t.value*100).toFixed(1))+'%';
  }
  function squadShortcut(){return button(L('Ver equipo','View squad','查看小队')+' · '+(G.Squad.deployed().length+1)+' / '+G.Squad.capacity,()=>G.Game.toggleSquad(),'btn small journey-squad-link');}
  function openMarket(kind){run.phase=kind;G.Game.expeditionPause();G.ExpeditionMarketUI.open(run,()=>{G.ExpeditionSupplies.leave(run);finishStage();});}
  function refreshScreen(){if(['item-shop','peddler'].includes(run?.phase))openMarket(run.phase);else if(run?.phase==='shop')renderShop();else if(run?.phase==='route')renderRoute();else if(run?.phase==='loot')renderLoot();else if(run?.phase==='wild')renderWild();}
  function choose(row,col){
    if(!run||run.phase!=='route'||!R.reachable(run.row,run.col,row,col))return false;
    G.LeagueRank?.filterMap(run);G.ExpeditionSave?.beforeEvent({row,col});const cell=run.map[row][col];run.row=row;run.col=col;run.day=cell.day;run.totalDay=cell.day;run.dayInCycle=cell.row;run.history.push({day:run.day,col,kind:cell.kind});note='';run.eventKind=cell.kind;
    if(cell.kind==='shop')openShop();
    else if(['item-shop','peddler'].includes(cell.kind))openMarket(cell.kind);
    else if(cell.kind==='training'){run.phase='training';G.ExpeditionTraining.open(run,()=>finishStage());}
    else if(cell.kind==='pokemon-training'){run.phase='pokemon-training';G.PokemonTraining.open(run,()=>{if(run.labChoice==='train'){run.phase='upgrades';G.UI.hideAll();G.Game.expeditionResume();}else finishStage();});}
    else if(cell.kind==='rest')openRest();
    else if(cell.kind==='wild')openWild();
    else startBattle(cell.kind);
    return true;
  }
  function restChoice(kind){
    if(run?.phase!=='rest'||run.restUsed||!['sleep','exercise'].includes(kind))return false;run.restUsed=true;
    if(kind==='sleep')run.captain.heal(run.captain.maxHp*G.EconomyConfig.rest.healFraction);else G.Economy.addXp(run,G.EconomyConfig.rest.trainerXp);
    G.Squad.syncTrainer();G.SquadTraits?.restEnd();finishStage(kind==='sleep'?L('Descanso completo','Rested well','睡饱了，继续出发。'):L('Entrenamiento completo','Exercise complete','锻炼完成，训练家经验 +3。'));return true;
  }
  function openRest(){
    run.phase='rest';run.restUsed=false;G.Game.expeditionPause();const scene=G.ExpeditionEventUI.room(run,L('Campamento de descanso','Rest camp','休息营地'),'heart',L('Elige cómo pasar el día.','Choose how to spend the day.','选择今天的休整方式：睡觉恢复队长生命，或锻炼提升训练家等级。'));
    const choices=node('div','training-options rest-options');for(const [id,title,image,desc]of [['sleep',L('Dormir','Sleep','睡觉'),'heart',L('Recupera un 50% de la vida máxima del capitán.','Restore 50% of captain maximum HP.','恢复队长50%最大生命；超过上限的部分不保留。')],['exercise',L('Ejercicio','Exercise','锻炼'),'star',L('Gana 3 EXP de entrenador.','Gain 3 trainer XP.','获得3点训练家经验，不额外回复生命。')]]){const card=button('',()=>restChoice(id),'training-option');card.dataset.restAction=id;card.append(G.ExpeditionEventUI.icon(image,36),node('h3','',title),node('p','',desc));choices.append(card);}scene.main.append(choices);G.UI.show('scr-journey');scene.root.scrollTop=0;
  }
  function openWild(){
    run.phase='wild';const cfg=G.EconomyConfig.wild,count=cfg.minEncounters+Math.floor(Math.random()*(cfg.maxEncounters-cfg.minEncounters+1)),active=new Set();
    G.SquadBonds.refresh();for(const type of Object.keys(G.U.TYPE_NAME))if(G.SquadBonds.count('types',type)>=2)active.add(type);
    const matching=mon=>mon.types.some(type=>active.has(type))||G.SquadBonds.state(G.Moves.BY_ID[G.FIXED_SKILLS?.[mon.dex]||G.Moves.startFor(mon)]?.kind).tier>0;
    const encounters=[];if(active.size||G.SquadBonds.KINDS.some(k=>G.SquadBonds.state(k).tier))encounters.push(run.unitPool.draw(run.trainerLevel,Math.random,matching)||run.unitPool.draw(G.EconomyConfig.levels.at(-1).level,Math.random,matching));
    while(encounters.filter(Boolean).length<count){const card=run.unitPool.draw(run.trainerLevel);if(!card)break;encounters.push(card);}run.wildOffers=encounters.filter(Boolean);
    renderWild();
  }
  function renderWild(){
    const scene=G.ExpeditionEventUI.room(run,L('Exploración silvestre','Wild expedition','野外探险'),'ball',L('Captura gratis; los compañeros esperan si no hay espacio.','Capture for free; companions wait safely if reserves are full.','免费邀请野生伙伴；仓库满时可先整理小队，伙伴会保留等待领取。')),box=scene.main;
    const goods=node('div','journey-goods');
    for(const o of run.wildOffers){
      const mon=G.DEX_BY[o.dex],card=node('section','journey-product quality-'+G.ExpeditionQuality.quality(mon)),canReceive=G.Squad.canRecruit(o.dex,o.rank||1);
      card.append(portrait(mon,100),node('h3','',T(mon.name)));lootCompanionPreview(card,mon);
      const capture=button(o.sold?L('Recibido','Received','已领取'):canReceive?L('Capturar','Capture','捕获'):L('Organizar la reserva','Arrange reserves to collect','整理仓库后领取'),()=>{
        if(o.sold||run.phase!=='wild')return;
        if(!G.Squad.recruit(o.dex,o.moveId,o.rank||1,o.poolCopies===0?{poolCopies:0}:{})){G.UI.toast(L('Sin espacio. El compañero sigue esperando.','No space. The companion is still waiting.','仓库已满，伙伴仍在等待领取，请先整理小队。'));G.Game.toggleSquad();return;}
        o.sold=true;renderWild();
      },'btn gold');
      capture.dataset.wildCapture=o.dex;capture.disabled=!!o.sold;card.append(capture);goods.append(card);
    }
    const pending=run.wildOffers.some(o=>!o.sold),next=button(pending?L('Omitir los restantes y seguir','Skip remaining companions and continue','跳过未领取伙伴，继续旅程'):L('Seguir la ruta','Continue route','继续旅程'),()=>{for(const o of run.wildOffers)run.unitPool.putBack(o);run.wildOffers=[];finishStage();},'btn gold');next.id='journey-wild-next';
    box.append(goods,squadShortcut(),next);G.UI.show('scr-journey');
  }
  function openShop(free=false){
    run.phase='shop';G.Game.expeditionPause();run.postBossShop=free;run.talentShopBought=false;run.shopFreeRefreshes=G.EconomyConfig.shop.shopDayFreeRefreshes;G.SquadTraits?.visitShop();rollShop();G.HoennMarket?.enterShop(run,offer);renderShop();
  }
  function rollShop(force=false,manual=false){
    if(run.shopLocked&&!force)return;
    for(const o of offer)run.unitPool.putBack(o);
    offer=Array.from({length:G.EconomyConfig.shop.unitSlotCount},()=>run.unitPool.draw(run.trainerLevel));G.TrainerTalents?.shop(run,offer);if(manual){G.LeagueRank?.pityShop(run,run.unitPool,offer);G.HoennMarket?.rolled(run,offer);}
  }
  function buy(index,ticket=false){
    if(run?.phase!=='shop'||G.TrainerTalentsUI?.busy)return false;const o=offer[index];if(!o||o.kind!=='mon'||o.sold)return false;const cost=G.HoennMarket?.price((G.TrainerTalents?.price(run,G.SquadTraits?.price(o.cost,o.kind)??o.cost)??o.cost),'mon')??o.cost;if(ticket?!(run.traitRecruitTickets>0):!(G.HoennMarket?.canPay(cost,o.hoennToken)??run.gold>=cost))return false;
    if(!G.Squad.recruit(o.dex,o.moveId,o.rank||1)){G.UI.toast(L('La reserva está llena. Libera un compañero.','Reserves are full. Release a companion first.','候补仓库已满，请先放生伙伴。'));return false;}
    if(ticket)run.traitRecruitTickets--;else{if(G.HoennMarket)G.HoennMarket.pay(cost,o.hoennToken);else run.gold-=cost;run.talentShopBought=true;}o.sold=true;renderShop();return true;
  }
  function upgrade(){if(!run||!G.Economy.buyXp(run))return false;G.Squad.syncTrainer();renderShop();if(!$('squad-rankup')&&!G.TrainerTalentsUI?.busy)$('journey-upgrade').focus({preventScroll:true});$('journey-shop-progress').classList.add('xp-purchased');G.UI.toast(L('Experiencia de entrenador','Trainer XP','训练家经验')+' +'+G.EconomyConfig.buyXp.xpGain+' · Lv.'+run.trainerLevel);return true;}
  function toggleShopLock(){if(run?.phase!=='shop')return false;run.shopLocked=!run.shopLocked;renderShop();return true;}
  function refreshShop(){if(run?.phase!=='shop')return false;const cost=G.Economy.refreshCost(run);if(G.TrainerTalentsUI?.busy)return false;if(run.shopFreeRefreshes>0)run.shopFreeRefreshes--;else if(run.talentFreeRefreshes>0)run.talentFreeRefreshes--;else if(run.traitFreeRefresh>0)run.traitFreeRefresh--;else{if(run.gold<cost)return false;run.gold-=cost;}run.shopLocked=false;run.rankRefreshCount=(run.rankRefreshCount||0)+1;G.ExpeditionSupplies?.refreshed(run);rollShop(true,true);renderShop();return true;}
  function renderShop(){
    const lv=G.Squad.shopLevel,box=header(L('Tienda Pokémon','Pokémon shop','宝可梦商店'),L('Invita compañeros y amplía tu formación. Los objetos se consiguen en combate.','Invite companions and expand your formation. Earn items through battle.','邀请伙伴、扩充编队。道具通过战斗获得。'));
    const info=node('div','journey-meta');info.append(node('b','journey-gold',L('Oro','Gold','局内金币')+' '+G.Economy.formatGold(run.gold)),node('b','',L('Entrenador','Trainer','训练家')+' Lv.'+lv),node('span','',L('Plazas','Squad limit','编队上限')+' '+G.Squad.capacity));info.append(squadShortcut());box.append(info);
    const layout=node('div','journey-layout journey-layout-wide'),goods=node('div','journey-goods');
    offer.forEach((o,i)=>{
      if(!o){goods.append(node('article','journey-product journey-empty',L('Reserva agotada','Pool exhausted','当前费用档位暂无可招募伙伴')));return;}
      const cost=G.HoennMarket?.price((G.TrainerTalents?.price(run,G.SquadTraits?.price(o.cost,o.kind)??o.cost)??o.cost),'mon')??o.cost;
      const card=node('article','journey-product quality-'+(G.ExpeditionQuality?.quality(o.dex)||1));card.dataset.product=i;
      const family=G.MonProgression.rootFor(o.dex),owned=[run.captain,...G.Squad.roster].filter(p=>G.MonProgression.rootFor(p.dex)===family),merge=G.Squad.roster.some(p=>G.MonProgression.rootFor(p.dex)===family&&p.rank===(o.rank||1)&&p.rank<3);
      if(!o.sold&&owned.length){card.classList.add('journey-owned');card.dataset.owned='true';card.dataset.merge=String(merge);card.append(node('strong','journey-owned-badge',merge?L('¡Ascenso disponible!','Ready to merge!','可合成升星'):L('Ya está en el equipo','Already in your squad','队伍已有')));}
      const content=node('div','journey-product-art');
      {const mon=G.DEX_BY[o.dex],rank=o.rank||1,move=G.Moves.instance(o.moveId,[0,1,3,5][rank]);content.append(portrait(mon,100));card.append(content,node('small','',L('Compañero','Companion','队员邀请')+' · '+(G.ExpeditionQuality?.label(mon)||'')+' · '+'★'.repeat(rank)),node('h3','',T(mon.name)));const dummy={mon,dex:mon.dex,rank,moves:[move]};if(G.SquadTraits&&(G.LeagueRank?.allows('traits')??true)){const trait=node('p','journey-shop-trait',G.SquadTraits.description(dummy));trait.setAttribute('translate','no');card.append(trait);}card.append(tags(dummy),node('p','journey-shop-move',T(move.name)+' · '+(move.evolved?L('Definitivo','Ultimate','超武'):'Lv.'+move.lvl)));}
      const b=button(o.sold?L('Invitado / adquirido','Recruited / acquired','已邀请／购入'):cost+' '+L('oro','gold','金币'),()=>buy(i),'btn gold');b.dataset.buy=i;b.disabled=o.sold||!(G.HoennMarket?.canPay(cost,o.hoennToken)??run.gold>=cost);card.append(node('small','',L('En reserva','In pool','池内剩余')+' '+run.unitPool.stock.get(G.MonProgression.rootFor(o.dex))),b);if(run.traitRecruitTickets>0){const t=button(L('Invitación dirigida','Directed recruit ticket','使用定向招募券')+' · '+run.traitRecruitTickets,()=>buy(i,true),'btn');t.dataset.recruitTicket=i;t.disabled=!!o.sold;card.append(t);}goods.append(card);
    });
    const row=G.Economy.levelRow(lv),xp=G.EconomyConfig.buyXp;
    const odds=node('div','journey-odds');row.odds.forEach((chance,i)=>{const span=node('span','quality-'+(i+1),G.EconomyConfig.unitTiers[i+1].cost+' G · '+chance+'%');odds.append(span);});box.append(odds);
    const controls=node('div','journey-shop-controls'),up=button(xp.goldCost+' G → '+xp.xpGain+' XP',upgrade,'btn');up.id='journey-upgrade';up.disabled=lv>=G.Economy.maxLevel(run)||run.gold<xp.goldCost;
    const free=(run.shopFreeRefreshes||0)+(run.traitFreeRefresh||0)+(run.talentFreeRefreshes||0),refresh=button(L('Renovar','Refresh','刷新商品')+' · '+(free?L('Gratis','Free','免费')+' ('+free+')':G.Economy.refreshCost(run)+' G'),refreshShop);refresh.id='journey-refresh';refresh.disabled=!free&&run.gold<G.Economy.refreshCost(run);
    const lock=button(run.shopLocked?L('Desbloquear tienda','Unlock shop','解锁整店'):L('Bloquear tienda','Lock shop','锁定整店'),toggleShopLock,'btn');lock.id='journey-shop-lock';lock.setAttribute('aria-pressed',String(run.shopLocked));
    controls.append(up,refresh,button(L('Seguir la ruta','Continue route','离开商店'),()=>{if(run.postBossShop){run.postBossShop=false;showRoute();}else finishStage();},'btn gold'),lock);
    if(lv>=G.EconomyConfig.itemTiers.POP_CAP.unlockLevel&&!run.hasPopCapItem){const expand=button(L('Ampliar formación','Expand formation','编队扩容')+' · '+G.EconomyConfig.itemTiers.POP_CAP.price+' G',()=>{if(G.Economy.buyPopCap(run)){G.Squad.syncTrainer();renderShop();}});expand.id='journey-expand';expand.disabled=run.gold<G.EconomyConfig.itemTiers.POP_CAP.price;controls.append(expand);}
    if(run.cycle>=G.EconomyConfig.endless.unlockCycle&&lv===G.EconomyConfig.levels.at(-1).level){const license=button(L('Licencia de entrenador','Trainer license','训练家执照')+' · '+G.Economy.licenseCost(run)+' G',()=>{if(G.Economy.buyLicense(run)){G.Squad.syncTrainer();renderShop();}});license.id='journey-license';license.disabled=run.gold<G.Economy.licenseCost(run);controls.append(license);}
    const toolbar=node('section','journey-shop-toolbar'),progress=progressPanel();progress.id='journey-shop-progress';progress.setAttribute('aria-live','polite');toolbar.append(progress,controls);box.append(toolbar);
    goods.append(node('p','note',L('Cinco invitaciones, sin objetos. Bloquear conserva todo al volver; renovar desbloquea la tienda.','Five invitations, no item sales. Lock to preserve all slots on your next visit; refreshing unlocks the shop.','固定5格宝可梦邀请，不出售道具。锁定保留整店至下次访问，手动刷新会解除锁定。')));layout.append(goods);box.append(layout);G.HoennMarketUI?.renderShop(box,run);G.UI.show('scr-journey');if(run.pendingTalentPicks?.length)G.TrainerTalentsUI?.showPickModal(renderShop);
  }
  function startBattle(kind){
    run.phase='combat';run.squadHealing={};run.kind=kind;run.elapsed=0;run.spawned=0;run.acc=0;run.kills=0;run.wave=R.wave(run.day,kind);run.bossDead=false;run.waveType=Math.random()<.5?G.U.pick([...new Set(run.pool.flatMap(p=>p.types))]):null;
    run.appeared=new Set();run.xpJarStored=0;run.xpJarSpent=0;run.pokemonXpGained=0;run.battleCleared=false;
    run.bossEmblemChoices=null;run.bossEmblemClaimed=false;run.companion=null;run.companionOffer=null;run.companionResolved=false;run.loot={};run.goldStart=run.gold;run.lockedGoldAtBattleStart=run.gold;run.inWaveCoinDrops=0;run.settlement=null;run.traitBattleRewards={};
    run.extraStart=JSON.parse(JSON.stringify(G.Game.loot||{}));
    run.pendingSpawns=[];G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Pickups.clear();G.Hazards.clear();G.Path.clear();
    G.World.setBiome(Math.floor((run.day-1)/5));G.Squad.recover();
    G.ExpeditionDamage?.beginBattle(run.day);G.TypeBonds?.beginStage();G.SquadTraits?.beginBattle();G.TrainerTalents?.beginBattle(run);G.SquadSupport?.beginBattle();G.LeaderAbilities?.beginBattle();G.ExpeditionGrowth?.beginBattle();G.ExpeditionRecorder?.beginBattle(run);
    for(const p of G.Squad.actors())G.Abilities.resetStage(p,run.day);
    if(kind==='boss')run.spawned=spawn(true)?1:0;
    G.UI.hideAll();G.Touch.reset();G.Game.expeditionResume();G.Audio.sfx('confirm');
  }
  function spawn(boss=false){
    const cap=run.captain,wave=run.wave,candidates=R.encounterCandidates(run.pool,run.day,boss);
    const same=Math.random()<.85,typed=!boss&&run.waveType?candidates.filter(p=>p.types.includes(run.waveType)===same):null,mon=boss&&G.ExpeditionSupplies?G.DEX_BY[G.ExpeditionSupplies.bossDex(run,run.day)]:boss&&run.day===60?G.DEX_BY[493]:G.U.pick(typed?.length?typed:candidates.length?candidates:run.pool);
    let x=cap.x,y=cap.y,free=false;for(let i=0;i<24;i++){const a=Math.random()*Math.PI*2,d=100+Math.sqrt(Math.random())*Math.max(180,G.Camera.outerRadius());x=cap.x+Math.cos(a)*d;y=cap.y+Math.sin(a)*d;if(G.World.isFree(x,y,20)){free=true;break;}}if(!free){
      // A deterministic search keeps random misses from delaying the finite wave.
      for(let radius=100;radius<=Math.max(180,G.Camera.outerRadius())+180&&!free;radius+=40)for(let j=0;j<32;j++){
        const angle=j*Math.PI/16,px=cap.x+Math.cos(angle)*radius,py=cap.y+Math.sin(angle)*radius;
        if(G.World.isFree(px,py,20)){x=px;y=py;free=true;break;}
      }
    }if(!free)return null;
    const behavior=boss?'chase':G.Enemies.behaviorOf(mon),def={dex:mon.dex,name:mon.name,hp:boss?3*(350+run.day*24):12+(mon.baseStats?.hp||60)*.2,spd:boss?55:48+(mon.baseStats?.spe||60)*.15,dmg:boss?14:4+Math.min(8,mon.rarity),xp:boss?80:10+Math.floor(run.day/2),behavior,shotDmg:boss?14:5,shotCd:3.5,range:200};
    const e=new G.Enemy(def,x,y,{hp:wave.hp*(boss?1.6:1),spd:wave.speed,dmg:wave.dmg},boss);e.expedition=true;e.expeditionArceus=boss&&run.day===60;
    if(run.kind==='elite'&&!boss)e.makeElite();if(!boss&&Math.random()<G.Difficulty.eliteChance())e.makeElite();
    if(G.Sprites.hasShiny(mon.dex)&&Math.random()<G.Spawner.SHINY_RATE)e.makeShiny();
    run.pendingSpawns.push({enemy:e,left:2});G.Sprites.preload([mon.dex]);return e;
  }
  function battlePressure(){
    if(run.elapsed<(run.wave.enrageAt??run.wave.standardDuration))return null;
    return run.kind==='battle'?'chase':'enraged';
  }
  function applyPressure(){
    const pressure=battlePressure();
    if(!pressure)return;
    const t=G.EconomyConfig.battleTiming,level=pressure==='enraged'?1+Math.floor(Math.max(0,run.elapsed-run.wave.enrageAt)/t.enrageStepSeconds):1;
    const speed=pressure==='enraged'?t.enrageSpeed+(level-1)*t.enrageSpeedStep:1.30;
    for(const enemy of G.EnemyMgr.all()){
      if(!enemy.expedition||enemy.dead||enemy.expeditionPressure===pressure&&enemy.expeditionPressureLevel===level)continue;
      // Replace only the previous pressure multiplier, retaining enemy-specific speed changes.
      enemy.spd=enemy.spd/(enemy.expeditionPressureSpeed||1)*speed;
      if(pressure==='enraged'&&enemy.expeditionPressure!=='enraged')enemy.dmg*=t.enrageDamage;
      enemy.expeditionPressure=pressure;enemy.expeditionPressureSpeed=speed;enemy.expeditionPressureLevel=level;
    }
  }

  function tick(dt){
    if(!run||run.phase!=='combat'||run.captain.dead)return;
    dt=Math.max(0,Math.min(dt,run.wave.duration-run.elapsed));run.elapsed+=dt;
    G.ExpeditionRecorder?.tick(dt);
    for(const warning of run.pendingSpawns||[])warning.left-=dt;
    const ready=(run.pendingSpawns||[]).filter(w=>w.left<=0);run.pendingSpawns=(run.pendingSpawns||[]).filter(w=>w.left>0);
    for(const {enemy} of ready){
      G.EnemyMgr.add(enemy);
      run.appeared.add(enemy.dex);
    }
    applyPressure();
    if(run.kind!=='boss'){
      // Fixed total and an absolute schedule: surviving enemies never delay later spawns.
      const due=Math.min(run.wave.count,Math.floor(run.wave.count*run.elapsed/run.wave.spawnDuration+1e-8));
      while(run.spawned<due){if(!spawn())break;run.spawned++;}
      const alive=G.EnemyMgr.all().filter(e=>!e.dead).length,cleared=run.spawned>=run.wave.count&&alive===0&&G.EnemyMgr.count===0&&!run.pendingSpawns?.length;
      if(cleared||run.elapsed>=run.wave.duration)finishBattle(cleared);
    }else if(run.bossDead&&!G.EnemyMgr.all().some(e=>e.boss&&!e.dead))finishBattle(true);else if(run.elapsed>=run.wave.duration)finishBattle(false);else if(!run.spawned){if(spawn(true))run.spawned=1;}
  }
  function drawWarnings(ctx){
    if(!run||run.phase!=='combat')return;ctx.save();ctx.textAlign='center';ctx.font='bold 15px sans-serif';
    for(const w of run.pendingSpawns||[]){const e=w.enemy,r=e.boss?65:30,k=1-w.left/2;ctx.globalAlpha=.55+.35*Math.sin(k*Math.PI*8)**2;ctx.fillStyle='#571438';ctx.strokeStyle='#fff494';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(e.x,e.y,r,r*.7,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.fillText('! '+Math.max(0,w.left).toFixed(1),e.x,e.y+5);}
    ctx.restore();
  }
  function drawEnemyPointers(ctx,w,h){
    if(run?.phase!=='combat'||battlePressure()!=='chase')return;
    const cam=G.Camera,cap=run.captain,markers=new Map(),segments=12,step=Math.PI*2/segments;
    const footX=w/2+(cap.x-cam.x+(cam._sx||0))*cam.scale,footY=h/2+(cap.y-cam.y+(cam._sy||0))*cam.scale;
    const radius=Math.max(28,Math.min(44,cap.r*cam.scale+22));
    for(const enemy of G.EnemyMgr.all()){
      if(enemy.dead||!enemy.expedition||cam.sees(enemy.x,enemy.y-enemy.bodyH/2,0))continue;
      const angle=Math.atan2(enemy.y-cap.y,enemy.x-cap.x),sector=(Math.round(angle/step)+segments)%segments;
      const marker=markers.get(sector);if(marker)marker.count++;else markers.set(sector,{angle:sector*step,count:1});
    }
    if(!markers.size)return;
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 10px system-ui';
    ctx.beginPath();ctx.ellipse(footX,footY,Math.max(6,cap.r*cam.scale),Math.max(4,cap.r*cam.scale*.45),0,0,Math.PI*2);ctx.fillStyle='#10233599';ctx.fill();
    for(const {angle,count} of markers.values()){
      const x=footX+Math.cos(angle)*radius,y=footY+Math.sin(angle)*radius;
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-5,-5);ctx.lineTo(-3,0);ctx.lineTo(-5,5);ctx.closePath();ctx.fillStyle='#ffdb7b';ctx.strokeStyle='#14202b';ctx.lineWidth=3;ctx.stroke();ctx.fill();ctx.restore();
      if(count>1){const tx=footX+Math.cos(angle)*(radius+15),ty=footY+Math.sin(angle)*(radius+15);ctx.fillStyle='#0c1c2ce6';ctx.fillRect(tx-9,ty-7,18,14);ctx.fillStyle='#fff1bf';ctx.fillText(String(count),tx,ty);}
    }
    ctx.restore();
  }
  function killed(e){
    if(!run||run.phase!=='combat'||!e.expedition)return;
    run.kills++;
    if(e.boss)run.bossDead=true;
  }
  function battleCompanion(){
    const early=run.battlesCompleted<=G.EconomyConfig.earlyCompanionBattles;
    if(!early&&(!run.battleCleared||Math.random()>=Math.min(1,(G.LeagueRank?.rules(run).companionChance??G.EconomyConfig.clearCompanionChance)+(G.ExpeditionSupplies?.inviteBonus(run)||0))))return;
    const level=run.trainerLevel,owned=new Set([run.captain,...G.Squad.roster].map(p=>G.MonProgression.rootFor(p.dex)));
    if(early)run.companionOffer=run.unitPool.draw(level,Math.random,p=>!owned.has(G.MonProgression.rootFor(p.dex)))||run.unitPool.draw(level);
    if(!run.companionOffer){const dex=R.lootCompanion(run.appeared||new Set(),run.pool,level);if(dex)run.companionOffer={kind:'mon',dex:R.formForRank(dex,1),rank:1,cost:R.monCost(G.DEX_BY[dex]),reserved:false,poolCopies:0};}
    run.companion=run.companionOffer?.dex||null;
  }
  function finishBattle(cleared){
    if(run.phase!=='combat')return;
    G.LeaderAbilities?.finishBattle();G.ExpeditionGrowth?.endBattle();
    const damage=R.squadDamage([...G.EnemyMgr.all(),...(run.pendingSpawns||[]).map(w=>w.enemy)],R.cycleOf(run.day));
    G.ExpeditionSupplies?.absorb(run,damage);damage.before=run.squadHp;run.squadHp=Math.max(0,run.squadHp-damage.applied);damage.after=run.squadHp;run.squadDamage=damage;
    if(run.squadHp<=0&&G.TrainerTalents?.rescue(run)){damage.after=run.squadHp;damage.rescued=true;}
    if(run.squadHp<=0){G.ExpeditionRecorder?.finish('defeat');run.phase='squad-defeat';run.pendingSpawns=[];G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();G.Game.expeditionDefeat();return;}
    run.battleCleared=cleared;G.ExpeditionRecorder?.finish(cleared?'cleared':'survived');run.battlesCompleted++;battleCompanion();
    if(run.kind==='boss'&&(G.LeagueRank?.allows('types')??true)){const types=Object.keys(G.U.TYPE_NAME);run.bossEmblemChoices=[];while(run.bossEmblemChoices.length<G.EconomyConfig.bossEmblem.choices)run.bossEmblemChoices.push(types.splice(Math.floor(Math.random()*types.length),1)[0]);run.bossEmblemClaimed=false;}
    run.remainingHpRatio=Math.max(0,run.captain.hp/run.captain.maxHp);
    G.SquadTraits?.finishBattle(cleared);if(run.day===G.EconomyConfig.cycleLengthDays*G.EconomyConfig.clearCycleThreshold&&run.kind==='boss'){run.arceus=true;run.cashout=true;}run.phase='battle-result';run.pendingSpawns=[];
    G.EnemyMgr.update(0,G.Squad.actors());
    bankGroundXp();G.TrainerTalents?.battleEnd(run);G.ExpeditionSupplies?.battleEnd(run,cleared);
    note=cleared?L('¡Todos derrotados!','All foes defeated!','全歼奖励！'):L('Etapa superada','Stage survived','成功度过波次');
    G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();
    const rewards=G.EconomyConfig.compatibility,itemCount=run.kind==='elite'?rewards.eliteVictoryItems+(G.LeaderAbilities?.extraEliteItems()||0):cleared&&run.kind==='battle'?rewards.normalClearItems:0;
    for(let i=0;i<itemCount;i++)G.Pickups.drop('item',run.captain.x,run.captain.y,G.Items.roll());
    showBattleResult(cleared);
  }
  function clearBattleResult(){
    battleResult?.element.remove();battleResult=null;
  }
  function showBattleResult(cleared){
    clearBattleResult();G.Game.expeditionPause();G.Touch.reset();
    const banner=node('div','expedition-battle-result');banner.id='expedition-battle-result';banner.dataset.cleared=String(cleared);
    banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
    const strip=node('div','expedition-battle-result-strip');
    strip.append(node('small','',L('Día ','Day ','第')+run.day+(G.I18n.lang==='zh'?'天':'')+' · '+L('Combate terminado','Battle complete','战斗结束')),
      node('strong','expedition-battle-result-title',cleared?L('¡Todos los enemigos derrotados!','ALL ENEMIES DEFEATED','全灭敌人'):run.kind==='battle'?L('TIEMPO AGOTADO','TIME UP','时间结束'):L('¡SUPERVIVENCIA LOGRADA!','SURVIVAL SUCCESS','成功生存')),
      node('span','',L('Preparando el botín','Preparing battle loot','准备结算战利品')));
    banner.append(strip);document.body.append(banner);
    battleResult={run,element:banner,until:performance.now()+BATTLE_RESULT_MS};
  }
  // Presentation uses wall time, independently of simulation speed and hit stops.
  function tickPresentation(){
    if(!battleResult)return;
    if(run!==battleResult.run||run?.phase!=='battle-result'||run.captain.dead||['over','ui'].includes(G.Game.state)){clearBattleResult();return;}
    if(performance.now()<battleResult.until)return;
    clearBattleResult();run.phase='rewards';G.Game.expeditionResume();
  }
  function bankGroundXp(){
    if(!run||!['battle-result','rewards'].includes(run.phase))return 0;
    let stored=0;for(const p of [...(G.Pickups.all?.()||[])])if(p.kind==='xp'||p.kind==='xpBig'){
      G.Pickups.removeId(p.id);const amount=Number(p.value);if(Number.isFinite(amount)&&amount>0)stored+=amount;
    }
    const added=G.ExpeditionSupplies?G.ExpeditionSupplies.deposit(run,stored):stored;if(!G.ExpeditionSupplies)run.xpJar=(run.xpJar||0)+stored;run.xpJarStored=(run.xpJarStored||0)+added;return added;
  }
  function takeStoredXp(amount){
    if(run?.phase!=='combat'||!Number.isFinite(amount)||amount<=0)return 0;
    const bonus=Math.min(run.xpJar||0,amount*(G.ExpeditionSupplies?.extraction(run)||1));run.xpJar=Math.max(0,(run.xpJar||0)-bonus);run.xpJarSpent=(run.xpJarSpent||0)+bonus;return bonus;
  }
  function xpJarPanel(){
    const panel=node('p','journey-xp-jar');panel.dataset.xpJar=run.xpJar||0;
    const cap=G.ExpeditionSupplies.jarMax(run),ratio=G.ExpeditionSupplies.extraction(run);panel.append(node('b','',L('Reserva de experiencia','Experience jar','经验罐')+' · '+Math.round(run.xpJar||0).toLocaleString()+' / '+cap),node('small','',L('Retirada por XP: ','Withdrawal per XP: ','拾取经验额外提取 ×')+Number(ratio.toFixed(2))));const track=node('span','expedition-xp-track'),fill=node('span');fill.style.width=Math.min(1,(run.xpJar||0)/cap)*100+'%';track.append(fill);panel.append(track);return panel;
  }
  function recordPickup(p){
    if(!run||!['combat','rewards'].includes(run.phase))return;
    if(!G.EconomyConfig.combatGoldDrops&&['coin','treasure'].includes(p.kind))return;
    G.LeaderAbilities?.pickup();if(p.kind==='coin'||p.kind==='treasure')run.inWaveCoinDrops+=Math.max(0,Number(p.value)||0);
    const k=p.kind,key=k==='item'?'item:'+p.value:k;
    if(['xp','xpBig','coin','treasure'].includes(k))run.loot[key]=(run.loot[key]||0)+Number(p.value||0);
    else if(['ticket','ticket10','item','bossChest'].includes(k))run.loot[key]=(run.loot[key]||0)+1;
  }
  function showLoot(levels=0){if(run?.phase!=='rewards')return;G.Economy.settleDay(run,{eventType:run.kind,victory:!run.captain.dead,cleared:run.battleCleared,remainingHpRatio:run.remainingHpRatio,inWaveCoinDrops:run.inWaveCoinDrops,lockedGoldAtBattleStart:run.lockedGoldAtBattleStart});G.Squad.syncTrainer();run.freeShopPending=run.settlement.grantFreePostBossShop;run.levels=levels;run.phase='loot';G.Game.expeditionPause();if(run.pendingTalentPicks?.length)G.TrainerTalentsUI.showPickModal(renderLoot);else renderLoot();}
  function claimCompanion(){
    if(run?.phase!=='loot'||!run.companion||run.companionResolved)return false;
    if(!G.Squad.recruit(run.companion,run.companionOffer.moveId||null,1,run.companionOffer.poolCopies===0?{poolCopies:0}:{})){G.UI.toast(L('Organiza el equipo para recibir al compañero.','Arrange your squad to collect the companion.','请先整理小队，伙伴会保留等待领取。'));G.Game.toggleSquad();return false;}run.companionOffer.sold=true;
    run.companionResolved=true;renderLoot();return true;
  }
  function lootCompanionPreview(card,mon){
    const rank=1;
    const moveId=G.FIXED_SKILLS?.[mon.dex]||G.Moves.startFor(mon);
    const move=G.Moves.instance(moveId,1);
    const candidate={mon,dex:mon.dex,rank,moves:[move]};
    const preview=node('div','journey-loot-preview');
    const quality=G.ExpeditionQuality?.label(mon);
    const rankText=L('Rango 1','1 star','1星');
    preview.append(node('p','journey-loot-rank',[quality,'★ '+rankText].filter(Boolean).join(' · ')));
    preview.append(tags(candidate));
    preview.append(node('p','journey-loot-move',T(move.name)+' · Lv.'+move.lvl+' · '+G.Moves.classLabel(move)));
    if(G.SquadTraits&&(G.LeagueRank?.allows('traits')??true)){
      const trait=node('p','journey-shop-trait',talentText(candidate));
      trait.setAttribute('translate','no');
      preview.append(trait);
    }
    card.append(preview);
  }
  function renderLoot(){
    const box=$('journey-content'),first=!box.classList.contains('battle-loot-box'),scroll=first?0:box.scrollTop;box.replaceChildren();box.classList.add('battle-loot-box');
    G.ExpeditionLootUI.render(box,run,{
      onClaim:claimCompanion,
      onRelease:()=>{if(run.phase!=='loot'||run.companionResolved)return;run.unitPool.putBack(run.companionOffer);run.companionResolved=true;run.companion=null;renderLoot();},
      onEmblem:type=>{if(run.bossEmblemClaimed||run.phase!=='loot'||!run.bossEmblemChoices.includes(type))return;run.bossEmblemClaimed=true;run.emblems[type]=(run.emblems[type]||0)+G.EconomyConfig.bossEmblem.countBonus;G.Squad.refresh();renderLoot();},
      onSquad:()=>G.Game.toggleSquad(),
      onNext:()=>{if(run.phase!=='loot'||run.bossEmblemChoices&&!run.bossEmblemClaimed)return;run.unitPool.putBack(run.companionOffer);run.companionResolved=true;run.phase='upgrades';G.UI.hideAll();G.Game.expeditionResume();}
    });G.UI.show('scr-journey');box.scrollTop=scroll;G.ExpeditionSave?.mark();
  }
  function recordPokemonXp(p,amount){if(run&&run.captain===p&&['combat','rewards'].includes(run.phase)&&Number.isFinite(amount)&&amount>0)run.pokemonXpGained=(run.pokemonXpGained||0)+amount;}
  function depart(){if(run?.phase!=='upgrades')return;finishStage(note);}
  function finishStage(message=''){
    if(!run)return;if(run.traitNeedsUpgrades){run.traitNeedsUpgrades=false;note=message||note;run.phase='upgrades';G.UI.hideAll();G.Game.expeditionResume();return;}if(!run.settledDays.has(run.day)){G.Economy.settleDay(run,{eventType:run.eventKind});G.Squad.syncTrainer();}G.ExpeditionSupplies?.eventEnd(run);if(run.traitNeedsUpgrades){finishStage(message);return;}G.SquadTraits?.dayEnd();G.Game.scoreEvent();G.TypeBonds?.beginStage();G.Squad.recover();note=message;if(run.settlement?.investmentReturn)note+=' '+L('Retorno de inversión +','Investment repayment +','投资回收 +')+G.Economy.formatGold(run.settlement.investmentReturn)+' G';
    const hatched=G.PokemonTraining?.hatch(run)||0;if(hatched&&(G.LeagueRank?.allows('pokemon-training')??true))note+=' '+L('Huevos eclosionados: ','Hatched companions: ','孵化伙伴：')+hatched;
    if(run.day%G.EconomyConfig.cycleLengthDays===0&&run.day>0){run.cycle++;G.Economy.addXp(run,0);G.Squad.syncTrainer();run.map=R.matrix(run.cycle,Math.random,run.leagueTier,run.permanentPerks?.events);run.row=0;run.history=[{day:run.day,col:run.col}];note+=' '+L('Un nuevo ciclo: los rivales se han fortalecido.','A new cycle: foes have grown much stronger.','新的周期开始了，对手变得更强了。');}
    if(run.day===G.EconomyConfig.cycleLengthDays*G.EconomyConfig.clearCycleThreshold&&run.cashout){G.Game.expeditionVictory();return;}
    if(run.freeShopPending){run.freeShopPending=false;openShop(true);}else showRoute();G.ExpeditionSave?.auto();
  }
  function continueAfterVictory(){if(!run)return;run.cashout=false;G.Server?.heartbeat?.().catch(()=>{});if(run.freeShopPending){run.freeShopPending=false;openShop(true);}else showRoute();}
  function reset(){G.TrainerTalentsUI?.reset();clearBattleResult();G.ExpeditionRecorder?.reset();run=null;G.Squad.reset();G.ExpeditionSave?.reset();const el=$('journey-status');if(el)el.hidden=true;const xp=$('expedition-progress-hud');if(xp)xp.hidden=true;}
  function hud(){
    const xp=$('expedition-progress-hud');if(xp){xp.hidden=run?.phase!=='combat'||G.Game.state!=='playing';if(!xp.hidden){const p=run.captain,key=[run.trainerLevel,run.trainerXp,p.level,p.xp,p.xpNext,run.cycle,run.squadHp,run.squadShield,run.trainerTalents?.length,run.talentGifts?.length].join(':');if(xp.dataset.state!==key){xp.dataset.state=key;xp.replaceChildren(progressPanel());}}}
    const el=$('journey-status');if(!el)return;el.hidden=run?.phase!=='combat'||G.Game.state!=='playing';if(el.hidden||performance.now()-lastHud<150)return;lastHud=performance.now();
    const pressure=battlePressure(),seconds=Math.max(0,Math.ceil(run.wave.duration-run.elapsed));
    let objective=seconds+'s';
    if(pressure==='chase')objective+=L(' · Enemigos señalados',' · Enemies marked',' · 已标记屏外敌人');
    else if(pressure==='enraged')objective+=L(' · Furia ',' · Enrage ',' · 激怒 ')+(1+Math.floor(Math.max(0,run.elapsed-run.wave.enrageAt)/G.EconomyConfig.battleTiming.enrageStepSeconds));
    else if(run.kind!=='battle')objective+=L(' · Furia en ',' · Enrage in ',' · 距激怒 ')+Math.max(0,Math.ceil(run.wave.enrageAt-run.elapsed))+'s';
    el.dataset.pressure=pressure||'';
    el.textContent=L('Día','Day','第')+' '+run.day+(G.I18n.lang==='zh'?' 天':'')+' · '+L('Ciclo','Cycle','周期')+' '+R.cycleOf(run.day)+' · '+G.Economy.formatGold(run.gold)+' '+L('oro','gold','局内金币')+' · '+objective+' · '+(G.Squad.deployed().filter(p=>!p.dead).length+1)+'/'+G.Squad.capacity+((run.xpJar||0)>0?' · '+L('Reserva XP ','XP jar ','经验罐 ')+Math.round(run.xpJar):'');
  }
  function restoreData(saved,goods){run=saved;G.LeaderAbilities?.restore?.();G.ExpeditionSupplies?.restore(run);run.leagueTier??=G.LeagueRank?.view(G.DB.save).tier||1;G.LeagueRank?.filterMap(run);if(!(G.LeagueRank?.allows('types',run)??true))run.bossEmblemChoices=null;if(!(G.LeagueRank?.allows(run.phase,run)??true)){run.phase='rest';run.eventKind='rest';}offer=goods||[];draft=null;note='';clearBattleResult();}
  function restoreView(){G.Game.expeditionPause();if(run.phase==='training')G.ExpeditionTraining.open(run,()=>finishStage(),true);else if(run.phase==='pokemon-training')G.PokemonTraining.open(run,()=>{if(run.labChoice==='train'){run.phase='upgrades';G.UI.hideAll();G.Game.expeditionResume();}else finishStage();});else if(run.phase==='rest')openRest();else refreshScreen();if(run.pendingTalentPicks?.length)G.TrainerTalentsUI.showPickModal(()=>restoreView());}
  return {restoreData,restoreView,skillLabel:kind=>G.SquadBonds.label(kind),tags,talentText,progressPanel,refreshScreen,restChoice,recordPokemonXp,recordPickup,bankGroundXp,takeStoredXp,showLoot,claimCompanion,setup,begin,reset,choose,buy,refreshShop,toggleShopLock,upgrade,tick,tickPresentation,killed,depart,continueAfterVictory,hud,summary,showRoute,
    drawWarnings,drawEnemyPointers,get active(){return !!run;},get inCombat(){return run?.phase==='combat';},get phase(){return run?.phase;},get run(){return run;},get offers(){return offer;}};
})();
