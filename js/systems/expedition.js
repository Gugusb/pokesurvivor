/* Schedule-driven solo expedition. Account resources and expedition gold are separate. */
G.Expedition = (() => {
  const R=G.ExpeditionRules;
  let run=null,draft=null,offer=[],note='',busy=false,lastHud=0,battleResult=null;
  const BATTLE_RESULT_MS=1500;
  const T=s=>G.T(s),L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
  const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  const eventName=k=>({battle:L('Combate','Battle','战斗'),elite:L('Combate de élite','Elite battle','精英战斗'),shop:L('Tienda Pokémon','Pokémon shop','宝可梦商店'),training:L('Dojo de movimientos','Skill training','技能修炼'),'pokemon-training':L('Sala Pokémon','Pokémon training room','宝可梦训练室'),wild:L('Exploración silvestre','Wild expedition','野外探险'),rest:L('Descanso','Rest stop','休整'),boss:L('Combate de jefe','Boss battle','BOSS战'),start:L('Partida','Start','出发')})[k];
  const eventIcon=k=>({battle:'⚔',elite:'✦',shop:'▣',training:'✎','pokemon-training':'★',wild:'❧',rest:'❧',boss:'♛',start:'⚑'})[k];
  const genNames=['Kanto','Johto','Hoenn','Sinnoh','Teselia','Kalos','Alola','Galar','Paldea'];
  const summary=()=>run?R.progress({day:run.day,arceus:run.arceus,cashout:run.cashout}):null;
  function header(title,sub){
    const box=$('journey-content');box.replaceChildren();const head=node('header','journey-head');head.append(node('small','journey-eyebrow',L('EXPEDICIÓN','EXPEDITION','小队远征')),node('h2','',title),node('p','',sub));box.append(head);if(run&&run.phase!=='shop')box.append(progressPanel());return box;
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
    return panel;
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
    const z=save.zEquipped?.[mon.dex],mega=save.megaEquipped?.[mon.dex];
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
    section.append(label,hero,facts,node('p','note',L('Atributos base con valores individuales','Base stats with individual values','含个体修正的基础属性')),numbers);
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
    if(!await G.EconomyReady){G.UI.toast(L('No se pudo cargar la economía. Recarga la página.','Economy configuration failed to load. Reload the page.','经济配置加载失败，请刷新页面。'));return;}
    draft={dex:G.DB.save.partner,gens:null};
    const render=()=>{
      const mon=G.DEX_BY[draft.dex],box=header(L('Preparar expedición','Expedition preparation','远征战前准备'),L('Revisa al capitán y los recursos de la ruta antes de partir.','Review your captain and route resources before setting out.','出发前查看队长、本局宝可梦候选和道具池。'));
      const prep=node('div','journey-prep'),{section,select}=prepCaptain(mon);
      select.onchange=()=>{draft.dex=+select.value;draft.gens=null;render();$('journey-captain').focus();};
      prep.append(section,prepItems(),prepCandidates(draft.gens));
      const actions=node('div','journey-actions');actions.append(button(L('Volver','Back','返回'),()=>{draft=null;G.MenuUI.open();}));
      if(!draft.gens)actions.append(button(L('Preparar ruta','Prepare route','生成本局世代'),()=>{draft.gens=R.generations(mon);render();},'btn gold'));
      else actions.append(button(L('¡En marcha!','Set out!','出发'),async()=>{if(busy)return;busy=true;try{if(G.DB.save.partner!==draft.dex)G.DB.save.partnerShiny=false;G.DB.save.partner=draft.dex;G.DB.commit();await G.Game.startRun(null,true);}finally{busy=false;}},'btn gold'));
      actions.classList.add('journey-prep-actions');box.append(actions,prep);G.UI.show('scr-journey');
    };render();
  }
  function begin(captain){
    clearBattleResult();
    const gens=draft?.gens||R.generations(captain.mon);run={...G.Economy.create(),captain,gens,pool:R.pool(gens),day:0,row:0,col:3,cycle:1,map:R.matrix(1),phase:'route',xpJar:0,xpJarStored:0,xpJarSpent:0,arceus:false,cashout:false,history:[],kills:0};
    offer=[];run.shopLocked=false;run.emblems={};G.Squad.begin(captain);run.unitPool=new G.UnitPool(run.pool);G.Squad.syncTrainer();G.ExpeditionRecorder?.beginRun();draft=null;note='';showRoute();
  }
  function showRoute(){
    if(!run)return;run.phase='route';G.Game.expeditionPause();renderRoute();
  }
  function renderRoute(){
    const box=header(L('Tu itinerario','Your itinerary','日程表'),L('Elige una carta adyacente de la siguiente fila.','Choose an adjacent card in the next row.','选择下一行相邻的事件，踏上新一天的旅程。'));
    const info=node('div','journey-meta');info.append(node('b','',L('Ciclo','Cycle','周期')+' '+run.cycle),node('span','',L('Día','Day','天数')+' '+run.day),node('b','journey-gold',L('Oro','Gold','局内金币')+' '+run.gold),node('span','',run.gens.map(g=>T(genNames[g-1])).join(' · ')));info.append(squadShortcut(),node('span','',L('Entrenador','Trainer','训练家')+' Lv.'+run.trainerLevel+' · '+run.trainerXp+' XP'),node('b','',L('BOSS en ','BOSS in ','距BOSS ')+(G.EconomyConfig.cycleLengthDays-run.row)+L(' días',' days',' 天')));box.append(info);
    box.append(xpJarPanel());
    if(note)box.append(node('p','journey-notice',note));
    const eggs=G.PokemonTraining?.eggPanel(run,renderRoute);if(eggs)box.append(eggs);
    const layout=node('div','journey-layout journey-layout-wide'),route=node('div','journey-route'),grid=node('div','journey-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label',L('Itinerario','Schedule','事件日程'));
    for(const row of run.map)for(const cell of row){
      const allowed=R.reachable(run.row,run.col,cell.row,cell.col),current=cell.row===run.row&&cell.col===run.col,visited=run.history.some(h=>h.day===cell.day&&h.col===cell.col);
      const title=cell.day===60&&cell.kind==='boss'?'Arceus':eventName(cell.kind),b=button('',()=>choose(cell.row,cell.col),'journey-event '+cell.kind+(allowed?' reachable':'')+(current?' current':'')+(visited?' visited':''));
      b.dataset.row=cell.row;b.dataset.col=cell.col;b.dataset.event=cell.kind;b.disabled=!allowed;
      b.append(node('small','',cell.row?String(cell.day):'⚑'),node('b','',eventIcon(cell.kind)),node('span','',T(title)));
      if(cell.row>run.row)b.append(node('em','journey-event-economy',['battle','elite','boss'].includes(cell.kind)?L('Interés estimado','Est. interest','预计利息')+' +'+G.Economy.interest(run.gold)+' G':L('Sin interés','No interest','消耗日 · 无利息')));
      b.setAttribute('aria-label',L('Día','Day','第')+' '+cell.day+' · '+T(title)+' · '+(cell.col+1));grid.append(b);
    }
    route.append(grid);layout.append(route);box.append(layout);
    const actions=node('div','journey-actions');actions.append(button(L('Retirarse','End expedition','结束远征'),()=>{if(confirm(L('¿Terminar y recoger las recompensas?','End the expedition and collect rewards?','结束本次远征并领取奖励？')))G.Game.expeditionEnd();}));box.append(actions);
    G.UI.show('scr-journey');requestAnimationFrame(()=>grid.querySelector('.reachable')?.scrollIntoView({block:'center',behavior:'instant'}));
  }
  const skillNames={projectile:'Proyectil',melee:'Cuerpo a cuerpo',beam:'Rayo',orbit:'Órbita',chain:'Cadena',dash:'Embestida',meteor:'Meteoro',buff:'Atributos',boomerang:'Bumerán',nova:'Onda',aura:'Aura',mine:'Mina',turret:'Torreta',trail:'Rastro',cone:'Abanico'};
  function tags(p){
    const t=G.Squad.tags(p),wrap=node('div','journey-tags');
    const groups=[[L('Vínculo de tipo','Type link','属性联结'),t.types.map(x=>T(G.U.TYPE_NAME[x]||x))], [L('Talento de especie','Species talent','种族天赋'),t.eggs.map(x=>G.ExpeditionTerms.egg(x))], [L('Vínculo de oficio','Class bond','职业羁绊'),[G.SquadBonds.label(t.skill)]]];
    for(const [label,names]of groups){const s=node('span','',names.join(' / '));s.title=label;wrap.append(s);}return wrap;
  }
  function talentText(p){
    if(G.SquadTraits)return G.SquadTraits.description(p);
    const t=G.Squad.talent(p),effect={atk:L('ataques','attacks','双攻'),hp:L('vida base','base HP','基础生命'),stamina:L('aguante','stamina','耐力'),agility:L('agilidad','agility','敏捷'),regen:L('vida base/s','base HP/s','基础生命/秒')}[t.key];
    return G.ExpeditionTerms.talent(t.name)+' · '+L('Todo el equipo','Whole squad','全队')+' '+effect+' +'+Number((t.value*100).toFixed(1))+'%';
  }
  function squadShortcut(){return button(L('Ver equipo','View squad','查看小队')+' · '+(G.Squad.deployed().length+1)+' / '+G.Squad.capacity,()=>G.Game.toggleSquad(),'btn small journey-squad-link');}
  function refreshScreen(){if(run?.phase==='shop')renderShop();else if(run?.phase==='route')renderRoute();else if(run?.phase==='loot')renderLoot();else if(run?.phase==='wild')renderWild();}
  function choose(row,col){
    if(!run||run.phase!=='route'||!R.reachable(run.row,run.col,row,col))return false;
    const cell=run.map[row][col];run.row=row;run.col=col;run.day=cell.day;run.totalDay=cell.day;run.dayInCycle=cell.row;run.history.push({day:run.day,col,kind:cell.kind});note='';run.eventKind=cell.kind;
    if(cell.kind==='shop')openShop();
    else if(cell.kind==='training'){run.phase='training';G.ExpeditionTraining.open(run,()=>finishStage());}
    else if(cell.kind==='pokemon-training'){run.phase='pokemon-training';G.PokemonTraining.open(run,()=>{if(run.labChoice==='train'){run.phase='upgrades';G.UI.hideAll();G.Game.expeditionResume();}else finishStage();});}
    else if(cell.kind==='wild'||cell.kind==='rest')openWild();
    else startBattle(cell.kind);
    return true;
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
    const box=header(L('Exploración silvestre','Wild expedition','野外探险'),L('Captura gratis. Si no queda espacio, organiza tu equipo y vuelve a recoger al compañero.','Capture for free. If reserves are full, arrange your squad and return to collect the companion.','免费捕获野生伙伴；仓库满时可先整理小队，返回后继续领取，不会自动折算或丢失领取机会。'));
    const goods=node('div','journey-goods');
    for(const o of run.wildOffers){
      const mon=G.DEX_BY[o.dex],card=node('section','journey-product quality-'+G.ExpeditionQuality.quality(mon)),canReceive=G.Squad.canRecruit(o.dex,o.rank||1);
      card.append(portrait(mon,100),node('h3','',T(mon.name)));lootCompanionPreview(card,mon);
      const capture=button(o.sold?L('Recibido','Received','已领取'):canReceive?L('Capturar','Capture','捕获'):L('Organizar la reserva','Arrange reserves to collect','整理仓库后领取'),()=>{
        if(o.sold||run.phase!=='wild')return;
        if(!G.Squad.recruit(o.dex,o.moveId,o.rank||1)){G.UI.toast(L('Sin espacio. El compañero sigue esperando.','No space. The companion is still waiting.','仓库已满，伙伴仍在等待领取，请先整理小队。'));G.Game.toggleSquad();return;}
        o.sold=true;renderWild();
      },'btn gold');
      capture.dataset.wildCapture=o.dex;capture.disabled=!!o.sold;card.append(capture);goods.append(card);
    }
    const pending=run.wildOffers.some(o=>!o.sold),next=button(pending?L('Omitir los restantes y seguir','Skip remaining companions and continue','跳过未领取伙伴，继续旅程'):L('Seguir la ruta','Continue route','继续旅程'),()=>{for(const o of run.wildOffers)run.unitPool.putBack(o);run.wildOffers=[];finishStage();},'btn gold');next.id='journey-wild-next';
    box.append(goods,squadShortcut(),next);G.UI.show('scr-journey');
  }
  function openShop(free=false){
    run.phase='shop';G.Game.expeditionPause();run.postBossShop=free;run.shopFreeRefreshes=G.EconomyConfig.shop.shopDayFreeRefreshes;G.SquadTraits?.visitShop();rollShop();renderShop();
  }
  function rollShop(force=false){
    if(run.shopLocked&&!force)return;
    for(const o of offer)run.unitPool.putBack(o);
    offer=Array.from({length:G.EconomyConfig.shop.unitSlotCount},()=>run.unitPool.draw(run.trainerLevel));
  }
  function buy(index,ticket=false){
    if(run?.phase!=='shop')return false;const o=offer[index];if(!o||o.kind!=='mon'||o.sold)return false;const cost=G.SquadTraits?.price(o.cost,o.kind)??o.cost;if(ticket?!(run.traitRecruitTickets>0):run.gold<cost)return false;
    if(!G.Squad.recruit(o.dex,o.moveId,o.rank||1)){G.UI.toast(L('La reserva está llena. Libera un compañero.','Reserves are full. Release a companion first.','候补仓库已满，请先放生伙伴。'));return false;}
    if(ticket)run.traitRecruitTickets--;else run.gold-=cost;o.sold=true;renderShop();return true;
  }
  function upgrade(){if(!run||!G.Economy.buyXp(run))return false;G.Squad.syncTrainer();renderShop();if(!$('squad-rankup'))$('journey-upgrade').focus({preventScroll:true});$('journey-shop-progress').classList.add('xp-purchased');G.UI.toast(L('Experiencia de entrenador','Trainer XP','训练家经验')+' +'+G.EconomyConfig.buyXp.xpGain+' · Lv.'+run.trainerLevel);return true;}
  function toggleShopLock(){if(run?.phase!=='shop')return false;run.shopLocked=!run.shopLocked;renderShop();return true;}
  function refreshShop(){if(run?.phase!=='shop')return false;const cost=G.Economy.refreshCost(run);if(run.shopFreeRefreshes>0)run.shopFreeRefreshes--;else if(run.traitFreeRefresh>0)run.traitFreeRefresh--;else{if(run.gold<cost)return false;run.gold-=cost;}run.shopLocked=false;rollShop(true);renderShop();return true;}
  function renderShop(){
    const lv=G.Squad.shopLevel,box=header(L('Tienda Pokémon','Pokémon shop','宝可梦商店'),L('Invita compañeros y amplía tu formación. Los objetos se consiguen en combate.','Invite companions and expand your formation. Earn items through battle.','邀请伙伴、扩充编队。道具通过战斗获得。'));
    const info=node('div','journey-meta');info.append(node('b','journey-gold',L('Oro','Gold','局内金币')+' '+run.gold),node('b','',L('Entrenador','Trainer','训练家')+' Lv.'+lv),node('span','',L('Plazas','Squad limit','编队上限')+' '+G.Squad.capacity));info.append(squadShortcut());box.append(info);
    const layout=node('div','journey-layout journey-layout-wide'),goods=node('div','journey-goods');
    offer.forEach((o,i)=>{
      if(!o){goods.append(node('article','journey-product journey-empty',L('Reserva agotada','Pool exhausted','当前费用档位暂无可招募伙伴')));return;}
      const cost=G.SquadTraits?.price(o.cost,o.kind)??o.cost;
      const card=node('article','journey-product quality-'+(G.ExpeditionQuality?.quality(o.dex)||1));card.dataset.product=i;
      const family=G.MonProgression.rootFor(o.dex),owned=[run.captain,...G.Squad.roster].filter(p=>G.MonProgression.rootFor(p.dex)===family),merge=G.Squad.roster.some(p=>G.MonProgression.rootFor(p.dex)===family&&p.rank===(o.rank||1)&&p.rank<3);
      if(!o.sold&&owned.length){card.classList.add('journey-owned');card.dataset.owned='true';card.dataset.merge=String(merge);card.append(node('strong','journey-owned-badge',merge?L('¡Ascenso disponible!','Ready to merge!','可合成升星'):L('Ya está en el equipo','Already in your squad','队伍已有')));}
      const content=node('div','journey-product-art');
      {const mon=G.DEX_BY[o.dex],rank=o.rank||1,move=G.Moves.instance(o.moveId,rank===1?2:5);if(rank===3)G.Moves.evolve(move);content.append(portrait(mon,100));card.append(content,node('small','',L('Compañero','Companion','队员邀请')+' · '+(G.ExpeditionQuality?.label(mon)||'')+' · '+'★'.repeat(rank)),node('h3','',T(mon.name)));const dummy={mon,dex:mon.dex,rank,moves:[move]};if(G.SquadTraits){const trait=node('p','journey-shop-trait',G.SquadTraits.description(dummy));trait.setAttribute('translate','no');card.append(trait);}card.append(tags(dummy),node('p','journey-shop-move',T(move.name)+' · '+(rank===3?L('Definitivo','Ultimate','超武'):'Lv.'+move.lvl)));}
      const b=button(o.sold?L('Invitado / adquirido','Recruited / acquired','已邀请／购入'):cost+' '+L('oro','gold','金币'),()=>buy(i),'btn gold');b.dataset.buy=i;b.disabled=o.sold||run.gold<cost;card.append(node('small','',L('En reserva','In pool','池内剩余')+' '+run.unitPool.stock.get(G.MonProgression.rootFor(o.dex))),b);if(run.traitRecruitTickets>0){const t=button(L('Invitación dirigida','Directed recruit ticket','使用定向招募券')+' · '+run.traitRecruitTickets,()=>buy(i,true),'btn');t.dataset.recruitTicket=i;t.disabled=!!o.sold;card.append(t);}goods.append(card);
    });
    const row=G.Economy.levelRow(lv),xp=G.EconomyConfig.buyXp;
    const odds=node('div','journey-odds');row.odds.forEach((chance,i)=>{const span=node('span','quality-'+(i+1),(i+1)+' G · '+chance+'%');odds.append(span);});box.append(odds);
    const controls=node('div','journey-shop-controls'),up=button(xp.goldCost+' G → '+xp.xpGain+' XP',upgrade,'btn');up.id='journey-upgrade';up.disabled=lv>=G.Economy.maxLevel(run)||run.gold<xp.goldCost;
    const free=(run.shopFreeRefreshes||0)+(run.traitFreeRefresh||0),refresh=button(L('Renovar','Refresh','刷新商品')+' · '+(free?L('Gratis','Free','免费')+' ('+free+')':G.Economy.refreshCost(run)+' G'),refreshShop);refresh.id='journey-refresh';refresh.disabled=!free&&run.gold<G.Economy.refreshCost(run);
    const lock=button(run.shopLocked?L('Desbloquear tienda','Unlock shop','解锁整店'):L('Bloquear tienda','Lock shop','锁定整店'),toggleShopLock,'btn');lock.id='journey-shop-lock';lock.setAttribute('aria-pressed',String(run.shopLocked));
    controls.append(up,refresh,button(L('Seguir la ruta','Continue route','离开商店'),()=>{if(run.postBossShop){run.postBossShop=false;showRoute();}else finishStage();},'btn gold'),lock);
    if(lv>=G.EconomyConfig.itemTiers.POP_CAP.unlockLevel&&!run.hasPopCapItem){const expand=button(L('Ampliar formación','Expand formation','编队扩容')+' · '+G.EconomyConfig.itemTiers.POP_CAP.price+' G',()=>{if(G.Economy.buyPopCap(run)){G.Squad.syncTrainer();renderShop();}});expand.id='journey-expand';expand.disabled=run.gold<G.EconomyConfig.itemTiers.POP_CAP.price;controls.append(expand);}
    if(run.cycle>=G.EconomyConfig.endless.unlockCycle&&lv===G.EconomyConfig.levels.at(-1).level){const license=button(L('Licencia de entrenador','Trainer license','训练家执照')+' · '+G.Economy.licenseCost(run)+' G',()=>{if(G.Economy.buyLicense(run)){G.Squad.syncTrainer();renderShop();}});license.id='journey-license';license.disabled=run.gold<G.Economy.licenseCost(run);controls.append(license);}
    const toolbar=node('section','journey-shop-toolbar'),progress=progressPanel();progress.id='journey-shop-progress';progress.setAttribute('aria-live','polite');toolbar.append(progress,controls);box.append(toolbar);
    goods.append(node('p','note',L('Cinco invitaciones, sin objetos. Bloquear conserva todo al volver; renovar desbloquea la tienda.','Five invitations, no item sales. Lock to preserve all slots on your next visit; refreshing unlocks the shop.','固定5格宝可梦邀请，不出售道具。锁定保留整店至下次访问，手动刷新会解除锁定。')));layout.append(goods);box.append(layout);G.UI.show('scr-journey');
  }
  function startBattle(kind){
    run.phase='combat';run.kind=kind;run.elapsed=0;run.spawned=0;run.acc=0;run.kills=0;run.wave=R.wave(run.day,kind);run.bossDead=false;run.waveType=Math.random()<.5?G.U.pick([...new Set(run.pool.flatMap(p=>p.types))]):null;
    run.appeared=new Set();run.xpJarStored=0;run.xpJarSpent=0;
    run.bossEmblemChoices=null;run.bossEmblemClaimed=false;run.companion=null;run.companionOffer=null;run.companionResolved=false;run.loot={};run.goldStart=run.gold;run.lockedGoldAtBattleStart=run.gold;run.inWaveCoinDrops=0;run.settlement=null;
    G.UI.toast(run.gold+' G · '+L('Interés al ganar','Interest on victory','战后利息')+' +'+G.Economy.interest(run.gold)+' G');run.extraStart=JSON.parse(JSON.stringify(G.Game.loot||{}));
    run.pendingSpawns=[];G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Pickups.clear();G.Hazards.clear();G.Path.clear();
    G.World.setBiome(Math.floor((run.day-1)/5));G.Squad.recover();
    G.ExpeditionDamage?.beginBattle(run.day);G.TypeBonds?.beginStage();G.SquadTraits?.beginBattle();G.ExpeditionRecorder?.beginBattle(run);
    for(const p of G.Squad.actors())G.Abilities.resetStage(p,run.day);
    if(kind==='boss')run.spawned=spawn(true)?1:0;
    G.UI.hideAll();G.Touch.reset();G.Game.expeditionResume();G.Audio.sfx('confirm');
  }
  function spawn(boss=false){
    const cap=run.captain,wave=run.wave,candidates=R.encounterCandidates(run.pool,run.day,boss);
    const same=Math.random()<.85,typed=!boss&&run.waveType?candidates.filter(p=>p.types.includes(run.waveType)===same):null,mon=boss&&run.day===60?G.DEX_BY[493]:G.U.pick(typed?.length?typed:candidates.length?candidates:run.pool);
    let x=cap.x,y=cap.y,free=false;for(let i=0;i<24;i++){const a=Math.random()*Math.PI*2,d=100+Math.sqrt(Math.random())*Math.max(180,G.Camera.outerRadius());x=cap.x+Math.cos(a)*d;y=cap.y+Math.sin(a)*d;if(G.World.isFree(x,y,20)){free=true;break;}}if(!free)return null;
    const behavior=boss?'chase':G.Enemies.behaviorOf(mon),def={dex:mon.dex,name:mon.name,hp:boss?350+run.day*24:12+(mon.baseStats?.hp||60)*.2,spd:boss?55:48+(mon.baseStats?.spe||60)*.15,dmg:boss?14:4+Math.min(8,mon.rarity),xp:boss?80:10+Math.floor(run.day/2),behavior,shotDmg:boss?14:5,shotCd:3.5,range:200};
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
      run.acc+=dt*(run.wave.count/Math.max(8,run.wave.standardDuration*.25));
      while(run.acc>=1&&run.spawned<run.wave.count&&G.EnemyMgr.count+(run.pendingSpawns?.length||0)<64){const enemy=spawn();if(!enemy){run.acc=Math.min(run.acc,1);break;}run.acc--;run.spawned++;}
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
    const cam=G.Camera,markers=new Map();
    const centerX=w/2,centerY=h/2;
    const horizontal=Math.max(12,centerX-22),vertical=Math.max(12,centerY-82);
    for(const enemy of G.EnemyMgr.all()){
      if(enemy.dead||!enemy.expedition)continue;
      const y=enemy.y-enemy.bodyH/2;
      if(cam.sees(enemy.x,y,0))continue;
      const dx=(enemy.x-cam.x)*cam.scale,dy=(y-cam.y)*cam.scale;
      const scale=Math.min(horizontal/Math.abs(dx),vertical/Math.abs(dy));
      const x=centerX+dx*scale,screenY=centerY+dy*scale;
      const edge=Math.abs(dx*scale)>=horizontal-.01?(dx<0?'left':'right'):(dy<0?'top':'bottom');
      const key=edge+':'+Math.round((edge==='left'||edge==='right'?screenY:x)/30);
      const marker=markers.get(key);
      if(marker)marker.count++;
      else markers.set(key,{x,y:screenY,angle:Math.atan2(dy,dx),count:1,edge});
    }
    if(!markers.size)return;
    const meter=$('expedition-damage');
    const bounds=meter&&!meter.hidden?meter.getBoundingClientRect():null;
    ctx.save();
    ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    for(const marker of markers.values()){
      const x=marker.edge==='right'&&bounds&&marker.y>=bounds.top-15&&marker.y<=bounds.bottom+15
        ?Math.max(22,bounds.left-18):marker.x;
      ctx.save();ctx.translate(x,marker.y);ctx.rotate(marker.angle);
      ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-7,-7);ctx.lineTo(-7,7);ctx.closePath();
      ctx.fillStyle='#ffcf66';ctx.strokeStyle='#37141c';ctx.lineWidth=3;ctx.stroke();ctx.fill();
      ctx.restore();
      if(marker.count>1){
        ctx.fillStyle='#311c26';ctx.fillRect(x-11,marker.y+9,22,15);
        ctx.fillStyle='#fff3c9';ctx.fillText(String(marker.count),x,marker.y+16);
      }
    }
    ctx.restore();
  }
  function killed(e){
    if(!run||run.phase!=='combat'||!e.expedition)return;
    run.kills++;
    if(e.boss)run.bossDead=true;
  }
  function finishBattle(cleared){
    if(run.phase!=='combat')return;
    G.ExpeditionRecorder?.finish(cleared?'cleared':'survived');
    if(run.kind!=='boss'){run.companionOffer=run.unitPool.draw(Math.min(G.EconomyConfig.levels.at(-1).level,run.trainerLevel+(run.kind==='elite'?1:0)));run.companion=run.companionOffer?.dex||null;}
    if(run.kind==='boss'){const types=Object.keys(G.U.TYPE_NAME);run.bossEmblemChoices=[];while(run.bossEmblemChoices.length<G.EconomyConfig.bossEmblem.choices)run.bossEmblemChoices.push(types.splice(Math.floor(Math.random()*types.length),1)[0]);run.bossEmblemClaimed=false;}
    run.remainingHpRatio=Math.max(0,run.captain.hp/run.captain.maxHp);
    G.SquadTraits?.finishBattle(cleared);if(run.day===G.EconomyConfig.cycleLengthDays*G.EconomyConfig.clearCycleThreshold&&run.kind==='boss'){run.arceus=true;run.cashout=true;}run.phase='battle-result';run.pendingSpawns=[];
    G.EnemyMgr.update(0,G.Squad.actors());
    bankGroundXp();
    note=cleared?L('¡Todos derrotados!','All foes defeated!','全歼奖励！'):L('Etapa superada','Stage survived','成功度过波次');
    G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();
    const rewards=G.EconomyConfig.compatibility,itemCount=run.kind==='elite'?rewards.eliteVictoryItems:cleared&&run.kind==='battle'?rewards.normalClearItems:0;
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
    run.xpJar=(run.xpJar||0)+stored;run.xpJarStored=(run.xpJarStored||0)+stored;return stored;
  }
  function takeStoredXp(amount){
    if(run?.phase!=='combat'||!Number.isFinite(amount)||amount<=0)return 0;
    const bonus=Math.min(run.xpJar||0,amount);run.xpJar=Math.max(0,(run.xpJar||0)-bonus);run.xpJarSpent=(run.xpJarSpent||0)+bonus;return bonus;
  }
  function xpJarPanel(){
    const panel=node('p','journey-xp-jar');panel.dataset.xpJar=run.xpJar||0;
    panel.textContent=L('Reserva de experiencia','Experience jar','经验罐')+' · '+Math.round(run.xpJar||0).toLocaleString()+' XP · '+L('Recoge XP en combate para retirar la misma cantidad.','Collect XP in battle to withdraw an equal amount.','战斗中拾取经验时，额外提取等量储备。');return panel;
  }
  function recordPickup(p){
    if(!run||!['combat','rewards'].includes(run.phase))return;
    if(!G.EconomyConfig.combatGoldDrops&&['coin','treasure'].includes(p.kind))return;
    if(p.kind==='coin'||p.kind==='treasure')run.inWaveCoinDrops+=Math.max(0,Number(p.value)||0);
    const k=p.kind,key=k==='item'?'item:'+p.value:k;
    if(['xp','xpBig','coin','treasure'].includes(k))run.loot[key]=(run.loot[key]||0)+Number(p.value||0);
    else if(['ticket','ticket10','item','bossChest'].includes(k))run.loot[key]=(run.loot[key]||0)+1;
  }
  function showLoot(levels=0){if(run?.phase!=='rewards')return;G.Economy.settleDay(run,{eventType:run.kind,victory:!run.captain.dead,remainingHpRatio:run.remainingHpRatio,inWaveCoinDrops:run.inWaveCoinDrops,lockedGoldAtBattleStart:run.lockedGoldAtBattleStart});G.Squad.syncTrainer();run.freeShopPending=run.settlement.grantFreePostBossShop;run.levels=levels;run.phase='loot';G.Game.expeditionPause();renderLoot();}
  function claimCompanion(){
    if(run?.phase!=='loot'||!run.companion||run.companionResolved)return false;
    if(!G.Squad.recruit(run.companion)){run.gold+=run.companionOffer.cost;run.unitPool.putBack(run.companionOffer);G.UI.toast(L('Reserva llena: convertido en oro.','Reserves full: converted to gold.','候补已满，按1星原价折算金币。'));}else run.companionOffer.sold=true;
    run.companionResolved=true;renderLoot();return true;
  }
  function lootCompanionPreview(card,mon){
    const rank=1;
    const moveId=G.FIXED_SKILLS?.[mon.dex]||G.Moves.startFor(mon);
    const move=G.Moves.instance(moveId,2);
    const candidate={mon,dex:mon.dex,rank,moves:[move]};
    const preview=node('div','journey-loot-preview');
    const quality=G.ExpeditionQuality?.label(mon);
    const rankText=L('Rango 1','1 star','1星');
    preview.append(node('p','journey-loot-rank',[quality,'★ '+rankText].filter(Boolean).join(' · ')));
    preview.append(tags(candidate));
    preview.append(node('p','journey-loot-move',T(move.name)+' · Lv.'+move.lvl+' · '+G.Moves.classLabel(move)));
    if(G.SquadTraits){
      const trait=node('p','journey-shop-trait',talentText(candidate));
      trait.setAttribute('translate','no');
      preview.append(trait);
    }
    card.append(preview);
  }
  function renderLoot(){
    const box=header(L('Botín del día','Today’s loot','本回合战利品'),L('Descansa y recoge el botín antes de preparar los movimientos.','Take a breath and collect the loot before choosing upgrades.','歇一歇，收好战利品，再为伙伴挑选成长方向。'));
    box.append(node('p','journey-notice',note));const rows=node('div','journey-loot-grid');
    const add=(name,value)=>{if(!value)return;const card=node('div','journey-loot-value');card.append(node('small','',name),node('b','',String(value)));rows.append(card);};
    add(L('Oro','Expedition gold','局内金币'),run.gold-run.goldStart);
    add(L('Experiencia','Experience','经验'),(run.loot.xp||0)+(run.loot.xpBig||0));
    add(L('XP guardada','XP stored','本场存入经验罐'),run.xpJarStored);
    add(L('XP retirada','XP withdrawn','本场提取经验罐'),run.xpJarSpent);
    if(G.EconomyConfig.combatGoldDrops)add(L('Monedas recogidas','Wave gold drops','波次金币掉落'),(run.loot.coin||0)+(run.loot.treasure||0));
    add(L('Vales','Tickets','抽奖券'),(run.loot.ticket||0)+(run.loot.ticket10||0)*10);
    add(L('Cofres de jefe','Boss chests','BOSS奖励箱'),run.loot.bossChest);
    for(const [key,n]of Object.entries(run.loot))if(key.startsWith('item:'))add(T(G.Items.BY[key.slice(5)]?.name||key.slice(5)),n);
    const extras=G.Game.loot||{},before=run.extraStart||{};add(T('Gemas de habilidad'),(extras.gems||0)-(before.gems||0));
    for(const kind of ['stones','duplicateStones','packs'])for(const [id,n]of Object.entries(extras[kind]||{})){
      const count=n-(before[kind]?.[id]||0);if(count>0)add(kind==='packs'?G.CardPacks.local(G.CardPacks.packBy[id]?.name||id):T(G.Mega.BY[id]?.name||id),count);
    }
    if(run.settlement){for(const [key,label]of [['baseWage',L('Salario','Base wage','基础工资')],['interest',L('Interés','Interest','开战利息')],['streakBonus',L('Racha','Streak bonus','压制连胜')],['comebackBounty',L('Revancha','Comeback bounty','逆境赏金')],['eliteFlawlessBonus',L('Élite impecable','Flawless elite','精英压制奖励')],['xpGained',L('XP de entrenador','Trainer XP','训练家经验')]])add(label,run.settlement[key]);}
    box.append(rows,xpJarPanel());
    if(run.bossEmblemChoices){const emblems=node('section','journey-emblem-choices');emblems.append(node('h3','',L('Emblema dorado: elige uno','Golden emblem: choose one','金色羁绊徽章：三选一')),node('p','note',L('Añade una unidad al vínculo de tipo.','Adds one count to this type bond.','使对应属性羁绊生效数 +'+G.EconomyConfig.bossEmblem.countBonus+'，本局持续生效。')));for(const type of run.bossEmblemChoices){const b=button(T(G.U.TYPE_NAME[type]),()=>{if(run.bossEmblemClaimed||run.phase!=='loot')return;run.bossEmblemClaimed=true;run.emblems[type]=(run.emblems[type]||0)+G.EconomyConfig.bossEmblem.countBonus;G.Squad.refresh();renderLoot();},'btn gold');b.dataset.bossEmblem=type;b.disabled=run.bossEmblemClaimed;emblems.append(b);}box.append(emblems);}
    if(run.companion){
      const mon=G.DEX_BY[R.formForRank(run.companion,1)],card=node('section','journey-loot-companion');
      if(G.ExpeditionQuality)card.style.borderColor=G.ExpeditionQuality.color(mon);
      card.append(portrait(mon,120),node('h3','',T(mon.name)),node('p','',run.companionResolved?L('¡Compañero recibido!','Companion received!','伙伴已领取！'):L('Un compañero quiere unirse.','A companion wants to join.','这位伙伴想与咱们同行。')));
      lootCompanionPreview(card,mon);
      card.append(squadShortcut());
      if(!run.companionResolved){const actions=node('div','journey-actions'),claim=button(G.Squad.canRecruit(run.companion)?L('Recibir compañero','Receive companion','领取伙伴'):L('Convertir a oro','Convert to gold','仓库已满，折算金币')+' +'+run.companionOffer.cost+' G',claimCompanion,'btn gold');claim.id='journey-claim';claim.disabled=false;actions.append(claim,button(L('Dejar marchar','Let go','放弃领取'),()=>{run.unitPool.putBack(run.companionOffer);run.companionResolved=true;run.companion=null;renderLoot();}));card.append(actions);}
      box.append(card);
    }
    if(G.ExpeditionDamage){const meter=node('section','journey-loot-damage');meter.id='journey-damage';G.ExpeditionDamage.render(meter,null,'loot');box.append(meter);}
    const actions=node('div','journey-actions');if(!run.companion)actions.append(squadShortcut());const next=button(run.levels?L('Elegir mejoras','Choose upgrades','选择升级')+' · '+run.levels:L('Seguir la ruta','Continue route','继续旅程'),()=>{
      if(run.phase!=='loot'||run.bossEmblemChoices&&!run.bossEmblemClaimed)return;run.unitPool.putBack(run.companionOffer);run.companionResolved=true;run.phase='upgrades';G.UI.hideAll();G.Game.expeditionResume();
    },'btn gold');next.id='journey-loot-next';next.disabled=!!run.bossEmblemChoices&&!run.bossEmblemClaimed;actions.append(next);box.append(actions);G.UI.show('scr-journey');
  }
  function depart(){if(run?.phase!=='upgrades')return;finishStage(note);}
  function finishStage(message=''){
    if(!run)return;if(!run.settledDays.has(run.day)){G.Economy.settleDay(run,{eventType:run.eventKind==='rest'?'wild':run.eventKind});G.Squad.syncTrainer();}G.SquadTraits?.dayEnd();G.Game.scoreEvent();G.TypeBonds?.beginStage();G.Squad.recover();run.captain.heal(run.captain.maxHp*.15);note=message;
    const hatched=G.PokemonTraining?.hatch(run)||0;if(hatched)note+=' '+L('Huevos eclosionados: ','Hatched companions: ','孵化伙伴：')+hatched;
    if(run.day%G.EconomyConfig.cycleLengthDays===0&&run.day>0){run.cycle++;G.Economy.addXp(run,0);G.Squad.syncTrainer();run.map=R.matrix(run.cycle);run.row=0;run.history=[{day:run.day,col:run.col}];note+=' '+L('Un nuevo ciclo: los rivales se han fortalecido.','A new cycle: foes have grown much stronger.','新的周期开始了，对手变得更强了。');}
    if(run.day===G.EconomyConfig.cycleLengthDays*G.EconomyConfig.clearCycleThreshold&&run.cashout){G.Game.expeditionVictory();return;}
    if(run.freeShopPending){run.freeShopPending=false;openShop(true);}else showRoute();
  }
  function continueAfterVictory(){if(!run)return;run.cashout=false;G.Server?.heartbeat?.().catch(()=>{});if(run.freeShopPending){run.freeShopPending=false;openShop(true);}else showRoute();}
  function reset(){clearBattleResult();G.ExpeditionRecorder?.reset();run=null;G.Squad.reset();const el=$('journey-status');if(el)el.hidden=true;const xp=$('expedition-progress-hud');if(xp)xp.hidden=true;}
  function hud(){
    const xp=$('expedition-progress-hud');if(xp){xp.hidden=run?.phase!=='combat'||G.Game.state!=='playing';if(!xp.hidden){const p=run.captain,key=[run.trainerLevel,run.trainerXp,p.level,p.xp,p.xpNext,run.cycle].join(':');if(xp.dataset.state!==key){xp.dataset.state=key;xp.replaceChildren(progressPanel());}}}
    const el=$('journey-status');if(!el)return;el.hidden=run?.phase!=='combat'||G.Game.state!=='playing';if(el.hidden||performance.now()-lastHud<150)return;lastHud=performance.now();
    const pressure=battlePressure(),seconds=Math.max(0,Math.ceil(run.wave.duration-run.elapsed));
    let objective=seconds+'s';
    if(pressure==='chase')objective+=L(' · Enemigos señalados',' · Enemies marked',' · 已标记屏外敌人');
    else if(pressure==='enraged')objective+=L(' · Furia ',' · Enrage ',' · 激怒 ')+(1+Math.floor(Math.max(0,run.elapsed-run.wave.enrageAt)/G.EconomyConfig.battleTiming.enrageStepSeconds));
    else if(run.kind!=='battle')objective+=L(' · Furia en ',' · Enrage in ',' · 距激怒 ')+Math.max(0,Math.ceil(run.wave.enrageAt-run.elapsed))+'s';
    el.dataset.pressure=pressure||'';
    el.textContent=L('Día','Day','第')+' '+run.day+(G.I18n.lang==='zh'?' 天':'')+' · '+L('Ciclo','Cycle','周期')+' '+R.cycleOf(run.day)+' · '+run.gold+' '+L('oro','gold','局内金币')+' · '+objective+' · '+(G.Squad.deployed().filter(p=>!p.dead).length+1)+'/'+G.Squad.capacity+((run.xpJar||0)>0?' · '+L('Reserva XP ','XP jar ','经验罐 ')+Math.round(run.xpJar):'');
  }
  return {skillLabel:kind=>G.SquadBonds.label(kind),tags,talentText,progressPanel,refreshScreen,recordPickup,bankGroundXp,takeStoredXp,showLoot,claimCompanion,setup,begin,reset,choose,buy,refreshShop,toggleShopLock,upgrade,tick,tickPresentation,killed,depart,continueAfterVictory,hud,summary,showRoute,
    drawWarnings,drawEnemyPointers,get active(){return !!run;},get inCombat(){return run?.phase==='combat';},get phase(){return run?.phase;},get run(){return run;},get offers(){return offer;}};
})();
