/* One run-local choice earned by a successful special event, after unlocking its card. */
G.Forget=(()=>{
  const unlocked=s=>!!s?.cardPack?.taken?.['event:forget'];
  function eventReward(p,rng=Math.random){if(!p||p.dead||G.Coop.active||!unlocked(G.DB.save)||rng()>=.08)return false;p.forgetTokens=(p.forgetTokens||0)+1;G.UI.toast(G.T('Oportunidad de olvidar obtenida. Úsala desde la pausa.'),5000);return true;}
  function remove(p,id){
    const m=p?.moves.find(m=>m.id===id);if(!m||p.moves.length<=1||!(p.forgetTokens>0)||G.Coop.active)return false;
    const active=p.slots[p.active];p.moves=p.moves.filter(x=>x!==m);for(const group of p.slots){const i=group.indexOf(m);if(i>=0)group.splice(i,1);}p.slots=p.slots.filter(g=>g.length);p.active=Math.max(0,p.slots.indexOf(active));p.arrange();G.MoveControl?.forget(p,m);
    for(const shot of [...G.Projectiles.all()])if(shot.owner===p&&(shot.moveId===id||shot.mid===id||String(shot.mid).startsWith(id+':')))G.Projectiles.remove(shot);
    G.Combat.clearFields(p,id);p.forgetTokens--;return true;
  }
  return {unlocked,eventReward,remove};
})();
