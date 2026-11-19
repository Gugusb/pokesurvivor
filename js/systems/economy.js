/* Run-local economy. Combat drops are credited once, after pickup collection. */
G.Economy=(()=>{
  const config=()=>G.EconomyConfig;
  const events={battle:'NORMAL_BATTLE',elite:'ELITE_BATTLE',boss:'BOSS_BATTLE',shop:'SHOP',training:'SKILL_TRAINING','pokemon-training':'POKEMON_TRAINING',wild:'WILD_EXPEDITION'};
  const levelRow=level=>config().levels.find(row=>row.level===level);
  const maxLevel=s=>s.cycle>=config().endless.unlockCycle?config().levels.at(-1).level:config().levels.at(-2).level;
  const interest=gold=>Math.max(0,Math.min(config().interest.maxInterest,Math.floor(gold/config().interest.divisor)));
  const capacity=s=>levelRow(s.trainerLevel).squadCap+(s.extraPopPurchases||0)+(s.hasPopCapItem?1:0);
  const refreshCost=s=>s.cycle>=config().endless.unlockCycle+1?config().shop.endlessCycle5PlusRefreshCost:config().shop.baseRefreshCost;
  const licenseCost=s=>config().endless.extraPopLicenseBaseCost+config().endless.extraPopLicenseStepCost*s.extraPopPurchases;
  const overclockCost=s=>config().endless.skillOverclockBaseCost+config().endless.skillOverclockStepCost*s.skillOverclockCount;
  function create(){return {...config().initial,cycle:1,extraPopPurchases:0,flawlessStreak:0,skillOverclockCount:0,settledDays:new Set()};}
  function addXp(s,amount){
    const old=s.trainerLevel;s.trainerXp+=Math.max(0,amount);
    while(s.trainerLevel<maxLevel(s)&&s.trainerXp>=levelRow(s.trainerLevel).xpToNext){s.trainerXp-=levelRow(s.trainerLevel).xpToNext;s.trainerLevel++;}
    if(s.trainerLevel===config().levels.at(-1).level)s.trainerXp=0;
    else if(s.trainerLevel===maxLevel(s))s.trainerXp=Math.min(s.trainerXp,levelRow(s.trainerLevel).xpToNext);
    return s.trainerLevel!==old?s.trainerLevel:null;
  }
  function buyXp(s){if(s.phase!=='shop'||s.trainerLevel>=maxLevel(s)||s.gold<config().buyXp.goldCost)return false;s.gold-=config().buyXp.goldCost;addXp(s,config().buyXp.xpGain);return true;}
  function buyLicense(s){if(s.phase!=='shop'||s.cycle<config().endless.unlockCycle||s.trainerLevel!==config().levels.at(-1).level||s.gold<licenseCost(s))return false;s.gold-=licenseCost(s);s.extraPopPurchases++;return true;}
  function buyPopCap(s){const tier=config().itemTiers.POP_CAP;if(s.phase!=='shop'||s.trainerLevel<tier.unlockLevel||s.hasPopCapItem||s.gold<tier.price)return false;s.gold-=tier.price;s.hasPopCapItem=true;return true;}
  function overclock(s){if(s.phase!=='training'||s.trainingUsed||s.cycle<config().endless.unlockCycle)return false;s.skillOverclockCount++;s.trainingUsed=true;return true;}
  function settle(s,input){
    const eventType=events[input.eventType]||input.eventType;
    const report={baseWage:0,interest:0,streakBonus:0,comebackBounty:0,eliteFlawlessBonus:0,inWaveDrops:0,totalGoldGained:0,xpGained:0,leveledUpTo:null,grantFreePostBossShop:false};
    const combat=Object.hasOwn(config().wagesByCycle['1'],eventType);
    if(combat){
      if(!input.victory)return report;
      report.baseWage=config().wagesByCycle[s.cycle>=config().endless.unlockCycle?'4_plus':String(s.cycle)][eventType];
      report.interest=interest(input.lockedGoldAtBattleStart);
      if(input.remainingHpRatio>=config().streak.flawlessHpThreshold){
        s.flawlessStreak++;report.streakBonus=config().streak.tiers.find(t=>s.flawlessStreak>=t.minStreak&&(s.flawlessStreak<=t.maxStreak||t===config().streak.tiers.at(-1)))?.bonus||0;
        if(eventType==='ELITE_BATTLE')report.eliteFlawlessBonus=config().streak.eliteFlawlessBonus;
      }else{s.flawlessStreak=0;if(input.remainingHpRatio<config().streak.comebackHpThreshold)report.comebackBounty=config().streak.comebackBounty;}
      report.inWaveDrops=config().combatGoldDrops?Math.max(0,Number(input.inWaveCoinDrops)||0):0;
      report.totalGoldGained=report.baseWage+report.interest+report.streakBonus+report.comebackBounty+report.eliteFlawlessBonus+report.inWaveDrops;s.gold+=report.totalGoldGained;
      report.grantFreePostBossShop=eventType==='BOSS_BATTLE';
    }
    report.xpGained=config().freeXpByEvent[eventType]||0;report.leveledUpTo=addXp(s,report.xpGained);return report;
  }
  function settleDay(s,input){if(s.settledDays.has(s.day))return s.settlement;s.settledDays.add(s.day);return s.settlement=settle(s,input);}
  return {config,events,create,levelRow,maxLevel,interest,capacity,refreshCost,licenseCost,overclockCost,addXp,buyXp,buyLicense,buyPopCap,overclock,settle,settleDay};
})();
