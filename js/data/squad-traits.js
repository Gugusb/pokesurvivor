/* Family assignments and integer values come from the supplied v2 design. */
G.SquadTraitDefs=(()=>{
 const index=G.SquadTraitIndex,ROOTS={},DEX={},BY={};
 const bases={indep_heal_allies:2,indep_bond_type_atk:5,indep_bond_type_def:5,indep_bond_class_stat:5,indep_legendary_all:1,indep_mythical_revive:1,bond_self:2,bond_adjacent:1,bond_max_type:3,heal_captain:20,stat_atk_spa:5,stat_agi_sta:1,stat_crit:1,gold:1,exp:1.5,mon_xp:200,free_refresh:1};
 for(const f of index.families){ROOTS[f.rootDex]=f.id;for(const dex of f.members)DEX[dex]=f;BY[f.id]||={...f,base:bases[f.effect]};}
 const forDex=dex=>DEX[dex]||DEX[G.MonProgression.rootFor(dex)];
 const weight=p=>(index.modifiers.star[Math.max(1,Math.min(3,p.rank||1))]||1)*(index.modifiers.quality[G.ExpeditionQuality?.quality(p)||forDex(p.dex)?.quality||1]||1);
 const value=p=>{const rank=Math.max(1,Math.min(3,p.rank||1));if(!BY[p.squadTraitOverride])return forDex(p.dex).values[rank-1];const d=BY[p.squadTraitOverride];return Math.floor(bases[d.effect]*(['rest_end','star_up'].includes(d.event)?2:1)*weight(p)+1e-9);};
 return {LIST:Object.values(BY),BY,ROOTS,forDex,weight,value,weights:index.modifiers.quality,version:index.version};
})();
