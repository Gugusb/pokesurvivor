/* One paid choice per training event. No charge until a valid change is applied. */
G.ExpeditionTraining=(()=>{
  const prices=()=>Object.fromEntries(Object.entries(G.EconomyConfig.skillTraining.actions).map(([id,tier])=>[id,G.EconomyConfig.skillTraining.tiers[tier]]));
  const L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
  const names=()=>({up:L('Mejorar movimiento','Strengthen captain move','队长技能强化'),learn:L('Aprender movimiento','Learn captain move','队长新技能学习'),replace:L('Cambiar compañero','Replace companion move','队员技能更换'),specialize:L('Especializar','Skill specialization','技能专精'),link:L('Vincular','Skill link','技能联结'),breakthrough:L('Movimiento definitivo','Skill breakthrough','技能突破'),overclock:L('Sobrecargar movimiento','Skill overclock','技能超限')});
  const unlocked=(kind,run=G.Expedition?.run)=>kind==='overclock'?(run?.cycle>=G.EconomyConfig.endless.unlockCycle):!['specialize','link','breakthrough'].includes(kind)||!!G.CardPacks.normalize(G.DB.save).taken['training:'+kind];
  function choices(kind,run){
    const p=run.captain,label=m=>G.T(m.name)+' · '+(m.evolved?L('Definitivo','Ultimate','超武'):'Lv.'+m.lvl);
    if(kind==='overclock')return p.moves.filter(m=>m.kind!=='buff').map(m=>({title:label(m)+' · '+L('Daño','Damage','技能伤害')+' +'+(G.EconomyConfig.endless.overclockDamagePerPurchase*100)+'%',desc:L('Aumento permanente durante esta expedición.','Permanent for this expedition.','本局持续生效，可重复修炼。'),apply:()=>{m.overclock=(m.overclock||0)+1;return true;}}));
    if(kind==='up')return p.moves.filter(m=>G.Moves.nextUpText(m)).map(m=>({title:label(m),desc:G.T(G.Moves.nextUpText(m)),apply:()=>G.Moves.levelUp(m)}));
    if(kind==='learn')return p.slots.length>=p.maxMoves?[]:G.Moves.poolFor(p.mon).filter(id=>!p.hasMove(id)&&!p.banned?.has(id)).map(id=>({title:G.T(G.Moves.BY_ID[id].name),desc:G.T(G.Moves.BY_ID[id].desc),apply:()=>{if(p.slots.length>=p.maxMoves||p.hasMove(id))return false;p.addMove(id);return true;}}));
    if(kind==='replace')return G.Squad.roster.flatMap(a=>G.Moves.poolFor(a.mon).filter(id=>id!==a.moves[0]?.id).map(id=>({owner:a,title:G.T(a.mon.name)+' → '+G.T(G.Moves.BY_ID[id].name),desc:G.T(G.Moves.BY_ID[id].desc),apply:()=>{if(!G.Squad.roster.includes(a))return false;G.Projectiles.clearOrbs(a);G.Combat.clearFields(a);for(const s of [...G.Projectiles.all()])if(s.owner===a)G.Projectiles.remove(s);a.moves=[];a.slots=[];a.addMove(id);a.active=0;a.moveId=id;G.Squad.rankMove(a);G.Squad.refresh();return true;}})));
    if(kind==='breakthrough')return p.moves.filter(m=>!m.evolved&&m.lvl>=m.def.maxLvl&&G.Moves.EVO[m.id]).map(m=>({title:label(m),desc:G.T(G.Moves.evoInfo(m,{})?.text||m.def.desc),apply:()=>G.Moves.evolve(m)}));
    if(kind==='specialize')return G.Specialization.eligible(p).flatMap(m=>G.Specialization.offers(m).map(id=>({title:label(m)+' · '+G.T(G.Specialization.BY[id].name),desc:G.T(G.Specialization.BY[id].desc),apply:()=>{const previous=p.specTokens;p.specTokens++;const ok=G.Specialization.apply(p,m,id);if(!ok)p.specTokens=previous;return ok;}})));
    if(kind==='link'){
      const b=p.bondOptions();if(!b)return [];
      const pairs=b.group?b.loose.map(m=>[m]):b.loose.flatMap((m,i)=>b.loose.slice(i+1).map(n=>[m,n]));
      return pairs.map(ms=>({title:[...(b.group||[]),...ms].map(label).join(' + '),desc:L('Comparte una ranura.','Share one skill slot.','合并到同一技能槽，技能同时释放。'),apply:()=>{if(!p.bondOptions())return false;const previous=p.bonds;p.bonds++;p.fuse(ms,b.group);p.bonds=previous;return true;}}));
    }
    return [];
  }
  function price(kind,run){return kind==='overclock'?G.Economy.overclockCost(run):prices()[kind];}
  function purchase(kind,choice,run){if(run.phase!=='training'||(kind!=='overclock'&&run.trainingUsed)||!unlocked(kind,run)||run.gold<price(kind,run)||!choice?.apply())return false;run.gold-=price(kind,run);if(kind==='overclock')run.skillOverclockCount++;else run.trainingUsed=true;return true;}
  function open(run,done){
    const root=document.getElementById('journey-content');run.trainingUsed=false;const cached=new Map();
    const node=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text||'';e.className=cls||'';return e;};
    const button=(name,fn)=>{const b=node('button',name,'btn');b.type='button';b.onclick=fn;return b;};
    function render(kind,target){
      root.replaceChildren();root.append(node('h2',L('Dojo de movimientos','Skill training','技能修炼')),node('p',L('Un entrenamiento básico por visita; la sobrecarga puede repetirse desde el cuarto ciclo.','One basic training per visit; overclock can be repeated from cycle four.','基础修炼每次事件可选一项；第4轮起技能超限可重复购买。离开获得训练家经验。'),'note'),node('b',L('Oro','Gold','局内金币')+' '+run.gold));
      const list=node('div','','journey-training');root.append(list);
      if(!kind){for(const [key,name]of Object.entries(names())){const enabled=unlocked(key,run),b=button(name+' · '+price(key,run)+' '+L('oro','gold','金币')+(enabled?'':key==='overclock'?L(' · ciclo 4',' · cycle 4',' · 第4轮解锁'):L(' · bloqueado',' · locked',' · 需长征之路权限卡')),()=>render(key));b.dataset.training=key;b.disabled=!enabled||(key!=='overclock'&&run.trainingUsed)||run.gold<price(key,run);list.append(b);}}
      else if(kind==='replace'&&!target){
        for(const a of G.Squad.roster)list.append(button(G.T(a.mon.name)+' · '+'★'.repeat(a.rank)+' · '+G.T(a.moves[0].name),()=>render(kind,a)));
        if(!G.Squad.roster.length)list.append(node('p',L('No hay compañeros.','No companions recruited.','尚未招募队员。')));
        list.append(button(L('Volver','Back','返回修炼项目'),()=>render()));
      }else{
        if(!cached.has(kind))cached.set(kind,choices(kind,run));const options=cached.get(kind);
        root.insertBefore(node('h3',names()[kind]+' · '+price(kind,run)+' '+L('oro','gold','金币')),list);
        for(const c of options.filter(c=>!target||c.owner===target)){const b=button(c.title,()=>{if(purchase(kind,c,run)){if(kind==='overclock')render(kind);else done();}});b.dataset.trainingChoice=kind;b.append(node('small',c.desc));list.append(b);}
        if(!options.length)list.append(node('p',L('No hay objetivos válidos.','No eligible targets.','当前没有符合条件的目标。')));
        list.append(button(L('Volver','Back','返回修炼项目'),()=>render()));
      }
      root.append(button(L('Continuar ruta','Continue route','离开修炼'),done));G.UI.show('scr-journey');
    }render();
  }
  return {get PRICES(){return prices();},choices,unlocked,price,purchase,open};
})();
