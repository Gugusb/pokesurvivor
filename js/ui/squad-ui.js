/* A separate formation and companion-details page; combat opens a read-only paused view. */
G.SquadUI=(()=>{
  const $=id=>document.getElementById(id),T=s=>G.T(s),L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  let selected=null,editable=false,done=null,last=0,stats=[],moves=[],health=null,drag=null,bondMode='types',bondRevision=-1;
  let rankQueue=[],rankTimer=0,rankOverlay=null,rankFocus=null,scrollState={board:0,warehouse:0};
  function rememberScroll(){const list=$('squad-list');if(!list)return;scrollState.board=list.querySelector('.squad-battle-scroll')?.scrollTop??scrollState.board;scrollState.warehouse=list.querySelector('.squad-warehouse-strip')?.scrollTop??scrollState.warehouse;}
  function clearRankUps(){clearTimeout(rankTimer);rankQueue=[];rankOverlay?.remove();rankOverlay=null;rankFocus=null;}
  function rankUp(before,after){rankQueue.push({before:{...before},after:{...after}});if(!rankOverlay)showNextRankUp();}
  function showNextRankUp(){
    clearTimeout(rankTimer);rankOverlay?.remove();rankOverlay=null;
    if(!rankQueue.length){const focus=rankFocus?.isConnected?rankFocus:$('journey-upgrade')||$('squad-close');focus?.focus({preventScroll:true});rankFocus=null;return;}
    const {before,after}=rankQueue.shift();if(!rankFocus)rankFocus=document.activeElement;
    const overlay=node('div','squad-rankup');overlay.id='squad-rankup';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',L('¡Ascenso!','Star up!','升星成功'));overlay.setAttribute('translate','no');overlay.dataset.rank=after.rank;overlay.dataset.dex=after.dex;
    const card=node('section','squad-rankup-card');card.append(node('small','',L('UN NUEVO PASO','A NEW MILESTONE','伙伴成长时刻')),node('h2','',L('¡Ascenso!','Star up!','升星成功')));
    const art=node('div','squad-rankup-art'),oldArt=node('div','rankup-before'),newArt=node('div','rankup-after');
    oldArt.append(portrait(before,150));newArt.append(portrait(after,150));art.append(node('i','rankup-ring'),oldArt,newArt);
    card.append(art,node('strong','rankup-stars','★'.repeat(after.rank)),node('b','rankup-name',T(after.name)),node('p','',T(before.name)+' '+('★'.repeat(before.rank))+' → '+T(after.name)+' '+('★'.repeat(after.rank))));
    const skip=button(L('Continuar','Continue','继续'),showNextRankUp,'btn gold');skip.dataset.sfx='none';card.append(skip);overlay.append(card);document.body.append(overlay);rankOverlay=overlay;G.Audio.sfx('levelup');skip.focus({preventScroll:true});
    overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();showNextRankUp();}else if(e.key==='Tab'){e.preventDefault();skip.focus();}};
    rankTimer=setTimeout(showNextRankUp,1800);
  }
  const isOpen=()=>G.UI.isOpen('scr-squad');
  const leader=()=>G.Expedition.run?.captain;
  const all=()=>[leader(),...G.Squad.roster].filter(Boolean);
  const id=p=>p.isSquadMember?String(p.squadId):'captain';
  const deployed=p=>G.Squad.actors().includes(p);
  const canEdit=()=>editable&&['route','shop','loot','wild'].includes(G.Expedition.phase);
  function status(p){return p===leader()?L('Capitán','Captain','队长'):!deployed(p)?L('Suplente','Reserve','候补'):p.dead?L('Caído · rasgo inactivo','Fainted · trait inactive','已倒下 · 特性暂停'):L('En formación','Deployed','已上阵');}
  function button(text,fn,cls='btn'){const b=node('button',cls,text);b.type='button';b.onclick=fn;return b;}
  function portrait(p,size){const canvas=node('canvas');canvas.width=canvas.height=size;const view=G.UI.sprite(canvas,p.spriteDex||p.dex,{scale:3,hero:true,shiny:!!p.shiny,lively:false,anim:'Walk'});if(p.dead){view.a.play('Faint',{hold:true});canvas.style.filter='grayscale(1)';}canvas.setAttribute('aria-hidden','true');return canvas;}
  function init(){const b=$('squad-open');b.innerHTML=G.Icons.html('friends',24)+'<kbd>T</kbd>';b.title=b.ariaLabel=L('Ver equipo','View squad','查看小队');b.onclick=()=>G.Game.toggleSquad();}
  function show(options={}){scrollState={board:0,warehouse:0};editable=!!options.editable;done=options.onClose||null;selected=null;render();G.UI.show('scr-squad');$('squad-close').focus();last=performance.now();}
  const detailsOpen=()=>!!$('squad-member-dialog')&&!$('squad-member-dialog').classList.contains('hidden');
  function closeDetails(focus=true){if(!detailsOpen())return;$('squad-member-dialog').classList.add('hidden');if(focus&&selected)$('squad-list').querySelector('[data-squad-select="'+id(selected)+'"]')?.focus();}
  function back(){if(detailsOpen())closeDetails();else close();}
  function close(){if(!isOpen())return;drag?.destroy();drag=null;closeDetails(false);G.UI.hide('scr-squad');const cb=done;done=null;cb?.();}
  function render(){
    rememberScroll();drag?.destroy();$('squad-member-dialog')?.remove();const root=$('squad-content');root.replaceChildren();
    const header=node('header','squad-header'),heading=node('div');heading.append(node('small','journey-eyebrow','TEAM FORMATION'),node('h2','',L('Formación del equipo','Squad formation','队伍组建')));
    const closeButton=button('←',close,'btn squad-back-btn');closeButton.id='squad-close';closeButton.setAttribute('aria-label',L('Volver','Back','返回'));
    const wallet=node('div','squad-wallet');wallet.append(node('span','',L('Oro','Gold','局内金币')+' '+G.Economy.formatGold(G.Expedition.run.gold)),node('span','',T('Gemas de habilidad')+' '+(G.DB.save.abilityGems||0)));header.append(closeButton,heading,wallet);root.append(header);
    root.append(G.Expedition.progressPanel());
    const bar=node('div','squad-mode');bar.append(node('b','',(G.Squad.deployed().length+1)+' / '+G.Squad.capacity+' · '+L('Plazas','Squad limit','编队上限')),node('span','',canEdit()?L('Arrastra para organizar · toca para ver detalles','Drag to arrange · select for details','拖拽调整编队 · 点击查看详情'):L('Combate en pausa · consulta del equipo','Combat paused · squad inspection','战斗已暂停 · 查看小队')));root.append(bar);
    const list=node('div','squad-formation-surface');list.id='squad-list';root.append(list);renderList();
    drag=G.ReorderGrid.bind(list,{enabled:()=>canEdit()&&!detailsOpen(),onDrop:(key,drop)=>{
      const p=G.Squad.roster.find(p=>id(p)===key);if(!p||!canEdit())return;let changed=false;
      if(drop.startsWith('slot:'))changed=G.Squad.place(p,Number(drop.slice(5)));
      else if(drop==='bench')changed=G.Squad.bench(p);
      else if(drop==='release'){releaseMember(p,false);return;}
      else if(drop.startsWith('unit:'))changed=G.Squad.swap(p,G.Squad.roster.find(q=>id(q)===drop.slice(5)));
      if(changed){renderList();bar.firstChild.textContent=(G.Squad.deployed().length+1)+' / '+G.Squad.capacity+' · '+L('Plazas','Squad limit','编队上限');}
    }});
    root.append(node('p','note squad-help',canEdit()?L('En móvil, arrastra el asa de puntos. El capitán conserva su puesto.','On touchscreens, drag the dotted grip. The captain keeps the lead slot.','手机可拖动圆点把手；队长位置固定，队员可在出战队伍与候补间拖放。'):L('Reorganiza el equipo en el itinerario o la tienda. T o Esc para volver.','Rearrange the squad in the itinerary or shop. T or Esc to return.','可在日程或商店阶段调整编队；按 T 或 Esc 返回。')));
  }
  function releaseMember(p,ask=true){
    if(!canEdit()||!G.Squad.roster.includes(p))return false;
    if(ask&&G.Expedition.phase!=='loot'&&!confirm(L('¿Liberar a este compañero? No podrás recuperarlo.','Release this companion? This cannot be undone.','确定放生这位伙伴吗？本次远征中无法找回。')))return false;
    if(!G.Squad.release(p))return false;closeDetails(false);selected=null;render();
    G.UI.toast(L('Compañero liberado','Companion released','已放生伙伴')+' · '+T(p.mon.name));return true;
  }
  function choose(p){
    selected=p;for(const e of $('squad-list').querySelectorAll('[data-squad-select]')){const on=e.dataset.squadSelect===id(p);e.classList.toggle('selected',on);e.setAttribute('aria-pressed',on);}
    let modal=$('squad-member-dialog');if(!modal){modal=node('div','squad-modal hidden');modal.id='squad-member-dialog';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',L('Ficha del compañero','Companion details','宝可梦详情'));const detail=node('article','squad-detail');detail.id='squad-detail';modal.append(detail);$('scr-squad').append(modal);modal.onclick=e=>{if(e.target===modal)closeDetails();};}
    renderDetails();modal.classList.remove('hidden');$('squad-member-close').focus();
  }
  function unit(p,bench=false){
    const article=node('div','squad-unit squad-card'+(p.dead?' fainted':'')+(p===leader()?' captain':''));article.style.setProperty('--unit-color',G.U.TYPE_COLOR[p.mon.types[0]]||'#67b9ec');article.style.setProperty('--quality-color',G.ExpeditionQuality.color(p));article.dataset.quality=G.ExpeditionQuality.quality(p);article.dataset.cardLang=G.I18n.lang;
    if(p.isSquadMember){article.dataset.dragKey=id(p);if(bench)article.dataset.squadDrop='unit:'+id(p);}
    const pick=button('',()=>choose(p),'squad-pick'+(p===selected?' selected':''));pick.dataset.squadSelect=id(p);pick.setAttribute('aria-pressed',String(p===selected));
    const art=node('span','squad-unit-art');art.append(portrait(p,bench?64:100));art.style.setProperty('--hp',Math.max(0,p.hp/p.maxHp)*100+'%');
    const name=node('b','squad-unit-name',T(p.mon.name)),rank=node('strong','squad-unit-rank','★'.repeat(p.isSquadMember?p.rank:p.trainerRank||1));rank.dataset.stars=p.isSquadMember?p.rank:p.trainerRank||1;rank.setAttribute('aria-label',rank.textContent);
    const identity=node('span','squad-card-identity');name.title=T(p.mon.name);identity.append(art,name);
    const info=node('span','squad-card-info'),top=node('span','squad-card-top'),types=node('span','squad-card-types');types.title=p.mon.types.map(t=>T(G.U.TYPE_NAME[t])).join(' / ');for(const type of p.mon.types){const chip=node('span','squad-card-type');chip.innerHTML=G.Icons.html('type:'+type,14);chip.append(node('span','',T(G.U.TYPE_NAME[type])));types.append(chip);}
    top.append(types,rank);const tags=node('span','squad-card-tags'),t=G.Squad.tags(p);for(const egg of (G.LeagueRank?.allows('eggTags')??true)?t.eggs:[]){const chip=node('span','squad-card-tag egg',G.ExpeditionTerms.egg(egg));chip.dataset.tagCategory='egg';tags.append(chip);}for(const kind of new Set(p.moves.map(m=>G.SquadBonds.group(m.kind)))){const chip=node('span','squad-card-tag skill',G.SquadBonds.label(kind));chip.dataset.tagCategory='skill';tags.append(chip);}info.append(top,tags);pick.append(identity,info);pick.setAttribute('aria-label',T(p.mon.name)+' · '+rank.textContent+' · '+types.title+' · '+tags.textContent);article.append(pick);article.onclick=e=>{if(!e.target.closest('button,.squad-drag-handle'))choose(p);};if(p===leader())article.append(node('small','squad-captain-label',L('Capitán','Captain','队长')));
    if(p.isSquadMember&&canEdit()){const grip=node('span','squad-drag-handle','⠿');grip.title=L('Arrastrar','Drag to move','拖动调整位置');grip.setAttribute('aria-label',grip.title);article.append(grip);}return article;
  }
  function renderList(){
    rememberScroll();const list=$('squad-list');list.replaceChildren();
    if(canEdit()){
      const release=node('div','squad-release-slot');
      release.id='squad-release-slot';
      release.dataset.squadDrop='release';
      release.setAttribute('aria-label',L('Arrastra aquí para liberar','Drag here to release','拖入此处放生伙伴'));
      release.append(node('span','squad-release-mark','↗'),node('b','',L('Liberar','Release','放生')),node('small','',L('Arrastra aquí','Drop companion here','拖入伙伴')));
      list.append(release);
    }
    const board=node('section','squad-field-panel');board.append(node('h3','',L('Equipo de combate','Battle squad','出战队伍')));
    const viewport=node('div','squad-battle-scroll');viewport.setAttribute('role','region');viewport.setAttribute('aria-label',L('Formación desplazable','Scrollable formation','可滚动出战队列'));viewport.tabIndex=0;
    const grid=node('div','squad-battle-grid'),capacity=G.Squad.capacity,columns=Math.min(capacity,innerWidth<=760?2:innerWidth<1100?3:5),rows=Math.ceil(capacity/columns);grid.style.setProperty('--squad-columns',columns);grid.style.setProperty('--squad-rows',rows);grid.dataset.rows=rows;
    const line=document.createElementNS('http://www.w3.org/2000/svg','svg');line.setAttribute('viewBox','0 0 '+(columns*160)+' '+(rows*260));line.setAttribute('preserveAspectRatio','none');line.setAttribute('class','squad-snake-path');line.setAttribute('aria-hidden','true');let path='M80 130';for(let row=0;row<rows;row++){const end=row%2?80:(columns-.5)*160;path+=' H'+end;if(row<rows-1)path+=' V'+((row+1)*260+130);}line.innerHTML='<path d="'+path+'" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="3 13" stroke-linecap="round"/>';grid.append(line);
    const formation=G.Squad.formation;
    for(let n=0;n<G.Squad.capacity;n++){
      const locked=n>=G.Squad.capacity,slot=node('div','squad-field-slot'+(locked?' locked':''));slot.style.gridRow=String(Math.floor(n/columns)+1);slot.style.gridColumn=String(Math.floor(n/columns)%2?columns-n%columns:n%columns+1);slot.dataset.squadDrop=n===0||locked?'locked':'slot:'+(n-1);slot.dataset.slot=n;
      const p=n===0?leader():formation[n-1];if(p)slot.append(unit(p));else{const empty=node('div','squad-vacancy');empty.append(node('b','',locked?'◇':'+'),node('small','',locked?L('Cerrado','Locked','未解锁'):L('Plaza libre','Open slot','空位')));slot.append(empty);}
      slot.append(node('small','squad-slot-number',String(n+1)));grid.append(slot);
    }
    viewport.append(grid);board.append(viewport);list.append(board);viewport.scrollTop=scrollState.board;
    const bonds=node('aside','squad-bonds');bonds.id='squad-bonds';list.append(bonds);renderBonds();
    const warehouse=node('section','squad-warehouse');
    const label=node('div','squad-warehouse-label');label.append(node('h3','',L('Reserva de compañeros','Companion reserves','候补仓库')+' '+G.Squad.reserves().length+' / '+G.Squad.RESERVE_LIMIT));
    warehouse.append(label);
    const strip=node('div','squad-warehouse-strip'),reserve=G.Squad.reserves();strip.dataset.squadDrop='bench';strip.style.setProperty('--reserve-rows',G.Squad.RESERVE_LIMIT);
    for(let i=0;i<G.Squad.RESERVE_LIMIT;i++){const slot=node('div','squad-reserve-slot');slot.dataset.squadDrop='bench';slot.dataset.reserveSlot=i;if(reserve[i])slot.append(unit(reserve[i],true));else slot.append(node('div','squad-bench-empty','+ '+L('Reserva','Reserve','候补空位')));strip.append(slot);}warehouse.append(strip);list.append(warehouse);strip.scrollTop=scrollState.warehouse;
    const finish=node('div','squad-finish');finish.append(button(canEdit()?L('Formación lista','Formation ready','完成编队'):L('Volver al combate','Return to battle','返回战斗'),close,'btn gold'));list.append(finish);
  }
  function renderBonds(){
    G.SquadBonds?.refresh();bondRevision=G.SquadBonds?.revision??-1;
    if(!(G.LeagueRank?.allows(bondMode)??true))bondMode='skill';
    const box=$('squad-bonds'),previous=box.dataset.mode===bondMode?(box.querySelector('.squad-bond-rows')?.scrollTop||0):0;box.dataset.mode=bondMode;box.replaceChildren();box.append(node('h3','',L('Etiquetas del equipo','Squad tags','小队标签')));
    const tabs=node('div','squad-bond-tabs');for(const [key,name]of [['types',L('Tipo','Type','属性')],['eggs',L('Especie','Species','蛋组')],['skill',L('Oficio','Class','职业')],['talents',L('Potenciales','Talents','潜能')]].filter(([key])=>G.LeagueRank?.allows(key)??true)){const b=button(name,()=>{bondMode=key;renderBonds();},'squad-bond-tab'+(bondMode===key?' on':''));tabs.append(b);}box.append(tabs);if(bondMode==='talents'){box.append(G.TrainerTalentsUI.ownedPanel(G.Expedition.run));return;}
    G.SquadBonds?.refresh();const labels=new Map();
    for(const p of G.Squad.actors()){const t=G.Squad.tags(p),values=bondMode==='types'?t.types.map(id=>[id,T(G.U.TYPE_NAME[id])]):bondMode==='eggs'?t.eggs.map(id=>[id,G.ExpeditionTerms.egg(id)]):p.moves.map(m=>[G.SquadBonds.group(m.kind),G.Expedition.skillLabel(m.kind)]);for(const [id,name]of values)labels.set(id,name);}

    const rows=node('div','squad-bond-rows');for(const [id,name]of [...labels].sort((a,b)=>(G.SquadBonds?.count(bondMode,b[0])||0)-(G.SquadBonds?.count(bondMode,a[0])||0))){
      const count=G.SquadBonds?.count(bondMode,id)||0,isType=bondMode==='types'&&G.TypeBondDefs?.BY[id],designed=isType||bondMode==='skill'&&G.SquadBonds?.KINDS.includes(id),s=isType?G.TypeBonds.state(id):designed?G.SquadBonds.state(id):null,row=node('div','squad-bond-row'+(s?.tier?' active':''));row.dataset.bond=id;
      row.append(node('b','',name),node('span','',count+(designed?' / '+(isType?(count<2?2:5):(count<3?3:id==='buff'?5:G.EconomyConfig.classBonds.thresholds[1])):'')),node('small','squad-bond-stack',Number((G.SquadBonds?.layer(bondMode,id)??0).toFixed(1))+L(' c',' stacks','层')));
      if(designed||bondMode==='skill')row.append(node('p','squad-bond-effect',isType?(isType.description[G.I18n.lang]||isType.description.en):G.SquadBonds.description(id)));
      if(isType){const detail=node('div','squad-bond-current');detail.append(node('b','',L('Valores actuales','Current values','当前结算')));
        const labels={mark:['Marca','Mark','印记增伤'],dot:['Daño continuo','Damage over time','持续伤害系数'],blast:['Explosión','Burst','爆发伤害系数'],slow:['Ralentización','Slow','减速'],heal:['Curación','Healing','恢复比例'],chain:['Rayo','Lightning','闪电链系数'],speed:['Velocidad','Speed','移速提升'],freeze:['Congelación','Freeze','冻结时长'],crit:['Crítico','Critical damage','暴伤提升'],spikes:['Esquirlas','Shards','冰刺数'],knock:['Empuje','Knockback','击退提升'],interval:['Intervalo','Interval','护盾间隔'],shields:['Escudos','Shields','护盾上限'],quake:['Terremoto','Quake','地震系数'],pulse:['Ráfaga','Gust','风压系数'],aura:['Viento continuo','Continuous wind','持续风压系数'],vulnerability:['Marca','Mark','每层易伤'],cluster:['Enjambre','Swarm','每层继承比例'],inherit:['Herencia','Inheritance','牺牲继承比例'],impact:['Impacto','Impact','悬岩系数'],drain:['Drenaje','Drain','当前生命流失'],damage:['Daño','Damage','伤害提升'],size:['Tamaño','Size','范围提升'],meteor:['Meteoros','Meteors','龙星群系数'],chance:['Probabilidad','Chance','触发几率'],reflect:['Reflejo','Reflection','双防反伤系数'],reduction:['Reducción','Reduction','每名成员减伤'],threshold:['Umbral','Threshold','处决生命线'],execute:['Ejecución','Execution','额外处决伤害']};
        const second={fire:['blast'],grass:['heal'],electric:['speed'],ice:['crit','spikes'],fighting:['heal'],poison:['blast'],ground:['quake'],flying:['aura'],bug:['inherit'],ghost:['blast'],dragon:['meteor'],steel:['reduction','damage'],fairy:['threshold','execute']};
        for(const key of Object.keys(isType.values)){if(!s.tier||s.tier<5&&second[id]?.includes(key))continue;let current=G.TypeBonds.value(id,key);if(['spikes','shields'].includes(key))current=Math.max(1,Math.floor(current));if(key==='interval')current=Math.max(.25,current);if(key==='threshold')current=Math.min(.95,current);if(['slow','chance'].includes(key))current=Math.min(1,current);const unit=['freeze','interval'].includes(key)?'s':['spikes','shields'].includes(key)?'':'%',factor=unit==='%'?100:1,fmt=n=>Number((n*factor).toFixed(2))+unit;detail.append(node('p','',L(...labels[key])+' · '+fmt(current)));}row.append(detail);
      }const extra=[...row.children].slice(3);if(extra.length){const inspect=button('i',()=>showBondDetail(name,extra),'squad-bond-info');inspect.setAttribute('aria-label',L('Detalles de ','Details: ','查看羁绊：')+name);row.append(inspect);}rows.append(row);
    }box.append(rows,node('p','note',L('Cada especie cuenta una vez por etiqueta.','Each species counts once per tag.','同名伙伴对同一羁绊只计一次生效数。')));
    rows.scrollTop=previous;
    if(G.SquadTraits)return;
    box.append(node('h4','',L('Apoyo activo','Active support','当前支援')));let found=false;for(const [key,label]of [['atk',L('Ataques','Attacks','基础双攻')],['hp',L('Vida','HP','基础生命')],['agility',L('Agilidad','Agility','基础敏捷')],['stamina',L('Aguante','Stamina','基础耐力')],['regen',L('Vida/s','HP/s','基础生命/秒')]]){const value=G.Squad.growth(leader(),key);if(value){found=true;box.append(node('p','squad-support-line',label+' +'+Number((value*100).toFixed(1))+'%'));}}if(!found)box.append(node('p','note',L('Sin apoyo todavía','No support yet','暂无队员支援')));
  }
  function showBondDetail(name,extra){
    selected=null;health=null;$('squad-member-dialog')?.remove();const modal=node('div','squad-modal');modal.id='squad-member-dialog';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',name);const detail=node('article','squad-detail squad-bond-dialog'),closeBar=node('div','squad-detail-closebar'),dismiss=button('×',()=>closeDetails(),'btn small');dismiss.id='squad-member-close';closeBar.append(dismiss);detail.append(closeBar,node('h3','',name));for(const e of extra)detail.append(e.cloneNode(true));modal.append(detail);$('scr-squad').append(modal);modal.onclick=e=>{if(e.target===modal)closeDetails();};dismiss.focus({preventScroll:true});
  }
  function statRows(p){
    return G.PlayerStats.rows(p).map(r=>{
      if(p.isSquadMember&&r.key==='agility'){const value=p.agilityFor(p.moves[0]),factor=G.MonProgression.cooldownFactor(value);r.battle=L('Agilidad efectiva','Effective agility','技能结算敏捷')+' '+G.PlayerStats.fmt(value)+' · '+T('Recarga')+' ×'+G.PlayerStats.fmt(factor);}
      if(p.isSquadMember&&r.key==='stamina')r.battle=L('Aguante efectivo','Effective stamina','技能结算耐力')+' '+G.PlayerStats.fmt(p.staminaFor(p.moves[0]))+' · '+T('Recuperación base')+' '+G.PlayerStats.fmt(1/p.ppIntervalFor(p.moves[0]))+' PP/s';
      return r;
    });
  }
  function renderDetails(){
    if(!all().includes(selected))selected=leader();const p=selected,box=$('squad-detail');box.replaceChildren();stats=[];moves=[];const closeBar=node('div','squad-detail-closebar'),dismiss=button('×',()=>closeDetails(),'btn small');dismiss.id='squad-member-close';dismiss.setAttribute('aria-label',L('Cerrar detalles','Close details','关闭详情'));closeBar.append(dismiss);box.append(closeBar);
    const hero=node('div','squad-hero');const art=portrait(p,144);if(G.ExpeditionQuality){art.style.border='3px solid '+G.ExpeditionQuality.color(p);art.style.borderRadius='14px';}hero.append(art);const title=node('div');title.append(node('small','squad-status',status(p)),node('h3','',T(p.mon.name)),node('p','',L('Nivel','Level','等级')+' '+p.level+(p.isSquadMember?' · '+'★'.repeat(p.rank):'')));
    health=node('p','squad-health-value');title.append(health);hero.append(title);box.append(hero,G.Expedition.tags(p));
    const talent=node('section','squad-talent');talent.append(node('h4','',L('Habilidad','Ability','特性')));
    if(p.isSquadMember){const text=node('p','',G.Expedition.talentText(p));text.setAttribute('translate','no');talent.append(text);talent.append(node('small','',L('Activa mientras está vivo y en formación.','Active while alive and deployed.','仅上阵且存活时触发；候补和倒下者不触发。')));}
    else{const def=G.AbilityDefs.LIST.find(a=>a.ability===p.ability);talent.append(node('p','',def?T(def.name)+' · '+T(def.desc):L('Sin habilidad','No ability','尚未装备特性勋章')));}if(!p.isSquadMember||(G.LeagueRank?.allows('traits')??true))box.append(talent);
    if(G.ExpeditionQuality){const f=G.ExpeditionQuality.factors(p);box.append(node('p','squad-quality-factors',G.ExpeditionQuality.label(p)+(p.isSquadMember?' · '+L('Ataques','Attacks','双攻')+' ×'+f.ad+' · '+L('Vida','HP','生命')+' ×'+f.hp:'')));}if(G.SquadAssault?.controls(p))box.append(node('p','squad-assault-status',G.SquadAssault.label(p)+' · '+L('Busca a 4× alcance. Sin regeneración natural de PP fuera de la formación; vuelve y espera la recarga completa.','Searches at 4× attack reach. No natural PP regeneration away; returns and waits for full PP.','索敌距离为攻击距离4倍；离队期间停止自然回复PP，归队后充满再出击。')));
    box.append(node('h4','squad-section-title',L('Atributos actuales','Current stats','当前属性')));
    const table=node('div','squad-stats');for(const r of statRows(p)){const cell=node('div','squad-stat');cell.dataset.stat=r.key;const value=node('b','',G.PlayerStats.fmt(r.total)),battle=node('small','',r.battle);cell.append(node('span','',T(r.name)),value,battle);table.append(cell);stats.push({key:r.key,value,battle});}box.append(table);
    box.append(node('h4','squad-section-title',L('Movimientos','Moves','招式')));
    for(const m of p.moves){const info=G.PlayerStats.move(p,m),card=node('section','squad-skill');card.dataset.skill=m.id;const heading=node('div','squad-skill-heading'),pp=node('b','squad-pp');heading.append(node('strong','',T(m.name)+' · '+(m.evolved?L('Definitivo','Ultimate','超武'):'Lv.'+m.lvl)),pp);card.append(heading,node('p','',T(m.def.desc)));
      const facts=node('p','squad-skill-facts'),power=m.kind==='buff'?T('Efecto de apoyo'):T('Multiplicador del movimiento')+' ×'+G.PlayerStats.fmt(info.power);facts.textContent=T('Recarga')+' '+G.PlayerStats.fmt(info.cd)+' s · '+power;card.append(facts);
      if(p.isSquadMember)card.append(node('small','',L('Automático · agilidad y aguante al 50%','Automatic · 50% agility and stamina','自动释放 · 按50%敏捷和耐力结算')));box.append(card);moves.push({m,pp});
      if(m.kind==='buff')card.append(node('p','',L('Apoya al usuario y a sus vecinos de formación al 30% del efecto original.','Supports the user and adjacent formation partners at 30% of the original effect.','增益自身与编队中前、后各一位队友，效果为原来的30%。')));
    }
    if(p.isSquadMember&&canEdit()){
      const release=button(L('Liberar compañero','Release companion','放生伙伴')+' · +'+(G.Expedition.run.unitPool?.sellValue(p)||0)+' G',()=>releaseMember(p),'btn squad-release');release.id='squad-release';box.append(release);
    }
    refreshDetails();
  }
  function refreshDetails(){
    if(!selected||!health)return;health.textContent=Math.ceil(selected.hp)+' / '+Math.ceil(selected.maxHp)+' HP';
    const trait=document.querySelector?.('#squad-detail .squad-talent p');if(trait&&selected.isSquadMember&&G.SquadTraits)trait.textContent=G.SquadTraits.description(selected);
    const rows=statRows(selected);for(const el of stats){const r=rows.find(r=>r.key===el.key);el.value.textContent=G.PlayerStats.fmt(r.total);el.battle.textContent=r.battle;}
    for(const el of moves){const p=G.MovePP.state(selected,el.m);el.pp.textContent=G.PlayerStats.fmt(p.current)+' / '+p.max+' PP';}
  }
  function tick(){
    const launcher=$('squad-open');if(launcher)launcher.classList.toggle('hidden',!G.Expedition?.active||G.Game.state!=='playing');
    if(isOpen()&&performance.now()-last>300){last=performance.now();if(G.SquadBonds&&bondRevision!==G.SquadBonds.revision)renderBonds();if(detailsOpen())refreshDetails();}
  }
  let resizeTimer=0;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(isOpen()&&!detailsOpen()&&!document.body.classList.contains('squad-drag-active'))render();},80);});
  return {init,show,refresh:render,close,back,detailsOpen,closeDetails,isOpen,tick,statRows,rankUp,clearRankUps,get editable(){return canEdit();}};
})();
