/* One action per visit. Drafts stay fixed while backing out; validate payment/materials first. */
G.ExpeditionTraining=(()=>{
 const L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es,drafts=new WeakMap();
 const names=()=>({up:L('Mejorar capitán','Captain move training','队长技能强化'),learn:L('Aprender movimiento','Learn captain move','队长新技能学习'),replace:L('Cambiar movimiento','Replace companion move','队员技能更换'),specialize:L('Especializar','Skill specialization','技能专精'),link:L('Vincular','Skill link','技能联结'),breakthrough:L('Movimiento definitivo','Skill breakthrough','技能突破'),overclock:L('Sobrecargar','Skill overclock','技能超限')});
 const permitted=(kind,run=G.Expedition?.run)=>(G.LeagueRank?.rules(run).tier??4)>=4||['up','learn'].includes(kind);
 const unlocked=(kind,run=G.Expedition?.run)=>permitted(kind,run)&&(kind==='overclock'?run?.cycle>=G.EconomyConfig.endless.unlockCycle:!['specialize','link','breakthrough'].includes(kind)||!!G.CardPacks.normalize(G.DB.save).taken['training:'+kind]);
 const sketch=run=>G.LeaderAbilities?.definition(run.captain.dex)?.root===235;
 const owned=run=>[run.captain,...G.Squad.roster];
 const valid=(run,p,m)=>owned(run).includes(p)&&p.moves.includes(m);
 const label=m=>G.T(m.name)+' · '+(m.evolved?L('Definitivo','Ultimate','超武'):'Lv.'+m.lvl);
 function draft(run){let d=drafts.get(run);if(!d||d.day!==run.day){d={day:run.day,replacements:new WeakMap(),specs:new WeakMap()};drafts.set(run,d);}return d;}
 function replaceOffers(run,p,rng=Math.random){const d=draft(run),old=p.moves[0];let a=d.replacements.get(p);if(!a||a.source!==old){const pool=G.Moves.poolFor(p.mon).filter(id=>id!==old.id&&!p.banned?.has(id)),ids=[];while(ids.length<(G.LeaderHoenn?.active()&&G.LeaderHoenn.f().choices||3)&&pool.length)ids.push(pool.splice(Math.min(pool.length-1,Math.floor(rng()*pool.length)),1)[0]);a={source:old,ids};d.replacements.set(p,a);}return a.ids;}
 function specOffers(run,m){const d=draft(run);if(!d.specs.has(m))d.specs.set(m,G.Specialization.offers(m));return d.specs.get(m);}
 function replacementSpecs(run,p,id){const d=draft(run);d.sketchSpecs||=new WeakMap();let choices=d.sketchSpecs.get(p);if(!choices)d.sketchSpecs.set(p,choices={});return choices[id]||=(G.Specialization.offers(G.Moves.instance(id,p.moves[0].lvl)));}
 function specializationCost(m){return Math.ceil(5*1.5**G.Specialization.ids(m).length);}
 function materials(run,p,m){if(!valid(run,p,m)||m.evolved||m.lvl<m.def.maxLvl)return [];const type=m.kind==='buff'?'normal':m.type;return G.Squad.roster.filter(q=>q!==p&&q.rank===3&&q.mon.types.includes(type));}
 function replace(run,p,old,id,specId=null){
  if(!p.isSquadMember||!valid(run,p,old)||!replaceOffers(run,p).includes(id))return false;
  const m=G.Moves.instance(id,Math.min(old.lvl,G.Moves.BY_ID[id].maxLvl));
  while(m.lvl<old.lvl){const last=m.def.ups.at(-1);m.def={...m.def,maxLvl:m.def.maxLvl+1,ups:[...m.def.ups,last]};G.Moves.levelUp(m);}
  if(specId&&(!sketch(run)||!G.Specialization.BY[specId]?.allowed(m)||!replacementSpecs(run,p,id).includes(specId)))return false;
  if(old.talentExtraLevels)m.talentExtraLevels=old.talentExtraLevels;if(old.overclock)m.overclock=old.overclock;
  G.Projectiles.clearOrbs(p);G.Combat.clearFields(p);for(const shot of [...G.Projectiles.all()])if(shot.owner===p)G.Projectiles.remove(shot);
  if(sketch(run))m.sketchSpecializationReady=true;
  p.moves=[m];p.slots=[[m]];p.active=0;p.moveId=id;if(specId)G.Specialization.replacementReward(p,m,specId);G.MovePP.restore(p,[m]);G.SquadTraits?.assign(p);G.Squad.refresh();return true;
 }
 function choices(kind,run){
  if(!permitted(kind,run))return [];
  const p=run.captain;
  if(kind==='up')return p.moves.filter(m=>m.lvl<5).map(m=>{const target=m.lvl<3?3:5;return {owner:p,move:m,title:label(m)+' → Lv.'+target,desc:L('Entrena directamente al siguiente hito.','Train straight to the next level milestone.','一次直接提升至下一档技能等级。'),targetLevel:target,apply:()=>{if(!valid(run,p,m)||m.lvl>=target)return false;while(m.lvl<target)G.Moves.levelUp(m);return true;}};});
  if(kind==='learn'){if(p.slots.length>=p.maxMoves)return [];const pool=G.Moves.poolFor(p.mon).filter(id=>!p.hasMove(id)&&!p.banned?.has(id)),d=draft(run);if(sketch(run)&&!d.sketchMove&&pool.length)d.sketchMove=G.U.pick(pool);return pool.map(id=>({owner:p,moveId:id,sketchBonus:sketch(run)&&id===d.sketchMove,title:G.T(G.Moves.BY_ID[id].name)+(sketch(run)&&id===d.sketchMove?' · Lv.5':''),desc:G.T(G.Moves.BY_ID[id].desc),apply:()=>{if(p!==run.captain||p.slots.length>=p.maxMoves||p.hasMove(id)||!p.addMove(id))return false;if(sketch(run)&&id===d.sketchMove){const m=p.moves.find(m=>m.id===id);while(m.lvl<5)G.Moves.levelUp(m);}return true;}}));}
  if(kind==='replace')return G.Squad.roster.flatMap(a=>{const old=a.moves[0];return replaceOffers(run,a).map(id=>({owner:a,move:old,moveId:id,title:G.T(G.Moves.BY_ID[id].name)+' · Lv.'+old.lvl,desc:G.T(G.Moves.BY_ID[id].desc),apply:specId=>replace(run,a,old,id,specId)}));});
  if(kind==='breakthrough')return owned(run).flatMap(a=>a.moves.filter(m=>!m.evolved&&m.lvl>=m.def.maxLvl&&(G.Moves.EVO[m.id]||m.kind==='buff')).map(m=>({owner:a,move:m,title:label(m),desc:m.kind==='buff'?L('Duplica el máximo de acumulaciones.','Double the maximum buff stacks.','突破后最大增益层数翻倍。'):G.T(G.Moves.evoInfo(m,{})?.text||m.def.desc),apply:material=>{if(!materials(run,a,m).includes(material))return false;if(m.kind==='buff'){m.stacks*=2;m.evolved=true;m.squadUltimate=true;}else if(!G.Moves.evolve(m))return false;G.Squad.consume(material);G.MovePP.restore(a,[m]);return true;}})));
  if(kind==='specialize')return owned(run).flatMap(a=>G.Specialization.eligible(a).filter(m=>m.lvl>=5).flatMap(m=>specOffers(run,m).map(id=>({owner:a,move:m,specId:id,title:G.T(G.Specialization.BY[id].name),desc:G.T(G.Specialization.BY[id].desc),apply:()=>{if(!valid(run,a,m)||!G.Specialization.eligible(a).includes(m))return false;const tokens=a.specTokens;a.specTokens++;const ok=G.Specialization.apply(a,m,id);if(!ok)a.specTokens=tokens;return ok;}}))));
  if(kind==='link'){const b=p.bondOptions();if(!b)return [];const pairs=b.group?b.loose.map(m=>[m]):b.loose.flatMap((m,i)=>b.loose.slice(i+1).map(n=>[m,n]));return pairs.map(ms=>({owner:p,move:ms[0],title:[...(b.group||[]),...ms].map(label).join(' + '),desc:L('Comparte una ranura.','Share one skill slot.','合并到同一技能槽，技能同时释放。'),apply:()=>{if(!p.bondOptions()||ms.some(m=>!p.moves.includes(m)))return false;const previous=p.bonds;p.bonds++;p.fuse(ms,b.group);p.bonds=previous;return true;}}));}
  if(kind==='overclock')return p.moves.filter(m=>m.kind!=='buff').map(m=>({owner:p,move:m,title:label(m),desc:L('Daño +','Damage +','技能伤害 +')+G.EconomyConfig.endless.overclockDamagePerPurchase*100+'%',apply:()=>{if(!valid(run,p,m))return false;m.overclock=(m.overclock||0)+1;return true;}}));
  return [];
 }
 function price(kind,run,choice){return kind==='specialize'&&choice?.move?specializationCost(choice.move):0;}
 function purchase(kind,choice,run,material){if(run.phase!=='training'||run.trainingUsed||!Object.hasOwn(names(),kind)||!unlocked(kind,run)||!choice?.apply)return false;const cost=price(kind,run,choice);if(run.gold<cost||!choice.apply(material))return false;run.gold-=cost;if(kind==='overclock')run.skillOverclockCount++;run.trainingUsed=true;G.Squad.refresh();return true;}
 function open(run,done,resuming=false){if(!resuming){run.trainingUsed=false;drafts.delete(run);}G.ExpeditionTrainingUI.open(run,done);}
 function snapshot(run,people){const d=draft(run);return people.map(p=>({sketchMove:d.sketchMove,sketchSpecs:d.sketchSpecs?.get(p),replace:d.replacements.get(p)?.ids,specs:p.moves.map(m=>d.specs.get(m))}));}
 function restore(run,saved,people){drafts.delete(run);const d=draft(run);d.sketchSpecs=new WeakMap();people.forEach((p,i)=>{const a=saved?.[i];if(a?.sketchMove&&G.Moves.BY_ID[a.sketchMove])d.sketchMove=a.sketchMove;if(a?.sketchSpecs)d.sketchSpecs.set(p,a.sketchSpecs);if(a?.replace)d.replacements.set(p,{source:p.moves[0],ids:a.replace});p.moves.forEach((m,j)=>{if(a?.specs?.[j])d.specs.set(m,a.specs[j]);});});}
 return {replacementSpecs,sketch,permitted,snapshot,restore,get PRICES(){return {up:0,learn:0,replace:0,specialize:5,link:0,breakthrough:0,overclock:0};},names,choices,unlocked,price,purchase,open,owned,materials,replaceOffers,specializationCost};
})();
