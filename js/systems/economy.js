/* Run-local economy. Combat drops are credited once, after pickup collection. */
G.Economy=(()=>{
  const config=()=>G.EconomyConfig;
  // Display whole spendable gold without changing fractional accounting.
  const formatGold=value=>Math.floor(Number(value)||0).toLocaleString(G.I18n?.lang==='zh'?'zh-CN':G.I18n?.lang||'en');
  const events={battle:'NORMAL_BATTLE',elite:'ELITE_BATTLE',boss:'BOSS_BATTLE',shop:'SHOP','item-shop':'SHOP',peddler:'SHOP',training:'SKILL_TRAINING','pokemon-training':'POKEMON_TRAINING',wild:'WILD_EXPEDITION',rest:'REST'};
  const levelRow=level=>config().levels.find(row=>row.level===level)||config().levels.at(-1);
  const maxLevel=()=>config().levels.at(-1).level;
  const interest=(gold,s=G.Expedition?.run)=>{const terms=G.LeaderKalos?.interest(s);return Math.max(0,Math.min(terms?.cap??G.TrainerTalents?.maxInterest(s)??config().interest.maxInterest,Math.floor(gold/(terms?.divisor||G.TrainerTalents?.interestDivisor(s)||config().interest.divisor))));};
  const capacity=s=>levelRow(s.trainerLevel).squadCap+(s.extraPopPurchases||0)+(s.hasPopCapItem?1:0);
  const refreshCost=s=>(G.LeaderAbilities?.refreshCost||((v)=>v))(Math.max(1,(s.cycle>=config().endless.unlockCycle+1?config().shop.endlessCycle5PlusRefreshCost:config().shop.baseRefreshCost)-(G.TrainerTalents?.refreshDiscount(s)||0)));
  const licenseCost=s=>config().endless.extraPopLicenseBaseCost+config().endless.extraPopLicenseStepCost*s.extraPopPurchases;
  const overclockCost=s=>config().endless.skillOverclockBaseCost+config().endless.skillOverclockStepCost*s.skillOverclockCount;
  function create(){return {...config().initial,cycle:1,extraPopPurchases:0,flawlessStreak:0,skillOverclockCount:0,settledDays:new Set()};}
  function addXp(s,amount){
    const gain=Math.max(0,amount);
    const old=s.trainerLevel;s.trainerXp+=gain;
    while(s.trainerLevel<maxLevel(s)&&s.trainerXp>=levelRow(s.trainerLevel).xpToNext){s.trainerXp-=levelRow(s.trainerLevel).xpToNext;s.trainerLevel++;G.TrainerTalents?.onLevelUp(s,s.trainerLevel);}
    if(s.trainerLevel===config().levels.at(-1).level)s.trainerXp=0;
    else if(s.trainerLevel===maxLevel(s))s.trainerXp=Math.min(s.trainerXp,levelRow(s.trainerLevel).xpToNext);
    if(gain>0&&s===G.Expedition?.run)G.SquadTraits?.trainerXpGained?.(gain);
    return s.trainerLevel!==old?s.trainerLevel:null;
  }
  function buyXp(){return false;}
  function buyLicense(s){if(s.phase!=='shop'||s.cycle<config().endless.unlockCycle||s.trainerLevel!==config().levels.at(-1).level||s.gold<licenseCost(s))return false;s.gold-=licenseCost(s);s.extraPopPurchases++;return true;}
  function buyPopCap(s){const tier=config().itemTiers.POP_CAP;if(s.phase!=='shop'||s.trainerLevel<tier.unlockLevel||s.hasPopCapItem||s.gold<tier.price)return false;s.gold-=tier.price;s.hasPopCapItem=true;return true;}
  function overclock(s){if(s.phase!=='training'||s.trainingUsed||s.cycle<config().endless.unlockCycle)return false;s.skillOverclockCount++;s.trainingUsed=true;return true;}
  function settle(s,input){
    const eventType=events[input.eventType]||input.eventType;
    const report={baseWage:0,interest:0,streakBonus:0,comebackBounty:0,eliteFlawlessBonus:0,inWaveDrops:0,totalGoldGained:0,xpGained:0,baseXp:0,clearXpBonus:0,leveledUpTo:null,grantFreePostBossShop:false};
    const combat=Object.hasOwn(config().wagesByCycle['1'],eventType);
    if(!combat||input.victory){report.investmentReturn=G.TrainerTalents?.repayInvestments(s)||0;report.totalGoldGained+=report.investmentReturn;}
    if(combat){
      if(!input.victory)return report;
      report.baseWage=config().wagesByCycle[s.cycle>=config().endless.unlockCycle?'4_plus':String(s.cycle)][eventType];
      report.baseWage+=G.TrainerTalents?.wage(s)||0;report.interest=interest(input.lockedGoldAtBattleStart,s);
      if(input.remainingHpRatio>=config().streak.flawlessHpThreshold){
        s.flawlessStreak++;report.streakBonus=config().streak.tiers.find(t=>s.flawlessStreak>=t.minStreak&&(s.flawlessStreak<=t.maxStreak||t===config().streak.tiers.at(-1)))?.bonus||0;
        if(eventType==='ELITE_BATTLE')report.eliteFlawlessBonus=config().streak.eliteFlawlessBonus;
      }else{s.flawlessStreak=0;if(input.remainingHpRatio<config().streak.comebackHpThreshold)report.comebackBounty=config().streak.comebackBounty;}
      report.inWaveDrops=config().combatGoldDrops?Math.max(0,Number(input.inWaveCoinDrops)||0):0;
      report.totalGoldGained=report.investmentReturn+report.baseWage+report.interest+report.streakBonus+report.comebackBounty+report.eliteFlawlessBonus+report.inWaveDrops;s.gold+=report.totalGoldGained-report.investmentReturn;
      report.grantFreePostBossShop=eventType==='BOSS_BATTLE';report.traitGold=s.traitBattleRewards?.gold||0;report.totalGoldGained+=report.traitGold;
    }
    report.baseXp=config().freeXpByEvent[eventType]||0;report.clearXpBonus=eventType==='ELITE_BATTLE'&&input.victory&&input.cleared===true?config().eliteClearBonusXp:0;report.xpGained=report.baseXp+report.clearXpBonus+(combat&&input.victory?(G.TrainerTalents?.battleReward(s)||0):0);report.leveledUpTo=addXp(s,report.xpGained);if(combat&&input.victory){report.traitXp=s.traitBattleRewards?.exp||0;report.xpGained+=report.traitXp;}G.HoennMarket?.settle(s,input,report);return report;
  }
  function settleDay(s,input){if(s.settledDays.has(s.day))return s.settlement;s.settledDays.add(s.day);return s.settlement=settle(s,input);}
  return {config,formatGold,events,create,levelRow,maxLevel,interest,capacity,refreshCost,licenseCost,overclockCost,addXp,buyXp,buyLicense,buyPopCap,overclock,settle,settleDay};
})();
