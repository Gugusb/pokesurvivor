/* All slots can run independently; selection assigns the primary role. */
G.MoveControl = (()=>{
  const states=new WeakMap();
  const mode=()=>G.Settings?.get('castMode')||'auto';
  function state(p){
    let s=states.get(p),m=mode();
    if(!s||s.mode!==m){s={mode:m,enabled:new WeakMap(),pending:new Set(),leases:new Set()};states.set(p,s);}
    return s;
  }
  function wants(p,m){
    if(p.isSquadMember)return !p.dead;
    const group=p.slots.find(g=>g.includes(m));if(!group)return false;
    const s=state(p);
    return s.mode==='auto'||s.mode==='toggle'&&s.enabled.get(group)!==false||s.mode==='click'&&s.pending.has(m);
  }
  function sustaining(p,m){const s=state(p);return s.mode==='click'&&s.leases.has(m)&&m.t>0;}
  function releasing(p,m){return wants(p,m)||sustaining(p,m);}
  function input(p,i){
    if(G.ZMoves?.busy(p))return G.ZMoves.choose(p,i);
    const previous=p.active;
    p.setActive(i);if(p.active!==i||!p.slots[i])return false;
    const s=state(p),g=p.slots[i];
    if(s.mode==='toggle')s.enabled.set(g,previous!==i||s.enabled.get(g)===false);
    if(s.mode==='click')for(const m of g)s.pending.add(m);
    return true;
  }
  function cast(p,m){const s=state(p);if(s.mode==='click'){s.pending.delete(m);if(m.kind==='orbit')s.leases.add(m);}}
  function snapshot(p){const s=state(p);return {mode:s.mode,on:p.slots.map(g=>s.enabled.get(g)!==false),pending:[...s.pending].map(m=>p.moves.indexOf(m)),leases:[...s.leases].map(m=>p.moves.indexOf(m))};}
  function restore(p,a){if(!a)return;const s=state(p);p.slots.forEach((g,i)=>s.enabled.set(g,a.on[i]));s.pending=new Set(a.pending.map(i=>p.moves[i]).filter(Boolean));s.leases=new Set(a.leases.map(i=>p.moves[i]).filter(Boolean));}
  return {snapshot,restore,mode,wants,sustaining,releasing,input,cast};
})();
