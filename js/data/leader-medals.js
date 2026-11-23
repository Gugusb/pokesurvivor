/* Family medal identities stay stable across forms, branches and legacy saves. */
G.LeaderMedals=(()=>{
 let installed=false;const byDex=new Map();
 const family=dex=>byDex.get(+dex);
 function install(){
  if(installed)return;
  if(!G.LeaderAbilitiesConfig)throw Error('Leader ability catalogue is not loaded');
  for(const f of G.LeaderAbilitiesConfig.families){
   for(const dex of f.members)byDex.set(dex,f);
   const dex=f.members.find(d=>G.DEX_BY[d]?.gen===(f.generation||1)),id=dex+'-'+f.id;
   if(!dex)throw Error('Missing family medal representative '+f.id);
   const d={id,dex,ability:f.id,family:f.root,leader:true,rarity:G.DEX_BY[dex].rarity,name:f.name.es,en:f.name.en,
    desc:'Desbloquea el movimiento Z activo de esta familia.',descEn:'Unlocks this family’s manual Z move.'};
   G.AbilityDefs.LIST.push(d);G.AbilityDefs.BY_ID[id]=d;
   if(!G.AbilityDefs.SPECIES.includes(dex))G.AbilityDefs.SPECIES.push(dex);
   G.I18n?.add?.({[d.name]:d.en,[d.desc]:d.descEn});G.I18n?.addChinese?.({[d.name]:f.name.zh,[d.desc]:'解锁该进化链队长的主动Z招式。'});
  }
  for(const mon of G.DEX||[])if(!byDex.has(mon.dex)){const root=G.MonProgression?.rootFor(mon.dex),f=byDex.get(root);if(f)byDex.set(mon.dex,f);}
  installed=true;
 }
 function unlocked(dex,save=G.DB?.save){
  const f=family(dex);if(!f)return false;
  return Object.keys(save?.abilityMedals||{}).some(id=>{
   const d=G.AbilityDefs.BY_ID[id];return d&&(d.family===f.root||family(d.dex)===f);
  });
 }
 const medalsFor=dex=>{const f=family(dex);return G.AbilityDefs.LIST.filter(d=>d.dex===+dex||d.leader&&d.family===f?.root);};
 return {install,family,unlocked,medalsFor};
})();
