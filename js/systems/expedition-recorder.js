/* Private balancing telemetry; never used for rewards or leaderboard verification. */
G.ExpeditionRecorder=(()=>{
  let current=null,runKey='',sending=false,sequence=0,local=[],pending=[];
  const cfg=()=>G.EconomyConfig?.damageRecorder;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const round=n=>Math.round(n*1e6)/1e6;
  const owner=()=>G.Server?.user?.uid||'guest';
  const storageKey=()=> 'ps.expedition-dps.'+owner();
  let loadedOwner='';
  function restore(){if(!cfg())return;if(loadedOwner===owner())return;loadedOwner=owner();local=[];pending=[];try{const saved=JSON.parse(localStorage.getItem(storageKey())||'{}');local=Array.isArray(saved.records)?saved.records.slice(-cfg().maxLocalRecords):[];pending=Array.isArray(saved.pending)?saved.pending.filter(p=>p&&typeof p.runId==='string'&&p.report).slice(-cfg().maxPending):[];}catch{}}
  function persist(){try{localStorage.setItem(storageKey(),JSON.stringify({records:local,pending}));}catch{/* Storage quotas must not interrupt combat. */}}
  function team(){
    const r=G.Expedition.run,front=G.Squad.actors(),all=[...front,...G.Squad.reserves()],qualityCounts={},starCounts={};
    let quality=0,stars=0,cost=0;
    for(const p of front){const q=G.ExpeditionQuality.quality(p),s=p.isSquadMember?p.rank:p.trainerRank||1;quality+=q;stars+=s;cost+=G.EconomyConfig.unitTiers[q].cost;qualityCounts[q]=(qualityCounts[q]||0)+1;starCounts[s]=(starCounts[s]||0)+1;}
    G.SquadBonds.refresh();const bonds=[];
    const tags={types:Object.keys(G.U.TYPE_NAME),skill:G.SquadBonds.ALL_KINDS,eggs:[...new Set(front.flatMap(p=>G.EGG_GROUPS[p.dex]||[15]))]};
    for(const [category,ids]of Object.entries(tags))for(const id of ids){const count=G.SquadBonds.count(category,id);if(!count)continue;bonds.push({category,id:String(id),count,layers:G.SquadBonds.layer(category,id),tier:category==='types'?(count>=5?5:count>=2?2:0):category==='skill'?G.SquadBonds.state(id).tier:0});}
    return {trainerLevel:r.trainerLevel,playerLevel:r.captain.level,gold:r.gold,population:G.Squad.capacity,
      quality:{average:round(quality/front.length),averageStars:round(stars/front.length),totalCost:cost,qualityCounts,starCounts,deployed:front.length,reserves:G.Squad.reserves().length},bonds,
      truncated:all.length>cfg().maxSquadSnapshot,
      squad:all.slice(0,cfg().maxSquadSnapshot).map(p=>({id:p.isSquadMember?'member:'+p.squadId:'captain',dex:p.dex,quality:G.ExpeditionQuality.quality(p),stars:p.isSquadMember?p.rank:p.trainerRank||1,deployed:front.includes(p),dead:!!p.dead,level:p.level,types:[...p.mon.types],eggs:[...(G.EGG_GROUPS[p.dex]||[15])],trait:p.squadTrait||null,ability:p.ability||null,activeItem:typeof p.activeItem==='string'?p.activeItem:p.activeItem?.id||null,mega:p.megaForm||null,megaStone:p.megaState?.id||null,zType:p.zState?.type||null,
        stats:{hp:round(p.hp),maxHp:round(p.maxHp),atk:round(p.atk),spa:round(p.spa),defense:round(p.baseDefense*(1+p.statGrowth.defense)),spdef:round(p.baseSpDef*(1+p.statGrowth.spdef)),speed:round(p.spd),agility:round(p.agility),stamina:round(p.stamina)},growth:{...p.statGrowth},items:{...p.specialItems},buffs:Object.fromEntries(Object.entries(p.buffs||{}).filter(([,b])=>b.n>0).map(([id,b])=>[id,{stacks:b.n,seconds:round(b.t)}])),primarySlot:p.active,skillSlots:p.slots.map(slot=>slot.map(m=>m.id)),skills:p.moves.map(m=>({id:m.id,kind:m.kind,class:G.SquadBonds.group(m.kind),type:m.type,level:m.lvl,evolved:!!m.evolved,overclock:m.overclock||0,specializations:[...(m.specializations||[])]}))}))};
  }
  function beginRun(){restore();current=null;runKey=G.Server?.runId||globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+(++sequence);flush();}
  function beginBattle(r){current={owner:owner(),runId:G.Server?.runId||runKey,day:r.day,cycle:r.cycle,event:r.kind,time:0,total:0,queue:[],head:0,windowDamage:0,initial:team(),peak:null};}
  function damage(n){if(!current||G.Expedition?.phase!=='combat'||!(n>0)||!Number.isFinite(n))return;current.total+=n;current.windowDamage+=n;const last=current.queue.at(-1);if(last?.t===current.time)last.n+=n;else current.queue.push({t:current.time,n});}
  function tick(dt){
    if(!current||!(dt>0))return;const c=current;c.time+=dt;const width=cfg().windowSeconds,start=c.time-width;
    while(c.head<c.queue.length&&c.queue[c.head].t<start-1e-8)c.windowDamage-=c.queue[c.head++].n;
    if(c.head>600){c.queue=c.queue.slice(c.head);c.head=0;}
    if(c.time+1e-8>=width){const dps=Math.max(0,c.windowDamage)/width;if(!c.peak||dps>c.peak.dps+Math.max(1,c.peak.dps)*1e-10)c.peak={at:c.time,seconds:width,damage:Math.max(0,c.windowDamage),dps,team:team()};}
  }
  function finish(outcome){
    if(!current)return null;const c=current;current=null;if(c.time<=0)return null;
    const peak=c.peak||{at:c.time,seconds:c.time,damage:c.total,dps:c.total/c.time,team:team()};
    const report={schema:1,version:G.SettingsUI?.version||'development',day:c.day,cycle:c.cycle,event:c.event,outcome,seconds:round(c.time),damage:round(c.total),averageDps:round(c.total/c.time),peak:{...peak,at:round(peak.at),seconds:round(peak.seconds),damage:round(peak.damage),dps:round(peak.dps)},initial:c.initial,final:team(),sources:G.ExpeditionDamage.snapshot('battle').slice(0,128),clean:!!G.Game.runClean?.(),clock:'game-time',recordedAt:Date.now()};
    if(c.owner!==owner())return report;restore();const entry={runId:c.runId,report};local.push(entry);local=local.slice(-cfg().maxLocalRecords);if(c.owner!=='guest'){pending.push(entry);pending=pending.slice(-cfg().maxPending);}persist();flush();return clone(report);
  }
  async function flush(){
    if(!cfg()||sending||!G.DB?.online||G.DB.mode!=='server'||!G.Server?.user)return;restore();const uid=owner();sending=true;
    try{for(const entry of [...pending]){if(owner()!==uid)break;try{await G.Server.recordDps(entry.runId,entry.report);}catch(e){if(e.status===404)continue;if(![400,403,413].includes(e.status))break;}if(owner()!==uid)break;pending=pending.filter(p=>p!==entry);persist();}}catch{/* Analytics must not affect saves or combat. */}finally{sending=false;}
  }
  addEventListener('online',()=>flush());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)flush();});
  G.Server?.onDelete?.(()=>{try{localStorage.removeItem(storageKey());}catch{}current=null;local=[];pending=[];loadedOwner='';});
  return {beginRun,beginBattle,damage,tick,finish,flush,reset(){current=null;},records(){restore();return clone(local);}};
})();
