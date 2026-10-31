/* Read-only breakdowns of the same values consumed by combat. */
G.PlayerStats=(()=>{
  const fmt=n=>Number.isFinite(n)?(+n.toFixed(2)).toLocaleString(G.I18n.lang==='zh'?'zh-CN':G.I18n.lang,{maximumFractionDigits:2}):'—';
  function rows(p){
    const b=p.mon.baseStats||{},g=p.statGrowth||{},u=p.permanentGrowth||{};
    const raw=(value,converted,original)=>value/(converted||1)*(original??converted);
    const pre=k=>1+(g[k]||0),stack=k=>p.buffStacks(p.buffs[k])*p.buffs[k].amount;
    const data=[
      ['hp','Vida',p.baseHp,p.maxHp,0,G.T('Vida actual')+' '+fmt(p.hp)+' / '+fmt(p.maxHp)],
      ['atk','Ataque físico',raw(p.baseAtk,p.mon.atk,b.atk),null,stack('atk'),G.T('Multiplicador físico')+' ×'+fmt(p.atk)],
      ['spa','Ataque especial',raw(p.baseSpa,p.mon.spa??p.mon.atk,b.spa),null,stack('atk'),G.T('Multiplicador especial')+' ×'+fmt(p.spa)],
      ['defense','Defensa física',raw(p.baseDefense,p.mon.defense,b.def),null,stack('def'),G.T('Daño de contacto')+' ÷'+fmt(p.defenseFor({kind:'contact'}))],
      ['spdef','Defensa especial',raw(p.baseSpDef,p.mon.spdef,b.spd),null,stack('def'),G.T('Daño a distancia')+' ÷'+fmt(p.defenseFor({kind:'ranged'}))],
      ['spd','Velocidad',p.baseSpd,p.spd,stack('spd'),fmt(p.spd)+' '+G.T('unidades/s')],
      ['agility','Agilidad base',p.baseAgility,p.agility,0,G.T('Recarga')+' ×'+fmt(p.agilityCooldown)+' · '+G.T('Velocidad de recarga')+' ×'+fmt(1/p.agilityCooldown)],
      ['stamina','Resistencia base',p.baseStamina,p.stamina,0,G.T('Recuperación base')+' '+fmt(1/p.ppInterval)+' PP/s']
    ];
    return data.map(([key,name,base,total,skillFraction,battle])=>{
      if(total==null)total=key==='atk'?base*p.atk/p.baseAtk:key==='spa'?base*p.spa/p.baseSpa:base*(pre(key)+skillFraction);
      const permanent=base*(u[key]||0),fruit=base*((g[key]||0)-(u[key]||0)),skills=base*skillFraction,other=total-base-permanent-fruit-skills;
      return {key,name,base,permanent,fruit,skills,other,total,battle};
    });
  }
  function cooldown(p,m){return Math.max(.05,m.cd*p.cdMul)*p.agilityCooldown*(G.Items?.cooldownFactor(p)||1)*(G.Specialization?.stats(m).cooldown||1)/G.Abilities.cooldownRate(p,m)/(G.Mega?.cooldownRate(p,m)||1);}
  function move(p,m){let view=G.Specialization?.move(p,m)||m;view=G.Mega?.move(p,view)||view;view=G.Abilities.move(p,view);return {view,cd:cooldown(p,m),pp:G.MovePP.state(p,m),power:view.dmg||0};}
  return {rows,move,cooldown,fmt};
})();
