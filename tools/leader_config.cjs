const fs=require('node:fs'),path=require('node:path');
function read(root){const first=JSON.parse(fs.readFileSync(path.join(root,'config/leader_abilities_gen1.json'),'utf8')),second=JSON.parse(fs.readFileSync(path.join(root,'config/leader_abilities_gen2.json'),'utf8'));return {...first,families:[...first.families,...second.families,...JSON.parse(fs.readFileSync(path.join(root,'config/leader_abilities_gen3.json'),'utf8')).families,...JSON.parse(fs.readFileSync(path.join(root,'config/leader_abilities_gen4.json'),'utf8')).families]};}
const script=root=>'G.LeaderAbilitiesConfig='+JSON.stringify(read(root))+';G.LeaderAbilitiesReady=Promise.resolve(G.LeaderAbilitiesConfig);';
module.exports={read,script};
