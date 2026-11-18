/* Melee/dash sortie: formation -> assault -> return -> refill -> formation. */
G.SquadAssault=(()=>{
  const controls=p=>!!p?.isSquadMember&&p.moves.some(m=>m.kind==='melee'||m.kind==='dash');
  const mode=p=>p.assaultMode||'formation';
  const full=p=>p.moves.every(m=>{const s=G.MovePP.state(p,m);return s.current>=s.max-1e-8;});
  const empty=p=>p.moves.filter(m=>m.kind==='melee'||m.kind==='dash').every(m=>Math.floor(G.MovePP.state(p,m).current+1e-8)+Math.floor(p.tempPP||0)<(G.Specialization?.stats(m).double?2:1));
  function set(p,value){if(mode(p)===value)return;p.assaultMode=value;if(value!=='assault'){p.target=null;G.Projectiles.clearOrbs(p);G.Combat?.clearFields(p);}}
  function reset(p){p.assaultMode='formation';p.target=null;}
  function recalled(p){if(controls(p))set(p,'refill');}
  function ranges(p){const moves=p.moves.filter(m=>m.kind==='melee'||m.kind==='dash'),reach=Math.max(...moves.map(m=>G.PlayerStats.move(p,m).view.radius||G.Combat.reach(m)));return {reach,search:reach*4,leash:Math.max(300,Math.min(1200,reach*6))};}
  function plan(p,cap,point){
    if(!controls(p)){if(mode(p)!=='formation')reset(p);return null;}
    if(G.Expedition?.run?.phase!=='combat'){reset(p);return null;}
    const {reach,search,leash}=ranges(p),distance=Math.hypot(p.x-cap.x,p.y-cap.y);
    const valid=e=>e&&!e.dead&&e.hp>0&&Math.hypot(e.x-cap.x,e.y-cap.y)<=leash;
    if(mode(p)==='assault'&&(empty(p)||distance>leash))set(p,'return');
    if(mode(p)==='return'){
      p.target=null;if(Math.hypot(p.x-point.x,p.y-point.y)<=20){set(p,'refill');}return {point,pace:Math.max(120,cap.spd*1.5)};
    }
    if(mode(p)==='refill'){
      p.target=null;if(distance>Math.max(140,Math.hypot(point.x-cap.x,point.y-cap.y)+40)){set(p,'return');return {point,pace:Math.max(120,cap.spd*1.5)};}
      if(!full(p))return null;set(p,'formation');
    }
    if(mode(p)==='formation'&&!full(p)){set(p,'refill');return null;}
    if(!valid(p.target)||Math.hypot(p.target.x-p.x,p.target.y-p.y)>search){p.target=G.EnemyMgr.queryCircle(p.x,p.y,search).filter(valid).sort((a,b)=>G.U.dist2(p.x,p.y,a.x,a.y)-G.U.dist2(p.x,p.y,b.x,b.y))[0]||null;}
    if(!p.target){if(mode(p)==='assault')set(p,'return');return mode(p)==='return'?{point,pace:Math.max(120,cap.spd*1.5)}:null;}
    set(p,'assault');const e=p.target,dx=e.x-p.x,dy=e.y-p.y,len=Math.hypot(dx,dy),stop=Math.max(p.r+e.r,reach*.65);
    return {point:len>stop?{x:e.x-dx/len*stop,y:e.y-dy/len*stop}:{x:p.x,y:p.y},pace:Math.max(120,p.spd*1.5)};
  }
  const canAttack=p=>!controls(p)||mode(p)==='assault';
  const canRecover=p=>!controls(p)||!['assault','return'].includes(mode(p));
  const label=p=>({formation:{zh:'随队',en:'Formation',es:'Formación'},assault:{zh:'出击',en:'Assault',es:'Asalto'},return:{zh:'归队',en:'Returning',es:'Regreso'},refill:{zh:'整备：等待PP充满',en:'Refilling PP',es:'Recargando PP'}}[mode(p)])[G.I18n.lang];
  return {controls,mode,full,empty,plan,reset,recalled,ranges,canAttack,canRecover,label};
})();
