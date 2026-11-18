/* Final per-stat multiplier, interpolated by the corresponding 1..31 IV. */
G.LevelGrowth=(()=>{
  const INDEX={hp:0,atk:1,spd:2,spa:3,defense:4,spdef:5,agility:6,stamina:7};
  function factor(level,iv){const q=(Math.max(1,Math.min(31,Number(iv)||1))-1)/30,l=Math.max(1,Math.min(100,Number(level)||1)),a=1.1+.1*q,b=1.2+.06*q;return l<=60?1+(a-1)*(l-1)/59:a+(b-a)*(l-60)/40;}
  const of=(p,key)=>p.remote?1:factor(p.level,p.levelIV?.[INDEX[key]]);
  return {INDEX,factor,of};
})();
