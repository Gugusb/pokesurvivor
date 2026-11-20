/* Run-only tag counts and independent bond stacks. No account data is written. */
G.SquadBonds=(()=>{
  const KINDS=['projectile','melee','beam','orbit','chain'];
  let layers=Object.create(null),signature='',counts=new Map(),revision=0;
  const key=(category,id)=>category+':'+id;
  function reset(){layers=Object.create(null);signature='';counts=new Map();revision++;}
  function refresh(){
    const team=G.Squad?.active?G.Squad.actors():[],next=team.map(p=>p.mon.name+':'+p.mon.types.join(',')+':'+(G.EGG_GROUPS[p.dex]||[15]).join(',')+':'+p.moves.map(m=>m.kind).join(',')).join('|');
    if(next===signature)return;signature=next;revision++;const names=new Map();
    for(const p of team){
      const tags={types:p.mon.types,eggs:G.EGG_GROUPS[p.dex]||[15],skill:p.moves.map(m=>m.kind)};
      for(const category of Object.keys(tags))for(const id of new Set(tags[category])){
        const k=key(category,id);if(!names.has(k))names.set(k,new Set());names.get(k).add(p.mon.name);
      }
    }
    counts=new Map([...names].map(([k,n])=>[k,n.size]));
  }
  function count(category,id){return counts.get(key(category,id))||0;}
  function layer(category,id){return layers[key(category,id)]??(category==='types'?0:1);}
  function setLayer(category,id,n){
    const valid=category==='types'?Object.hasOwn(G.U.TYPE_NAME,id):category==='eggs'?Number.isInteger(+id)&&+id>=1&&+id<=15:category==='skill'&&G.Moves.ALL.some(m=>m.kind===id);
    if(!G.Squad?.active||!valid||!Number.isSafeInteger(n)||n<0||n>10000)return false;
    if(layers[key(category,id)]!==n)revision++;layers[key(category,id)]=n;return true;
  }
  const scale=n=>n>0?1+.25*Math.log2(n):0;
  function state(kind){const n=count('skill',kind),l=layer('skill',kind);return {count:n,layers:l,tier:!KINDS.includes(kind)||!l?0:n>=6?6:n>=3?3:0,scale:scale(l)};}
  const applies=(p,m)=>!!p?.isSquadMember&&G.Squad?.active&&G.Squad.deployed().includes(p)&&!m?.zMove;
  function stats(p,m){return applies(p,m)?state(m?.kind):{count:0,layers:0,tier:0,scale:0};}
  function agility(p,m){const b=stats(p,m);return 1+(b.tier&&m.kind==='projectile'?.25*b.scale:b.tier===6&&m.kind==='chain'?.3*b.scale:0);}
  function stamina(p,m){const b=stats(p,m);return 1+(b.tier&&m.kind==='projectile'?.25*b.scale:0);}
  function sustain(p,m){const b=stats(p,m);return 1+(b.tier&&m.kind==='orbit'?.35*b.scale:0);}
  function move(p,m){
    if(m.bondApplied||!applies(p,m))return m;const b=stats(p,m);if(!b.tier)return m;
    const v={...m,bondApplied:true,bondScale:b.scale,bondTier:b.tier};
    if(m.kind==='projectile'&&b.tier===6)v.bondUnstable=true;
    if(m.kind==='melee')v.radius=m.radius*(1+.2*b.scale);
    if(m.kind==='beam'){v.radius=m.radius*(1+.35*b.scale);v.bondSustain=b.tier===6;}
    if(m.kind==='orbit'&&b.tier===6){v.speed=m.speed*(1+.6*b.scale);v.slow=Math.max(m.slow||0,Math.min(.65,.2*b.scale));}
    if(m.kind==='chain'){v.count=(m.count||1)+Math.max(1,Math.floor(2*b.scale));v.bondChain=b.tier===6;}
    return v;
  }
  function meleeDamage(p,m,n){const b=stats(p,m);return b.tier===6?1+Math.min(.8*b.scale,Math.max(0,n-1)*.06*b.scale):1;}
  function description(kind){
    const lang=G.I18n.lang,L=(es,en,zh)=>lang==='zh'?zh:lang==='en'?en:es;
    return ({
      projectile:L('3: agilidad y aguante de proyectiles. 6: impactos inestables.','3: projectile agility and stamina. 6: unstable impacts.','3：投射物敏捷、耐力提高。6：命中随机触发不稳定效果。'),
      melee:L('3: más alcance. 6: más daño entre multitudes.','3: wider melee range. 6: more damage among crowds.','3：近战范围扩大。6：范围内敌人越多，额外伤害越高。'),
      beam:L('3: rayos más largos. 6: canaliza con PP.','3: longer beams. 6: channel by spending PP.','3：能量柱更长。6：持续消耗PP维持光柱。'),
      orbit:L('3: cada PP mantiene la órbita más tiempo. 6: gira más rápido y ralentiza.','3: each PP sustains orbits longer. 6: faster rotation and slowing.','3：环绕每次消耗PP后维持更久。6：旋转加快，并减速目标。'),
      chain:L('3: más saltos. 6: saltos retardados, breve pausa y más agilidad.','3: more jumps. 6: delayed jumps, a brief stagger and more agility.','3：连锁数量提高。6：敏捷提高，延迟连锁使目标短暂停顿，可同时释放新连锁。')
    })[kind]||L('Efecto por diseñar','Effect awaiting design','羁绊效果待设计');
  }
  return {KINDS,reset,refresh,count,layer,setLayer,state,stats,scale,agility,stamina,sustain,move,meleeDamage,description,get revision(){return revision;}};
})();
