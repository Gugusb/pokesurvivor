/* Run-long, stackable special items; carried potions share a slot with Mega and Z. */
G.Items = (() => {
  const LIST=[
    {id:'leftovers',name:'Restos',desc:'Recupera un poco de vida de forma continua.'},
    {id:'choiceband',name:'Cinta Elección',desc:'Aumenta el daño. Mientras atacas, los demás movimientos no recuperan PP.',boss:true},
    {id:'quickclaw',name:'Garra Rápida',desc:'Acorta la recarga de los movimientos.'},
    {id:'focussash',name:'Banda Focus',desc:'Evita un golpe mortal. Se consume al activarse.'},
    {id:'shellbell',name:'Cascabel Concha',desc:'El daño causado recupera un poco de vida.'},
    {id:'amuletcoin',name:'Moneda Amuleto',desc:'Consigue más monedas al terminar la aventura.'},
    {id:'luckyegg',name:'Huevo Suerte',desc:'Aumenta la experiencia obtenida.'},
    {id:'lifeorb',name:'Vidasfera',desc:'Aumenta el daño a cambio de un poco de vida al atacar.'},
    {id:'choicescarf',name:'Pañuelo Elección',desc:'Aumenta la velocidad de movimiento.'},
    {id:'rockyhelmet',name:'Casco Dentado',desc:'Devuelve parte del daño al recibir contacto.'},
    {id:'assaultvest',name:'Chaleco Asalto',desc:'Reduce el daño recibido.'},
    {id:'linker',name:'Enlazador',desc:'Concede una oportunidad de unir movimientos.',boss:true,icon:'bond'},
    {id:'luckymedal',name:'Medalla Fortuna',desc:'Añade una opción al subir de nivel.',boss:true,icon:'medal3'},
    {id:'candyjar',name:'Tarro de Caramelos',desc:'Permite guardar PP por encima del máximo; esa reserva se recupera más despacio.',boss:true,icon:'berry'},
    {id:'couragemedal',name:'Medalla Coraje',desc:'Los movimientos cuerpo a cuerpo pueden recuperar PP de todo su hueco.',boss:true,icon:'medal1'},
    {id:'flamethrower',name:'Lanzallamas portátil',desc:'Los impactos a distancia pueden quemar al enemigo.',boss:true,icon:'type:fire'},
    {id:'bugnet',name:'Red de Captura',desc:'Aumenta un poco la probabilidad de capturar Pokémon.',boss:true,icon:'ball'}
  ];
  const BY=Object.assign(Object.create(null),Object.fromEntries(LIST.map(i=>[i.id,i])));
  const count=(p,id)=>Math.max(0,p?.specialItems?.[id]||0);
  const icon=id=>BY[id]?.icon||id;
  function gain(p,id){
    if(!p||!BY[id])return false;
    p.specialItems ||= {};
    if(id==='linker')p.bonds=(p.bonds||0)+1;
    else p.specialItems[id]=count(p,id)+1;
    return true;
  }
  function remove(p,id){if(!count(p,id))return false;if(--p.specialItems[id]===0)delete p.specialItems[id];return true;}
  function roll(){return G.U.pick(LIST.filter(i=>!i.boss)).id;}
  function rewardChoices(rng=Math.random,rift=true){
    const out=[];
    for(let i=0;i<3;i++){
      const boss=rng()<(rift?.5:.2);
      const available=LIST.filter(it=>!it.boss||rift||['choiceband','linker'].includes(it.id));
      let pool=available.filter(it=>!!it.boss===boss&&!out.includes(it.id));
      if(!pool.length)pool=available.filter(it=>!out.includes(it.id));
      out.push(pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))].id);
    }
    return out;
  }
  const damageBonus=p=>.08*count(p,'choiceband')+.06*count(p,'lifeorb');
  const cooldownFactor=p=>Math.pow(.96,count(p,'quickclaw'));
  const ranged=m=>['projectile','beam','boomerang','chain','meteor','nova','cone','turret'].includes(m?.kind);
  function onCast(p,m){
    const n=count(p,'couragemedal');
    if(m.kind==='melee'&&n&&Math.random()<Math.min(1,.05*n)){
      const group=p.slots.find(g=>g.includes(m));if(group&&G.MovePP)G.MovePP.add(p,group,1);
    }
  }
  function onHit(p,e,m){
    const n=count(p,'flamethrower');
    if(n&&ranged(m)&&!G.Abilities.suppressEffects(p)&&Math.random()<Math.min(1,.03*n))e.applyBurn(1,p);
  }
  const ACTIVE={
    superpotion:{id:'superpotion',name:'Superpoción',icon:'superpotion',cooldown:30,heal:.30},
    pppotion:{id:'pppotion',name:'Poción PP',icon:'pppotion',cooldown:90},
    spiritspray:{id:'spiritspray',name:'Bruma Mental',icon:'spiritspray',cooldown:90}
  };
  function useActive(p){
    const item=ACTIVE[p?.activeItem];
    if(!item||p.dead||p.remote||(p.activeItemCd||0)>0||G.Game?.state!=='playing')return false;
    if(item.heal){if(p.hp>=p.maxHp)return false;p.heal(p.maxHp*item.heal);}
    else if(item.id==='pppotion'){if(p.ppPotionReady)return false;p.ppPotionReady=20;}
    else if(item.id==='spiritspray')p.tempPP=(p.tempPP||0)+15;
    p.activeItemCd=item.cooldown;G.Audio.sfx('heal');return true;
  }
  return {LIST,BY,ACTIVE,count,icon,gain,remove,roll,rewardChoices,damageBonus,cooldownFactor,ranged,onCast,onHit,useActive};
})();
