/* JSON-defined expedition traits: family-stable, run-local, versioned and simulation-time based. */
G.SquadTraits=(()=>{
 let records=new WeakMap(),battles=new Set(),rests=new Set(),shieldDays=new Set(),merges=new WeakSet();
 let tempBuffs=new WeakMap(),traitShields=new WeakMap(),healBudgets=new WeakMap();
 let battleTime=0,e2TeamBattleTotal=0,pendingBattleXp=0,pendingBattleMonXp=0,wageSeq=0,e5CycleGrants=Object.create(null),xpProgress=0,inXpTrigger=false;
 let schemaVersion=G.SquadTraitDefs?.version||'3.0.0';
 const run=()=>G.Expedition?.run,local=v=>v?.[G.I18n.lang]||v?.en||v;
 const L=(es,en,zh)=>local({es,en,zh});
 const enabled=()=>G.LeagueRank?.allows('traits')??true;
 const represented=p=>enabled()&&!!p?.isSquadMember&&!!G.Squad?.active&&G.Squad.deployed().includes(p);
 const inSquad=p=>enabled()&&!!G.Squad?.active&&G.Squad.actors().includes(p);
 const team=()=>enabled()&&G.Squad?.active?G.Squad.deployed().filter(p=>!p.dead&&p.hp>0):[];
 const def=p=>G.SquadTraitDefs.BY[p?.squadTraitOverride]||G.SquadTraitDefs.forDex(p?.dex,schemaVersion);
 function state(p){let s=records.get(p);if(!s)records.set(p,s={casts:0,kills:0,winCount:0,wagePending:null,usedRevives:0,reviveWait:null,cdUntil:0,lastStackAt:-Infinity,e2Triggers:0,e3Triggers:0,cache:null});return s;}
 const weight=p=>G.SquadTraitDefs.weight(p),value=p=>G.SquadTraitDefs.value(p,schemaVersion);
 function assign(p){const d=def(p);if(d)p.squadTrait=d.id;return d;}
 function activeTags(p,scope='all'){
  if(!enabled()||!G.Squad?.active||!G.Squad.actors().includes(p))return [];
  G.SquadBonds.refresh();const out=[],t=G.Squad.tags(p);
  if(scope!=='skill')for(const id of new Set(t.types))if(G.SquadBonds.count('types',id)>=2)out.push(['types',id]);
  if(scope!=='types')for(const id of new Set(p.moves.map(m=>G.SquadBonds.group(m.kind))))if(G.SquadBonds.state(id).tier>0)out.push(['skill',id]);
  return out;
 }
 const layers=(p,scope='all')=>activeTags(p,scope).reduce((n,[c,id])=>n+G.SquadBonds.layer(c,id),0);
 function adjacent(p){const a=G.Squad.actors(),i=a.indexOf(p);return i<0?[]:a.slice(Math.max(0,i-1),i+2).filter(q=>q!==p&&!q.dead&&q.hp>0);}
 function getTempBuff(p,kind){
  if(run()?.phase!=='combat'||!inSquad(p))return 0;
  const b=tempBuffs.get(p)?.[kind];return b&&battleTime<b.until?b.pct:0;
 }
 function setTempBuff(p,kind,pct,duration){
  let map=tempBuffs.get(p);if(!map)tempBuffs.set(p,map={});
  const cur=map[kind],activePct=cur&&battleTime<cur.until?cur.pct:0;
  map[kind]={pct:Math.max(activePct,pct),until:battleTime+duration};
 }
 function live(p){
  if(!represented(p))return {all:0,atk:0,defense:0,agility:0};
  const s=state(p),d=def(p),stamp=schemaVersion+':'+d.id+':'+p.dex+':'+p.rank+':'+G.SquadBonds.revision;
  if(s.cache?.stamp===stamp)return s.cache;
  const n=value(p)/100,v={stamp,all:0,atk:0,defense:0,agility:0};
  if(d.effect==='indep_bond_type_atk')v.atk=Math.floor(layers(p,'types')/10)*n;
  if(d.effect==='indep_bond_type_def')v.defense=Math.floor(layers(p,'types')/10)*n;
  if(d.effect==='indep_bond_class_stat')v.agility=Math.floor(layers(p,'skill')/10)*n;
  if(d.effect==='indep_legendary_all')v.all=Math.floor(layers(p)/10)*n;
  return s.cache=v;
 }
 const LEGENDARY_STATS=new Set(['hp','atk','spa','defense','spdef']);
 function factor(p,key){
  const v=live(p);
  let f=1+(LEGENDARY_STATS.has(key)?v.all:0)+(['atk','spa'].includes(key)?v.atk:['defense','spdef'].includes(key)?v.defense:['agility','stamina'].includes(key)?v.agility:0);
  if(key==='atk'||key==='spa')f*=(1+getTempBuff(p,'atk'));
  else if(key==='defense'||key==='spdef')f*=(1+getTempBuff(p,'def'));
  return f;
 }
 function agilityExtra(p){const pct=getTempBuff(p,'agi');return pct>0?(p.baseAgility||0)*pct:0;}
 function flat(p,key){if(!enabled()||!G.Squad?.active)return 0;const n=p?.traitPermanent?.[key]||0;if(key==='atk'||key==='spa'){const converted=key==='atk'?p.mon.atk:p.mon.spa??p.mon.atk,raw=p.mon.baseStats?.[key];return raw?n*converted/raw:n;}return n;}
 const crit=p=>flat(p,'crit');
 const visualScale=p=>1+live(p).all;
 function shield(p){
  if(run()?.phase!=='combat'||!inSquad(p))return 0;
  const sh=traitShields.get(p);return sh&&battleTime<sh.until&&sh.hp>0?sh.hp:0;
 }
 function grantShield(q,amount,duration=8){
  if(!q||q.dead||!(amount>0)||G.LeaderUnova?.blocksShield?.(q))return 0;
  const leaderSh=q.leaderState?.shield||0,cur=shield(q);
  const room=Math.max(0,q.maxHp*.4-leaderSh-cur),add=Math.min(amount,room);
  if(!(add>0))return 0;
  const prev=traitShields.get(q),until=Math.max(prev&&battleTime<prev.until?prev.until:0,battleTime+duration);
  traitShields.set(q,{hp:cur+add,until});
  return add;
 }
 function absorb(p,n){
  const sh=traitShields.get(p);
  if(!sh||run()?.phase!=='combat'||!inSquad(p)||battleTime>=sh.until||!(sh.hp>0))return n;
  const used=Math.min(n,sh.hp);sh.hp=Math.max(0,sh.hp-used);return n-used;
 }
 function sync(p){
  if(!p?.isSquadMember)return;assign(p);const next=factor(p,'hp'),old=p.traitHpFactor||1;
  if(next!==old){const fraction=p.hp/p.maxHp;p.maxHp=Math.max(1,p.maxHp/old*next);p.hp=p.dead?0:p.maxHp*fraction;p.traitHpFactor=next;}
  const size=visualScale(p);p.r=G.Sprites.bodyRadius(p.spriteDex||p.dex)*size;p.bodyH=G.Sprites.bodyHeight(p.spriteDex||p.dex)*size;
 }
 function heal(p,n){if(!p||p.dead||p.hp<=0)return 0;const before=p.hp;p.heal(n);if(p.hp>before)G.FX.ring(p.x,p.y,6,p.r+20,'#8bf0be',.3,2);return Math.max(0,p.hp-before);}
 function healLimited(q,amount){
  if(!q||q.dead||q.hp<=0||!(amount>0))return 0;
  const cap=q.maxHp*.03;
  if(G.LeaderAbilities?.active?.()&&q.leaderState){
   const ls=q.leaderState,budget=Math.max(0,cap-(ls.healBudget||0)),n=Math.min(amount,budget);
   if(!(n>0))return 0;ls.healBudget=(ls.healBudget||0)+n;return heal(q,n);
  }
  const used=healBudgets.get(q)||0,budget=Math.max(0,cap-used),n=Math.min(amount,budget);
  if(!(n>0))return 0;healBudgets.set(q,used+n);return heal(q,n);
 }
 function resource(kind,n){
  const r=run();if(!r||!(n>0))return;
  if(kind==='gold')r.gold+=n;
  else if(kind==='exp'){G.Economy.addXp(r,n);G.Squad.syncTrainer();}
  else if(kind==='mon_xp'){const before=r.captain.level;if(G.Game.expeditionGainXp)G.Game.expeditionGainXp(n);else r.captain.gainXp(n);if(r.phase!=='combat'&&r.captain.level>before)r.traitNeedsUpgrades=true;}
  else if(kind==='free_refresh')r.traitFreeRefresh=(r.traitFreeRefresh||0)+n;
  if(r.phase==='combat'){r.traitBattleRewards||={};r.traitBattleRewards[kind]=(r.traitBattleRewards[kind]||0)+n;}
 }
 function topActiveType(){
  G.SquadBonds.refresh();let best=null,bestL=-1;
  for(const id of Object.keys(G.U.TYPE_NAME)){
   if(G.SquadBonds.count('types',id)<2)continue;
   const l=G.SquadBonds.layer('types',id);if(l>bestL){bestL=l;best=id;}
  }
  return best;
 }
 function apply(p,d){
  const n=value(p),near=adjacent(p);if(!(n>0))return;
  if(d.effect==='bond_self'||d.effect==='bond_adjacent'){
   const tags=new Map();for(const q of d.effect==='bond_self'?[p]:near)for(const pair of activeTags(q))tags.set(pair.join(':'),pair);
   for(const [category,id]of tags.values())G.SquadBonds.addLayer(category,id,n);
  }else if(d.effect==='bond_max_type'){
   const best=topActiveType();if(best)G.SquadBonds.addLayer('types',best,n);
  }else if(d.effect==='heal_captain')heal(run()?.captain,run()?.captain.maxHp*n/100);
  else if(['stat_atk_spa','stat_agi_sta','stat_crit'].includes(d.effect)){
   const keys=d.effect==='stat_atk_spa'?['atk','spa']:d.effect==='stat_agi_sta'?['agility','stamina']:['crit'];
   for(const q of near){q.traitPermanent||={};for(const key of keys)q.traitPermanent[key]=(q.traitPermanent[key]||0)+n/(key==='crit'?100:1);}
  }else if(d.effect==='v3_xp_jar'){
   const r=run();if(!r)return;
   const added=G.ExpeditionSupplies?G.ExpeditionSupplies.deposit(r,n):(r.xpJar=Math.min(1000,(r.xpJar||0)+n),n);
   r.xpJarStored=(r.xpJarStored||0)+added;
  }else resource(d.effect,n);
 }
 function trigger(p,event){if(!team().includes(p))return false;const d=assign(p);if(d?.category!=='conditional'||d.event!==event)return false;apply(p,d);return true;}
 function emit(event){for(const p of [...team()])trigger(p,event);for(const p of G.Squad.roster)sync(p);}
 function pendingWageCount(){return (G.Squad?.roster||[]).reduce((n,p)=>n+(state(p).wagePending?.amount||0),0);}
 function finishBattle(){
  const r=run();if(!r||battles.has(r.day))return;battles.add(r.day);
  emit('battle_end');
  if(pendingBattleXp>0){resource('exp',pendingBattleXp);pendingBattleXp=0;}
  if(pendingBattleMonXp>0){resource('mon_xp',pendingBattleMonXp);pendingBattleMonXp=0;}
  const cycle=G.ExpeditionRules?.cycleOf?.(r.day)||r.cycle||1;
  for(const p of [...team()]){
   const d=assign(p),s=state(p);
   if(d?.effect==='v3_wage_gold'){
    s.winCount=(s.winCount||0)+1;
    if(s.winCount>=2){
     if(!s.wagePending){s.winCount-=2;s.wagePending={amount:value(p),qualifiedAt:++wageSeq};}
     else s.winCount=1;
    }
   }else if(d?.effect==='v3_free_refresh'){
    s.winCount=(s.winCount||0)+1;
    if(s.winCount>=3){
     if((e5CycleGrants[cycle]||0)>=2)s.winCount=2;
     else{s.winCount-=3;e5CycleGrants[cycle]=(e5CycleGrants[cycle]||0)+1;resource('free_refresh',value(p));}
    }
   }
  }
  const order=G.Squad.actors(),queued=G.Squad.roster.filter(p=>state(p).wagePending?.amount>0).sort((a,b)=>{
   const sa=state(a).wagePending,sb=state(b).wagePending;
   return (sa.qualifiedAt-sb.qualifiedAt)||(order.indexOf(a)-order.indexOf(b));
  });
  if(queued.length){const winner=queued[0],w=state(winner).wagePending;state(winner).wagePending=null;resource('gold',w.amount);}
  r.traitPendingWage=pendingWageCount();
  for(const p of G.Squad.roster)sync(p);
 }
 function restEnd(){const r=run();if(!r||rests.has(r.day))return;rests.add(r.day);emit('rest_end');}
 function buyXp(){emit('buy_xp');}
 function trainerXpGained(amount){
  if(inXpTrigger||!enabled()||!G.Squad?.active||!(amount>0)||!Number.isFinite(amount))return;
  inXpTrigger=true;
  try{xpProgress+=amount;while(xpProgress>=3-1e-9){xpProgress=Math.max(0,xpProgress-3);emit('xp_gain_3');}}
  finally{inXpTrigger=false;}
 }
 function rankUp(p){const s=state(p),rank=p.rank||p.trainerRank||1;s.rankEvents||=new Set();if(s.rankEvents.has(rank))return;s.rankEvents.add(rank);emit('star_up');}
 function merge(a,b){if(!b||merges.has(b))return;merges.add(b);rankUp(a);}
 const isNormalCast=(p,m)=>!!m&&!m.extraCast&&!m.leaderGenerated&&!m.zMove&&!m.typeBondSecondary&&!!p?.moves?.some(x=>x===m||x.id===m.id);
 const canStack=s=>battleTime-(s.lastStackAt??-Infinity)>=1-1e-9;
 function cast(p,m){
  if(run()?.phase!=='combat'||!isNormalCast(p,m))return;
  const tb=tempBuffs.get(p);if(tb?.agi)tb.agi=null;
  if(!team().includes(p))return;
  const d=assign(p);if(!d)return;
  if(d.effect==='indep_heal_allies')for(const q of adjacent(p))heal(q,p.maxHp*value(p)/100);
  const s=state(p);
  if(d.event==='cast_100'){if(++s.casts>=100){s.casts-=100;trigger(p,'cast_100');}return;}
  if(d.effect==='v3_trainer_xp'){
   if(++s.casts>=80){
    if((s.e2Triggers||0)>=1||e2TeamBattleTotal>=2){s.casts=79;return;}
    const amt=Math.min(value(p),2-e2TeamBattleTotal);
    s.casts-=80;s.e2Triggers=(s.e2Triggers||0)+1;e2TeamBattleTotal+=amt;pendingBattleXp+=amt;
   }
  }else if(d.effect==='v3_stack_own_class'){
   if(++s.casts>=20){
    const cls=G.SquadBonds.group(m.kind);G.SquadBonds.refresh();
    if(!canStack(s)||!cls||G.SquadBonds.state(cls).tier<=0){s.casts=19;return;}
    s.casts-=20;s.lastStackAt=battleTime;G.SquadBonds.addLayer('skill',cls,value(p));
   }
  }else if(d.effect==='v3_stack_own_type1'){
   if(++s.casts>=25){
    const t1=p.mon?.types?.[0];G.SquadBonds.refresh();
    if(!canStack(s)||!t1||G.SquadBonds.count('types',t1)<2){s.casts=24;return;}
    s.casts-=25;s.lastStackAt=battleTime;G.SquadBonds.addLayer('types',t1,value(p));
   }
  }else if(d.effect==='v3_stack_adj'){
   if(++s.casts>=30){
    const tags=new Map();for(const q of adjacent(p))for(const pair of activeTags(q))tags.set(pair.join(':'),pair);
    if(!canStack(s)||!tags.size){s.casts=29;return;}
    s.casts-=30;s.lastStackAt=battleTime;const n=value(p);for(const [c,id]of tags.values())G.SquadBonds.addLayer(c,id,n);
   }
  }else if(d.effect==='v3_buff_adj_atk'){
   if(++s.casts>=20){
    const near=adjacent(p);if(battleTime<(s.cdUntil||0)||!near.length){s.casts=19;return;}
    const pct=Math.min(15,value(p))/100;for(const q of near)setTempBuff(q,'atk',pct,8);
    s.casts-=20;s.cdUntil=battleTime+12;
   }
  }else if(d.effect==='v3_buff_adj_agi'){
   if(++s.casts>=20){
    const near=adjacent(p);if(battleTime<(s.cdUntil||0)||!near.length){s.casts=19;return;}
    const pct=Math.min(18,value(p))/100;for(const q of near)setTempBuff(q,'agi',pct,6);
    s.casts-=20;s.cdUntil=battleTime+12;
   }
  }else if(d.effect==='v3_buff_adj_def'){
   if(++s.casts>=25){
    const near=adjacent(p);if(battleTime<(s.cdUntil||0)||!near.length){s.casts=24;return;}
    const pct=Math.min(20,value(p))/100;for(const q of near)setTempBuff(q,'def',pct,8);
    s.casts-=25;s.cdUntil=battleTime+12;
   }
  }else if(d.effect==='v3_buff_adj_heal'){
   if(++s.casts>=6){
    const near=adjacent(p).filter(q=>q.hp<q.maxHp-1e-6);if(!near.length){s.casts=5;return;}
    let best=near[0],bestRatio=best.hp/best.maxHp;
    for(let i=1;i<near.length;i++){const ratio=near[i].hp/near[i].maxHp;if(ratio<bestRatio){best=near[i];bestRatio=ratio;}}
    const raw=Math.min(p.maxHp*value(p)/100,best.maxHp*.03);
    if(healLimited(best,raw)<=0){s.casts=5;return;}
    s.casts-=6;
   }
  }else if(d.effect==='v3_buff_adj_pp'){
   if(++s.casts>=25){
    if(battleTime<(s.cdUntil||0)||!G.MovePP){s.casts=24;return;}
    let best=null,bestRatio=Infinity;
    for(const q of adjacent(p)){
     const move=q.activeMove?.()||q.moves?.[0];if(!move)continue;
     const st=G.MovePP.state(q,move);if(!st||st.current>=st.max-1e-6)continue;
     const ratio=Math.min(st.current,st.max)/st.max;
     if(ratio<bestRatio){bestRatio=ratio;best={q,st};}
    }
    if(!best){s.casts=24;return;}
    best.st.current=Math.min(best.st.max,best.st.current+Math.min(value(p),best.st.max-best.st.current));
    s.casts-=25;s.cdUntil=battleTime+10;
   }
  }
 }
 function kill(p){
  if(run()?.phase!=='combat'||!team().includes(p))return;
  const d=assign(p);if(!d)return;const s=state(p);
  if(d.event==='kill_30'&&d.effect!=='v3_stack_max_type'){if(++s.kills>=30){s.kills-=30;trigger(p,'kill_30');}return;}
  if(d.effect==='v3_mon_xp'){
   if(++s.kills>=20){
    if((s.e3Triggers||0)>=2){s.kills=19;return;}
    s.kills-=20;s.e3Triggers=(s.e3Triggers||0)+1;pendingBattleMonXp+=value(p);
   }
  }else if(d.effect==='v3_stack_main_class'){
   if(++s.kills>=15){
    const mainMove=p.activeMove?.()||p.moves?.[0],cls=G.SquadBonds.group(mainMove?.kind);G.SquadBonds.refresh();
    if(!canStack(s)||!cls||G.SquadBonds.state(cls).tier<=0){s.kills=14;return;}
    s.kills-=15;s.lastStackAt=battleTime;G.SquadBonds.addLayer('skill',cls,value(p));
   }
  }else if(d.effect==='v3_stack_max_type'){
   if(++s.kills>=30){
    const best=topActiveType();
    if(!canStack(s)||!best){s.kills=29;return;}
    s.kills-=30;s.lastStackAt=battleTime;G.SquadBonds.addLayer('types',best,value(p));
   }
  }
 }
 const reviveTotal=p=>represented(p)&&def(p)?.effect==='indep_mythical_revive'?Math.floor(layers(p)/50)*value(p):0;
 function hurt(p){
  if(run()?.phase!=='combat'||!represented(p)||!p.dead||def(p)?.effect!=='indep_mythical_revive')return;const s=state(p);if(s.reviveWait==null&&s.usedRevives<reviveTotal(p)){s.usedRevives++;s.reviveWait=3;}
 }
 function tick(dt){
  if(!enabled()||run()?.phase!=='combat'||!(dt>0))return;
  battleTime+=dt;
  if(!G.LeaderAbilities?.active?.()){
   for(const a of G.Squad.actors()){const used=healBudgets.get(a);if(used>0)healBudgets.set(a,Math.max(0,used-a.maxHp*.03*dt));}
  }
  for(const p of G.Squad.deployed()){const s=state(p);if(s.reviveWait==null)continue;if(!p.dead){s.reviveWait=null;continue;}s.reviveWait=Math.max(0,s.reviveWait-dt);if(s.reviveWait<=1e-9){s.reviveWait=null;p.revive(1);G.SquadAssault?.reset(p);sync(p);}}
 }
 function beginBattle(){
  battleTime=0;tempBuffs=new WeakMap();traitShields=new WeakMap();healBudgets=new WeakMap();
  e2TeamBattleTotal=0;pendingBattleXp=0;pendingBattleMonXp=0;
  for(const p of G.Squad.roster){const s=state(p);s.usedRevives=0;s.reviveWait=null;s.cdUntil=0;s.lastStackAt=-Infinity;s.e2Triggers=0;s.e3Triggers=0;sync(p);}
  const r=run();
  if(r&&!shieldDays.has(r.day)){
   shieldDays.add(r.day);
   for(const p of team()){
    const d=assign(p);if(d?.effect!=='v3_buff_adj_shield')continue;
    const pct=value(p)/100;
    for(const q of adjacent(p))grantShield(q,q.maxHp*pct,8);
   }
  }
 }
 function reset(){
  records=new WeakMap();battles=new Set();rests=new Set();shieldDays=new Set();merges=new WeakSet();
  tempBuffs=new WeakMap();traitShields=new WeakMap();healBudgets=new WeakMap();
  battleTime=0;e2TeamBattleTotal=0;pendingBattleXp=0;pendingBattleMonXp=0;wageSeq=0;e5CycleGrants=Object.create(null);xpProgress=0;inXpTrigger=false;
  schemaVersion=G.SquadTraitDefs?.version||'3.0.0';
 }
 function description(p){
  if(!enabled())return '';const d=def(p);if(!d)return '';const n=value(p),lang=G.I18n.lang,zh={
   indep_heal_allies:'触发技能时，恢复编队前后宝可梦生命，数值为自身最大生命的'+n+'%',
   indep_bond_type_atk:'自身每有10层已激活的属性羁绊，物攻及特攻提高'+n+'%',
   indep_bond_type_def:'自身每有10层已激活的属性羁绊，物防及特防提高'+n+'%',
   indep_bond_class_stat:'自身每有10层已激活的职业羁绊，敏捷和耐力提高'+n+'%',
   indep_legendary_all:'自身每有10层已激活的羁绊总数，双攻、双防及生命提高'+n+'%，体型增大'+n+'%',
   indep_mythical_revive:'自身每有50层已激活的羁绊总数，每场获得'+n+'次死亡3秒后满血复活的机会',
   bond_self:'自身已激活羁绊层数+'+n,bond_adjacent:'编队前后宝可梦已激活羁绊层数+'+n,bond_max_type:'层数最多的已激活属性羁绊层数+'+n,
   heal_captain:'恢复队长'+n+'%最大生命',stat_atk_spa:'编队前后宝可梦物攻及特攻永久+'+n,stat_agi_sta:'编队前后宝可梦敏捷和耐力永久+'+n,stat_crit:'编队前后宝可梦暴击率永久+'+n+'%',gold:'获得'+n+'金币',exp:'获得'+n+'点训练家经验',mon_xp:'获得'+n+'点宝可梦经验',free_refresh:'获得'+n+'次商店免费刷新',
   v3_wage_gold:'上阵存活累计完成2场成功战斗，战后获得'+n+'金币（本类全队每场最多发放1金币，未轮到顺延）',
   v3_trainer_xp:'自身每释放80次普通技能，战后获得'+n+'点训练家经验（每名每场最多1次，本类全队每场最多2点）',
   v3_mon_xp:'自身每击败20名敌人，战后获得'+n+'点宝可梦经验（每名每场最多2次）',
   v3_xp_jar:'休息事件结束时，为经验罐填充'+n+'点经验',
   v3_free_refresh:'上阵存活累计完成3场成功战斗，获得'+n+'次商店免费刷新（本类全队每周期最多2次，不含流浪商人）',
   v3_stack_own_class:'自身每释放20次普通技能，触发招式对应的自身已激活职业羁绊层数+'+n,
   v3_stack_own_type1:'自身每释放25次普通技能，自身已激活的首属性羁绊层数+'+n,
   v3_stack_adj:'自身每释放30次普通技能，编队前后存活伙伴已激活属性及职业羁绊层数+'+n,
   v3_stack_main_class:'自身每击败15名敌人，主技能对应的自身已激活职业羁绊层数+'+n,
   v3_stack_max_type:'自身每击败30名敌人，全队层数最高的已激活属性羁绊层数+'+n,
   v3_buff_adj_atk:'自身每释放20次普通技能，使编队前后存活伙伴双攻提高'+n+'%，持续8秒（冷却12秒）',
   v3_buff_adj_agi:'自身每释放20次普通技能，使编队前后存活伙伴下一次普通招式基础敏捷提高'+n+'%（最多保存6秒，冷却12秒）',
   v3_buff_adj_def:'自身每释放25次普通技能，使编队前后存活伙伴双防提高'+n+'%，持续8秒（冷却12秒）',
   v3_buff_adj_heal:'自身每释放6次普通技能，治疗编队前后生命比例较低的一名存活伙伴，恢复自身最大生命的'+n+'%（单次不超过受疗者3%）',
   v3_buff_adj_shield:'每场开战时，为编队前后各一位伙伴提供目标最大生命'+n+'%的护盾，持续8秒',
   v3_buff_adj_pp:'自身每释放25次普通技能，为编队前后普通PP比例较低的一名伙伴主技能恢复'+n+'点PP（冷却10秒）'};
  const en={indep_heal_allies:'On cast, heal the preceding and following allies for '+n+'% of own maximum HP.',indep_bond_type_atk:'For every 10 own active type-bond stacks, physical and special attack +'+n+'%.',indep_bond_type_def:'For every 10 own active type-bond stacks, both defenses +'+n+'%.',indep_bond_class_stat:'For every 10 own active class-bond stacks, agility and stamina +'+n+'%.',indep_legendary_all:'For every 10 own active bond stacks, Attack, Sp. Atk, Defense, Sp. Def, HP, and body size +'+n+'%.',indep_mythical_revive:'For every 50 own active bond stacks, gain '+n+' full-HP revivals per battle, three seconds after defeat.',bond_self:'Own active bonds +'+n+' stacks.',bond_adjacent:'Preceding and following allies’ active bonds +'+n+' stacks.',bond_max_type:'The active type bond with the most stacks gains '+n+'.',heal_captain:'Restore '+n+'% of captain maximum HP.',stat_atk_spa:'Preceding and following allies permanently gain '+n+' physical and special attack.',stat_agi_sta:'Preceding and following allies permanently gain '+n+' agility and stamina.',stat_crit:'Preceding and following allies permanently gain '+n+'% critical chance.',gold:'Gain '+n+' gold.',exp:'Gain '+n+' trainer XP.',mon_xp:'Gain '+n+' Pokémon XP.',free_refresh:'Gain '+n+' free shop refreshes.',
   v3_wage_gold:'After surviving 2 victorious battles deployed, gain '+n+' gold after battle (team cap 1G per battle for this group; queued payouts carry over).',
   v3_trainer_xp:'Every 80 own normal casts, gain '+n+' trainer XP after battle (max 1 per member and 2 team-wide per battle).',
   v3_mon_xp:'Every 20 own defeats, gain '+n+' Pokémon XP after battle (max 2 per battle).',
   v3_xp_jar:'On rest end, fill the XP jar with '+n+' XP.',
   v3_free_refresh:'After surviving 3 victorious battles deployed, gain '+n+' free shop refresh (team cap 2 per cycle; excludes wandering peddler).',
   v3_stack_own_class:'Every 20 own normal casts, gain +'+n+' stacks for the triggering move’s active class bond.',
   v3_stack_own_type1:'Every 25 own normal casts, gain +'+n+' stacks for own active primary type bond.',
   v3_stack_adj:'Every 30 own normal casts, preceding and following living allies’ active type and class bonds gain +'+n+' stacks.',
   v3_stack_main_class:'Every 15 own defeats, gain +'+n+' stacks for own primary move’s active class bond.',
   v3_stack_max_type:'Every 30 own defeats, the team’s highest-stack active type bond gains +'+n+' stacks.',
   v3_buff_adj_atk:'Every 20 own normal casts, boost preceding and following living allies’ Attack and Sp. Atk by '+n+'% for 8s (12s cooldown).',
   v3_buff_adj_agi:'Every 20 own normal casts, boost preceding and following living allies’ base Agility by '+n+'% for their next normal move (up to 6s, 12s cooldown).',
   v3_buff_adj_def:'Every 25 own normal casts, boost preceding and following living allies’ Defense and Sp. Def by '+n+'% for 8s (12s cooldown).',
   v3_buff_adj_heal:'Every 6 own normal casts, heal the lower-HP-ratio adjacent living ally for '+n+'% of own max HP (capped at 3% of recipient max HP).',
   v3_buff_adj_shield:'At battle start, grant preceding and following allies a white shield equal to '+n+'% of their max HP for 8s.',
   v3_buff_adj_pp:'Every 25 own normal casts, restore '+n+' PP to the primary move of the adjacent ally with the lowest ordinary PP ratio (10s cooldown).'};
  const es={indep_heal_allies:'Al lanzar, cura al aliado anterior y posterior por '+n+'% de los PS máximos propios.',indep_bond_type_atk:'Por cada 10 capas propias de tipo activas, ambos ataques +'+n+'%.',indep_bond_type_def:'Por cada 10 capas propias de tipo activas, ambas defensas +'+n+'%.',indep_bond_class_stat:'Por cada 10 capas propias de oficio activas, agilidad y aguante +'+n+'%.',indep_legendary_all:'Por cada 10 capas propias activas, ambos ataques, ambas defensas, PS y tamaño +'+n+'%.',indep_mythical_revive:'Por cada 50 capas propias activas, obtiene '+n+' resurrecciones por combate con PS completos tras tres segundos.',bond_self:'Vínculos propios activos +'+n+' capas.',bond_adjacent:'Vínculos activos de aliados anterior y posterior +'+n+' capas.',bond_max_type:'El vínculo de tipo activo con más capas recibe '+n+'.',heal_captain:'Recupera '+n+'% de los PS máximos del capitán.',stat_atk_spa:'Aliados anterior y posterior ganan permanentemente '+n+' en ambos ataques.',stat_agi_sta:'Aliados anterior y posterior ganan permanentemente '+n+' de agilidad y aguante.',stat_crit:'Aliados anterior y posterior ganan permanentemente '+n+'% de probabilidad crítica.',gold:'Obtiene '+n+' de oro.',exp:'Obtiene '+n+' EXP de entrenador.',mon_xp:'Obtiene '+n+' EXP Pokémon.',free_refresh:'Obtiene '+n+' renovaciones gratuitas de tienda.',
   v3_wage_gold:'Tras sobrevivir a 2 combates ganados en formación, otorga '+n+' de oro al acabar (máx. 1G por combate en equipo; los pendientes se aplazan).',
   v3_trainer_xp:'Cada 80 lanzamientos normales propios, otorga '+n+' EXP de entrenador al acabar (máx. 1 por miembro y 2 en equipo por combate).',
   v3_mon_xp:'Cada 20 derrotas propias, otorga '+n+' EXP Pokémon al acabar (máx. 2 por combate).',
   v3_xp_jar:'Al terminar un descanso, llena la reserva de EXP con '+n+' puntos.',
   v3_free_refresh:'Tras sobrevivir a 3 combates ganados en formación, otorga '+n+' renovación gratuita de tienda (máx. 2 por ciclo; excluye al mercader).',
   v3_stack_own_class:'Cada 20 lanzamientos normales propios, suma +'+n+' capas al vínculo de oficio activo del movimiento usado.',
   v3_stack_own_type1:'Cada 25 lanzamientos normales propios, suma +'+n+' capas al vínculo activo del primer tipo propio.',
   v3_stack_adj:'Cada 30 lanzamientos normales propios, suma +'+n+' capas a los vínculos activos de tipo y oficio de los aliados adyacentes vivos.',
   v3_stack_main_class:'Cada 15 derrotas propias, suma +'+n+' capas al vínculo de oficio activo de su movimiento principal.',
   v3_stack_max_type:'Cada 30 derrotas propias, suma +'+n+' capas al vínculo de tipo activo con más capas del equipo.',
   v3_buff_adj_atk:'Cada 20 lanzamientos normales propios, aumenta ambos ataques de aliados adyacentes vivos en '+n+'% durante 8 s (enfriamiento 12 s).',
   v3_buff_adj_agi:'Cada 20 lanzamientos normales propios, aumenta la agilidad base del siguiente movimiento normal de aliados adyacentes vivos en '+n+'% (hasta 6 s, enfriamiento 12 s).',
   v3_buff_adj_def:'Cada 25 lanzamientos normales propios, aumenta ambas defensas de aliados adyacentes vivos en '+n+'% durante 8 s (enfriamiento 12 s).',
   v3_buff_adj_heal:'Cada 6 lanzamientos normales propios, cura al aliado adyacente vivo con menor proporción de PS por '+n+'% de los PS máximos propios (tope 3% del receptor).',
   v3_buff_adj_shield:'Al iniciar el combate, otorga a cada aliado adyacente un escudo blanco del '+n+'% de sus PS máximos durante 8 s.',
   v3_buff_adj_pp:'Cada 25 lanzamientos normales propios, restaura '+n+' PP al movimiento principal del aliado adyacente con menor proporción de PP normal (enfriamiento 10 s).'};
  const isV3=String(d.effect||'').startsWith('v3_');
  let text=({zh,en,es}[lang]||en)[d.effect]||'';
  if(!isV3){
   const event={battle_end:L('Al terminar el combate: ','On battle end: ','战斗结束时，'),rest_end:L('Al terminar el descanso: ','On rest end: ','休息结束时，'),buy_xp:L('Al comprar EXP: ','On buying XP: ','每购买一次经验，'),xp_gain_3:L('Cada 3 EXP de entrenador obtenida: ','Every 3 trainer XP gained: ','每获得3点训练家经验，'),cast_100:L('Cada 100 lanzamientos propios: ','Every 100 own casts: ','自身每释放100次技能，'),kill_30:L('Cada 30 derrotas propias: ','Every 30 own kills: ','自身每击败30个宝可梦，'),star_up:L('Al ascender un compañero del equipo: ','Whenever a squad companion ranks up: ','队伍宝可梦升星时，')}[d.event];
   if(event)text=event+text;
  }
  if(represented(p)&&d.category==='independent'&&d.effect!=='indep_heal_allies'){
   const key=d.effect==='indep_bond_type_atk'?'atk':d.effect==='indep_bond_type_def'?'defense':d.effect==='indep_bond_class_stat'?'agility':'hp';
   text+=' '+(d.effect==='indep_mythical_revive'?L('Restantes: ','Remaining: ','当前剩余：')+Math.max(0,reviveTotal(p)-state(p).usedRevives):L('Ahora: +','Current: +','当前提升：+')+Number(((factor(p,key)-1)*100).toFixed(2))+'%');
  }else if(represented(p)&&d.effect==='v3_wage_gold'){
   const s=state(p);
   if(s.wagePending?.amount)text+=' '+L('Pendiente: ','Pending: ','待发放：')+s.wagePending.amount+'G';
   else if(s.winCount>0)text+=' '+L('Progreso: ','Progress: ','当前进度：')+s.winCount+'/2';
  }
  return text;
 }
 function draw(ctx){
  if(!enabled()||run()?.phase!=='combat')return;
  for(const p of G.Squad.actors()){
   const sh=shield(p);
   if(sh>0){ctx.save();ctx.strokeStyle='#b6e9ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-p.bodyH*.4,p.r+7,p.bodyH*.58+6,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
  for(const p of G.Squad.deployed()){const s=state(p);if(s.reviveWait==null)continue;ctx.save();ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillStyle='#f6e6ff';ctx.fillText('✦ '+s.reviveWait.toFixed(1)+'s',p.x,p.y-p.bodyH-20);ctx.restore();}
 }
 function snapshot(actors){
  return {schemaVersion,battles:[...battles],rests:[...rests],shieldDays:[...shieldDays],wageSeq,e5CycleGrants:{...e5CycleGrants},xpProgress,
   states:actors.map(p=>{const s=state(p);return {casts:s.casts||0,kills:s.kills||0,winCount:s.winCount||0,wagePending:s.wagePending?{...s.wagePending}:null,usedRevives:0,reviveWait:null,rankEvents:s.rankEvents?[...s.rankEvents]:[],cache:null};})};
 }
 function restore(saved,actors){
  records=new WeakMap();tempBuffs=new WeakMap();traitShields=new WeakMap();healBudgets=new WeakMap();
  battles=new Set(saved?.battles||[]);rests=new Set(saved?.rests||[]);shieldDays=new Set(saved?.shieldDays||[]);merges=new WeakSet();
  wageSeq=saved?.wageSeq||0;e5CycleGrants={...(saved?.e5CycleGrants||{})};xpProgress=saved?.xpProgress||0;inXpTrigger=false;
  battleTime=0;e2TeamBattleTotal=0;pendingBattleXp=0;pendingBattleMonXp=0;
  schemaVersion=saved?(saved.schemaVersion||'2.0.0'):(G.SquadTraitDefs?.version||'3.0.0');
  actors.forEach((p,i)=>{const st=saved?.states?.[i];records.set(p,{casts:st?.casts||0,kills:st?.kills||0,winCount:st?.winCount||0,wagePending:st?.wagePending?{...st.wagePending}:null,usedRevives:0,reviveWait:null,cdUntil:0,lastStackAt:-Infinity,e2Triggers:0,e3Triggers:0,rankEvents:new Set(st?.rankEvents||[]),cache:null});});
 }
 const noop=()=>{},neutral=()=>({factor:1,execute:false,contributions:[]});
 return {snapshot,restore,assign,reset,def,state,weight,value,local,activeTags,layers,adjacent,factor,agilityExtra,flat,crit,visualScale,sync,trigger,cast,kill,hurt,tick,restEnd,buyXp,trainerXpGained,finishBattle,rankUp,merge,beginBattle,description,draw,reviveTotal,absorb,shield,pendingWageCount,get schemaVersion(){return schemaVersion;},get xpProgress(){return xpProgress;},
  hit:noop,release:noop,visitShop:noop,dayEnd:noop,beforeHit:neutral,cooldown:()=>1,move:(p,m)=>m,price:base=>base,get coinCarry(){return 0;}};
})();
