/* Extensions to the existing paid-receipt ledger; no account currency writes. */
G.UnovaMarket=(()=>{
 const U=G.LeaderUnova,M=G.HoennMarket,R=()=>G.Expedition.run,on=()=>U.active(),f=()=>U.f();
 const m=()=>M.m().unova||={settled:[],freeOffers:{},spent:0,cashback:false};
 function price(value,kind,id,otherwise){if(!on())return otherwise;const a=f();let rate=a.factoryDiscount||a.shopDiscount||1;if(kind==='upgrade'&&a.upgradeDiscount)rate*=a.upgradeDiscount;if(kind==='item'&&a.medicalDiscount&&['leftovers','shellbell','assaultvest','quickclaw','choicescarf','superpotion'].includes(id))rate*=a.medicalDiscount;if(kind==='item'&&a.foodPremium&&['leftovers','shellbell','superpotion'].includes(id))rate*=a.foodPremium;if(kind==='mon'&&a.recruitTax)rate*=1+a.recruitTax;return value===0?0:Math.max(1,Math.ceil(value*rate));}
 function free(value,id,goods){if(!on()||!f().freeMove||!goods||!/^move:/.test(id)||!(value>0))return false;const a=m();if(!Object.hasOwn(a.freeOffers,id))a.freeOffers[id]=Math.random()<f().freeMove;return a.freeOffers[id];}
 function paid(amount,id,goods){if(!on()||!(amount>0))return;const a=m();a.spent+=amount;if(f().tourCashback&&!a.cashback&&a.spent>=15){a.cashback=true;M.credit(2);} }
 function rolled(run,offers,initial){if(!on())return;const a=m();if(initial){a.spent=0;a.cashback=false;}if(f().economy==='scout'){if(!run.shopLocked||!a.scout){const pool=G.Items.LIST.filter(i=>!i.boss&&G.Items.permitted(i)&&G.ExpeditionSupplies.canGain(run.captain,i.id));a.scout=pool.length?{id:G.U.pick(pool).id,sold:false}:null;}} }
 function refund(otherwise){return on()&&f().fullRefund?1:otherwise;}
 function buyScout(){if(!on()||R().phase!=='shop'||f().economy!=='scout')return false;const a=m(),o=a.scout;if(!o||o.sold||!G.Items.permitted(G.Items.BY[o.id]))return false;const cost=G.ExpeditionSupplies.itemPrice(R(),o.id);if(!M.canPay(cost,'item:'+o.id)||!G.Items.gain(R().captain,o.id))return false;if(!M.pay(cost,'item:'+o.id))return false;R().supplyPurchases||={};R().supplyPurchases[o.id]=(R().supplyPurchases[o.id]||0)+1;o.sold=true;return true;}
 const oldEnter=M.enterShop;M.enterShop=(run,offers)=>{oldEnter(run,offers);if(!on())return;if(f().visitRefresh)run.shopFreeRefreshes=(run.shopFreeRefreshes||0)+f().visitRefresh;const a=m();if(f().shopHeal&&run.unovaShopHeal&&a.healDay!==run.day){a.healDay=run.day;U.teamHeal(run.unovaShopHeal);run.unovaShopHeal=0;}if(f().wealthStartShield&&run.gold>100){const ratio=Math.min(.4,Math.floor((run.gold-100)/50)*.15);run.unovaWealthShield=ratio;}};
 const oldSettle=M.settle;M.settle=(run,input,report)=>{oldSettle(run,input,report);if(!on()||!input.victory||run.squadHp<=0||!['battle','elite','boss','rift','NORMAL_BATTLE','ELITE_BATTLE','BOSS_BATTLE'].includes(input.eventType))return;
  const a=m();if(a.settled.includes(run.day))return;a.settled.push(run.day);a.wins=(a.wins||0)+1;const b=M.m().pending?.unova||{...U.s()},p=f();let gold=0,healing=0;
  if(p.economy==='victory'&&!b.lethal)gold+=Math.min(2,report.baseWage*.25);
  if(p.economy==='scout')gold+=Math.min(2,b.zGoldKills||0);
  if(p.economy==='pickup'){gold+=1+Math.min(1,Math.floor((b.kills||0)/50));if(a.wins%3===0)giveItem();}
  if(p.economy==='steal')gold+=Math.min(3,b.stolenGold||0);
  if(p.economy==='medicare'&&p.medicareXp&&b.healthy){gold+=1;const earned=Math.max(0,b.pokemonXp||0);if(earned&&run.captain.effectiveXpMul>0){U.s().awardingXp=true;try{G.Game.expeditionGainXp(earned/run.captain.effectiveXpMul);}finally{U.s().awardingXp=false;}report.unovaXpBonus=earned;}}
  if(p.economy==='auction'){gold+=Math.min(3,Math.floor((b.kills||0)/40));if(p.antiqueGift&&run.gold>250&&a.antiqueCycle!==run.cycle){a.antiqueCycle=run.cycle;giveItem();}}
  if(p.economy==='scrap')gold+=Math.min(3,Math.floor((b.scrap||0)/(p.scrapPremium?4:6)));
  if(p.economy==='silver')gold+=Math.min(2,Math.floor((b.silver||0)/10))+(p.silverAttendance&&b.silver>10?1:0);
  if(p.economy==='factory')gold+=Math.min(2,b.zGold||0);
  if(p.economy==='smelter')gold+=Math.min(2,b.smeltGold||0)+Math.min(1,b.zGold||0);
  if(p.economy==='tour')gold+=Math.min(4,1+Math.floor((b.kills||0)/40));
  gold+=Math.min(2,b.harvestGold||0);
  if(b.fruit)healing+=Math.min(.1,b.fruit*.025);if(p.startFood)healing+=.1;
  if(gold){M.credit(gold);report.hoennGold=(report.hoennGold||0)+gold;report.totalGoldGained+=gold;}
  run.hoennSettlement||={bonus:0,heal:0,items:[]};run.hoennSettlement.bonus+=gold;run.hoennSettlement.heal+=healing;if(healing)U.teamHeal(healing);
  run.unovaSettlement={day:run.day,gold,heal:healing,xp:report.unovaXpBonus||0,scrap:b.scrap||0,silver:b.silver||0};
 };
 function giveItem(){const pool=G.Items.LIST.filter(i=>!i.boss&&G.Items.permitted(i)&&G.ExpeditionSupplies.canGain(R().captain,i.id));if(!pool.length)return false;const item=G.U.pick(pool);if(!G.Items.gain(R().captain,item.id))return false;R().hoennRewardItems||=[];R().hoennRewardItems.push(item.id);if(R().hoennSettlement?.items)R().hoennSettlement.items.push(item.id);R().loot||={};R().loot['item:'+item.id]=(R().loot['item:'+item.id]||0)+1;return true;}
 return {price,free,paid,rolled,refund,buyScout,m};
})();
