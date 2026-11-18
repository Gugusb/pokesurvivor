/* Shared, read-only preparation data. Preferences follow the starting family. */
G.RunSetup=(()=>{
  const root=dex=>G.MonProgression.rootFor(+dex);
  const families=new Map();
  function family(dex){const r=root(dex);if(!families.has(r))families.set(r,G.MonProgression.familyFor(+dex));return families.get(r);}
  function moves(dex){return [...new Set(family(dex).flatMap(d=>G.Moves.poolFor(G.DEX_BY[d])))].filter(id=>G.Moves.BY_ID[id]&&id!==G.startMoveOf(root(dex)));}
  const limit=s=>G.Upgrades.perks(G.CardPacks.levels(s)).bans;
  function bans(s,dex){const ids=new Set(moves(dex)),list=s.pban?.[root(dex)]??s.pban?.[dex]??[];return [...new Set(list)].filter(id=>ids.has(id)).slice(0,limit(s));}
  function toggle(s,dex,id){
    if(!moves(dex).includes(id))return false;
    const list=bans(s,dex),i=list.indexOf(id);if(i>=0)list.splice(i,1);else if(list.length<limit(s))list.push(id);else return false;
    s.pban||={};s.pban[root(dex)]=list;return true;
  }
  function owned(s,query=''){
    const q=query.trim().toLocaleLowerCase();return G.DEX.filter(m=>s.owned?.[m.dex]&&(!q||family(m.dex).some(d=>{const p=G.DEX_BY[d];return (d+' '+p.name+' '+G.T(p.name)).toLocaleLowerCase().includes(q);})));
  }
  function snapshot(s,dex=s.partner){
    const perks=G.Upgrades.perks(G.CardPacks.levels(s)),pack=s.cardPack||{};
    return {dex,root:root(dex),path:G.MonProgression.pathFor(dex).slice(),family:family(dex),perks,bans:bans(s,dex),limit:limit(s),
      items:G.Items.LIST.map(i=>({id:i.id,state:!i.unlock?'enabled':!pack.taken?.['item:'+i.id]?'locked':pack.disabled?.[i.id]?'disabled':'enabled'})),
      held:s.zEquipped?.[dex]?{kind:'z',id:s.zEquipped[dex]}:s.megaEquipped?.[dex]?{kind:'mega',id:s.megaEquipped[dex]}:{kind:'active',id:G.Equipment.active(s,dex)}};
  }
  return {root,family,moves,limit,bans,toggle,owned,snapshot};
})();
