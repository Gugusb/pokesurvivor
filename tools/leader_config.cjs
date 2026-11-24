const fs=require('node:fs'),path=require('node:path');
function read(root){const parts=[1,2,3,4,5,6,7].map(g=>JSON.parse(fs.readFileSync(path.join(root,'config/leader_abilities_gen'+g+'.json'),'utf8')));return {...parts[0],families:parts.flatMap(p=>p.families)};}
const script=root=>'G.LeaderAbilitiesConfig='+JSON.stringify(read(root))+';G.LeaderAbilitiesReady=Promise.resolve(G.LeaderAbilitiesConfig);';
module.exports={read,script};
