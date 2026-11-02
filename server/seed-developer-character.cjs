"use strict";
const {randomBytes}=require('node:crypto'),path=require('node:path');
const {fresh,G}=require('./domain.cjs'),{hashPassword}=require('./server.cjs');
const {identity,characterFor,DEVELOPER_CHARACTER:C}=require('./character-profiles.cjs');
const DEX=[129,130,349,350,320,321,170,171,318,319,339,340,456,457,369,370,143,446];
const BEST_TIME=1938;
async function seedDeveloperCharacter(db,{now=Date.now()}={}){
 const uid=identity(C.key),name=C.name;
 function existing(){
  const rows=db.prepare('SELECT uid,name FROM users WHERE uid=? OR lower=?').all(uid,name.toLowerCase());
  if(!rows.length)return null;
  if(rows.length!==1||rows[0].uid!==uid||rows[0].name!==name||!characterFor(db,uid))throw Error('Character identity conflicts with an existing account; no data changed.');
  return {created:false,uid,name};
 }
 const found=existing();if(found)return found;
 // Random credentials are never printed or committed. This is a curated profile, not a shared login.
 const pass=await hashPassword(randomBytes(48).toString('hex')),recovery=await hashPassword(randomBytes(48).toString('hex'));
 const s=fresh(name);s.created=s.updated=now;s.partner=321;s.starter=320;s.profile.favs=[321,350,143];
 for(const dex of DEX){
  if(!G.DEX_BY[dex])throw Error('Unknown character partner');
  s.owned[dex]={at:now,from:'preset-character',iv:[26,24,29,23,30,25,28,30]};
  s.difficultyRecords[dex]=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,{won:true,best:i===7&&dex===321?BEST_TIME:1201+17*i+DEX.indexOf(dex)}]));
 }
 for(const dex of [130,350,321,143])s.shiny[dex]={at:now,from:'preset-character'};
 s.partnerShiny=true;s.difficulty={selected:8,cleared:Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,now])),cashouts:{}};
 Object.assign(s.stats,{runs:64,bestTime:BEST_TIME,bestLevel:86,totalKills:183240,bossesTotal:312,riftWins:98,evolutions:143,shinies:4});
 s.stats.bestScore=G.Difficulty.score({normal:12480,elite:112,boss:10,rift:4,events:8},BEST_TIME,8).total;
 G.Offline.stamp(s,now);
 db.exec('BEGIN IMMEDIATE');
 try{
  const raced=existing();if(raced){db.exec('COMMIT');return raced;}
  db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),pass,recovery,now);
  db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));
  db.prepare('INSERT INTO audit(actor,target,action,at) VALUES(?,?,?,?)').run(C.actor,uid,C.action,now);
  // Curated history stays out of verified leaderboard/run tables.
  db.exec('COMMIT');return {created:true,uid,name,fullMedalPokemon:G.Difficulty.completedCount(s),bestTime:BEST_TIME,score:s.stats.bestScore};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
module.exports={seedDeveloperCharacter};
if(require.main===module){
 const args=process.argv.slice(2),i=args.indexOf('--db');
 if(i!==0||args.length!==2||!args[1]){console.error('Usage: node server/seed-developer-character.cjs --db PATH_TO_INTENDED_DATABASE');process.exitCode=1;}
 else{
  const {openStore}=require('./store.cjs'),db=openStore(path.resolve(args[1]));
  seedDeveloperCharacter(db).then(summary=>console.log(JSON.stringify(summary))).catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.close());
 }
}
