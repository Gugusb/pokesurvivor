G.BreakItems=(()=>{
 const states=new WeakMap(),now=()=>G.Game?.st?.time||0,n=(p,id)=>G.Items.count(p,id);
 function state(p){let s=states.get(p);if(!s)states.set(p,s={ready:{},free:0,overheal:0,window:-1,used:0});return s;}
 function proc(p,id,cd){if(!n(p,id)||p.dead)return false;const s=state(p);if((s.ready[id]??-1)>now())return false;s.ready[id]=now()+cd;return true;}
 function refund(p,m,amount){if(p.remote){for(let k=0;k<Math.min(3,amount);k++)G.Coop.specReward?.(p,m.id,0,1);}else {const learned=p.moves.find(x=>x.id===m.id);if(learned)G.MovePP?.add(p,[learned],amount);}}
 function onHit(p,e,m){if(m?.id&&e.slowT>0&&proc(p,'bindingband',1))refund(p,m,Math.min(3,n(p,'bindingband')));}
 function onCast(p,m){if(m.kind==='buff'&&proc(p,'throatspray',5))state(p).free=Math.min(3,state(p).free+n(p,'throatspray'));}
 function useFree(p,m){if(m.kind==='buff'||!state(p).free)return false;state(p).free--;return true;}
 function onEmpty(p,m,missing){
  if(proc(p,'blunderpolicy',12))p.tempPP=(p.tempPP||0)+2*Math.min(3,n(p,'blunderpolicy'));
  missing=Math.max(0,missing-Math.floor(p.tempPP||0));if(!missing||!n(p,'cellbattery'))return;
  const cost=p.maxHp*.02*missing/Math.min(4,n(p,'cellbattery'));
  if(p.hp>cost+1&&proc(p,'cellbattery',.5)){p.hp-=cost;p.tempPP=(p.tempPP||0)+missing;G.Abilities?.onDamage(p);}
 }
 function afterHurt(p,source){if(p.hp<=0)return;
  if(p.hp<p.maxHp*.3&&proc(p,'ejectbutton',20)){state(p).free=Math.min(3,state(p).free+1);p.invuln=Math.max(p.invuln||0,.75);}
  if(source.kind==='contact'&&proc(p,'redcard',10)){for(const m of p.activeGroup())m.t=0;source.enemy?.applySlow(.5,2);}
 }
 function switched(p,previous,next){if(proc(p,'roomservice',8))G.MovePP?.add(p,previous,2*Math.min(3,n(p,'roomservice')));const s=state(p);if(n(p,'terrainextender')&&s.terrainUntil>now()&&!s.terrainSlots.has(next)){s.terrainSlots.add(next);G.MovePP?.add(p,next,5);}}
 function healed(p,overflow){if(!(overflow>0)||p.dead||!n(p,'bigroot'))return;const s=state(p),window=Math.floor(now());if(s.window!==window){s.window=window;s.used=0;}s.overheal=Math.min(100,s.overheal+overflow);const pp=Math.min(Math.floor(s.overheal/10),3*Math.min(3,n(p,'bigroot'))-s.used);if(pp>0){s.overheal-=pp*10;s.used+=pp;p.tempPP=(p.tempPP||0)+pp;}}
 function tick(p){if(p.remote||p.dead)return;if(p.slowT>0&&proc(p,'whiteherb',15)){p.slowT=0;G.MovePP?.add(p,p.activeGroup(),3*Math.min(3,n(p,'whiteherb')));}}
 function active(p){if(!n(p,'terrainextender'))return;const s=state(p);s.terrainUntil=now()+10;s.terrainSlots=new Set();G.FX.ring(p.x,p.y,8,160,'#87dfb1',.4,3);}
 return {snapshot:p=>({...state(p),terrainSlots:[...(state(p).terrainSlots||[])].map(g=>p.slots.indexOf(g))}),restore:(p,a)=>{if(a)states.set(p,{...a,terrainSlots:new Set((a.terrainSlots||[]).map(i=>p.slots[i]).filter(Boolean))});},onHit,onCast,useFree,onEmpty,afterHurt,switched,healed,tick,active};
})();
