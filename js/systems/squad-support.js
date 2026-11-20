/* Support pulses and bandages use simulation time and deployed companions only. */
G.SquadSupport=(()=>{
 let stocks=new WeakMap();
 const cfg=()=>G.EconomyConfig.classBonds.buff;
 const alive=p=>p&&!p.dead&&p.hp>0;
 const actors=()=>G.Squad.actors().filter(alive);
 const helpers=()=>G.Squad.deployed().filter(p=>alive(p)&&p.moves.some(m=>m.kind==='buff'));
 function reset(){stocks=new WeakMap();}
 function state(p){let s=stocks.get(p);if(!s)stocks.set(p,s={time:0,bandages:0});return s;}
 function heal(target,n){const before=target.hp;target.heal(n);if(target.hp>before)G.FX.ring(target.x,target.y,6,target.r+20,'#8bf0be',.3,2);}
 function cast(p,m){G.SquadTraits?.cast(p,m);}

 function reduction(p){return G.Squad?.active&&actors().includes(p)&&G.SquadBonds.state('buff').tier?Math.max(.05,1-G.SquadBonds.value('buff','reduction')):1;}
 function tick(dt){
  if(G.Expedition?.phase!=='combat'||!(dt>0)||G.SquadBonds.state('buff').tier<5)return;
  const list=helpers();if(!list.length)return;
  for(const p of list){const s=state(p);s.time+=dt;while(s.time+1e-9>=cfg().bandageInterval){s.time-=cfg().bandageInterval;s.bandages++;}}
  const amount=list.reduce((n,p)=>n+p.maxHp,0)*cfg().bandageHeal;
  for(const p of list){const s=state(p);while(s.bandages>0){const target=actors().filter(q=>q.hp/q.maxHp<.5).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(!target)break;s.bandages--;heal(target,amount);}}
 }
 function draw(ctx){if(G.Expedition?.phase!=='combat')return;ctx.save();ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillStyle='#9ff4c9';for(const p of helpers()){const n=state(p).bandages;if(n)ctx.fillText('✚ '+n,p.x,p.y-p.bodyH-26);}ctx.restore();}
 return {reset,beginBattle:reset,cast,reduction,tick,draw,state};
})();
