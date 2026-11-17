/* Device-local aim; remote casts already carry their final angle. */
G.Targeting=(()=>{
 const manual=p=>!p.remote&&!p.isSquadMember&&!!G.Settings?.get('manualAim');
 function forward(p,range=520,angle=p.aim){
  let best=null,score=Infinity;
  for(const e of G.EnemyMgr.all()){
   if(e.dead)continue;const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy),diff=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)));
   if(d>range||diff>Math.PI/3)continue;const rank=diff*range+d*.15;if(rank<score){score=rank;best=e;}
  }
  return best;
 }
 function update(p){
  p.manualAim=manual(p);
  if(p.manualAim){const v=p.frozen?null:G.Input.aim?.();if(v&&(v[0]||v[1]))p.aim=Math.atan2(v[1],v[0]);p.target=forward(p);return true;}
  return false;
 }
 return {manual,forward,update};
})();
