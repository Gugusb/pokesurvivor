/* Run-only training, delayed eggs and material-based companion breakthroughs. */
G.PokemonTraining=(()=>{
  const L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
  const cfg=()=>G.EconomyConfig.pokemonTraining;
  const owned=run=>[run.captain,...G.Squad.roster];
  const unlocked=()=>!!G.CardPacks.normalize(G.DB.save).taken[cfg().permission];
  const eligible=run=>run.phase==='pokemon-training';
  const available=(run,kind)=>eligible(run)&&(!run.labChoice||kind==='breakthrough'&&run.labChoice===kind);
  const xp=run=>Math.ceil(run.captain.xpNext*cfg().experienceBars);
  const sameEgg=(a,b)=>(G.EGG_GROUPS[a.dex]||[15]).some(id=>(G.EGG_GROUPS[b.dex]||[15]).includes(id));
  const sameSkill=(a,b)=>a.moves.some(m=>b.moves.some(n=>n.kind===m.kind));
  function materials(run,target,kind,exclude){
    if(!owned(run).includes(target)||!target.isSquadMember||target.rank>=G.EconomyConfig.compatibility.maxRank)return [];
    return G.Squad.roster.filter(p=>p!==target&&p!==exclude&&p.rank===target.rank&&(kind==='egg'?sameEgg(target,p):sameSkill(target,p)));
  }
  function train(run){if(!available(run,'train')||!G.Game.expeditionGainXp(xp(run)))return false;run.labChoice='train';return true;}
  function incubate(run,parent){
    if(!available(run,'egg')||!owned(run).includes(parent))return false;
    run.eggs||=[];run.eggs.push({id:(run.nextEggId=(run.nextEggId||0)+1),dex:G.MonProgression.rootFor(parent.dex),dueDay:run.day+cfg().eggDays});run.labChoice='egg';return true;
  }
  function breakthrough(run,target,eggMate,skillMate){
    if(!available(run,'breakthrough')||!unlocked()||!materials(run,target,'egg').includes(eggMate)||!materials(run,target,'skill',eggMate).includes(skillMate))return false;
    // Validation finishes before either material is removed. Consumption grants no release income.
    G.Squad.consume(eggMate);G.Squad.consume(skillMate);G.Squad.promote(target,eggMate);run.labChoice='breakthrough';return true;
  }
  function hatch(run){
    let count=0;run.eggs||=[];
    for(const egg of [...run.eggs])if(egg.dueDay<=run.day&&G.Squad.canRecruit(egg.dex)){
      // Bred copies are created outside the shop pool; selling them must not create pool stock.
      if(G.Squad.recruit(egg.dex,null,1,{poolCopies:0})){run.eggs.splice(run.eggs.indexOf(egg),1);count++;}
    }
    return count;
  }
  const node=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text||'';if(cls)e.className=cls;return e;};
  function button(text,fn){const b=node('button',text,'btn');b.type='button';b.onclick=fn;return b;}
  function card(p,fn){
    const b=button('',fn),rank=p.isSquadMember?p.rank:p.trainerRank||1;
    b.classList.add('pokemon-training-card');b.dataset.labUnit=p.isSquadMember?p.squadId:'captain';
    const portrait=G.UI.spriteCanvas(p.spriteDex||p.dex,76,76,{portrait:true,hero:true,lively:false});
    b.append(portrait,node('b',G.T(p.mon.name)),node('small','★'.repeat(rank)+' · '+(G.ExpeditionQuality?.label(p)||'')),G.Expedition.tags(p));
    return b;
  }
  function open(run,done){
    if(run.labDay!==run.day){run.labDay=run.day;run.labChoice=null;}
    const root=document.getElementById('journey-content');let notice='';
    function render(mode,target,eggMate,skillMate){
      root.replaceChildren();root.append(node('h2',L('Sala de entrenamiento Pokémon','Pokémon training room','宝可梦训练室')),node('p',L('Elige entrenamiento o incubación; los ascensos pueden repetirse con materiales.','Choose training or incubation; breakthroughs can repeat while you have materials.','特训与孵蛋各为一次选择；突破可重复，每次消耗两名不同的同星队员。全程免费。'),'note'));
      if(notice)root.append(node('p',notice,'journey-notice'));
      const list=node('div','','pokemon-training-list');root.append(list);
      if(!mode){
        const special=button(L('Entrenamiento especial','Special training','进行特训')+' · +'+xp(run)+' XP',()=>{if(train(run))done();});special.dataset.labAction='train';special.disabled=!available(run,'train');
        const egg=button(L('Incubar un huevo','Incubate an egg','参与孵蛋')+' · '+cfg().eggDays+L(' días',' days',' 天'),()=>render('egg'));egg.dataset.labAction='egg';egg.disabled=!available(run,'egg');
        const up=button(L('Ascenso Pokémon','Pokémon breakthrough','宝可梦突破')+(unlocked()?'':L(' · paquete La larga marcha',' · Long March Pack required',' · 需长征之路卡包权限')),()=>render('breakthrough'));up.dataset.labAction='breakthrough';up.disabled=!unlocked()||!available(run,'breakthrough');list.append(special,egg,up);
      }else if(mode==='egg'){
        root.insertBefore(node('h3',L('Elige un progenitor','Choose a parent','选择亲本（队长或队员）')),list);
        for(const p of owned(run))list.append(card(p,()=>{if(incubate(run,p))done();}));
      }else if(!target){
        root.insertBefore(node('h3',L('Elige el objetivo','Choose a target','选择要突破的队员')),list);
        for(const p of G.Squad.roster.filter(p=>p.rank<G.EconomyConfig.compatibility.maxRank))list.append(card(p,()=>render(mode,p)));
        if(!list.children.length)list.append(node('p',L('No hay objetivos válidos.','No eligible targets.','没有可突破的队员。')));
      }else{
        root.insertBefore(node('h3',G.T(target.mon.name)+' · '+L('Ascenso','Breakthrough','突破')+' ★'+target.rank+' → ★'+(target.rank+1)),list);
        const title=!eggMate?L('Material del mismo grupo huevo','Material sharing an egg group','选择蛋组材料：同星且至少共享一个蛋组'):!skillMate?L('Otro material del mismo oficio','Another material sharing a skill class','选择技能材料：另一名同星且共享技能标签的队员'):L('Se consumirán ambos materiales','Both materials will be consumed','将消耗以下两名材料队员');
        list.append(node('p',title,'pokemon-training-step'));
        if(!eggMate||!skillMate){
          const options=materials(run,target,eggMate?'skill':'egg',eggMate);
          for(const p of options){const b=card(p,()=>render(mode,target,eggMate||p,eggMate?p:null));b.dataset.labMaterial=eggMate?'skill':'egg';list.append(b);}
          if(!options.length)list.append(node('p',L('No hay materiales válidos.','No eligible materials.','没有符合条件的材料。队长不能作为材料，同一队员不能重复选择。')));
        }else{
          list.append(card(eggMate,()=>render(mode,target)),card(skillMate,()=>render(mode,target,eggMate)));
          const apply=button(L('Confirmar ascenso','Perform breakthrough','执行突破'),()=>{if(breakthrough(run,target,eggMate,skillMate)){notice=L('¡Ascenso realizado!','Breakthrough complete!','突破成功！可继续选择队员突破。');render(mode);}else{notice=L('Los materiales han cambiado.','Materials changed.','队员状态已变化，请重新选择。');render(mode);}});apply.dataset.labConfirm='breakthrough';list.append(apply);
        }
      }
      if(mode)root.append(button(L('Volver','Back','返回项目'),()=>render()));
      const leave=button(L('Continuar ruta','Continue route','离开训练室'),done);leave.id='pokemon-training-leave';root.append(leave);G.UI.show('scr-journey');
    }render();
  }
  function eggPanel(run,refresh){
    if(!run.eggs?.length)return null;
    const box=node('section','','journey-eggs');box.append(node('h3',L('Incubación','Incubation','孵蛋进度')));
    for(const egg of run.eggs){const name=G.T(G.DEX_BY[egg.dex].name),left=Math.max(0,egg.dueDay-run.day);box.append(node('p',name+' · '+(left?L('Días restantes: ','Days remaining: ','剩余天数：')+left:L('Listo; esperando espacio','Ready; awaiting space','已孵化，等待队伍空位'))));}
    if(run.eggs.some(egg=>egg.dueDay<=run.day)){const claim=button(L('Recibir crías','Receive hatchlings','领取已孵化伙伴'),()=>{hatch(run);refresh();});claim.id='journey-eggs-claim';box.append(claim);}
    return box;
  }
  return {unlocked,materials,train,incubate,breakthrough,hatch,open,eggPanel};
})();
