/* Run-local Hoenn ledger. Paid receipts, debt and benefit claims survive node saves. */
G.HoennMarket=(()=>{
 const engine=()=>G.LeaderSinnoh?.active()?G.LeaderSinnoh:G.LeaderHoenn,H=new Proxy({},{get:(_,key)=>engine()[key]}),R=()=>G.Expedition?.run,enabled=()=>H.active()&&!!H.f().economy;
 const m=()=>R().hoennMarket||=( {debt:0,scales:0,visits:0,receipts:{},settled:[],wishes:[],pearl:3,pearlRounds:0,flatHp:0,relics:0,wishGrowth:0,bananaGrowth:0} );
 const price=(value,kind='skill',id='')=>G.UnovaMarket?.price(value,kind,id,basePrice(value,kind))??basePrice(value,kind);
 const basePrice=(value,kind='skill')=>Math.max(value===0?0:1,Math.ceil(value*(G.LeaderSinnoh?.active()&&G.LeaderSinnoh.f().stench&&kind==='mon'?1.15:1)*(enabled()?(H.f().shopDiscount|| (kind==='item'?H.f().itemDiscount:1)||1):1)*(enabled()&&H.root()===352?.85:enabled()&&H.root()===263&&kind==='item'?.7:1)*(enabled()&&H.root()===280&&kind==='upgrade'?.5:1)*(enabled()&&H.root()===343&&kind==='skill'?1.2:1)));
 const limit=()=>!enabled()?0:H.root()===325?(H.f().largeLoan?30:20):H.root()===352&&H.f().largeLoan?30:0;
 function credit(n){if(!(n>0))return 0;const a=m(),pay=Math.min(a.debt,n);a.debt-=pay;R().gold+=n-pay;if(pay>0&&a.debt<1e-8&&!a.repaidBonus&&H.root()===325&&H.f().largeLoan){a.repaidBonus=true;R().gold+=2;}return n;}
 function plan(value,id,goods=true){const a=m(),free=G.UnovaMarket?.free(value,id,goods)?value:goods&&a.freeIds?.includes(id)?Math.min(a.freeBudget||0,value):0;const coupon=goods&&/^(mon|move|item):/.test(id)&&(a.coupons||0)>0&&value>0;let due=coupon?0:value-free,scales=0,excess=0;const unit=H.f().scalePremium?3:2;
  if(goods&&(H.root()===370||H.root()===489)){scales=Math.min(a.scales,Math.ceil(due/unit));const used=scales*unit;excess=Math.max(0,used-due);due=Math.max(0,due-used);}
  const cash=Math.min(Math.max(0,R().gold),due),debt=due-cash;return {value,free,coupon,scales,excess,cash,debt,ok:debt<1e-8||goods&&a.debt+debt<=limit()+1e-8};
 }
 function canPay(value,id='',goods=true){return !enabled()?R().gold>=value:plan(value,id,goods).ok;}
 function pay(value,id='',goods=true){if(!enabled()){if(R().gold<value)return false;R().gold-=value;return {paid:value};}const a=m(),p=plan(value,id,goods);if(!p.ok)return false;R().gold-=p.cash;a.debt+=p.debt;a.scales-=p.scales;if(p.coupon)a.coupons--;a.freeBudget=Math.max(0,(a.freeBudget||0)-p.free);if(p.excess){const xp=p.excess/Math.max(.001,R().captain.effectiveXpMul);if(G.Game.expeditionGainXp)G.Game.expeditionGainXp(xp);else R().captain.gainXp(xp);}if(p.scales&&!a.scaleLevelVisits?.includes(a.visits)){a.scaleLevelVisits||=[];a.scaleLevelVisits.push(a.visits);const moves=G.Squad.actors().flatMap(p=>p.moves).filter(m=>m.lvl<5&&!m.evolved);if(moves.length)G.Moves.levelUp(G.U.pick(moves));}if(H.root()===352&&R().gold<10)a.revenge=true;G.UnovaMarket?.paid(p.cash+p.debt,id,goods);return {...p,paid:p.cash+p.debt};}
 const advanced=()=>!G.LeagueRank||G.LeagueRank.rules(R()).tier>=4,owns=(p)=>[R().captain,...G.Squad.roster].includes(p)&&(p===R().captain||advanced()),ownerKey=p=>p===R().captain?'captain':String(p.squadId);
 function tradePool(p){return G.Moves.poolFor(p.mon).filter(id=>!p.hasMove(id)&&G.LeaderAbilities.allowed(G.Moves.BY_ID[id]));}
 function rollGoods(){const a=m(),pool=[...new Set([R().captain,...G.Squad.roster].flatMap(tradePool))],count=H.root()===352?4:3;a.goods=[];while(a.goods.length<count&&pool.length){const id=pool.splice(Math.floor(Math.random()*pool.length),1)[0];a.goods.push({id,token:'move:'+a.visits+':'+(++a.serial|| (a.serial=1)),sold:false});}return a.goods;}
 function enterShop(run,offers){if(!enabled())return;const a=m();a.visits++;a.eatenVisit=false;a.cashback=0;a.honeyBuys=0;if(!run.shopLocked||!a.goods)rollGoods();if(H.f().visitRefresh)run.shopFreeRefreshes+=H.f().visitRefresh;if(H.root()===370&&H.f().scalePremium)run.shopFreeRefreshes+=2;rolled(run,offers,true);}
 function rolled(run,offers,initial=false){if(!enabled())return;const a=m();for(let i=0;i<offers.length;i++)if(offers[i])offers[i].hoennToken='mon:'+a.visits+':'+(run.rankRefreshCount||0)+':'+i;
  if(!initial)rollGoods();if(initial&&a.pendingFreeBudget){a.freeBudget=a.pendingFreeBudget;a.pendingFreeBudget=0;a.freeIds=[...offers.filter(Boolean).map(o=>o.hoennToken),...(a.goods||[]).map(o=>o.token)];}else if(!initial)a.freeIds=[];G.UnovaMarket?.rolled(run,offers,initial);
 }
 function buy(p,index,replaceId=null){if(!enabled()||R().phase!=='shop'||!owns(p))return false;const a=m(),o=a.goods?.[index];if(!o||o.sold||!tradePool(p).includes(o.id))return false;const old=replaceId?p.moves.find(v=>v.id===replaceId):null;
  if(p.isSquadMember&&!old)return false;if(!p.isSquadMember&&p.slots.length>=p.maxMoves&&!old)return false;
  const value=price(4,'skill');if(!canPay(value,o.token))return false;const charged=pay(value,o.token);if(!charged)return false;
  const next=G.Moves.instance(o.id,old?.lvl||1);if(old){for(const group of p.slots){const i=group.indexOf(old);if(i>=0)group[i]=next;}p.moves[p.moves.indexOf(old)]=next;}else if(!p.addMove(o.id)){credit(charged.paid);return false;}const real=old?next:p.moves.find(v=>v.id===o.id);
  const receipt='r'+(++a.serial);a.receipts[receipt]={amount:charged.paid,used:false,owner:ownerKey(p)};real.hoennReceipt=receipt;
  if(H.root()===311&&['electric','normal'].includes(real.type)||H.root()===311&&real.kind==='buff'){const back=Math.min(Math.max(0,1-a.cashback),charged.paid*.25);a.cashback+=back;a.receipts[receipt].amount-=back;credit(back);}
  if(H.root()===415&&H.f().royalHoney&&a.honeyBuys<2){a.honeyBuys++;a.honeyBank=Math.min(10,(a.honeyBank||0)+1);}
  o.sold=true;G.Projectiles.clearOrbs(p);G.Combat.clearFields(p);G.MovePP.restore(p,p.moves);if(p.isSquadMember){p.moveId=real.id;G.SquadTraits?.assign(p);}G.Squad.refresh();return true;
 }
 function upgrade(p,move){if(!enabled()||R().phase!=='shop'||!owns(p)||!p.moves.includes(move)||move.evolved||move.lvl>=5)return false;const a=m(),target=move.lvl<3?3:5,value=price((target-move.lvl)*2,'upgrade'),free=a.freeUpgrade>0;if(!free&&!canPay(value,'upgrade'))return false;const charged=free?{paid:0}:pay(value,'upgrade');if(!charged)return false;if(free)a.freeUpgrade--;while(move.lvl<target)G.Moves.levelUp(move);if(charged.paid>0){let receipt=a.receipts[move.hoennReceipt];if(!receipt||receipt.used){move.hoennReceipt='r'+(++a.serial);receipt=a.receipts[move.hoennReceipt]={amount:0,used:false,owner:ownerKey(p)};}receipt.amount+=charged.paid;}return true;}
 function sell(p,move,eat=false){if(!enabled()||!advanced()||R().phase!=='shop'||!owns(p)||!p.moves.includes(move))return false;const a=m(),receipt=a.receipts[move.hoennReceipt];if(!receipt||receipt.used||!(receipt.amount>0)||receipt.owner!==ownerKey(p))return false;if(eat&&(H.root()!==316||a.eatenVisit))return false;if(p===R().captain&&p.moves.length===1)return false;
  if(p.isSquadMember){const next=G.Moves.instance(G.FIXED_SKILLS[p.dex]||G.Moves.startFor(p.mon),[0,1,3,5][p.rank]);p.moves=[next];p.slots=[[next]];p.active=0;p.moveId=next.id;G.SquadTraits.assign(p);}else{p.moves=p.moves.filter(v=>v!==move);p.slots=p.slots.map(g=>g.filter(v=>v!==move)).filter(g=>g.length);p.active=Math.min(p.active,p.slots.length-1);}
  receipt.used=true;credit(receipt.amount*(G.UnovaMarket?.refund(eat||H.root()===280&&R().trainerLevel>=5?1:.5)??(eat||H.root()===280&&R().trainerLevel>=5?1:.5)));if(eat){a.eatenVisit=true;a.flatHp+=H.f().gulpHp||3;}G.Projectiles.clearOrbs(p);G.Combat.clearFields(p);G.Squad.refresh();applyHp();return true;
 }
 function applyHp(){if(!H.active())return;const a=m();for(const p of [R().captain,...G.Squad.roster]){const delta=a.flatHp-(p.hoennPaidHp||0);if(delta){const frac=p.hp/p.maxHp;p.maxHp=Math.max(1,p.maxHp+delta);p.hp=p.dead?0:p.maxHp*frac;p.hoennPaidHp=a.flatHp;}}}
 function captureBattle(data){if(!enabled())return;const a=m();a.pending={day:R().day,...data};}
 function giveItem(){const pool=G.Items.LIST.filter(it=>!it.boss&&G.Items.permitted(it)&&G.ExpeditionSupplies.canGain(R().captain,it.id));if(pool.length){const it=G.U.pick(pool);if(G.Items.gain(R().captain,it.id)){R().hoennRewardItems||=[];R().hoennRewardItems.push(it.id);if(R().loot)R().loot['item:'+it.id]=(R().loot['item:'+it.id]||0)+1;return it.id;}}return null;}
 function settle(run,input,report){if(!enabled()||!input.victory||run.squadHp<=0||!['battle','elite','boss','NORMAL_BATTLE','ELITE_BATTLE','BOSS_BATTLE'].includes(input.eventType))return;const a=m();if(a.settled.includes(run.day))return;a.settled.push(run.day);a.wins=(a.wins||0)+1;run.hoennRewardItems=[];const b=a.pending?.day===run.day?a.pending:{kills:0,elite:0,armored:0,duration:0,weatherKinds:[],gems:0},root=H.root(),f=H.f();let bonus=0,heal=0;const add=(n)=>{bonus+=Math.max(0,n);};
  if(root===263){if(b.kills>=30)heal=.05;add(1+Math.min(1,Math.floor(b.kills/30)));if(a.wins%3===0)giveItem();}
  if(root===287)add(Math.min(2,Math.floor(Math.max(0,input.lockedGoldAtBattleStart)/50)));
  if(root===300){add(Math.min(2,Math.floor(b.kills/40)));if(f.catInterest)add(Math.min(1,Math.floor(Math.max(0,input.lockedGoldAtBattleStart)*.08)));}
  if(root===302&&b.gems>0)a.gemChoice={day:run.day,count:b.gems,claimed:false};
  if(root===311){add(report.baseWage*.1);if(f.investmentBonus)add(Math.min(2,Math.floor(Math.max(0,input.lockedGoldAtBattleStart)/50)));}
  if(root===320)add(Math.min(f.freightPremium?4:3,Math.floor(b.kills/20)));
  if(root===343){a.relics=Math.min(10,a.relics+(b.elite||0)+(b.shieldKills||0));add(Math.min(2,Math.floor(b.kills/40))+Math.min(1,(b.elite||0)+(b.shieldKills||0)));if(f.antiqueGift&&run.gold>200&&a.antiqueCycle!==run.cycle){giveItem();a.antiqueCycle=run.cycle;}}
  if(root===351){add(Math.min(2,(b.weatherKinds||[]).length));if(b.weatherData){add(1);a.flatHp+=3;}if(f.weatherTraining&&b.weatherKinds?.length)a.freeUpgrade=(a.freeUpgrade||0)+1;}
  if(root===352){add(Math.min(H.f().eliteSteal?1:0,b.elite||0)+Math.min(2,b.stolenShield||0));if(b.revengeIds?.length&&b.revengeCleared===b.revengeIds.length)add(2);}
  if(root===357){heal=Math.min(.2,Math.floor(b.duration/12)*.02);a.bananaReady=true;if(f.goldBanana){add(Math.min(1,Math.floor(b.duration/40)));a.bananaGrowth=Math.min(.1,a.bananaGrowth+.01);}}
  if(root===358&&(b.kills>=30||b.elite>0)){heal=.2;add(report.baseWage*(f.goldBell?.2:.15));}
  if(root===366&&!a.pearlSold){a.pearl=Math.min(20,a.pearl*1.1);a.pearlRounds++;}
  if(root===370&&f.waterEndHeal&&b.waterCasts>0)heal=Math.min(.15,Math.floor(b.waterCasts/4)*.015);
  if(root===370)a.scales+=Math.min(2,Math.floor(b.kills/30));
  if(root===374)add(Math.min(3,Math.floor((b.armored||0)/4)));
  if(root===385){a.wishes.push({day:run.day,number:a.wins,triple:!!(f.tripleWish&&[7,14,20].includes(a.wins)),claimed:[]});if(b.luckyStars)add(2);}
  if(H.root()===399){add(Math.min(2,Math.floor((b.propKills||0)/3))+Math.min(1,b.zGold||0));heal=Math.max(heal,b.endHeal||0);}
  if(H.root()===415)a.honeyChoice={day:run.day,count:Math.min(10,(b.honey||0)+(a.honeyBank||0)),claimed:false},a.honeyBank=0;
  if(H.root()===489){add(Math.min(3,Math.floor(b.kills/30)));if(Math.random()<.3)a.scales++;}
  const originalIncome=report.totalGoldGained,debtPay=Math.min(a.debt,originalIncome);if(debtPay){run.gold=Math.max(0,run.gold-debtPay);a.debt-=debtPay;}if(debtPay>0&&a.debt===0&&!a.repaidBonus&&root===325&&f.largeLoan){a.repaidBonus=true;bonus+=2;}credit(bonus);report.hoennGold=bonus;report.hoennDebtPaid=debtPay;report.totalGoldGained+=bonus;run.hoennSettlement={bonus,heal,scales:root===370?Math.min(2,Math.floor(b.kills/30)):0,pearl:root===366?a.pearl:null,debtPaid:debtPay,items:[...run.hoennRewardItems]};
  if(heal)H.teamHeal(heal*(f.endHealMultiplier||1));applyHp();
 }
 function noteIncome(n){const r=R();if(r.phase==='loot'&&r.settlement){r.settlement.hoennGold=(r.settlement.hoennGold||0)+n;r.settlement.totalGoldGained+=n;if(r.hoennSettlement)r.hoennSettlement.bonus+=n;}}
 function claimGem(kind){const a=m(),g=a.gemChoice;if(!g||g.claimed||!['gold','heal'].includes(kind))return false;g.claimed=true;if(kind==='gold'){const n=Math.min(H.f().ruby?3:2,g.count);credit(n);noteIncome(n);}else{H.teamHeal(g.count*.02);for(const p of G.Squad.actors())G.LeaderAbilities._z.shield(p,p.maxHp*g.count*.01*(H.f().ruby?2:1));}return true;}
 function wish(choice,p=R().captain,move=p?.moves[0]){if(!enabled()||H.root()!==385||!['gold','free','skill'].includes(choice))return false;const a=m(),w=a.wishes.find(w=>w.triple?w.claimed.length<3:!w.claimed.length);if(!w||w.claimed.includes(choice))return false;if(choice==='skill'&&(!owns(p)||!p.moves.includes(move)))return false;
  w.claimed.push(choice);if(choice==='gold'){credit(5);if(w.day===R().day)noteIncome(5);}if(choice==='free')a.pendingFreeBudget=(a.pendingFreeBudget||0)+6;if(choice==='skill'){while(move.lvl<5)G.Moves.levelUp(move);H.teamHeal(.2);}if(H.f().wishStats)a.wishGrowth=Math.min(.1,a.wishGrowth+H.f().wishStats);return true;}
 function sellPearl(){if(!enabled()||H.root()!==366||R().phase!=='shop'||m().pearlSold)return false;credit(m().pearl);m().pearlSold=true;return true;}
 const pearlSold=()=>enabled()&&H.root()===366&&!!m().pearlSold,revengePending=()=>enabled()&&H.root()===352&&!!m().revenge,statBonus=key=>enabled()?(m().honeyGrowth||0)+m().wishGrowth+(['atk','spa'].includes(key)?m().bananaGrowth:0):0;
 function addCoupon(){if(enabled()&&H.root()===493)m().coupons=(m().coupons||0)+1;}
 function addFlatHp(n,cap=50){const a=m(),before=a.devourHp||0,gain=Math.min(n,Math.max(0,cap-before));a.devourHp=before+gain;a.flatHp+=gain;applyHp();}
 function claimHoney(kind){if(!enabled()||H.root()!==415||!['gold','stats'].includes(kind))return false;const a=m(),h=a.honeyChoice;if(!h||h.claimed||!h.count)return false;h.claimed=true;if(kind==='gold'){const gold=Math.min(H.f().royalHoney?3:2,h.count);credit(gold);noteIncome(gold);}else a.honeyGrowth=Math.min(.1,(a.honeyGrowth||0)+Math.min(.01,h.count*.001));return true;}
 return {engine,addCoupon,addFlatHp,claimHoney,advanced,enabled,m,price,limit,plan,canPay,pay,credit,ownerKey,tradePool,enterShop,rolled,buy,upgrade,sell,applyHp,captureBattle,settle,claimGem,wish,sellPearl,pearlSold,revengePending,statBonus};
})();
