/* The host drops/opens chests; each teammate receives one validated choice. */
G.BossRewards=(()=>{
  const opened=new Set();
  function drop(e,stone=null){
    const rift=!!e.legend&&!e.judge;
    return G.Pickups.drop('bossChest',e.x,e.y,{xp:Math.max(0,Math.ceil(e.xp||0)),rift,stone:stone||null});
  }
  function receive(id,data){
    if(!Number.isSafeInteger(id)||id<1||opened.has(id)||!data||typeof data.rift!=='boolean'||!Array.isArray(data.options)||data.options.length!==3||new Set(data.options).size!==3||data.options.some(i=>!G.Items.BY[i]))return false;
    if(data.stone&&!G.Mega?.BY[data.stone])return false;
    opened.add(id);
    if(data.rift){G.DB.save.abilityGems=(G.DB.save.abilityGems||0)+1;G.DB.commit(true);G.UI.toast(G.T('+1 Gema de habilidad'));}
    if(data.rift&&data.stone)G.Mega.award(data.stone);
    G.Game.offerSpecialChoice(data.options);
    return true;
  }
  function open(p){
    if(G.Coop.active&&!G.Coop.isHost||opened.has(p.id))return false;
    const value=p.value||{},rift=!!value.rift;
    const data={rift,stone:rift?value.stone:null,options:G.Items.rewardChoices(Math.random,rift)};
    if(!receive(p.id,data))return false;
    G.Pickups.dropXp(p.x,p.y,value.xp,true,rift);
    for(let i=0;i<10;i++)G.Pickups.drop('coin',p.x+G.U.rand(-40,40),p.y+G.U.rand(-30,30),5);
    if(rift){for(let i=0;i<10;i++)G.Pickups.drop('coin',p.x+G.U.rand(-50,50),p.y+G.U.rand(-35,35),8);for(let i=0;i<3;i++)G.Pickups.drop('ticket',p.x+G.U.rand(-30,30),p.y+G.U.rand(-20,20),1);}
    G.FX.ring(p.x,p.y,8,100,rift?'#cf9cff':'#ffd95e',.7,4);G.Audio.sfx('legend');
    if(G.Coop.isHost)G.Coop.broadcast(['bc',p.id,data]);
    return true;
  }
  function returnFromRift(a){
    if(G.Coop.active&&!G.Coop.isHost)return;
    for(const p of G.Pickups.all())if(p.kind==='bossChest'&&p.value?.rift&&Math.hypot(p.x-a.x,p.y-a.y)<1000){
      if(G.Coop.isHost)G.Coop.pickupGone(p.id);
      p.x=a.back.x+40;p.y=a.back.y;p.vx=p.vy=0;p.pulled=false;
      if(G.Coop.isHost)G.Coop.pickupAdded(p);
    }
  }
  return {drop,open,receive,returnFromRift,reset:()=>opened.clear()};
})();
