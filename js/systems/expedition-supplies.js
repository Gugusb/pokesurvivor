/* Frozen starting perks, finite supply stock, and persistent merchant inventory. */
G.ExpeditionSupplies=(()=>{
  const run=()=>G.Expedition?.run,defs=()=>G.ExpeditionCards;
  const perks=s=>s?.permanentPerks||{};
  const count=(id,s=run())=>G.Items?.count(s?.captain,id)||0;
  const unlimited=id=>G.Items.BY[id]?.infinite!==false;
  function snapshot(save){const p=G.CardPacks.normalize(save),v={};for(const d of defs().PERKS)v[d.key]=p.taken[d.id]||0;v.events=Object.fromEntries(defs().EVENTS.map(d=>[d.key,!!p.taken[d.id]]));return v;}
  const maxHp=s=>(G.EconomyConfig.initial.squadHp||100)+2*(perks(s).maxHp||0);
  const jarMax=s=>Math.round(1000*(1+.1*(perks(s).jarCapacity||0)));
  const extraction=s=>1+.05*(perks(s).jarExtraction||0);
  function deposit(s,n){if(!s||!(n>0))return 0;const before=Math.max(0,Math.min(jarMax(s),s.xpJar||0)),added=Math.min(n,jarMax(s)-before);s.xpJar=before+added;return added;}
  function begin(s){
    s.permanentPerks=snapshot(G.DB.save);s.gold+=s.permanentPerks.startGold;s.squadHp=maxHp(s);s.squadShield=2*s.permanentPerks.startShield;
    const p=s.captain;for(let i=0;i<s.permanentPerks.startLevel;i++){p.level++;G.Abilities.onLevel(p);}p.xp=0;p.xpNext=G.Player.xpFor(p.level);s.supplyClaims=new Set();s.supplyPurchases={};
  }
  function restore(s){s.permanentPerks||={};s.supplyClaims=s.supplyClaims instanceof Set?s.supplyClaims:new Set(s.supplyClaims||[]);s.supplyPurchases||={};s.xpJar=Math.max(0,Math.min(jarMax(s),s.xpJar||0));}
  function canGain(p,id){
    const s=run(),it=G.Items.BY[id];
    if(!it)return false;
    if(it.expeditionOnly&&(!s||p!==s.captain))return false;
    if(unlimited(id))return true;
    return (!p||!G.Items.count(p,id))&&!(s&&s.supplyClaims?.has(id));
  }
  function gained(p,id){if(p!==run()?.captain)return;restore(run());if(!unlimited(id))run().supplyClaims.add(id);}
  function battleEnd(s,cleared){
    s.xpJarItemFill=0;s.campHealed=0;if(count('campkit',s)&&!s.captain.dead){const before=s.captain.hp;s.captain.heal(Math.max(0,s.captain.maxHp-s.captain.hp)*.25);s.campHealed=s.captain.hp-before;}
    if(cleared){if(perks(s).clearHeal)G.TrainerTalents.healSquad(perks(s).clearHeal,s,'clear');if(count('jarpump',s)){const n=deposit(s,jarMax(s)*.1);s.xpJarStored=(s.xpJarStored||0)+n;s.xpJarItemFill=(s.xpJarItemFill||0)+n;}}
  }
  function absorb(s,damage){const used=Math.min(Math.max(0,s.squadShield||0),damage.applied);damage.shieldBefore=s.squadShield||0;s.squadShield=Math.max(0,(s.squadShield||0)-used);damage.shieldAbsorbed=used;damage.shieldAfter=s.squadShield;damage.beforeShield=damage.applied;damage.applied-=used;}
  function refreshed(s){if(!count('shopstamp',s))return;s.supplyRefreshes=(s.supplyRefreshes||0)+1;if(s.supplyRefreshes%5===0)s.gold+=1;}
  function eventEnd(s){s.supplySettledDays||=new Set();if(s.supplySettledDays.has(s.day))return;s.supplySettledDays.add(s.day);if(s.eventKind==='wild'&&count('trailguide',s)){G.Economy.addXp(s,1);G.Squad.syncTrainer();}}
  const inviteBonus=s=>.01*(perks(s).inviteChance||0);
  const xpFactor=p=>G.Squad?.active&&G.Squad.actors().includes(p)?1+.05*count('studycharm'):1;
  function bossDex(s,day=s.cycle*G.EconomyConfig.cycleLengthDays){s.bossDexByDay||={};if(!s.bossDexByDay[day]){const pool=G.ExpeditionRules.encounterCandidates(s.pool,day,true);s.bossDexByDay[day]=day===60?493:G.U.pick(pool.length?pool:s.pool).dex;}return s.bossDexByDay[day];}
  function scoutPanel(s){if(!perks(s).bossScout)return null;const m=G.DEX_BY[bossDex(s)],e=document.createElement('div');e.className='route-boss-scout';const label=G.I18n.lang==='zh'?'关底BOSS':G.I18n.lang==='en'?'Cycle Boss':'Jefe del ciclo';e.innerHTML='<small>'+label+'</small>'+G.UI.typeChips(m.types);return e;}
  function itemPrice(s,id){const base=Math.ceil(10*Math.pow(1.2,s.supplyPurchases?.[id]||0));return G.HoennMarket?.price(base,'item',id)??base;}
  function prepareItems(s){
    if(s.itemShopOffers)return;restore(s);const available=G.Items.LIST.filter(i=>G.Items.permitted(i)),infinite=available.filter(i=>unlimited(i.id)),once=available.filter(i=>!unlimited(i.id));s.itemShopOffers=[];
    const bag=infinite.slice();for(let i=0;i<4&&infinite.length;i++){const pool=bag.length?bag:infinite,it=G.U.pick(pool);s.itemShopOffers.push({id:it.id,sold:false});if(bag.length)bag.splice(bag.indexOf(it),1);}if(once.length)s.itemShopOffers.push({id:G.U.pick(once).id,sold:false});
  }
  function buyItem(s,index){
    if(s.phase!=='item-shop'||G.TrainerTalentsUI?.busy)return false;const o=s.itemShopOffers?.[index];if(!o||o.sold||!G.Items.permitted(G.Items.BY[o.id]))return false;const price=itemPrice(s,o.id);if(!(G.HoennMarket?.canPay(price,'item:'+o.id)??s.gold>=price)||!G.Items.gain(s.captain,o.id))return false;if(G.HoennMarket)G.HoennMarket.pay(price,'item:'+o.id);else s.gold-=price;s.supplyPurchases[o.id]=(s.supplyPurchases[o.id]||0)+1;o.sold=true;if(G.LeaderHoenn?.active()&&G.LeaderHoenn.f().doubleItem&&['choicescarf','assaultvest','quickclaw','leftovers'].includes(o.id))G.Items.gain(s.captain,o.id);G.LeaderSinnoh?.itemBought(o.id);return true;
  }
  const premium=s=>s.cycle===1?2:s.cycle===2?3:5;
  function highStar(s,rng){
    const rank=rng()<.2?3:2,copies=Math.pow(G.EconomyConfig.compatibility.mergeCopies,rank-1),pool=s.unitPool;
    let list=[...pool.mons.values()].filter(m=>pool.stock.get(m.dex)>=copies&&!pool.blocked(m.dex));if(!list.length&&rank===3)return highStar(s,()=>.5);if(!list.length)return null;const root=G.U.pick(list),dex=G.ExpeditionRules.formForRank(root.dex,rank);pool.stock.set(root.dex,pool.stock.get(root.dex)-copies);return {kind:'mon',dex,rank,cost:G.ExpeditionRules.monCost(root)*copies,poolCopies:copies,reserved:true,moveId:G.FIXED_SKILLS[dex]||G.Moves.startFor(G.DEX_BY[dex])};
  }
  function merchant(s,mode){
    if(s.phase!=='peddler'||s.merchantMode||!['owned','stars','skill','type','quality'].includes(mode))return false;
    const team=[s.captain,...G.Squad.roster],types=new Set(team.flatMap(p=>p.mon.types)),skills=new Set(team.flatMap(p=>p.moves.map(m=>G.SquadBonds.group(m.kind)))),pool=s.unitPool,offers=[];
    for(let i=0;i<G.EconomyConfig.shop.unitSlotCount;i++){
      let o=null;if(mode==='owned'&&i<2)o=pool.drawOwned(team);else if(mode==='stars'&&i<2)o=highStar(s,Math.random);
      else if((mode==='skill'||mode==='type')&&Math.random()<.7)o=pool.draw(s.trainerLevel,Math.random,m=>mode==='type'?m.types.some(t=>types.has(t)):skills.has(G.SquadBonds.group(G.Moves.BY_ID[G.FIXED_SKILLS[m.dex]||G.Moves.startFor(m)]?.kind)));
      else if(mode==='quality')o=pool.draw(s.trainerLevel,Math.random,()=>true,[.25,.5,1,2,4]);
      o ||= pool.draw(s.trainerLevel);if(o){o.cost+=premium(s);offers.push(o);}
    }
    // Do not reveal a failed guarantee or spend a day choosing an empty guaranteed service.
    if(['owned','stars'].includes(mode)&&offers.filter(o=>mode==='stars'?o.rank>1:team.some(p=>pool.root(p.dex)===pool.root(o.dex))).length<2){for(const o of offers)pool.putBack(o);return false;}
    s.merchantMode=mode;s.merchantOffers=offers;return true;
  }
  function buyMon(s,index){
    if(s.phase!=='peddler'||G.TrainerTalentsUI?.busy)return false;const o=s.merchantOffers?.[index];if(!o||o.sold||s.gold<o.cost)return false;if(!G.Squad.recruit(o.dex,o.moveId,o.rank,{poolCopies:o.poolCopies??1}))return false;s.gold-=o.cost;o.sold=true;return true;
  }
  function leave(s){for(const o of s.merchantOffers||[])s.unitPool.putBack(o);s.merchantOffers=null;s.merchantMode=null;s.itemShopOffers=null;}
  return {snapshot,perks,maxHp,jarMax,extraction,deposit,begin,restore,canGain,gained,battleEnd,absorb,refreshed,eventEnd,inviteBonus,xpFactor,bossDex,scoutPanel,unlimited,itemPrice,prepareItems,buyItem,premium,merchant,buyMon,leave};
})();
