'use strict';
const {DatabaseSync}=require('node:sqlite'),path=require('node:path');
const file=process.env.DB_FILE||path.join(__dirname,'data/game.sqlite');
let db;try{
 db=new DatabaseSync(file,{readOnly:true});
 if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mirror_snapshots'").get())throw Error('Mirror recorder table is missing; update and restart the game service first.');
 const totals=db.prepare('SELECT COUNT(*) AS samples,COUNT(DISTINCT uid) AS owners,COALESCE(SUM(bytes),0) AS rawBytes,COALESCE(SUM(length(payload)),0) AS compressedBytes,MIN(at) AS oldest,MAX(at) AS newest FROM mirror_snapshots').get();
 const checkpoints=db.prepare('SELECT checkpoint,COUNT(*) AS samples FROM mirror_snapshots GROUP BY checkpoint ORDER BY checkpoint').all();
 const builds=db.prepare('SELECT build,COUNT(*) AS samples FROM mirror_snapshots GROUP BY build ORDER BY samples DESC LIMIT 20').all();
 console.log(JSON.stringify({totals,checkpoints,builds},null,2));
}catch(e){console.error(e.message);process.exitCode=1;}finally{db?.close();}
