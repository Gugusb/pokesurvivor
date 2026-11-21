/* Run-only trainer talents: data, decisions and bounded effect hooks. No account writes. */
G.TrainerTalents=(()=>{
 const cfg=()=>G.TrainerTalentsConfig,run=()=>G.Expedition?.run,local=v=>v?.[G.I18n.lang]||v?.en||v;
 let dataRef=null,cards=[],ids=new Map();const aggregates=new WeakMap();
 const catalogue=()=>{if(dataRef!==cfg()){dataRef=cfg();cards=dataRef?.talents.filter(d=>d.enabled!==false)||[];ids=new Map(cards.map(d=>[d.id,d]));}return cards;},by=id=>{catalogue();return ids.get(id);};
 let shields=new WeakMap();
 function ensure(s){if(!s)return null;s.trainerTalents||=[];s.pendingTalentPicks||=[];s.talentRerolls??=cfg()?.defaultRerolls??2;s.talentGifts||=[];s.emblems||={};s.talentSequence??=0;return s;}
 const permitted=(d,s=run())=>!!d&&(!d.effects.typeBondOffset||(G.LeagueRank?.allows('types',s)??true));
 const definition=(id,enhanced=false)=>{const d=by(id);return enhanced&&d?.enhanced?{...d,effects:d.enhanced.effects,desc:d.enhanced.desc,enhanced:true,name:Object.fromEntries(Object.entries(d.name).map(([k,v])=>[k,v+(k==='zh'?' · 强化':k==='es'?' · Mejorado':' · Enhanced')]))}:d?{...d,enhanced:false}:d;};
 const choiceDefinition=(s,id)=>definition(id,!!G.Items?.count(s.captain,'talentseal'));
 const entries=(s=run())=>ensure(s)?.trainerTalents.map(t=>({instance:t,def:definition(t.id,t.enhanced)})).filter(t=>permitted(t.def,s))||[];
 function aggregate(s){if(!s)return {sums:{},ids:new Set()};ensure(s);let a=aggregates.get(s);if(!a||a.length!==s.trainerTalents.length){a={length:s.trainerTalents.length,sums:{},ids:new Set()};for(const {def}of entries(s)){a.ids.add(def.id);for(const [key,v]of Object.entries(def.effects))if(typeof v==='number'||v===true)a.sums[key]=(a.sums[key]||0)+Number(v);}aggregates.set(s,a);}return a;}
 const sum=(key,s=run())=>aggregate(s).sums[key]||0;
 const has=(id,s=run())=>aggregate(s).ids.has(id);
 const represented=p=>!!p&&G.Squad?.active&&G.Squad.actors().includes(p);
 const maxHp=(s=run())=>(G.ExpeditionSupplies?.maxHp(s)||G.EconomyConfig.initial.squadHp||100)+sum('maxSquadHpBonus',s);
 function healSquad(n,s=run(),source='talent'){if(!s||!(n>0))return 0;const before=s.squadHp;s.squadHp=Math.min(maxHp(s),Math.round((s.squadHp+n)*1e6)/1e6);const restored=s.squadHp-before;if(restored>0){s.squadHealing||={};s.squadHealing[source]=(s.squadHealing[source]||0)+restored;}return restored;}
 function onLevelUp(s,level,rng=Math.random){
  ensure(s);if(!cfg()||s.pendingTalentPicks.some(p=>p.targetLevel===level)||s.trainerTalents.some(p=>p.acquiredAtLevel===level))return;
  const odds=cfg().levelDropOdds[level];if(!odds)return;let roll=rng()*100,tier='silver';for(const [k,v]of Object.entries(odds)){roll-=v;if(roll<0){tier=k;break;}}
  s.pendingTalentPicks.push({targetLevel:level,tier,serial:++s.talentSequence,seen:[],offers:null});
 }
 function begin(s){ensure(s);shields=new WeakMap();s.talentGifts=[];}
 function eligible(s,p){return catalogue().filter(d=>permitted(d,s)&&d.tier===p.tier&&!p.seen.includes(d.id)&&!(d.unique&&has(d.id,s)));}
 function affinity(d,s){
  const cap=s.captain,types=new Map();for(const p of G.Squad?.actors?.()||[cap])for(const type of p.mon.types)types.set(type,(types.get(type)||0)+1);
  if(!d.tagType)return 2;return 1+(cap.mon.types.includes(d.tagType)?12:0)+(types.get(d.tagType)||0)*4+(G.SquadBonds?.layer('types',d.tagType)||0)*.04;
 }
 // Bond upgrades share one outer weight; type tailoring applies only after that group wins.
 const bondUpgrade=d=>!!(d.effects.typeBondOffset||d.effects.captainOmniTag);
 function pickWeighted(list,weight,rng){let n=rng()*list.reduce((sum,d)=>sum+weight(d),0);for(const d of list){n-=weight(d);if(n<0)return d;}return list.at(-1);}
 function weighted(list,s,rng){
  const bonds=list.filter(bondUpgrade),buckets=list.filter(d=>!bondUpgrade(d)).map(d=>({cards:[d],weight:affinity(d,s)}));
  if(bonds.length)buckets.push({cards:bonds,weight:cfg().bondUpgradeGroupWeight});
  const chosen=pickWeighted(buckets,b=>b.weight,rng).cards;
  return chosen.length===1?chosen[0]:pickWeighted(chosen,d=>affinity(d,s),rng);
 }
 function deal(s,p,rng=Math.random){
  const available=eligible(s,p),out=[];if(available.length<3)return null;
  for(const categories of [['BONDS','CAPTAIN'],['COMBAT'],['ECONOMY']]){const fresh=available.filter(d=>!out.includes(d)),preferred=fresh.filter(d=>categories.includes(d.category)),card=weighted(preferred.length?preferred:fresh,s,rng);out.push(card);}
  p.offers=out.map(d=>d.id);p.seen.push(...p.offers);return p.offers.map(by);
 }
 function current(s=run()){ensure(s);const p=s?.pendingTalentPicks[0];if(!p)return null;if(p.offers?.some(id=>!permitted(by(id),s))){p.seen=p.seen.filter(id=>!p.offers.includes(id));p.offers=null;}if(!p.offers)deal(s,p);return p;}
 function canReroll(s=run()){const p=current(s);return !!p&&s.talentRerolls>0&&eligible(s,p).length>=3;}
 function reroll(s=run(),serial,rng=Math.random){const p=current(s);if(!p||p.serial!==serial||!canReroll(s))return false;const cards=deal(s,p,rng);if(!cards)return false;s.talentRerolls--;return true;}
 function moveChoices(s=run()){const p=s.captain;return G.Moves.poolFor(p.mon).filter(id=>!p.hasMove(id)&&!p.banned?.has(id));}
 function applyMove(s,id,slot,level=3){const p=s.captain;if(!moveChoices(s).includes(id))return false;if(p.slots.length>=p.maxMoves){if(!Number.isInteger(slot)||!p.slots[slot])return false;const removed=p.slots[slot];for(const m of removed)G.Projectiles.clearOrbs(p,m.id);p.moves=p.moves.filter(m=>!removed.includes(m));p.slots.splice(slot,1);}p.addMove(id);const m=p.moves.find(m=>m.id===id);while(m.lvl<Math.min(level,m.def.maxLvl))G.Moves.levelUp(m);p.active=Math.min(p.active,p.slots.length-1);G.Squad.refresh();return true;}
 function grantType(s,type){
  const max=G.Economy.levelRow(s.trainerLevel).odds.reduce((n,v,i)=>v?i+1:n,1),pool=G.ExpeditionRules.shopFamilies(s.pool||G.DEX).filter(p=>p.types.includes(type)&&G.ExpeditionQuality.quality(p)<=max),all=pool.length?pool:G.ExpeditionRules.shopFamilies(G.DEX).filter(p=>p.types.includes(type)&&G.ExpeditionQuality.quality(p)<=max);
  const mon=G.U.pick(all);if(mon)s.talentGifts.push({dex:mon.dex,type});receiveGifts(s);
 }
 function receiveGifts(s=run()){ensure(s);if(s.phase==='combat')return;for(let i=s.talentGifts.length-1;i>=0;i--){const gift=s.talentGifts[i];if(G.Squad.canRecruit(gift.dex)&&G.Squad.recruit(gift.dex,null,1,{poolCopies:0}))s.talentGifts.splice(i,1);}}
 function choose(s,serial,id,options={}){
  const p=current(s),d=choiceDefinition(s,id);if(!p||p.serial!==serial||!p.offers?.includes(id)||!d)return false;
  if(d.effects.promptMoveDraft&&!applyMove(s,options.moveId,options.slot,d.effects.draftMoveLevel||3))return false;
  s.pendingTalentPicks.shift();const inst={id,tier:p.tier,acquiredAtLevel:p.targetLevel,day:s.day,timestamp:Date.now(),enhanced:!!d.enhanced};if(d.enhanced)G.Items.remove(s.captain,'talentseal');s.trainerTalents.push(inst);
  const e=d.effects;if(e.instantGold)s.gold+=e.instantGold;if(e.freeRefreshes)s.talentFreeRefreshes=(s.talentFreeRefreshes||0)+e.freeRefreshes;if(e.grantRerolls)s.talentRerolls+=e.grantRerolls;
  if(e.instantGoldCostPct){const cost=Math.floor(s.gold*e.instantGoldCostPct);s.gold-=cost;if(e.investmentReturn){inst.investmentPrincipal=cost;inst.investmentPaid=0;}}if(e.healSquadHp)healSquad(e.healSquadHp,s);
  if(e.typeBondOffset)for(const [type,n]of Object.entries(e.typeBondOffset))s.emblems[type]=(s.emblems[type]||0)+n;
  if(e.grantTypeMon)for(let i=0;i<(e.grantTypeMonCount||1);i++)grantType(s,e.grantTypeMon);sync(s);G.Squad.refresh();return true;
 }
 function sync(s=run()){
  if(!s)return;const p=s.captain,hpBonus=entries(s).reduce((n,t)=>n+Math.max(0,(t.def.effects.hpMult||1)-1),0);
  if(p){const bonus=p.baseHp*(1+p.statGrowth.hp)*hpBonus*(G.Mega?.active(p)?G.Mega.HP:1),delta=bonus-(p.talentHpBonus||0);if(delta){const fraction=p.hp/p.maxHp;p.maxHp=Math.max(1,p.maxHp+delta);p.hp=p.dead?0:p.maxHp*fraction;}p.talentHpBonus=bonus;}
  const levels=sum('maxStarSkillLevelBonus',s);if(levels)for(const actor of G.Squad?.roster||[])if(actor.rank===3)for(const m of actor.moves)while((m.talentExtraLevels||0)<levels){const last=m.def.ups.at(-1);m.def={...m.def,maxLvl:m.def.maxLvl+1,ups:[...m.def.ups,last]};G.Moves.levelUp(m);m.talentExtraLevels=(m.talentExtraLevels||0)+1;}
 }
 function attackPct(p){return represented(p)?sum('atkPct'):0;}
 function speedPct(p){return represented(p)?sum('moveSpeedPct'):0;}
 const low=s=>s&&s.squadHp/maxHp(s)<.5&&has('gold_blaze_instinct',s);
 function rate(p){if(!represented(p))return 1;return (low(run())?1+sum('atkSpdPct'):1)/(p.isSquadMember?Math.max(.15,1-sum('cdrPct')):1);}
 function crit(p){return represented(p)&&low(run())?sum('critPct'):0;}
 const nfe=p=>G.ExpeditionRules.next(p.dex).length>0;
 function outgoing(p){return represented(p)&&nfe(p)?1+sum('nfeDmgBonus'):1;}
 function incoming(p,source){if(!represented(p))return 1;let k=nfe(p)?Math.max(.1,1-sum('nfeDmgReduction')):1;if(p.isSquadMember&&G.Squad.gathering&&p.assaultMode!=='assault')k*=Math.max(.1,1-sum('gatherDmgReduction'));if(['contact','melee'].includes(source.kind))k*=Math.max(.1,1-sum('contactDmgReduction'));else if(['ranged','projectile','beam','hazard','explosion'].includes(source.kind))k*=Math.max(.1,1-sum('projectileDmgReduction'));return k;}
 function gatherDelay(){return Math.min(.22,...entries().filter(t=>t.def.effects.gatherDelay).map(t=>t.def.effects.gatherDelay));}
 function noPP(p,m){return represented(p)&&p.isSquadMember&&(has('master_infinite_pp')||has('ultra_overclock_all')&&p.rank===3&&m.evolved);}
 function defFactor(p){return represented(p)&&!p.isSquadMember?1+entries().reduce((n,t)=>n+Math.max(0,(t.def.effects.defMult||1)-1),0):1;}
 function visualScale(p){return represented(p)&&!p.isSquadMember?1+entries().reduce((n,t)=>n+Math.max(0,(t.def.effects.scaleMult||1)-1),0):1;}
 function move(p,m){if(!represented(p)||p.isSquadMember||!has('master_dynamax_ace')||m.talentSizeApplied)return m;const k=1+entries().reduce((n,t)=>n+Math.max(0,(t.def.effects.hitRadiusMult||1)-1),0),v={...m,talentSizeApplied:true};for(const key of ['radius','range','width','size'])if(m[key]!=null)v[key]=m[key]*k;return v;}
 function interestDivisor(s){return Math.min(G.EconomyConfig.interest.divisor,...entries(s).filter(t=>t.def.effects.interestDivisor).map(t=>t.def.effects.interestDivisor));}
 function maxInterest(s){return Math.max(G.EconomyConfig.interest.maxInterest,...entries(s).map(t=>t.def.effects.maxInterest||0));}
 function refreshDiscount(s){return sum('refreshCostDiscount',s);}
 function price(s,base){return !s.talentShopBought&&has('gold_shop_vip',s)?Math.max(1,Math.ceil(base*Math.max(.05,1-sum('firstSlotDiscountPct',s)))):base;}
 function reserveQuality(s,tier,rng=Math.random,force=false){const pool=s.unitPool,list=[...pool.mons.values()].filter(p=>G.ExpeditionQuality.quality(p)===tier&&pool.stock.get(p.dex)>0&&!pool.blocked(p.dex));if(!list.length){if(!force)return null;const fallback=G.ExpeditionRules.shopFamilies(s.pool||G.DEX).filter(p=>G.ExpeditionQuality.quality(p)===tier);if(!fallback.length)return null;const mon=fallback[Math.floor(rng()*fallback.length)];return {kind:'mon',dex:mon.dex,rank:1,cost:G.EconomyConfig.unitTiers[tier].cost,reserved:false,poolCopies:0,moveId:G.FIXED_SKILLS[mon.dex]||G.Moves.startFor(mon)};}const mon=list[Math.floor(rng()*list.length)];pool.stock.set(mon.dex,pool.stock.get(mon.dex)-1);return {kind:'mon',dex:mon.dex,rank:1,cost:G.EconomyConfig.unitTiers[tier].cost,reserved:true,moveId:G.FIXED_SKILLS[mon.dex]||G.Moves.startFor(mon)};}
 function shop(s,offers,rng=Math.random){
  if(has('ultra_reroll_master',s))for(let i=0;i<offers.length;i++){const o=offers[i];if(!o||G.ExpeditionQuality.quality(o.dex)>=5||rng()>=Math.min(1,sum('upgradeShopSlotChance',s)))continue;const better=reserveQuality(s,G.ExpeditionQuality.quality(o.dex)+1,rng);if(better){s.unitPool.putBack(o);offers[i]=better;}}
  if(has('master_silph_syndicate',s)){const needed=Math.min(offers.length,sum('guaranteedTier5Slots',s)||1);let have=offers.filter(o=>o&&G.ExpeditionQuality.quality(o.dex)===5).length;for(let i=0;i<offers.length&&have<needed;i++)if(!offers[i]||G.ExpeditionQuality.quality(offers[i].dex)!==5){const guaranteed=reserveQuality(s,5,rng,true);if(!guaranteed)break;s.unitPool.putBack(offers[i]);offers[i]=guaranteed;have++;}}
 }
 const roundGold=n=>Math.round(n*1e6)/1e6;
 function investments(s=run()){return entries(s).filter(t=>t.def.effects.investmentReturn&&Number.isFinite(t.instance.investmentPrincipal)).map(({instance:t,def:d})=>({instance:t,total:roundGold(t.investmentPrincipal*d.effects.investmentReturn),paid:t.investmentPaid||0,days:Math.max(0,Math.min(d.effects.investmentDays,s.day-t.day)),duration:d.effects.investmentDays}));}
 function repayInvestments(s){let due=0;for(const a of investments(s)){const target=roundGold(a.total*a.days/a.duration),n=Math.max(0,roundGold(target-a.paid));a.instance.investmentPaid=target;due+=n;}due=roundGold(due);s.gold=roundGold(s.gold+due);return due;}
 function wage(s){return entries(s).filter(t=>t.def.effects.wageBonus&&s.day>t.instance.day&&s.day<=t.instance.day+t.def.effects.remainingDays).reduce((n,t)=>n+t.def.effects.wageBonus,0);}
 function battleReward(s){const xp=sum('bonusReserveXp',s);const added=G.ExpeditionSupplies?G.ExpeditionSupplies.deposit(s,xp):xp;if(!G.ExpeditionSupplies)s.xpJar=(s.xpJar||0)+xp;s.xpJarStored=(s.xpJarStored||0)+added;return sum('bonusTrainerXp',s);}
 function beginBattle(s){shields=new WeakMap();sync(s);if(has('silver_iron_defense',s))for(const p of G.Squad.deployed().slice(0,cfg().frontlineCount))shields.set(p,{hp:p.maxHp*sum('combatStartShieldPct',s),until:s.elapsed+12});}
 function absorb(p,n){const a=shields.get(p);if(!a||!represented(p)||run().elapsed>=a.until)return n;const used=Math.min(n,a.hp);a.hp-=used;return n-used;}
 function onCast(p,m){if(!represented(p)||p.isSquadMember||!has('gold_captain_link'))return;const fraction=sum('captainCastCdrAllyPct'),near=G.Squad.deployed().filter(q=>!q.dead).sort((a,b)=>(a.x-p.x)**2+(a.y-p.y)**2-((b.x-p.x)**2+(b.y-p.y)**2)).slice(0,Math.max(2,sum('targets')));for(const q of near)for(const skill of q.moves)skill.t=Math.max(0,skill.t-skill.cd*q.cdMul*fraction);}
 function onKill(p){const s=run();if(s?.phase==='combat'&&represented(p)&&low(s))healSquad(Math.min(sum('killHealSquadHp'),maxHp(s)*.5-s.squadHp),s,'blaze');}
 function pulse(p,e,a,dealt){
  if(!represented(p)||a.typeBondSecondary||a.kind==='typebond'||!(dealt>0)||G.Types.mult(a.type,e.types)<=1)return;
  for(const t of entries())if(t.def.effects.typePulseOnHit&&p.mon.types.includes(t.def.effects.typePulseOnHit)){const type=t.def.effects.typePulseOnHit;
   for(const other of G.EnemyMgr.queryCircle(e.x,e.y,cfg().crownPulseRadius).filter(q=>!q.dead&&q!==e)){const attack={id:'typebond-'+type,kind:'typebond',type,typeBondSecondary:true,talentPulse:true},d=other.hurt(dealt*t.def.effects.pulsePct,G.U.TYPE_COLOR[type],0,0,0,null,p,attack)||0;p.dmgDealt+=d;p.onDealt(d);}
   G.FX.ring(e.x,e.y,8,cfg().crownPulseRadius,G.U.TYPE_COLOR[type],.22,2);
  }
 }
 function rescue(s=run(),p=null){
  if(!s||!has('master_sacred_ash',s)||s.talentAshUsed)return false;s.talentAshUsed=true;healSquad(sum('cheatDeathSquadHp',s),s,'sacredAsh');
  const cap=s.captain;cap.dead=false;cap.hp=Math.max(cap.hp,1,cap.maxHp*(sum('captainRevivePct',s)||.4));cap.invuln=sum('rescueInvuln',s)||2;
  // Purification removes foes without granting kill income, XP, drops or recursive effects.
  for(const enemy of [...G.EnemyMgr.all(),...(s.pendingSpawns||[]).map(w=>w.enemy)])if(!enemy.boss){enemy.dead=true;enemy.hp=0;enemy.fade=0;}
  s.pendingSpawns=(s.pendingSpawns||[]).filter(w=>w.enemy.boss);G.FX.ring(cap.x,cap.y,10,600,'#fff7cd',.65,6);G.Camera.kick(.15);return true;
 }
 function rescueCaptain(p){return represented(p)&&!p.isSquadMember&&p.hp<=0&&rescue(run(),p);}
 function draw(ctx){for(const p of G.Squad?.actors?.()||[]){const s=shields.get(p);if(!s||s.hp<=0||run().elapsed>=s.until)continue;ctx.save();ctx.strokeStyle='#b6e9ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-p.bodyH*.4,p.r+9,p.bodyH*.6+8,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}
 function tick(){const s=run();if(s)sync(s);}
 return {definition,choiceDefinition,permitted,catalogue,by,local,ensure,begin,onLevelUp,current,deal,eligible,canReroll,reroll,choose,entries,sum,has,maxHp,healSquad,receiveGifts,moveChoices,sync,attackPct,speedPct,rate,crit,outgoing,incoming,gatherDelay,noPP,defFactor,visualScale,move,interestDivisor,maxInterest,refreshDiscount,price,shop,wage,investments,repayInvestments,battleReward,beginBattle,absorb,onCast,onKill,pulse,rescue,rescueCaptain,draw,tick};
})();
