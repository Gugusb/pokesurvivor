/* Explicit friendly status interface. No blanket proc is added to enemy hits.
 * State is plain actor data, so expedition node saves retain it naturally. */
G.ActorStatus=(()=>{
 const kinds=['poison','burn','stun','freeze','slow','attack'];
 const get=p=>p.actorStatus||=( {} );
 function apply(p,kind,duration=3,amount=1,source=null){
  if(!p||p.dead||!kinds.includes(kind)||!Number.isFinite(duration)||duration<=0)return false;
  if(G.LeaderJohto?.status(p,kind,source)===false||G.LeaderHoenn?.status(p,kind,source)===false||G.LeaderSinnoh?.status(p,kind,source)===false)return false;
  duration*=G.LeaderSinnoh?.has(p)?G.LeaderSinnoh.f().statusDuration||1:1;
  const s=get(p);s[kind]={left:Math.max(s[kind]?.left||0,Math.min(15,duration)),amount:Math.max(0,Math.min(kind==='poison'?8:1,amount)),wait:s[kind]?.wait||0};
  if(kind==='slow')p.slowT=Math.max(p.slowT||0,duration);
  if(kind==='attack')p.applyAttackDebuff?.(amount,duration);
  return true;
 }
 function clear(p){p.actorStatus={};p.slowT=0;p.attackDebuffT=0;p.attackDebuff=0;p.actorStunT=0;}
 function tick(p,dt){
  if(!p||p.dead||!(dt>0))return;const s=get(p);p.actorStunT=Math.max(0,s.stun?.left||0,s.freeze?.left||0);
  for(const [kind,v]of Object.entries(s)){
   const used=Math.min(dt,v.left);v.left-=dt;
   if(kind==='poison'||kind==='burn'){
    v.wait-=used;while(v.wait<=0&&v.left>-1){v.wait+=1;
     if(kind==='poison'&&(G.LeaderJohto?.poisonHeal(p)||G.LeaderHoenn?.poisonHeal(p)))continue;
     const guard=p.invuln;p.hurt(p.maxHp*(kind==='poison'?.01*Math.max(1,v.amount):.015),kind==='poison'?'poison':'fire',true,{kind:'status',status:kind});p.invuln=Math.max(guard,p.invuln);
    }
   }if(v.left<=0)delete s[kind];
  }p.actorStunT=Math.max(0,s.stun?.left||0,s.freeze?.left||0);
 }
 const active=(p,kind)=>!!(p?.actorStatus?.[kind]?.left>0);
 function displace(p,dx,dy){if(!p||p.dead||(G.LeaderJohto?.knockImmune(p)||G.LeaderHoenn?.knockImmune(p)||G.LeaderSinnoh?.knockImmune(p)))return false;const x=p.x+dx,y=p.y+dy;if(!G.World.isFree(x,y,p.r))return false;p.x=x;p.y=y;return true;}
 return {apply,clear,tick,active,kinds,displace};
})();
