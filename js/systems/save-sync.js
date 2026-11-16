/* Three-way save reconciliation. Gameplay stays local; shared transactions keep server authority. */
G.SaveSync=(()=>{
 const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const bad=new Set(['__proto__','constructor','prototype']);
 function rebase(current,base,next){
  function walk(c,b,n,path=''){
   if(same(b,n))return copy(c);
   if(n===undefined)return undefined;
   if(['coins','abilityGems','tickets.t1','tickets.t10'].includes(path)){
    const limit=path.startsWith('tickets.')?1e7:1e8;
    return Math.max(0,Math.min(limit,(Number(c)||0)+(Number(n)||0)-(Number(b)||0)));
   }
   if(path.startsWith('stats.')&&typeof n==='number')return /\.(best|high)/i.test(path)?Math.max(c||0,n):Math.max(0,(Number(c)||0)+Math.max(0,n-(Number(b)||0)));
   if(Array.isArray(n))return path.startsWith('owned.')&&path.endsWith('.iv')?n.map((v,i)=>Math.max(v,c?.[i]||0)):copy(n);
   if(n&&typeof n==='object'){
    const out=copy(c&&typeof c==='object'&&!Array.isArray(c)?c:{});
    for(const k of new Set([...Object.keys(b||{}),...Object.keys(n)])){
     if(bad.has(k)||same(b?.[k],n[k]))continue;
     const v=walk(c?.[k],b?.[k],n[k],path?path+'.'+k:k);
     if(v===undefined){if(!/^(owned|shiny|ach|abilityMedals|megaStones)(\.|$)/.test(path))delete out[k];}else out[k]=v;
    }
    return out;
   }
   return copy(n);
  }
  const result=walk(current,base||{},next||{});
  for(const key of ['cardPack','difficultyRecords','offline','failureProtection'])if(current?.[key]!==undefined)result[key]=copy(current[key]);
  if(current?.difficulty)result.difficulty={...copy(current.difficulty),selected:next?.difficulty?.selected!==base?.difficulty?.selected?next?.difficulty?.selected:current.difficulty.selected};
  return result;
 }
 const changed=(a,b)=>{const x=copy(a),y=copy(b);if(x)delete x.updated;if(y)delete y.updated;return !same(x,y);};
 return {rebase,changed};
})();
