/* Run-wide companion rewards and level growth. */
G.ExpeditionGrowth=(()=>{
  const KEYS=['hp','atk','spa'];
  let berries={};
  const ALL_STATS=['hp','atk','spa','defense','spdef','spd','agility','stamina'];
  const L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
  const people=()=>G.Squad?.active?[...G.Squad.actors(),...G.Squad.reserves()]:[];
  function fruits(create=false){const r=G.Expedition?.run;if(!G.Squad?.active||!r)return null;if(create)r.fruitBonuses||={crit:0,critDamage:0,types:{},skills:{},slots:{},nextPP:0};return r.fruitBonuses;}
  const belongs=p=>!!p&&people().includes(p);
  const crit=p=>belongs(p)?(fruits()?.crit||0)*.01:0;
  const critDamage=p=>belongs(p)?(fruits()?.critDamage||0)*.02:0;
  function damageFactor(p,m={}){const f=fruits();return !f||!belongs(p)?1:1+.01*((p.mon.types||[]).reduce((n,t)=>n+(f.types?.[t]||0),0)+(f.skills?.[G.SquadBonds.group(m.kind)]||0));}
  const buffFactor=(p,m)=>m.kind==='buff'&&belongs(p)?1+.01*(fruits()?.skills?.buff||0):1;
  function fruitReward(kind,target){
    const f=fruits(true);if(!f)return false;
    if(kind==='crit'||kind==='critDamage')f[kind]=(f[kind]||0)+1;
    else if(kind==='type'&&Object.hasOwn(G.U.TYPE_NAME,target)){f.types||={};f.types[target]=(f.types[target]||0)+1;}
    else if(kind==='skill'&&G.SquadBonds.KINDS.includes(target)){f.skills||={};f.skills[target]=(f.skills[target]||0)+1;}
    else if(kind==='slot'&&Number.isInteger(target)&&target>=2&&target<=G.Squad.capacity){f.slots||={};f.slots[target]=(f.slots[target]||0)+1;}
    else if(kind==='hormone')f.nextPP=(f.nextPP||0)+10;
    else return false;
    sync();return true;
  }
  function syncSlot(p){
    const index=G.Squad.formation.indexOf(p),amount=p.isSquadMember&&index>=0?.01*(fruits()?.slots?.[index+2]||0):0,delta=amount-(p.expeditionSlotGrowth||0);if(!delta)return;
    const ratio=p.dead?0:p.hp/p.maxHp;
    for(const key of ALL_STATS)p.growStat(key,delta);
    p.maxHp=Math.max(1,p.maxHp);p.hp=p.dead?0:Math.max(.001,Math.min(p.maxHp,p.maxHp*ratio));p.expeditionSlotGrowth=amount;
  }
  function spendTemp(p,n){const used=Math.min(Math.max(0,n),p.tempPP||0);p.tempPP=Math.max(0,(p.tempPP||0)-used);p.hormonePP=Math.max(0,(p.hormonePP||0)-used);}
  function endBattle(){for(const p of people()){p.tempPP=Math.max(0,(p.tempPP||0)-(p.hormonePP||0));p.hormonePP=0;}}
  function beginBattle(){endBattle();const f=fruits(),n=f?.nextPP||0;if(!n)return;for(const p of G.Squad.actors()){p.tempPP=(p.tempPP||0)+n;p.hormonePP=n;}f.nextPP=0;}
  function levelCards(){
    if(!fruits())fruits(true);
    const card=(kind,title,desc,tag=L('Todo el equipo','Whole squad','全队'))=>({w:1,category:'stat',type:'stat',key:'fruit:'+kind,icon:kind==='slot'?'cards':'berry',color:'#d7acdc',title,desc,tag,apply:()=>fruitReward(kind)});
    const taken=G.DB?.save?G.CardPacks.normalize(G.DB.save).taken:{};
    const cards=[card('crit',L('Baya Crítica','Crit Fruit','暴击果实'),L('Equipo: crítico +1%.','Team crit chance +1%.','全队暴击率+1%')),card('critDamage',L('Baya Potente','Crit Damage Fruit','爆伤果实'),L('Equipo: daño crítico +2%.','Team crit damage +2%.','全队暴击伤害+2%'))].filter(c=>taken[c.key]);
    const targets=kind=>kind==='type'?Object.keys(G.U.TYPE_NAME).filter(k=>taken['fruit:type:'+k]||taken['fruit:type']):kind==='skill'?G.SquadBonds.KINDS.filter(k=>taken['fruit:skill:'+k]||taken['fruit:skill']):Array.from({length:Math.max(0,G.Squad.capacity-1)},(_,i)=>i+2).filter(k=>taken['fruit:slot:'+k]||taken['fruit:slot']);
    const unlocked=kind=>(G.LeagueRank?.allows('advancedFruits')??true)&&(kind==='hormone'?taken['fruit:hormone']:targets(kind).length>0);
    const biased=(pool,present)=>G.U.pick(pool.flatMap(k=>present.has(k)?[k,k,k]:[k]));
    for(const kind of ['type','skill','slot'])if(unlocked(kind)){
      const c=card(kind,L('Mejora','Upgrade','成长'),'');c.materialize=()=>{
        const target=kind==='type'?biased(targets(kind),new Set(people().flatMap(p=>p.mon.types))):kind==='skill'?biased(targets(kind),new Set(people().flatMap(p=>p.moves.map(m=>G.SquadBonds.group(m.kind))))):G.U.pick(targets(kind));
        const label=kind==='type'?G.T(G.U.TYPE_NAME[target]):kind==='skill'?G.SquadBonds.label(target):String(target);
        const title=kind==='type'?L('Baya de Tipo','Type Fruit','属性果实'):kind==='skill'?L('Baya Técnica','Skill Fruit','技能果实'):L('Mejora de Puesto','Slot Upgrade','槽位改造');
        const desc=kind==='type'?L(label+': daño +1%.',label+' Pokémon damage +1%.',label+'属性宝可梦伤害+1%'):kind==='skill'?target==='buff'?L('Apoyo: efecto +1%.','Support skill effect +1%.','辅助技能效果+1%'):L(label+': daño +1%.',label+' skill damage +1%.',label+'技能伤害+1%'):L('Puesto '+label+': atributos +1%.','Slot '+label+': all stats +1%.',label+'号位全属性+1%');
        return {...c,materialize:null,title,desc,target,tag:kind==='slot'?L('Puesto '+label,'Slot '+label,label+'号位'):kind==='type'?L('Tipo '+label,label+' type',label+'属性'):label,color:kind==='type'?G.U.TYPE_COLOR[target]:c.color,apply:()=>fruitReward(kind,target)};
      };
      if(kind!=='slot'||G.Squad.capacity>1)cards.push(c);
    }
    if(unlocked('hormone'))cards.push(card('hormone',L('Baya Hormona','Hormone Fruit','激素果实'),L('Próximo combate: equipo +10 PP temporales.','Next battle: team +10 temporary PP.','下场战斗全队临时PP+10'),L('Se consume al combatir','Consumed next battle','下场消耗')));
    return cards;
  }

  function sync(p){
    if(!G.Squad?.active)return;
    const list=p?[p]:[...G.Squad.actors(),...G.Squad.reserves()];
    for(const a of list){
      const level=G.Game?.player?.level||G.Squad.actors()[0]?.level||a.level;
      const desired={...(a.isSquadMember?berries:{})};
      const levelsGained=Math.max(0,level-1);
      for(const key of KEYS){
        const perLevel=G.EconomyConfig.levelGrowth[key];
        desired[key]=(desired[key]||0)+levelsGained*perLevel;
      }
      const old=a.expeditionGrowth||{};
      for(const key of new Set([...Object.keys(old),...Object.keys(desired)])){
        const delta=(desired[key]||0)-(old[key]||0);if(!delta)continue;
        if(key==='maxpp')G.MovePP.increaseMax(a,delta);
        else if(key==='temppp')a.tempPP=Math.max(0,(a.tempPP||0)+delta);
        else a.growStat(key,delta);
      }
      if(a.dead)a.hp=0;
      a.expeditionGrowth=desired;syncSlot(a);
    }
  }
  function reset(){berries={};}
  function reward(stat,amount){const keys={hp:['hp'],attacks:['atk','spa'],defenses:['defense','spdef']}[stat];if(!G.Squad?.active||!keys||!Number.isFinite(amount)||amount<=0)return false;for(const key of keys)berries[key]=(berries[key]||0)+amount*.5;sync();return true;}
  return {restore:saved=>{berries={...saved};},KEYS,sync,reset,reward,fruits,fruitReward,levelCards,crit,critDamage,damageFactor,buffFactor,beginBattle,endBattle,spendTemp,get berries(){return {...berries};}};
})();
