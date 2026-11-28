/* Family assignments and precomputed star values come from the v3 Plan B design (with v2 checkpoint fallback). */
G.SquadTraitDefs=(()=>{
 const index=G.SquadTraitIndex,ROOTS={},DEX={},BY={},LEGACY_V2={};
 const bases={indep_heal_allies:2,indep_bond_type_atk:5,indep_bond_type_def:5,indep_bond_class_stat:5,indep_legendary_all:1,indep_mythical_revive:1,bond_self:2,bond_adjacent:1,bond_max_type:3,heal_captain:20,stat_atk_spa:5,stat_agi_sta:1,stat_crit:1,gold:1,exp:1.5,mon_xp:200,free_refresh:1};
 const v3Calc={
  v3_wage_gold:()=>1,v3_trainer_xp:()=>1,v3_mon_xp:r=>[20,30,40][r-1],v3_xp_jar:r=>[20,30,40][r-1],v3_free_refresh:()=>1,
  v3_stack_own_class:(r,q)=>Math.floor(2*starW(r)*qualW(q)+1e-9),v3_stack_own_type1:(r,q)=>Math.floor(2*starW(r)*qualW(q)+1e-9),
  v3_stack_adj:(r,q)=>Math.floor(1*starW(r)*qualW(q)+1e-9),v3_stack_main_class:(r,q)=>Math.floor(2*starW(r)*qualW(q)+1e-9),
  v3_stack_max_type:(r,q)=>Math.floor(3*starW(r)*qualW(q)+1e-9),
  v3_buff_adj_atk:(r,q)=>Math.min(15,Number((4*starW(r)*qualW(q)).toFixed(1))),
  v3_buff_adj_agi:(r,q)=>Math.min(18,Number((6*starW(r)*qualW(q)).toFixed(1))),
  v3_buff_adj_def:(r,q)=>Math.min(20,Number((6*starW(r)*qualW(q)).toFixed(1))),
  v3_buff_adj_heal:()=>2,v3_buff_adj_shield:r=>[3,4,5][r-1],v3_buff_adj_pp:()=>1
 };
 const starW=r=>index.modifiers.star[Math.max(1,Math.min(3,r||1))]||1;
 const qualW=q=>index.modifiers.quality[q]||1;
 const legacyVals=(effect,q)=>[1,2,3].map(r=>Math.floor((bases[effect]||0)*starW(r)*qualW(q)+1e-9));
 for(const f of index.families){ROOTS[f.rootDex]=f.id;for(const dex of f.members)DEX[dex]=f;BY[f.id]||={...f,base:bases[f.effect]??null};}
 for(const [rootStr,oldId]of Object.entries(index.legacyV2||{})){
  const cur=DEX[+rootStr];if(!cur)continue;
  const legacyDef={rootDex:cur.rootDex,quality:cur.quality,category:'independent',template:null,id:oldId,event:null,effect:oldId,values:legacyVals(oldId,cur.quality),members:cur.members};
  for(const dex of cur.members)LEGACY_V2[dex]=legacyDef;
  BY[oldId]||={...legacyDef,base:bases[oldId]??null};
 }
 const forDex=(dex,schemaVersion=index.version)=>{const root=G.MonProgression?.rootFor?G.MonProgression.rootFor(dex):dex;if(schemaVersion==='2.0.0'&&(LEGACY_V2[dex]||LEGACY_V2[root]))return LEGACY_V2[dex]||LEGACY_V2[root];return DEX[dex]||DEX[root];};
 const qualityFor=p=>G.ExpeditionQuality?.quality(p)||forDex(p.dex)?.quality||1;
 const weight=p=>starW(p.rank)*qualW(qualityFor(p));
 const value=(p,schemaVersion=index.version)=>{
  const rank=Math.max(1,Math.min(3,p.rank||1));
  if(!BY[p.squadTraitOverride])return forDex(p.dex,schemaVersion).values[rank-1];
  const d=BY[p.squadTraitOverride],q=qualityFor(p);
  if(v3Calc[d.effect])return v3Calc[d.effect](rank,q);
  return Math.floor(bases[d.effect]*(['rest_end','star_up'].includes(d.event)?2:1)*starW(rank)*qualW(q)+1e-9);
 };
 return {LIST:Object.values(BY),BY,ROOTS,forDex,weight,value,weights:index.modifiers.quality,version:index.version,plan:index.plan||null};
})();
