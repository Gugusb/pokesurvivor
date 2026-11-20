/* Compact battle report. Rendering never grants or recalculates rewards. */
G.ExpeditionLootUI=(()=>{
  const L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es,T=s=>G.T(s);
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  const fmt=n=>Number((Number(n)||0).toFixed(1)).toLocaleString(G.I18n.lang==='zh'?'zh-CN':G.I18n.lang);
  const icon=(id,size=24)=>{const e=node('span','loot-icon');e.innerHTML=G.Icons.html(id,size);e.setAttribute('aria-hidden','true');return e;};
  const button=(text,fn,cls='btn')=>{const e=node('button',cls,text);e.type='button';e.onclick=fn;return e;};
  function section(title,cls){const e=node('section','loot-section '+cls);e.append(node('h3','loot-section-title',title));return e;}
  function life(s){
    const d=s.squadDamage||{before:s.squadHp,after:s.squadHp,applied:0,normal:0,elite:0,boss:0,cap:0};
    const max=G.TrainerTalents?.maxHp(s)||G.EconomyConfig.initial.squadHp,before=d.before,loss=Math.min(before,d.applied),after=Math.max(0,before-loss);
    const e=node('section','loot-section loot-life');e.dataset.squadDamage=d.applied;
    const top=node('div','loot-life-top'),value=node('div','loot-life-value');value.append(icon('heart',24),node('span','loot-life-label',L('Vida del equipo','Squad health','小队生命')),node('b','',fmt(s.squadHp)),node('small','','/ '+fmt(max)));
    const change=node('div','loot-life-change');change.append(node('span','',fmt(before)+' → '+fmt(after)),node('strong',loss?'loot-loss':'loot-no-loss',loss?'−'+fmt(loss):L('Sin daño','No damage','无损过关')));top.append(value,change);e.append(top);
    const track=node('div','loot-hp-track');track.setAttribute('role','img');track.setAttribute('aria-label',L('Vida antes/después','HP before/after','战前／战后生命')+' '+fmt(before)+' / '+fmt(after)+' · −'+fmt(loss));
    const remain=node('span','loot-hp-remain'),lost=node('span','loot-hp-lost');remain.style.width=after/max*100+'%';lost.style.left=after/max*100+'%';lost.style.width=loss/max*100+'%';track.append(remain,lost);e.append(track);
    const detail=node('div','loot-health-detail'),counts=node('span','loot-enemy-counts');
    const rules=G.EconomyConfig.squadHealth;
    for(const [key,label,mult] of [['normal',L('Normal','Normal','普通'),rules.normalDamage],['elite',L('Élite','Elite','精英'),rules.eliteDamage],['boss','BOSS',rules.bossDamage]]){const c=node('span',key,label+' '+d[key]+' ×'+mult);counts.append(c);}
    detail.append(counts,node('small','',L('Límite ','Cap ','扣血上限 ')+fmt(d.cap)));
    e.append(detail);const foot=node('div','loot-health-foot');const capStatus=node('span','loot-captain-health'),capTrack=node('span','loot-captain-track'),capFill=node('i');capFill.style.width=Math.max(0,Math.min(1,s.remainingHpRatio??1))*100+'%';capTrack.append(capFill);capTrack.setAttribute('aria-hidden','true');capStatus.append(node('small','',L('Capitán al terminar','Captain at battle end','队长战后生命')+' '+fmt((s.remainingHpRatio??1)*100)+'%'),capTrack);foot.append(capStatus);
    if(s.squadHp>after)foot.append(node('small','loot-recovery','+'+fmt(s.squadHp-after)+' '+L('recuperada','restored','恢复')+(d.rescued?' · '+L('Ceniza Sagrada','Sacred Ash','圣灰'):'')));
    if(d.raw>d.cap)foot.append(node('small','',L('Daño bruto ','Raw damage ','原始伤害 ')+fmt(d.raw)+' → '+fmt(d.applied)));
    e.append(foot);return e;
  }
  function xpProgress(card,label,level,current,next,color){const text=node('small','loot-xp-caption',label+' Lv.'+level+' · '+fmt(current)+' / '+(next?fmt(next):'MAX'));const track=node('div','loot-xp-track'),fill=node('span');fill.style.width=(next?Math.min(1,current/next):1)*100+'%';fill.style.background=color;track.append(fill);card.append(text,track);}
  function earnings(s){
    const report=s.settlement||{},box=section(L('Recompensas','Battle earnings','本场收益'),'loot-earnings'),grid=node('div','loot-earnings-grid');
    const card=(key,title,image,value)=>{const e=node('article','loot-earning');e.dataset.earning=key;const head=node('div','loot-earning-title');head.append(icon(image,22),node('span','',title));e.append(head,node('b','loot-earning-value','+'+fmt(value)));grid.append(e);return e;};
    const gold=card('gold',L('Oro','Gold','金币'),'coin',report.totalGoldGained||0),formula=node('p','loot-gold-formula');
    const investment=Math.min(report.baseWage||0,G.TrainerTalents?.wage(s)||0);
    const terms=[[L('Salario','Wage','工资'),(report.baseWage||0)-investment],[L('Inversión','Investment','投资'),investment],[L('Interés','Interest','利息'),report.interest||0],[L('Racha','Streak','连胜'),report.streakBonus],[L('Revancha','Comeback','逆境'),report.comebackBounty],[L('Élite','Elite bonus','精英奖励'),report.eliteFlawlessBonus],[L('Monedas','Drops','掉落'),report.inWaveDrops],[L('Rasgos','Traits','特性'),report.traitGold]];
    formula.textContent=terms.filter(([,n],i)=>n||i===0||i===2).map(([name,n])=>name+' '+fmt(n)).join(' + ')+' = '+fmt(report.totalGoldGained||0)+' G';gold.append(formula);
    const divisor=G.TrainerTalents?.interestDivisor(s)||G.EconomyConfig.interest.divisor,cap=G.TrainerTalents?.maxInterest(s)||G.EconomyConfig.interest.maxInterest;
    gold.append(node('small','loot-interest-rule',L('Interés: ','Interest: ','利息：')+'⌊'+fmt(s.lockedGoldAtBattleStart)+'G ÷ '+divisor+'⌋ · '+L('máx. ','cap ','上限 ')+cap+'G'));
    const raw=(s.loot.xp||0)+(s.loot.xpBig||0),xp=card('pokemon',L('EXP Pokémon','Pokémon XP','宝可梦经验'),'star',s.pokemonXpGained??raw);
    xp.append(node('p','loot-resource-detail',L('Recogida ','Collected ','拾取 ')+fmt(Math.max(0,raw-(s.xpJarSpent||0)))+' · '+L('Retirada ','Jar withdrawal ','罐中提取 ')+fmt(s.xpJarSpent)+(s.traitBattleRewards?.mon_xp?' · '+L('Rasgos ','Traits ','特性 ')+fmt(s.traitBattleRewards.mon_xp):'')));
    xp.append(node('small','loot-resource-detail',L('Guardada ','Jar deposit ','存罐 ')+fmt(s.xpJarStored)+' · '+L('Reserva ','Balance ','余量 ')+fmt(s.xpJar)));
    xpProgress(xp,'',s.captain.level,s.captain.xp,s.captain.xpNext,'#75d6fb');
    const trainer=card('trainer',L('EXP entrenador','Trainer XP','训练家经验'),'book',report.xpGained||0),row=G.Economy.levelRow(s.trainerLevel);
    const extra=Math.max(0,(report.xpGained||0)-(report.baseXp||0)-(report.clearXpBonus||0)-(report.traitXp||0));trainer.append(node('p','loot-resource-detail',L('Base ','Base ','基础 ')+fmt(report.baseXp)+(report.clearXpBonus?' + '+L('Limpieza ','Full clear ','全歼 ')+fmt(report.clearXpBonus):'')+(extra?' + '+L('Talento ','Talent ','潜能 ')+fmt(extra):'')+(report.traitXp?' + '+L('Rasgos ','Traits ','特性 ')+fmt(report.traitXp):'')));xpProgress(trainer,'',s.trainerLevel,s.trainerXp,row.xpToNext,'#f8d174');box.append(grid);return box;
  }
  function specials(s,actions){
    const box=section(L('Objetos especiales','Special rewards','特殊战利品'),'loot-specials'),grid=node('div','loot-items');
    const add=(name,image,count,desc)=>{if(!(count>0))return;const e=node('article','loot-item');e.append(icon(image,34));const info=node('div'),head=node('div','loot-item-title');head.append(node('b','',name),node('strong','','×'+fmt(count)));info.append(head,node('p','',desc));e.append(info);grid.append(e);};
    for(const [key,n]of Object.entries(s.loot))if(key.startsWith('item:')){const id=key.slice(5),it=G.Items.BY[id];add(T(it?.name||id),G.Items.icon(id),n,T(it?.desc||''));}
    add(L('Vales','Draw tickets','抽奖券'),'ticket',s.loot.ticket,L('Para sorteos de Pokémon.','Used for Pokémon draws.','用于宝可梦抽取。'));
    add(L('Vale de diez','Ten-draw ticket','十连抽奖券'),'ticket10',s.loot.ticket10,L('Permite diez sorteos.','Used for ten draws.','用于一次十连抽取。'));
    add(L('Cofre de jefe','Boss chest','BOSS奖励箱'),'bossChest',s.loot.bossChest,L('Elige su contenido en el siguiente paso de recompensas.','Choose its contents in the following reward flow.','随后按流程选择并领取箱内奖励。'));
    const extras=G.Game.loot||{},before=s.extraStart||{};add(T('Gemas de habilidad'),'gem',(extras.gems||0)-(before.gems||0),L('Recurso de habilidades.','Ability draw currency.','用于特性抽取。'));
    for(const kind of ['stones','duplicateStones','packs'])for(const [id,n]of Object.entries(extras[kind]||{})){const pack=kind==='packs';add(pack?G.CardPacks.local(G.CardPacks.packBy[id]?.name||id):G.Mega.label(id),pack?'cards':'megaStone',n-(before[kind]?.[id]||0),pack?L('Paquete de cartas.','A card pack.','可在卡包界面开启。'):kind==='duplicateStones'?L('Piedra repetida; conversión aplicada.','Duplicate stone; conversion applied.','重复进化石，已按规则处理。'):L('Megapiedra permanente.','Permanent Mega Stone.','永久解锁对应超级进化。'));}
    if(!grid.childElementCount){const empty=node('p','loot-inline-empty');empty.append(icon('bag',21),node('span','',L('Sin objetos esta vez','No special drops this battle','本场暂无特殊道具')));box.append(empty);}else box.append(grid);
    if(s.bossEmblemChoices){const choices=node('div','loot-emblems');choices.append(node('b','',s.bossEmblemClaimed?L('Emblema recibido','Emblem received','徽章已领取'):L('Elige un emblema','Choose an emblem','选择一个羁绊徽章')));for(const type of s.bossEmblemChoices){const b=button(T(G.U.TYPE_NAME[type])+' +'+G.EconomyConfig.bossEmblem.countBonus,()=>actions.onEmblem(type),'btn small');b.prepend(icon('type:'+type,20));b.dataset.bossEmblem=type;b.disabled=s.bossEmblemClaimed;choices.append(b);}box.append(choices);}return box;
  }
  function companion(s,actions){
    const box=section(L('Nuevo compañero','New companion','同行伙伴'),'loot-companion-section');
    if(!s.companion){const empty=node('p','loot-inline-empty');empty.append(icon('ball',21),node('span','',L('Sin compañero pendiente','No companion waiting','暂无待领取的伙伴')));box.append(empty);return box;}
    const mon=G.DEX_BY[G.ExpeditionRules.formForRank(s.companion,1)],card=node('div','loot-companion'),identity=node('div','loot-companion-identity'),details=node('div','loot-companion-details');
    card.style.setProperty('--loot-quality',G.ExpeditionQuality.color(mon));card.dataset.quality=G.ExpeditionQuality.quality(mon);
    const monPic=G.UI.spriteCanvas(mon.dex,96,88,{scale:2,hero:true,lively:true});monPic.setAttribute('aria-label',T(mon.name));identity.append(monPic,node('h4','',T(mon.name)),node('small','loot-mon-quality','★ · '+G.ExpeditionQuality.label(mon)));
    const buttons=node('div','loot-companion-actions');if(!s.companionResolved){const receive=button(G.Squad.canRecruit(s.companion)?L('Recibir','Receive','领取伙伴'):L('Organizar','Arrange reserves','整理后领取'),actions.onClaim,'btn gold small');receive.id='journey-claim';buttons.append(receive,button(L('Dejar ir','Let go','放生'),actions.onRelease,'btn small'));}else buttons.append(node('b','loot-received','✓ '+L('Recibido','Received','已领取')));identity.append(buttons);
    const move=G.Moves.instance(G.FIXED_SKILLS?.[mon.dex]||G.Moves.startFor(mon),1),candidate={mon,dex:mon.dex,rank:1,moves:[move]};details.append(G.Expedition.tags(candidate));
    const skill=node('div','loot-mon-skill');skill.append(icon('move:'+move.id,28));const skillText=node('div');skillText.append(node('b','',T(move.name)+' · Lv.'+move.lvl),node('small','',G.Moves.classLabel(move)),node('p','',T(move.desc)));skill.append(skillText);details.append(skill);
    details.append(node('p','loot-mon-trait',G.Expedition.talentText(candidate)));card.append(identity,details);box.append(card);return box;
  }
  function render(box,s,actions){
    const layout=node('div','battle-loot-layout'),main=node('main','battle-loot-main'),side=node('aside','battle-loot-side'),clear=!!s.battleCleared;
    const head=node('header','loot-outcome');head.dataset.cleared=String(clear);const seal=node('span','loot-outcome-seal',clear?'✦':'✓');seal.setAttribute('aria-hidden','true');const title=node('div');title.append(node('small','',L('Día ','Day ','第')+s.day+(G.I18n.lang==='zh'?'天':'')+' · '+L('Informe de combate','BATTLE REPORT','战斗结算')),node('h2','',clear?L('Todos derrotados','All enemies defeated','全歼敌人'):L('Supervivencia lograda','Survived successfully','成功生存')));head.append(seal,title,node('span','loot-outcome-meta',fmt(s.elapsed)+'s · '+L('Bajas ','Defeated ','击败 ')+fmt(s.kills)));main.append(head,life(s),earnings(s),specials(s,actions),companion(s,actions));
    const footer=node('footer','loot-footer');footer.append(button(L('Ver equipo','View squad','查看小队')+' · '+(G.Squad.deployed().length+1)+'/'+G.Squad.capacity,actions.onSquad,'btn small'));
    const next=button(s.levels?L('Elegir mejoras','Choose upgrades','选择升级')+' · '+s.levels:L('Siguiente','Next','下一步'),actions.onNext,'btn gold');next.id='journey-loot-next';next.disabled=!!s.bossEmblemChoices&&!s.bossEmblemClaimed;footer.append(next);main.append(footer);
    const meter=node('section','journey-loot-damage');meter.id='journey-damage';side.append(meter);layout.append(main,side);box.append(layout);G.ExpeditionDamage?.render(meter,null,'loot');
  }
  return {render};
})();
