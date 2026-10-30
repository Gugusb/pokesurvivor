/* Independent PP, delayed recovery-state transitions and shared reserve PP. */
G.MovePP = (() => {
  const players=new WeakMap();
  const baseMax=m=>m.kind==='melee'?24:m.kind==='dash'?20:m.kind==='buff'?10:15;
  const max=(p,m)=>baseMax(m)+Math.max(0,p.maxPpBonus||0);
  const busy=(p,m)=>G.MoveControl?G.MoveControl.releasing(p,m):(p.activeGroup?.()||[]).includes(m);
  const factor=(p,on)=>on?.5:1.5*(G.Abilities?.has(p,'innerfocus')?1.2:1);
  function state(p,m){
    let moves=players.get(p);if(!moves)players.set(p,moves=new WeakMap());
    let s=moves.get(m),cap=max(p,m),extra=5*(G.Items?.count(p,'candyjar')||0);
    if(!s){const on=busy(p,m);s={current:cap,max:cap,limit:cap+extra,on,target:on,inertia:0};moves.set(m,s);}
    if(s.max!==cap){s.current=Math.max(0,s.current+cap-s.max);s.max=cap;}
    s.limit=cap+extra;s.current=Math.min(s.limit,s.current);return s;
  }
  function consume(p,m){
    const s=state(p,m);
    if(p.ppPotionReady&&!p.remote&&p.moves.includes(m)){s.current=Math.min(s.limit,s.current+p.ppPotionReady);p.ppPotionReady=0;}
    if(s.current>=1-1e-8){s.current=Math.max(0,s.current-1);return true;}
    if((p.tempPP||0)>=1){p.tempPP--;return true;}return false;
  }
  function recover(s,amount){
    if(s.current<s.max){const normal=Math.min(amount,s.max-s.current);s.current+=normal;amount-=normal;}
    if(amount>0)s.current=Math.min(s.limit,s.current+amount*.5);
  }
  function tick(p,dt){
    if(p.dead||p.remote)return;
    for(const m of p.moves){
      const s=state(p,m),next=busy(p,m);let left=Math.max(0,dt);
      // Choice Band blocks unused recovery immediately, independent of rate inertia.
      const recovery=!next&&p.hasItem?.('choiceband')&&p.moves.some(other=>busy(p,other))?0:1;
      if(next!==s.target){s.target=next;s.inertia=next===s.on?0:1;}
      if(s.inertia>0){const old=Math.min(left,s.inertia);recover(s,old*factor(p,s.on)*recovery/(p.ppInterval||1));s.inertia-=old;left-=old;if(s.inertia<=1e-8){s.inertia=0;s.on=s.target;}}
      if(left>0)recover(s,left*factor(p,s.on)*recovery/(p.ppInterval||1));
    }
  }
  function restore(p,moves){for(const m of moves||[]){const s=state(p,m);s.current=Math.max(s.current,s.max);}}
  function add(p,moves,n){for(const m of moves||[]){const s=state(p,m);s.current=Math.min(s.limit,s.current+n);}}
  function increaseMax(p,n=1){for(const m of p.moves)state(p,m);p.maxPpBonus=(p.maxPpBonus||0)+n;for(const m of p.moves)state(p,m);}
  return {baseMax,max,state,consume,tick,restore,add,increaseMax};
})();
