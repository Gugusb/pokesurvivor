/* All slots can run independently; selection assigns the primary role. */
G.MoveControl = (()=>{
  const states=new WeakMap();
  const mode=()=>G.Settings?.get('castMode')||'auto';
  function state(p){
    let s=states.get(p),m=mode();
    if(!s||s.mode!==m){s={mode:m,enabled:new WeakMap(),pending:new Set(),leases:new Set(),dash:null};states.set(p,s);}
    return s;
  }
  function rawWants(p,m,s){
    const group=p.slots.find(g=>g.includes(m));if(!group)return false;
    return s.mode==='auto'||s.mode==='toggle'&&s.enabled.get(group)!==false||s.mode==='click'&&s.pending.has(m);
  }
  function dash(p,s){if(!s.dash||!p.moves.includes(s.dash)||!rawWants(p,s.dash,s))s.dash=[...(s.mode==='click'?s.pending:p.moves)].find(m=>m.kind==='dash'&&rawWants(p,m,s))||null;return s.dash;}
  function wants(p,m){const s=state(p);return rawWants(p,m,s)&&(m.kind!=='dash'||dash(p,s)===m);}
  function sustaining(p,m){const s=state(p);return s.mode==='click'&&s.leases.has(m)&&m.t>0;}
  function releasing(p,m){return wants(p,m)||sustaining(p,m);}
  function input(p,i){
    if(G.ZMoves?.busy(p))return G.ZMoves.choose(p,i);
    const previous=p.active;
    p.setActive(i);if(p.active!==i||!p.slots[i])return false;
    const s=state(p),g=p.slots[i];
    if(s.mode==='toggle')s.enabled.set(g,previous!==i||s.enabled.get(g)===false);
    if(s.mode==='click')for(const m of g){if(m.kind==='dash'&&dash(p,s)&&s.dash!==m)continue;s.pending.add(m);if(m.kind==='dash')s.dash=m;}
    dash(p,s);
    return true;
  }
  function cast(p,m){const s=state(p);if(s.mode==='click'){s.pending.delete(m);if(m.kind==='orbit')s.leases.add(m);}}
  function forget(p,m){const s=state(p);s.pending.delete(m);s.leases.delete(m);if(s.dash===m)s.dash=null;}
  return {mode,wants,sustaining,releasing,input,cast,forget};
})();
