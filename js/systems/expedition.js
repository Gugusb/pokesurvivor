/* Schedule-driven solo expedition. Account resources and expedition gold are separate. */
G.Expedition = (() => {
  const R=G.ExpeditionRules;
  let run=null,draft=null,offer=[],note='',busy=false,lastHud=0;
  const T=s=>G.T(s),L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
  const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  const eventName=k=>({battle:L('Combate','Battle','战斗'),elite:L('Combate de élite','Elite battle','精英战斗'),shop:L('Tienda Pokémon','Pokémon shop','宝可梦商店'),rest:L('Descanso','Rest stop','休整'),boss:L('Combate de jefe','Boss battle','BOSS战'),start:L('Partida','Start','出发')})[k];
  const eventIcon=k=>({battle:'⚔',elite:'✦',shop:'▣',rest:'❧',boss:'♛',start:'⚑'})[k];
  const genNames=['Kanto','Johto','Hoenn','Sinnoh','Teselia','Kalos','Alola','Galar','Paldea'];
  const summary=()=>run?R.progress({day:run.day,arceus:run.arceus,cashout:run.cashout}):null;
  function header(title,sub){
    const box=$('journey-content');box.replaceChildren();const head=node('header','journey-head');head.append(node('small','journey-eyebrow',L('EXPEDICIÓN','EXPEDITION','小队远征')),node('h2','',title),node('p','',sub));box.append(head);return box;
  }
  function button(text,fn,cls='btn'){const b=node('button',cls,text);b.type='button';b.onclick=fn;return b;}
  function portrait(p,size=72){return G.UI.spriteCanvas(p.spriteDex||p.dex,size,size,{scale:2,shiny:!!p.shiny});}
  function setup(){
    draft={dex:G.DB.save.partner,gens:null};
    const render=()=>{
      const mon=G.DEX_BY[draft.dex],box=header(L('Elige a tu capitán','Choose your captain','选择小队队长'),L('Traza tu ruta, reúne compañeros y afronta a Arceus en el día 60.','Chart a route, gather companions and face Arceus on day 60.','规划路线、邀请伙伴，在第60天直面阿尔宙斯。'));
      const hero=node('div','journey-captain');hero.append(portrait(mon,128),node('h3','',T(mon.name)));box.append(hero);
      const label=node('label','journey-select',L('Capitán','Captain','队长')),select=node('select');select.id='journey-captain';
      for(const p of G.DEX.filter(p=>G.DB.owns(p.dex)&&G.SPRITE_META[p.dex])){const opt=node('option','',T(p.name));opt.value=p.dex;opt.selected=p.dex===draft.dex;select.append(opt);}
      select.onchange=()=>{draft.dex=+select.value;draft.gens=null;render();};label.append(select);box.append(label);
      if(draft.gens){const gen=node('div','journey-gens');for(const g of draft.gens)gen.append(node('span','',T(genNames[g-1])));box.append(gen,node('p','note',L('Estas regiones aportan los encuentros y las invitaciones de esta partida.','These regions supply this run’s encounters and shop invitations.','本局遭遇和商店邀请来自这些地区。进化仍遵循各自的进化链。')));}
      const actions=node('div','journey-actions');actions.append(button(L('Volver','Back','返回'),()=>{draft=null;G.MenuUI.open();}));
      if(!draft.gens)actions.append(button(L('Preparar ruta','Prepare route','生成本局世代'),()=>{draft.gens=R.generations(mon);render();},'btn gold'));
      else actions.append(button(L('¡En marcha!','Set out!','出发'),async()=>{if(busy)return;busy=true;try{G.DB.save.partner=draft.dex;G.DB.commit();await G.Game.startRun(null,true);}finally{busy=false;}},'btn gold'));
      box.append(actions);G.UI.show('scr-journey');
    };render();
  }
  function begin(captain){
    const gens=draft?.gens||R.generations(captain.mon);run={captain,gens,pool:R.pool(gens),day:0,row:0,col:3,cycle:1,map:R.matrix(1),gold:80,phase:'route',arceus:false,cashout:false,history:[],kills:0};
    G.Squad.begin(captain);draft=null;note='';showRoute();
  }
  function showRoute(){
    if(!run)return;run.phase='route';G.Game.expeditionPause();renderRoute();
  }
  function renderRoute(){
    const box=header(L('Tu itinerario','Your itinerary','日程表'),L('Elige una carta adyacente de la siguiente fila.','Choose an adjacent card in the next row.','选择下一行相邻的事件，踏上新一天的旅程。'));
    const info=node('div','journey-meta');info.append(node('b','',L('Ciclo','Cycle','周期')+' '+run.cycle),node('span','',L('Día','Day','天数')+' '+run.day),node('b','journey-gold',L('Oro','Gold','局内金币')+' '+run.gold),node('span','',run.gens.map(g=>T(genNames[g-1])).join(' · ')));box.append(info);
    if(note)box.append(node('p','journey-notice',note));
    const layout=node('div','journey-layout'),route=node('div','journey-route'),grid=node('div','journey-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label',L('Itinerario','Schedule','事件日程'));
    for(const row of run.map)for(const cell of row){
      const allowed=R.reachable(run.row,run.col,cell.row,cell.col),current=cell.row===run.row&&cell.col===run.col,visited=run.history.some(h=>h.day===cell.day&&h.col===cell.col);
      const title=cell.day===60&&cell.kind==='boss'?'Arceus':eventName(cell.kind),b=button('',()=>choose(cell.row,cell.col),'journey-event '+cell.kind+(allowed?' reachable':'')+(current?' current':'')+(visited?' visited':''));
      b.dataset.row=cell.row;b.dataset.col=cell.col;b.dataset.event=cell.kind;b.disabled=!allowed;
      b.append(node('small','',cell.row?String(cell.day):'⚑'),node('b','',eventIcon(cell.kind)),node('span','',T(title)));
      b.setAttribute('aria-label',L('Día','Day','第')+' '+cell.day+' · '+T(title)+' · '+(cell.col+1));grid.append(b);
    }
    route.append(grid);layout.append(route,formation());box.append(layout);
    const actions=node('div','journey-actions');actions.append(button(L('Retirarse','End expedition','结束远征'),()=>{if(confirm(L('¿Terminar y recoger las recompensas?','End the expedition and collect rewards?','结束本次远征并领取奖励？')))G.Game.expeditionEnd();}));box.append(actions);
    G.UI.show('scr-journey');requestAnimationFrame(()=>grid.querySelector('.reachable')?.scrollIntoView({block:'center',behavior:'instant'}));
  }
  const skillNames={projectile:'Proyectil',melee:'Cuerpo a cuerpo',beam:'Rayo',orbit:'Órbita',chain:'Cadena',dash:'Embestida',meteor:'Meteoro',buff:'Atributos',boomerang:'Bumerán',nova:'Onda',aura:'Aura',mine:'Mina',turret:'Torreta',trail:'Rastro',cone:'Abanico'};
  function tags(p){
    const t=G.Squad.tags(p),wrap=node('div','journey-tags');
    const groups=[[L('Vínculo de tipo','Type link','属性联结'),t.types.map(x=>G.U.TYPE_NAME[x]||x)], [L('Talento de especie','Species talent','种族天赋'),t.eggs.map(x=>G.ExpeditionTerms.egg(x))], [L('Vínculo de oficio','Class bond','职业羁绊'),[G.ExpeditionTerms.skill(skillNames[t.skill])]]];
    for(const [label,names]of groups){const s=node('span','',names.join(' / '));s.title=label;wrap.append(s);}return wrap;
  }
  function talentText(p){
    const t=G.Squad.talent(p),effect={atk:L('ataques','attacks','双攻'),hp:L('vida base','base HP','基础生命'),stamina:L('aguante','stamina','耐力'),agility:L('agilidad','agility','敏捷'),regen:L('vida base/s','base HP/s','基础生命/秒')}[t.key];
    return G.ExpeditionTerms.talent(t.name)+' · '+L('Todo el equipo','Whole squad','全队')+' '+effect+' +'+Number((t.value*100).toFixed(1))+'%';
  }
  function formation(){
    const panel=node('aside','journey-formation');panel.append(node('h3','',L('Formación','Formation','小队编队')+' · '+Math.min(G.Squad.roster.length+1,G.Squad.capacity)+' / '+G.Squad.capacity),node('p','note',L('Las flechas cambian el orden. Los suplentes esperan fuera del campo.','Use the arrows to reorder. Reserves stay off the field.','用箭头调整蛇形队列顺序；候补伙伴暂不上场。')));
    const leader=node('div','journey-member captain');leader.append(portrait(run.captain,60),node('b','',T(run.captain.mon.name)),node('small','',L('Capitán','Captain','队长')+' · Lv.'+run.captain.level));panel.append(leader);
    G.Squad.roster.forEach((p,i)=>{
      if(i===G.Squad.capacity-1)panel.append(node('h4','',L('Suplentes','Reserves','候补区')));
      const card=node('div','journey-member'+(p.dead?' fainted':''));card.dataset.member=p.squadId;card.append(portrait(p,60));
      const text=node('div','journey-member-text');text.append(node('b','',T(p.mon.name)+' '+'★'.repeat(p.rank)),node('small','',T(p.moves[0].name)+' · Lv.'+p.level),tags(p),node('p','journey-talent',talentText(p)),node('small','',p.dead?L('Caído · vuelve tras la etapa','Fainted · returns after stage','已倒下 · 阶段结束恢复'):Math.ceil(p.hp)+' / '+Math.ceil(p.maxHp)+' HP'));
      const controls=node('div','journey-order');for(const [label,dir]of [['↑',-1],['↓',1]]){const b=button(label,()=>{G.Squad.reorder(i,dir);run.phase==='shop'?renderShop():renderRoute();},'btn small');b.disabled=i+dir<0||i+dir>=G.Squad.roster.length;b.setAttribute('aria-label',L('Mover','Move','移动')+' '+T(p.mon.name)+' '+label);controls.append(b);}
      card.append(text,controls);panel.append(card);
    });
    if(!G.Squad.roster.length)panel.append(node('p','note',L('Captura o invita a tu primer compañero.','Catch or invite your first companion.','捕获或邀请第一位伙伴，壮大小队吧。')));
    return panel;
  }
  function choose(row,col){
    if(!run||run.phase!=='route'||!R.reachable(run.row,run.col,row,col))return false;
    const cell=run.map[row][col];run.row=row;run.col=col;run.day=cell.day;run.history.push({day:run.day,col,kind:cell.kind});note='';
    if(cell.kind==='shop'){run.phase='shop';rollShop();renderShop();}
    else if(cell.kind==='rest'){run.gold+=15+run.cycle*5;run.captain.heal(run.captain.maxHp*.3);finishStage(L('El equipo ha descansado.','The squad has rested.','伙伴们整理好行囊，精神满满地出发了。'));}
    else startBattle(cell.kind);
    return true;
  }
  function rollShop(){
    offer=[];const lv=G.Squad.shopLevel,count=3+Math.floor((lv-1)/2);
    for(let i=0;i<count;i++){
      if(i===count-1||i>0&&Math.random()<.25){const items=G.Items.LIST.filter(it=>G.Items.permitted(it)&&(!it.boss||lv>=4)),it=G.U.pick(items);offer.push({kind:'item',id:it.id,cost:it.boss?100:35+lv*4});}
      else{const mon=R.shopMon(run.pool,lv);offer.push({kind:'mon',dex:mon.dex,cost:R.monCost(mon)});}
    }
  }
  function buy(index){
    if(run?.phase!=='shop')return false;const o=offer[index];if(!o||o.sold||run.gold<o.cost)return false;
    if(o.kind==='mon')G.Squad.recruit(o.dex);else if(!G.Items.gain(run.captain,o.id))return false;
    run.gold-=o.cost;o.sold=true;renderShop();return true;
  }
  function upgrade(){const cost=R.upgradeCost(G.Squad.shopLevel);if(run?.phase!=='shop'||run.gold<cost||G.Squad.shopLevel>=R.MAX_SHOP)return false;run.gold-=cost;G.Squad.upgrade();rollShop();renderShop();return true;}
  function renderShop(){
    const lv=G.Squad.shopLevel,box=header(L('Tienda Pokémon','Pokémon shop','宝可梦商店'),L('Invita compañeros, prepara objetos y amplía tu formación.','Invite companions, gather items and expand your formation.','邀请伙伴、挑选道具，让下一段旅程更从容。'));
    const info=node('div','journey-meta');info.append(node('b','journey-gold',L('Oro','Gold','局内金币')+' '+run.gold),node('b','',L('Tienda','Shop','商店')+' Lv.'+lv),node('span','',L('Plazas','Squad limit','编队上限')+' '+G.Squad.capacity));box.append(info);
    const layout=node('div','journey-layout'),goods=node('div','journey-goods');
    offer.forEach((o,i)=>{
      const card=node('article','journey-product '+(o.kind==='mon'?'iv-'+R.border(G.DB.save,o.dex):'item'));card.dataset.product=i;
      const content=node('div','journey-product-art');
      if(o.kind==='mon'){const mon=G.DEX_BY[o.dex];content.append(portrait(mon,100));card.append(content,node('small','',L('Compañero','Companion','队员邀请')),node('h3','',T(mon.name)));const dummy={mon,dex:mon.dex,moves:[]};card.append(tags(dummy),node('p','note',L('Un movimiento aleatorio al unirse.','One random move when recruited.','加入时随机获得一招技能。')));}
      else{content.innerHTML=G.Icons.html(G.Items.icon(o.id),64);card.append(content,node('small','',L('Objeto especial','Special item','特殊道具')),node('h3','',T(G.Items.BY[o.id].name)),node('p','',T(G.Items.BY[o.id].desc)));}
      const b=button(o.sold?L('Invitado / adquirido','Recruited / acquired','已邀请／购入'):o.cost+' '+L('oro','gold','金币'),()=>buy(i),'btn gold');b.dataset.buy=i;b.disabled=o.sold||run.gold<o.cost;card.append(b);goods.append(card);
    });
    const controls=node('div','journey-shop-controls'),up=button(lv>=R.MAX_SHOP?L('Nivel máximo','Maximum level','商店已满级'):L('Mejorar tienda','Upgrade shop','升级商店')+' · '+R.upgradeCost(lv)+' '+L('oro','gold','金币'),upgrade,'btn');up.id='journey-upgrade';up.disabled=lv>=R.MAX_SHOP||run.gold<R.upgradeCost(lv);
    const refresh=button(L('Renovar','Refresh','刷新商品')+' · 10',()=>{if(run.gold<10||run.phase!=='shop')return;run.gold-=10;rollShop();renderShop();});refresh.disabled=run.gold<10;
    controls.append(up,refresh,button(L('Seguir la ruta','Continue route','离开商店'),()=>finishStage(),'btn gold'));goods.append(controls,node('p','note',L('Bordes: blanco sin registrar · azul · morado · naranja · rojo IV perfectos.','Borders: white unregistered · blue · purple · orange · red perfect IVs.','图鉴个体值边框：白色未获得 → 蓝色 → 紫色 → 橙色 → 红色满值。')));layout.append(goods,formation());box.append(layout);G.UI.show('scr-journey');
  }
  function startBattle(kind){
    run.phase='combat';run.kind=kind;run.elapsed=0;run.spawned=0;run.acc=0;run.kills=0;run.wave=R.wave(run.day);run.bossDead=false;run.waveType=Math.random()<.5?G.U.pick([...new Set(run.pool.flatMap(p=>p.types))]):null;
    G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Pickups.clear();G.Hazards.clear();G.Path.clear();
    G.World.setBiome(Math.floor((run.day-1)/5));G.Squad.recover();
    for(const p of G.Squad.actors())G.Abilities.resetStage(p,run.day);
    if(kind==='boss'){spawn(true);run.spawned=1;}
    G.UI.hideAll();G.Touch.reset();G.Game.expeditionResume();G.Audio.sfx('confirm');
  }
  function spawn(boss=false){
    const cap=run.captain,wave=run.wave,tier=Math.min(6,Math.ceil(((run.day-1)%20+1)/4)),candidates=run.pool.filter(p=>boss?p.bst>=480:p.rarity<=Math.min(4,tier)&&p.bst<700);
    const same=Math.random()<.85,typed=!boss&&run.waveType?candidates.filter(p=>p.types.includes(run.waveType)===same):null,mon=boss&&run.day===60?G.DEX_BY[493]:G.U.pick(typed?.length?typed:candidates.length?candidates:run.pool);
    let x=cap.x,y=cap.y;for(let i=0;i<24;i++){const a=Math.random()*Math.PI*2,d=Math.max(220,G.Camera.outerRadius()+20);x=cap.x+Math.cos(a)*d;y=cap.y+Math.sin(a)*d;if(G.World.isFree(x,y,20))break;}
    const behavior=boss?'chase':G.Enemies.behaviorOf(mon),def={dex:mon.dex,name:mon.name,hp:boss?350+run.day*24:12+(mon.baseStats?.hp||60)*.2,spd:boss?55:48+(mon.baseStats?.spe||60)*.15,dmg:boss?14:4+Math.min(8,mon.rarity),xp:boss?80:10+Math.floor(run.day/2),behavior,shotDmg:boss?14:5,shotCd:3.5,range:200};
    const e=new G.Enemy(def,x,y,{hp:wave.hp*(boss?1.6:1),spd:wave.speed,dmg:wave.dmg},boss);e.expedition=true;e.expeditionArceus=boss&&run.day===60;
    if(run.kind==='elite'&&!boss)e.makeElite();if(!boss&&Math.random()<G.Difficulty.eliteChance())e.makeElite();
    if(G.Sprites.hasShiny(mon.dex)&&Math.random()<G.Spawner.SHINY_RATE)e.makeShiny();
    G.EnemyMgr.add(e);G.Sprites.preload([mon.dex]);return e;
  }
  function tick(dt){
    if(!run||run.phase!=='combat'||run.captain.dead)return;
    run.elapsed+=dt;
    if(run.kind!=='boss'){
      run.acc+=dt*(run.wave.count/Math.max(8,run.wave.duration*.6));
      while(run.acc>=1&&run.spawned<run.wave.count&&G.EnemyMgr.count<64){run.acc--;spawn();run.spawned++;}
      const alive=G.EnemyMgr.all().filter(e=>!e.dead).length,cleared=run.spawned>=run.wave.count&&alive===0&&G.EnemyMgr.count===0;
      if(cleared||run.elapsed>=run.wave.duration)finishBattle(cleared);
    }else if(run.bossDead&&!G.EnemyMgr.all().some(e=>e.boss))finishBattle(true);
  }
  function killed(e){
    if(!run||run.phase!=='combat'||!e.expedition)return;
    run.kills++;run.gold+=e.boss?25:e.elite?5:1;
    if(e.boss)run.bossDead=true;
    if(!e.boss&&Math.random()<.12){const p=G.Squad.recruit(e.dex);if(p)G.UI.toast(L('¡Un compañero se une!','A companion joins!','新伙伴加入小队！')+' '+T(G.DEX_BY[e.dex].name));}
  }
  function finishBattle(cleared){
    if(run.phase!=='combat')return;if(run.day===60&&run.kind==='boss'&&cleared){run.arceus=true;run.cashout=true;}run.phase='rewards';const amount=Math.round(run.wave.coins*(run.kind==='elite'?1.8:run.kind==='boss'?3:1)*(cleared?1.5:1));run.gold+=amount;
    G.EnemyMgr.update(0,G.Squad.actors());
    note=(cleared?L('¡Todos derrotados!','All foes defeated!','全歼奖励！'):L('Etapa superada','Stage survived','成功度过波次'))+' +'+amount+' '+L('oro','gold','局内金币');
    G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();
    if(run.kind==='elite')G.Pickups.drop('item',run.captain.x,run.captain.y,G.Items.roll());
  }
  function depart(){if(run?.phase!=='rewards')return;finishStage(note);}
  function finishStage(message=''){
    if(!run)return;G.Game.scoreEvent();G.Squad.recover();run.captain.heal(run.captain.maxHp*.15);note=message;
    if(run.day%20===0&&run.day>0){run.cycle++;run.map=R.matrix(run.cycle);run.row=0;run.history=[{day:run.day,col:run.col}];note+=' '+L('Un nuevo ciclo: los rivales se han fortalecido.','A new cycle: foes have grown much stronger.','新的周期开始了，对手变得更强了。');}
    if(run.day===60&&run.cashout){G.Game.expeditionVictory();return;}
    showRoute();
  }
  function continueAfterVictory(){if(!run)return;run.cashout=false;G.Server?.heartbeat?.().catch(()=>{});showRoute();}
  function reset(){run=null;G.Squad.reset();const el=$('journey-status');if(el)el.hidden=true;}
  function hud(){
    const el=$('journey-status');if(!el)return;el.hidden=!run||G.Game.state!=='playing';if(el.hidden||performance.now()-lastHud<150)return;lastHud=performance.now();
    el.textContent=L('Día','Day','第')+' '+run.day+(G.I18n.lang==='zh'?' 天':'')+' · '+L('Ciclo','Cycle','周期')+' '+R.cycleOf(run.day)+' · '+run.gold+' '+L('oro','gold','局内金币')+' · '+(run.kind==='boss'?L('Derrota al jefe','Defeat the Boss','击败BOSS'):Math.max(0,Math.ceil(run.wave.duration-run.elapsed))+'s')+' · '+(G.Squad.deployed().filter(p=>!p.dead).length+1)+'/'+G.Squad.capacity;
  }
  return {setup,begin,reset,choose,buy,upgrade,tick,killed,depart,continueAfterVictory,hud,summary,showRoute,
    get active(){return !!run;},get inCombat(){return run?.phase==='combat';},get phase(){return run?.phase;},get run(){return run;},get offers(){return offer;}};
})();
