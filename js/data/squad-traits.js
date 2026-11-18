/* Run-local expedition traits. A 15/9/6 catalogue gives the requested 5:3:2 ratio. */
G.SquadTraitDefs=(()=>{
  const LIST=[];
  function stack(id,event,every,scope,base,zh,en,es){LIST.push({id,category:'stacking',event,every,scope,base,name:{zh,en,es}});}
  stack('ember-notes','hit',60,'first',1,'属性笔记','Type notes','Notas de tipo');
  stack('critical-rhythm','critical',10,'skill',1,'会心节律','Critical rhythm','Ritmo crítico');
  stack('enduring-seed','hurt',3,'first',1,'坚韧种子','Enduring seed','Semilla tenaz');
  for(const [id,scope,zh,en,es]of [['daily-links','all','同行手账','Travel journal','Diario de viaje'],['daily-type','first','元素日课','Element practice','Práctica elemental'],['daily-class','skill','职业日课','Class practice','Práctica de oficio']])stack(id,'day',1,scope,1,zh,en,es);
  for(const [id,scope,zh,en,es]of [['clear-links','all','全歼共鸣','Clear resonance','Resonancia total'],['clear-type','first','元素凯歌','Element triumph','Triunfo elemental'],['clear-class','skill','职业凯歌','Class triumph','Triunfo de oficio']])stack(id,'clear',1,scope,3,zh,en,es);
  stack('farewell-notes','release',2,'first',2,'送别印记','Farewell notes','Notas de despedida');
  stack('elite-links','elite',1,'all',6,'精英回响','Elite echo','Eco de élite');
  stack('elite-type','elite',1,'first',6,'元素试炼','Element trial','Prueba elemental');
  stack('merge-class','merge',1,'skill',4,'蜕变技艺','Evolving craft','Arte evolutivo');
  stack('merge-links','merge',1,'all',4,'升阶共振','Rank resonance','Resonancia de rango');
  stack('boss-links','boss',1,'all',15,'远征旗帜','Expedition standard','Estandarte');
  for(const row of [
    ['battle-purse','kill',15,2,'战地拾金','Battle purse','Bolsa de batalla'],
    ['daily-purse','day',1,5,'旅途补给','Travel supplies','Provisiones'],
    ['daily-interest','day',1,.05,'行囊利息','Travel interest','Interés viajero'],
    ['clear-purse','clear',1,12,'清场奖金','Clear bonus','Prima de limpieza'],
    ['farewell-purse','release',1,8,'送别补给','Farewell supplies','Provisión de despedida'],
    ['elite-supplier','elite',1,25,'精英补给官','Elite supplier','Proveedor de élite'],
    ['boss-recruiter','boss',1,60,'远征招募官','Expedition recruiter','Reclutador'],
    ['shop-purse','shop',1,5,'市集向导','Market guide','Guía del mercado'],
    ['recruit-bargain','discount',1,.08,'招募议价','Recruit bargaining','Negociación']
  ]){const [id,event,every,base,zh,en,es]=row;LIST.push({id,category:'economic',event,every,base,name:{zh,en,es}});}
  for(const [id,power,haste,execute,size,shield,zh,en,es]of [
    ['terminal-power',.008,0,0,0,0,'终极增伤','Terminal power','Poder terminal'],
    ['terminal-haste',0,.005,0,0,0,'终极急速','Terminal haste','Prisa terminal'],
    ['terminal-execute',0,0,.004,0,0,'终极处决','Terminal execution','Ejecución terminal'],
    ['terminal-size',0,0,0,.006,0,'巨型领域','Giant domain','Dominio gigante'],
    ['terminal-shield',0,0,0,0,.05,'终极屏障','Terminal barrier','Barrera terminal'],
    ['terminal-balance',.004,0,0,0,.025,'攻守循环','Power and shelter','Poder y refugio']
  ])LIST.push({id,category:'terminal',power,haste,execute,size,shield,name:{zh,en,es}});
  const BY=Object.fromEntries(LIST.map(d=>[d.id,d])),weights=[0,1,1.2,1.5,2,2.5];
  const roots=[...new Set(G.DEX.map(m=>G.MonProgression.rootFor(m.dex)))].sort((a,b)=>(Math.imul(a,2654435761)>>>0)-(Math.imul(b,2654435761)>>>0));
  const ROOTS=Object.fromEntries(roots.map((root,i)=>[root,LIST[i%LIST.length].id]));
  const forDex=dex=>BY[ROOTS[G.MonProgression.rootFor(dex)]];
  return {LIST,BY,ROOTS,weights,forDex};
})();
