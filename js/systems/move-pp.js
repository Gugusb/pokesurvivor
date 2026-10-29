/* Run-local PP belongs to each learned move, including moves sharing a slot.
 * Weak maps keep combat/visual snapshots and network packets free of PP state. */
G.MovePP = (() => {
  const players=new WeakMap();
  const baseMax=m=>m.kind==='melee'?24:m.kind==='dash'?20:m.kind==='buff'?10:15;
  const max=(p,m)=>baseMax(m)+Math.max(0,p.maxPpBonus||0);
  function state(p,m){
    let moves=players.get(p);if(!moves)players.set(p,moves=new WeakMap());
    let s=moves.get(m),cap=max(p,m);
    if(!s){s={current:cap,max:cap};moves.set(m,s);}
    if(s.max!==cap){s.current=Math.max(0,Math.min(cap,s.current+cap-s.max));s.max=cap;}
    return s;
  }
  function consume(p,m){
    const s=state(p,m);
    if(s.current>=1-1e-8){s.current=Math.max(0,s.current-1);return true;}
    if((p.tempPP||0)>=1){p.tempPP--;return true;}
    return false;
  }
  function tick(p,dt){
    if(p.dead||p.remote)return;
    const amount=Math.max(0,dt)/(p.ppInterval||1);
    for(const m of p.moves){const s=state(p,m);s.current=Math.min(s.max,s.current+amount);}
  }
  function restore(p,moves){for(const m of moves||[]){const s=state(p,m);s.current=s.max;}}
  function increaseMax(p,n=1){
    // Initialize before increasing so every learned move receives the new points.
    for(const m of p.moves)state(p,m);
    p.maxPpBonus=(p.maxPpBonus||0)+n;
    for(const m of p.moves)state(p,m);
  }
  return {baseMax,max,state,consume,tick,restore,increaseMax};
})();
