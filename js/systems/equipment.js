/* One persistent carried item per selected species. Missing legacy entries use a potion. */
G.Equipment=(()=>{
  const ACTIVE_IDS=['superpotion','pppotion','spiritspray'];
  function normalize(s){
    for(const key of ['activeEquipped','megaEquipped','zEquipped'])if(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key]))s[key]={};
    for(const d of Object.keys(s.megaEquipped)){
      const id=s.megaEquipped[d],f=(G.MEGA_FORMS||[]).find(f=>f.id===id&&f.available&&f.basicComplete&&G.MEGA_TYPES?.[id]);
      if(id!==null&&(!f||f.dex!==+d||!s.megaStones?.[id]))delete s.megaEquipped[d];
    }
    for(const d of Object.keys(s.zEquipped)){
      const type=s.zEquipped[d];
      if(!G.DEX_BY[d]||type!==null&&(!G.ZAccess?.TYPES.includes(type)||!G.ZAccess.allowed(s,d)))delete s.zEquipped[d];
      else if(type)s.megaEquipped[d]=null;
    }
    for(const d of Object.keys(s.activeEquipped))if(!G.DEX_BY[d]||![...ACTIVE_IDS,null].includes(s.activeEquipped[d]))delete s.activeEquipped[d];
    for(const d of new Set([...Object.keys(s.megaEquipped),...Object.keys(s.zEquipped)]))if(s.megaEquipped[d]||s.zEquipped[d])s.activeEquipped[d]=null;
    return s;
  }
  function active(s,dex){
    if(s?.megaEquipped?.[dex]||s?.zEquipped?.[dex])return null;
    return Object.prototype.hasOwnProperty.call(s?.activeEquipped||{},dex)?s.activeEquipped[dex]:'superpotion';
  }
  function equip(s,dex,id){
    if(!G.DEX_BY[dex]||!s.owned?.[dex]||![...ACTIVE_IDS,null].includes(id))return false;
    s.activeEquipped||={};s.activeEquipped[dex]=id;
    s.megaEquipped||={};s.megaEquipped[dex]=null;s.zEquipped||={};s.zEquipped[dex]=null;
    return true;
  }
  return {ACTIVE_IDS,normalize,active,equip};
})();
