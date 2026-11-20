/* Expedition quality is independent of account collection rarity/IV borders. */
G.ExpeditionQuality=(()=>{
  const COLORS=['','#edf3ff','#65b4ff','#be8aff','#ffad59','#ff637c'];
  const AD=[[1,1.5,2.25],[1.25,1.875,2.81],[1.5,2.25,3.38],[1.875,2.81,4.22],[2.5,3.75,5.63]];
  const HP=[[1,1.8,3.24],[1.25,2.25,4.05],[1.5,2.7,4.86],[1.875,3.38,6.08],[2.5,4.5,8.1]];
  const quality=p=>G.ExpeditionQualityMap[G.MonProgression.rootFor(typeof p==='number'?p:p.dex)]||1;
  const factors=p=>{const q=quality(p)-1,r=Math.max(0,Math.min(2,(p.rank||1)-1));const configured=G.EconomyConfig?.compatibility.unitStatMultipliers;return {ad:(configured?.ad||AD)[q][r],hp:(configured?.hp||HP)[q][r]};};
  function sync(p){if(!p.isSquadMember)return;const next=factors(p).hp,old=p.qualityHpFactor||1;if(next===old)return;p.maxHp*=next/old;p.hp=p.dead?0:Math.min(p.maxHp,p.hp*next/old);p.qualityHpFactor=next;}
  const label=p=>({zh:'品质',en:'Quality',es:'Calidad'}[G.I18n.lang]||'Quality')+' '+quality(p);
  const color=p=>COLORS[quality(p)];
  return {quality,factors,sync,label,color,COLORS,AD,HP};
})();
