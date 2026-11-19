/* Best-effort sampling: never blocks gameplay, cloud saves or run receipts. */
G.MirrorRecorder=(()=>{
  const MAX=30,TTL=7*864e5;let current=null,working=null,timer=null;
  const uid=()=>G.DB?.mode==='server'?G.Server?.user?.uid:null;
  const key=()=>uid()?'ps.mirror-queue.'+uid():null;
  function queue(){try{const list=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(list)?list.filter(r=>r&&r.at>Date.now()-TTL).slice(-MAX):[];}catch{return [];}}
  function persist(list){try{if(key())localStorage.setItem(key(),JSON.stringify(list.slice(-MAX)));}catch{/* Recording cannot prevent a normal save, even when storage is full. */}}
  function ack(reply){if(!reply)return;const done=new Set([...(reply.accepted||[]),...(reply.discarded||[])]);if(done.size)persist(queue().filter(r=>!done.has(r.id)));}
  function pending(run){return queue().filter(r=>r.run===run).slice(0,5);}
  function begin(run,p,eligible=true){current=eligible&&uid()&&/^[a-f0-9]{10,64}$/.test(G.Updater?.version||'')?{run,p,uid:uid(),done:new Set(),buckets:[],lastPrimary:p.active,lastHp:p.hp,nearby:false,rangeSecond:-1}:null;}
  function bucket(t){if(!current)return null;const second=Math.floor(t);let b=current.buckets[current.buckets.length-1];if(!b||b.second!==second){b={second,seconds:0,moving:0,primaryChanges:0,near:0,far:0,zCasts:0,damageTaken:0,casts:{}};current.buckets.push(b);current.buckets=current.buckets.filter(x=>x.second>=second-59);}return b;}
  function cast(p,m){if(current?.p!==p||!G.Settings?.get('mirrorRecording'))return;const b=bucket(G.Game.st.time);if(b)b.casts[m.id]=(b.casts[m.id]||0)+1;}
  function zCast(p){if(current?.p===p){const b=bucket(G.Game.st.time);if(b)b.zCasts++;}}
  function tick(p,time,dt){
    try{
      if(!current||current.p!==p||current.uid!==uid())return;
      if(G.Coop?.active){current=null;return;}
      if(G.Settings?.get('mirrorRecording')===false){for(const t of G.MirrorSnapshot.CHECKPOINTS)if(time>=t)current.done.add(t);return;}
      if(!G.Game.runClean()){invalidate(current.run);return;}
      const b=bucket(time);b.seconds+=dt;if(p.walking)b.moving+=dt;if(p.active!==current.lastPrimary){b.primaryChanges++;current.lastPrimary=p.active;}
      b.damageTaken+=Math.max(0,current.lastHp-p.hp);current.lastHp=p.hp;
      if(current.rangeSecond!==b.second){current.rangeSecond=b.second;const near=p.target&&!p.target.dead?p.target:G.Projectiles?.nearest?.(G.EnemyMgr?.all?.()||[],p.x,p.y,1000);current.nearby=near?(G.U.dist(p.x,p.y,near.x,near.y)<150?'near':'far'):null;}
      if(current.nearby)b[current.nearby]+=dt;
      for(const checkpoint of G.MirrorSnapshot.CHECKPOINTS){
        if(time<checkpoint||current.done.has(checkpoint))continue;current.done.add(checkpoint);
        // Never fabricate earlier milestones from a late clock jump or a dead player.
        if(time>checkpoint+2||p.dead)continue;
        const behavior={seconds:0,moving:0,primaryChanges:0,near:0,far:0,zCasts:0,damageTaken:0,casts:{}};
        for(const x of current.buckets){for(const k of Object.keys(behavior))if(k!=='casts')behavior[k]+=x[k]||0;for(const [id,n]of Object.entries(x.casts))behavior.casts[id]=(behavior.casts[id]||0)+n;}
        const snapshot=G.MirrorSnapshot.make(p,{checkpoint,t:time},behavior);if(!snapshot)continue;
        const entry={id:current.run+':'+checkpoint,run:current.run,at:Date.now(),build:G.Updater?.version||'',clean:true,snapshot};
        if(JSON.stringify(entry).length>32768)continue;
        const list=queue();if(!list.some(r=>r.id===entry.id)){list.push(entry);persist(list);}
      }
    }catch{/* Optional capture must not alter the battle loop. */}
  }
  function stop(){current=null;}
  function invalidate(run){persist(queue().filter(r=>r.run!==run));if(current?.run===run)current=null;}
  async function flush(){
    if(working)return working;if(!uid()||!G.Server?.mirrorRecorder||navigator.onLine===false)return;
    const list=queue();if(!list.length)return;const owner=uid();
    working=(async()=>{try{const r=await G.Server.api('/mirrors/batch',{records:list.slice(0,10)},6000);if(uid()===owner)ack(r);}catch{/* No toast, conflict state or cloud-save retry dependency. */}finally{working=null;}})();return working;
  }
  function init(){if(timer)return;timer=setInterval(()=>flush(),60000);addEventListener('online',()=>flush());setTimeout(()=>flush(),8000);}
  return{begin,tick,cast,zCast,stop,invalidate,pending,ack,flush,init};
})();
