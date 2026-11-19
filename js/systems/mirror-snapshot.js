/* Versioned, explicit combat-only mirror format. No account secrets or arbitrary player objects. */
G.MirrorSnapshot=(()=>{
  const CHECKPOINTS=[240,480,720,960,1200],VERSION=1;
  const BASE=['baseHp','baseAtk','baseSpa','baseDefense','baseSpDef','baseSpd','baseAgility','baseStamina'];
  const ATTR=['hp','atk','spa','defense','spdef','spd','agility','stamina'];
  const MOD=['atkMul','damageBonus','attackDebuff','attackDebuffT','spdMul','cdMul','dmgReduce','regenFlat','regenBase','critChance','critMul','maxPpBonus','ppRetention','tempPP','ppPotionReady','invuln','dashGuardT','slowT','slowAmount','bonds','specTokens'];
  const ABILITY=['safeTime','naturalReady','weatherTime','casts','haste','hasteT','sturdyUsed','stage','phaseInside','phaseT','contactCd','telepathyCd','kindleT','sandTick','justiceT','growthAtk','growthSpeed','growthCooldown','defenseFactor'];
  const round=n=>Math.round(n*1e6)/1e6;
  function numbers(object,keys,max=1e7){const out={};for(const key of keys){const n=object?.[key];if(typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=max)out[key]=round(n);}return out;}
  function make(p,meta,behavior){
    const moves=p.moves.map(m=>{const pp=G.MovePP?.state(p,m);return{id:m.id,level:m.lvl,evolved:!!m.evolved,cooldown:Math.max(0,m.t||0),specs:G.Specialization?.ids(m).slice()||[],pp:pp?numbers(pp,['current','max','limit','inertia']):{},releasing:!!G.MoveControl?.releasing(p,m),primary:!!p.isPrimaryMove(m),resolved:{...numbers(G.PlayerStats?.move(p,m)?.view,['dmg','cd','radius','width','count','pierce','speed','dur','range','size']),cooldown:G.PlayerStats?.cooldown(p,m)||m.cd}};});
    return normalize({schema:VERSION,...meta,dex:p.dex,ivDex:p.ivDex,level:p.level,ivs:p.levelIV,shiny:!!p.shiny,types:p.mon.types.slice(),path:p.evolutionPath||[p.dex],hp:p.hp,maxHp:p.maxHp,xp:p.xp,xpNext:p.xpNext,
      base:numbers(p,BASE),growth:numbers(p.statGrowth,ATTR),permanent:numbers(p.permanentGrowth,ATTR),modifiers:numbers(p,MOD),effective:{hp:p.maxHp,atk:p.atk,spa:p.spa,defense:p.defenseFor({kind:'contact'}),spdef:p.defenseFor({kind:'ranged'}),spd:p.spd,agility:p.agility,stamina:p.stamina},
      moves,slots:p.slots.map(g=>g.map(m=>m.id)),active:p.active,buffs:Object.fromEntries(Object.entries(p.buffs).map(([k,b])=>[k,numbers(b,['n','t','amount','dur'])])),
      ability:p.ability||null,abilityState:{...numbers(p.abilityState,ABILITY),naturalReady:p.abilityState?.naturalReady,sturdyUsed:p.abilityState?.sturdyUsed,phaseInside:p.abilityState?.phaseInside,confidence:(p.abilityState?.confidence||[]).slice(0,5)},items:p.specialItems,activeItem:p.activeItem||null,activeItemCd:p.activeItemCd||0,
      weather:G.Weather?.current?{kind:G.Weather.current.kind,left:G.Weather.current.left,suppressed:!!G.Weather.suppressed}:null,
      mega:p.megaState?{id:p.megaState.id,energy:p.megaState.energy,left:p.megaState.left,bonus:p.megaState.bonus}:null,
      z:p.zState?{type:p.zState.type,phase:p.zState.phase,charges:p.zState.charges,cooldown:p.zState.cooldown,elapsed:p.zState.elapsed,guard:p.zState.guard}:null,behavior});
  }
  function normalize(s){
    if(!s||s.schema!==VERSION||!CHECKPOINTS.includes(s.checkpoint)||!Number.isFinite(s.t)||s.t<s.checkpoint||s.t>s.checkpoint+2||!G.DEX_BY[s.dex]||!Number.isInteger(s.level)||s.level<1||s.level>1000||!Number.isFinite(s.maxHp)||s.maxHp<=0||s.maxHp>50000||!Number.isFinite(s.hp)||s.hp<=0||s.hp>s.maxHp+1||!Array.isArray(s.moves)||s.moves.length<1||s.moves.length>16||!Array.isArray(s.slots)||s.slots.length<1||s.slots.length>4||!Array.isArray(s.ivs)||s.ivs.length!==8||s.ivs.some(n=>!Number.isInteger(n)||n<0||n>31)||!Array.isArray(s.types)||!s.types.length||s.types.length>2)return null;
    const moves=[],ids=new Set();
    for(const m of s.moves){const d=G.Moves?.BY_ID[m.id];if(!d||ids.has(m.id)||!Number.isInteger(m.level)||m.level<1||m.level>d.maxLvl||!Array.isArray(m.specs)||m.specs.length>5||m.specs.some(id=>!/^([nt][1-9]|t1[0-3])$/.test(id)))return null;ids.add(m.id);moves.push({id:m.id,kind:d.kind,type:d.type,level:m.level,evolved:!!m.evolved,cooldown:Math.max(0,Math.min(3600,m.cooldown||0)),specs:m.specs.slice(),pp:numbers(m.pp,['current','max','limit','inertia'],10000),primary:!!m.primary,releasing:!!m.releasing,resolved:numbers(m.resolved,['dmg','cd','radius','width','count','pierce','speed','dur','range','size','cooldown'])});}
    const slots=[],seen=new Set();for(const group of s.slots){if(!Array.isArray(group)||!group.length||group.length>4)return null;const row=[];for(const id of group){if(!ids.has(id)||seen.has(id))return null;seen.add(id);row.push(id);}slots.push(row);}if(seen.size!==ids.size||!Number.isInteger(s.active)||s.active<0||s.active>=slots.length)return null;
    const stats=numbers(s.effective,ATTR);if(ATTR.some(k=>!(stats[k]>0)))return null;
    const TYPES=['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];if(s.types.some(t=>!TYPES.includes(t)))return null;
    const safeId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(v)?v:null;
    const items={};for(const [id,n]of Object.entries(s.items||{})){if(G.Items?.BY[id]&&Number.isSafeInteger(n)&&n>0&&n<=10000)items[id]=n;}
    const behavior={...numbers(s.behavior,['seconds','moving','primaryChanges','near','far','zCasts','damageTaken'],1e7),casts:{}};
    for(const [id,n]of Object.entries(s.behavior?.casts||{}))if(G.Moves?.BY_ID[id]&&Number.isInteger(n)&&n>=0&&n<100000)behavior.casts[id]=n;
    const kinds={};for(const m of moves)kinds[m.kind]=(kinds[m.kind]||0)+(behavior.casts[m.id]||0);
    const style=Object.entries(kinds).sort((a,b)=>b[1]-a[1])[0]?.[0]||moves[0].kind;
    const out={schema:VERSION,checkpoint:s.checkpoint,t:round(s.t),dex:s.dex,ivDex:G.DEX_BY[s.ivDex]?s.ivDex:s.dex,level:s.level,ivs:s.ivs.slice(),shiny:!!s.shiny,types:s.types.filter(x=>typeof x==='string'&&/^[a-z]{2,12}$/.test(x)),path:(s.path||[s.dex]).filter(d=>!!G.DEX_BY[d]).slice(0,12),hp:round(s.hp),maxHp:round(s.maxHp),...numbers(s,['xp','xpNext']),
      base:numbers(s.base,BASE),growth:numbers(s.growth,ATTR),permanent:numbers(s.permanent,ATTR),modifiers:numbers(s.modifiers,MOD),effective:stats,moves,slots,active:s.active,buffs:{},ability:safeId(s.ability),abilityState:numbers(s.abilityState,ABILITY),items,activeItem:['superpotion','pppotion','spiritspray'].includes(s.activeItem)?s.activeItem:null,activeItemCd:Math.max(0,Math.min(3600,s.activeItemCd||0)),behavior,style};
    for(const k of ['atk','def','spd','regen'])out.buffs[k]=numbers(s.buffs?.[k],['n','t','amount','dur']);
    for(const k of ['naturalReady','sturdyUsed','phaseInside'])if(typeof s.abilityState?.[k]==='boolean')out.abilityState[k]=s.abilityState[k];
    out.abilityState.confidence=(s.abilityState?.confidence||[]).filter(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=3600).slice(0,5);
    if(s.mega&&safeId(s.mega.id))out.mega={id:s.mega.id,...numbers(s.mega,['energy','left','bonus'],10000)};else out.mega=null;
    if(s.z&&safeId(s.z.type))out.z={type:s.z.type,phase:['ready','choose','cast'].includes(s.z.phase)?s.z.phase:'ready',...numbers(s.z,['charges','cooldown','elapsed','guard'],10000)};else out.z=null;
    out.weather=s.weather&&['snow','sun','rain','sand','fog'].includes(s.weather.kind)?{kind:s.weather.kind,...numbers(s.weather,['left'],3600),suppressed:!!s.weather.suppressed}:null;
    return out;
  }
  return{VERSION,CHECKPOINTS,make,normalize};
})();
