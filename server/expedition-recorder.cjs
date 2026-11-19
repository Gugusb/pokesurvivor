'use strict';
const invalid=(message='Invalid DPS report')=>Object.assign(new Error(message),{status:400});
const num=(n,min=0,max=1e15)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
function validate(input){
  if(!input||input.schema!==1||input.clock!=='game-time'||!Number.isInteger(input.day)||!num(input.day,1,10000)||input.cycle!==Math.floor((input.day-1)/20)+1||!['battle','elite','boss'].includes(input.event)||!['cleared','survived','defeat','abandoned'].includes(input.outcome)||typeof input.version!=='string'||!/^[-+\w.]{1,64}$/.test(input.version)||!num(input.seconds,.000001,604800)||!num(input.damage)||!num(input.averageDps))throw invalid();
  const p=input.peak;if(!p||!num(p.at,0,input.seconds+1e-5)||!num(p.seconds,.000001,Math.min(5,input.seconds)+1e-5)||!num(p.damage,0,input.damage+Math.max(1e-4,input.damage*1e-6))||!num(p.dps))throw invalid();
  const close=(a,b)=>Math.abs(a-b)<=Math.max(.01,Math.abs(b)*1e-4);
  if(!close(input.averageDps,input.damage/input.seconds)||!close(p.dps,p.damage/p.seconds))throw invalid('Inconsistent DPS report');
  let nodes=0;
  function safe(value,depth=0){
    if(++nodes>15000||depth>10)throw invalid();
    if(value===null||typeof value==='boolean')return value;
    if(typeof value==='number'){if(!num(value,-1e15,1e15))throw invalid();return value;}
    if(typeof value==='string'){if(value.length>256)throw invalid();return value;}
    if(Array.isArray(value)){if(value.length>128)throw invalid();return value.map(v=>safe(v,depth+1));}
    if(!value||typeof value!=='object'||Object.keys(value).length>64)throw invalid();
    const out=Object.create(null);for(const [k,v]of Object.entries(value)){if(k.length>64||['__proto__','prototype','constructor'].includes(k))throw invalid();out[k]=safe(v,depth+1);}return out;
  }
  for(const snapshot of [input.initial,input.final,p.team]){
    if(!snapshot||!Array.isArray(snapshot.squad)||snapshot.squad.length>64||!Array.isArray(snapshot.bonds)||!num(snapshot.quality?.average,0,5)||!num(snapshot.quality?.averageStars,0,3)||!Number.isInteger(snapshot.trainerLevel)||!num(snapshot.trainerLevel,1,10))throw invalid();
    for(const bond of snapshot.bonds)if(!bond||!['types','skill','eggs'].includes(bond.category)||typeof bond.id!=='string'||bond.id.length>64||!num(bond.count,0,100000)||!num(bond.layers,0,10000))throw invalid();
  }
  if(!Array.isArray(input.sources)||input.sources.length>128)throw invalid();
  const report=safe(Object.fromEntries(['schema','version','day','cycle','event','outcome','seconds','damage','averageDps','peak','initial','final','sources','clean','clock','recordedAt'].filter(k=>input[k]!==undefined).map(k=>[k,input[k]])));
  if(Buffer.byteLength(JSON.stringify(report))>131072)throw Object.assign(invalid('DPS report too large'),{status:413});return report;
}
function createRecorder(db,now=Date.now,options={}){
  const maxRecords=options.maxRecords||10000,retentionDays=options.retentionDays||90;
  function save(user,id,input){
    if(typeof id!=='string'||id.length>128)throw invalid();
    const run=db.prepare('SELECT * FROM runs WHERE id=? AND uid=?').get(id,user.uid);
    if(!run)throw Object.assign(invalid('Run not found'),{status:404});if(run.mode!=='q')throw Object.assign(invalid('Expedition only'),{status:403});
    const report=validate(input),clean=!run.dirty&&report.clean===true?1:0;report.clean=!!clean;
    db.prepare('INSERT INTO expedition_dps(run,uid,day,version,event,seconds,damage,average_dps,peak_dps,clean,at,payload) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(run,day) DO NOTHING').run(id,user.uid,report.day,report.version,report.event,report.seconds,report.damage,report.averageDps,report.peak.dps,clean,now(),JSON.stringify(report));
    db.prepare('DELETE FROM expedition_dps WHERE at<?').run(now()-retentionDays*86400000);
    db.prepare('DELETE FROM expedition_dps WHERE id IN (SELECT id FROM expedition_dps ORDER BY id DESC LIMIT -1 OFFSET ?)').run(maxRecords);
    return {ok:true};
  }
  function list(params){
    const clauses=['u.deleted=0'],args=[];
    for(const [key,column]of [['version','d.version'],['run','d.run'],['uid','d.uid']])if(params.get(key)){clauses.push(column+'=?');args.push(params.get(key).slice(0,128));}
    for(const [key,op]of [['dayFrom','>='],['dayTo','<=']])if(params.has(key)&&params.get(key)!==''){const day=Number(params.get(key));if(!Number.isInteger(day)||day<1||day>10000)throw invalid('Invalid day range');clauses.push('d.day'+op+'?');args.push(day);}
    if(params.get('q')){clauses.push('u.lower LIKE ?');args.push('%'+params.get('q').slice(0,32).toLowerCase()+'%');}
    if(params.get('clean')==='1')clauses.push('d.clean=1 AND rr.dirty=0');
    if(params.get('before')){const before=Number(params.get('before'));if(!Number.isSafeInteger(before)||before<1)throw invalid();clauses.push('d.id<?');args.push(before);}
    const limit=Math.max(1,Math.min(500,Math.floor(Number(params.get('limit')))||50));
    const rows=db.prepare('SELECT d.*,u.name,rr.dirty run_dirty FROM expedition_dps d JOIN users u ON u.uid=d.uid JOIN runs rr ON rr.id=d.run WHERE '+clauses.join(' AND ')+' ORDER BY d.id DESC LIMIT ?').all(...args,limit);
    return {records:rows.map(r=>({id:r.id,uid:r.uid,name:r.name,run:r.run,at:r.at,...JSON.parse(r.payload),clean:!r.run_dirty&&!!r.clean})),next:rows.length===limit?rows.at(-1).id:null,source:'client-reported'};
  }
  return {save,list};
}
module.exports={createRecorder,validate};
