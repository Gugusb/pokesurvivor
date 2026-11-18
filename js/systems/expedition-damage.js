/* Actual HP/shield damage, separated from overkill and from attributed bond damage. */
G.ExpeditionDamage=(()=>{
  let rows=new Map(),actors=new WeakMap(),serial=0,last=0;
  const L=(es,en,zh)=>G.I18n.lang==='zh'?zh:G.I18n.lang==='en'?en:es;
  function reset(){rows=new Map();actors=new WeakMap();serial=0;last=0;document.getElementById?.('expedition-damage')?.remove();}
  function actor(p){if(!actors.has(p)){const id='actor:'+serial++;actors.set(p,id);rows.set(id,{id,dex:p.dex,name:p.mon.name,damage:0,kind:'pokemon'});}const row=rows.get(actors.get(p));row.name=p.mon.name;row.dex=p.dex;return row;}
  function addBond(type,n){if(!(n>0))return;const key='bond:'+type;if(!rows.has(key))rows.set(key,{id:key,type,kind:'bond',damage:0});rows.get(key).damage+=n;}
  function record(p,attack,n,context){
    if(!G.Squad?.active||!p||!(n>0)||!Number.isFinite(n))return;
    const id=attack?.id||'',bond=attack?.bondDamageKind||(id.startsWith('typebond-')?id.slice(9):null);
    if(bond)addBond(bond,n);
    else if(context?.execute)addBond('fairy',n);
    else{
      const factors=[...(context?.contributions||[]),...(attack?.bondDamageContributions||[])],total=factors.reduce((k,[,v])=>k*v,1);let base=n/total;actor(p).damage+=base;
      for(const [type,k]of factors){addBond(type,base*(k-1));base*=k;}
    }
  }
  const snapshot=()=>[...rows.values()].map(r=>({...r})).sort((a,b)=>b.damage-a.damage||a.id.localeCompare(b.id));
  const label=r=>r.kind==='bond'?(G.U.TYPE_NAME[r.type]?G.T(G.U.TYPE_NAME[r.type]):G.Expedition.skillLabel(r.type))+L(' · vínculo',' bond damage','羁绊伤害'):G.T(r.name);
  function render(target,data=snapshot()){
    target.replaceChildren();const title=document.createElement('h3');title.textContent=L('Daño del equipo','Squad damage','小队伤害统计');target.append(title);
    for(const r of data){const row=document.createElement('div');row.className='expedition-damage-row';const name=document.createElement('span'),value=document.createElement('b');name.textContent=label(r);value.textContent=Math.round(r.damage).toLocaleString();row.append(name,value);target.append(row);}
  }
  function tick(){
    if(!G.Squad?.active)return;for(const p of [...G.Squad.actors(),...G.Squad.reserves()])actor(p);
    let el=document.getElementById('expedition-damage');if(!el){el=document.createElement('aside');el.id='expedition-damage';el.className='expedition-damage';document.body.append(el);}
    el.hidden=G.Game.state!=='playing';if(performance.now()-last<200)return;last=performance.now();render(el);
  }
  return {reset,record,snapshot,render,tick};
})();
