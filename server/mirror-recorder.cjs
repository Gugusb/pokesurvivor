'use strict';
const {gzipSync}=require('node:zlib'),{createHash}=require('node:crypto');
const TTL=35*864e5,MAX_GLOBAL=50000,MAX_BYTES=32768;
module.exports=function mirrorRecorder({db,G,now=Date.now,enabled=true}){
 const q=(sql,...args)=>db.prepare(sql).get(...args),exec=(sql,...args)=>db.prepare(sql).run(...args);let pruneAt=0;
 function prune(force=false){if(!force&&now()<pruneAt)return;pruneAt=now()+3600e3;exec('DELETE FROM mirror_snapshots WHERE at<?',now()-TTL);const total=q('SELECT COUNT(*) AS n FROM mirror_snapshots').n;if(total>MAX_GLOBAL)exec('DELETE FROM mirror_snapshots WHERE id IN (SELECT id FROM mirror_snapshots ORDER BY at,id LIMIT ?)',total-MAX_GLOBAL);}
 function receive(uid,records,knownRun=null){
  const result={accepted:[],discarded:[],retry:[]};if(!Array.isArray(records))return result;
  for(const row of records.slice(0,10)){
   const id=typeof row?.id==='string'&&/^[\w-]{8,100}:(240|480|720|960|1200)$/.test(row.id)?row.id:null;
   if(!id)continue;
   if(!enabled){result.discarded.push(id);continue;}
   try{
    if(typeof row.run!=='string'||row.id!==row.run+':'+row.snapshot?.checkpoint||row.clean!==true||!Number.isFinite(row.at)||typeof row.build!=='string'||!/^([a-f0-9]{10,64})$/.test(row.build)||JSON.stringify(row).length>MAX_BYTES){result.discarded.push(id);continue;}
    const run=knownRun?.id===row.run&&knownRun.uid===uid?knownRun:q('SELECT * FROM runs WHERE id=? AND uid=?',row.run,uid);
    if(!run){result.retry.push(id);continue;}
    if(run.dirty||run.mode!=='s'||now()-run.started>TTL){exec('DELETE FROM mirror_snapshots WHERE run=?',run.id);result.discarded.push(id);continue;}
    const s=G.MirrorSnapshot.normalize(row.snapshot);
    if(!s||G.MonProgression.rootFor(s.dex)!==run.dex){result.discarded.push(id);continue;}
    if(run.t+2<s.t){result.retry.push(id);continue;}
    if(q('SELECT id FROM mirror_snapshots WHERE id=? AND uid=?',id,uid)){result.accepted.push(id);continue;}
    const json=Buffer.from(JSON.stringify(s));
    exec('INSERT INTO mirror_snapshots(id,uid,run,checkpoint,t,dex,level,stars,build,profile,power,digest,bytes,payload,at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,uid,run.id,s.checkpoint,s.t,s.dex,s.level,run.stars,row.build,s.style,Math.round(Math.sqrt(s.effective.atk*s.effective.spa)*Math.sqrt(s.maxHp)),createHash('sha256').update(json).digest('hex'),json.length,gzipSync(json),now());
    // Bound repeat farming while retaining several builds for each owner and checkpoint.
    exec('DELETE FROM mirror_snapshots WHERE uid=? AND checkpoint=? AND id NOT IN (SELECT id FROM mirror_snapshots WHERE uid=? AND checkpoint=? ORDER BY at DESC,id DESC LIMIT 3)',uid,s.checkpoint,uid,s.checkpoint);
    result.accepted.push(id);
   }catch{result.discarded.push(id);}
  }
  try{prune();}catch{/* Housekeeping cannot reject normal run progress. */}
  return result;
 }
 return{receive,prune,enabled,TTL,MAX_GLOBAL};
};
