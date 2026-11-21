/* JSON-defined expedition traits: family-stable, run-local and simulation-time based. */
G.SquadTraits=(()=>{
 let records=new WeakMap(),battles=new Set(),rests=new Set(),merges=new WeakSet();
 const run=()=>G.Expedition?.run,local=v=>v?.[G.I18n.lang]||v?.en||v;
 const L=(es,en,zh)=>local({es,en,zh});
 const represented=p=>!!p?.isSquadMember&&!!G.Squad?.active&&G.Squad.deployed().includes(p);
 const team=()=>G.Squad?.active?G.Squad.deployed().filter(p=>!p.dead&&p.hp>0):[];
 const def=p=>G.SquadTraitDefs.BY[p?.squadTraitOverride]||G.SquadTraitDefs.forDex(p?.dex);
 function state(p){let s=records.get(p);if(!s)records.set(p,s={casts:0,kills:0,usedRevives:0,reviveWait:null,cache:null});return s;}
 const weight=p=>G.SquadTraitDefs.weight(p),value=p=>G.SquadTraitDefs.value(p);
 function assign(p){const d=def(p);if(d)p.squadTrait=d.id;return d;}
 function activeTags(p,scope='all'){
  if(!G.Squad?.active||!G.Squad.actors().includes(p))return [];
  G.SquadBonds.refresh();const out=[],t=G.Squad.tags(p);
  if(scope!=='skill')for(const id of new Set(t.types))if(G.SquadBonds.count('types',id)>=2)out.push(['types',id]);
  if(scope!=='types')for(const id of new Set(p.moves.map(m=>G.SquadBonds.group(m.kind))))if(G.SquadBonds.state(id).tier>0)out.push(['skill',id]);
  return out;
 }
 const layers=(p,scope='all')=>activeTags(p,scope).reduce((n,[c,id])=>n+G.SquadBonds.layer(c,id),0);
 function adjacent(p){const a=G.Squad.actors(),i=a.indexOf(p);return i<0?[]:a.slice(Math.max(0,i-1),i+2).filter(q=>q!==p&&!q.dead&&q.hp>0);}
 function live(p){
  if(!represented(p))return {all:0,atk:0,defense:0,agility:0};
  const s=state(p),d=def(p),stamp=d.id+':'+p.dex+':'+p.rank+':'+G.SquadBonds.revision;
  if(s.cache?.stamp===stamp)return s.cache;
  const n=value(p)/100,v={stamp,all:0,atk:0,defense:0,agility:0};
  if(d.effect==='indep_bond_type_atk')v.atk=Math.floor(layers(p,'types')/10)*n;
  if(d.effect==='indep_bond_type_def')v.defense=Math.floor(layers(p,'types')/10)*n;
  if(d.effect==='indep_bond_class_stat')v.agility=Math.floor(layers(p,'skill')/10)*n;
  if(d.effect==='indep_legendary_all')v.all=Math.floor(layers(p)/10)*n;
  return s.cache=v;
 }
 function factor(p,key){const v=live(p);return 1+v.all+(['atk','spa'].includes(key)?v.atk:['defense','spdef'].includes(key)?v.defense:['agility','stamina'].includes(key)?v.agility:0);}
 function flat(p,key){if(!G.Squad?.active)return 0;const n=p?.traitPermanent?.[key]||0;if(key==='atk'||key==='spa'){const converted=key==='atk'?p.mon.atk:p.mon.spa??p.mon.atk,raw=p.mon.baseStats?.[key];return raw?n*converted/raw:n;}return n;}
 const crit=p=>flat(p,'crit');
 const visualScale=p=>1+live(p).all;
 function sync(p){
  if(!p?.isSquadMember)return;assign(p);const next=factor(p,'hp'),old=p.traitHpFactor||1;
  if(next!==old){const fraction=p.hp/p.maxHp;p.maxHp=Math.max(1,p.maxHp/old*next);p.hp=p.dead?0:p.maxHp*fraction;p.traitHpFactor=next;}
  const size=visualScale(p);p.r=G.Sprites.bodyRadius(p.spriteDex||p.dex)*size;p.bodyH=G.Sprites.bodyHeight(p.spriteDex||p.dex)*size;
 }
 function heal(p,n){if(!p||p.dead||p.hp<=0)return;const before=p.hp;p.heal(n);if(p.hp>before)G.FX.ring(p.x,p.y,6,p.r+20,'#8bf0be',.3,2);}
 function resource(kind,n){
  const r=run();if(!r)return;
  if(kind==='gold')r.gold+=n;
  else if(kind==='exp'){G.Economy.addXp(r,n);G.Squad.syncTrainer();}
  else if(kind==='mon_xp'){const before=r.captain.level;if(G.Game.expeditionGainXp)G.Game.expeditionGainXp(n);else r.captain.gainXp(n);if(r.phase!=='combat'&&r.captain.level>before)r.traitNeedsUpgrades=true;}
  else if(kind==='free_refresh')r.traitFreeRefresh=(r.traitFreeRefresh||0)+n;
  if(r.phase==='combat'){r.traitBattleRewards||={};r.traitBattleRewards[kind]=(r.traitBattleRewards[kind]||0)+n;}
 }
 function apply(p,d){
  const n=value(p),near=adjacent(p);if(!(n>0))return;
  if(d.effect==='bond_self'||d.effect==='bond_adjacent'){
   const tags=new Map();for(const q of d.effect==='bond_self'?[p]:near)for(const pair of activeTags(q))tags.set(pair.join(':'),pair);
   for(const [category,id]of tags.values())G.SquadBonds.addLayer(category,id,n);
  }else if(d.effect==='bond_max_type'){
   G.SquadBonds.refresh();const ids=Object.keys(G.U.TYPE_NAME).filter(id=>G.SquadBonds.count('types',id)>=2).sort((a,b)=>G.SquadBonds.layer('types',b)-G.SquadBonds.layer('types',a));if(ids.length)G.SquadBonds.addLayer('types',ids[0],n);
  }else if(d.effect==='heal_captain')heal(run()?.captain,run()?.captain.maxHp*n/100);
  else if(['stat_atk_spa','stat_agi_sta','stat_crit'].includes(d.effect)){
   const keys=d.effect==='stat_atk_spa'?['atk','spa']:d.effect==='stat_agi_sta'?['agility','stamina']:['crit'];
   for(const q of near){q.traitPermanent||={};for(const key of keys)q.traitPermanent[key]=(q.traitPermanent[key]||0)+n/(key==='crit'?100:1);}
  }else resource(d.effect,n);
 }
 function trigger(p,event){if(!team().includes(p))return false;const d=assign(p);if(d?.category!=='conditional'||d.event!==event)return false;apply(p,d);return true;}
 function emit(event){for(const p of [...team()])trigger(p,event);for(const p of G.Squad.roster)sync(p);}
 function finishBattle(){const r=run();if(!r||battles.has(r.day))return;battles.add(r.day);emit('battle_end');}
 function restEnd(){const r=run();if(!r||rests.has(r.day))return;rests.add(r.day);emit('rest_end');}
 function buyXp(){emit('buy_xp');}
 function rankUp(p){const s=state(p),rank=p.rank||p.trainerRank||1;s.rankEvents||=new Set();if(s.rankEvents.has(rank))return;s.rankEvents.add(rank);emit('star_up');}
 function merge(a,b){if(!b||merges.has(b))return;merges.add(b);rankUp(a);}
 function cast(p,m){
  if(run()?.phase!=='combat'||!team().includes(p)||!p.moves.some(x=>x===m||x.id===m?.id))return;
  const d=assign(p);if(d.effect==='indep_heal_allies')for(const q of adjacent(p))heal(q,p.maxHp*value(p)/100);
  const s=state(p);if(d.event==='cast_100'&&++s.casts>=100){s.casts-=100;trigger(p,'cast_100');}
 }
 function kill(p){if(run()?.phase!=='combat'||!team().includes(p)||def(p).event!=='kill_30')return;const s=state(p);if(++s.kills>=30){s.kills-=30;trigger(p,'kill_30');}}
 const reviveTotal=p=>represented(p)&&def(p)?.effect==='indep_mythical_revive'?Math.floor(layers(p)/50)*value(p):0;
 function hurt(p){
  if(run()?.phase!=='combat'||!represented(p)||!p.dead||def(p)?.effect!=='indep_mythical_revive')return;const s=state(p);if(s.reviveWait==null&&s.usedRevives<reviveTotal(p)){s.usedRevives++;s.reviveWait=3;}
 }
 function tick(dt){
  if(run()?.phase!=='combat'||!(dt>0))return;
  for(const p of G.Squad.deployed()){const s=state(p);if(s.reviveWait==null)continue;if(!p.dead){s.reviveWait=null;continue;}s.reviveWait=Math.max(0,s.reviveWait-dt);if(s.reviveWait<=1e-9){s.reviveWait=null;p.revive(1);G.SquadAssault?.reset(p);sync(p);}}
 }
 function beginBattle(){for(const p of G.Squad.roster){const s=state(p);s.usedRevives=0;s.reviveWait=null;sync(p);}}
 function reset(){records=new WeakMap();battles=new Set();rests=new Set();merges=new WeakSet();}
 function description(p){
  const d=def(p);if(!d)return '';const n=value(p),lang=G.I18n.lang,zh={
   indep_heal_allies:'触发技能时，恢复编队前后宝可梦生命，数值为自身最大生命的'+n+'%',
   indep_bond_type_atk:'自身每有10层已激活的属性羁绊，物攻及特攻提高'+n+'%',
   indep_bond_type_def:'自身每有10层已激活的属性羁绊，物防及特防提高'+n+'%',
   indep_bond_class_stat:'自身每有10层已激活的职业羁绊，敏捷和耐力提高'+n+'%',
   indep_legendary_all:'自身每有10层已激活的羁绊总数，全属性提高'+n+'%，体型增大'+n+'%',
   indep_mythical_revive:'自身每有50层已激活的羁绊总数，每场获得'+n+'次死亡3秒后满血复活的机会',
   bond_self:'自身已激活羁绊层数+'+n,bond_adjacent:'编队前后宝可梦已激活羁绊层数+'+n,bond_max_type:'层数最多的已激活属性羁绊层数+'+n,
   heal_captain:'恢复队长'+n+'%最大生命',stat_atk_spa:'编队前后宝可梦物攻及特攻永久+'+n,stat_agi_sta:'编队前后宝可梦敏捷和耐力永久+'+n,stat_crit:'编队前后宝可梦暴击率永久+'+n+'%',gold:'获得'+n+'金币',exp:'获得'+n+'点训练家经验',mon_xp:'获得'+n+'点宝可梦经验',free_refresh:'获得'+n+'次商店免费刷新'};
  const en={indep_heal_allies:'On cast, heal the preceding and following allies for '+n+'% of own maximum HP.',indep_bond_type_atk:'For every 10 own active type-bond stacks, physical and special attack +'+n+'%.',indep_bond_type_def:'For every 10 own active type-bond stacks, both defenses +'+n+'%.',indep_bond_class_stat:'For every 10 own active class-bond stacks, agility and stamina +'+n+'%.',indep_legendary_all:'For every 10 own active bond stacks, all eight stats and body size +'+n+'%.',indep_mythical_revive:'For every 50 own active bond stacks, gain '+n+' full-HP revivals per battle, three seconds after defeat.',bond_self:'Own active bonds +'+n+' stacks.',bond_adjacent:'Preceding and following allies’ active bonds +'+n+' stacks.',bond_max_type:'The active type bond with the most stacks gains '+n+'.',heal_captain:'Restore '+n+'% of captain maximum HP.',stat_atk_spa:'Preceding and following allies permanently gain '+n+' physical and special attack.',stat_agi_sta:'Preceding and following allies permanently gain '+n+' agility and stamina.',stat_crit:'Preceding and following allies permanently gain '+n+'% critical chance.',gold:'Gain '+n+' gold.',exp:'Gain '+n+' trainer XP.',mon_xp:'Gain '+n+' Pokémon XP.',free_refresh:'Gain '+n+' free shop refreshes.'};
  const es={indep_heal_allies:'Al lanzar, cura al aliado anterior y posterior por '+n+'% de los PS máximos propios.',indep_bond_type_atk:'Por cada 10 capas propias de tipo activas, ambos ataques +'+n+'%.',indep_bond_type_def:'Por cada 10 capas propias de tipo activas, ambas defensas +'+n+'%.',indep_bond_class_stat:'Por cada 10 capas propias de oficio activas, agilidad y aguante +'+n+'%.',indep_legendary_all:'Por cada 10 capas propias activas, los ocho atributos y tamaño +'+n+'%.',indep_mythical_revive:'Por cada 50 capas propias activas, obtiene '+n+' resurrecciones por combate con PS completos tras tres segundos.',bond_self:'Vínculos propios activos +'+n+' capas.',bond_adjacent:'Vínculos activos de aliados anterior y posterior +'+n+' capas.',bond_max_type:'El vínculo de tipo activo con más capas recibe '+n+'.',heal_captain:'Recupera '+n+'% de los PS máximos del capitán.',stat_atk_spa:'Aliados anterior y posterior ganan permanentemente '+n+' en ambos ataques.',stat_agi_sta:'Aliados anterior y posterior ganan permanentemente '+n+' de agilidad y aguante.',stat_crit:'Aliados anterior y posterior ganan permanentemente '+n+'% de probabilidad crítica.',gold:'Obtiene '+n+' de oro.',exp:'Obtiene '+n+' EXP de entrenador.',mon_xp:'Obtiene '+n+' EXP Pokémon.',free_refresh:'Obtiene '+n+' renovaciones gratuitas de tienda.'};
  let text=({zh,en,es}[lang]||en)[d.effect],event={battle_end:L('Al terminar el combate: ','On battle end: ','战斗结束时，'),rest_end:L('Al terminar el descanso: ','On rest end: ','休息结束时，'),buy_xp:L('Al comprar EXP: ','On buying XP: ','每购买一次经验，'),cast_100:L('Cada 100 lanzamientos propios: ','Every 100 own casts: ','自身每释放100次技能，'),kill_30:L('Cada 30 derrotas propias: ','Every 30 own kills: ','自身每击败30个宝可梦，'),star_up:L('Al ascender un compañero del equipo: ','Whenever a squad companion ranks up: ','队伍宝可梦升星时，')}[d.event];
  if(event)text=event+text;
  if(represented(p)&&d.category==='independent'&&d.effect!=='indep_heal_allies'){
   const key=d.effect==='indep_bond_type_atk'?'atk':d.effect==='indep_bond_type_def'?'defense':d.effect==='indep_bond_class_stat'?'agility':'hp';
   text+=' '+(d.effect==='indep_mythical_revive'?L('Restantes: ','Remaining: ','当前剩余：')+Math.max(0,reviveTotal(p)-state(p).usedRevives):L('Ahora: +','Current: +','当前提升：+')+Number(((factor(p,key)-1)*100).toFixed(2))+'%');
  }
  return text;
 }
 function draw(ctx){if(run()?.phase!=='combat')return;for(const p of G.Squad.deployed()){const s=state(p);if(s.reviveWait==null)continue;ctx.save();ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillStyle='#f6e6ff';ctx.fillText('✦ '+s.reviveWait.toFixed(1)+'s',p.x,p.y-p.bodyH-20);ctx.restore();}}
 function snapshot(actors){return {battles:[...battles],rests:[...rests],states:actors.map(p=>({...state(p),cache:null}))};}
 function restore(saved,actors){records=new WeakMap();battles=new Set(saved?.battles||[]);rests=new Set(saved?.rests||[]);merges=new WeakSet();actors.forEach((p,i)=>records.set(p,{...saved?.states?.[i],cache:null}));}
 const noop=()=>{},neutral=()=>({factor:1,execute:false,contributions:[]});
 return {snapshot,restore,assign,reset,def,state,weight,value,local,activeTags,layers,adjacent,factor,flat,crit,visualScale,sync,trigger,cast,kill,hurt,tick,restEnd,buyXp,finishBattle,rankUp,merge,beginBattle,description,draw,reviveTotal,
  hit:noop,release:noop,visitShop:noop,dayEnd:noop,beforeHit:neutral,cooldown:()=>1,move:(p,m)=>m,absorb:(p,n)=>n,shield:()=>0,price:base=>base,get coinCarry(){return 0;}};
})();
