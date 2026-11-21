/* Offered cards remain reserved until bought or explicitly returned. */
G.UnitPool=class{
  constructor(mons){this.stock=new Map();this.mons=new Map();for(const mon of G.ExpeditionRules.shopFamilies(mons)){this.mons.set(mon.dex,mon);this.stock.set(mon.dex,G.EconomyConfig.unitTiers[G.ExpeditionQuality.quality(mon)].poolPerSpecies);}}
  root(dex){return G.MonProgression.rootFor(dex);}
  blocked(dex){return G.Squad.roster.some(p=>this.root(p.dex)===this.root(dex)&&p.rank>=G.EconomyConfig.compatibility.maxRank);}
  draw(level,rng=Math.random,filter=()=>true){
    const rates=G.Economy.levelRow(level).odds,buckets=rates.map((rate,i)=>[...this.mons.values()].filter(p=>G.ExpeditionQuality.quality(p)===i+1&&this.stock.get(p.dex)>0&&!this.blocked(p.dex)&&filter(p)));
    const sum=rates.reduce((n,w,i)=>n+(buckets[i].length?w:0),0);if(!sum)return null;
    let roll=rng()*sum,tier=rates.length-1;for(let i=0;i<rates.length;i++){if(!buckets[i].length)continue;roll-=rates[i];if(roll<0){tier=i;break;}}
    const candidates=buckets[tier],total=candidates.reduce((n,p)=>n+this.stock.get(p.dex),0);let card=rng()*total;
    for(const mon of candidates){card-=this.stock.get(mon.dex);if(card<0){this.stock.set(mon.dex,this.stock.get(mon.dex)-1);return {kind:'mon',dex:mon.dex,rank:1,cost:G.EconomyConfig.unitTiers[G.ExpeditionQuality.quality(mon)].cost,reserved:true,moveId:G.FIXED_SKILLS?.[mon.dex]||G.Moves.startFor(mon)};}}return null;
  }
  drawOwned(members,rng=Math.random){
    const roots=new Set(members.map(p=>this.root(p.dex))),list=[...this.mons.values()].filter(p=>roots.has(this.root(p.dex))&&this.stock.get(p.dex)>0&&!this.blocked(p.dex));if(!list.length)return null;
    const mon=list[Math.min(list.length-1,Math.floor(rng()*list.length))];this.stock.set(mon.dex,this.stock.get(mon.dex)-1);return {kind:'mon',dex:mon.dex,rank:1,cost:G.EconomyConfig.unitTiers[G.ExpeditionQuality.quality(mon)].cost,reserved:true,moveId:G.FIXED_SKILLS?.[mon.dex]||G.Moves.startFor(mon)};
  }
  putBack(offer){if(offer?.reserved&&!offer.sold){this.returnCopies(offer.dex,1);offer.reserved=false;}}
  returnCopies(dex,count){const root=this.root(dex);if(!this.stock.has(root))return;const max=G.EconomyConfig.unitTiers[G.ExpeditionQuality.quality(root)].poolPerSpecies;this.stock.set(root,Math.min(max,this.stock.get(root)+count));}
  copies(rank){return G.EconomyConfig.compatibility.mergeCopies**(Math.min(rank,G.EconomyConfig.compatibility.maxRank)-1);}
  sellValue(p){return G.EconomyConfig.unitTiers[G.ExpeditionQuality.quality(p)].sellValues[Math.min(p.rank,G.EconomyConfig.compatibility.maxRank)-1];}
};
