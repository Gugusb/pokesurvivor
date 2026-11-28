/* Account-wide expedition honors. Only final day-60 clears award progress. */
G.LeagueRank=(()=>{
  const TIERS=[
    ['初阶训练家','Novice Trainer','Entrenador novel','#708090'],
    ['徽章挑战者','Badge Challenger','Aspirante a medallas','#cd7f32'],
    ['王牌训练家','Ace Trainer','Entrenador de élite','#c0c0c0'],
    ['道馆馆主级','Gym Leader Tier','Líder de gimnasio','#ffd700'],
    ['联盟准天王','Premier Elite','Aspirante al Alto Mando','#9932cc'],
    ['四天王级','Elite Four Tier','Alto Mando','#e5e4e2'],
    ['联盟冠军级','Champion Tier','Campeón de la Liga','#ff4500'],
    ['殿堂大师','Hall of Fame Master','Maestro del Salón de la Fama','#00ffff']
  ].map(([zh,en,es,color],i)=>({tier:i+1,name:{zh,en,es},color}));
  const local=x=>x?.[G.I18n?.lang]||x?.en||x;
  const validId=id=>typeof id==='string'&&/^[\w-]{8,100}$/.test(id);
  function records(s){
    const out=Object.create(null),source=s?.leagueRank?.results;
    if(source&&typeof source==='object'&&!Array.isArray(source))for(const [id,r]of Object.entries(source)){
      if(!validId(id)||!r||!['stars','protocol'].includes(r.kind)||!Number.isSafeInteger(r.award)||r.award<1||r.award>(r.kind==='stars'?4:1)||!Number.isFinite(r.hp)||r.hp<=0||r.hp>10000)continue;
      out[id]={kind:r.kind,award:r.award,hp:r.hp,at:Number.isFinite(r.at)?Math.max(0,r.at):0};
    }
    return out;
  }
  function normalize(s){if(!s)return {v:1,results:{}};s.leagueRank={v:1,results:records(s)};return s.leagueRank;}
  function view(s){
    const list=Object.values(records(s)),points=Math.min(21,list.reduce((n,r)=>n+(r.kind==='stars'?r.award:0),0)),tier=Math.min(8,1+Math.floor(points/3)),protocol=tier===8?Math.min(20,list.filter(r=>r.kind==='protocol').length):0;
    return {tier,stars:tier===8?3:points%3,points,protocol,color:protocol?'#ff007f':TIERS[tier-1].color,name:local(TIERS[tier-1].name),maxed:protocol===20};
  }
  function merge(a,b){const result=records(a);for(const [id,r]of Object.entries(records(b)))if(!result[id]||r.at<result[id].at)result[id]=r;return {leagueRank:{v:1,results:result}};}
  function preview(s,run,options={}){
    const before=view(s),hp=Number.isFinite(run?.squadHp)?run.squadHp:null,id=options.id||'',duplicate=!!records(s)[id],protocolRun=(run?.leagueTier??before.tier)>=8;
    const diff=Number.isInteger(options.stars)?options.stars:Number.isInteger(run?.stars)?run.stars:before.tier;
    const lowDiff=before.tier>=4&&diff<before.tier;
    const reason=!options.clean?'excluded':options.alive!==true||!(hp>0)?'defeat':!run?.arceus||run.day<60?'incomplete':hp>10000||protocolRun&&before.tier<8?'invalid':before.maxed?'maxed':duplicate?'duplicate':lowDiff?'difficulty':'cleared';
    const grade=hp>=70?'SSS':hp>=40?'S':'A',kind=protocolRun?'protocol':'stars';
    const baseAward=reason==='cleared'?(kind==='protocol'?1:hp>=70?3:hp>=40?2:1):0;
    const bonus=reason==='cleared'&&kind==='stars'&&before.tier<diff?1:0,award=baseAward+bonus;
    const points=Math.min(21,before.points+(kind==='stars'?award:0)),protocol=kind==='protocol'?Math.min(20,before.protocol+award):before.protocol;
    const after={...before,points,tier:Math.min(8,1+Math.floor(points/3)),protocol};after.stars=after.tier===8?3:points%3;after.name=local(TIERS[after.tier-1].name);after.color=protocol?'#ff007f':TIERS[after.tier-1].color;after.maxed=protocol===20;
    const applied=kind==='stars'?points-before.points:protocol-before.protocol;
    return {id,reason,hp,diff,bonus,grade:reason==='cleared'?grade:null,kind,award,applied,before,after,promoted:after.tier>before.tier||after.protocol>before.protocol};
  }
  const TIER_REWARDS = { 2: 1000, 3: 1500, 4: 3000, 5: 4000, 6: 5000, 7: 6000, 8: 8000, p1: 10000 };
  const TIER_MILESTONES = {
    2: { key: '2', coins: 1000 },
    3: { key: '3', coins: 1500 },
    4: { key: '4', coins: 3000, title: { id: 'rank:r4', zh: '道馆馆主', en: 'Gym Leader', es: 'Líder de gimnasio' } },
    5: { key: '5', coins: 4000, title: { id: 'rank:r5', zh: '联盟准天王', en: 'Premier Elite', es: 'Aspirante al Alto Mando' } },
    6: { key: '6', coins: 5000, title: { id: 'rank:r6', zh: '联盟四天王', en: 'Elite Four', es: 'Alto Mando' } },
    7: { key: '7', coins: 6000, title: { id: 'rank:r7', zh: '联盟冠军', en: 'League Champion', es: 'Campeón de la Liga' }, frame: { id: 'rank_r7', zh: '炽焰冠军框', en: 'Champion Flame Frame', es: 'Marco Llama de Campeón' } },
    8: { key: '8', coins: 8000, title: { id: 'rank:r8', zh: '殿堂大师', en: 'Hall of Fame Master', es: 'Maestro del Salón de la Fama' }, frame: { id: 'rank_r8', zh: '星辰殿堂框', en: 'Hall of Fame Aura Frame', es: 'Marco Salón de la Fama' } },
    p1: { key: 'p1', coins: 10000, title: { id: 'rank:p1', zh: '冠军之路开拓者', en: 'Champion Road Trailblazer', es: 'Pionero del Camino del Campeón' } }
  };
  const milestone = key => TIER_MILESTONES[String(key)] || null;
  function unlockedTitles(s){
    const v=view(s),out=[];
    for(let t=4;t<=v.tier;t++){const m=TIER_MILESTONES[t];if(m?.title)out.push({...m.title,tier:t,label:local(m.title)});}
    if(v.protocol>=1&&TIER_MILESTONES.p1?.title)out.push({...TIER_MILESTONES.p1.title,tier:9,label:local(TIER_MILESTONES.p1.title)});
    return out;
  }
  function unlockedFrames(s){
    const v=view(s),out=[];
    for(let t=7;t<=v.tier;t++){const m=TIER_MILESTONES[t];if(m?.frame)out.push({...m.frame,tier:t,label:local(m.frame)});}
    return out;
  }
  function syncRewards(s){
    if(!s)return {granted:0,items:[],titles:[],frames:[]};
    s.leagueRankRewards=s.leagueRankRewards&&typeof s.leagueRankRewards==='object'&&!Array.isArray(s.leagueRankRewards)?s.leagueRankRewards:{};
    const v=view(s),items=[],titles=[],frames=[];let granted=0;
    for(let t=2;t<=v.tier;t++){
      const key=String(t),m=TIER_MILESTONES[key];
      if(!s.leagueRankRewards[key]&&TIER_REWARDS[key]){
        s.leagueRankRewards[key]=TIER_REWARDS[key];
        s.leagueCoins=(s.leagueCoins||0)+TIER_REWARDS[key];
        granted+=TIER_REWARDS[key];items.push({key:'R'+t,amount:TIER_REWARDS[key],title:m?.title?local(m.title):null,frame:m?.frame?local(m.frame):null});
      }
      if(m?.title){s.titles||=[];const lbl=local(m.title);if(!s.titles.includes(m.title.id)&&!s.titles.includes(lbl)){s.titles.push(m.title.id);titles.push(m.title.id);}}
      if(m?.frame){s.avatarFrames||=[];if(!s.avatarFrames.includes(m.frame.id)){s.avatarFrames.push(m.frame.id);frames.push(m.frame.id);}}
    }
    if(v.protocol>=1){
      if(!s.leagueRankRewards.p1){
        s.leagueRankRewards.p1=TIER_REWARDS.p1;
        s.leagueCoins=(s.leagueCoins||0)+TIER_REWARDS.p1;
        granted+=TIER_REWARDS.p1;items.push({key:'R8+',amount:TIER_REWARDS.p1,title:local(TIER_MILESTONES.p1.title),frame:null});
      }
      s.titles||=[];
      if(!s.titles.includes(TIER_MILESTONES.p1.title.id)){s.titles.push(TIER_MILESTONES.p1.title.id);titles.push(TIER_MILESTONES.p1.title.id);}
    }
    return {granted,items,titles,frames};
  }
  function settle(s,run,options={}){
    normalize(s);const r=preview(s,run,options);
    if(!validId(r.id))return {...r,reason:'invalid',award:0,applied:0,after:r.before,promoted:false,leagueCoinsGranted:0};
    if(r.applied>0)s.leagueRank.results[r.id]={kind:r.kind,award:r.award,hp:r.hp,at:options.at??Date.now()};
    const rw=syncRewards(s);
    return {...r,leagueCoinsGranted:rw.granted,leagueRewardItems:rw.items,leagueTitlesGranted:rw.titles,leagueFramesGranted:rw.frames};
  }
  function rules(input=G.Expedition?.run){const tier=typeof input==='number'?input:input?.leagueTier??view(G.DB?.save).tier;return {tier,skill:true,types:tier>=2,traits:tier>=3,'pokemon-training':tier>=3,training:true,eggs:tier>=4,eggTags:tier>=3,talents:true,advancedFruits:tier>=4,pityEvery:tier===1?4:tier===2?8:0,companionChance:tier===1?.6:tier===2?.4:null};}
  const allows=(key,input)=>rules(input)[key]!==false;
  function filterMap(run){for(const row of run.map||[])for(const c of row)if(!allows(c.kind,run))c.kind='rest';}
  function pityShop(run,pool,offers,members=G.Squad.roster,rng=Math.random){
    const n=rules(run).pityEvery;if(!n||!run.rankRefreshCount||run.rankRefreshCount%n)return false;
    const roots=new Set(members.map(p=>G.MonProgression.rootFor(p.dex)));if(offers.some(o=>o&&!o.sold&&roots.has(G.MonProgression.rootFor(o.dex))))return true;
    const card=pool.drawOwned(members,rng);if(!card)return false;pool.putBack(offers[0]);offers[0]=card;return true;
  }
  return {rules,allows,filterMap,pityShop,TIERS,TIER_REWARDS,TIER_MILESTONES,milestone,unlockedTitles,unlockedFrames,syncRewards,local,normalize,view,merge,preview,settle};
})();
